/**
 * Gamification Service
 * 
 * Logic for XP, Levels, and Streaks
 */

import * as admin from 'firebase-admin';
import { GamificationProfile, XpTransaction, XpTransactionReason } from '../../../src/types/gamification';

const db = admin.firestore();

export class GamificationService {
  /**
   * Calculates XP required for a given level
   * Formula: level * 1000
   */
  static getXpForLevel(level: number): number {
    return level * 1000;
  }

  /**
   * Gets or creates a gamification profile for a patient
   */
  static async getProfile(patientId: string): Promise<GamificationProfile> {
    const doc = await db.collection('gamification_profiles').doc(patientId).get();
    
    if (doc.exists) {
      return doc.data() as GamificationProfile;
    }

    const newProfile: GamificationProfile = {
      patient_id: patientId,
      current_xp: 0,
      level: 1,
      current_streak: 0,
      longest_streak: 0,
      total_points: 0,
      last_activity_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.collection('gamification_profiles').doc(patientId).set(newProfile);
    return newProfile;
  }

  /**
   * Awards XP to a patient and handles leveling up
   */
  static async awardXp(
    patientId: string, 
    amount: number, 
    reason: XpTransactionReason,
    description?: string
  ) {
    const profile = await this.getProfile(patientId);
    
    // Create transaction record
    const transaction: XpTransaction = {
      id: db.collection('xp_transactions').doc().id,
      patient_id: patientId,
      amount,
      reason,
      description,
      created_at: new Date().toISOString(),
    };

    let newXp = profile.current_xp + amount;
    let newLevel = profile.level;
    let leveledUp = false;

    // Level up logic
    let xpNeeded = this.getXpForLevel(newLevel);
    while (newXp >= xpNeeded) {
      newXp -= xpNeeded;
      newLevel++;
      leveledUp = true;
      xpNeeded = this.getXpForLevel(newLevel);
    }

    // Update Streak logic
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = profile.last_activity_date ? profile.last_activity_date.split('T')[0] : null;
    
    let newStreak = profile.current_streak;
    let streakExtended = false;

    if (lastActivity !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastActivity === yesterdayStr) {
            newStreak += 1;
            streakExtended = true;
        } else {
            newStreak = 1; // Reset streak if missed a day
        }
    }

    const updatedProfile: Partial<GamificationProfile> = {
      current_xp: newXp,
      level: newLevel,
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, profile.longest_streak),
      total_points: profile.total_points + amount,
      last_activity_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const batch = db.batch();
    batch.set(db.collection('gamification_profiles').doc(patientId), updatedProfile, { merge: true });
    batch.set(db.collection('xp_transactions').doc(transaction.id), transaction);
    
    await batch.commit();

    return {
      profile: { ...profile, ...updatedProfile },
      leveledUp,
      newLevel,
      streakExtended
    };
  }

  /**
   * Checks and awards achievements
   */
  static async checkAchievements(patientId: string) {
    const profile = await this.getProfile(patientId);
    const achievementsToAward: string[] = [];

    // 1. Check "First Steps" (At least 1 transaction)
    const transactions = await db.collection('xp_transactions')
      .where('patient_id', '==', patientId)
      .limit(1)
      .get();
    
    if (!transactions.empty) {
      achievementsToAward.push('first_steps');
    }

    // 2. Check "Week Warrior" (7 day streak)
    if (profile.current_streak >= 7) {
      achievementsToAward.push('week_warrior');
    }

    // 3. Check "Level 10"
    if (profile.level >= 10) {
      achievementsToAward.push('top_performer');
    }

    for (const code of achievementsToAward) {
      const alreadyHas = await db.collection('achievements_log')
        .where('patient_id', '==', patientId)
        .where('achievement_code', '==', code)
        .get();

      if (alreadyHas.empty) {
        const achievementRef = db.collection('achievements_log').doc();
        await achievementRef.set({
          id: achievementRef.id,
          patient_id: patientId,
          achievement_code: code,
          unlocked_at: new Date().toISOString(),
        });

        // Award bonus XP for achievement
        await this.awardXp(patientId, 200, 'achievement_unlocked', `Conquista desbloqueada: ${code}`);
      }
    }
  }
}
