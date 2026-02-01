import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { registerPushToken, clearPushToken } from '@/lib/notificationsSystem';
import { getOfflineManager } from '@/lib/offlineManager';
import Constants from 'expo-constants';

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
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
          firebaseUser,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // Create basic user object if no Firestore doc
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'Usuario',
          role: 'patient',
        };

        set({
          user,
          firebaseUser,
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
        // Clear push token on logout
        await clearPushToken(user.id);
        // Clear offline queue on logout
        const offlineManager = getOfflineManager();
        await offlineManager.clearQueue();
        await offlineManager.clearCache();
      }
      await firebaseSignOut(auth);
      set({
        user: null,
        firebaseUser: null,
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
              firebaseUser,
              isAuthenticated: true,
              isLoading: false,
            });

            // Register push token for notifications
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
              firebaseUser,
              isAuthenticated: true,
              isLoading: false,
            });

            // Register push token for new users
            const appVersion = Constants.expoConfig?.version || '1.0.0';
            registerPushToken(firebaseUser.uid, appVersion).catch(err => {
              console.warn('Failed to register push token:', err);
            });
          }
        } catch (error) {
          set({
            user: null,
            firebaseUser: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        set({
          user: null,
          firebaseUser: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    });

    return unsubscribe;
  },
}));
