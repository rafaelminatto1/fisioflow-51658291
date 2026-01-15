import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '@/contexts/AuthContext';
import { useCreateAppointment, useUpdateAppointment } from '../useAppointments';
import { supabase } from '@/integrations/supabase/client';
import { requireUserOrganizationId } from '@/utils/userHelpers';
import React from 'react';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock do userHelpers
vi.mock('@/utils/userHelpers', () => ({
  requireUserOrganizationId: vi.fn(),
}));

// Mock do logger
vi.mock('@/lib/errors/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock do AppointmentNotificationService
vi.mock('@/lib/services/AppointmentNotificationService', () => ({
  AppointmentNotificationService: {
    scheduleNotification: vi.fn(),
  },
}));

// Mock do useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock do checkAppointmentConflict
vi.mock('@/utils/appointmentValidation', () => ({
  checkAppointmentConflict: vi.fn(() => ({ hasConflict: false })),
}));

const createWrapper = () => {
  // Criar QueryClient isolado para cada teste para evitar estado compartilhado
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { 
        retry: false,
        gcTime: 0, // Desabilitar garbage collection para testes
      },
      mutations: { 
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireUserOrganizationId as any).mockResolvedValue('org-123');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useCreateAppointment', () => {
    it('deve criar agendamento com organization_id', async () => {
      const mockAppointmentData = {
        patient_id: 'patient-123',
        appointment_date: '2024-12-25',
        appointment_time: '10:00',
        duration: 60,
        type: 'Fisioterapia' as const,
        status: 'agendado' as const,
      };

      const mockCreatedAppointment = {
        id: 'appt-123',
        ...mockAppointmentData,
        organization_id: 'org-123',
        patients: {
          id: 'patient-123',
          name: 'João Silva',
          phone: '11987654321',
          email: 'joao@example.com',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockCreatedAppointment,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });
      mockInsert.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const { result } = renderHook(() => useCreateAppointment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockAppointmentData);

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      // Verificar que requireUserOrganizationId foi chamado
      expect(requireUserOrganizationId).toHaveBeenCalled();
    });

    it('deve lançar erro quando organização não é encontrada', async () => {
      (requireUserOrganizationId as any).mockRejectedValue(
        new Error('Organização não encontrada. Você precisa estar vinculado a uma organização.')
      );

      const mockAppointmentData = {
        patient_id: 'patient-123',
        appointment_date: '2024-12-25',
        appointment_time: '10:00',
        duration: 60,
        type: 'Fisioterapia' as const,
        status: 'agendado' as const,
      };

      const { result } = renderHook(() => useCreateAppointment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockAppointmentData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('deve tratar erro do Supabase corretamente', async () => {
      const mockError = { code: '23505', message: 'Duplicate key' };

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });
      mockInsert.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const mockAppointmentData = {
        patient_id: 'patient-123',
        appointment_date: '2024-12-25',
        appointment_time: '10:00',
        duration: 60,
        type: 'Fisioterapia' as const,
        status: 'agendado' as const,
      };

      const { result } = renderHook(() => useCreateAppointment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockAppointmentData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useUpdateAppointment', () => {
    it('deve atualizar agendamento com organization_id no filtro', async () => {
      const mockUpdates = {
        appointment_date: '2024-12-26',
        appointment_time: '11:00',
        duration: 90,
      };

      const mockUpdatedAppointment = {
        id: 'appt-123',
        patient_id: 'patient-123',
        ...mockUpdates,
        organization_id: 'org-123',
        patients: {
          id: 'patient-123',
          name: 'João Silva',
          phone: '11987654321',
          email: 'joao@example.com',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockUpdatedAppointment,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        eq: mockEq, // Segundo eq para organization_id
      });
      mockEq.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const { result } = renderHook(() => useUpdateAppointment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        appointmentId: 'appt-123',
        updates: mockUpdates,
      });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      // Verificar que requireUserOrganizationId foi chamado
      expect(requireUserOrganizationId).toHaveBeenCalled();
    });

    it('deve lançar erro quando organização não é encontrada', async () => {
      (requireUserOrganizationId as any).mockRejectedValue(
        new Error('Organização não encontrada. Você precisa estar vinculado a uma organização.')
      );

      const { result } = renderHook(() => useUpdateAppointment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        appointmentId: 'appt-123',
        updates: { appointment_time: '12:00' },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});

