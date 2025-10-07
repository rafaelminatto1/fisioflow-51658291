import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePermissions } from '../usePermissions';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar isAdmin true para usuário admin', async () => {
    const mockUser = { id: 'user-123' };
    const mockRoles = [{ role: 'admin' }];

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockRoles,
          error: null,
        }),
      }),
    } as any);

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.isAdmin).toBe(true);
    });
  });

  it('deve retornar canWrite true para fisioterapeuta', async () => {
    const mockUser = { id: 'user-456' };
    const mockRoles = [{ role: 'fisioterapeuta' }];

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockRoles,
          error: null,
        }),
      }),
    } as any);

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.canWrite('eventos')).toBe(true);
    });
  });

  it('deve retornar canDelete false para estagiário', async () => {
    const mockUser = { id: 'user-789' };
    const mockRoles = [{ role: 'estagiario' }];

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockRoles,
          error: null,
        }),
      }),
    } as any);

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.canDelete('eventos')).toBe(false);
    });
  });
});
