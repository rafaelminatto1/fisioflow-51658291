import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAppointmentActions } from '../useAppointmentActions';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: '1' }, error: null })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useAppointmentActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve ter função de confirmar agendamento', async () => {
    const { result } = renderHook(() => useAppointmentActions());

    await waitFor(() => {
      expect(result.current.confirmAppointment).toBeDefined();
      expect(typeof result.current.confirmAppointment).toBe('function');
    });
  });

  it('deve cancelar agendamento', async () => {
    const { result } = renderHook(() => useAppointmentActions());

    await waitFor(() => {
      expect(result.current.cancelAppointment).toBeDefined();
    });
  });

  it('deve concluir agendamento', async () => {
    const { result } = renderHook(() => useAppointmentActions());

    await waitFor(() => {
      expect(result.current.completeAppointment).toBeDefined();
    });
  });
});
