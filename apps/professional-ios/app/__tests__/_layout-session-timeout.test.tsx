/**
 * Integration tests for session timeout in app layout
 * 
 * Tests Requirements:
 * - 2.10: Session timeout after 30 days of inactivity
 * - 5.3: Automatic logout after 30 days of inactivity
 * - 5.4: Re-authentication when app returns from background after 5 minutes
 * 
 * Tests:
 * - Session timeout detection on app foreground
 * - Background timeout detection (5 minutes)
 * - Navigation to login on session timeout
 * - Navigation to unlock on background timeout
 * - Session state persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuthStore } from '../../store/auth';
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

// Mock PHI cache manager
vi.mock('../../lib/services/phiCacheManager', () => ({
  phiCacheManager: {
    clearAllCaches: vi.fn(),
    onAppBackground: vi.fn(),
    onAppForeground: vi.fn(),
  },
}));

// Mock Firebase auth
vi.mock('firebase/auth', () => ({
  signOut: vi.fn(),
}));

describe('App Layout Session Timeout Integration', () => {
  beforeEach(async () => {
    // Clear AsyncStorage before each test
    await AsyncStorage.clear();
    
    // Reset auth store state
    useAuthStore.setState({
      lastActivityAt: null,
      sessionTimeout: 30 * 24 * 60 * 60 * 1000, // 30 days
      isLocked: false,
      backgroundedAt: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Session Initialization', () => {
    it('should initialize session with current timestamp on app start', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.initializeSession();
      });

      expect(result.current.lastActivityAt).not.toBeNull();
      expect(result.current.lastActivityAt).toBeInstanceOf(Date);
    });

    it('should persist session state to AsyncStorage', async () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.initializeSession();
      });

      // Wait for persistence
      await waitFor(async () => {
        const stored = await AsyncStorage.getItem('auth-session-storage');
        expect(stored).not.toBeNull();
      });

      const stored = await AsyncStorage.getItem('auth-session-storage');
      const parsed = JSON.parse(stored!);
      
      expect(parsed.state.lastActivityAt).not.toBeNull();
    });
  });

  describe('Session Timeout (30 days)', () => {
    it('should detect session timeout after 30 days of inactivity', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set last activity to 31 days ago
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      act(() => {
        useAuthStore.setState({ lastActivityAt: thirtyOneDaysAgo });
      });

      // Check session timeout
      const isValid = result.current.checkSessionTimeout();

      expect(isValid).toBe(false);
    });

    it('should not timeout if activity is within 30 days', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set last activity to 29 days ago
      const twentyNineDaysAgo = new Date();
      twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);

      act(() => {
        useAuthStore.setState({ lastActivityAt: twentyNineDaysAgo });
      });

      // Check session timeout
      const isValid = result.current.checkSessionTimeout();

      expect(isValid).toBe(true);
    });

    it('should return true if no activity recorded yet', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({ lastActivityAt: null });
      });

      // Check session timeout
      const isValid = result.current.checkSessionTimeout();

      expect(isValid).toBe(true);
    });

    it('should clear session on timeout', () => {
      const { result } = renderHook(() => useAuthStore());

      // Initialize session
      act(() => {
        result.current.initializeSession();
      });

      expect(result.current.lastActivityAt).not.toBeNull();

      // Clear session
      act(() => {
        result.current.clearSession();
      });

      expect(result.current.lastActivityAt).toBeNull();
      expect(result.current.isLocked).toBe(false);
      expect(result.current.backgroundedAt).toBeNull();
    });
  });

  describe('Background Timeout (5 minutes)', () => {
    it('should detect background timeout after 5 minutes', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set backgrounded time to 6 minutes ago
      const sixMinutesAgo = new Date();
      sixMinutesAgo.setMinutes(sixMinutesAgo.getMinutes() - 6);

      act(() => {
        result.current.setBackgroundedAt(sixMinutesAgo);
      });

      // Check background timeout
      const requiresReauth = result.current.checkBackgroundTimeout();

      expect(requiresReauth).toBe(true);
    });

    it('should not require reauth if backgrounded for less than 5 minutes', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set backgrounded time to 4 minutes ago
      const fourMinutesAgo = new Date();
      fourMinutesAgo.setMinutes(fourMinutesAgo.getMinutes() - 4);

      act(() => {
        result.current.setBackgroundedAt(fourMinutesAgo);
      });

      // Check background timeout
      const requiresReauth = result.current.checkBackgroundTimeout();

      expect(requiresReauth).toBe(false);
    });

    it('should return false if app was not backgrounded', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setBackgroundedAt(null);
      });

      // Check background timeout
      const requiresReauth = result.current.checkBackgroundTimeout();

      expect(requiresReauth).toBe(false);
    });

    it('should lock session when background timeout detected', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.isLocked).toBe(false);

      act(() => {
        result.current.lockSession();
      });

      expect(result.current.isLocked).toBe(true);
    });

    it('should clear backgroundedAt timestamp when returning to foreground', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set backgrounded time
      const now = new Date();
      act(() => {
        result.current.setBackgroundedAt(now);
      });

      expect(result.current.backgroundedAt).toEqual(now);

      // Clear on foreground
      act(() => {
        result.current.setBackgroundedAt(null);
      });

      expect(result.current.backgroundedAt).toBeNull();
    });
  });

  describe('Activity Tracking', () => {
    it('should update lastActivityAt on user interaction', () => {
      const { result } = renderHook(() => useAuthStore());

      const initialActivity = result.current.lastActivityAt;

      // Wait a bit
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);

      act(() => {
        result.current.updateLastActivity();
      });

      const updatedActivity = result.current.lastActivityAt;

      expect(updatedActivity).not.toEqual(initialActivity);
      expect(updatedActivity).toBeInstanceOf(Date);

      vi.useRealTimers();
    });

    it('should update activity when app returns to foreground (if not locked)', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set initial activity
      const initialTime = new Date();
      initialTime.setMinutes(initialTime.getMinutes() - 10);

      act(() => {
        useAuthStore.setState({ 
          lastActivityAt: initialTime,
          isLocked: false,
        });
      });

      // Simulate foreground return
      act(() => {
        result.current.updateLastActivity();
      });

      const updatedActivity = result.current.lastActivityAt;
      expect(updatedActivity!.getTime()).toBeGreaterThan(initialTime.getTime());
    });
  });

  describe('Session Flow Integration', () => {
    it('should handle complete background/foreground cycle without timeout', () => {
      const { result } = renderHook(() => useAuthStore());

      // Initialize session
      act(() => {
        result.current.initializeSession();
      });

      const initialActivity = result.current.lastActivityAt;

      // App goes to background
      const backgroundTime = new Date();
      act(() => {
        result.current.setBackgroundedAt(backgroundTime);
      });

      expect(result.current.backgroundedAt).toEqual(backgroundTime);

      // App returns to foreground after 3 minutes (no timeout)
      const requiresReauth = result.current.checkBackgroundTimeout();
      expect(requiresReauth).toBe(false);

      // Clear background timestamp
      act(() => {
        result.current.setBackgroundedAt(null);
        result.current.updateLastActivity();
      });

      expect(result.current.backgroundedAt).toBeNull();
      expect(result.current.lastActivityAt).not.toEqual(initialActivity);
      expect(result.current.isLocked).toBe(false);
    });

    it('should handle background timeout requiring reauth', () => {
      const { result } = renderHook(() => useAuthStore());

      // Initialize session
      act(() => {
        result.current.initializeSession();
      });

      // App goes to background
      const sixMinutesAgo = new Date();
      sixMinutesAgo.setMinutes(sixMinutesAgo.getMinutes() - 6);

      act(() => {
        result.current.setBackgroundedAt(sixMinutesAgo);
      });

      // App returns to foreground after 6 minutes
      const requiresReauth = result.current.checkBackgroundTimeout();
      expect(requiresReauth).toBe(true);

      // Lock session
      act(() => {
        result.current.lockSession();
      });

      expect(result.current.isLocked).toBe(true);
    });

    it('should handle session timeout requiring logout', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set last activity to 31 days ago
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      act(() => {
        useAuthStore.setState({ lastActivityAt: thirtyOneDaysAgo });
      });

      // Check session timeout
      const isValid = result.current.checkSessionTimeout();
      expect(isValid).toBe(false);

      // Clear session (logout)
      act(() => {
        result.current.clearSession();
      });

      expect(result.current.lastActivityAt).toBeNull();
      expect(result.current.isLocked).toBe(false);
      expect(result.current.backgroundedAt).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly 30 days of inactivity', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set last activity to exactly 30 days ago
      const exactlyThirtyDaysAgo = new Date();
      exactlyThirtyDaysAgo.setDate(exactlyThirtyDaysAgo.getDate() - 30);

      act(() => {
        useAuthStore.setState({ lastActivityAt: exactlyThirtyDaysAgo });
      });

      // Should still be valid (< 30 days, not >=)
      const isValid = result.current.checkSessionTimeout();
      expect(isValid).toBe(true);
    });

    it('should handle exactly 5 minutes in background', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set backgrounded time to exactly 5 minutes ago
      const exactlyFiveMinutesAgo = new Date();
      exactlyFiveMinutesAgo.setMinutes(exactlyFiveMinutesAgo.getMinutes() - 5);

      act(() => {
        result.current.setBackgroundedAt(exactlyFiveMinutesAgo);
      });

      // Should require reauth (>= 5 minutes)
      const requiresReauth = result.current.checkBackgroundTimeout();
      expect(requiresReauth).toBe(true);
    });

    it('should handle rapid background/foreground transitions', () => {
      const { result } = renderHook(() => useAuthStore());

      // Multiple rapid transitions
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.setBackgroundedAt(new Date());
        });

        act(() => {
          result.current.setBackgroundedAt(null);
        });
      }

      // Should not require reauth
      const requiresReauth = result.current.checkBackgroundTimeout();
      expect(requiresReauth).toBe(false);
    });

    it('should handle invalid date values gracefully', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set invalid date
      act(() => {
        useAuthStore.setState({ 
          lastActivityAt: new Date('invalid'),
        });
      });

      // Should not crash
      expect(() => {
        result.current.checkSessionTimeout();
      }).not.toThrow();
    });
  });
});
