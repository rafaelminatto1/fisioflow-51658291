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
  OAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification as firebaseSendEmailVerification,
  confirmPasswordReset,
  verifyPasswordResetCode,
  onAuthStateChanged,
  reauthenticateWithCredential,
  User,
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

// Provider para Sign in with Apple
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');
appleProvider.setCustomParameters({ locale: 'pt-BR' });

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
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return { user: credential.user };
}

/**
 * Entrar com Google
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  const credential = await signInWithPopup(auth, googleProvider);
  return { user: credential.user };
}

/**
 * Entrar com GitHub
 */
export async function signInWithGithub(): Promise<AuthResult> {
  const credential = await signInWithPopup(auth, githubProvider);
  return { user: credential.user };
}

/**
 * Entrar com Apple
 */
export async function signInWithApple(): Promise<AuthResult> {
  const credential = await signInWithPopup(auth, appleProvider);
  return { user: credential.user };
}

/**
 * Criar nova conta de usuário
 */
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<AuthResult> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
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
 */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Atualizar senha do usuário
 */
export async function updateUserPassword(newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');
  await updatePassword(user, newPassword);
}

/**
 * Observar mudanças no estado de autenticação
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

export { auth };
