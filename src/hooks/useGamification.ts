import { useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  DailyQuestItem,
  GamificationProfile,
  Achievement,
  UnlockedAchievement,
  XpTransactionReason,
  AwardXpParams,
  AwardXpResult,
  CompleteQuestParams,
} from '@/types/gamification';

// ============================================================================
// TYPES
// ============================================================================

export interface UseGamificationResult {
  profile: GamificationProfile | null | undefined;
  dailyQuests: DailyQuestItem[];
  allAchievements: Achievement[];
  unlockedAchievements: UnlockedAchievement[];
  lockedAchievements: Achievement[];
  isLoading: boolean;
  awardXp: ReturnType<typeof useMutation>;
  completeQuest: ReturnType<typeof useMutation>;
  freezeStreak: ReturnType<typeof useMutation>;
  freezeCost: { price: number; max_per_month: number };
  xpPerLevel: number;
  currentLevel: number;
  currentXp: number;
  totalPoints: number;
  progressToNextLevel: number;
  progressPercentage: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const calculateNewStreak = (currentStreak: number, lastActivityDate: string | null): number => {
  if (!lastActivityDate) return 1;

  const lastDate = parseISO(lastActivityDate);
  const today = new Date();
  const daysDiff = differenceInCalendarDays(today, lastDate);

  if (daysDiff === 0) return currentStreak;
  if (daysDiff === 1) return currentStreak + 1;
  return 1;
};

const calculateLevel = (totalXp: number, baseXp: number): { level: number; remainingXp: number } => {
  let level = 1;
  let remainingXp = totalXp;

  while (remainingXp >= baseXp) {
    level += 1;
    remainingXp -= baseXp;
  }

  return { level, remainingXp };
};

const parseRequirements = (requirements: Achievement['requirements']) => {
  if (typeof requirements === 'string') {
    try {
      return JSON.parse(requirements);
    } catch {
      return null;
    }
  }
  return requirements;
};

// ============================================================================
// HOOK
// ============================================================================

export const useGamification = (patientId: string): UseGamificationResult => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch Gamification Settings
  const { data: settings = [] } = useQuery({
    queryKey: ['gamification-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gamification_settings').select('*');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const getSetting = useCallback(
    <T,>(key: string, defaultValue: T): T => {
      const setting = settings.find((s) => s.key === key);
      return (setting?.value as T) ?? defaultValue;
    },
    [settings]
  );

  const xpMultiplier = Number(getSetting('xp_multiplier', 1));
  const levelBaseXp = Number(getSetting('level_base_xp', 1000));
  const freezeCost = getSetting('streak_freeze_cost', { price: 100, max_per_month: 3 });

  // 2. Fetch Gamification Profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['gamification-profile', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_gamification')
        .select('*')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

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

      // Check Streak Loss Logic (without freeze for now)
      if (data.last_activity_date) {
        const lastActivity = parseISO(data.last_activity_date);
        const today = new Date();
        const daysDiff = differenceInCalendarDays(today, lastActivity);

        if (daysDiff > 1) {
          // We might want to check for auto-freeze here if we implement it, 
          // but for now, we just reset if they haven't manually frozen it.
          // However, let's just keep the reset logic as is and handle freeze as a manual action.
          const { data: updated } = await supabase
            .from('patient_gamification')
            .update({ current_streak: 0 })
            .eq('id', data.id)
            .select()
            .single();

          if (updated) return updated as GamificationProfile;
        }
      }

      return data as GamificationProfile;
    },
    enabled: !!patientId,
  });

  // 3. Other Queries (Sessions, Transactions, Achievements, Quests)
  const { data: totalSessions = 0 } = useQuery({
    queryKey: ['total-sessions', patientId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', patientId)
        .eq('status', 'atendido');
      if (error) return 0;
      return count || 0;
    },
    enabled: !!patientId
  });

  const { data: allAchievements = [] } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('achievements').select('*');
      if (error) return [];
      return data as Achievement[];
    }
  });

  const { data: unlockedAchievements = [] } = useQuery({
    queryKey: ['unlocked-achievements', patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('achievements_log').select('*').eq('patient_id', patientId);
      if (error) return [];
      return data as UnlockedAchievement[];
    },
    enabled: !!patientId,
  });

  const { data: dailyQuestsData } = useQuery({
    queryKey: ['daily-quests', patientId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('patient_id', patientId)
        .eq('date', today)
        .maybeSingle();

      if (!data) {
        const { data: activeQuests } = await supabase
          .from('quest_definitions')
          .select('*')
          .eq('is_active', true)
          .eq('category', 'daily');

        return {
          quests_data: (activeQuests || []).map(q => ({
            id: q.id,
            title: q.title,
            completed: false,
            xp: q.xp_reward,
            icon: q.icon || 'Star',
            description: q.description || ''
          }))
        };
      }
      return data;
    },
    enabled: !!patientId
  });

  const dailyQuests = ((dailyQuestsData?.quests_data as unknown) || []) as DailyQuestItem[];

  // 4. Mutation: Award XP
  const awardXp = useMutation({
    mutationFn: async ({ amount, reason, description }: AwardXpParams): Promise<AwardXpResult> => {
      if (!patientId) throw new Error('No patient ID');

      const finalAmount = Math.floor(amount * xpMultiplier);

      // 1. Log Transaction
      await supabase.from('xp_transactions').insert({
        patient_id: patientId,
        amount: finalAmount,
        reason,
        description,
      });

      // 2. Fetch current state
      const { data: current } = await supabase
        .from('patient_gamification')
        .select('*')
        .eq('patient_id', patientId)
        .maybeSingle();

      const oldXp = current?.current_xp || 0;
      const oldTotal = current?.total_points || 0;
      const oldLevel = current?.level || 1;
      const oldStreak = current?.current_streak || 0;

      // Calculate new values using utility functions
      const newStreak = calculateNewStreak(oldStreak, current?.last_activity_date || null);
      const totalXp = oldXp + finalAmount;
      const { level: newLevel, remainingXp } = calculateLevel(totalXp, levelBaseXp);
      const newTotal = oldTotal + finalAmount;

      // 3. Update Profile
      const { data: updated } = await supabase
        .from('patient_gamification')
        .upsert({
          patient_id: patientId,
          updated_at: new Date().toISOString(),
          current_xp: remainingXp,
          level: newLevel,
          total_points: newTotal,
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, current?.longest_streak || 0),
          last_activity_date: new Date().toISOString(),
          ...(current?.id ? { id: current.id } : {}),
        })
        .select()
        .single();

      // 4. Automatic Challenge Progress Update
      await updateChallengeProgress(patientId, reason);

      return {
        data: updated as GamificationProfile,
        leveledUp: newLevel > oldLevel,
        newLevel,
        streakExtended: newStreak > oldStreak,
      };
    },
    onSuccess: ({ leveledUp, newLevel, streakExtended }) => {
      queryClient.invalidateQueries({ queryKey: ['gamification-profile', patientId] });
      queryClient.invalidateQueries({ queryKey: ['xp-transactions', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient-challenges', patientId] });

      // Notificação de streak desativada
      // if (streakExtended) {
      //   toast({
      //     title: '🔥 Streak Ativo!',
      //     description: 'Sua sequência está aumentando!',
      //     className: 'bg-orange-500 text-white border-none',
      //   });
      // }

      if (leveledUp) {
        toast({
          title: 'NÍVEL ALCANÇADO! 🎉',
          description: `Parabéns! Você chegou ao nível ${newLevel}`,
          className: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-none',
        });
      }
    },
  });

  // 5. Mutation: Streak Freeze
  const freezeStreak = useMutation({
    mutationFn: async () => {
      if (!profile || profile.total_points < freezeCost.price) {
        throw new Error("Pontos insuficientes para congelar sequência.");
      }

      const { error } = await supabase
        .from('patient_gamification')
        .update({
          total_points: profile.total_points - freezeCost.price,
          last_activity_date: new Date().toISOString() // Simulates activity to preserve streak
        })
        .eq('patient_id', patientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-profile', patientId] });
      toast({ title: "❄️ Sequência Congelada!", description: "Sua sequência foi protegida por hoje." });
    }
  });

  // 6. Automation: Challenge Progress
  const updateChallengeProgress = async (pId: string, actionType: string) => {
    // Fetch active challenges for this user
    const { data: challenges } = await supabase
      .from('weekly_challenges')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0]);

    if (!challenges) return;

    for (const challenge of challenges) {
      const target = challenge.target as any;
      if (
        (target.type === 'sessions' && actionType === 'atendido') ||
        (target.type === 'quests' && actionType === 'daily_quest') ||
        (target.type === 'any' && actionType !== 'achievement_unlocked')
      ) {
        // UPSERT progress
        const { data: currentProgress } = await supabase
          .from('patient_challenges')
          .select('*')
          .eq('patient_id', pId)
          .eq('challenge_id', challenge.id)
          .maybeSingle();

        const newProgress = (currentProgress?.progress || 0) + 1;
        const isCompleted = newProgress >= target.count;

        await supabase
          .from('patient_challenges')
          .upsert({
            patient_id: pId,
            challenge_id: challenge.id,
            progress: newProgress,
            completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : (currentProgress?.completed_at || null),
            ...(currentProgress?.id ? { id: currentProgress.id } : {})
          });

        if (isCompleted && !currentProgress?.completed) {
          // Award challenge reward
          await awardXp.mutateAsync({
            amount: challenge.xp_reward,
            reason: 'challenge_completion',
            description: `Desafio: ${challenge.title}`
          });
          // Also handle point_reward if needed
        }
      }
    }
  };

  // 7. Achievement Check
  useEffect(() => {
    const checkAchievements = async () => {
      if (!profile || !allAchievements.length || isLoadingProfile) return;

      for (const achievement of allAchievements) {
        const isUnlocked = unlockedAchievements.some((ua) => ua.achievement_id === achievement.id);
        if (isUnlocked) continue;

        const requirements = parseRequirements(achievement.requirements);
        if (!requirements) continue;

        let unlocked = false;
        const target = Number(requirements.count || 0);

        if (requirements.type === 'streak' && (profile.current_streak >= target || profile.longest_streak >= target)) {
          unlocked = true;
        } else if (requirements.type === 'sessions' && totalSessions >= target) {
          unlocked = true;
        } else if (requirements.type === 'level' && profile.level >= target) {
          unlocked = true;
        }

        if (unlocked) {
          await supabase.from('achievements_log').insert({
            patient_id: patientId,
            achievement_id: achievement.id,
            achievement_title: achievement.title,
            xp_reward: achievement.xp_reward,
            unlocked_at: new Date().toISOString(),
          });

          await awardXp.mutateAsync({
            amount: achievement.xp_reward || 0,
            reason: 'achievement_unlocked',
            description: `Conquista: ${achievement.title}`,
          });
        }
      }
    };

    checkAchievements();
  }, [profile, totalSessions, allAchievements, unlockedAchievements.length, isLoadingProfile, patientId, awardXp]);

  // 8. Computed values
  const lockedAchievements = useMemo(
    () => allAchievements.filter((achievement) => !unlockedAchievements.some((ua) => ua.achievement_id === achievement.id)),
    [allAchievements, unlockedAchievements]
  );

  const currentLevel = profile?.level || 1;
  const currentXp = profile?.current_xp || 0;
  const totalPoints = profile?.total_points || 0;
  const progressToNextLevel = currentXp;
  const progressPercentage = levelBaseXp > 0 ? (currentXp / levelBaseXp) * 100 : 0;

  // 9. Mutation: Complete Quest
  const completeQuest = useMutation({
    mutationFn: async ({ questId }: CompleteQuestParams) => {
      const today = new Date().toISOString().split('T')[0];
      let { data: record } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('patient_id', patientId)
        .eq('date', today)
        .maybeSingle();

      if (!record) {
        const { data: activeQuests } = await supabase
          .from('quest_definitions')
          .select('*')
          .eq('is_active', true)
          .eq('category', 'daily');
        const initialQuests = (activeQuests || []).map((q) => ({
          id: q.id,
          title: q.title,
          completed: false,
          xp: q.xp_reward,
          icon: q.icon || 'Star',
          description: q.description || '',
        }));
        const { data: newRecord } = await supabase
          .from('daily_quests')
          .insert({
            patient_id: patientId,
            date: today,
            quests_data: initialQuests as any,
            completed_count: 0,
          })
          .select()
          .single();
        record = newRecord;
      }

      const quests = (record?.quests_data as any[]) || [];
      const idx = quests.findIndex((q) => q.id === questId);
      if (idx === -1 || quests[idx].completed) return;

      quests[idx].completed = true;
      await supabase
        .from('daily_quests')
        .update({ quests_data: quests, completed_count: quests.filter((q) => q.completed).length })
        .eq('id', record?.id);

      await awardXp.mutateAsync({
        amount: quests[idx].xp,
        reason: 'daily_quest',
        description: `Quest: ${quests[idx].title}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-quests', patientId] });
    },
  });

  return {
    profile,
    dailyQuests,
    allAchievements,
    unlockedAchievements,
    lockedAchievements,
    isLoading: isLoadingProfile,
    awardXp,
    completeQuest,
    freezeStreak,
    freezeCost,
    xpPerLevel: levelBaseXp,
    currentLevel,
    currentXp,
    totalPoints,
    progressToNextLevel,
    progressPercentage,
  };
};
