/**
 * useQuests - Migrated to Firebase
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query as firestoreQuery, where, orderBy, getDocFromServer } from '@/integrations/firebase/app';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/integrations/firebase/app';


import { fisioLogger as logger } from '@/lib/errors/logger';

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
  requirements: Record<string, unknown>;
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
  progress: Record<string, unknown>;
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
        const q = firestoreQuery(
          collection(db, 'patient_quests'),
          where('patient_id', '==', patientId),
          orderBy('created_at', 'desc')
        );

        const snapshot = await getDocs(q);
        const quests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PatientQuest[];

        // Fetch quest definitions for each quest
        const questsWithDefinitions = await Promise.all(
          quests.map(async (quest) => {
            if (quest.quest_id) {
              const questDefRef = doc(db, 'quest_definitions', quest.quest_id);
              const questDefSnap = await getDoc(questDefRef);
              if (questDefSnap.exists()) {
                return {
                  ...quest,
                  quest_definition: { id: questDefSnap.id, ...questDefSnap.data() } as QuestDefinition,
                };
              }
            }
            return quest;
          })
        );

        return questsWithDefinitions;
      } catch (err) {
        logger.error('Failed to fetch quests', err, 'useQuests');
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
        const q = firestoreQuery(
          collection(db, 'quest_definitions'),
          where('is_active', '==', true),
          orderBy('category', 'asc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as QuestDefinition[];
      } catch (err) {
        logger.error('Failed to fetch available quests', err, 'useQuests');
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

      await addDoc(collection(db, 'patient_quests'), {
        patient_id: patientId,
        quest_id: questId,
        status: 'in_progress',
        progress: {},
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
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

      // Adicionar XP ao gamification profile
      if (xpReward > 0) {
        // Buscar profile atual
        const profileQ = firestoreQuery(
          collection(db, 'patient_gamification'),
          where('patient_id', '==', patientId),
          limit(1)
        );
        const profileSnap = await getDocs(profileQ);

        if (!profileSnap.empty) {
          const profileData = profileSnap.docs[0].data();
          const newTotalPoints = (profileData.total_points || 0) + xpReward;

          await updateDoc(profileSnap.docs[0].ref, {
            total_points: newTotalPoints,
            updated_at: new Date().toISOString(),
          });

          // Adicionar transação de XP
          await addDoc(collection(db, 'xp_transactions'), {
            patient_id: patientId,
            amount: xpReward,
            reason: 'quest_reward',
            description: `Recompensa: ${quest.quest_definition?.title || 'Quest'}`,
            created_at: new Date().toISOString(),
          });
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
      // Firebase doesn't support RPC functions directly
      // This would need to be a Cloud Function
      // For now, just invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['patient-quests', patientId] });

      toast({
        title: "Quests atualizadas",
        description: "Novas quests diárias disponíveis!",
      });
    } catch (error) {
      logger.error('Failed to refresh quests', error, 'useQuests');
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
