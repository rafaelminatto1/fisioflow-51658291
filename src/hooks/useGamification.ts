import { useEffect, useCallback, useMemo, useRef } from 'react';
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
  QuestItem,
  parseAchievementRequirements,
  type AchievementRequirement,
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
  awardXp: ReturnType<typeof useMutation<AwardXpResult, Error, AwardXpParams>>;
  completeQuest: ReturnType<typeof useMutation<void, Error, CompleteQuestParams>>;
  freezeStreak: ReturnType<typeof useMutation<void, Error, void>>;
  freezeCost: { price: number; max_per_month: number };
  xpPerLevel: number;
  currentLevel: number;
  currentXp: number;
  totalPoints: number;
  progressToNextLevel: number;
  progressPercentage: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TODAY_UTC = () => new Date().toISOString().split('T')[0];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculates new streak based on current streak and last activity date
 */
const calculateNewStreak = (
  currentStreak: number,
  lastActivityDate: string | null
): { streak: number; shouldReset: boolean } => {
  if (!lastActivityDate) return { streak: 1, shouldReset: false };

  const lastDate = parseISO(lastActivityDate);
  const today = new Date();
  const daysDiff = differenceInCalendarDays(today, lastDate);

  if (daysDiff === 0) return { streak: currentStreak, shouldReset: false };
  if (daysDiff === 1) return { streak: currentStreak + 1, shouldReset: false };
  return { streak: 1, shouldReset: true };
};

/**
 * Calculates level and remaining XP from total XP
 */
const calculateLevel = (
  totalXp: number,
  baseXp: number
): { level: number; remainingXp: number } => {
  if (baseXp <= 0) return { level: 1, remainingXp: totalXp };

  const level = Math.floor(totalXp / baseXp) + 1;
  const remainingXp = totalXp % baseXp;

  return { level, remainingXp };
};

/**
 * Safely parse achievement requirements
 */
const safeParseRequirements = (
  requirements: Achievement['requirements']
): AchievementRequirement | null => {
  try {
    return parseAchievementRequirements(requirements);
  } catch {
    return null;
  }
};

// ============================================================================
// HOOK
// ============================================================================

export const useGamification = (patientId: string): UseGamificationResult => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Prevent race conditions in achievement checking
  const isCheckingAchievements = useRef(false);

  // -------------------------------------------------------------------------
  // 1. Fetch Gamification Settings
  // -------------------------------------------------------------------------
  const { data: settings = [] } = useQuery({
    queryKey: ['gamification-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_settings')
        .select('*');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10,
  });

  const getSetting = useCallback(
    <T,>(key: string, defaultValue: T): T => {
      const setting = settings.find((s) => s.key === key);
      if (!setting?.value) return defaultValue;
      try {
        return setting.value as T;
      } catch {
        return defaultValue;
      }
    },
    [settings]
  );

  const xpMultiplier = Number(getSetting('xp_multiplier', 1));
  const levelBaseXp = Number(getSetting('level_base_xp', 1000));
  const freezeCost = getSetting<{ price: number; max_per_month: number }>(
    'streak_freeze_cost',
    { price: 100, max_per_month: 3 }
  );

  // -------------------------------------------------------------------------
  // 2. Fetch Gamification Profile
  // -------------------------------------------------------------------------
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
          last_activity_date: null,
          patient_id: patientId,
        } as GamificationProfile;
      }

      // Only check streak reset if there's a last activity date and no freeze active
      if (data.last_activity_date) {
        const { shouldReset } = calculateNewStreak(
          data.current_streak,
          data.last_activity_date
        );

        if (shouldReset) {
          const { data: updated, error: updateError } = await supabase
            .from('patient_gamification')
            .update({ current_streak: 0 })
            .eq('id', data.id)
            .select()
            .single();

          if (!updateError && updated) {
            return updated as GamificationProfile;
          }
        }
      }

      return data as GamificationProfile;
    },
    enabled: !!patientId,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });

  // -------------------------------------------------------------------------
  // 3. Parallel Queries for Better Performance
  // -------------------------------------------------------------------------
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
    enabled: !!patientId,
  });

  const { data: allAchievements = [] } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('category', { ascending: true });
      if (error) return [];
      return data as Achievement[];
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  const { data: unlockedAchievements = [] } = useQuery({
    queryKey: ['unlocked-achievements', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements_log')
        .select('*')
        .eq('patient_id', patientId)
        .order('unlocked_at', { ascending: false });
      if (error) return [];
      return data as UnlockedAchievement[];
    },
    enabled: !!patientId,
  });

  // -------------------------------------------------------------------------
  // 4. Daily Quests
  // -------------------------------------------------------------------------
  const getOrCreateDailyQuests = useCallback(async (): Promise<DailyQuestItem[]> => {
    const today = TODAY_UTC();

    // Try to get existing daily quests
    const { data: existingQuests } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('patient_id', patientId)
      .eq('date', today)
      .maybeSingle();

    if (existingQuests?.quests_data) {
      return existingQuests.quests_data as DailyQuestItem[];
    }

    // Create new daily quests from definitions
    const { data: activeQuests } = await supabase
      .from('quest_definitions')
      .select('*')
      .eq('is_active', true)
      .eq('category', 'daily');

    const newQuests: QuestItem[] = (activeQuests || []).map((q) => ({
      id: q.id,
      title: q.title,
      completed: false,
      xp: q.xp_reward,
      icon: q.icon || 'Star',
      description: q.description || '',
    }));

    // Create daily quest record
    await supabase.from('daily_quests').insert({
      patient_id: patientId,
      date: today,
      quests_data: newQuests,
      completed_count: 0,
    });

    return newQuests;
  }, [patientId]);

  const { data: dailyQuests = [] } = useQuery({
    queryKey: ['daily-quests', patientId],
    queryFn: getOrCreateDailyQuests,
    enabled: !!patientId,
    staleTime: 1000 * 60 * 2,
  });

  // -------------------------------------------------------------------------
  // 5. Mutation: Award XP
  // -------------------------------------------------------------------------
  const awardXp = useMutation<AwardXpResult, Error, AwardXpParams>({
    mutationFn: async ({ amount, reason, description }) => {
      if (!patientId) throw new Error('No patient ID');

      const finalAmount = Math.floor(amount * xpMultiplier);

      // Use a transaction to ensure data consistency
      const { data: current } = await supabase
        .from('patient_gamification')
        .select('*')
        .eq('patient_id', patientId)
        .maybeSingle();

      const oldTotal = current?.total_points || 0;
      const oldLevel = current?.level || 1;
      const oldStreak = current?.current_streak || 0;

      // Calculate new values
      const { streak: newStreak } = calculateNewStreak(
        oldStreak,
        current?.last_activity_date || null
      );
      const totalXp = oldTotal + finalAmount;
      const { level: newLevel, remainingXp } = calculateLevel(totalXp, levelBaseXp);
      const newTotal = oldTotal + finalAmount;

      // Upsert profile with new values
      const { data: updated, error: upsertError } = await supabase
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

      if (upsertError) throw upsertError;

      // Log transaction (don't fail if this fails)
      const { error: logError } = await supabase
        .from('xp_transactions')
        .insert({
          patient_id: patientId,
          amount: finalAmount,
          reason,
          description,
        });

      if (logError) {
        console.error('Failed to log XP transaction:', logError);
      }

      return {
        data: updated as GamificationProfile,
        leveledUp: newLevel > oldLevel,
        newLevel,
        streakExtended: newStreak > oldStreak,
      };
    },
    onSuccess: async ({ leveledUp, newLevel }, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['gamification-profile', patientId] });
      queryClient.invalidateQueries({ queryKey: ['xp-transactions', patientId] });

      // Update challenge progress asynchronously (don't await)
      updateChallengeProgress(patientId, variables.reason).catch((err) => {
        console.error('Failed to update challenge progress:', err);
      });

      if (leveledUp) {
        toast({
          title: '🎉 NÍVEL ALCANÇADO!',
          description: `Parabéns! Você chegou ao nível ${newLevel}`,
          className: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-none',
          duration: 5000,
        });
      }
    },
  });

  // -------------------------------------------------------------------------
  // 6. Mutation: Complete Quest
  // -------------------------------------------------------------------------
  const completeQuest = useMutation<void, Error, CompleteQuestParams>({
    mutationFn: async ({ questId }) => {
      const today = TODAY_UTC();

      // Get or create daily quest record
      const { data: record } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('patient_id', patientId)
        .eq('date', today)
        .maybeSingle();

      let quests: QuestItem[] = [];
      let recordId: string;

      if (!record) {
        // Create new record
        const { data: activeQuests } = await supabase
          .from('quest_definitions')
          .select('*')
          .eq('is_active', true)
          .eq('category', 'daily');

        quests = (activeQuests || []).map((q) => ({
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
            quests_data: quests,
            completed_count: 0,
          })
          .select()
          .single();

        if (!newRecord) throw new Error('Failed to create daily quest record');
        recordId = newRecord.id;
      } else {
        quests = (record.quests_data as QuestItem[]) || [];
        recordId = record.id;
      }

      // Find and update quest
      const questIndex = quests.findIndex((q) => q.id === questId);
      if (questIndex === -1) throw new Error('Quest not found');
      if (quests[questIndex].completed) return; // Already completed

      quests[questIndex].completed = true;
      const completedCount = quests.filter((q) => q.completed).length;

      await supabase
        .from('daily_quests')
        .update({ quests_data: quests, completed_count: completedCount })
        .eq('id', recordId);

      // Award XP
      await awardXp.mutateAsync({
        amount: quests[questIndex].xp,
        reason: 'daily_quest',
        description: `Quest: ${quests[questIndex].title}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-quests', patientId] });
    },
  });

  // -------------------------------------------------------------------------
  // 7. Mutation: Streak Freeze
  // -------------------------------------------------------------------------
  const freezeStreak = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!profile) {
        throw new Error('Perfil não encontrado');
      }

      if (profile.total_points < freezeCost.price) {
        throw new Error(`Pontos insuficientes. Necessário: ${freezeCost.price}`);
      }

      const { error } = await supabase
        .from('patient_gamification')
        .update({
          total_points: profile.total_points - freezeCost.price,
          last_activity_date: new Date().toISOString(), // Preserves streak
        })
        .eq('patient_id', patientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-profile', patientId] });
      toast({
        title: '❄️ Sequência Congelada!',
        description: 'Sua sequência foi protegida por hoje.',
      });
    },
  });

  // -------------------------------------------------------------------------
  // 8. Helper: Update Challenge Progress
  // -------------------------------------------------------------------------
  const updateChallengeProgress = useCallback(
    async (pId: string, actionType: XpTransactionReason) => {
      try {
        const today = TODAY_UTC();

        const { data: challenges } = await supabase
          .from('weekly_challenges')
          .select('*')
          .eq('is_active', true)
          .lte('start_date', today)
          .gte('end_date', today);

        if (!challenges?.length) return;

        for (const challenge of challenges) {
          const target = typeof challenge.target === 'string'
            ? JSON.parse(challenge.target)
            : challenge.target;

          const shouldUpdate =
            (target.type === 'sessions' && actionType === 'atendido') ||
            (target.type === 'quests' && actionType === 'daily_quest') ||
            (target.type === 'any' && actionType !== 'achievement_unlocked');

          if (!shouldUpdate) continue;

          const { data: currentProgress } = await supabase
            .from('patient_challenges')
            .select('*')
            .eq('patient_id', pId)
            .eq('challenge_id', challenge.id)
            .maybeSingle();

          const newProgress = (currentProgress?.progress || 0) + 1;
          const isCompleted = newProgress >= target.count;
          const wasCompleted = currentProgress?.completed || false;

          await supabase.from('patient_challenges').upsert({
            patient_id: pId,
            challenge_id: challenge.id,
            progress: newProgress,
            completed: isCompleted,
            completed_at: isCompleted && !wasCompleted ? new Date().toISOString() : currentProgress?.completed_at || null,
            ...(currentProgress?.id ? { id: currentProgress.id } : {}),
          });

          // Award XP only once when completed
          if (isCompleted && !wasCompleted) {
            await awardXp.mutateAsync({
              amount: challenge.xp_reward,
              reason: 'challenge_completion',
              description: `Desafio: ${challenge.title}`,
            });
          }
        }
      } catch (error) {
        console.error('Failed to update challenge progress:', error);
      }
    },
    [awardXp]
  );

  // -------------------------------------------------------------------------
  // 9. Achievement Check (with race condition protection)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const checkAchievements = async () => {
      // Prevent concurrent checks
      if (isCheckingAchievements.current) return;
      if (!profile || !allAchievements.length || isLoadingProfile) return;

      isCheckingAchievements.current = true;

      try {
        for (const achievement of allAchievements) {
          // Check if already unlocked
          const isUnlocked = unlockedAchievements.some(
            (ua) => ua.achievement_id === achievement.id
          );
          if (isUnlocked) continue;

          const requirements = safeParseRequirements(achievement.requirements);
          if (!requirements) continue;

          let unlocked = false;
          const target = requirements.count || 0;

          switch (requirements.type) {
            case 'streak':
              unlocked = profile.current_streak >= target || profile.longest_streak >= target;
              break;
            case 'sessions':
              unlocked = totalSessions >= target;
              break;
            case 'level':
              unlocked = profile.level >= target;
              break;
            case 'quests':
              // For quests, we'd need to track total quests completed
              // This is a placeholder for future implementation
              unlocked = false;
              break;
            default:
              unlocked = false;
          }

          if (unlocked) {
            const { error: insertError } = await supabase
              .from('achievements_log')
              .insert({
                patient_id: patientId,
                achievement_id: achievement.id,
                achievement_title: achievement.title,
                xp_reward: achievement.xp_reward,
                unlocked_at: new Date().toISOString(),
              });

            if (!insertError) {
              // Award XP for achievement
              await awardXp.mutateAsync({
                amount: achievement.xp_reward || 0,
                reason: 'achievement_unlocked',
                description: `Conquista: ${achievement.title}`,
              });

              // Show toast notification
              toast({
                title: '🏆 Conquista Desbloqueada!',
                description: achievement.title,
                className: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none',
                duration: 5000,
              });

              // Invalidate queries to update UI
              queryClient.invalidateQueries({ queryKey: ['unlocked-achievements', patientId] });
            }
          }
        }
      } finally {
        isCheckingAchievements.current = false;
      }
    };

    checkAchievements();
  }, [
    profile,
    totalSessions,
    allAchievements,
    unlockedAchievements,
    isLoadingProfile,
    patientId,
    awardXp,
    toast,
    queryClient,
  ]);

  // -------------------------------------------------------------------------
  // 10. Computed Values
  // -------------------------------------------------------------------------
  const lockedAchievements = useMemo(
    () =>
      allAchievements.filter(
        (achievement) =>
          !unlockedAchievements.some((ua) => ua.achievement_id === achievement.id)
      ),
    [allAchievements, unlockedAchievements]
  );

  const currentLevel = profile?.level || 1;
  const currentXp = profile?.current_xp || 0;
  const totalPoints = profile?.total_points || 0;
  const progressToNextLevel = currentXp;
  const progressPercentage =
    levelBaseXp > 0 ? Math.min((currentXp / levelBaseXp) * 100, 100) : 0;

  // -------------------------------------------------------------------------
  // 11. Return Result
  // -------------------------------------------------------------------------
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
