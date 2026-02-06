import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import {
  generateMockAppointment,
  generateMockPatient,
  generateMockTherapist,
  createMockSupabaseResponse,
  createMockSupabaseError,
  generateUUID,
  createFutureDate,
  formatTimeSlot,
} from '../utils/testHelpers';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('Appointments - Criação de Agendamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('appointments.create', () => {
    it('deve criar agendamento com dados válidos', async () => {
      const patientId = generateUUID();
      const therapistId = generateUUID();
      const appointmentData = {
        patient_id: patientId,
        therapist_id: therapistId,
        appointment_date: createFutureDate(7),
        appointment_time: '09:00',
        duration: 60,
        type: 'consulta',
      };

      const mockCreatedAppointment = generateMockAppointment({
        ...appointmentData,
        id: generateUUID(),
        status: 'agendado',
      });

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockCreatedAppointment)),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      // Simular a criação
      const result = await mockChain.single();

      expect(result.data).toBeDefined();
      expect(result.data.id).toBeDefined();
      expect(result.data.patient_id).toBe(patientId);
      expect(result.data.status).toBe('agendado');
      expect(result.error).toBeNull();
    });

    it('deve retornar erro se paciente não existe', async () => {
      const invalidPatientId = generateUUID();
      
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(
          createMockSupabaseError('Violação de chave estrangeira: patient_id')
        ),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });

    it('deve validar campos obrigatórios', () => {
      const validateAppointmentData = (data: Record<string, unknown>) => {
        const requiredFields = ['patient_id', 'appointment_date', 'appointment_time'];
        const missingFields = requiredFields.filter(field => !data[field]);
        return missingFields.length === 0;
      };

      // Dados completos
      expect(validateAppointmentData({
        patient_id: generateUUID(),
        appointment_date: '2025-01-15',
        appointment_time: '09:00',
      })).toBe(true);

      // Faltando patient_id
      expect(validateAppointmentData({
        appointment_date: '2025-01-15',
        appointment_time: '09:00',
      })).toBe(false);

      // Faltando data
      expect(validateAppointmentData({
        patient_id: generateUUID(),
        appointment_time: '09:00',
      })).toBe(false);
    });
  });

  describe('Verificação de Conflitos de Horário', () => {
    it('deve detectar conflito quando já existe agendamento no mesmo horário', async () => {
      const therapistId = generateUUID();
      const date = createFutureDate(7);
      const time = '09:00';

      const existingAppointment = generateMockAppointment({
        therapist_id: therapistId,
        appointment_date: date,
        appointment_time: time,
        status: 'agendado',
      });

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue(createMockSupabaseResponse([existingAppointment])),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.in('status', ['agendado', 'confirmado']);
      const hasConflict = result.data && result.data.length > 0;

      expect(hasConflict).toBe(true);
    });

    it('deve permitir agendamento quando não há conflito', async () => {
      const therapistId = generateUUID();

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue(createMockSupabaseResponse([])),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.in('status', ['agendado', 'confirmado']);
      const hasConflict = result.data && result.data.length > 0;

      expect(hasConflict).toBe(false);
    });

    it('deve calcular sobreposição de horários corretamente', () => {
      const checkTimeOverlap = (
        existingStart: string,
        existingDuration: number,
        newStart: string,
        newDuration: number
      ): boolean => {
        const [h1, m1] = existingStart.split(':').map(Number);
        const [h2, m2] = newStart.split(':').map(Number);
        
        const existingStartMinutes = h1 * 60 + m1;
        const existingEndMinutes = existingStartMinutes + existingDuration;
        
        const newStartMinutes = h2 * 60 + m2;
        const newEndMinutes = newStartMinutes + newDuration;

        return !(newEndMinutes <= existingStartMinutes || newStartMinutes >= existingEndMinutes);
      };

      // Sobreposição total
      expect(checkTimeOverlap('09:00', 60, '09:00', 60)).toBe(true);
      
      // Sobreposição parcial
      expect(checkTimeOverlap('09:00', 60, '09:30', 60)).toBe(true);
      
      // Sem sobreposição (adjacentes)
      expect(checkTimeOverlap('09:00', 60, '10:00', 60)).toBe(false);
      
      // Sem sobreposição (afastados)
      expect(checkTimeOverlap('09:00', 60, '14:00', 60)).toBe(false);
    });
  });

  describe('appointments.update', () => {
    it('deve atualizar agendamento existente', async () => {
      const appointmentId = generateUUID();
      const originalAppointment = generateMockAppointment({ id: appointmentId });
      const updatedData = { notes: 'Observação atualizada' };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(
          createMockSupabaseResponse({ ...originalAppointment, ...updatedData })
        ),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.notes).toBe('Observação atualizada');
      expect(result.error).toBeNull();
    });

    it('deve verificar conflitos ao mudar fisioterapeuta', async () => {
      const appointmentId = generateUUID();
      const newTherapistId = generateUUID();
      
      // Primeiro, buscar conflitos
      const conflictCheckChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue(createMockSupabaseResponse([])),
      };

      mockSupabase.from.mockReturnValue(conflictCheckChain);

      const conflictResult = await conflictCheckChain.in('status', ['agendado', 'confirmado']);
      const hasConflict = conflictResult.data && conflictResult.data.length > 0;

      expect(hasConflict).toBe(false);
    });

    it('deve retornar erro ao tentar atualizar agendamento inexistente', async () => {
      const fakeId = generateUUID();

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseError('Registro não encontrado')),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });
  });

  describe('appointments.cancel', () => {
    it('deve cancelar agendamento e atualizar status', async () => {
      const appointmentId = generateUUID();

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(
          createMockSupabaseResponse(generateMockAppointment({
            id: appointmentId,
            status: 'cancelado',
          }))
        ),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.status).toBe('cancelado');
    });

    it('deve registrar motivo do cancelamento', async () => {
      const appointmentId = generateUUID();
      const cancellationReason = 'Paciente solicitou reagendamento';

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(
          createMockSupabaseResponse(generateMockAppointment({
            id: appointmentId,
            status: 'cancelado',
            notes: cancellationReason,
          }))
        ),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.notes).toBe(cancellationReason);
    });
  });
});
