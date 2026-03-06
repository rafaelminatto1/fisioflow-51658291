/**
 * Firebase Auth Integration (Legacy Bridge)
 * Bridge legado que usa exclusivamente Neon Auth (JWT)
 */
import {
  User,
} from 'firebase/auth';

import { authClient, isNeonAuthEnabled } from '@/integrations/neon/auth';

/**
 * Resultado de autenticação com dados do profile
 */
export interface AuthResult {
  user: User;
  profile?: any;
}

/**
 * Entrar com email e senha
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!isNeonAuthEnabled()) {
    throw new Error('Neon Auth não configurado. Defina VITE_NEON_AUTH_URL.');
  }
  const { data, error } = await authClient.signIn.email({ email, password });
  if (error) throw new Error(error.message);
  return { user: data.user as any };
}

/**
 * Entrar com Google
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  if (!isNeonAuthEnabled()) {
    throw new Error('Neon Auth não configurado. Defina VITE_NEON_AUTH_URL.');
  }
  const { data, error } = await authClient.signIn.social({ provider: 'google' });
  if (error) throw new Error(error.message);
  return { user: data.user as any };
}

/**
 * Criar nova conta de usuário
 */
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<AuthResult> {
  if (!isNeonAuthEnabled()) {
    throw new Error('Neon Auth não configurado. Defina VITE_NEON_AUTH_URL.');
  }
  const { data, error } = await authClient.signUp.email({ email, password, name });
  if (error) throw new Error(error.message);
  return { user: data.user as any };
}

/**
 * Sair da conta atual
 */
export async function signOut(): Promise<void> {
  if (!isNeonAuthEnabled()) {
    throw new Error('Neon Auth não configurado. Defina VITE_NEON_AUTH_URL.');
  }
  await authClient.signOut();
}

/**
 * Resetar senha
 */
export async function resetPassword(email: string): Promise<void> {
  if (!isNeonAuthEnabled()) {
    throw new Error('Neon Auth não configurado. Defina VITE_NEON_AUTH_URL.');
  }
  const { error } = await authClient.forgetPassword({ email, redirectTo: window.location.origin + '/auth/reset-password' });
  if (error) throw new Error(error.message);
}

/**
 * Atualizar senha
 */
export async function updateUserPassword(newPassword: string): Promise<void> {
  if (!isNeonAuthEnabled()) {
    throw new Error('Neon Auth não configurado. Defina VITE_NEON_AUTH_URL.');
  }
  const { error } = await authClient.changePassword({ newPassword });
  if (error) throw new Error(error.message);
}

/**
 * Observar mudanças no estado de autenticação
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  if (!isNeonAuthEnabled()) {
    callback(null);
    return () => {};
  }
  return authClient.useSession.subscribe((session) => {
    callback(session?.data?.user as any || null);
  });
}

// Re-exportar instâncias para compatibilidade
export { authClient as auth };
