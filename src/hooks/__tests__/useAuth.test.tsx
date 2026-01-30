import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { useAuth } from '../useAuth';
import React from 'react';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

// Mock do AuthContext
const mockAuthContextValue = {
  user: null,
  profile: null,
  session: null,
  loading: false,
  initialized: true,
  sessionCheckFailed: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
  updateProfile: vi.fn(),
  refreshProfile: vi.fn(),
};

vi.mock('@/contexts/AuthContext', () => ({
  AuthContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
  useAuth: () => mockAuthContextValue,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
    logger: { log: console.log, warn: console.warn, error: () => {} },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={mockAuthContextValue as AuthContextType}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AuthContext.Provider>
  );
};

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock values
    mockAuthContextValue.user = null;
    mockAuthContextValue.profile = null;
  });

  it('deve retornar usuário null quando não autenticado', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
    });
  });

  it('deve retornar usuário quando autenticado', async () => {
    const mockUser = {
      id: '123',
      email: 'teste@example.com',
    };

    // Update mock value
    mockAuthContextValue.user = mockUser as AuthContextType['user'];

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });
  });

  it('deve ter função signOut disponível', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    expect(typeof result.current.signOut).toBe('function');
  });
});
