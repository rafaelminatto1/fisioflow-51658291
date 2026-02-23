/**
 * Auth Store Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuthStore, User } from '../auth';

// Mock do Firebase
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock('@/lib/firebase', () => ({
  auth: {},
  db: {},
}));

jest.mock('@/lib/services/auditLogger', () => ({
  auditLogger: {
    logLogin: jest.fn(),
    logLogout: jest.fn(),
  },
}));

jest.mock('@/lib/sentry', () => ({
  setSentryUser: jest.fn(),
  clearSentryUser: jest.fn(),
}));

import { signInWithEmailAndPassword } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { auditLogger } from '@/lib/services/auditLogger';
import { setSentryUser, clearSentryUser } from '@/lib/sentry';

describe('Auth Store', () => {
  const mockUser: User = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'professional',
    organizationId: 'org123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Zustand store state
    useAuthStore.setState({
      user: null,
      firebaseUser: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
      isLocked: false,
    });
  });

  it('has initial state with loading true', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('clears error when clearError is called', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('locks and unlocks session', async () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.lockSession();
    });

    expect(result.current.isLocked).toBe(true);

    await act(async () => {
      await result.current.unlockSession();
    });

    expect(result.current.isLocked).toBe(false);
  });

  it('clears session properly', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.clearSession();
    });

    expect(result.current.isLocked).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('updates user data', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.user = mockUser;
      result.current.updateUserData({ name: 'Updated Name' });
    });

    expect(result.current.user?.name).toBe('Updated Name');
    expect(result.current.user?.id).toBe('user123');
  });

  describe('signIn', () => {
    it('handles sign in successfully', async () => {
      const mockFirebaseUser = {
        uid: 'user123',
        email: 'test@example.com',
      };

      (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: mockFirebaseUser,
      });

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          name: 'Test User',
          role: 'professional',
          organizationId: 'org123',
        }),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('test@example.com');
      expect(result.current.user?.role).toBe('professional');
      expect(auditLogger.logLogin).toHaveBeenCalledWith('user123');
      expect(setSentryUser).toHaveBeenCalledWith(
        'user123',
        'test@example.com',
        expect.any(Object)
      );
    });

    it('handles sign in error for non-professional user', async () => {
      const mockFirebaseUser = {
        uid: 'user123',
        email: 'patient@example.com',
      };

      (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: mockFirebaseUser,
      });

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          name: 'Patient User',
          role: 'patient',
        }),
      });

      const { result } = renderHook(() => useAuthStore());

      await expect(
        act(async () => {
          await result.current.signIn('patient@example.com', 'password123');
        })
      ).rejects.toThrow('Acesso restrito a profissionais');

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });
      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
    });

    it('handles sign in error for invalid credentials', async () => {
      const error = new Error('auth/invalid-credential');
      (error as any).code = 'auth/invalid-credential';

      (signInWithEmailAndPassword as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await expect(
        act(async () => {
          await result.current.signIn('test@example.com', 'wrongpass');
        })
      ).rejects.toThrow('Credenciais invalidas');
    });
  });

  describe('signOut', () => {
    it('handles sign out successfully', async () => {
      const { signOut: firebaseSignOut } = require('firebase/auth');

      const { result } = renderHook(() => useAuthStore());

      // Set a user first
      act(() => {
        result.current.user = mockUser;
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(firebaseSignOut).toHaveBeenCalled();
      expect(clearSentryUser).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('initializes auth state on mount', () => {
      const { onAuthStateChanged } = require('firebase/auth');

      const mockUnsubscribe = jest.fn();
      (onAuthStateChanged as jest.Mock).mockReturnValue(mockUnsubscribe);

      const { result } = renderHook(() => useAuthStore());

      const unsubscribe = result.current.initialize();

      expect(onAuthStateChanged).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });
});
