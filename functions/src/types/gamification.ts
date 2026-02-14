/**
 * Gamification Types
 */

export interface GamificationProfile {
  patient_id: string;
  current_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  total_points: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
}

export type XpTransactionReason =
  | 'exercise_completed'
  | 'appointment_completed'
  | 'streak_bonus'
  | 'achievement_unlocked'
  | 'daily_login';

export interface XpTransaction {
  id: string;
  patient_id: string;
  amount: number;
  reason: XpTransactionReason;
  description?: string;
  created_at: string;
}
