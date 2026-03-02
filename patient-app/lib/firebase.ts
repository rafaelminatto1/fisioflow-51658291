import { 
  doc, 
  getDoc, 
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { create } from 'zustand';

import { registerPushToken, clearPushToken, removeNotificationListeners } from '@/lib/notificationsSystem';
import { getOfflineManager, initializeOfflineManager } from '@/lib/offlineManager';
import Constants from 'expo-constants';
import { auth, db, storage, functions } from './firebaseConfig';
import { log } from '@/lib/logger';

// Interface do usuário
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'professional' | 'admin';
  clinicId?: string;
  avatarUrl?: string;
  createdAt?: string | Date;
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

export { auth, db, storage, functions };

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

      // Force refresh to get latest custom claims
      const idTokenResult = await firebaseUser.getIdTokenResult(true);
      const claimRole = idTokenResult.claims.role;

      // Fetch user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: userData.name || userData.displayName || 'Usuario',
          role: (userData.role === 'patient' || claimRole === 'paciente') ? 'patient' : (userData.role || 'patient'),
          clinicId: userData.clinicId,
          avatarUrl: userData.avatarUrl || userData.photoURL,
        };

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });

        initializeOfflineManager(user.id).catch(err => {
          log.warn('Failed to initialize offline manager:', err);
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

        initializeOfflineManager(user.id).catch(err => {
          log.warn('Failed to initialize offline manager:', err);
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
        // Realizar as limpezas em paralelo para evitar travamentos
        // Usamos Promise.allSettled e um tempo limite (timeout) para garantir
        // que o logout não fique preso indefinidamente se algum serviço falhar
        const cleanupTasks = [
          clearPushToken(user.id).catch(e => log.error('Logout - clearPushToken:', e)),
          getOfflineManager().clearQueue().catch(e => log.error('Logout - clearQueue:', e)),
          getOfflineManager().clearCache().catch(e => log.error('Logout - clearCache:', e)),
        ];

        // Aguardamos as tarefas de limpeza por no máximo 3 segundos
        const timeout = new Promise(resolve => setTimeout(resolve, 3000));
        await Promise.race([
          Promise.all(cleanupTasks),
          timeout
        ]);

        removeNotificationListeners();
        getOfflineManager().destroy();
      }

      await signOut(auth);
      
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      log.error('Logout error:', error);
      // Mesmo com erro, limpamos o estado local para permitir nova tentativa
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false,
        error: error.message || 'Erro ao sair'
      });
    }
  },

  clearError: () => set({ error: null }),

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
      if (firebaseUser) {
        try {
          // Force refresh to get latest custom claims (like 'role: paciente')
          const idTokenResult = await firebaseUser.getIdTokenResult(true);
          const claimRole = idTokenResult.claims.role;
          
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const user: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: userData.name || userData.displayName || 'Usuario',
              role: (userData.role === 'patient' || claimRole === 'paciente') ? 'patient' : (userData.role || 'patient'),
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
              log.warn('Failed to register push token:', err);
            });

            initializeOfflineManager(user.id).catch(err => {
              log.warn('Failed to initialize offline manager:', err);
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
              log.warn('Failed to register push token:', err);
            });

            initializeOfflineManager(user.id).catch(err => {
              log.warn('Failed to initialize offline manager:', err);
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
