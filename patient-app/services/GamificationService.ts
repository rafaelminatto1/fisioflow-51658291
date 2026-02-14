import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export class GamificationService {
  /**
   * Award XP for completing an exercise
   */
  static async awardExerciseCompletion(patientId: string, exerciseId: string) {
    try {
      const awardXp = httpsCallable(functions, 'onExerciseCompleted');
      await awardXp({ patientId, exerciseId });
    } catch (error) {
      console.error('Error awarding exercise XP:', error);
    }
  }

  /**
   * Award XP for daily login
   */
  static async awardDailyLogin(patientId: string) {
    try {
      const awardXp = httpsCallable(functions, 'onDailyLogin');
      await awardXp({ patientId });
    } catch (error) {
      console.error('Error awarding login XP:', error);
    }
  }
}
