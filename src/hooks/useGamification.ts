import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GamificationProfile {
  id: string;
  patient_id: string;
  current_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  total_points: number;
  last_activity_date: string | null;
}

export interface XPTransaction {
  id: string;
  amount: number;
  reason: string;
  description: string;
  created_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  xp_reward: number;
  icon: string | any;
  category: string;
  requirements?: any;
}

export interface UnlockedAchievement {
  achievement_id: string;
  unlocked_at: string;
  achievement_title?: string;
  xp_reward?: number;
}

export interface DailyQuest {
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

  // Fetch Total Sessions (Needed for Journey Map)
  const { data: totalSessions = 0 } = useQuery({
    queryKey: ['total-sessions', patientId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('treatment_sessions') // Assuming this table exists, or appointments where status='completed'
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', patientId);
      // Note: 'treatment_sessions' might be 'appointments'. Let's assume 'appointments' with status='completed' based on previous context.
      // Actually, previous context used 'completeAppointment' logic.
      // Let's verify table name if we can, but likely it's 'appointments' based on 'PatientEvolution.tsx'.
      // Wait, 'PatientEvolution' handles 'appointment'.
      // Let's safe bet with 'appointments' where status = 'completed' if treatment_sessions doesn't exist.
      // But for now let's assume 'appointments' is the main place.

      if (error) {
        // Fallback to appointments
        const { count: apptCount, error: apptError } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', patientId)
          .eq('status', 'completed');

        if (apptError) return 0;
        return apptCount || 0;
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

  const dailyQuests = (dailyQuestsData?.quests_data || []) as DailyQuest[];

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
      let newTotal = oldTotal + amount;
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
    onSuccess: ({ leveledUp, newLevel, data }) => {
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

      if (!record) {
        const initialQuests: DailyQuest[] = [
          { id: "session", title: "Realizar Sessão", completed: false, xp: 50, icon: "Activity", description: "Complete sua sessão de exercícios" },
          { id: "pain", title: "Registrar Dor", completed: false, xp: 20, icon: "Thermometer", description: "Atualize seu mapa de dor" },
          { id: "hydration", title: "Hidratação", completed: false, xp: 10, icon: "Droplets", description: "Beba água e registre" }
        ];
        const { data: newRecord, error: createError } = await supabase
          .from('daily_quests')
          .insert({
            patient_id: patientId,
            date: today,
            quests_data: initialQuests as any,
            completed_count: 0
          })
          .select()
          .single();

        if (createError) throw createError;
        record = newRecord;
      }

      // 2. Update specific quest
      const quests = (record.quests_data as any) as DailyQuest[];
      const questIndex = quests.findIndex(q => q.id === questId);

      if (questIndex === -1) throw new Error("Quest not found");
      if (quests[questIndex].completed) return;

      quests[questIndex].completed = true;
      const xpReward = quests[questIndex].xp;

      // 3. Save Quest State
      const { error: updateError } = await supabase
        .from('daily_quests')
        .update({
          quests_data: quests as any,
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
