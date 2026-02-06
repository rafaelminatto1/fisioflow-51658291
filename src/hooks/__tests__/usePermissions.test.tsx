
// Type for Supabase query mock

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePermissions } from '../usePermissions';
import { supabase } from '@/integrations/supabase/client';

type SupabaseQueryMock = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
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
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

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
    } as SupabaseQueryMock);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockRoles,
          error: null,
        }),
      }),
    } as SupabaseQueryMock);

    const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() });

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
    } as SupabaseQueryMock);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockRoles,
          error: null,
        }),
      }),
    } as SupabaseQueryMock);

    const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() });

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
    } as SupabaseQueryMock);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockRoles,
          error: null,
        }),
      }),
    } as SupabaseQueryMock);

    const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.canDelete('eventos')).toBe(false);
    });
  });
});
