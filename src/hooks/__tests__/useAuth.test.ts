import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';

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

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar usuário null quando não autenticado', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toBeNull();
    });
  });

  it('deve retornar usuário quando autenticado', async () => {
    const mockUser = {
      id: '123',
      email: 'teste@example.com',
    };

    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });
  });

  it('deve ter função signOut disponível', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(typeof result.current.signOut).toBe('function');
  });
});
