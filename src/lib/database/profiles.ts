/**
 * Profile Utilities - Bridge between Firebase and Neon
 *
 */

import { fisioLogger as logger } from '@/lib/errors/logger';
import { db, doc, getDoc, setDoc } from '@/integrations/firebase/app';
import { profileApi } from '@/integrations/firebase/functions';

export const ensureProfile = async (userId: string, email?: string, fullName?: string): Promise<string | null> => {
  try {
    // 1. Check if profile exists in Firestore
    const profileRef = doc(db, 'profiles', userId);
    const profileSnap = await getDoc(profileRef);

    let profileId: string | null = null;

    if (!profileSnap.exists()) {
      logger.info('Profile not found in ensureProfile, creating for:', { userId }, 'profiles-util');

      // Create new profile document in Firestore
      const newProfileData = {
        user_id: userId,
        email: email || null,
        full_name: fullName || (email ? email.split('@')[0] : 'Usuário'),
        role: 'fisioterapeuta', // Default role
        organization_id: '00000000-0000-0000-0000-000000000001', // Default organization
        onboarding_completed: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await setDoc(profileRef, newProfileData);
      profileId = userId;
      
      // Optionally sync to Neon via API if needed
      // profileApi.update(newProfileData).catch(err => logger.warn('Neon sync failed in ensureProfile', err));
    } else {
      profileId = userId;
    }

    return profileId;
  } catch (err) {
    logger.error('Unexpected error in ensureProfile', err, 'profiles-util');
    return null;
  }
};

export const fetchProfile = async (userId: string): Promise<any | null> => {
  try {
    // Try Neon first via API (central truth)
    try {
      const resp = await profileApi.getCurrent();
      if (resp) return resp;
    } catch (e) {
      logger.debug('Neon fetchProfile failed, falling back to Firestore', e, 'profiles-util');
    }

    // Fallback to Firestore
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

export const updateProfile = async (userId: string, updates: Record<string, any>): Promise<boolean> => {
  try {
    // 1. Update Neon
    try {
      await profileApi.update(updates);
    } catch (e) {
      logger.warn('Neon profile update failed', e, 'profiles-util');
    }

    // 2. Update Firestore (for legacy support)
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
