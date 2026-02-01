/**
 * User Service
 * Handles user-related operations
 */

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { asyncResult, Result } from '@/lib/async';
import { log } from '@/lib/logger';
import { perf } from '@/lib/performance';

/**
 * Get user document by ID
 */
export async function getUserById(userId: string): Promise<Result<any | null>> {
  return asyncResult(async () => {
    perf.start('firestore_get_user');

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    perf.end('firestore_get_user', true);

    if (!userDoc.exists()) {
      return null;
    }

    return {
      id: userDoc.id,
      ...userDoc.data(),
    };
  }, 'getUserById');
}

/**
 * Get professional by invite code
 */
export async function getProfessionalByInviteCode(
  inviteCode: string
): Promise<Result<any | null>> {
  return asyncResult(async () => {
    perf.start('firestore_get_professional_by_code');

    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('role', '==', 'professional'),
      where('invite_code', '==', inviteCode.toUpperCase())
    );

    const snapshot = await getDocs(q);

    perf.end('firestore_get_professional_by_code', true);

    if (snapshot.empty) {
      return null;
    }

    const profDoc = snapshot.docs[0];
    return {
      id: profDoc.id,
      ...profDoc.data(),
    };
  }, 'getProfessionalByInviteCode');
}

/**
 * Get user statistics
 */
export async function getUserStats(userId: string): Promise<Result<any>> {
  return asyncResult(async () => {
    perf.start('firestore_get_user_stats');

    // Count appointments
    const appointmentsRef = collection(db, 'users', userId, 'appointments');
    const appointmentsSnapshot = await getCountFromServer(appointmentsRef);
    const totalAppointments = appointmentsSnapshot.data().count;

    // Count exercise plans
    const plansRef = collection(db, 'users', userId, 'exercise_plans');
    const plansSnapshot = await getDocs(plansRef);

    let totalExercises = 0;
    let completedExercises = 0;

    plansSnapshot.forEach((doc) => {
      const plan = doc.data();
      const exercises = plan.exercises || [];
      totalExercises += exercises.length;
      completedExercises += exercises.filter((e: any) => e.completed).length;
    });

    // Count evolutions
    const evolutionsRef = collection(db, 'users', userId, 'evolutions');
    const evolutionsSnapshot = await getCountFromServer(evolutionsRef);
    const totalEvolutions = evolutionsSnapshot.data().count;

    perf.end('firestore_get_user_stats', true);

    return {
      totalAppointments,
      totalExercises,
      completedExercises,
      exerciseCompletionRate:
        totalExercises > 0 ? completedExercises / totalExercises : 0,
      totalEvolutions,
    };
  }, 'getUserStats');
}
