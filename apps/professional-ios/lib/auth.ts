/**
 * FisioFlow Patient App - Authentication Service
 *
 * Firebase Authentication integration for patient app.
 * Handles login, registration, logout, and password reset.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { COLLECTIONS } from '@fisioflow/shared-constants';
import * as Notifications from 'expo-notifications';

// ============================================
// Types
// ============================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: 'patient' | 'professional';
}

export interface UserData {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'professional' | 'admin';
  phone?: string;
  avatar?: string;
  createdAt: any;
  updatedAt: any;
  // Patient specific
  dateOfBirth?: string;
  cpf?: string;
  professionalId?: string;
}

// ============================================
// Authentication Functions
// ============================================

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );

    console.log('[Auth] Login successful:', userCredential.user.email);
    return userCredential.user;
  } catch (error: any) {
    console.error('[Auth] Login error:', error.code, error.message);

    // Translate Firebase errors to user-friendly messages
    switch (error.code) {
      case 'auth/user-not-found':
        throw new Error('Usuário não encontrado. Verifique seu email.');
      case 'auth/wrong-password':
        throw new Error('Senha incorreta. Tente novamente.');
      case 'auth/invalid-email':
        throw new Error('Email inválido. Verifique o formato.');
      case 'auth/user-disabled':
        throw new Error('Esta conta foi desativada.');
      case 'auth/too-many-requests':
        throw new Error('Muitas tentativas. Aguarde alguns minutos.');
      case 'auth/invalid-credential':
        throw new Error('Email ou senha incorretos.');
      default:
        throw new Error('Erro ao fazer login. Tente novamente.');
    }
  }
}

/**
 * Register a new user
 */
export async function register(data: RegisterData): Promise<User> {
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );

    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: data.name,
    });

    // Create user document in Firestore
    const userData: Omit<UserData, 'id'> = {
      email: data.email,
      name: data.name,
      role: data.role || 'patient',
      phone: data.phone || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
      ...userData,
      id: user.uid,
    });

    console.log('[Auth] Registration successful:', user.email);
    return user;
  } catch (error: any) {
    console.error('[Auth] Registration error:', error.code, error.message);

    switch (error.code) {
      case 'auth/email-already-in-use':
        throw new Error('Este email já está em uso.');
      case 'auth/invalid-email':
        throw new Error('Email inválido. Verifique o formato.');
      case 'auth/weak-password':
        throw new Error('Senha muito fraca. Use pelo menos 6 caracteres.');
      case 'auth/operation-not-allowed':
        throw new Error('Registro desabilitado. Contate o suporte.');
      default:
        throw new Error('Erro ao criar conta. Tente novamente.');
    }
  }
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
  try {
    await firebaseSignOut(auth);
    console.log('[Auth] Logout successful');
  } catch (error: any) {
    console.error('[Auth] Logout error:', error);
    throw new Error('Erro ao sair. Tente novamente.');
  }
}

/**
 * Sign out - alias for logout
 */
export async function signOut(): Promise<void> {
  return logout();
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log('[Auth] Password reset email sent to:', email);
  } catch (error: any) {
    console.error('[Auth] Password reset error:', error.code, error.message);

    switch (error.code) {
      case 'auth/user-not-found':
        throw new Error('Usuário não encontrado com este email.');
      case 'auth/invalid-email':
        throw new Error('Email inválido. Verifique o formato.');
      case 'auth/too-many-requests':
        throw new Error('Muitas tentativas. Aguarde alguns minutos.');
      default:
        throw new Error('Erro ao enviar email. Tente novamente.');
    }
  }
}

// ============================================
// Auth State Management
// ============================================

type AuthStateCallback = (user: User | null) => void;

/**
 * Listen to authentication state changes
 */
export function onAuthStateChanged(callback: AuthStateCallback): () => void {
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Get current user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Get user data from Firestore
 */
export async function getUserData(userId: string): Promise<UserData | null> {
  try {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));

    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    }

    return null;
  } catch (error) {
    console.error('[Auth] Error getting user data:', error);
    return null;
  }
}

// ============================================
// Notification Permissions
// ============================================

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[Auth] Failed to request notification permissions:', error);
    return false;
  }
}

/**
 * Get FCM/Expo Push Token
 */
export async function getPushToken(): Promise<string | null> {
  try {
    const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

    if (!projectId) {
      console.warn('[Auth] No project ID for push token');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return tokenData.data;
  } catch (error) {
    console.error('[Auth] Error getting push token:', error);
    return null;
  }
}

// ============================================
// Export auth instance for direct access
// ============================================

export { auth };
