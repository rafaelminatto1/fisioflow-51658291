/**
 * Unit tests for Auth Store with Session Management
 * 
 * Tests:
 * - Session timeout detection (30 days)
 * - Background timeout detection (5 minutes)
 * - Session locking and unlocking
 * - Activity tracking
 * - Session clearing
 * 
 * Requirements: 2.10, 5.3, 5.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore, unlockSessionWithPIN } from '../auth';
import { biometricAuthService } from '../../lib/services/biometricAuthService';
import { encryptionService } from '../../lib/services/encryptionService';
import { signOut as firebaseSignOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    getAllKeys: vi.fn(),
    multiRemove: vi.fn(),
  },
}));

// Mock biometric auth service
vi.mock('../../lib/services/biometricAuthService', () => ({
  biometricAuthService: {
    isEnabled: vi.fn(),
    authenticate: vi.fn(),
    getConfig: vi.fn(),
    verifyPIN: vi.fn(),
    clearBiometricData: vi.fn(),
  },
}));

// Mock encryption service
vi.mock('../../lib/services/encryptionService', () => ({
  encryptionService: {
    clearKeys: vi.fn(),
  },
}));

// Mock Firebase auth
vi.mock('../../lib/firebase', () => ({
  auth: {},
}));

vi.mock('firebase/auth', () => ({
  signOut: vi.fn(),
}));

// Mock cache manager
vi.mock('../../lib/offline/cacheManager', () => ({
  getCacheManager: vi.fn().mockResolvedValue({
    clear: vi.fn(),
  }),
}));

// Mock sync manager
vi.mock('../../lib/offline/syncManager', () => ({
  getSyncManager: vi.fn().mockReturnValue({
    clearQueue: vi.fn(),
  }),
}));

describe('Auth Store - Session Management', () => {
  beforeEach(() => {
    // Clear store state before each test
    useAuthStore.setState({
      lastActivityAt: null,
      sessionTimeout: 30 * 24 * 60 * 60 * 1000, // 30 days
      isLocked: false,
      backgroundedAt: null,
    });

    // Clear mocks
    vi.clearAllMocks();
  });

  describe('updateLastActivity', () => {
    it('should update lastActivityAt timestamp', () => {
      const store = useAuthStore.getState();
      const beforeUpdate = new Date();

      store.updateLastActivity();

      const afterUpdate = useAuthStore.getState().lastActivityAt;
      expect(afterUpdate).not.toBeNull();
      expect(new Date(afterUpdate!).getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('should update timestamp on multiple calls', async () => {
      const store = useAuthStore.getState();

      store.updateLastActivity();
      const firstUpdate = useAuthStore.getState().lastActivityAt;

      // Wait a bit using a promise
      await new Promise(resolve => setTimeout(resolve, 10));

      store.updateLastActivity();
      const secondUpdate = useAuthStore.getState().lastActivityAt;

      expect(new Date(secondUpdate!).getTime()).toBeGreaterThanOrEqual(new Date(firstUpdate!).getTime());
    });
  });

  describe('checkSessionTimeout', () => {
    it('should return true for valid session (within 30 days)', () => {
      // Set activity to 1 day ago
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      useAuthStore.setState({ lastActivityAt: oneDayAgo });

      const isValid = useAuthStore.getState().checkSessionTimeout();
      expect(isValid).toBe(true);
    });

    it('should return false for expired session (over 30 days)', () => {
      // Set activity to 31 days ago
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      useAuthStore.setState({ lastActivityAt: thirtyOneDaysAgo });

      const isValid = useAuthStore.getState().checkSessionTimeout();
      expect(isValid).toBe(false);
    });

    it('should return true when no activity recorded yet', () => {
      useAuthStore.setState({ lastActivityAt: null });

      const isValid = useAuthStore.getState().checkSessionTimeout();
      expect(isValid).toBe(true);
    });

    it('should return false exactly at 30 days', () => {
      // Set activity to exactly 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      useAuthStore.setState({ lastActivityAt: thirtyDaysAgo });

      const isValid = useAuthStore.getState().checkSessionTimeout();
      expect(isValid).toBe(false);
    });
  });

  describe('checkBackgroundTimeout', () => {
    it('should return false when app was not backgrounded', () => {
      useAuthStore.setState({ backgroundedAt: null });

      const requiresReauth = useAuthStore.getState().checkBackgroundTimeout();
      expect(requiresReauth).toBe(false);
    });

    it('should return false when backgrounded for less than 5 minutes', () => {
      // Set backgrounded to 2 minutes ago
      const twoMinutesAgo = new Date();
      twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);

      useAuthStore.setState({ backgroundedAt: twoMinutesAgo });

      const requiresReauth = useAuthStore.getState().checkBackgroundTimeout();
      expect(requiresReauth).toBe(false);
    });

    it('should return true when backgrounded for more than 5 minutes', () => {
      // Set backgrounded to 6 minutes ago
      const sixMinutesAgo = new Date();
      sixMinutesAgo.setMinutes(sixMinutesAgo.getMinutes() - 6);

      useAuthStore.setState({ backgroundedAt: sixMinutesAgo });

      const requiresReauth = useAuthStore.getState().checkBackgroundTimeout();
      expect(requiresReauth).toBe(true);
    });

    it('should return true exactly at 5 minutes', () => {
      // Set backgrounded to exactly 5 minutes ago
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      useAuthStore.setState({ backgroundedAt: fiveMinutesAgo });

      const requiresReauth = useAuthStore.getState().checkBackgroundTimeout();
      expect(requiresReauth).toBe(true);
    });
  });

  describe('lockSession', () => {
    it('should set isLocked to true', () => {
      const store = useAuthStore.getState();
      store.lockSession();

      expect(useAuthStore.getState().isLocked).toBe(true);
    });

    it('should remain locked after multiple calls', () => {
      const store = useAuthStore.getState();
      store.lockSession();
      store.lockSession();

      expect(useAuthStore.getState().isLocked).toBe(true);
    });
  });

  describe('unlockSession', () => {
    it('should unlock with successful biometric authentication', async () => {
      const userId = 'test-user-123';

      // Mock biometric enabled and successful
      vi.mocked(biometricAuthService.isEnabled).mockResolvedValue(true);
      vi.mocked(biometricAuthService.authenticate).mockResolvedValue(true);

      // Lock session first
      useAuthStore.getState().lockSession();
      expect(useAuthStore.getState().isLocked).toBe(true);

      // Unlock with biometric
      const unlocked = await useAuthStore.getState().unlockSession(userId);

      expect(unlocked).toBe(true);
      expect(useAuthStore.getState().isLocked).toBe(false);
      expect(useAuthStore.getState().lastActivityAt).not.toBeNull();
      expect(useAuthStore.getState().backgroundedAt).toBeNull();
    });

    it('should return false when biometric fails and no PIN fallback', async () => {
      const userId = 'test-user-123';

      // Mock biometric enabled but failed, no PIN fallback
      vi.mocked(biometricAuthService.isEnabled).mockResolvedValue(true);
      vi.mocked(biometricAuthService.authenticate).mockResolvedValue(false);
      vi.mocked(biometricAuthService.getConfig).mockResolvedValue({
        userId,
        enabled: true,
        type: 'faceId',
        fallbackEnabled: false,
        requireOnLaunch: true,
        requireAfterBackground: true,
        backgroundTimeout: 300,
        failedAttempts: 0,
      });

      // Lock session first
      useAuthStore.getState().lockSession();

      // Try to unlock
      const unlocked = await useAuthStore.getState().unlockSession(userId);

      expect(unlocked).toBe(false);
      expect(useAuthStore.getState().isLocked).toBe(true);
    });

    it('should return false when biometric fails with PIN fallback available', async () => {
      const userId = 'test-user-123';

      // Mock biometric enabled but failed, PIN fallback available
      vi.mocked(biometricAuthService.isEnabled).mockResolvedValue(true);
      vi.mocked(biometricAuthService.authenticate).mockResolvedValue(false);
      vi.mocked(biometricAuthService.getConfig).mockResolvedValue({
        userId,
        enabled: true,
        type: 'faceId',
        fallbackEnabled: true,
        requireOnLaunch: true,
        requireAfterBackground: true,
        backgroundTimeout: 300,
        failedAttempts: 0,
      });

      // Lock session first
      useAuthStore.getState().lockSession();

      // Try to unlock (should return false to indicate PIN needed)
      const unlocked = await useAuthStore.getState().unlockSession(userId);

      expect(unlocked).toBe(false);
      expect(useAuthStore.getState().isLocked).toBe(true);
    });

    it('should return false when biometric not enabled', async () => {
      const userId = 'test-user-123';

      // Mock biometric not enabled
      vi.mocked(biometricAuthService.isEnabled).mockResolvedValue(false);

      // Lock session first
      useAuthStore.getState().lockSession();

      // Try to unlock
      const unlocked = await useAuthStore.getState().unlockSession(userId);

      expect(unlocked).toBe(false);
      expect(useAuthStore.getState().isLocked).toBe(true);
    });
  });

  describe('unlockSessionWithPIN', () => {
    it('should unlock with correct PIN', async () => {
      const userId = 'test-user-123';
      const pin = '123456';

      // Mock PIN verification success
      vi.mocked(biometricAuthService.verifyPIN).mockResolvedValue(true);

      // Lock session first
      useAuthStore.getState().lockSession();

      const unlocked = await unlockSessionWithPIN(userId, pin);

      expect(unlocked).toBe(true);
      expect(useAuthStore.getState().isLocked).toBe(false);
      expect(useAuthStore.getState().lastActivityAt).not.toBeNull();
      expect(useAuthStore.getState().backgroundedAt).toBeNull();
    });

    it('should not unlock with incorrect PIN', async () => {
      const userId = 'test-user-123';
      const pin = '000000';

      // Mock PIN verification failure
      vi.mocked(biometricAuthService.verifyPIN).mockResolvedValue(false);

      // Lock session first
      useAuthStore.getState().lockSession();

      const unlocked = await unlockSessionWithPIN(userId, pin);

      expect(unlocked).toBe(false);
      expect(useAuthStore.getState().isLocked).toBe(true);
    });

    it('should handle PIN verification errors', async () => {
      const userId = 'test-user-123';
      const pin = '123456';

      // Mock PIN verification error
      vi.mocked(biometricAuthService.verifyPIN).mockRejectedValue(
        new Error('Account locked')
      );

      // Lock session first
      useAuthStore.getState().lockSession();

      const unlocked = await unlockSessionWithPIN(userId, pin);

      expect(unlocked).toBe(false);
      expect(useAuthStore.getState().isLocked).toBe(true);
    });
  });

  describe('setBackgroundedAt', () => {
    it('should set backgroundedAt timestamp', () => {
      const now = new Date();
      useAuthStore.getState().setBackgroundedAt(now);

      expect(useAuthStore.getState().backgroundedAt).toEqual(now);
    });

    it('should clear backgroundedAt when set to null', () => {
      const now = new Date();
      useAuthStore.getState().setBackgroundedAt(now);
      expect(useAuthStore.getState().backgroundedAt).toEqual(now);

      useAuthStore.getState().setBackgroundedAt(null);
      expect(useAuthStore.getState().backgroundedAt).toBeNull();
    });
  });

  describe('clearSession', () => {
    it('should clear all session data', () => {
      // Set some session data
      useAuthStore.getState().updateLastActivity();
      useAuthStore.getState().lockSession();
      useAuthStore.getState().setBackgroundedAt(new Date());

      expect(useAuthStore.getState().lastActivityAt).not.toBeNull();
      expect(useAuthStore.getState().isLocked).toBe(true);
      expect(useAuthStore.getState().backgroundedAt).not.toBeNull();

      // Clear session
      useAuthStore.getState().clearSession();

      expect(useAuthStore.getState().lastActivityAt).toBeNull();
      expect(useAuthStore.getState().isLocked).toBe(false);
      expect(useAuthStore.getState().backgroundedAt).toBeNull();
    });
  });

  describe('initializeSession', () => {
    it('should set initial lastActivityAt timestamp', () => {
      const beforeInit = new Date();
      useAuthStore.getState().initializeSession();

      const afterInit = useAuthStore.getState().lastActivityAt;
      expect(afterInit).not.toBeNull();
      expect(new Date(afterInit!).getTime()).toBeGreaterThanOrEqual(beforeInit.getTime());
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete session lifecycle', async () => {
      const userId = 'test-user-123';

      // Initialize session
      useAuthStore.getState().initializeSession();
      expect(useAuthStore.getState().lastActivityAt).not.toBeNull();
      expect(useAuthStore.getState().isLocked).toBe(false);

      // Simulate user activity
      useAuthStore.getState().updateLastActivity();

      // Simulate app backgrounding 6 minutes ago
      const sixMinutesAgo = new Date();
      sixMinutesAgo.setMinutes(sixMinutesAgo.getMinutes() - 6);
      useAuthStore.getState().setBackgroundedAt(sixMinutesAgo);

      // Check if re-authentication required
      const requiresReauth = useAuthStore.getState().checkBackgroundTimeout();
      expect(requiresReauth).toBe(true);

      // Lock session
      useAuthStore.getState().lockSession();
      expect(useAuthStore.getState().isLocked).toBe(true);

      // Mock successful biometric unlock
      vi.mocked(biometricAuthService.isEnabled).mockResolvedValue(true);
      vi.mocked(biometricAuthService.authenticate).mockResolvedValue(true);

      // Unlock session
      const unlocked = await useAuthStore.getState().unlockSession(userId);
      expect(unlocked).toBe(true);
      expect(useAuthStore.getState().isLocked).toBe(false);

      // Clear session on logout
      useAuthStore.getState().clearSession();
      expect(useAuthStore.getState().lastActivityAt).toBeNull();
      expect(useAuthStore.getState().isLocked).toBe(false);
    });

    it('should auto-logout after 30 days of inactivity', () => {
      // Set activity to 31 days ago
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      useAuthStore.setState({ lastActivityAt: thirtyOneDaysAgo });

      // Check session validity
      const isValid = useAuthStore.getState().checkSessionTimeout();
      expect(isValid).toBe(false);

      // App should trigger logout when session is invalid
      // This would be handled by the app layout component
    });
  });

  describe('logout', () => {
    const userId = 'test-user-123';

    beforeEach(() => {
      // Reset all mocks before each test
      vi.clearAllMocks();
      
      // Setup default mock implementations
      vi.mocked(encryptionService.clearKeys).mockResolvedValue(undefined);
      vi.mocked(biometricAuthService.clearBiometricData).mockResolvedValue(undefined);
      vi.mocked(firebaseSignOut).mockResolvedValue(undefined);
      vi.mocked(AsyncStorage.getAllKeys).mockResolvedValue([]);
      vi.mocked(AsyncStorage.multiRemove).mockResolvedValue(undefined);
    });

    it('should clear encryption keys from SecureStore', async () => {
      await useAuthStore.getState().logout(userId);

      expect(encryptionService.clearKeys).toHaveBeenCalledWith(userId);
      expect(encryptionService.clearKeys).toHaveBeenCalledTimes(1);
    });

    it('should clear biometric authentication data', async () => {
      await useAuthStore.getState().logout(userId);

      expect(biometricAuthService.clearBiometricData).toHaveBeenCalledWith(userId);
      expect(biometricAuthService.clearBiometricData).toHaveBeenCalledTimes(1);
    });

    it('should clear all cached PHI from AsyncStorage', async () => {
      const { getCacheManager } = await import('../../lib/offline/cacheManager');
      const mockCacheManager = await getCacheManager();

      await useAuthStore.getState().logout(userId);

      expect(getCacheManager).toHaveBeenCalled();
      expect(mockCacheManager.clear).toHaveBeenCalled();
    });

    it('should clear sync queue', async () => {
      const { getSyncManager } = await import('../../lib/offline/syncManager');
      const mockSyncManager = getSyncManager();

      await useAuthStore.getState().logout(userId);

      expect(getSyncManager).toHaveBeenCalled();
      expect(mockSyncManager.clearQueue).toHaveBeenCalled();
    });

    it('should clear session state', async () => {
      // Set some session data
      useAuthStore.getState().updateLastActivity();
      useAuthStore.getState().lockSession();
      useAuthStore.getState().setBackgroundedAt(new Date());

      await useAuthStore.getState().logout(userId);

      const state = useAuthStore.getState();
      expect(state.lastActivityAt).toBeNull();
      expect(state.isLocked).toBe(false);
      expect(state.backgroundedAt).toBeNull();
    });

    it('should invalidate Firebase Auth token', async () => {
      await useAuthStore.getState().logout(userId);

      expect(firebaseSignOut).toHaveBeenCalled();
      expect(firebaseSignOut).toHaveBeenCalledTimes(1);
    });

    it('should clear auth-related AsyncStorage items', async () => {
      const mockKeys = [
        'auth-session-storage',
        'user-profile',
        'auth-token',
        'session-data',
        'other-data',
      ];

      vi.mocked(AsyncStorage.getAllKeys).mockResolvedValue(mockKeys);

      await useAuthStore.getState().logout(userId);

      expect(AsyncStorage.getAllKeys).toHaveBeenCalled();
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'auth-session-storage',
        'user-profile',
        'auth-token',
        'session-data',
      ]);
    });

    it('should continue logout even if encryption key clearing fails', async () => {
      vi.mocked(encryptionService.clearKeys).mockRejectedValue(
        new Error('Failed to clear keys')
      );

      // Should not throw
      await expect(useAuthStore.getState().logout(userId)).resolves.not.toThrow();

      // Should still clear other data
      expect(biometricAuthService.clearBiometricData).toHaveBeenCalled();
      expect(firebaseSignOut).toHaveBeenCalled();
    });

    it('should continue logout even if biometric data clearing fails', async () => {
      vi.mocked(biometricAuthService.clearBiometricData).mockRejectedValue(
        new Error('Failed to clear biometric data')
      );

      // Should not throw
      await expect(useAuthStore.getState().logout(userId)).resolves.not.toThrow();

      // Should still clear other data
      expect(encryptionService.clearKeys).toHaveBeenCalled();
      expect(firebaseSignOut).toHaveBeenCalled();
    });

    it('should continue logout even if cache clearing fails', async () => {
      const { getCacheManager } = await import('../../lib/offline/cacheManager');
      vi.mocked(getCacheManager).mockRejectedValue(
        new Error('Failed to get cache manager')
      );

      // Should not throw
      await expect(useAuthStore.getState().logout(userId)).resolves.not.toThrow();

      // Should still clear other data
      expect(encryptionService.clearKeys).toHaveBeenCalled();
      expect(firebaseSignOut).toHaveBeenCalled();
    });

    it('should continue logout even if Firebase signOut fails', async () => {
      vi.mocked(firebaseSignOut).mockRejectedValue(
        new Error('Network error')
      );

      // Should not throw
      await expect(useAuthStore.getState().logout(userId)).resolves.not.toThrow();

      // Should still clear local data
      expect(encryptionService.clearKeys).toHaveBeenCalled();
      expect(biometricAuthService.clearBiometricData).toHaveBeenCalled();
    });

    it('should clear session state even if logout fails completely', async () => {
      // Make everything fail
      vi.mocked(encryptionService.clearKeys).mockRejectedValue(new Error('Fail'));
      vi.mocked(biometricAuthService.clearBiometricData).mockRejectedValue(new Error('Fail'));
      vi.mocked(firebaseSignOut).mockRejectedValue(new Error('Fail'));

      // Set some session data
      useAuthStore.getState().updateLastActivity();
      useAuthStore.getState().lockSession();

      try {
        await useAuthStore.getState().logout(userId);
      } catch {
        // Ignore error
      }

      // Session should still be cleared
      const state = useAuthStore.getState();
      expect(state.lastActivityAt).toBeNull();
      expect(state.isLocked).toBe(false);
    });

    it('should execute all logout steps in correct order', async () => {
      const callOrder: string[] = [];

      vi.mocked(encryptionService.clearKeys).mockImplementation(async () => {
        callOrder.push('encryption');
      });

      vi.mocked(biometricAuthService.clearBiometricData).mockImplementation(async () => {
        callOrder.push('biometric');
      });

      // Setup cache manager mock properly
      const mockCacheManager = {
        clear: vi.fn().mockImplementation(async () => {
          callOrder.push('cache');
        }),
      };
      
      const { getCacheManager } = await import('../../lib/offline/cacheManager');
      vi.mocked(getCacheManager).mockResolvedValue(mockCacheManager as any);

      // Setup sync manager mock properly
      const mockSyncManager = {
        clearQueue: vi.fn().mockImplementation(async () => {
          callOrder.push('sync');
        }),
      };
      
      const { getSyncManager } = await import('../../lib/offline/syncManager');
      vi.mocked(getSyncManager).mockReturnValue(mockSyncManager as any);

      vi.mocked(firebaseSignOut).mockImplementation(async () => {
        callOrder.push('firebase');
      });

      await useAuthStore.getState().logout(userId);

      // Verify order: encryption -> biometric -> cache -> sync -> session -> firebase
      expect(callOrder).toEqual(['encryption', 'biometric', 'cache', 'sync', 'firebase']);
    });

    it('should handle logout with no AsyncStorage keys to clear', async () => {
      vi.mocked(AsyncStorage.getAllKeys).mockResolvedValue([]);

      await useAuthStore.getState().logout(userId);

      expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
    });

    it('should only clear auth-related AsyncStorage keys', async () => {
      const mockKeys = [
        'cache_patients',
        'cache_appointments',
        'some_other_data',
      ];

      vi.mocked(AsyncStorage.getAllKeys).mockResolvedValue(mockKeys);

      await useAuthStore.getState().logout(userId);

      // Should not call multiRemove since no auth-related keys
      expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
    });
  });
});
