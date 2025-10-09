import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePagamentos } from '../usePagamentos';
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
                tipo: 'prestador',
                descricao: 'Pagamento fisioterapeuta',
                valor: 500,
                pago_em: '2025-01-15',
                comprovante_url: null,
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

describe('usePagamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar pagamentos de um evento', async () => {
    const { result } = renderHook(() => usePagamentos('evento-1'));

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].descricao).toBe('Pagamento fisioterapeuta');
    });
  });

  it('deve calcular total de pagamentos', async () => {
    const { result } = renderHook(() => usePagamentos('evento-1'));

    await waitFor(() => {
      const pagamentos = result.current.data || [];
      const total = pagamentos.reduce((acc, p) => acc + Number(p.valor), 0);
      expect(total).toBe(500);
    });
  });

  it('deve ter query desabilitada quando evento_id é vazio', () => {
    const { result } = renderHook(() => usePagamentos(''));
    expect(result.current.data).toBeUndefined();
  });

  it('deve agrupar pagamentos por tipo', async () => {
    const { result } = renderHook(() => usePagamentos('evento-1'));

    await waitFor(() => {
      const pagamentos = result.current.data || [];
      const porTipo = pagamentos.reduce((acc, p) => {
        acc[p.tipo] = (acc[p.tipo] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      expect(porTipo.prestador).toBe(1);
    });
  });
});
