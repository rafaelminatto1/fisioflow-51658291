/**
 * Exercise Service
 * Handles exercise plan and exercise-related operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { asyncResult, Result } from '@/lib/async';
import { log } from '@/lib/logger';
import { perf } from '@/lib/performance';

/**
 * Get active exercise plan for a user
 */
export async function getActiveExercisePlan(userId: string): Promise<Result<any>> {
  return asyncResult(async () => {
    perf.start('firestore_get_exercise_plan');

    const plansRef = collection(db, 'users', userId, 'exercise_plans');
    const q = query(
      plansRef,
      where('status', '==', 'active'),
      orderBy('created_at', 'desc')
    );

    const snapshot = await getDocs(q);

    perf.end('firestore_get_exercise_plan', true);

    if (snapshot.empty) {
      return null;
    }

    const planDoc = snapshot.docs[0];
    return {
      id: planDoc.id,
      ...planDoc.data(),
    };
  }, 'getActiveExercisePlan');
}

/**
 * Subscribe to exercise plan updates
 */
export function subscribeToExercisePlan(
  userId: string,
  callback: (plan: any | null) => void
): () => void {
  const plansRef = collection(db, 'users', userId, 'exercise_plans');
  const q = query(
    plansRef,
    where('status', '==', 'active'),
    orderBy('created_at', 'desc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      const planDoc = snapshot.docs[0];
      callback({
        id: planDoc.id,
        ...planDoc.data(),
      });
    }
  });

  return unsubscribe;
}

/**
 * Toggle exercise completion status
 */
export async function toggleExercise(
  userId: string,
  planId: string,
  exerciseId: string,
  completed: boolean
): Promise<Result<void>> {
  return asyncResult(async () => {
    perf.start('firestore_toggle_exercise');

    const planRef = doc(db, 'users', userId, 'exercise_plans', planId);
    const planDoc = await getDoc(planRef);

    if (!planDoc.exists()) {
      throw new Error('Exercise plan not found');
    }

    const plan = planDoc.data();
    const exercises = plan.exercises || [];

    const updatedExercises = exercises.map((ex: any) =>
      ex.id === exerciseId
        ? { ...ex, completed, completed_at: completed ? new Date() : null }
        : ex
    );

    await updateDoc(planRef, { exercises: updatedExercises });

    perf.end('firestore_toggle_exercise', true);
    log.info('EXERCISE', 'Exercise toggled', { userId, exerciseId, completed });
  }, 'toggleExercise');
}

/**
 * Submit exercise feedback
 */
export interface ExerciseFeedback {
  exerciseId: string;
  planId: string;
  difficulty: number;
  painLevel: number;
  notes?: string;
}

export async function submitExerciseFeedback(
  userId: string,
  feedback: ExerciseFeedback
): Promise<Result<void>> {
  return asyncResult(async () => {
    perf.start('firestore_submit_feedback');

    const feedbackRef = doc(
      db,
      'users',
      userId,
      'exercise_plans',
      feedback.planId,
      'feedback',
      feedback.exerciseId
    );

    await setDoc(feedbackRef, {
      ...feedback,
      created_at: serverTimestamp(),
    });

    perf.end('firestore_submit_feedback', true);
    log.info('EXERCISE', 'Feedback submitted', { userId, exerciseId: feedback.exerciseId });
  }, 'submitExerciseFeedback');
}

/**
 * Get exercise statistics for a user
 */
export async function getExerciseStats(userId: string): Promise<Result<any>> {
  return asyncResult(async () => {
    perf.start('firestore_get_exercise_stats');

    const plansRef = collection(db, 'users', userId, 'exercise_plans');
    const snapshot = await getDocs(plansRef);

    let totalExercises = 0;
    let completedExercises = 0;

    snapshot.forEach((doc) => {
      const plan = doc.data();
      const exercises = plan.exercises || [];
      totalExercises += exercises.length;
      completedExercises += exercises.filter((e: any) => e.completed).length;
    });

    perf.end('firestore_get_exercise_stats', true);

    return {
      total: totalExercises,
      completed: completedExercises,
      remaining: totalExercises - completedExercises,
      completionRate: totalExercises > 0 ? completedExercises / totalExercises : 0,
    };
  }, 'getExerciseStats');
}
