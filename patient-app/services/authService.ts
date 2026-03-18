/**
 * Authentication Service (Migrated to Neon Auth)
 * Handles all authentication-related operations
 */

import { authClient, isNeonAuthEnabled } from '@/lib/neonAuth';
import { patientApi } from '@/lib/api';
import { asyncResult, Result } from '@/lib/async';
import { log } from '@/lib/logger';
import { perf } from '@/lib/performance';
import { registerPushToken, clearPushToken } from '@/lib/notificationsSystem';
import { User } from '@/types/auth';
import { PatientProfile } from '@/types/api';
import { Mappers } from '@/lib/mappers';

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<Result<User>> {
  return asyncResult(async () => {
    perf.start(PerformanceMarkers.AUTH_LOGIN, { email });

    if (!isNeonAuthEnabled()) {
      throw new Error('Neon Auth não configurado.');
    }

    const { data, error } = await authClient.signIn.email({ 
      email: email.trim().toLowerCase(), 
      password 
    });

    if (error) {
      throw new Error(error.message);
    }

    const neonUser = data.user;
    const user = Mappers.user({
      ...neonUser,
      role: (neonUser as any).role || 'patient'
    });

    perf.end(PerformanceMarkers.AUTH_LOGIN, true);
    log.info('AUTH', 'User signed in', { uid: user.id });

    // Register push token after login
    await registerPushToken(user.id);

    return user;
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

export async function signUp(data: SignUpData): Promise<Result<User>> {
  return asyncResult(async () => {
    perf.start(PerformanceMarkers.AUTH_REGISTER, { email: data.email });

    if (!isNeonAuthEnabled()) {
      throw new Error('Neon Auth não configurado.');
    }

    const { data: authData, error } = await authClient.signUp.email({ 
      email: data.email.trim().toLowerCase(), 
      password: data.password,
      name: data.fullName.trim(),
    });

    if (error) {
      throw new Error(error.message);
    }

    const neonUser = authData.user;
    const user = Mappers.user({
      ...neonUser,
      role: (neonUser as any).role || 'patient'
    });

    await patientApi.bootstrapProfile({
      full_name: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      incomplete_registration: true,
    });
    
    perf.end(PerformanceMarkers.AUTH_REGISTER, true);
    log.info('AUTH', 'User signed up', { uid: user.id });

    // Register push token
    await registerPushToken(user.id);

    return user;
  }, 'signUp');
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<Result<void>> {
  return asyncResult(async () => {
    perf.start(PerformanceMarkers.AUTH_LOGOUT);

    const session = await authClient.getSession();
    const userId = session?.data?.user?.id;

    // Clear push token before signing out
    if (userId) {
      await clearPushToken(userId);
    }

    await authClient.signOut();

    perf.end(PerformanceMarkers.AUTH_LOGOUT, true);
    log.info('AUTH', 'User signed out', { userId });
  }, 'signOut');
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<Result<void>> {
  return asyncResult(async () => {
    const { error } = await (authClient as any).forgetPassword({ 
      email: email.trim().toLowerCase(),
      redirectTo: 'fisioflow://reset-password' // Deep link para o app
    });
    
    if (error) throw new Error(error.message);
    log.info('AUTH', 'Password reset email requested', { email });
  }, 'resetPassword');
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await authClient.getSession();
  const neonUser = session?.data?.user;
  if (!neonUser) return null;
  
  return Mappers.user({
    ...neonUser,
    role: (neonUser as any).role || 'patient'
  });
}

/**
 * Get user data (Profile)
 */
export async function getUserData(uid: string): Promise<Result<PatientProfile>> {
  return asyncResult(async () => {
    perf.start('api_get_user');
    const profile = await patientApi.getProfile();
    perf.end('api_get_user', true);

    if (!profile || profile.id !== uid) {
      throw new Error('User not found in portal profile');
    }

    return profile;
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
): Promise<Result<PatientProfile>> {
  return asyncResult(async () => {
    const { error } = await authClient.updateUser({
      name: data.name,
    });

    if (error) throw new Error(error.message);
    
    const profile = await patientApi.updateProfile({
      name: data.name,
      phone: data.phone,
      birth_date:
        data.birth_date instanceof Date
          ? data.birth_date.toISOString().slice(0, 10)
          : undefined,
      gender: data.gender,
    });
    
    log.info('AUTH', 'Profile updated', { name: data.name });
    return profile;
  }, 'updateProfileData');
}

// Performance markers
const PerformanceMarkers = {
  AUTH_LOGIN: 'auth_login',
  AUTH_REGISTER: 'auth_register',
  AUTH_LOGOUT: 'auth_logout',
};
