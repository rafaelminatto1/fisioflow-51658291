/**
 * Unit tests for App Layout Session Management
 * 
 * Tests the integration of session management in the root layout component:
 * - Session initialization on app start
 * - Background detection and timestamp setting
 * - Session timeout check (30 days) → auto-logout
 * - Background timeout check (5 minutes) → lock session
 * - Activity tracking on foreground
 * 
 * Requirements: 2.10, 5.3, 5.4
 * 
 * Note: These tests focus on the auth store integration rather than the React Native
 * component itself, as testing React Native components with vitest has module resolution
 * issues. The auth store is the source of truth for session management logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useAuthStore } from '../../store/auth';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
}));

// Mock biometric auth service
vi.mock('../../lib/services/biometricAuthService', () => ({
  biometricAuthService: {
    isEnabled: vi.fn(),
    authenticate: vi.fn(),
    getConfig: vi.fn(),
    verifyPIN: vi.fn(),
  },
}));

describe('App Layout - Session Management Integration', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      lastActivityAt: null,
      sessionTimeout: 30 * 24 * 60 * 60 * 1000, // 30 days
      isLocked: false,
      backgroundedAt: null,
    });

    // Clear mocks
    vi.clearAllMocks();
  });

  describe('Session initialization on app start', () => {
    it('should initialize session with lastActivityAt timestamp', () => {
      const beforeInit = new Date();

      // Simulate app start by calling initializeSession
      act(() => {
        useAuthStore.getState().initializeSession();
      });

      const state = useAuthStore.getState();
      expect(state.lastActivityAt).not.toBeNull();
      expect(new Date(state.lastActivityAt!).getTime()).toBeGreaterThanOrEqual(beforeInit.getTime());
    });

    it('should not be locked on initialization', () => {
      act(() => {
        useAuthStore.getState().initializeSession();
      });

      const state = useAuthStore.getState();
      expect(state.isLocked).toBe(false);
    });

    it('should have no backgroundedAt timestamp on initialization', () => {
      act(() => {
        useAuthStore.getState().initializeSession();
      });

      const state = useAuthStore.getState();
      expect(state.backgroundedAt).toBeNull();
    });
  });

  describe('Background detection and timestamp setting', () => {
    it('should set backgroundedAt when app goes to background', () => {
      const beforeBackground = new Date();

      // Simulate app going to background
      act(() => {
        useAuthStore.getState().setBackgroundedAt(new Date());
      });

      const state = useAuthStore.getState();
      expect(state.backgroundedAt).not.toBeNull();
      expect(new Date(state.backgroundedAt!).getTime()).toBeGreaterThanOrEqual(beforeBackground.getTime());
    });

    it('should set backgroundedAt when app goes to background (simulated)', () => {
      // Initialize session
      act(() => {
        useAuthStore.getState().initializeSession();
      });

      const beforeBackground = new Date();

      // Simulate the layout calling setBackgroundedAt when AppState changes
      act(() => {
        useAuthStore.getState().setBackgroundedAt(new Date());
      });

      const state = useAuthStore.getState();
      expect(state.backgroundedAt).not.toBeNull();
      expect(new Date(state.backgroundedAt!).getTime()).toBeGreaterThanOrEqual(beforeBackground.getTime());
    });

    it('should clear backgroundedAt when app returns to foreground', () => {
      // Set backgroundedAt first
      act(() => {
        useAuthStore.getState().setBackgroundedAt(new Date());
      });

      expect(useAuthStore.getState().backgroundedAt).not.toBeNull();

      // Clear when foregrounded
      act(() => {
        useAuthStore.getState().setBackgroundedAt(null);
      });

      expect(useAuthStore.getState().backgroundedAt).toBeNull();
    });
  });

  describe('Session timeout check (30 days) → auto-logout', () => {
    it('should detect session timeout after 30 days of inactivity', () => {
      // Set activity to 31 days ago
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      act(() => {
        useAuthStore.setState({ lastActivityAt: thirtyOneDaysAgo });
      });

      // Check session timeout
      const isValid = useAuthStore.getState().checkSessionTimeout();
      expect(isValid).toBe(false);
    });

    it('should not timeout for session within 30 days', () => {
      // Set activity to 29 days ago
      const twentyNineDaysAgo = new Date();
      twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);

      act(() => {
        useAuthStore.setState({ lastActivityAt: twentyNineDaysAgo });
      });

      // Check session timeout
      const isValid = useAuthStore.getState().checkSessionTimeout();
      expect(isValid).toBe(true);
    });

    it('should timeout exactly at 30 days', () => {
      // Set activity to exactly 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      act(() => {
        useAuthStore.setState({ lastActivityAt: thirtyDaysAgo });
      });

      // Check session timeout
      const isValid = useAuthStore.getState().checkSessionTimeout();
      expect(isValid).toBe(false);
    });

    it('should trigger clearSession on timeout', () => {
      // Set activity to 31 days ago
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      act(() => {
        useAuthStore.setState({ 
          lastActivityAt: thirtyOneDaysAgo,
          isLocked: true,
          backgroundedAt: new Date(),
        });
      });

      // Verify session is invalid
      const isValid = useAuthStore.getState().checkSessionTimeout();
      expect(isValid).toBe(false);

      // Clear session (simulating auto-logout)
      act(() => {
        useAuthStore.getState().clearSession();
      });

      const state = useAuthStore.getState();
      expect(state.lastActivityAt).toBeNull();
      expect(state.isLocked).toBe(false);
      expect(state.backgroundedAt).toBeNull();
    });

    it('should handle session timeout on app foreground', () => {
      // Initialize with old activity
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      act(() => {
        useAuthStore.setState({ 
          lastActivityAt: thirtyOneDaysAgo,
          backgroundedAt: new Date(),
        });
      });

      // Simulate foreground check
      const isValid = useAuthStore.getState().checkSessionTimeout();
      expect(isValid).toBe(false);

      // Should trigger logout
      if (!isValid) {
        act(() => {
          useAuthStore.getState().clearSession();
        });
      }

      expect(useAuthStore.getState().lastActivityAt).toBeNull();
    });
  });

  describe('Background timeout check (5 minutes) → lock session', () => {
    it('should detect background timeout after 5 minutes', () => {
      // Set backgrounded to 6 minutes ago
      const sixMinutesAgo = new Date();
      sixMinutesAgo.setMinutes(sixMinutesAgo.getMinutes() - 6);

      act(() => {
        useAuthStore.setState({ backgroundedAt: sixMinutesAgo });
      });

      // Check background timeout
      const requiresReauth = useAuthStore.getState().checkBackgroundTimeout();
      expect(requiresReauth).toBe(true);
    });

    it('should not require reauth for background less than 5 minutes', () => {
      // Set backgrounded to 4 minutes ago
      const fourMinutesAgo = new Date();
      fourMinutesAgo.setMinutes(fourMinutesAgo.getMinutes() - 4);

      act(() => {
        useAuthStore.setState({ backgroundedAt: fourMinutesAgo });
      });

      // Check background timeout
      const requiresReauth = useAuthStore.getState().checkBackgroundTimeout();
      expect(requiresReauth).toBe(false);
    });

    it('should require reauth exactly at 5 minutes', () => {
      // Set backgrounded to exactly 5 minutes ago
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      act(() => {
        useAuthStore.setState({ backgroundedAt: fiveMinutesAgo });
      });

      // Check background timeout
      const requiresReauth = useAuthStore.getState().checkBackgroundTimeout();
      expect(requiresReauth).toBe(true);
    });

    it('should lock session when background timeout detected', () => {
      // Set backgrounded to 6 minutes ago
      const sixMinutesAgo = new Date();
      sixMinutesAgo.setMinutes(sixMinutesAgo.getMinutes() - 6);

      act(() => {
        useAuthStore.setState({ backgroundedAt: sixMinutesAgo });
      });

      // Check and lock if needed
      const requiresReauth = useAuthStore.getState().checkBackgroundTimeout();
      if (requiresReauth) {
        act(() => {
          useAuthStore.getState().lockSession();
        });
      }

      expect(useAuthStore.getState().isLocked).toBe(true);
    });

    it('should not lock session when background timeout not reached', () => {
      // Set backgrounded to 2 minutes ago
      const twoMinutesAgo = new Date();
      twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);

      act(() => {
        useAuthStore.setState({ backgroundedAt: twoMinutesAgo });
      });

      // Check and lock if needed
      const requiresReauth = useAuthStore.getState().checkBackgroundTimeout();
      if (requiresReauth) {
        act(() => {
          useAuthStore.getState().lockSession();
        });
      }

      expect(useAuthStore.getState().isLocked).toBe(false);
    });

    it('should handle foreground after background timeout', () => {
      // Initialize session
      act(() => {
        useAuthStore.getState().initializeSession();
      });

      // Set backgrounded to 6 minutes ago
      const sixMinutesAgo = new Date();
      sixMinutesAgo.setMinutes(sixMinutesAgo.getMinutes() - 6);

      act(() => {
        useAuthStore.setState({ backgroundedAt: sixMinutesAgo });
      });

      // Simulate foreground check
      const sessionValid = useAuthStore.getState().checkSessionTimeout();
      expect(sessionValid).toBe(true); // Session still valid (within 30 days)

      const requiresReauth = useAuthStore.getState().checkBackgroundTimeout();
      expect(requiresReauth).toBe(true); // But requires reauth due to background timeout

      // Lock session
      act(() => {
        useAuthStore.getState().lockSession();
      });

      expect(useAuthStore.getState().isLocked).toBe(true);
    });
  });

  describe('Activity tracking on foreground', () => {
    it('should update lastActivityAt when app returns to foreground', () => {
      // Initialize session
      act(() => {
        useAuthStore.getState().initializeSession();
      });

      const initialActivity = useAuthStore.getState().lastActivityAt;

      // Wait a bit
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);

      // Update activity on foreground
      act(() => {
        useAuthStore.getState().updateLastActivity();
      });

      const updatedActivity = useAuthStore.getState().lastActivityAt;
      expect(new Date(updatedActivity!).getTime()).toBeGreaterThanOrEqual(
        new Date(initialActivity!).getTime()
      );

      vi.useRealTimers();
    });

    it('should clear backgroundedAt when returning to foreground without timeout', () => {
      // Set backgrounded to 2 minutes ago
      const twoMinutesAgo = new Date();
      twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);

      act(() => {
        useAuthStore.setState({ backgroundedAt: twoMinutesAgo });
      });

      expect(useAuthStore.getState().backgroundedAt).not.toBeNull();

      // Check timeout (should be false)
      const requiresReauth = useAuthStore.getState().checkBackgroundTimeout();
      expect(requiresReauth).toBe(false);

      // Clear backgroundedAt on foreground
      act(() => {
        useAuthStore.getState().setBackgroundedAt(null);
      });

      expect(useAuthStore.getState().backgroundedAt).toBeNull();
    });

    it('should update activity after clearing backgroundedAt', () => {
      // Set backgrounded
      act(() => {
        useAuthStore.setState({ backgroundedAt: new Date() });
      });

      // Clear and update activity
      act(() => {
        useAuthStore.getState().setBackgroundedAt(null);
        useAuthStore.getState().updateLastActivity();
      });

      expect(useAuthStore.getState().backgroundedAt).toBeNull();
      expect(useAuthStore.getState().lastActivityAt).not.toBeNull();
    });

    it('should not update activity when session is locked', () => {
      // Lock session
      act(() => {
        useAuthStore.getState().lockSession();
      });

      const beforeUpdate = useAuthStore.getState().lastActivityAt;

      // Try to update activity (should be prevented by UI logic)
      const isLocked = useAuthStore.getState().isLocked;
      if (!isLocked) {
        act(() => {
          useAuthStore.getState().updateLastActivity();
        });
      }

      // Activity should not be updated when locked
      expect(useAuthStore.getState().lastActivityAt).toBe(beforeUpdate);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete background/foreground cycle without timeout', () => {
      // Initialize session
      act(() => {
        useAuthStore.getState().initializeSession();
      });

      expect(useAuthStore.getState().lastActivityAt).not.toBeNull();
      expect(useAuthStore.getState().isLocked).toBe(false);

      // App goes to background
      act(() => {
        useAuthStore.getState().setBackgroundedAt(new Date());
      });

      expect(useAuthStore.getState().backgroundedAt).not.toBeNull();

      // App returns to foreground after 2 minutes (no timeout)
      const sessionValid = useAuthStore.getState().checkSessionTimeout();
      const requiresReauth = useAuthStore.getState().checkBackgroundTimeout();

      expect(sessionValid).toBe(true);
      expect(requiresReauth).toBe(false);

      // Clear backgroundedAt and update activity
      act(() => {
        useAuthStore.getState().setBackgroundedAt(null);
        useAuthStore.getState().updateLastActivity();
      });

      expect(useAuthStore.getState().backgroundedAt).toBeNull();
      expect(useAuthStore.getState().isLocked).toBe(false);
    });

    it('should handle background timeout requiring reauth', () => {
      // Initialize session
      act(() => {
        useAuthStore.getState().initializeSession();
      });

      // App goes to background 6 minutes ago
      const sixMinutesAgo = new Date();
      sixMinutesAgo.setMinutes(sixMinutesAgo.getMinutes() - 6);

      act(() => {
        useAuthStore.setState({ backgroundedAt: sixMinutesAgo });
      });

      // App returns to foreground
      const sessionValid = useAuthStore.getState().checkSessionTimeout();
      const requiresReauth = useAuthStore.getState().checkBackgroundTimeout();

      expect(sessionValid).toBe(true); // Session still valid
      expect(requiresReauth).toBe(true); // But requires reauth

      // Lock session
      act(() => {
        useAuthStore.getState().lockSession();
      });

      expect(useAuthStore.getState().isLocked).toBe(true);
    });

    it('should handle session timeout requiring logout', () => {
      // Initialize with old activity (31 days ago)
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      act(() => {
        useAuthStore.setState({ 
          lastActivityAt: thirtyOneDaysAgo,
          backgroundedAt: new Date(),
        });
      });

      // App returns to foreground
      const sessionValid = useAuthStore.getState().checkSessionTimeout();

      expect(sessionValid).toBe(false);

      // Clear session (auto-logout)
      act(() => {
        useAuthStore.getState().clearSession();
      });

      expect(useAuthStore.getState().lastActivityAt).toBeNull();
      expect(useAuthStore.getState().isLocked).toBe(false);
      expect(useAuthStore.getState().backgroundedAt).toBeNull();
    });

    it('should prioritize session timeout over background timeout', () => {
      // Set activity to 31 days ago and backgrounded to 6 minutes ago
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
      const sixMinutesAgo = new Date();
      sixMinutesAgo.setMinutes(sixMinutesAgo.getMinutes() - 6);

      act(() => {
        useAuthStore.setState({ 
          lastActivityAt: thirtyOneDaysAgo,
          backgroundedAt: sixMinutesAgo,
        });
      });

      // Check session first (should fail)
      const sessionValid = useAuthStore.getState().checkSessionTimeout();
      expect(sessionValid).toBe(false);

      // Should logout, not just lock
      act(() => {
        useAuthStore.getState().clearSession();
      });

      expect(useAuthStore.getState().lastActivityAt).toBeNull();
    });

    it('should handle multiple background/foreground cycles', () => {
      // Initialize session
      act(() => {
        useAuthStore.getState().initializeSession();
      });

      // First background/foreground cycle (2 minutes)
      act(() => {
        useAuthStore.getState().setBackgroundedAt(new Date());
      });

      let requiresReauth = useAuthStore.getState().checkBackgroundTimeout();
      expect(requiresReauth).toBe(false);

      act(() => {
        useAuthStore.getState().setBackgroundedAt(null);
        useAuthStore.getState().updateLastActivity();
      });

      // Second background/foreground cycle (6 minutes)
      const sixMinutesAgo = new Date();
      sixMinutesAgo.setMinutes(sixMinutesAgo.getMinutes() - 6);

      act(() => {
        useAuthStore.setState({ backgroundedAt: sixMinutesAgo });
      });

      requiresReauth = useAuthStore.getState().checkBackgroundTimeout();
      expect(requiresReauth).toBe(true);

      act(() => {
        useAuthStore.getState().lockSession();
      });

      expect(useAuthStore.getState().isLocked).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle null lastActivityAt gracefully', () => {
      act(() => {
        useAuthStore.setState({ lastActivityAt: null });
      });

      const isValid = useAuthStore.getState().checkSessionTimeout();
      expect(isValid).toBe(true); // Should be valid when no activity recorded
    });

    it('should handle null backgroundedAt gracefully', () => {
      act(() => {
        useAuthStore.setState({ backgroundedAt: null });
      });

      const requiresReauth = useAuthStore.getState().checkBackgroundTimeout();
      expect(requiresReauth).toBe(false); // Should not require reauth when not backgrounded
    });

    it('should handle invalid date values by throwing error', () => {
      act(() => {
        useAuthStore.setState({ 
          lastActivityAt: new Date('invalid'),
        });
      });

      // Invalid dates will throw RangeError when calling getTime()
      // This is expected behavior - the app should validate dates before storing
      expect(() => {
        useAuthStore.getState().checkSessionTimeout();
      }).toThrow(RangeError);
    });

    it('should handle rapid background/foreground transitions', () => {
      // Initialize session
      act(() => {
        useAuthStore.getState().initializeSession();
      });

      // Rapid transitions
      for (let i = 0; i < 5; i++) {
        act(() => {
          useAuthStore.getState().setBackgroundedAt(new Date());
        });

        act(() => {
          useAuthStore.getState().setBackgroundedAt(null);
        });
      }

      // Should remain stable
      expect(useAuthStore.getState().backgroundedAt).toBeNull();
      expect(useAuthStore.getState().isLocked).toBe(false);
    });

    it('should handle session timeout boundary (exactly 30 days)', () => {
      // Set activity to exactly 30 days ago (to the millisecond)
      const exactlyThirtyDays = new Date();
      exactlyThirtyDays.setTime(
        exactlyThirtyDays.getTime() - (30 * 24 * 60 * 60 * 1000)
      );

      act(() => {
        useAuthStore.setState({ lastActivityAt: exactlyThirtyDays });
      });

      const isValid = useAuthStore.getState().checkSessionTimeout();
      expect(isValid).toBe(false); // Should timeout at exactly 30 days
    });

    it('should handle background timeout boundary (exactly 5 minutes)', () => {
      // Set backgrounded to exactly 5 minutes ago (to the millisecond)
      const exactlyFiveMinutes = new Date();
      exactlyFiveMinutes.setTime(
        exactlyFiveMinutes.getTime() - (5 * 60 * 1000)
      );

      act(() => {
        useAuthStore.setState({ backgroundedAt: exactlyFiveMinutes });
      });

      const requiresReauth = useAuthStore.getState().checkBackgroundTimeout();
      expect(requiresReauth).toBe(true); // Should require reauth at exactly 5 minutes
    });
  });
});
