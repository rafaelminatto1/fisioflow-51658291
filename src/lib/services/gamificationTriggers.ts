import { supabase } from '@/integrations/supabase/client';

/**
 * XP Rewards Configuration
 * Centralized configuration for all XP rewards in the system
 * These values can be overridden by database settings
 */
export const XP_REWARDS = {
  // Session Activities
  SESSION_COMPLETION: 50,
  SESSION_WITH_EXERCISES: 10, // per exercise

  // Exercise Activities
  EXERCISE_COMPLETED: 5,
  EXERCISE_MASTERY: 25, // completed 10 times

  // Goal Activities
  GOAL_ACHIEVED: 100,
  GOAL_PROGRESS: 10, // per 25% progress

  // Appointment Activities
  APPOINTMENT_ATTENDED: 30,
  APPOINTMENT_ON_TIME: 20,

  // Social Activities
  PROFILE_COMPLETED: 50,
  FIRST_LOGIN: 100,

  // Streak Bonuses
  STREAK_3_DAYS: 50,
  STREAK_7_DAYS: 100,
  STREAK_30_DAYS: 500,

  // Special Achievements
  PERFECT_SESSION: 75, // all exercises completed
  EARLY_BIRD: 30, // session before 10am
  NIGHT_OWL: 30, // session after 6pm
} as const;

/**
 * XP Transaction Reasons
 * Maps to the xp_transactions.reason column
 */
export type XPReason =
  | 'session_completion'
  | 'exercise_completed'
  | 'goal_achieved'
  | 'appointment_attended'
  | 'streak_bonus'
  | 'achievement_unlocked'
  | 'quest_completed'
  | 'profile_completed'
  | 'first_login'
  | 'bonus';

/**
 * Level Calculation Result
 */
export interface LevelCalculationResult {
  level: number;
  currentLevelXp: number;
  xpForNextLevel: number;
  progressPercentage: number;
}

/**
 * Gamification Settings from Database
 */
interface GamificationSettings {
  base_xp: number;
  multiplier: number;
  [key: string]: any;
}

/**
 * Gamification Trigger Service
 * Handles automatic XP awards for various user actions
 */
export class GamificationTriggerService {
  private static cachedSettings: GamificationSettings | null = null;
  private static settingsCacheExpiry: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch gamification settings from database (with caching)
   */
  private static async getSettings(): Promise<GamificationSettings> {
    const now = Date.now();

    // Return cached settings if still valid
    if (this.cachedSettings && now < this.settingsCacheExpiry) {
      return this.cachedSettings;
    }

    try {
      const { data } = await supabase
        .from('gamification_settings')
        .select('key, value')
        .in('key', ['base_xp', 'multiplier']);

      const settings: GamificationSettings = {
        base_xp: 1000,
        multiplier: 1.2,
      };

      data?.forEach(setting => {
        settings[setting.key] = setting.value;
      });

      this.cachedSettings = settings;
      this.settingsCacheExpiry = now + this.CACHE_DURATION;

      return settings;
    } catch (error) {
      console.warn('Failed to fetch gamification settings, using defaults:', error);
      return {
        base_xp: 1000,
        multiplier: 1.2,
      };
    }
  }

  /**
   * Calculate level from total XP using database settings
   */
  static async calculateLevelAsync(totalXp: number): Promise<LevelCalculationResult> {
    const settings = await this.getSettings();
    const baseXP = settings.base_xp || 1000;
    const multiplier = settings.multiplier || 1.2;

    let level = 1;
    let xpForNextLevel = baseXP;
    let accumulatedXp = 0;

    while (totalXp >= accumulatedXp + xpForNextLevel) {
      accumulatedXp += xpForNextLevel;
      level++;
      xpForNextLevel = Math.floor(xpForNextLevel * multiplier);
    }

    const currentLevelXp = totalXp - accumulatedXp;
    const progressPercentage = xpForNextLevel > 0 ? (currentLevelXp / xpForNextLevel) * 100 : 100;

    return {
      level,
      currentLevelXp,
      xpForNextLevel,
      progressPercentage,
    };
  }

  /**
   * Synchronous level calculation (use only when DB fetch is not possible)
   */
  private static calculateLevel(totalXp: number, settings?: GamificationSettings): number {
    const baseXP = settings?.base_xp || 1000;
    const multiplier = settings?.multiplier || 1.2;

    let level = 1;
    let xpForNextLevel = baseXP;
    let accumulatedXp = 0;

    while (totalXp >= accumulatedXp + xpForNextLevel) {
      accumulatedXp += xpForNextLevel;
      level++;
      xpForNextLevel = Math.floor(xpForNextLevel * multiplier);
    }

    return level;
  }

  /**
   * Award XP for session completion
   * @param patientId - Patient ID
   * @param sessionData - Session data including exercises count
   */
  static async awardSessionCompletion(
    patientId: string,
    sessionData: {
      sessionNumber: number;
      exercisesCount: number;
      completionTime?: Date;
    }
  ): Promise<{ success: boolean; xpAwarded: number; newLevel?: number; message?: string }> {
    try {
      // Validate inputs
      if (!patientId || !sessionData.sessionNumber) {
        return { success: false, xpAwarded: 0, message: 'Invalid input parameters' };
      }

      // Calculate base XP + exercise bonus
      const baseXP = XP_REWARDS.SESSION_COMPLETION;
      const exerciseBonus = Math.min(sessionData.exercisesCount, 20) * XP_REWARDS.SESSION_WITH_EXERCISES; // Cap at 20 exercises
      const totalXP = baseXP + exerciseBonus;

      // Check for time-based bonuses
      let bonusXP = 0;
      let bonusReason = '';
      if (sessionData.completionTime) {
        const hour = sessionData.completionTime.getHours();
        if (hour < 10) {
          bonusXP += XP_REWARDS.EARLY_BIRD;
          bonusReason = ' (Early Bird)';
        } else if (hour >= 18) {
          bonusXP += XP_REWARDS.NIGHT_OWL;
          bonusReason = ' (Night Owl)';
        }
      }

      const finalXP = totalXP + bonusXP;

      // Get current profile
      const { data: profile, error: profileError } = await supabase
        .from('patient_gamification')
        .select('total_points, level, current_streak, last_activity_date')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Calculate new values
      const currentTotalPoints = profile?.total_points || 0;
      const newTotalPoints = currentTotalPoints + finalXP;
      const calc = await this.calculateLevelAsync(newTotalPoints);
      const oldLevel = profile?.level || 1;

      // Check if we should update streak (only increment if it's a new day)
      let newStreak = profile?.current_streak || 0;
      const today = new Date().toISOString().split('T')[0];
      const lastActivity = profile?.last_activity_date?.split('T')[0];

      if (lastActivity !== today) {
        newStreak += 1;
      }

      // Update or create profile
      const { error: updateError } = await supabase
        .from('patient_gamification')
        .upsert({
          patient_id: patientId,
          total_points: newTotalPoints,
          level: calc.level,
          current_streak: newStreak,
          last_activity_date: new Date().toISOString(),
        })
        .eq('patient_id', patientId);

      if (updateError) throw updateError;

      // Log transaction
      const { error: transactionError } = await supabase.from('xp_transactions').insert({
        patient_id: patientId,
        amount: finalXP,
        reason: 'session_completion' as XPReason,
        description: `Sessão ${sessionData.sessionNumber} concluída${sessionData.exercisesCount > 0 ? ` com ${sessionData.exercisesCount} exercício(s)` : ''}${bonusReason}`,
      });

      if (transactionError) {
        console.warn('Failed to log XP transaction:', transactionError);
      }

      // Check for streak bonuses
      if (newStreak > (profile?.current_streak || 0) && [3, 7, 30].includes(newStreak)) {
        await this.checkAndAwardStreakBonus(patientId, newStreak);
      }

      return {
        success: true,
        xpAwarded: finalXP,
        newLevel: calc.level,
        message: calc.level > oldLevel ? `Subiu para o nível ${calc.level}!` : undefined,
      };
    } catch (error) {
      console.error('Error awarding session completion XP:', error);
      return {
        success: false,
        xpAwarded: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Award XP for exercise completion
   */
  static async awardExerciseCompletion(
    patientId: string,
    exerciseData: {
      exerciseId: string;
      exerciseName: string;
      repetitionCount?: number;
    }
  ): Promise<{ success: boolean; xpAwarded: number; message?: string }> {
    try {
      if (!patientId || !exerciseData.exerciseName) {
        return { success: false, xpAwarded: 0, message: 'Invalid input parameters' };
      }

      const xp = XP_REWARDS.EXERCISE_COMPLETED;

      // Get current profile
      const { data: profile } = await supabase
        .from('patient_gamification')
        .select('total_points')
        .eq('patient_id', patientId)
        .maybeSingle();

      const newTotalPoints = (profile?.total_points || 0) + xp;
      const calc = await this.calculateLevelAsync(newTotalPoints);

      // Update profile
      const { error: updateError } = await supabase
        .from('patient_gamification')
        .update({
          total_points: newTotalPoints,
          level: calc.level,
        })
        .eq('patient_id', patientId);

      if (updateError) throw updateError;

      // Log transaction
      const { error: transactionError } = await supabase.from('xp_transactions').insert({
        patient_id: patientId,
        amount: xp,
        reason: 'exercise_completed' as XPReason,
        description: `Exercício: ${exerciseData.exerciseName}`,
      });

      if (transactionError) {
        console.warn('Failed to log XP transaction:', transactionError);
      }

      return { success: true, xpAwarded: xp };
    } catch (error) {
      console.error('Error awarding exercise completion XP:', error);
      return {
        success: false,
        xpAwarded: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Award XP for goal achievement
   */
  static async awardGoalAchievement(
    patientId: string,
    goalData: {
      goalId: string;
      goalTitle: string;
      progressPercentage: number;
    }
  ): Promise<{ success: boolean; xpAwarded: number; message?: string }> {
    try {
      if (!patientId || !goalData.goalTitle) {
        return { success: false, xpAwarded: 0, message: 'Invalid input parameters' };
      }

      // Validate progress percentage
      const progress = Math.max(0, Math.min(100, goalData.progressPercentage));
      let xp = 0;
      let description = '';

      if (progress >= 100) {
        xp = XP_REWARDS.GOAL_ACHIEVED;
        description = `Objetivo alcançado: ${goalData.goalTitle}`;
      } else {
        // Award progress bonus for every 25% (only if not already awarded for that milestone)
        const progressMilestones = Math.floor(progress / 25);
        const previouslyAwardedMilestones = Math.floor((progress - 1) / 25); // Subtract 1 to avoid re-award

        if (progressMilestones > previouslyAwardedMilestones) {
          xp = (progressMilestones - previouslyAwardedMilestones) * XP_REWARDS.GOAL_PROGRESS;
          description = `Progresso no objetivo: ${goalData.goalTitle} (${progress}%)`;
        }
      }

      if (xp > 0) {
        // Get current profile
        const { data: profile } = await supabase
          .from('patient_gamification')
          .select('total_points')
          .eq('patient_id', patientId)
          .maybeSingle();

        const newTotalPoints = (profile?.total_points || 0) + xp;
        const calc = await this.calculateLevelAsync(newTotalPoints);

        // Update profile
        const { error: updateError } = await supabase
          .from('patient_gamification')
          .update({
            total_points: newTotalPoints,
            level: calc.level,
          })
          .eq('patient_id', patientId);

        if (updateError) throw updateError;

        // Log transaction
        const { error: transactionError } = await supabase.from('xp_transactions').insert({
          patient_id: patientId,
          amount: xp,
          reason: 'goal_achieved' as XPReason,
          description,
        });

        if (transactionError) {
          console.warn('Failed to log XP transaction:', transactionError);
        }

        return { success: true, xpAwarded: xp };
      }

      return { success: true, xpAwarded: 0 };
    } catch (error) {
      console.error('Error awarding goal achievement XP:', error);
      return {
        success: false,
        xpAwarded: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Award XP for appointment attendance
   */
  static async awardAppointmentAttendance(
    patientId: string,
    appointmentData: {
      appointmentId: string;
      wasOnTime: boolean;
    }
  ): Promise<{ success: boolean; xpAwarded: number; message?: string }> {
    try {
      if (!patientId || !appointmentData.appointmentId) {
        return { success: false, xpAwarded: 0, message: 'Invalid input parameters' };
      }

      let xp = XP_REWARDS.APPOINTMENT_ATTENDED;
      if (appointmentData.wasOnTime) {
        xp += XP_REWARDS.APPOINTMENT_ON_TIME;
      }

      // Get current profile
      const { data: profile } = await supabase
        .from('patient_gamification')
        .select('total_points')
        .eq('patient_id', patientId)
        .maybeSingle();

      const newTotalPoints = (profile?.total_points || 0) + xp;
      const calc = await this.calculateLevelAsync(newTotalPoints);

      // Update profile
      const { error: updateError } = await supabase
        .from('patient_gamification')
        .update({
          total_points: newTotalPoints,
          level: calc.level,
        })
        .eq('patient_id', patientId);

      if (updateError) throw updateError;

      // Log transaction
      const { error: transactionError } = await supabase.from('xp_transactions').insert({
        patient_id: patientId,
        amount: xp,
        reason: 'appointment_attended' as XPReason,
        description: appointmentData.wasOnTime
          ? 'Compareceu ao agendamento pontualmente'
          : 'Compareceu ao agendamento',
      });

      if (transactionError) {
        console.warn('Failed to log XP transaction:', transactionError);
      }

      return { success: true, xpAwarded: xp };
    } catch (error) {
      console.error('Error awarding appointment attendance XP:', error);
      return {
        success: false,
        xpAwarded: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check and award streak bonuses
   */
  static async checkAndAwardStreakBonus(
    patientId: string,
    currentStreak: number
  ): Promise<{ success: boolean; xpAwarded: number; bonusType?: string; message?: string }> {
    try {
      if (!patientId || currentStreak <= 0) {
        return { success: false, xpAwarded: 0, message: 'Invalid input parameters' };
      }

      let xp = 0;
      let bonusType: string | undefined;

      if (currentStreak === 3) {
        xp = XP_REWARDS.STREAK_3_DAYS;
        bonusType = '3 dias consecutivos';
      } else if (currentStreak === 7) {
        xp = XP_REWARDS.STREAK_7_DAYS;
        bonusType = '7 dias consecutivos';
      } else if (currentStreak === 30) {
        xp = XP_REWARDS.STREAK_30_DAYS;
        bonusType = '30 dias consecutivos';
      } else if (currentStreak > 30 && currentStreak % 30 === 0) {
        // Additional bonuses for every 30 days after 30
        xp = XP_REWARDS.STREAK_30_DAYS;
        bonusType = `${currentStreak} dias consecutivos!`;
      }

      if (xp > 0 && bonusType) {
        // Get current profile
        const { data: profile } = await supabase
          .from('patient_gamification')
          .select('total_points')
          .eq('patient_id', patientId)
          .maybeSingle();

        const newTotalPoints = (profile?.total_points || 0) + xp;
        const calc = await this.calculateLevelAsync(newTotalPoints);

        // Update profile
        const { error: updateError } = await supabase
          .from('patient_gamification')
          .update({
            total_points: newTotalPoints,
            level: calc.level,
          })
          .eq('patient_id', patientId);

        if (updateError) throw updateError;

        // Log transaction
        const { error: transactionError } = await supabase.from('xp_transactions').insert({
          patient_id: patientId,
          amount: xp,
          reason: 'streak_bonus' as XPReason,
          description: `Bônus de sequência: ${bonusType}!`,
        });

        if (transactionError) {
          console.warn('Failed to log XP transaction:', transactionError);
        }

        return { success: true, xpAwarded: xp, bonusType };
      }

      return { success: true, xpAwarded: 0 };
    } catch (error) {
      console.error('Error awarding streak bonus XP:', error);
      return {
        success: false,
        xpAwarded: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get next level XP threshold
   */
  static async getNextLevelInfo(patientId: string): Promise<LevelCalculationResult | null> {
    try {
      const { data: profile } = await supabase
        .from('patient_gamification')
        .select('total_points, level')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (!profile) {
        return null;
      }

      return await this.calculateLevelAsync(profile.total_points || 0);
    } catch (error) {
      console.error('Error getting next level info:', error);
      return null;
    }
  }

  /**
   * Clear settings cache (call when settings are updated)
   */
  static clearSettingsCache(): void {
    this.cachedSettings = null;
    this.settingsCacheExpiry = 0;
  }
}

/**
 * Hook for using gamification triggers in components
 * Use this in React components to trigger XP awards
 */
export const useGamificationTriggers = () => {
  return {
    awardSession: GamificationTriggerService.awardSessionCompletion,
    awardExercise: GamificationTriggerService.awardExerciseCompletion,
    awardGoal: GamificationTriggerService.awardGoalAchievement,
    awardAppointment: GamificationTriggerService.awardAppointmentAttendance,
    checkStreak: GamificationTriggerService.checkAndAwardStreakBonus,
    getNextLevelInfo: GamificationTriggerService.getNextLevelInfo,
    clearCache: GamificationTriggerService.clearSettingsCache,
  };
};
