/**
 * Firebase Auth Integration
 * Funções de autenticação usando Firebase Authentication
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification as firebaseSendEmailVerification,
  confirmPasswordReset,
  verifyPasswordResetCode,
  onAuthStateChanged,
  User,
  UserCredential,
  Auth,
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
} from 'firebase/auth';

import { getFirebaseAuth } from './app';

// Obter instância do Auth
const auth = getFirebaseAuth();

// Provider para Google Sign In
const googleProvider = new GoogleAuthProvider();
// Provider para GitHub Sign In
const githubProvider = new GithubAuthProvider();

/**
 * Resultado de autenticação com dados do profile
 */
export interface AuthResult {
  user: User;
  profile?: Profile;
}

/**
 * Dados do profile do usuário
 */
export interface Profile {
  id: string;
  user_id: string;
  organization_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  crefito?: string;
  specialties?: string[];
  bio?: string;
}

/**
 * Papéis de usuário
 */
export type UserRole = 'admin' | 'fisioterapeuta' | 'recepcionista' | 'paciente';

/**
 * Entrar com email e senha
 *
 * @param email - Email do usuário
 * @param password - Senha do usuário
 * @returns Credencial do usuário
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return { user: credential.user };
}

/**
 * Entrar com Google
 *
 * @returns Credencial do usuário
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  const credential = await signInWithPopup(auth, googleProvider);
  return { user: credential.user };
}

/**
 * Entrar com GitHub
 *
 * @returns Credencial do usuário
 */
export async function signInWithGithub(): Promise<AuthResult> {
  const credential = await signInWithPopup(auth, githubProvider);
  return { user: credential.user };
}

/**
 * Entrar com provedor OAuth genérico
 */
export async function signInWithOAuth(provider: 'google' | 'github'): Promise<AuthResult> {
  if (provider === 'google') return signInWithGoogle();
  if (provider === 'github') return signInWithGithub();
  throw new Error(`Provedor ${provider} não suportado`);
}

/**
 * Criar nova conta de usuário
 *
 * @param email - Email do novo usuário
 * @param password - Senha do novo usuário
 * @param name - Nome do usuário
 * @returns Credencial do usuário criado
 */
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<AuthResult> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  // Atualizar display name
  await updateProfile(credential.user, { displayName: name });

  return { user: credential.user };
}

/**
 * Sair da conta atual
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Enviar email de recuperação de senha
 *
 * @param email - Email do usuário
 */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email, {
    url: `${window.location.origin}/auth/reset-password`,
    handleCodeInApp: true,
  });
}

/**
 * Confirmar reset de senha com código
 *
 * @param code - Código de reset recebido no email
 * @param newPassword - Nova senha
 */
export async function confirmPassword(code: string, newPassword: string): Promise<void> {
  await confirmPasswordReset(auth, code, newPassword);
}

/**
 * Verificar código de reset de senha
 *
 * @param code - Código de reset recebido no email
 * @returns Email associado ao código
 */
export async function verifyPasswordReset(code: string): Promise<string> {
  const email = await verifyPasswordResetCode(auth, code);
  return email;
}

/**
 * Atualizar perfil do usuário
 *
 * @param updates - Campos a atualizar
 */
export async function updateUserProfile(updates: {
  displayName?: string;
  photoURL?: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  await updateProfile(user, updates);
}

/**
 * Atualizar email do usuário
 *
 * @param newEmail - Novo email
 */
export async function updateUserEmail(newEmail: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  await updateEmail(user, newEmail);
}

/**
 * Atualizar senha do usuário
 *
 * @param newPassword - Nova senha
 */
export async function updateUserPassword(newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  await updatePassword(user, newPassword);
}

/**
 * Reautenticar usuário (necessário para operações sensíveis)
 *
 * @param password - Senha atual
 */
export async function reauthenticate(password: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');
  if (!user.email) throw new Error('Email não disponível');

  const credential = EmailAuthProvider.credential(user.email, password);
  // Usar o método do usuário diretamente
  await (user as any).reauthenticateWithCredential(credential);
}

/**
 * Observar mudanças no estado de autenticação
 *
 * @param callback - Função chamada quando o estado muda
 * @returns Função para cancelar a inscrição
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Hook React para observar mudanças de autenticação
 */
export function useAuthState(): {
  user: User | null;
  loading: boolean;
  error?: Error;
} {
  // Esta função é usada no React Context
  // Implementação no AuthContext.tsx
  throw new Error('useAuthState deve ser usado dentro do AuthContext');
}

/**
 * Obter token ID atual do usuário
 *
 * @param forceRefresh - Forçar renovação do token
 * @returns Token JWT
 */
export async function getIdToken(forceRefresh: boolean = false): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  return user.getIdToken(forceRefresh);
}

/**
 * Verificar se o email do usuário está verificado
 */
export function isEmailVerified(): boolean {
  const user = auth.currentUser;
  return user?.emailVerified || false;
}

/**
 * Enviar verificação de email
 */
export async function sendEmailVerification(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  await firebaseSendEmailVerification(user, {
    url: `${window.location.origin}/dashboard`,
  });
}

/**
 * Apagar conta do usuário
 */
export async function deleteAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  await user.delete();
}

/**
 * Obter o usuário atual autenticado
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Verificar se há um usuário autenticado
 */
export function isAuthenticated(): boolean {
  return auth.currentUser !== null;
}

/**
 * Exportar instância do auth para uso direto
 */
export { auth };
