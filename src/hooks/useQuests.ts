import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type QuestCategory = 'daily' | 'weekly' | 'special';
export type QuestStatus = 'pending' | 'in_progress' | 'completed' | 'expired';
export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface QuestDefinition {
  id: string;
  code: string;
  title: string;
  description: string;
  category: QuestCategory;
  xp_reward: number;
  points_reward: number;
  requirements: Record<string, any>;
  icon?: string;
  difficulty: QuestDifficulty;
  is_active: boolean;
  repeat_interval: 'once' | 'daily' | 'weekly' | 'monthly';
}

export interface PatientQuest {
  id: string;
  patient_id: string;
  quest_id: string;
  status: QuestStatus;
  progress: Record<string, any>;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  quest_definition?: QuestDefinition;
}

export interface UseQuestsResult {
  dailyQuests: PatientQuest[];
  weeklyQuests: PatientQuest[];
  allQuests: PatientQuest[];
  availableQuests: QuestDefinition[];
  isLoading: boolean;
  error: Error | null;
  startQuest: (questId: string) => Promise<void>;
  claimReward: (patientQuestId: string) => Promise<void>;
  refreshQuests: () => Promise<void>;
  refetch: () => void;
}

const DIFFICULTY_LABELS: Record<QuestDifficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
  expert: 'Expert',
};

export const useQuests = (patientId?: string): UseQuestsResult => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar quests ativas do paciente
  const { data: patientQuests = [], isLoading, error, refetch } = useQuery({
    queryKey: ['patient-quests', patientId],
    queryFn: async () => {
      if (!patientId) return [];

      try {
        const { data, error } = await supabase
          .from('patient_quests')
          .select(`
            *,
            quest_definition:quest_definitions(*)
          `)
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as PatientQuest[];
      } catch (err) {
        console.error('Failed to fetch quests:', err);
        throw err;
      }
    },
    enabled: !!patientId,
    staleTime: 1000 * 60 * 2, // 2 minutos
    retry: 1,
  });

  // Buscar quests disponíveis (para aceitar novas)
  const { data: availableQuests = [] } = useQuery({
    queryKey: ['available-quests'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('quest_definitions')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true });

        if (error) throw error;
        return data as QuestDefinition[];
      } catch (err) {
        console.error('Failed to fetch available quests:', err);
        return [];
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
  });

  // Separar quests por categoria
  const dailyQuests = patientQuests.filter(q =>
    q.quest_definition?.category === 'daily' &&
    q.status !== 'expired' &&
    q.status !== 'completed'
  );

  const weeklyQuests = patientQuests.filter(q =>
    q.quest_definition?.category === 'weekly' &&
    q.status !== 'expired' &&
    q.status !== 'completed'
  );

  // Iniciar uma quest
  const startQuestMutation = useMutation({
    mutationFn: async (questId: string) => {
      if (!patientId) throw new Error('Patient ID não fornecido');

      // Verificar se já tem essa quest
      const existing = patientQuests.find(q => q.quest_id === questId);
      if (existing) {
        throw new Error('Você já tem esta quest ativa');
      }

      const { error } = await supabase
        .from('patient_quests')
        .insert({
          patient_id: patientId,
          quest_id: questId,
          status: 'in_progress',
          progress: {},
          started_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-quests', patientId] });
      toast({
        title: "Quest iniciada!",
        description: "Complete as tarefas para ganhar recompensas",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao iniciar quest",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Reclamar recompensa (quando a quest já foi completada pelo sistema)
  const claimRewardMutation = useMutation({
    mutationFn: async (patientQuestId: string) => {
      // Buscar a quest
      const quest = patientQuests.find(q => q.id === patientQuestId);
      if (!quest) throw new Error('Quest não encontrada');
      if (quest.status !== 'completed') throw new Error('Quest ainda não foi completada');

      const xpReward = quest.quest_definition?.xp_reward || 0;

      // Adicionar XP usando a nova função que calcula nível automaticamente
      if (xpReward > 0) {
        // Usar a função RPC que calcula nível automaticamente
        const { error: rpcError } = await supabase.rpc('add_xp_with_level_up', {
          p_patient_id: patientId,
          p_amount: xpReward,
          p_reason: 'quest_reward',
          p_description: `Recompensa: ${quest.quest_definition?.title || 'Quest'}`,
        });

        if (rpcError) {
          // Fallback para função antiga se a nova não existir
          console.warn('Using fallback XP addition method');
          const { error: txError } = await supabase.from('xp_transactions').insert({
            patient_id: patientId,
            amount: xpReward,
            reason: 'quest_reward',
            description: `Recompensa: ${quest.quest_definition?.title || 'Quest'}`,
          });

          if (txError) throw txError;

          // Atualizar gamification profile
          const { data: profile } = await supabase
            .from('patient_gamification')
            .select('total_points')
            .eq('patient_id', patientId)
            .single();

          if (profile) {
            await supabase.from('patient_gamification')
              .update({ total_points: (profile.total_points || 0) + xpReward })
              .eq('patient_id', patientId);
          }
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-quests', patientId] });
      queryClient.invalidateQueries({ queryKey: ['gamification-profile', patientId] });

      const quest = patientQuests.find(q => q.id === variables);
      const xpReward = quest?.quest_definition?.xp_reward || 0;

      toast({
        title: "Recompensa recebida!",
        description: xpReward > 0 ? `+${xpReward} XP adicionado ao seu perfil` : "Conquista registrada!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao reclamar recompensa",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Refresh diário de quests
  const refreshQuests = async () => {
    if (!patientId) return;

    try {
      // Chamar a função do Supabase para refresh
      const { error } = await supabase.rpc('refresh_daily_quests');

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['patient-quests', patientId] });

      toast({
        title: "Quests atualizadas",
        description: "Novas quests diárias disponíveis!",
      });
    } catch (error) {
      console.error('Failed to refresh quests:', error);
      toast({
        title: "Erro ao atualizar quests",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  return {
    dailyQuests,
    weeklyQuests,
    allQuests: patientQuests,
    availableQuests,
    isLoading,
    error,
    startQuest: (questId: string) => startQuestMutation.mutateAsync(questId),
    claimReward: (patientQuestId: string) => claimRewardMutation.mutateAsync(patientQuestId),
    refreshQuests,
    refetch,
  };
};

export { DIFFICULTY_LABELS };
