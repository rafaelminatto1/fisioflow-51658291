/**
 * User Service
 * Handles user-related operations
 */

  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  getCountFromServer,
  updateDoc,
  serverTimestamp,
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

    plansSnapshot.forEach((docSnap) => {
      const plan = docSnap.data();
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

/**
 * Update user profile
 */
export interface UserProfileUpdate {
  name?: string;
  phone?: string;
  photoURL?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
}

export async function updateUserProfile(
  userId: string,
  updates: UserProfileUpdate
): Promise<Result<void>> {
  return asyncResult(async () => {
    perf.start('firestore_update_user_profile');

    const userRef = doc(db, 'users', userId);
    const updateData: any = {
      updated_at: serverTimestamp(),
    };

    // Map fields to Firestore naming convention
    if (updates.name !== undefined) updateData.display_name = updates.name;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.photoURL !== undefined) updateData.photo_url = updates.photoURL;
    if (updates.dateOfBirth !== undefined) updateData.date_of_birth = updates.dateOfBirth;
    if (updates.gender !== undefined) updateData.gender = updates.gender;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.city !== undefined) updateData.city = updates.city;
    if (updates.state !== undefined) updateData.state = updates.state;
    if (updates.zipCode !== undefined) updateData.zip_code = updates.zipCode;
    if (updates.emergencyContact !== undefined) updateData.emergency_contact = updates.emergencyContact;
    if (updates.emergencyContactPhone !== undefined) updateData.emergency_contact_phone = updates.emergencyContactPhone;

    await updateDoc(userRef, updateData);

    perf.end('firestore_update_user_profile', true);
    log.info('USER', 'Profile updated', { userId, updates });
  }, 'updateUserProfile');
}
