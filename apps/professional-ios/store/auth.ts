/**
 * Authentication Store with Session Management (Migrated to Neon Auth)
 * 
 * Implements session timeout and re-authentication requirements:
 * - Tracks lastActivityAt timestamp on user interactions
 * - Implements 30-day session timeout (auto-logout)
 * - Implements 5-minute background timeout (re-authentication required)
 * - Integrates with biometric/PIN authentication
 * - Persists session state to AsyncStorage
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authClient, isNeonAuthEnabled } from '../lib/neonAuth';
import { biometricAuthService } from '../lib/services/biometricAuthService';
import { encryptionService } from '../lib/services/encryptionService';
import { phiCacheManager } from '../lib/services/phiCacheManager';

/**
 * Session timeout constants
 */
const SESSION_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const BACKGROUND_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface AuthStoreState {
  lastActivityAt: Date | null;
  sessionTimeout: number;
  isLocked: boolean;
  backgroundedAt: Date | null;
  
  updateLastActivity: () => void;
  checkSessionTimeout: () => boolean;
  lockSession: () => void;
  unlockSession: (userId: string) => Promise<boolean>;
  setBackgroundedAt: (date: Date | null) => void;
  checkBackgroundTimeout: () => boolean;
  clearSession: () => void;
  initializeSession: () => void;
  logout: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      lastActivityAt: null,
      sessionTimeout: SESSION_TIMEOUT_MS,
      isLocked: false,
      backgroundedAt: null,

      updateLastActivity: () => {
        const now = new Date();
        set({ lastActivityAt: now });
      },

      checkSessionTimeout: () => {
        const { lastActivityAt, sessionTimeout } = get();
        if (!lastActivityAt) return true;
        const timeSinceActivity = new Date().getTime() - new Date(lastActivityAt).getTime();
        return timeSinceActivity < sessionTimeout;
      },

      checkBackgroundTimeout: () => {
        const { backgroundedAt } = get();
        if (!backgroundedAt) return false;
        const timeSinceBackground = new Date().getTime() - new Date(backgroundedAt).getTime();
        return timeSinceBackground >= BACKGROUND_TIMEOUT_MS;
      },

      lockSession: () => set({ isLocked: true }),

      unlockSession: async (userId: string) => {
        try {
          const biometricEnabled = await biometricAuthService.isEnabled(userId);
          if (biometricEnabled) {
            const success = await biometricAuthService.authenticate('Desbloquear FisioFlow');
            if (success) {
              set({ isLocked: false, lastActivityAt: new Date(), backgroundedAt: null });
              return true;
            }
          }
          return false;
        } catch (error) {
          return false;
        }
      },

      setBackgroundedAt: (date: Date | null) => set({ backgroundedAt: date }),

      clearSession: () => set({ lastActivityAt: null, isLocked: false, backgroundedAt: null }),

      initializeSession: () => set({ lastActivityAt: new Date() }),

      logout: async (userId: string) => {
        try {
          // Limpeza de cache e segurança
          phiCacheManager.clearAllCaches();
          await encryptionService.clearKeys(userId);
          await biometricAuthService.clearBiometricData(userId);
          
          const { getCacheManager } = await import('../lib/offline/cacheManager');
          const cacheManager = await getCacheManager();
          await cacheManager.clear();

          const { getSyncManager } = await import('../lib/offline/syncManager');
          const syncManager = getSyncManager();
          await syncManager.clearQueue();

          get().clearSession();

          // Sair do Neon Auth
          if (isNeonAuthEnabled()) {
            await authClient.signOut();
          }

          // Limpeza extra de storage
          const allKeys = await AsyncStorage.getAllKeys();
          const authKeys = allKeys.filter(key => key.includes('auth') || key.includes('token'));
          if (authKeys.length > 0) {
            await AsyncStorage.multiRemove(authKeys);
          }
        } catch (error) {
          get().clearSession();
          throw error;
        }
      },
    }),
    {
      name: 'auth-session-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lastActivityAt: state.lastActivityAt,
        sessionTimeout: state.sessionTimeout,
        isLocked: state.isLocked,
        backgroundedAt: state.backgroundedAt,
      }),
    }
  )
);

export async function unlockSessionWithPIN(userId: string, pin: string): Promise<boolean> {
  const isValid = await biometricAuthService.verifyPIN(userId, pin);
  if (isValid) {
    useAuthStore.getState().updateLastActivity();
    useAuthStore.setState({ isLocked: false, backgroundedAt: null });
    return true;
  }
  return false;
}

export function useActivityTracker() {
  return useAuthStore((state) => state.updateLastActivity);
}

export function useSessionValidator() {
  return {
    checkSessionTimeout: useAuthStore((state) => state.checkSessionTimeout),
    checkBackgroundTimeout: useAuthStore((state) => state.checkBackgroundTimeout),
    lockSession: useAuthStore((state) => state.lockSession),
  };
}
