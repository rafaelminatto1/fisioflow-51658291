/**
 * useUserProfile - wrapper over AuthContext
 * Avoids duplicated auth listeners and duplicated Firestore profile fetches.
 */

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fisioLogger as logger } from '@/lib/errors/logger';
import type { Profile, UserRole } from '@/types/auth';

export type { UserRole };
export type UserProfile = Profile;

export const useUserProfile = () => {
  const {
    user,
    profile,
    loading,
    refreshProfile,
    updateProfile: updateProfileFromContext,
  } = useAuth();

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    const result = await updateProfileFromContext(data);
    if (result?.error) {
      logger.error('Erro ao atualizar perfil', result.error, 'useUserProfile');
      return { success: false, error: result.error };
    }
    return { success: true };
  }, [updateProfileFromContext]);

  const getDisplayName = useCallback(() => {
    if (profile?.full_name) return profile.full_name;
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return 'Usuário';
  }, [profile?.full_name, user?.displayName, user?.email]);

  const getInitials = useCallback(() => {
    const name = getDisplayName().trim();
    if (!name) return 'US';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [getDisplayName]);

  return {
    user,
    profile,
    loading,
    error: null,
    refreshProfile,
    updateProfile,
    getDisplayName,
    getInitials,
    isAdmin: !!user,
    isFisio: !!user,
    isAuthenticated: !!user,
  };
};
