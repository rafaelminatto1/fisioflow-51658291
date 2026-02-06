/**
 * Gamification System Types
 *
 * Types for patient gamification including XP, levels, achievements, quests, and challenges.
 */


// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * Reasons for XP transactions - used for tracking and analytics
 */

import { z } from 'zod';
import type { Dictionary } from './common';

export type XpTransactionReason =
  | 'session_completed'
  | 'daily_quest'
  | 'achievement_unlocked'
  | 'challenge_completion'
  | 'streak_bonus'
  | 'level_up'
  | 'manual_adjustment'
  | 'atendido'; // Legacy: Portuguese for "attended" - used for completed sessions

/**
 * Categories for achievements
 */
export type AchievementCategory =
  | 'streak'
  | 'sessions'
  | 'level'
  | 'quests'
  | 'challenges'
  | 'special'
  | 'general';

/**
 * Quest categories
 */
export type QuestCategory = 'daily' | 'weekly' | 'special';

/**
 * Achievement requirement types
 */
export type AchievementRequirementType = 'streak' | 'sessions' | 'level' | 'quests' | 'custom';

// ============================================================================
// PROFILE TYPES
// ============================================================================

/**
 * Patient gamification profile - stores XP, level, streak, and other progress
 */
export interface GamificationProfile {
  id?: string;
  patient_id: string;
  current_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  total_points: number;
  last_activity_date: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * XP transaction record
 */
export interface XpTransaction {
  id: string;
  patient_id: string;
  amount: number;
  reason: XpTransactionReason;
  description?: string;
  created_at: string;
  created_by?: string;
}

// ============================================================================
// ACHIEVEMENT TYPES
// ============================================================================

/**
 * Achievement requirement structure
 */
export interface AchievementRequirement {
  type: AchievementRequirementType;
  count: number;
  description?: string;
}

/**
 * Achievement definition
 */
export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  xp_reward: number;
  icon?: string;
  category: AchievementCategory;
  requirements: AchievementRequirement | string;
  created_at: string;
}

/**
 * Unlocked achievement log entry
 */
export interface UnlockedAchievement {
  id: string;
  patient_id: string;
  achievement_id: string;
  achievement_title: string;
  xp_reward: number;
  unlocked_at: string;
}

// ============================================================================
// QUEST TYPES
// ============================================================================

/**
 * Individual quest item within daily/weekly quests
 */
export interface QuestItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  xp: number;
  icon: string;
}

/**
 * Alias for QuestItem - used for backward compatibility
 */
export type DailyQuestItem = QuestItem;

/**
 * Daily quest record for a patient
 */
export interface DailyQuestRecord {
  id: string;
  patient_id: string;
  date: string;
  quests_data: QuestItem[];
  completed_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Quest definition template
 */
export interface QuestDefinition {
  id: string;
  title: string;
  description?: string;
  category: QuestCategory;
  xp_reward: number;
  icon?: string;
  is_active: boolean;
  created_at?: string;
}

// ============================================================================
// CHALLENGE TYPES
// ============================================================================

/**
 * Challenge target structure
 */
export interface ChallengeTarget {
  type: 'sessions' | 'quests' | 'any';
  count: number;
}

/**
 * Weekly challenge definition
 */
export interface WeeklyChallenge {
  id: string;
  title: string;
  description?: string;
  target: ChallengeTarget | string;
  xp_reward: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

/**
 * Patient's progress on a challenge
 */
export interface PatientChallengeProgress {
  id?: string;
  patient_id: string;
  challenge_id: string;
  progress: number;
  completed: boolean;
  completed_at?: string;
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================

/**
 * Gamification system setting
 */
export interface GamificationSetting {
  id?: string;
  key: string;
  value: Dictionary;
  description?: string;
}

/**
 * Freeze streak cost configuration
 */
export interface StreakFreezeCost {
  price: number;
  max_per_month: number;
}

// ============================================================================
// SHOP & INVENTORY TYPES
// ============================================================================

export type ShopItemType = 'consumable' | 'cosmetic' | 'feature';

export interface ShopItem {
  id: string;
  code: string;
  name: string;
  description: string;
  cost: number;
  type: ShopItemType;
  icon?: string;
  metadata?: Dictionary;
  is_active: boolean;
}

export interface UserInventoryItem {
  id: string;
  user_id: string;
  item_id: string;
  quantity: number;
  is_equipped: boolean;
  item?: ShopItem; // Joined data
}

export interface BuyItemParams {
  itemId: string;
  cost: number;
}

/**
 * Return type for useGamification hook
 */
export interface UseGamificationReturn {
  // Profile data
  profile: GamificationProfile | null | undefined;
  currentLevel: number;
  currentXp: number;
  totalPoints: number;
  xpPerLevel: number;
  progressToNextLevel: number;
  progressPercentage: number;

  // Quests
  dailyQuests: QuestItem[];

  // Achievements
  allAchievements: Achievement[];
  unlockedAchievements: UnlockedAchievement[];
  lockedAchievements: Achievement[];

  // Shop & Inventory
  shopItems: ShopItem[];
  userInventory: UserInventoryItem[];
  buyItem: {
    mutateAsync: (params: BuyItemParams) => Promise<void>;
    isPending: boolean;
  };

  // Loading state
  isLoading: boolean;

  // Freeze streak
  freezeStreak: {
    mutateAsync: () => Promise<void>;
    isPending: boolean;
  };
  freezeCost: StreakFreezeCost;

  // Mutations
  awardXp: {
    mutateAsync: (params: AwardXpParams) => Promise<AwardXpResult>;
    isPending: boolean;
  };
  completeQuest: {
    mutateAsync: (params: CompleteQuestParams) => Promise<void>;
    isPending: boolean;
  };
}

/**
 * Parameters for awarding XP
 */
export interface AwardXpParams {
  amount: number;
  reason: XpTransactionReason;
  description?: string;
}

/**
 * Result from awarding XP
 */
export interface AwardXpResult {
  data: GamificationProfile;
  leveledUp: boolean;
  newLevel: number;
  streakExtended: boolean;
}

/**
 * Parameters for completing a quest
 */
export interface CompleteQuestParams {
  questId: string;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Zod schema for validating XP transaction parameters
 */
export const awardXpParamsSchema = z.object({
  amount: z.number().int().min(0),
  reason: z.enum([
    'session_completed',
    'daily_quest',
    'achievement_unlocked',
    'challenge_completion',
    'streak_bonus',
    'level_up',
    'manual_adjustment',
    'atendido',
  ]),
  description: z.string().optional()
});

/**
 * Zod schema for validating quest completion parameters
 */
export const completeQuestParamsSchema = z.object({
  questId: z.string().uuid()
});

/**
 * Zod schema for validating gamification profile
 */
export const gamificationProfileSchema = z.object({
  patient_id: z.string().uuid(),
  current_xp: z.number().int().min(0),
  level: z.number().int().min(1),
  current_streak: z.number().int().min(0),
  longest_streak: z.number().int().min(0),
  total_points: z.number().int().min(0),
  last_activity_date: z.string().datetime().nullable()
});

/**
 * Zod schema for validating achievement requirement
 */
export const achievementRequirementSchema = z.object({
  type: z.enum(['streak', 'sessions', 'level', 'quests', 'custom']),
  count: z.number().int().min(1),
  description: z.string().optional()
});

/**
 * Type guard to check if a value is a valid AchievementRequirement
 */
export function isValidAchievementRequirement(value: unknown): value is AchievementRequirement {
  return achievementRequirementSchema.safeParse(value).success;
}

/**
 * Type guard to check if requirements is a string (JSON) or object
 */
export function parseAchievementRequirements(requirements: AchievementRequirement | string): AchievementRequirement {
  if (typeof requirements === 'string') {
    try {
      const parsed = JSON.parse(requirements);
      return achievementRequirementSchema.parse(parsed);
    } catch {
      return { type: 'custom', count: 0 };
    }
  }
  return achievementRequirementSchema.parse(requirements);
}

// ============================================================================
// ADMIN & LEADERBOARD TYPES
// ============================================================================

/**
 * Leaderboard entry for ranking patients
 */
export interface LeaderboardEntry {
  patient_id: string;
  patient_name: string;
  email?: string;
  level: number;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  achievements_count: number;
  last_activity: string;
  rank?: number;
}

/**
 * Filters for leaderboard queries
 */
export interface LeaderboardFilters {
  period: 'week' | 'month' | 'all';
  category: 'level' | 'xp' | 'streak' | 'achievements';
  search?: string;
  sortBy: 'level' | 'total_xp' | 'current_streak' | 'achievements_count';
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

/**
 * Engagement data aggregated by date
 */
export interface EngagementData {
  date: string;
  activePatients: number;
  questsCompleted: number;
  xpAwarded: number;
  achievementsUnlocked: number;
}

/**
 * Patient at risk of churn
 */
export interface AtRiskPatient {
  patient_id: string;
  patient_name: string;
  email?: string;
  level: number;
  lastActivity: string;
  daysInactive: number;
}

/**
 * Level progression type
 */
export type ProgressionType = 'linear' | 'exponential' | 'custom';

/**
 * Level configuration with optional custom title and rewards
 */
export interface LevelConfig {
  level: number;
  title?: string;
  xpRequired: number;
  icon?: string;
  rewards?: LevelReward[];
}

/**
 * Reward granted when reaching a level
 */
export interface LevelReward {
  type: 'xp_bonus' | 'points' | 'achievement' | 'unlock';
  value: string | number;
  description?: string;
}

/**
 * Overall gamification statistics for admin dashboard
 */
export interface GamificationStats {
  totalPatients: number;
  totalXpAwarded: number;
  averageLevel: number;
  averageStreak: number;
  activeLast30Days: number;
  activeLast7Days: number;
  achievementsUnlocked: number;
  engagementRate: number;
  atRiskPatients: number;
}

/**
 * Popular achievement with unlock statistics
 */
export interface PopularAchievement {
  id: string;
  title: string;
  unlockedCount: number;
  totalPatients: number;
  unlockRate: number;
}
