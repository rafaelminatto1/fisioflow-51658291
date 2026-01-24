import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

export class ExerciseFunctions {
  static async listExercises(filters?: {
    category?: string;
    bodyPart?: string;
    difficulty?: string;
    search?: string;
  }) {
    const fn = httpsCallable(functions, 'listExercises');
    const result = await fn(filters || {});
    return result.data;
  }

  static async getExercise(exerciseId: string) {
    const fn = httpsCallable(functions, 'getExercise');
    const result = await fn({ exerciseId });
    return result.data;
  }

  static async searchSimilarExercises(exerciseId: string) {
    const fn = httpsCallable(functions, 'searchSimilarExercises');
    const result = await fn({ exerciseId });
    return result.data;
  }
}
