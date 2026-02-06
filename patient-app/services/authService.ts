/**
 * Authentication Service
 * Handles all authentication-related operations
 */

  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { asyncResult, Result } from '@/lib/async';
import { log } from '@/lib/logger';
import { perf } from '@/lib/performance';
import { registerPushToken, clearPushToken } from '@/lib/notificationsSystem';

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<Result<FirebaseUser>> {
  return asyncResult(async () => {
    perf.start(PerformanceMarkers.AUTH_LOGIN, { email });

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );

    perf.end(PerformanceMarkers.AUTH_LOGIN, true);
    log.info('AUTH', 'User signed in', { uid: userCredential.user.uid });

    // Register push token after login
    await registerPushToken(userCredential.user.uid);

    return userCredential.user;
  }, 'signIn');
}

/**
 * Sign up a new user
 */
export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export async function signUp(data: SignUpData): Promise<Result<FirebaseUser>> {
  return asyncResult(async () => {
    perf.start(PerformanceMarkers.AUTH_REGISTER, { email: data.email });

    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email.trim().toLowerCase(),
      data.password
    );

    const uid = userCredential.user.uid;

    // Create user document
    await setDoc(doc(db, 'users', uid), {
      name: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      role: 'patient',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      professional_id: null,
      professional_name: null,
      birth_date: null,
      gender: null,
      clinic_id: null,
    });

    // Update display name
    await updateProfile(userCredential.user, {
      displayName: data.fullName.trim(),
    });

    perf.end(PerformanceMarkers.AUTH_REGISTER, true);
    log.info('AUTH', 'User signed up', { uid });

    // Register push token
    await registerPushToken(uid);

    return userCredential.user;
  }, 'signUp');
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<Result<void>> {
  return asyncResult(async () => {
    perf.start(PerformanceMarkers.AUTH_LOGOUT);

    const userId = auth.currentUser?.uid;

    // Clear push token before signing out
    if (userId) {
      await clearPushToken(userId);
    }

    await firebaseSignOut(auth);

    perf.end(PerformanceMarkers.AUTH_LOGOUT, true);
    log.info('AUTH', 'User signed out', { userId });
  }, 'signOut');
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<Result<void>> {
  return asyncResult(async () => {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    log.info('AUTH', 'Password reset email sent', { email });
  }, 'resetPassword');
}

/**
 * Get current user
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Get user data from Firestore
 */
export async function getUserData(uid: string): Promise<Result<any>> {
  return asyncResult(async () => {
    perf.start('firestore_get_user');

    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    perf.end('firestore_get_user', true);

    if (!docSnap.exists()) {
      throw new Error('User not found');
    }

    return { id: docSnap.id, ...docSnap.data() };
  }, 'getUserData');
}

/**
 * Update user profile
 */
export interface UpdateProfileData {
  name?: string;
  phone?: string;
  birth_date?: Date;
  gender?: 'male' | 'female' | 'other';
}

export async function updateProfileData(
  uid: string,
  data: UpdateProfileData
): Promise<Result<void>> {
  return asyncResult(async () => {
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
      ...data,
      updated_at: serverTimestamp(),
    });

    log.info('AUTH', 'Profile updated', { uid });
  }, 'updateProfileData');
}

/**
 * Link user to professional
 */
export async function linkToProfessional(
  uid: string,
  professionalId: string,
  professionalName: string
): Promise<Result<void>> {
  return asyncResult(async () => {
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
      professional_id: professionalId,
      professional_name: professionalName,
      updated_at: serverTimestamp(),
    });

    // Also add patient to professional's list
    const profRef = doc(db, 'users', professionalId);
    const profDoc = await getDoc(profRef);

    if (profDoc.exists()) {
      const profData = profDoc.data();
      const patients = profData.patients || [];
      if (!patients.includes(uid)) {
        await updateDoc(profRef, {
          patients: [...patients, uid],
        });
      }
    }

    log.info('AUTH', 'User linked to professional', { uid, professionalId });
  }, 'linkToProfessional');
}

// Performance markers
const PerformanceMarkers = {
  AUTH_LOGIN: 'auth_login',
  AUTH_REGISTER: 'auth_register',
  AUTH_LOGOUT: 'auth_logout',
};
