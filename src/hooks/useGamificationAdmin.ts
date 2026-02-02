/**
 * useGamificationAdmin - Migrated to Firebase
 *
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, doc, getDoc, query as firestoreQuery, where, orderBy, limit,  } from '@/integrations/firebase/app';
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
import { db } from '@/integrations/firebase/app';



// ============================================================================
// TYPES
// ============================================================================

interface Profile {
  id: string;
  last_activity_date?: string;
  level?: number;
  current_streak?: number;
  [key: string]: unknown;
}

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
      const startDate = subDays(today, days);
      const sevenDaysAgo = subDays(today, 7);

      // Parallel queries using Promise.all
      const [
        totalPatientsSnap,
        xpDataSnap,
        profilesSnap,
        achievementsSnap,
      ] = await Promise.all([
        // Total patients with gamification
        getDocs(collection(db, 'patient_gamification')),

        // Total XP awarded (filtered by date)
        getDocs(firestoreQuery(
          collection(db, 'xp_transactions'),
          where('created_at', '>=', startDate.toISOString())
        )),

        // All profiles for averages
        getDocs(collection(db, 'patient_gamification')),

        // Total achievements unlocked (filtered by date)
        getDocs(firestoreQuery(
          collection(db, 'achievements_log'),
          where('created_at', '>=', startDate.toISOString())
        )),
      ]);

      // Calculate statistics
      const allProfiles = profilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalPatients = allProfiles.length;

      // Support both 'amount' and 'xp_amount' column names
      const totalXpAwarded = xpDataSnap.docs.reduce((sum, doc) => {
        const data = doc.data() as { amount?: number; xp_amount?: number };
        const amount = data.amount || data.xp_amount || 0;
        return sum + (typeof amount === 'number' ? amount : 0);
      }, 0);

      const profiles = allProfiles;
      const activeLast30Days = profiles.filter((p: Profile) => {
        const lastActivity = p.last_activity_date ? new Date(p.last_activity_date) : null;
        return lastActivity && lastActivity >= startDate;
      }).length;

      const activeLast7Days = profiles.filter((p: Profile) => {
        const lastActivity = p.last_activity_date ? new Date(p.last_activity_date) : null;
        return lastActivity && lastActivity >= sevenDaysAgo;
      }).length;

      const achievementsUnlocked = achievementsSnap.size;

      const atRiskPatients = profiles.filter((p: Profile) => {
        const lastActivity = p.last_activity_date ? new Date(p.last_activity_date) : null;
        return lastActivity && lastActivity < sevenDaysAgo;
      }).length;

      const averageLevel = profiles.length > 0
        ? profiles.reduce((sum, p: Profile) => sum + (p.level || 0), 0) / profiles.length
        : 0;

      const averageStreak = profiles.length > 0
        ? profiles.reduce((sum, p: Profile) => sum + (p.current_streak || 0), 0) / profiles.length
        : 0;

      const engagementRate = totalPatients > 0
        ? (activeLast30Days / totalPatients) * 100
        : 0;

      return {
        totalPatients,
        totalXpAwarded,
        averageLevel: Math.round(averageLevel * 10) / 10,
        averageStreak: Math.round(averageStreak * 10) / 10,
        activeLast30Days,
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
      const startDate = subDays(new Date(), days);

      const q = firestoreQuery(
        collection(db, 'xp_transactions'),
        where('created_at', '>=', startDate.toISOString()),
        orderBy('created_at', 'asc')
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) return [];

      const transactions = snapshot.docs.map(doc => doc.data());

      // Group by date
      interface TransactionData {
        created_at: string;
        patient_id: string;
        amount?: number;
        xp_amount?: number;
        reason?: string;
      }

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
        const amount = (t as TransactionData).amount || (t as TransactionData).xp_amount || 0;
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

      const q = firestoreQuery(
        collection(db, 'patient_gamification'),
        where('last_activity_date', '<', sevenDaysAgo.toISOString()),
        orderBy('last_activity_date', 'asc'),
        limit(50)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) return [];

      // Fetch patient names for each at-risk patient
      const results: AtRiskPatient[] = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const patientId = doc.id;

        // Fetch patient info
        const patientQuery = firestoreQuery(
          collection(db, 'patients'),
          where('__name__', '==', patientId),
          limit(1)
        );
        const patientSnap = await getDocs(patientQuery);
        const patientInfo = patientSnap.empty ? {} : patientSnap.docs[0].data();

        const lastActivity = data.last_activity_date ? new Date(data.last_activity_date) : null;
        const daysInactive = lastActivity ? differenceInDays(new Date(), lastActivity) : 999;

        interface PatientInfo {
          full_name?: string;
          email?: string;
        }

        results.push({
          patient_id: patientId,
          patient_name: (patientInfo as PatientInfo).full_name || 'Desconhecido',
          email: (patientInfo as PatientInfo).email,
          level: data.level,
          lastActivity: data.last_activity_date,
          daysInactive,
        });
      }

      return results;
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
      const [achievementsSnap, unlockedSnap, patientsSnap] = await Promise.all([
        getDocs(collection(db, 'achievements')),
        getDocs(collection(db, 'achievements_log')),
        getDocs(collection(db, 'patient_gamification')),
      ]);

      if (achievementsSnap.empty) return [];

      // Count unlocks per achievement - support both UUID and TEXT achievement_id
      const unlockCounts = unlockedSnap.docs.reduce((acc, doc) => {
        const data = doc.data();
        const key = data.achievement_id || data.achievement_title || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const total = patientsSnap.size || 1;

      return achievementsSnap.docs
        .map(doc => {
          const data = doc.data();
          // Try to match by id, then by code, then by title
          const count = unlockCounts[doc.id] || unlockCounts[data.code] || unlockCounts[data.title] || 0;
          return {
            id: doc.id,
            title: data.title,
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
      const q = firestoreQuery(
        collection(db, 'gamification_settings'),
        where('key', 'in', [
          'level_progression_type',
          'level_base_xp',
          'level_multiplier',
          'level_titles',
          'level_rewards',
        ])
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const getSetting = (key: string, defaultValue: unknown) => {
        const settingDoc = snapshot.docs.find(doc => doc.data().key === key);
        if (!settingDoc?.data()?.value) return defaultValue;
        try {
          const value = settingDoc.data().value;
          return typeof defaultValue === 'number' ? Number(value) : value;
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
      const docRef = doc(db, 'patient_gamification', patientId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Perfil de gamificação não encontrado');
      }

      const current = docSnap.data();
      const oldTotal = current.total_points || 0;
      const newTotal = Math.max(0, oldTotal + amount);

      // Update profile
      await updateDoc(docRef, { total_points: newTotal });

      // Log transaction
      await addDoc(collection(db, 'xp_transactions'), {
        patient_id: patientId,
        amount,
        reason: 'manual_adjustment',
        description: reason,
        created_at: new Date().toISOString(),
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
      const docRef = doc(db, 'patient_gamification', patientId);
      await updateDoc(docRef, {
        current_streak: 0,
        last_activity_date: new Date().toISOString(),
      });

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
      // Get all setting documents
      const q = firestoreQuery(
        collection(db, 'gamification_settings'),
        where('key', 'in', [
          'level_progression_type',
          'level_base_xp',
          'level_multiplier',
        ])
      );

      const snapshot = await getDocs(q);

      // Update each setting
      const updates = snapshot.docs.map(docSnap => {
        const key = docSnap.data().key;
        let value: string | number;

        switch (key) {
          case 'level_progression_type':
            value = settings.progressionType;
            break;
          case 'level_base_xp':
            value = settings.baseXp;
            break;
          case 'level_multiplier':
            value = settings.multiplier;
            break;
          default:
            return Promise.resolve();
        }

        return updateDoc(doc(db, 'gamification_settings', docSnap.id), { value });
      });

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
