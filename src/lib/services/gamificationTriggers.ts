/**
 * XP Rewards Configuration
 * Centralized configuration for all XP rewards in the system
 */

import { fisioLogger as logger } from "@/lib/errors/logger";
import { gamificationApi } from "@/api/v2";

export const XP_REWARDS = {
  SESSION_COMPLETION: 50,
  SESSION_WITH_EXERCISES: 10,
  EXERCISE_COMPLETED: 5,
  EXERCISE_MASTERY: 25,
  GOAL_ACHIEVED: 100,
  GOAL_PROGRESS: 10,
  APPOINTMENT_ATTENDED: 30,
  APPOINTMENT_ON_TIME: 20,
  PROFILE_COMPLETED: 50,
  FIRST_LOGIN: 100,
  STREAK_3_DAYS: 50,
  STREAK_7_DAYS: 100,
  STREAK_30_DAYS: 500,
  PERFECT_SESSION: 75,
  EARLY_BIRD: 30,
  NIGHT_OWL: 30,
} as const;

export type XPReason =
  | "session_completion"
  | "exercise_completed"
  | "goal_achieved"
  | "appointment_attended"
  | "streak_bonus"
  | "achievement_unlocked"
  | "quest_completed"
  | "profile_completed"
  | "first_login"
  | "bonus";

export interface LevelCalculationResult {
  level: number;
  currentLevelXp: number;
  xpForNextLevel: number;
  progressPercentage: number;
}

interface GamificationSettings {
  base_xp: number;
  multiplier: number;
  [key: string]: number | string | boolean;
}

export class GamificationTriggerService {
  private static cachedSettings: GamificationSettings | null = null;
  private static settingsCacheExpiry = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000;

  private static async getSettings(): Promise<GamificationSettings> {
    const now = Date.now();
    if (this.cachedSettings && now < this.settingsCacheExpiry) return this.cachedSettings;

    try {
      const res = await gamificationApi.getSettings();
      const settings: GamificationSettings = { base_xp: 1000, multiplier: 1.2 };
      for (const row of res.data ?? []) {
        if (row.key === "base_xp" || row.key === "level_base_xp")
          settings.base_xp = Number(row.value) || 1000;
        if (row.key === "multiplier" || row.key === "level_multiplier")
          settings.multiplier = Number(row.value) || 1.2;
      }
      this.cachedSettings = settings;
      this.settingsCacheExpiry = now + this.CACHE_DURATION;
      return settings;
    } catch (error) {
      logger.warn(
        "Failed to fetch gamification settings, using defaults",
        error,
        "gamificationTriggers",
      );
      return { base_xp: 1000, multiplier: 1.2 };
    }
  }

  static async calculateLevelAsync(totalXp: number): Promise<LevelCalculationResult> {
    const settings = await this.getSettings();
    const baseXP = Number(settings.base_xp) || 1000;
    const multiplier = Number(settings.multiplier) || 1.2;
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
    return { level, currentLevelXp, xpForNextLevel, progressPercentage };
  }

  private static async awardXp(
    patientId: string,
    amount: number,
    reason: string,
    description: string,
  ): Promise<{
    success: boolean;
    xpAwarded: number;
    newLevel?: number;
    message?: string;
  }> {
    try {
      const result = await gamificationApi.awardXp({
        patientId,
        amount,
        reason,
        description,
      });
      return {
        success: true,
        xpAwarded: amount,
        newLevel: result.newLevel,
        message: result.leveledUp ? `Subiu para o nível ${result.newLevel}!` : undefined,
      };
    } catch (error) {
      logger.error("Error awarding XP", error, "gamificationTriggers");
      return {
        success: false,
        xpAwarded: 0,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  static async awardSessionCompletion(
    patientId: string,
    sessionData: {
      sessionNumber: number;
      exercisesCount: number;
      completionTime?: Date;
    },
  ): Promise<{
    success: boolean;
    xpAwarded: number;
    newLevel?: number;
    message?: string;
  }> {
    if (!patientId || !sessionData.sessionNumber)
      return {
        success: false,
        xpAwarded: 0,
        message: "Invalid input parameters",
      };
    const baseXP = XP_REWARDS.SESSION_COMPLETION;
    const exerciseBonus =
      Math.min(sessionData.exercisesCount, 20) * XP_REWARDS.SESSION_WITH_EXERCISES;
    let bonusXP = 0;
    let bonusReason = "";
    if (sessionData.completionTime) {
      const hour = sessionData.completionTime.getHours();
      if (hour < 10) {
        bonusXP += XP_REWARDS.EARLY_BIRD;
        bonusReason = " (Early Bird)";
      } else if (hour >= 18) {
        bonusXP += XP_REWARDS.NIGHT_OWL;
        bonusReason = " (Night Owl)";
      }
    }
    const finalXP = baseXP + exerciseBonus + bonusXP;
    return this.awardXp(
      patientId,
      finalXP,
      "session_completed",
      `Sessão ${sessionData.sessionNumber} concluída${sessionData.exercisesCount > 0 ? ` com ${sessionData.exercisesCount} exercício(s)` : ""}${bonusReason}`,
    );
  }

  static async awardExerciseCompletion(
    patientId: string,
    exerciseData: {
      exerciseId: string;
      exerciseName: string;
      repetitionCount?: number;
    },
  ): Promise<{ success: boolean; xpAwarded: number; message?: string }> {
    if (!patientId || !exerciseData.exerciseName)
      return {
        success: false,
        xpAwarded: 0,
        message: "Invalid input parameters",
      };
    return this.awardXp(
      patientId,
      XP_REWARDS.EXERCISE_COMPLETED,
      "exercise_completed",
      `Exercício: ${exerciseData.exerciseName}`,
    );
  }

  static async awardGoalAchievement(
    patientId: string,
    goalData: { goalId: string; goalTitle: string; progressPercentage: number },
  ): Promise<{ success: boolean; xpAwarded: number; message?: string }> {
    if (!patientId || !goalData.goalTitle)
      return {
        success: false,
        xpAwarded: 0,
        message: "Invalid input parameters",
      };
    const progress = Math.max(0, Math.min(100, goalData.progressPercentage));
    let xp = 0;
    let description = "";
    if (progress >= 100) {
      xp = XP_REWARDS.GOAL_ACHIEVED;
      description = `Objetivo alcançado: ${goalData.goalTitle}`;
    } else {
      const progressMilestones = Math.floor(progress / 25);
      const previouslyAwardedMilestones = Math.floor((progress - 1) / 25);
      if (progressMilestones > previouslyAwardedMilestones) {
        xp = (progressMilestones - previouslyAwardedMilestones) * XP_REWARDS.GOAL_PROGRESS;
        description = `Progresso no objetivo: ${goalData.goalTitle} (${progress}%)`;
      }
    }
    if (xp <= 0) return { success: true, xpAwarded: 0 };
    return this.awardXp(patientId, xp, "goal_achieved", description);
  }

  static async awardAppointmentAttendance(
    patientId: string,
    appointmentData: { appointmentId: string; wasOnTime: boolean },
  ): Promise<{ success: boolean; xpAwarded: number; message?: string }> {
    if (!patientId || !appointmentData.appointmentId)
      return {
        success: false,
        xpAwarded: 0,
        message: "Invalid input parameters",
      };
    const xp =
      XP_REWARDS.APPOINTMENT_ATTENDED +
      (appointmentData.wasOnTime ? XP_REWARDS.APPOINTMENT_ON_TIME : 0);
    return this.awardXp(
      patientId,
      xp,
      "appointment_attended",
      appointmentData.wasOnTime
        ? "Compareceu ao agendamento pontualmente"
        : "Compareceu ao agendamento",
    );
  }

  static async checkAndAwardStreakBonus(
    patientId: string,
    currentStreak: number,
  ): Promise<{
    success: boolean;
    xpAwarded: number;
    bonusType?: string;
    message?: string;
  }> {
    if (!patientId || currentStreak <= 0)
      return {
        success: false,
        xpAwarded: 0,
        message: "Invalid input parameters",
      };
    let xp = 0;
    let bonusType: string | undefined;
    if (currentStreak === 3) {
      xp = XP_REWARDS.STREAK_3_DAYS;
      bonusType = "3 dias consecutivos";
    } else if (currentStreak === 7) {
      xp = XP_REWARDS.STREAK_7_DAYS;
      bonusType = "7 dias consecutivos";
    } else if (currentStreak === 30) {
      xp = XP_REWARDS.STREAK_30_DAYS;
      bonusType = "30 dias consecutivos";
    } else if (currentStreak > 30 && currentStreak % 30 === 0) {
      xp = XP_REWARDS.STREAK_30_DAYS;
      bonusType = `${currentStreak} dias consecutivos!`;
    }
    if (!xp || !bonusType) return { success: true, xpAwarded: 0 };
    const result = await this.awardXp(
      patientId,
      xp,
      "streak_bonus",
      `Bônus de sequência: ${bonusType}!`,
    );
    return { ...result, bonusType };
  }

  static async getNextLevelInfo(patientId: string): Promise<LevelCalculationResult | null> {
    try {
      const profile = (await gamificationApi.getProfile(patientId)).data;
      if (!profile) return null;
      return await this.calculateLevelAsync(profile.total_points || 0);
    } catch (error) {
      logger.error("Error getting next level info", error, "gamificationTriggers");
      return null;
    }
  }

  static clearSettingsCache(): void {
    this.cachedSettings = null;
    this.settingsCacheExpiry = 0;
  }
}

export const useGamificationTriggers = () => ({
  awardSession: GamificationTriggerService.awardSessionCompletion,
  awardExercise: GamificationTriggerService.awardExerciseCompletion,
  awardGoal: GamificationTriggerService.awardGoalAchievement,
  awardAppointment: GamificationTriggerService.awardAppointmentAttendance,
  checkStreak: GamificationTriggerService.checkAndAwardStreakBonus,
  getNextLevelInfo: GamificationTriggerService.getNextLevelInfo,
  clearCache: GamificationTriggerService.clearSettingsCache,
});
