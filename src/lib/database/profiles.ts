/**
 * Profile Utilities - Workers/Neon bridge
 *
 */

import { fisioLogger as logger } from '@/lib/errors/logger';
import { profileApi } from '@/lib/api/workers-client';

export const ensureProfile = async (userId: string, email?: string, fullName?: string): Promise<string | null> => {
  try {
    await profileApi.updateMe({
      email: email || null,
      full_name: fullName || (email ? email.split('@')[0] : 'Usuário'),
      updated_at: new Date().toISOString(),
    }).catch((error) => {
      logger.warn('Falha ao garantir perfil via Workers', error, 'profiles-util');
    });

    return userId;
  } catch (err) {
    logger.error('Unexpected error in ensureProfile', err, 'profiles-util');
    return null;
  }
};

export const fetchProfile = async (_userId: string): Promise<any | null> => {
  try {
    const resp = await profileApi.me();
    return resp?.data ?? null;
  } catch (err) {
    logger.error('Error fetching profile', err, 'profiles-util');
    return null;
  }
};

export const updateProfile = async (_userId: string, updates: Record<string, any>): Promise<boolean> => {
  try {
    await profileApi.updateMe({
      ...updates,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    logger.error('Error updating profile', err, 'profiles-util');
    return false;
  }
};
