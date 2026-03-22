import { gamificationApi, patientApi } from '@/lib/api';
import { log } from '@/lib/logger';

export class GamificationService {
  private static async getPatientId(): Promise<string | null> {
    try {
      const profile = await patientApi.getProfile();
      return profile?.id || null;
    } catch (error) {
      log.error('Error loading patient profile for gamification:', error);
      return null;
    }
  }

  /**
   * Award XP for completing an exercise
   */
  static async awardExerciseCompletion(_userId: string, exerciseId: string) {
    try {
      const patientId = await this.getPatientId();
      if (!patientId) return;

      await gamificationApi.awardXp({
        patientId,
        amount: 25,
        reason: 'exercise_completed',
        description: `Exercício concluído: ${exerciseId}`,
      });
    } catch (error) {
      log.error('Error awarding exercise XP:', error);
    }
  }

  /**
   * Award XP for daily login
   */
  static async awardDailyLogin(_userId: string) {
    try {
      const patientId = await this.getPatientId();
      if (!patientId) return;

      await gamificationApi.awardXp({
        patientId,
        amount: 10,
        reason: 'daily_login',
        description: 'Login diário no app do paciente',
      });
    } catch (error) {
      log.error('Error awarding login XP:', error);
    }
  }
}
