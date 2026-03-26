import { create } from 'zustand';
import { authClient, isNeonAuthEnabled } from './neonAuth';
import { registerPushToken, clearPushToken, removeNotificationListeners } from '@/lib/notificationsSystem';
import { getOfflineManager, initializeOfflineManager } from '@/lib/offlineManager';
import Constants from 'expo-constants';
import { log } from '@/lib/logger';
import { User } from '@/types/auth';
import { Mappers } from './mappers';

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

// Placeholders neutros para consumidores legados do store de autenticação
export const auth = null as any;
export const db = null as any;
export const storage = null as any;
export const functions = null as any;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
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
      
      // Centralizar mapeamento e garantir role correta
      const user = Mappers.user({
        ...neonUser,
        role: (neonUser as any).role || 'patient'
      });

      if (user.role !== 'patient' && user.role !== 'admin') {
        await authClient.signOut();
        throw new Error('Acesso restrito a pacientes.');
      }

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      initializeOfflineManager(user.id).catch(err => {
        log.warn('Failed to initialize offline manager:', err);
      });

    } catch (error: any) {
      set({ error: error.message || 'Erro ao fazer login', isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      const { user } = get();
      
      if (user) {
        const cleanupTasks = [
          clearPushToken(user.id).catch(e => log.error('Logout - clearPushToken:', e)),
          getOfflineManager().clearQueue().catch(e => log.error('Logout - clearQueue:', e)),
          getOfflineManager().clearCache().catch(e => log.error('Logout - clearCache:', e)),
        ];

        const timeout = new Promise(resolve => setTimeout(resolve, 3000));
        await Promise.race([
          Promise.all(cleanupTasks),
          timeout
        ]);

        removeNotificationListeners();
        getOfflineManager().destroy();
      }

      await authClient.signOut();
      
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      log.error('Logout error:', error);
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
    if (!isNeonAuthEnabled()) {
      set({ isLoading: false });
      return () => {};
    }

    // Usar o hook de subscrição de sessão do Better Auth
    const unsubscribe = authClient.useSession.subscribe(async (session: any) => {
      const neonUser = session?.data?.user;
      
      if (neonUser) {
        const user = Mappers.user({
          ...neonUser,
          role: (neonUser as any).role || 'patient'
        });

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });

        const appVersion = Constants.expoConfig?.version || '1.0.0';
        registerPushToken(neonUser.id, appVersion).catch(err => {
          log.warn('Failed to register push token:', err);
        });

        initializeOfflineManager(user.id).catch(err => {
          log.warn('Failed to initialize offline manager:', err);
        });
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

export type { User };
