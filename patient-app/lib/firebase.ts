import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  initializeAuth,
  getReactNativePersistence
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { create } from 'zustand';

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { registerPushToken, clearPushToken } from '@/lib/notificationsSystem';
import { getOfflineManager } from '@/lib/offlineManager';
import Constants from 'expo-constants';

// Interface do usuário
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'professional' | 'admin';
  clinicId?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  initialize: () => () => void;
}

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'YOUR_AUTH_DOMAIN',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'YOUR_STORAGE_BUCKET',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_MESSAGING_SENDER_ID',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'YOUR_APP_ID',
};

// Initialize Firebase app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Storage
const storage = getStorage(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth based on platform
let auth;
if (Platform.OS === 'web') {
  // Web - usar getAuth padrão
  auth = getAuth(app);
} else {
  // React Native - usar AsyncStorage para persistência
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    // Fallback para getAuth se initializeAuth falhar (auth já inicializado)
    auth = getAuth(app);
  }
}

export { auth, storage };

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const firebaseUser = userCredential.user;

      // Fetch user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: userData.name || userData.displayName || 'Usuario',
          role: userData.role || 'patient',
          clinicId: userData.clinicId,
          avatarUrl: userData.avatarUrl || userData.photoURL,
        };

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'Usuario',
          role: 'patient',
        };

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (error: any) {
      let errorMessage = 'Erro ao fazer login';

      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Email invalido';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Usuario desativado';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Usuario nao encontrado';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Senha incorreta';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Credenciais invalidas';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
          break;
      }

      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      const { user } = get();
      if (user) {
        await clearPushToken(user.id);
        const offlineManager = getOfflineManager();
        await offlineManager.clearQueue();
        await offlineManager.clearCache();
      }
      await signOut(auth);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const user: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: userData.name || userData.displayName || 'Usuario',
              role: userData.role || 'patient',
              clinicId: userData.clinicId,
              avatarUrl: userData.avatarUrl || userData.photoURL,
            };

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });

            const appVersion = Constants.expoConfig?.version || '1.0.0';
            registerPushToken(firebaseUser.uid, appVersion).catch(err => {
              console.warn('Failed to register push token:', err);
            });
          } else {
            const user: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'Usuario',
              role: 'patient',
            };

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });

            const appVersion = Constants.expoConfig?.version || '1.0.0';
            registerPushToken(firebaseUser.uid, appVersion).catch(err => {
              console.warn('Failed to register push token:', err);
            });
          }
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    });

    return unsubscribe;
  },
}));
