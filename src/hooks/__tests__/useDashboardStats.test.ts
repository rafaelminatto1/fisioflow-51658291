import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboardStats } from '../useDashboardStats';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        count: vi.fn(() => Promise.resolve({ count: 10, error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
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

describe('useDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar estatísticas do dashboard', async () => {
    const { result } = renderHook(() => useDashboardStats(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats).toBeDefined();
  });

  it('deve retornar estrutura de stats válida', async () => {
    const { result } = renderHook(() => useDashboardStats(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.stats).toBeDefined();
      expect(result.current.stats?.totalPatients).toBeGreaterThanOrEqual(0);
      expect(result.current.stats?.todayAppointments).toBeGreaterThanOrEqual(0);
    });
  });
});
