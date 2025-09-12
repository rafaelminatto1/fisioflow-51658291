import { describe, it, expect } from 'vitest';
import { 
  appointmentSchema, 
  patientSchema, 
  paymentSchema,
  createAppointmentSchema,
  createPaymentSchema,
  agendaFiltersSchema
} from '@/lib/validations/agenda';
import { 
  STATUS_CONFIG, 
  ROLE_PERMISSIONS, 
  hasPermission, 
  getStatusConfig,
  getAllowedActions,
  generateTimeSlots
} from '@/lib/config/agenda';
import { 
  formatDate, 
  getWeekStart, 
  hasTimeConflict,
  suggestAlternativeTimeSlots
} from '@/utils/agendaUtils';
import type { Appointment, UserRole, SessionStatus } from '@/types/agenda';

describe('Agenda Types and Validations', () => {
  describe('Zod Schemas', () => {
    it('should validate a correct appointment', () => {
      const validAppointment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        patient_id: '123e4567-e89b-12d3-a456-426614174001',
        therapist_id: '123e4567-e89b-12d3-a456-426614174002',
        date: '2024-01-15',
        start_time: '09:00',
        end_time: '10:00',
        status: 'scheduled' as const,
        payment_status: 'pending' as const,
        session_type: 'individual' as const,
        notes: 'Primeira consulta',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = appointmentSchema.safeParse(validAppointment);
      expect(result.success).toBe(true);
    });

    it('should reject appointment with invalid time range', () => {
      const invalidAppointment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        patient_id: '123e4567-e89b-12d3-a456-426614174001',
        therapist_id: '123e4567-e89b-12d3-a456-426614174002',
        date: '2024-01-15',
        start_time: '10:00',
        end_time: '09:00', // End before start
        status: 'scheduled' as const,
        payment_status: 'pending' as const,
        session_type: 'individual' as const,
        notes: '',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = appointmentSchema.safeParse(invalidAppointment);
      expect(result.success).toBe(false);
    });

    it('should validate create appointment schema', () => {
      const validCreateData = {
        patient_id: '123e4567-e89b-12d3-a456-426614174001',
        therapist_id: '123e4567-e89b-12d3-a456-426614174002',
        date: '2024-01-15',
        start_time: '09:00',
        end_time: '10:00',
        session_type: 'individual' as const,
        notes: 'Test appointment'
      };

      const result = createAppointmentSchema.safeParse(validCreateData);
      expect(result.success).toBe(true);
    });

    it('should reject appointment outside business hours', () => {
      const invalidCreateData = {
        patient_id: '123e4567-e89b-12d3-a456-426614174001',
        therapist_id: '123e4567-e89b-12d3-a456-426614174002',
        date: '2024-01-15',
        start_time: '06:00', // Before business hours
        end_time: '07:00',
        session_type: 'individual' as const
      };

      const result = createAppointmentSchema.safeParse(invalidCreateData);
      expect(result.success).toBe(false);
    });

    it('should validate payment with package type', () => {
      const validPackagePayment = {
        appointment_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 400.00,
        payment_type: 'package' as const,
        sessions_count: 5,
        payment_method: 'card' as const,
        notes: 'Pacote de 5 sessões'
      };

      const result = createPaymentSchema.safeParse(validPackagePayment);
      expect(result.success).toBe(true);
    });

    it('should reject package payment without sessions_count', () => {
      const invalidPackagePayment = {
        appointment_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 400.00,
        payment_type: 'package' as const,
        // Missing sessions_count
        payment_method: 'card' as const,
        notes: 'Pacote sem quantidade'
      };

      const result = createPaymentSchema.safeParse(invalidPackagePayment);
      expect(result.success).toBe(false);
    });
  });

  describe('Role Permissions', () => {
    it('should grant correct permissions to admin', () => {
      expect(hasPermission('admin', 'canCreateAppointment')).toBe(true);
      expect(hasPermission('admin', 'canDeleteAppointment')).toBe(true);
      expect(hasPermission('admin', 'canManagePayments')).toBe(true);
    });

    it('should restrict intern permissions', () => {
      expect(hasPermission('intern', 'canCreateAppointment')).toBe(false);
      expect(hasPermission('intern', 'canManagePayments')).toBe(false);
      expect(hasPermission('intern', 'canViewAllAppointments')).toBe(true);
    });

    it('should restrict patient permissions', () => {
      expect(hasPermission('patient', 'canViewAllAppointments')).toBe(false);
      expect(hasPermission('patient', 'canCreateAppointment')).toBe(false);
      expect(hasPermission('patient', 'canManagePayments')).toBe(false);
    });
  });

  describe('Status Configuration', () => {
    it('should return correct status config', () => {
      const scheduledConfig = getStatusConfig('scheduled');
      expect(scheduledConfig.label).toBe('Agendado');
      expect(scheduledConfig.color).toBe('#3B82F6');
      expect(scheduledConfig.allowedActions).toContain('complete');
    });

    it('should return correct allowed actions for therapist', () => {
      const actions = getAllowedActions('scheduled', 'therapist');
      expect(actions).toContain('edit');
      expect(actions).toContain('payment');
      expect(actions).toContain('complete');
    });

    it('should restrict actions for intern', () => {
      const actions = getAllowedActions('scheduled', 'intern');
      expect(actions).not.toContain('edit');
      expect(actions).not.toContain('payment');
      expect(actions).toContain('complete'); // Can mark status
    });
  });

  describe('Time Utilities', () => {
    it('should generate correct time slots', () => {
      const timeSlots = generateTimeSlots();
      expect(timeSlots).toContain('07:00');
      expect(timeSlots).toContain('18:30');
      expect(timeSlots).not.toContain('19:00');
      expect(timeSlots.length).toBe(24); // 12 hours * 2 slots per hour
    });

    it('should detect time conflicts', () => {
      const existingAppointments: Appointment[] = [{
        id: '1',
        patient_id: 'patient1',
        therapist_id: 'therapist1',
        date: '2024-01-15',
        start_time: '09:00',
        end_time: '10:00',
        status: 'scheduled',
        payment_status: 'pending',
        session_type: 'individual',
        notes: '',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }];

      const hasConflict = hasTimeConflict(
        existingAppointments,
        '2024-01-15',
        '09:30',
        '10:30'
      );

      expect(hasConflict).toBe(true);
    });

    it('should suggest alternative time slots', () => {
      const existingAppointments: Appointment[] = [{
        id: '1',
        patient_id: 'patient1',
        therapist_id: 'therapist1',
        date: '2024-01-15',
        start_time: '09:00',
        end_time: '10:00',
        status: 'scheduled',
        payment_status: 'pending',
        session_type: 'individual',
        notes: '',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }];

      const suggestions = suggestAlternativeTimeSlots(
        existingAppointments,
        '2024-01-15',
        '09:00',
        60
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).not.toContain('09:00'); // Should avoid conflict
    });
  });

  describe('Date Utilities', () => {
    it('should format dates correctly', () => {
      const date = new Date('2024-01-15T12:00:00Z'); // Use explicit UTC time
      const formatted = formatDate(date, 'dd/MM/yyyy');
      expect(formatted).toBe('15/01/2024');
    });

    it('should get week start correctly', () => {
      const date = new Date('2024-01-17'); // Wednesday
      const weekStart = getWeekStart(date);
      expect(weekStart.getDay()).toBe(1); // Monday
    });
  });
});