/**
 * ensureProfile - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore for profile management.
 * - supabase.from('profiles') → Firestore collection 'profiles'
 * - supabase.from('user_roles') → Firestore collection 'user_roles'
 */

import { fisioLogger as logger } from '@/lib/errors/logger';
import { db, doc, getDoc, setDoc, query, where, getDocs, collection, addDoc } from '@/integrations/firebase/app';

/**
 * Ensure a profile exists in the database for a user.
 * This is a defensive utility to recover from cases where the database trigger might have failed.
 *
 * Migrated from Supabase to Firebase Firestore.
 *
 * @param userId - Firebase Auth user ID
 * @param email - User email
 * @param fullName - User full name
 * @returns Profile ID or null if failed
 */
export const ensureProfile = async (userId: string, email?: string, fullName?: string): Promise<string | null> => {
  try {
    // 1. Check if profile exists in Firestore
    const profileRef = doc(db, 'profiles', userId);
    const profileSnap = await getDoc(profileRef);

    let profileId: string | null = null;

    if (!profileSnap.exists()) {
      logger.info('Profile not found in ensureProfile, creating for:', { userId }, 'profiles-util');

      // Create new profile document
      const newProfileData = {
        user_id: userId,
        email: email || null,
        full_name: fullName || (email ? email.split('@')[0] : 'Usuário'),
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await setDoc(profileRef, newProfileData);
      profileId = userId;
    } else {
      profileId = userId;
    }

    // 2. Ensure default role exists in user_roles
    const roleRef = doc(db, 'user_roles', userId);
    const roleSnap = await getDoc(roleRef);

    if (!roleSnap.exists()) {
      await setDoc(roleRef, {
        user_id: userId,
        role: 'paciente',
        created_at: new Date().toISOString(),
      });
    }

    return profileId;
  } catch (err) {
    logger.error('Unexpected error in ensureProfile', err, 'profiles-util');
    return null;
  }
};

/**
 * Fetch a profile by user ID
 */
export const fetchProfile = async (userId: string): Promise<any | null> => {
  try {
    const profileRef = doc(db, 'profiles', userId);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      return null;
    }

    return { id: profileSnap.id, ...profileSnap.data() };
  } catch (err) {
    logger.error('Error fetching profile', err, 'profiles-util');
    return null;
  }
};

/**
 * Update profile data
 */
export const updateProfile = async (userId: string, updates: Record<string, unknown>): Promise<boolean> => {
  try {
    const profileRef = doc(db, 'profiles', userId);
    await setDoc(profileRef, {
      ...updates,
      updated_at: new Date().toISOString(),
    }, { merge: true });

    return true;
  } catch (err) {
    logger.error('Error updating profile', err, 'profiles-util');
    return false;
  }
};
