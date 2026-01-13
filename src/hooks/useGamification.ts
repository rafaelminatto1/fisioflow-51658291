import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

// Deriving types from Database definition
type PatientGamification = Database['public']['Tables']['patient_gamification']['Row'];
type XPTransaction = Database['public']['Tables']['xp_transactions']['Row'];
type Achievement = Database['public']['Tables']['achievements']['Row'];
type UnlockedAchievement = Database['public']['Tables']['achievements_log']['Row'];

export interface GamificationProfile extends PatientGamification { }

export interface DailyQuestItem {
  id: string;
  title: string;
  completed: boolean;
  xp: number;
  icon: string;
  description?: string;
}

export const useGamification = (patientId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Gamification Profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['gamification-profile', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_gamification')
        .select('*')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching gamification profile:', error);
      }

      if (!data) {
        return {
          current_xp: 0,
          level: 1,
          current_streak: 0,
          longest_streak: 0,
          total_points: 0,
          last_activity_date: null
        } as GamificationProfile;
      }

      return data as GamificationProfile;
    },
    enabled: !!patientId,
  });

  // Fetch Total Sessions
  const { data: totalSessions = 0 } = useQuery({
    queryKey: ['total-sessions', patientId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', patientId)
        .eq('status', 'completed');

      if (error) {
        console.error("Error fetching total sessions", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!patientId
  });

  // Fetch Recent XP Transactions
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['xp-transactions', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) return [];
      return data as XPTransaction[];
    },
    enabled: !!patientId
  });

  // Fetch Achievements
  const { data: allAchievements = [] } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*');

      if (error) return [];
      return data as Achievement[];
    }
  });

  // Fetch Unlocked Achievements
  const { data: unlockedAchievements = [] } = useQuery({
    queryKey: ['unlocked-achievements', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements_log')
        .select('*')
        .eq('patient_id', patientId);

      if (error) return [];
      return data as UnlockedAchievement[];
    },
    enabled: !!patientId,
  });

  // Fetch Daily Quests
  const { data: dailyQuestsData } = useQuery({
    queryKey: ['daily-quests', patientId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('patient_id', patientId)
        .eq('date', today)
        .maybeSingle();

      if (!data) {
        // Fetch active quest definitions for display preview
        const { data: activeQuests } = await supabase
          .from('quest_definitions')
          .select('*')
          .eq('is_active', true)
          .eq('category', 'daily');

        const displayQuests = (activeQuests || []).map(q => ({
          id: q.id,
          title: q.title,
          completed: false,
          xp: q.xp_reward,
          icon: q.icon || 'Star',
          description: q.description || ''
        }));

        if (displayQuests.length > 0) {
          return { quests_data: displayQuests };
        }

        return {
          quests_data: [
            { id: "session", title: "Realizar Sessão", completed: false, xp: 50, icon: "Activity", description: "Complete sua sessão de exercícios" },
            { id: "pain", title: "Registrar Dor", completed: false, xp: 20, icon: "Thermometer", description: "Atualize seu mapa de dor" },
            { id: "hydration", title: "Hidratação", completed: false, xp: 10, icon: "Droplets", description: "Beba água e registre" }
          ]
        };
      }
      return data;
    },
    enabled: !!patientId
  });

  // Cast JSONB to typed array safely
  const dailyQuests = ((dailyQuestsData?.quests_data as unknown) || []) as DailyQuestItem[];

  // Calculation Props
  const xpPerLevel = 1000;
  const currentLevel = profile?.level || 1;
  const currentXp = profile?.current_xp || 0;
  const xpProgress = (currentXp / xpPerLevel) * 100;

  // Mutations
  const awardXp = useMutation({
    mutationFn: async ({ amount, reason, description }: { amount: number, reason: string, description?: string }) => {
      if (!patientId) throw new Error('No patient ID');

      // 1. Log Transaction
      await supabase.from('xp_transactions').insert({
        patient_id: patientId,
        amount,
        reason,
        description
      });

      // 2. Fetch current state safely
      const { data: current, error: fetchError } = await supabase
        .from('patient_gamification')
        .select('*')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const oldXp = current?.current_xp || 0;
      const oldTotal = current?.total_points || 0;
      const oldLevel = current?.level || 1;

      let newXp = oldXp + amount;
      const newTotal = oldTotal + amount;
      let newLevel = oldLevel;

      if (newXp >= xpPerLevel) {
        const levelsGained = Math.floor(newXp / xpPerLevel);
        newLevel += levelsGained;
        newXp = newXp % xpPerLevel;
      }

      // 3. Update Profile
      const { data, error } = await supabase
        .from('patient_gamification')
        .upsert({
          patient_id: patientId,
          updated_at: new Date().toISOString(),
          current_xp: newXp,
          level: newLevel,
          total_points: newTotal,
          last_activity_date: new Date().toISOString(),
          ...(current?.id ? { id: current.id, current_streak: current.current_streak, longest_streak: current.longest_streak } : {})
        })
        .select()
        .single();

      if (error) throw error;
      return { data, leveledUp: newLevel > oldLevel, newLevel };
    },
    onSuccess: ({ leveledUp, newLevel }) => {
      queryClient.invalidateQueries({ queryKey: ['gamification-profile', patientId] });
      queryClient.invalidateQueries({ queryKey: ['xp-transactions', patientId] });

      toast({
        title: `+ XP Recebido!`,
        description: "Progresso atualizado.",
      });

      if (leveledUp) {
        toast({
          title: "SUBIU DE NÍVEL! 🎉",
          description: `Novo nível alcançado: ${newLevel}`,
          className: "bg-gradient-to-r from-yellow-500 to-orange-600 text-white border-none shadow-xl"
        });
      }
    }
  });

  const completeQuest = useMutation({
    mutationFn: async ({ questId }: { questId: string }) => {
      const today = new Date().toISOString().split('T')[0];

      // 1. Get or Create Daily Quest Record
      let { data: record, error } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('patient_id', patientId)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // Handle error
      }

      if (!record) {
        // Fetch active quest definitions
        const { data: activeQuests, error: definitionsError } = await supabase
          .from('quest_definitions')
          .select('*')
          .eq('is_active', true)
          .eq('category', 'daily'); // Assuming 'daily' is the target. Could be dynamic later.

        if (definitionsError) {
          console.error("Error fetching quest definitions", definitionsError);
        }

        const initialQuests: DailyQuestItem[] = (activeQuests || []).map(q => ({
          id: q.id,
          title: q.title,
          completed: false,
          xp: q.xp_reward,
          icon: q.icon || 'Star',
          description: q.description || ''
        }));

        // Use fallback if DB is empty to avoid broken UI, or rely on earlier seed
        if (initialQuests.length === 0) {
          // Fallback only if really nothing exists
          initialQuests.push(
            { id: "session", title: "Realizar Sessão", completed: false, xp: 50, icon: "Activity", description: "Complete sua sessão de exercícios" }
          );
        }

        const { data: newRecord, error: createError } = await supabase
          .from('daily_quests')
          .insert({
            patient_id: patientId,
            date: today,
            quests_data: initialQuests as unknown as Json,
            completed_count: 0
          })
          .select()
          .single();

        if (createError) throw createError;
        record = newRecord;
      }

      if (!record) throw new Error("Could not create/fetch quest record");

      // 2. Update specific quest
      // We need to be careful with JSON types.
      const quests = (record.quests_data as unknown) as DailyQuestItem[];
      const questIndex = quests.findIndex(q => q.id === questId);

      if (questIndex === -1) throw new Error("Quest not found");
      if (quests[questIndex].completed) return;

      quests[questIndex].completed = true;
      const xpReward = quests[questIndex].xp;

      // 3. Save Quest State
      const { error: updateError } = await supabase
        .from('daily_quests')
        .update({
          quests_data: quests as unknown as Json,
          completed_count: quests.filter(q => q.completed).length
        })
        .eq('id', record.id);

      if (updateError) throw updateError;

      // 4. Award XP
      await awardXp.mutateAsync({
        amount: xpReward,
        reason: 'daily_quest',
        description: `Quest diária: ${quests[questIndex].title}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-quests', patientId] });
      toast({
        title: "Quest Completada!",
        description: "Você ganhou XP pela tarefa diária.",
        variant: "default"
      });
    }
  });

  return {
    profile,
    recentTransactions,
    allAchievements,
    unlockedAchievements,
    dailyQuests,
    totalSessions,
    isLoading: isLoadingProfile,
    awardXp,
    completeQuest,
    xpPerLevel,
    xpProgress,
    currentLevel,
    currentXp
  };
};

// Helper type for JSON if needed locally, though strictly we use Supabase Json
type Json = Database['public']['Tables']['daily_quests']['Row']['quests_data'];
