import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChecklist } from '../useChecklist';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [
              {
                id: '1',
                titulo: 'Aluguel de tendas',
                tipo: 'alugar',
                quantidade: 5,
                custo_unitario: 200,
                status: 'ABERTO',
                evento_id: 'evento-1'
              }
            ],
            error: null
          }))
        }))
      }))
    }))
  }
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

describe('useChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar itens do checklist', async () => {
    const { result } = renderHook(() => useChecklist('evento-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].titulo).toBe('Aluguel de tendas');
    });
  });

  it('deve calcular custo total corretamente', async () => {
    const { result } = renderHook(() => useChecklist('evento-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      const items = result.current.data || [];
      const total = items.reduce(
        (acc, item) => acc + (item.quantidade * item.custo_unitario), 
        0
      );
      expect(total).toBe(1000);
    });
  });

  it('deve ter query desabilitada quando evento_id é vazio', () => {
    const { result } = renderHook(() => useChecklist(''), { wrapper: createWrapper() });
    expect(result.current.data).toBeUndefined();
  });
});
