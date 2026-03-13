import { createAuthClient } from '@neondatabase/neon-js/auth';
import { getNeonAuthUrl, isNeonAuthConfigured } from '@/lib/config/neon';
import { invalidateNeonTokenCache } from '@/lib/auth/neon-token';

export interface NeonUser {
  id: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Neon Auth Client
 * Configurado usando a URL do Neon Auth provida pelas variáveis de ambiente.
 */
export const authClient = createAuthClient(getNeonAuthUrl());

/**
 * Helper para verificar se o Neon Auth está configurado
 */
export const isNeonAuthEnabled = () => {
  return isNeonAuthConfigured();
};

/**
 * Resultado de autenticação com dados do profile
 */
export interface AuthResult {
  user: NeonUser;
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
  invalidateNeonTokenCache();
  return { user: data.user as unknown as NeonUser };
}

/**
 * Entrar com Google
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  return signInWithOAuth('google');
}

/**
 * Entrar com provedor OAuth genérico
 */
export async function signInWithOAuth(provider: 'google' | 'github' | 'apple'): Promise<AuthResult> {
  if (!isNeonAuthEnabled()) {
    throw new Error('Neon Auth não configurado. Defina VITE_NEON_AUTH_URL.');
  }
  const { data, error } = await authClient.signIn.social({ provider });
  if (error) throw new Error(error.message);
  invalidateNeonTokenCache();
  return { user: data.user as unknown as NeonUser };
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
  invalidateNeonTokenCache();
  return { user: data.user as unknown as NeonUser };
}

/**
 * Sair da conta atual
 */
export async function signOut(): Promise<void> {
  if (!isNeonAuthEnabled()) {
    throw new Error('Neon Auth não configurado. Defina VITE_NEON_AUTH_URL.');
  }
  await authClient.signOut();
  invalidateNeonTokenCache();
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
  callback: (user: NeonUser | null) => void
): () => void {
  if (!isNeonAuthEnabled()) {
    callback(null);
    return () => {};
  }
  return authClient.useSession.subscribe((session) => {
    callback((session?.data?.user as unknown as NeonUser) || null);
  });
}

// Re-exportar instâncias para compatibilidade
export { authClient as auth };
