import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePrestadores } from '../usePrestadores';
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
                nome: 'João Silva',
                contato: 'joao@example.com',
                cpf_cnpj: '123.456.789-00',
                valor_acordado: 500,
                status_pagamento: 'PENDENTE',
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

describe('usePrestadores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar prestadores de um evento', async () => {
    const { result } = renderHook(() => usePrestadores('evento-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].nome).toBe('João Silva');
    });
  });

  it('deve ter query desabilitada quando evento_id é vazio', () => {
    const { result } = renderHook(() => usePrestadores(''), { wrapper: createWrapper() });
    expect(result.current.data).toBeUndefined();
  });

  it('deve indicar loading durante carregamento', () => {
    const { result } = renderHook(() => usePrestadores('evento-1'), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
  });
});
