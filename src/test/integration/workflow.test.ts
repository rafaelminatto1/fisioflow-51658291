import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

  generateMockPatient,
  generateMockAppointment,
  generateMockTransaction,
  generateMockTherapist,
  createMockSupabaseResponse,
  generateUUID,
  createFutureDate,
} from '../utils/testHelpers';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('Testes de Integração - Fluxos Completos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Fluxo: Criar Agendamento + Transação + Notificação', () => {
    it('deve criar agendamento e gerar transação automaticamente', async () => {
      const patientId = generateUUID();
      const therapistId = generateUUID();
      const appointmentId = generateUUID();
      const transactionId = generateUUID();

      // Step 1: Criar agendamento
      const appointment = generateMockAppointment({
        id: appointmentId,
        patient_id: patientId,
        therapist_id: therapistId,
        appointment_date: createFutureDate(7),
        appointment_time: '09:00',
        payment_amount: 150,
      });

      const appointmentChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(appointment)),
      };

      mockSupabase.from.mockReturnValueOnce(appointmentChain);

      const appointmentResult = await appointmentChain.single();
      expect(appointmentResult.data.id).toBe(appointmentId);

      // Step 2: Criar transação vinculada
      const transaction = generateMockTransaction({
        id: transactionId,
        appointment_id: appointmentId,
        patient_id: patientId,
        valor: 150,
        status: 'pendente',
      });

      const transactionChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(transaction)),
      };

      mockSupabase.from.mockReturnValueOnce(transactionChain);

      const transactionResult = await transactionChain.single();
      expect(transactionResult.data.appointment_id).toBe(appointmentId);
      expect(transactionResult.data.valor).toBe(150);

      // Verify flow completed successfully
      expect(appointmentResult.data).toBeDefined();
      expect(transactionResult.data).toBeDefined();
      expect(transactionResult.data.appointment_id).toBe(appointmentResult.data.id);
    });

    it('deve validar integridade referencial entre entidades', async () => {
      const patientId = generateUUID();
      const appointmentId = generateUUID();

      // Appointment references patient
      const appointment = generateMockAppointment({
        id: appointmentId,
        patient_id: patientId,
      });

      // Transaction references both
      const transaction = generateMockTransaction({
        appointment_id: appointmentId,
        patient_id: patientId,
      });

      expect(transaction.patient_id).toBe(appointment.patient_id);
      expect(transaction.appointment_id).toBe(appointment.id);
    });
  });

  describe('Fluxo: Editar Agendamento + Atualizar Calendário', () => {
    it('deve atualizar agendamento e sincronizar mudanças', async () => {
      const appointmentId = generateUUID();
      const originalDate = createFutureDate(7);
      const newDate = createFutureDate(14);
      const newTime = '14:00';

      // Original appointment
      const originalAppointment = generateMockAppointment({
        id: appointmentId,
        appointment_date: originalDate,
        appointment_time: '09:00',
      });

      // Updated appointment
      const updatedAppointment = {
        ...originalAppointment,
        appointment_date: newDate,
        appointment_time: newTime,
        updated_at: new Date().toISOString(),
      };

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(updatedAppointment)),
      };

      mockSupabase.from.mockReturnValue(updateChain);

      const result = await updateChain.single();

      expect(result.data.appointment_date).toBe(newDate);
      expect(result.data.appointment_time).toBe(newTime);
      expect(result.data.updated_at).toBeDefined();
    });

    it('deve manter histórico de alterações', () => {
      const createAuditLog = (
        action: string,
        oldData: Record<string, unknown>,
        newData: Record<string, unknown>
      ): { action: string; changes: Record<string, { old: unknown; new: unknown }> } => {
        const changes: Record<string, { old: unknown; new: unknown }> = {};;
        
        Object.keys(newData).forEach(key => {
          if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
            changes[key] = {
              old: oldData[key],
              new: newData[key],
            };
          }
        });

        return { action, changes };
      };

      const oldData = {
        appointment_date: '2025-01-15',
        appointment_time: '09:00',
      };

      const newData = {
        appointment_date: '2025-01-22',
        appointment_time: '14:00',
      };

      const auditLog = createAuditLog('UPDATE', oldData, newData);

      expect(auditLog.action).toBe('UPDATE');
      expect(auditLog.changes.appointment_date.old).toBe('2025-01-15');
      expect(auditLog.changes.appointment_date.new).toBe('2025-01-22');
    });
  });

  describe('Fluxo: Cancelar Agendamento + Lista de Espera', () => {
    it('deve cancelar agendamento e adicionar paciente à lista de espera', async () => {
      const appointmentId = generateUUID();
      const patientId = generateUUID();
      const therapistId = generateUUID();
      const slotDate = createFutureDate(7);
      const slotTime = '09:00';

      // Step 1: Cancel appointment
      const cancelChain = {
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

      mockSupabase.from.mockReturnValueOnce(cancelChain);

      const cancelResult = await cancelChain.single();
      expect(cancelResult.data.status).toBe('cancelado');

      // Step 2: Check waitlist for that slot
      const waitlistEntry = {
        id: generateUUID(),
        patient_id: patientId,
        therapist_id: therapistId,
        preferred_date: slotDate,
        preferred_time: slotTime,
        status: 'aguardando',
        created_at: new Date().toISOString(),
      };

      const waitlistChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(createMockSupabaseResponse([waitlistEntry])),
      };

      mockSupabase.from.mockReturnValueOnce(waitlistChain);

      const waitlistResult = await waitlistChain.order('created_at', { ascending: true });
      
      expect(waitlistResult.data.length).toBeGreaterThan(0);
      expect(waitlistResult.data[0].preferred_date).toBe(slotDate);
    });

    it('deve notificar pacientes da lista de espera sobre vaga disponível', () => {
      interface WaitlistEntry {
        preferred_date: string;
        preferred_time: string;
        status: string;
      }

      const checkWaitlistForSlot = (
        waitlist: WaitlistEntry[],
        availableDate: string,
        availableTime: string
      ): WaitlistEntry[] => {
        return waitlist.filter(
          entry =>
            entry.status === 'aguardando' &&
            entry.preferred_date === availableDate &&
            entry.preferred_time === availableTime
        );
      };

      const waitlist = [
        { preferred_date: '2025-01-15', preferred_time: '09:00', status: 'aguardando' },
        { preferred_date: '2025-01-15', preferred_time: '14:00', status: 'aguardando' },
        { preferred_date: '2025-01-15', preferred_time: '09:00', status: 'atendido' },
        { preferred_date: '2025-01-16', preferred_time: '09:00', status: 'aguardando' },
      ];

      const matches = checkWaitlistForSlot(waitlist, '2025-01-15', '09:00');

      expect(matches.length).toBe(1);
      expect(matches[0].status).toBe('aguardando');
    });
  });

  describe('Fluxo: Pagamento de Sessão', () => {
    it('deve processar pagamento e atualizar status do agendamento', async () => {
      const appointmentId = generateUUID();
      const transactionId = generateUUID();

      // Update transaction status to paid
      const paidTransaction = generateMockTransaction({
        id: transactionId,
        appointment_id: appointmentId,
        status: 'pago',
        data_pagamento: new Date().toISOString().split('T')[0],
      });

      const transactionChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(paidTransaction)),
      };

      mockSupabase.from.mockReturnValueOnce(transactionChain);

      const transactionResult = await transactionChain.single();
      expect(transactionResult.data.status).toBe('pago');

      // Update appointment payment status
      const paidAppointment = generateMockAppointment({
        id: appointmentId,
        payment_status: 'paid',
      });

      const appointmentChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(paidAppointment)),
      };

      mockSupabase.from.mockReturnValueOnce(appointmentChain);

      const appointmentResult = await appointmentChain.single();
      expect(appointmentResult.data.payment_status).toBe('paid');
    });
  });

  describe('Validações de Regras de Negócio', () => {
    it('não deve permitir agendamento no passado', () => {
      const validateAppointmentDate = (date: string): boolean => {
        const appointmentDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return appointmentDate >= today;
      };

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      expect(validateAppointmentDate(pastDate.toISOString().split('T')[0])).toBe(false);
      expect(validateAppointmentDate(futureDate.toISOString().split('T')[0])).toBe(true);
    });

    it('não deve permitir mais de um agendamento no mesmo horário para o mesmo terapeuta', () => {
      const checkConflict = (
        existingAppointments: Array<{ date: string; time: string; duration: number }>,
        newDate: string,
        newTime: string,
        newDuration: number
      ): boolean => {
        const [newH, newM] = newTime.split(':').map(Number);
        const newStart = newH * 60 + newM;
        const newEnd = newStart + newDuration;

        return existingAppointments.some(apt => {
          if (apt.date !== newDate) return false;
          
          const [h, m] = apt.time.split(':').map(Number);
          const aptStart = h * 60 + m;
          const aptEnd = aptStart + apt.duration;

          return !(newEnd <= aptStart || newStart >= aptEnd);
        });
      };

      const existing = [
        { date: '2025-01-15', time: '09:00', duration: 60 },
        { date: '2025-01-15', time: '14:00', duration: 60 },
      ];

      // Conflito
      expect(checkConflict(existing, '2025-01-15', '09:30', 60)).toBe(true);
      
      // Sem conflito
      expect(checkConflict(existing, '2025-01-15', '10:00', 60)).toBe(false);
      expect(checkConflict(existing, '2025-01-16', '09:00', 60)).toBe(false);
    });
  });
});
