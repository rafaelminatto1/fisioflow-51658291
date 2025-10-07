import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEventos } from '../useEventos';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  },
}));

describe('useEventos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar lista vazia inicialmente', () => {
    const { result } = renderHook(() => useEventos());
    
    expect(result.current.data).toEqual(undefined);
    expect(result.current.isLoading).toBe(true);
  });

  it('deve lidar com erros de forma adequada', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Erro ao buscar eventos' },
      }),
    } as any);

    const { result } = renderHook(() => useEventos());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
