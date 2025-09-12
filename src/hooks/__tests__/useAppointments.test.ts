import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appointmentKeys } from '../useAppointments';
import { AppointmentService } from '@/lib/services/AppointmentService';
import type { CreateAppointmentData, UpdateAppointmentData } from '@/types/agenda';

// Mock AppointmentService
vi.mock('@/lib/services/AppointmentService', () => ({
  AppointmentService: {
    getAppointment: vi.fn(),
    getAppointments: vi.fn(),
    getPatientAppointments: vi.fn(),
    getTherapistAppointments: vi.fn(),
    createAppointment: vi.fn(),
    updateAppointment: vi.fn(),
    deleteAppointment: vi.fn(),
    updateAppointmentStatus: vi.fn(),
    updatePaymentStatus: vi.fn(),
    rescheduleAppointment: vi.fn(),
  }
}));

// Mock utils
vi.mock('@/utils/agendaUtils', () => ({
  getWeekStart: vi.fn(),
  formatDate: vi.fn(),
}));

describe('useAppointments hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('appointmentKeys', () => {
    it('should generate correct query keys', () => {
      expect(appointmentKeys.all).toEqual(['appointments']);
      expect(appointmentKeys.byId('apt1')).toEqual(['appointments', 'byId', 'apt1']);
      expect(appointmentKeys.byPatient('patient1')).toEqual(['appointments', 'byPatient', 'patient1']);
      expect(appointmentKeys.byTherapist('therapist1')).toEqual(['appointments', 'byTherapist', 'therapist1']);
      
      const filters = { therapist_id: 'therapist1', status: ['scheduled'] };
      expect(appointmentKeys.filtered(filters)).toEqual(['appointments', 'filtered', filters]);
    });
  });

  describe('AppointmentService integration', () => {
    it('should have all required CRUD methods', () => {
      expect(AppointmentService.getAppointment).toBeDefined();
      expect(AppointmentService.getAppointments).toBeDefined();
      expect(AppointmentService.createAppointment).toBeDefined();
      expect(AppointmentService.updateAppointment).toBeDefined();
      expect(AppointmentService.deleteAppointment).toBeDefined();
    });

    it('should have status update methods', () => {
      expect(AppointmentService.updateAppointmentStatus).toBeDefined();
      expect(AppointmentService.updatePaymentStatus).toBeDefined();
      expect(AppointmentService.rescheduleAppointment).toBeDefined();
    });

    it('should have patient and therapist specific methods', () => {
      expect(AppointmentService.getPatientAppointments).toBeDefined();
      expect(AppointmentService.getTherapistAppointments).toBeDefined();
    });
  });

  describe('appointment operations', () => {
    it('should create appointment with correct data', async () => {
      const appointmentData: CreateAppointmentData = {
        patient_id: 'patient1',
        therapist_id: 'therapist1',
        date: '2024-01-15',
        start_time: '09:00',
        end_time: '10:00',
        session_type: 'individual',
        notes: 'First session'
      };

      const mockCreatedAppointment = {
        id: 'apt1',
        ...appointmentData,
        status: 'scheduled' as const,
        payment_status: 'pending' as const,
        created_at: '2024-01-15T09:00:00Z',
        updated_at: '2024-01-15T09:00:00Z'
      };

      vi.mocked(AppointmentService.createAppointment).mockResolvedValue(mockCreatedAppointment);

      const result = await AppointmentService.createAppointment(appointmentData);

      expect(result).toEqual(mockCreatedAppointment);
      expect(AppointmentService.createAppointment).toHaveBeenCalledWith(appointmentData);
    });

    it('should update appointment with partial data', async () => {
      const updates: UpdateAppointmentData = {
        start_time: '10:00',
        end_time: '11:00',
        notes: 'Updated session time'
      };

      const mockUpdatedAppointment = {
        id: 'apt1',
        patient_id: 'patient1',
        therapist_id: 'therapist1',
        date: '2024-01-15',
        start_time: '10:00',
        end_time: '11:00',
        status: 'scheduled' as const,
        payment_status: 'pending' as const,
        session_type: 'individual' as const,
        notes: 'Updated session time',
        created_at: '2024-01-15T09:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      };

      vi.mocked(AppointmentService.updateAppointment).mockResolvedValue(mockUpdatedAppointment);

      const result = await AppointmentService.updateAppointment('apt1', updates);

      expect(result).toEqual(mockUpdatedAppointment);
      expect(AppointmentService.updateAppointment).toHaveBeenCalledWith('apt1', updates);
    });

    it('should delete appointment', async () => {
      vi.mocked(AppointmentService.deleteAppointment).mockResolvedValue(undefined);

      await AppointmentService.deleteAppointment('apt1');

      expect(AppointmentService.deleteAppointment).toHaveBeenCalledWith('apt1');
    });
  });

  describe('status updates', () => {
    it('should update appointment status', async () => {
      const mockUpdatedAppointment = {
        id: 'apt1',
        patient_id: 'patient1',
        therapist_id: 'therapist1',
        date: '2024-01-15',
        start_time: '09:00',
        end_time: '10:00',
        status: 'completed' as const,
        payment_status: 'pending' as const,
        session_type: 'individual' as const,
        notes: '',
        created_at: '2024-01-15T09:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      };

      vi.mocked(AppointmentService.updateAppointmentStatus).mockResolvedValue(mockUpdatedAppointment);

      const result = await AppointmentService.updateAppointmentStatus('apt1', 'completed');

      expect(result).toEqual(mockUpdatedAppointment);
      expect(AppointmentService.updateAppointmentStatus).toHaveBeenCalledWith('apt1', 'completed');
    });

    it('should update payment status', async () => {
      const mockUpdatedAppointment = {
        id: 'apt1',
        patient_id: 'patient1',
        therapist_id: 'therapist1',
        date: '2024-01-15',
        start_time: '09:00',
        end_time: '10:00',
        status: 'scheduled' as const,
        payment_status: 'paid' as const,
        session_type: 'individual' as const,
        notes: '',
        created_at: '2024-01-15T09:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      };

      vi.mocked(AppointmentService.updatePaymentStatus).mockResolvedValue(mockUpdatedAppointment);

      const result = await AppointmentService.updatePaymentStatus('apt1', 'paid');

      expect(result).toEqual(mockUpdatedAppointment);
      expect(AppointmentService.updatePaymentStatus).toHaveBeenCalledWith('apt1', 'paid');
    });
  });

  describe('reschedule operations', () => {
    it('should reschedule appointment', async () => {
      const mockRescheduledAppointment = {
        id: 'apt1',
        patient_id: 'patient1',
        therapist_id: 'therapist1',
        date: '2024-01-16',
        start_time: '14:00',
        end_time: '15:00',
        status: 'scheduled' as const,
        payment_status: 'pending' as const,
        session_type: 'individual' as const,
        notes: '',
        created_at: '2024-01-15T09:00:00Z',
        updated_at: '2024-01-15T11:00:00Z'
      };

      vi.mocked(AppointmentService.rescheduleAppointment).mockResolvedValue(mockRescheduledAppointment);

      const result = await AppointmentService.rescheduleAppointment(
        'apt1',
        '2024-01-16',
        '14:00',
        '15:00'
      );

      expect(result).toEqual(mockRescheduledAppointment);
      expect(AppointmentService.rescheduleAppointment).toHaveBeenCalledWith(
        'apt1',
        '2024-01-16',
        '14:00',
        '15:00'
      );
    });
  });

  describe('filtered queries', () => {
    it('should get appointments with filters', async () => {
      const filters = {
        therapist_id: 'therapist1',
        status: ['scheduled', 'completed'] as const,
        date_from: '2024-01-01',
        date_to: '2024-01-31'
      };

      const mockAppointments = [
        {
          id: 'apt1',
          patient_id: 'patient1',
          therapist_id: 'therapist1',
          date: '2024-01-15',
          start_time: '09:00',
          end_time: '10:00',
          status: 'scheduled' as const,
          payment_status: 'pending' as const,
          session_type: 'individual' as const,
          notes: '',
          created_at: '2024-01-15T09:00:00Z',
          updated_at: '2024-01-15T09:00:00Z'
        }
      ];

      vi.mocked(AppointmentService.getAppointments).mockResolvedValue(mockAppointments);

      const result = await AppointmentService.getAppointments(filters);

      expect(result).toEqual(mockAppointments);
      expect(AppointmentService.getAppointments).toHaveBeenCalledWith(filters);
    });

    it('should get patient appointments', async () => {
      const patientId = 'patient1';
      const filters = { status: ['scheduled'] };

      const mockAppointments = [
        {
          id: 'apt1',
          patient_id: 'patient1',
          therapist_id: 'therapist1',
          date: '2024-01-15',
          start_time: '09:00',
          end_time: '10:00',
          status: 'scheduled' as const,
          payment_status: 'pending' as const,
          session_type: 'individual' as const,
          notes: '',
          created_at: '2024-01-15T09:00:00Z',
          updated_at: '2024-01-15T09:00:00Z'
        }
      ];

      vi.mocked(AppointmentService.getPatientAppointments).mockResolvedValue(mockAppointments);

      const result = await AppointmentService.getPatientAppointments(patientId, filters);

      expect(result).toEqual(mockAppointments);
      expect(AppointmentService.getPatientAppointments).toHaveBeenCalledWith(patientId, filters);
    });

    it('should get therapist appointments', async () => {
      const therapistId = 'therapist1';
      const filters = { date_from: '2024-01-01' };

      const mockAppointments = [
        {
          id: 'apt1',
          patient_id: 'patient1',
          therapist_id: 'therapist1',
          date: '2024-01-15',
          start_time: '09:00',
          end_time: '10:00',
          status: 'scheduled' as const,
          payment_status: 'pending' as const,
          session_type: 'individual' as const,
          notes: '',
          created_at: '2024-01-15T09:00:00Z',
          updated_at: '2024-01-15T09:00:00Z'
        }
      ];

      vi.mocked(AppointmentService.getTherapistAppointments).mockResolvedValue(mockAppointments);

      const result = await AppointmentService.getTherapistAppointments(therapistId, filters);

      expect(result).toEqual(mockAppointments);
      expect(AppointmentService.getTherapistAppointments).toHaveBeenCalledWith(therapistId, filters);
    });
  });
});