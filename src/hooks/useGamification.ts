import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface GamificationData {
  id: string;
  patient_id: string;
  level: number;
  xp: number;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  achievements: any[];
}

export function useGamification(patientId: string) {
  const queryClient = useQueryClient();

  const { data: gamification, isLoading } = useQuery({
    queryKey: ['gamification', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_gamification')
        .select('*')
        .eq('patient_id', patientId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Se não existe, criar
      if (!data) {
        const { data: newData, error: createError } = await supabase
          .from('patient_gamification')
          .insert({
            patient_id: patientId,
            level: 1,
            xp: 0,
            total_points: 0,
            current_streak: 0,
            longest_streak: 0,
            achievements: []
          })
          .select()
          .single();

        if (createError) throw createError;
        return newData;
      }

      return data;
    },
    enabled: !!patientId
  });

  const addXP = useMutation({
    mutationFn: async ({ amount, reason, description }: { amount: number; reason: string; description?: string }) => {
      // Registrar transação
      await supabase
        .from('xp_transactions')
        .insert({
          patient_id: patientId,
          xp_amount: amount,
          reason,
          description
        });

      // Atualizar gamificação
      const newXP = (gamification?.xp || 0) + amount;
      const newTotalPoints = (gamification?.total_points || 0) + amount;
      let newLevel = gamification?.level || 1;
      let remainingXP = newXP;

      // Calcular nível (cada nível precisa de 1000 XP)
      while (remainingXP >= 1000) {
        remainingXP -= 1000;
        newLevel++;
      }

      const { error } = await supabase
        .from('patient_gamification')
        .update({
          xp: remainingXP,
          level: newLevel,
          total_points: newTotalPoints
        })
        .eq('patient_id', patientId);

      if (error) throw error;

      return { newLevel, leveledUp: newLevel > (gamification?.level || 1) };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gamification', patientId] });
      
      if (data.leveledUp) {
        toast({
          title: '🎉 Subiu de nível!',
          description: `Parabéns! Você atingiu o nível ${data.newLevel}!`,
        });
      }
    }
  });

  const updateStreak = useMutation({
    mutationFn: async (newStreak: number) => {
      const longestStreak = Math.max(gamification?.longest_streak || 0, newStreak);
      
      const { error } = await supabase
        .from('patient_gamification')
        .update({
          current_streak: newStreak,
          longest_streak: longestStreak
        })
        .eq('patient_id', patientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification', patientId] });
    }
  });

  const unlockAchievement = useMutation({
    mutationFn: async ({ achievementId, title, xpReward }: { achievementId: string; title: string; xpReward: number }) => {
      // Registrar conquista
      await supabase
        .from('achievements_log')
        .insert({
          patient_id: patientId,
          achievement_id: achievementId,
          achievement_title: title,
          xp_reward: xpReward
        });

      // Adicionar XP
      await addXP.mutateAsync({
        amount: xpReward,
        reason: 'achievement',
        description: `Conquista desbloqueada: ${title}`
      });

      // Atualizar lista de conquistas
      const currentAchievements = Array.isArray(gamification?.achievements) 
        ? gamification.achievements 
        : [];
      await supabase
        .from('patient_gamification')
        .update({
          achievements: [...currentAchievements, achievementId] as any
        })
        .eq('patient_id', patientId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gamification', patientId] });
      toast({
        title: '🏆 Conquista Desbloqueada!',
        description: `${variables.title} (+${variables.xpReward} XP)`,
      });
    }
  });

  return {
    gamification,
    isLoading,
    addXP,
    updateStreak,
    unlockAchievement
  };
}

export function useXPTransactions(patientId: string) {
  return useQuery({
    queryKey: ['xp-transactions', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!patientId
  });
}

export function useAchievements(patientId: string) {
  return useQuery({
    queryKey: ['achievements', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements_log')
        .select('*')
        .eq('patient_id', patientId)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!patientId
  });
}
