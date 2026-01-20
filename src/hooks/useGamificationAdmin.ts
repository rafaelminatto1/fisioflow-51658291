import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, subMonths, startOfDay, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  GamificationStats,
  EngagementData,
  AtRiskPatient,
  PopularAchievement,
  LevelConfig,
  LevelReward,
  ProgressionType,
  LeaderboardEntry,
  LeaderboardFilters,
} from '@/types/gamification';

// ============================================================================
// TYPES
// ============================================================================

export interface UseGamificationAdminResult {
  // Statistics
  stats: GamificationStats | undefined;
  statsLoading: boolean;

  // Engagement data
  engagementData: EngagementData[] | undefined;
  engagementLoading: boolean;

  // At-risk patients
  atRiskPatients: AtRiskPatient[] | undefined;
  atRiskPatientsLoading: boolean;

  // Popular achievements
  popularAchievements: PopularAchievement[] | undefined;
  popularAchievementsLoading: boolean;

  // Level system settings
  levelSettings: {
    progressionType: ProgressionType;
    baseXp: number;
    multiplier: number;
    titles: string[];
    rewards: LevelReward[];
  } | undefined;
  levelSettingsLoading: boolean;

  // Mutations
  adjustXp: ReturnType<typeof useAdjustXp>;
  resetStreak: ReturnType<typeof useResetStreak>;
  updateLevelSettings: ReturnType<typeof useUpdateLevelSettings>;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for gamification administration - statistics, analytics, and management
 */
export const useGamificationAdmin = (days: number = 30): UseGamificationAdminResult => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // -------------------------------------------------------------------------
  // 1. Statistics Query
  // -------------------------------------------------------------------------
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['gamification-admin-stats', days],
    queryFn: async (): Promise<GamificationStats> => {
      const today = new Date();
      const startDate = subDays(today, days).toISOString();
      const sevenDaysAgo = subDays(today, 7).toISOString(); // Keep for specific "recent" metric

      // Parallel queries using Promise.all
      const [
        totalPatientsResult,
        xpDataResult,
        profilesResult,
        activeInPeriodResult,
        active7DaysResult,
        achievementsCountResult,
        atRiskCountResult,
      ] = await Promise.all([
        // Total patients with gamification
        supabase
          .from('patient_gamification')
          .select('*', { count: 'exact', head: true }),

        // Total XP awarded (filtered by date)
        supabase
          .from('xp_transactions')
          .select('amount, xp_amount')
          .gte('created_at', startDate),

        // All profiles for averages
        supabase
          .from('patient_gamification')
          .select('level, current_streak, total_points'),

        // Active patients in selected period
        supabase
          .from('patient_gamification')
          .select('*', { count: 'exact', head: true })
          .gte('last_activity_date', startDate),

        // Active patients last 7 days (fixed metric)
        supabase
          .from('patient_gamification')
          .select('*', { count: 'exact', head: true })
          .gte('last_activity_date', sevenDaysAgo),

        // Total achievements unlocked (filtered by date)
        supabase
          .from('achievements_log')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate),

        // At-risk patients (no activity in 7+ days)
        supabase
          .from('patient_gamification')
          .select('*', { count: 'exact', head: true })
          .lt('last_activity_date', sevenDaysAgo),
      ]);

      // Calculate statistics
      const totalPatients = totalPatientsResult.count || 0;
      // Support both 'amount' and 'xp_amount' column names
      const totalXpAwarded = xpDataResult.data?.reduce((sum, t) => {
        const amount = (t as any).amount || (t as any).xp_amount || 0;
        return sum + amount;
      }, 0) || 0;
      const profiles = profilesResult.data || [];
      const activeLast30Days = activeInPeriodResult.count || 0; // Renamed var, keeping prop name for compat
      const activeLast7Days = active7DaysResult.count || 0;
      const achievementsUnlocked = achievementsCountResult.count || 0;
      const atRiskPatients = atRiskCountResult.count || 0;

      const averageLevel = profiles.length > 0
        ? profiles.reduce((sum, p) => sum + p.level, 0) / profiles.length
        : 0;

      const averageStreak = profiles.length > 0
        ? profiles.reduce((sum, p) => sum + p.current_streak, 0) / profiles.length
        : 0;

      const engagementRate = totalPatients > 0
        ? (activeLast30Days / totalPatients) * 100
        : 0;

      return {
        totalPatients,
        totalXpAwarded,
        averageLevel: Math.round(averageLevel * 10) / 10,
        averageStreak: Math.round(averageStreak * 10) / 10,
        activeLast30Days, // Represents active in "days" period
        activeLast7Days,
        achievementsUnlocked,
        engagementRate: Math.round(engagementRate * 10) / 10,
        atRiskPatients,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
  });

  // -------------------------------------------------------------------------
  // 2. Engagement Data Query
  // -------------------------------------------------------------------------
  const { data: engagementData, isLoading: engagementLoading } = useQuery({
    queryKey: ['gamification-admin-engagement', days],
    queryFn: async (): Promise<EngagementData[]> => {
      const startDate = subDays(new Date(), days).toISOString();

      const { data: transactions } = await supabase
        .from('xp_transactions')
        .select('created_at, amount, xp_amount, reason, patient_id')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true });

      if (!transactions || transactions.length === 0) return [];

      // Group by date
      const grouped = transactions.reduce((acc, t) => {
        const date = t.created_at.split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            activePatients: 0,
            questsCompleted: 0,
            xpAwarded: 0,
            achievementsUnlocked: 0,
          };
        }
        // Support both 'amount' and 'xp_amount' column names
        const amount = (t as any).amount || (t as any).xp_amount || 0;
        acc[date].xpAwarded += amount;
        if (t.reason === 'daily_quest') acc[date].questsCompleted++;
        if (t.reason === 'achievement_unlocked') acc[date].achievementsUnlocked++;
        return acc;
      }, {} as Record<string, EngagementData>);

      // Count unique patients per date
      const uniquePatientsPerDate = transactions.reduce((acc, t) => {
        const date = t.created_at.split('T')[0];
        const key = `${date}-${t.patient_id}`;
        acc[key] = true;
        return acc;
      }, {} as Record<string, boolean>);

      // Calculate active patients per date
      Object.keys(grouped).forEach(date => {
        const count = Object.keys(uniquePatientsPerDate).filter(key => key.startsWith(date)).length;
        grouped[date].activePatients = count;
      });

      return Object.values(grouped);
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // -------------------------------------------------------------------------
  // 3. At-Risk Patients Query
  // -------------------------------------------------------------------------
  const { data: atRiskPatients, isLoading: atRiskPatientsLoading } = useQuery({
    queryKey: ['gamification-admin-at-risk'],
    queryFn: async (): Promise<AtRiskPatient[]> => {
      const sevenDaysAgo = subDays(new Date(), 7);

      const { data } = await supabase
        .from('patient_gamification')
        .select(`
          patient_id,
          last_activity_date,
          level,
          patients!inner(full_name, email)
        `)
        .lt('last_activity_date', sevenDaysAgo.toISOString())
        .order('last_activity_date', { ascending: true })
        .limit(50);

      if (!data) return [];

      return data.map((p: any) => {
        const lastActivity = p.last_activity_date ? new Date(p.last_activity_date) : null;
        const daysInactive = lastActivity ? differenceInDays(new Date(), lastActivity) : 999;

        return {
          patient_id: p.patient_id,
          patient_name: p.patients?.full_name || 'Desconhecido',
          email: p.patients?.email,
          level: p.level,
          lastActivity: p.last_activity_date,
          daysInactive,
        };
      });
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // -------------------------------------------------------------------------
  // 4. Popular Achievements Query
  // -------------------------------------------------------------------------
  const { data: popularAchievements, isLoading: popularAchievementsLoading } = useQuery({
    queryKey: ['gamification-admin-popular-achievements'],
    queryFn: async (): Promise<PopularAchievement[]> => {
      const [achievementsResult, unlockedResult] = await Promise.all([
        supabase.from('achievements').select('id, code, title'),
        supabase.from('achievements_log').select('achievement_id, achievement_title'),
      ]);

      if (!achievementsResult.data || !unlockedResult.data) return [];

      // Count unlocks per achievement - support both UUID and TEXT achievement_id
      const unlockCounts = unlockedResult.data.reduce((acc, log) => {
        const key = log.achievement_id || log.achievement_title || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalPatients = await supabase
        .from('patient_gamification')
        .select('*', { count: 'exact', head: true });

      const total = totalPatients.count || 1;

      return achievementsResult.data
        .map(a => {
          // Try to match by id, then by code, then by title
          const count = unlockCounts[a.id] || unlockCounts[a.code] || unlockCounts[a.title] || 0;
          return {
            id: a.id,
            title: a.title,
            unlockedCount: count,
            totalPatients: total,
            unlockRate: (count / total) * 100,
          };
        })
        .sort((a, b) => b.unlockedCount - a.unlockedCount)
        .slice(0, 10);
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 15,
  });

  // -------------------------------------------------------------------------
  // 5. Level Settings Query
  // -------------------------------------------------------------------------
  const { data: levelSettings, isLoading: levelSettingsLoading } = useQuery({
    queryKey: ['gamification-admin-level-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gamification_settings')
        .select('*')
        .in('key', [
          'level_progression_type',
          'level_base_xp',
          'level_multiplier',
          'level_titles',
          'level_rewards',
        ]);

      if (!data) return null;

      const getSetting = (key: string, defaultValue: any) => {
        const setting = data.find(s => s.key === key);
        if (!setting?.value) return defaultValue;
        try {
          return typeof defaultValue === 'number' ? Number(setting.value) : setting.value;
        } catch {
          return defaultValue;
        }
      };

      return {
        progressionType: getSetting('level_progression_type', 'linear') as ProgressionType,
        baseXp: getSetting('level_base_xp', 1000),
        multiplier: getSetting('level_multiplier', 1.5),
        titles: getSetting('level_titles', []) as string[],
        rewards: getSetting('level_rewards', []) as LevelReward[],
      };
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // -------------------------------------------------------------------------
  // 6. Mutations
  // -------------------------------------------------------------------------

  // Adjust XP mutation
  const adjustXp = useAdjustXp();

  // Reset streak mutation
  const resetStreak = useResetStreak();

  // Update level settings mutation
  const updateLevelSettings = useUpdateLevelSettings();

  return {
    stats,
    statsLoading,
    engagementData,
    engagementLoading,
    atRiskPatients,
    atRiskPatientsLoading,
    popularAchievements,
    popularAchievementsLoading,
    levelSettings,
    levelSettingsLoading,
    adjustXp,
    resetStreak,
    updateLevelSettings,
  };
};

// ============================================================================
// MUTATION HOOKS
// ============================================================================

function useAdjustXp() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ patientId, amount, reason }: { patientId: string; amount: number; reason: string }) => {
      // Get current profile
      const { data: current } = await supabase
        .from('patient_gamification')
        .select('*')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (!current) {
        throw new Error('Perfil de gamificação não encontrado');
      }

      const oldTotal = current.total_points || 0;
      const newTotal = Math.max(0, oldTotal + amount);

      // Update profile
      const { error } = await supabase
        .from('patient_gamification')
        .update({ total_points: newTotal })
        .eq('patient_id', patientId);

      if (error) throw error;

      // Log transaction
      await supabase.from('xp_transactions').insert({
        patient_id: patientId,
        amount,
        reason: 'manual_adjustment',
        description: reason,
      });

      return { patientId, amount, newTotal };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-admin-at-risk'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-profile', result.patientId] });

      toast({
        title: 'XP ajustado com sucesso',
        description: `${result.amount > 0 ? '+' : ''}${result.amount} XP (${result.newTotal} total)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao ajustar XP',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

function useResetStreak() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ patientId, patientName }: { patientId: string; patientName?: string }) => {
      const { error } = await supabase
        .from('patient_gamification')
        .update({
          current_streak: 0,
          last_activity_date: new Date().toISOString(),
        })
        .eq('patient_id', patientId);

      if (error) throw error;
      return { patientId, patientName };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-admin-at-risk'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-profile', result.patientId] });

      toast({
        title: 'Streak resetado',
        description: `Streak de ${result.patientName || 'paciente'} foi resetado para 0`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao resetar streak',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

function useUpdateLevelSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: {
      progressionType: ProgressionType;
      baseXp: number;
      multiplier: number;
    }) => {
      const updates = [
        supabase
          .from('gamification_settings')
          .update({ value: settings.progressionType })
          .eq('key', 'level_progression_type'),

        supabase
          .from('gamification_settings')
          .update({ value: settings.baseXp })
          .eq('key', 'level_base_xp'),

        supabase
          .from('gamification_settings')
          .update({ value: settings.multiplier })
          .eq('key', 'level_multiplier'),
      ];

      await Promise.all(updates);
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin-level-settings'] });

      toast({
        title: 'Configurações atualizadas',
        description: 'Sistema de níveis foi configurado com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar configurações',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate level curve based on progression type
 */
export const calculateLevelCurve = (
  progressionType: ProgressionType,
  baseXp: number,
  multiplier: number,
  maxLevel: number = 50
): LevelConfig[] => {
  const levels: LevelConfig[] = [];

  for (let level = 1; level <= maxLevel; level++) {
    let xpRequired: number;

    switch (progressionType) {
      case 'linear':
        xpRequired = baseXp * level;
        break;
      case 'exponential':
        xpRequired = Math.floor(baseXp * Math.pow(multiplier, level - 1));
        break;
      case 'custom':
        xpRequired = baseXp * level; // Default to linear for custom
        break;
      default:
        xpRequired = baseXp * level;
    }

    levels.push({
      level,
      xpRequired,
    });
  }

  return levels;
};
