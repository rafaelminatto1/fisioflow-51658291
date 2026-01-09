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
        // Return default structure
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

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }
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

  const xpPerLevel = 1000;
  const currentLevel = profile?.level || 1;
  const currentXp = profile?.current_xp || 0;
  // Progress bar logic: current_xp is points within the current level cycle
  // If current_xp accumulates forever (e.g. 1500 XP = Level 2 + 500 XP), then we modulo.
  // If current_xp resets (e.g. becomes 0 after level up), then we use raw value.
  // Let's assume cumulative Total Points vs Current Level XP.
  // Migration has `total_points` and `current_xp`. We will treat `current_xp` as "XP towards next level".

  const xpProgress = (currentXp / xpPerLevel) * 100;

  // Award XP Mutation
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

      // Level calculation
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
        title: `+${data?.current_xp ? (data.current_xp - (data.current_xp - 100)) : 'XP'} XP`, // Simple placeholder
        description: "XP Registrado!",
      });

      if (leveledUp) {
        toast({
          title: "SUBIU DE NÍVEL! 🎉",
          description: `Novo nível alcançado: ${newLevel}`,
          className: "bg-gradient-to-r from-yellow-500 to-orange-600 text-white border-none shadow-xl"
        });
      }
    },
    onError: (err) => {
      console.error(err);
      toast({
        title: "Erro ao adicionar XP",
        description: "Falha ao atualizar.",
        variant: "destructive"
      });
    }
  });

  return {
    profile,
    recentTransactions,
    allAchievements,
    unlockedAchievements,
    isLoading: isLoadingProfile,
    awardXp,
    xpPerLevel,
    xpProgress,
    currentLevel,
    currentXp
  };
};
