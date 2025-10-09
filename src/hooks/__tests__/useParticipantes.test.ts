import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useParticipantes } from '../useParticipantes';
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
                nome: 'Maria Santos',
                contato: 'maria@example.com',
                instagram: '@maria',
                segue_perfil: true,
                observacoes: 'Teste',
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

describe('useParticipantes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar participantes de um evento', async () => {
    const { result } = renderHook(() => useParticipantes('evento-1'));

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].nome).toBe('Maria Santos');
    });
  });

  it('deve ter query desabilitada quando evento_id é vazio', () => {
    const { result } = renderHook(() => useParticipantes(''));
    expect(result.current.data).toBeUndefined();
  });

  it('deve filtrar participantes que seguem perfil', async () => {
    const { result } = renderHook(() => useParticipantes('evento-1'));

    await waitFor(() => {
      const seguidores = result.current.data?.filter(p => p.segue_perfil) || [];
      expect(seguidores.length).toBeGreaterThan(0);
    });
  });
});
