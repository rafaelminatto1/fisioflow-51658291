/**
 * Authentication Service (Migrated to Neon Auth)
 * Handles all authentication-related operations
 */

import { authClient, isNeonAuthEnabled } from '@/lib/neonAuth';
import { asyncResult, Result } from '@/lib/async';
import { log } from '@/lib/logger';
import { perf } from '@/lib/performance';
import { registerPushToken, clearPushToken } from '@/lib/notificationsSystem';

/** Tipo de usuário compatível com o sistema */
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'professional' | 'admin';
  avatarUrl?: string;
  [key: string]: any;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<Result<any>> {
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

    const user = data.user;
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

export async function signUp(data: SignUpData): Promise<Result<any>> {
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

    const user = authData.user;
    const uid = user.id;

    // TODO: Integrar com a API de Workers para criar o perfil no Neon DB
    // Atualmente o better-auth já cria o usuário no banco, mas podemos precisar
    // de campos extras específicos da clínica.
    
    perf.end(PerformanceMarkers.AUTH_REGISTER, true);
    log.info('AUTH', 'User signed up', { uid });

    // Register push token
    await registerPushToken(uid);

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
export async function getCurrentUser(): Promise<any | null> {
  const session = await authClient.getSession();
  return session?.data?.user || null;
}

/**
 * Get user data (Profile)
 * In Neon stack, this should call our Worker API
 */
export async function getUserData(uid: string): Promise<Result<any>> {
  return asyncResult(async () => {
    perf.start('api_get_user');

    // TODO: Substituir por chamada ao Worker API
    // const response = await fetch(`${API_URL}/api/patients/${uid}`);
    // return await response.json();
    
    const session = await authClient.getSession();
    const user = session?.data?.user;
    
    perf.end('api_get_user', true);

    if (!user || user.id !== uid) {
      throw new Error('User not found in session');
    }

    return user;
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
  _uid: string,
  data: UpdateProfileData
): Promise<Result<void>> {
  return asyncResult(async () => {
    const { error } = await authClient.updateUser({
      name: data.name,
      // outros campos precisam estar no schema do Better Auth ou salvos via API
    });

    if (error) throw new Error(error.message);
    log.info('AUTH', 'Profile updated', { name: data.name });
  }, 'updateProfileData');
}

// Performance markers
const PerformanceMarkers = {
  AUTH_LOGIN: 'auth_login',
  AUTH_REGISTER: 'auth_register',
  AUTH_LOGOUT: 'auth_logout',
};
