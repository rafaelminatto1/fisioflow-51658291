/**
 * Authentication Store with Session Management
 * 
 * Implements session timeout and re-authentication requirements:
 * - Tracks lastActivityAt timestamp on user interactions
 * - Implements 30-day session timeout (auto-logout)
 * - Implements 5-minute background timeout (re-authentication required)
 * - Integrates with biometric/PIN authentication
 * - Persists session state to AsyncStorage
 * 
 * Requirements: 2.10, 5.3, 5.4
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { biometricAuthService } from '../lib/services/biometricAuthService';
import { encryptionService } from '../lib/services/encryptionService';
import { phiCacheManager } from '../lib/services/phiCacheManager';
import { auth } from '../lib/firebase';

/**
 * Session timeout constants
 */
const SESSION_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
const BACKGROUND_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Auth store state interface
 */
interface AuthStoreState {
  // Session management
  lastActivityAt: Date | null;
  sessionTimeout: number; // milliseconds (default 30 days)
  isLocked: boolean;
  backgroundedAt: Date | null;
  
  // Actions
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

/**
 * Auth store with session management
 * 
 * Usage:
 * - Call updateLastActivity() on any user interaction
 * - Call checkSessionTimeout() on app foreground to verify session validity
 * - Call checkBackgroundTimeout() when app returns from background
 * - Call lockSession() to lock app and require re-authentication
 * - Call unlockSession() to re-authenticate with biometric/PIN
 * - Call clearSession() on logout
 */
export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      lastActivityAt: null,
      sessionTimeout: SESSION_TIMEOUT_MS,
      isLocked: false,
      backgroundedAt: null,

      /**
       * Update last activity timestamp
       * Should be called on any user interaction
       */
      updateLastActivity: () => {
        const now = new Date();
        set({ lastActivityAt: now });
        console.log('[AuthStore] Last activity updated:', now.toISOString());
      },

      /**
       * Check if session has timed out (30 days of inactivity)
       * 
       * @returns true if session is valid, false if timed out
       */
      checkSessionTimeout: () => {
        const { lastActivityAt, sessionTimeout } = get();
        
        if (!lastActivityAt) {
          // No activity recorded yet, session is valid
          return true;
        }

        const now = new Date();
        const lastActivity = new Date(lastActivityAt);
        const timeSinceActivity = now.getTime() - lastActivity.getTime();

        const isValid = timeSinceActivity < sessionTimeout;
        
        if (!isValid) {
          console.warn('[AuthStore] Session timeout detected:', {
            lastActivity: lastActivity.toISOString(),
            timeSinceActivity: Math.floor(timeSinceActivity / (1000 * 60 * 60 * 24)), // days
            timeoutDays: Math.floor(sessionTimeout / (1000 * 60 * 60 * 24)),
          });
        }

        return isValid;
      },

      /**
       * Check if app was backgrounded for more than 5 minutes
       * 
       * @returns true if re-authentication required, false otherwise
       */
      checkBackgroundTimeout: () => {
        const { backgroundedAt } = get();
        
        if (!backgroundedAt) {
          // App was not backgrounded
          return false;
        }

        const now = new Date();
        const backgrounded = new Date(backgroundedAt);
        const timeSinceBackground = now.getTime() - backgrounded.getTime();

        const requiresReauth = timeSinceBackground >= BACKGROUND_TIMEOUT_MS;
        
        if (requiresReauth) {
          console.warn('[AuthStore] Background timeout detected:', {
            backgroundedAt: backgrounded.toISOString(),
            timeSinceBackground: Math.floor(timeSinceBackground / 1000), // seconds
            timeoutSeconds: Math.floor(BACKGROUND_TIMEOUT_MS / 1000),
          });
        }

        return requiresReauth;
      },

      /**
       * Lock session and require re-authentication
       * Called when session timeout or background timeout is detected
       */
      lockSession: () => {
        set({ isLocked: true });
        console.log('[AuthStore] Session locked - re-authentication required');
      },

      /**
       * Unlock session with biometric/PIN authentication
       * 
       * @param userId - User ID for authentication
       * @returns true if authentication successful, false otherwise
       */
      unlockSession: async (userId: string) => {
        try {
          console.log('[AuthStore] Attempting to unlock session for user:', userId);

          // Check if biometric auth is enabled
          const biometricEnabled = await biometricAuthService.isEnabled(userId);
          
          if (biometricEnabled) {
            // Try biometric authentication first
            const biometricSuccess = await biometricAuthService.authenticate(
              'Autentique para desbloquear o aplicativo'
            );

            if (biometricSuccess) {
              set({ 
                isLocked: false, 
                lastActivityAt: new Date(),
                backgroundedAt: null,
              });
              console.log('[AuthStore] Session unlocked with biometric authentication');
              return true;
            }

            // Biometric failed, check if PIN fallback is available
            const config = await biometricAuthService.getConfig(userId);
            if (!config?.fallbackEnabled) {
              console.error('[AuthStore] Biometric failed and PIN fallback not enabled');
              return false;
            }

            // PIN fallback will be handled by the UI
            // Return false to indicate biometric failed, UI should prompt for PIN
            console.log('[AuthStore] Biometric failed, PIN fallback required');
            return false;
          } else {
            // Biometric not enabled, require PIN
            console.log('[AuthStore] Biometric not enabled, PIN required');
            return false;
          }
        } catch (error) {
          console.error('[AuthStore] Failed to unlock session:', error);
          return false;
        }
      },

      /**
       * Set backgrounded timestamp
       * Called when app enters background
       * 
       * @param date - Timestamp when app was backgrounded, or null when foregrounded
       */
      setBackgroundedAt: (date: Date | null) => {
        set({ backgroundedAt: date });
        if (date) {
          console.log('[AuthStore] App backgrounded at:', date.toISOString());
        } else {
          console.log('[AuthStore] App foregrounded');
        }
      },

      /**
       * Clear session data
       * Called on logout
       */
      clearSession: () => {
        set({
          lastActivityAt: null,
          isLocked: false,
          backgroundedAt: null,
        });
        console.log('[AuthStore] Session cleared');
      },

      /**
       * Initialize session on app start
       * Sets initial lastActivityAt timestamp
       */
      initializeSession: () => {
        const now = new Date();
        set({ lastActivityAt: now });
        console.log('[AuthStore] Session initialized at:', now.toISOString());
      },

      /**
       * Comprehensive logout function
       * Clears all sensitive data including encryption keys, cached PHI, and in-memory state
       * 
       * Requirements: 2.11, 2.13
       * 
       * @param userId - User ID for clearing user-specific data
       */
      logout: async (userId: string) => {
        try {
          console.log('[AuthStore] Starting logout process for user:', userId);

          // Step 1: Clear all decrypted PHI from memory caches
          try {
            phiCacheManager.clearAllCaches();
            console.log('[AuthStore] All PHI caches cleared from memory');
          } catch (error) {
            console.error('[AuthStore] Failed to clear PHI caches:', error);
            // Continue with logout even if this fails
          }

          // Step 2: Clear encryption keys from SecureStore
          try {
            await encryptionService.clearKeys(userId);
            console.log('[AuthStore] Encryption keys cleared from SecureStore');
          } catch (error) {
            console.error('[AuthStore] Failed to clear encryption keys:', error);
            // Continue with logout even if this fails
          }

          // Step 3: Clear biometric authentication data
          try {
            await biometricAuthService.clearBiometricData(userId);
            console.log('[AuthStore] Biometric data cleared');
          } catch (error) {
            console.error('[AuthStore] Failed to clear biometric data:', error);
            // Continue with logout even if this fails
          }

          // Step 4: Clear all cached PHI from AsyncStorage
          try {
            // Import cache manager dynamically to avoid circular dependencies
            const { getCacheManager } = await import('../lib/offline/cacheManager');
            const cacheManager = await getCacheManager();
            await cacheManager.clear();
            console.log('[AuthStore] All cached PHI cleared from AsyncStorage');
          } catch (error) {
            console.error('[AuthStore] Failed to clear cache:', error);
            // Continue with logout even if this fails
          }

          // Step 5: Clear sync queue
          try {
            const { getSyncManager } = await import('../lib/offline/syncManager');
            const syncManager = getSyncManager();
            await syncManager.clearQueue();
            console.log('[AuthStore] Sync queue cleared');
          } catch (error) {
            console.error('[AuthStore] Failed to clear sync queue:', error);
            // Continue with logout even if this fails
          }

          // Step 6: Clear session state (in-memory Zustand state)
          get().clearSession();
          console.log('[AuthStore] Session state cleared');

          // Step 7: Invalidate Firebase Auth token
          try {
            await firebaseSignOut(auth);
            console.log('[AuthStore] Firebase Auth token invalidated');
          } catch (error) {
            console.error('[AuthStore] Failed to sign out from Firebase:', error);
            // Continue with logout even if this fails
          }

          // Step 8: Clear any remaining AsyncStorage items related to auth
          try {
            const allKeys = await AsyncStorage.getAllKeys();
            const authKeys = allKeys.filter(key => 
              key.includes('auth') || 
              key.includes('session') || 
              key.includes('token') ||
              key.includes('user')
            );
            if (authKeys.length > 0) {
              await AsyncStorage.multiRemove(authKeys);
              console.log('[AuthStore] Auth-related AsyncStorage items cleared:', authKeys.length);
            }
          } catch (error) {
            console.error('[AuthStore] Failed to clear auth AsyncStorage items:', error);
            // Continue with logout even if this fails
          }

          console.log('[AuthStore] Logout completed successfully');
          
          // Navigation to login screen will be handled by the app layout
          // which monitors auth state changes
        } catch (error) {
          console.error('[AuthStore] Logout failed with error:', error);
          // Even if logout fails, we should still clear local state
          get().clearSession();
          throw error;
        }
      },
    }),
    {
      name: 'auth-session-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist session-related data
      partialize: (state) => ({
        lastActivityAt: state.lastActivityAt,
        sessionTimeout: state.sessionTimeout,
        isLocked: state.isLocked,
        backgroundedAt: state.backgroundedAt,
      }),
    }
  )
);

/**
 * Helper function to verify PIN and unlock session
 * Should be called from UI when PIN is entered
 * 
 * @param userId - User ID
 * @param pin - PIN entered by user
 * @returns true if PIN is correct and session unlocked
 */
export async function unlockSessionWithPIN(userId: string, pin: string): Promise<boolean> {
  try {
    const isValid = await biometricAuthService.verifyPIN(userId, pin);
    
    if (isValid) {
      useAuthStore.getState().updateLastActivity();
      useAuthStore.setState({ 
        isLocked: false,
        backgroundedAt: null,
      });
      console.log('[AuthStore] Session unlocked with PIN');
      return true;
    }

    console.log('[AuthStore] Invalid PIN');
    return false;
  } catch (error) {
    console.error('[AuthStore] Failed to unlock with PIN:', error);
    return false;
  }
}

/**
 * Hook to track user activity
 * Call this in components that should update lastActivityAt
 */
export function useActivityTracker() {
  const updateLastActivity = useAuthStore((state) => state.updateLastActivity);
  return updateLastActivity;
}

/**
 * Hook to check session validity
 * Call this on app foreground or when needed
 */
export function useSessionValidator() {
  const checkSessionTimeout = useAuthStore((state) => state.checkSessionTimeout);
  const checkBackgroundTimeout = useAuthStore((state) => state.checkBackgroundTimeout);
  const lockSession = useAuthStore((state) => state.lockSession);
  
  return {
    checkSessionTimeout,
    checkBackgroundTimeout,
    lockSession,
  };
}
