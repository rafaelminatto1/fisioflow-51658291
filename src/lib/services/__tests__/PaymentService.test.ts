import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CreatePaymentData, PaymentType, PaymentMethod } from '@/types/agenda';

// Mock Supabase client first
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn()
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// Import PaymentService after mocking
const { PaymentService } = await import('../PaymentService');

describe('PaymentService', () => {
  const mockSupabaseFrom = vi.mocked(mockSupabase.from);
  const mockSupabaseRpc = vi.mocked(mockSupabase.rpc);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a payment successfully', async () => {
      const paymentData: CreatePaymentData = {
        appointment_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 80.00,
        payment_type: 'session',
        payment_method: 'cash',
        notes: 'Payment received'
      };

      const mockAppointment = {
        id: paymentData.appointment_id,
        patient_id: '123e4567-e89b-12d3-a456-426614174001',
        therapist_id: '123e4567-e89b-12d3-a456-426614174002'
      };

      const mockPayment = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        ...paymentData,
        paid_at: '2024-01-15T10:00:00Z',
        created_at: '2024-01-15T10:00:00Z'
      };

      // Mock appointment lookup
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockAppointment,
              error: null
            })
          })
        })
      } as any);

      // Mock payment creation
      mockSupabaseFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPayment,
              error: null
            })
          })
        })
      } as any);

      const result = await PaymentService.createPayment(paymentData);

      expect(result).toEqual(mockPayment);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('appointments');
      expect(mockSupabaseFrom).toHaveBeenCalledWith('payments');
    });

    it('should throw error if appointment not found', async () => {
      const paymentData: CreatePaymentData = {
        appointment_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 80.00,
        payment_type: 'session',
        payment_method: 'cash'
      };

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      } as any);

      await expect(PaymentService.createPayment(paymentData)).rejects.toThrow('Appointment not found');
    });

    it('should validate package payments require sessions_count', async () => {
      const paymentData: CreatePaymentData = {
        appointment_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 400.00,
        payment_type: 'package',
        payment_method: 'card'
        // Missing sessions_count
      };

      await expect(PaymentService.createPayment(paymentData)).rejects.toThrow();
    });
  });

  describe('getAppointmentPayments', () => {
    it('should fetch payments for an appointment', async () => {
      const appointmentId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPayments = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          appointment_id: appointmentId,
          amount: 80.00,
          payment_type: 'session',
          payment_method: 'cash'
        }
      ];

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockPayments,
              error: null
            })
          })
        })
      } as any);

      const result = await PaymentService.getAppointmentPayments(appointmentId);

      expect(result).toEqual(mockPayments);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('payments');
    });
  });

  describe('getPatientSessionPackages', () => {
    it('should fetch session packages for a patient', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPackages = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          patient_id: patientId,
          total_sessions: 10,
          used_sessions: 3,
          remaining_sessions: 7
        }
      ];

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockPackages,
              error: null
            })
          })
        })
      } as any);

      const result = await PaymentService.getPatientSessionPackages(patientId);

      expect(result).toEqual(mockPackages);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('patient_sessions');
    });
  });

  describe('useSessionFromPackage', () => {
    it('should use a session from the oldest active package', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPackage = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        patient_id: patientId,
        total_sessions: 10,
        used_sessions: 3,
        remaining_sessions: 7
      };

      // Mock getActiveSessionPackages
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [mockPackage],
                  error: null
                })
              })
            })
          })
        })
      } as any);

      // Mock update
      mockSupabaseFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        })
      } as any);

      const result = await PaymentService.useSessionFromPackage(patientId);

      expect(result).toBe(true);
    });

    it('should return false if no active packages available', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const result = await PaymentService.useSessionFromPackage(patientId);

      expect(result).toBe(false);
    });
  });

  describe('getPatientFinancialSummary', () => {
    it('should fetch financial summary for a patient', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const mockSummary = {
        total_sessions_purchased: 20,
        total_sessions_used: 8,
        total_sessions_remaining: 12,
        total_amount_paid: 1600.00,
        pending_payments_count: 2,
        last_payment_date: '2024-01-15T10:00:00Z'
      };

      mockSupabaseRpc.mockResolvedValueOnce({
        data: [mockSummary],
        error: null
      });

      const result = await PaymentService.getPatientFinancialSummary(patientId);

      expect(result).toEqual(mockSummary);
      expect(mockSupabaseRpc).toHaveBeenCalledWith('get_patient_financial_summary', {
        p_patient_id: patientId
      });
    });
  });

  describe('markAppointmentAsPaid', () => {
    it('should mark appointment as paid with payment details', async () => {
      const appointmentId = '123e4567-e89b-12d3-a456-426614174000';
      const amount = 80.00;
      const paymentType: PaymentType = 'session';
      const paymentMethod: PaymentMethod = 'card';

      const mockAppointment = {
        id: appointmentId,
        patient_id: '123e4567-e89b-12d3-a456-426614174001',
        therapist_id: '123e4567-e89b-12d3-a456-426614174002'
      };

      const mockPayment = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        appointment_id: appointmentId,
        amount,
        payment_type: paymentType,
        payment_method: paymentMethod,
        paid_at: '2024-01-15T10:00:00Z',
        created_at: '2024-01-15T10:00:00Z'
      };

      // Mock appointment lookup
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockAppointment,
              error: null
            })
          })
        })
      } as any);

      // Mock payment creation
      mockSupabaseFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPayment,
              error: null
            })
          })
        })
      } as any);

      const result = await PaymentService.markAppointmentAsPaid(
        appointmentId,
        amount,
        paymentType,
        paymentMethod
      );

      expect(result).toEqual(mockPayment);
    });
  });

  describe('getPaymentStats', () => {
    it('should calculate payment statistics for date range', async () => {
      const dateFrom = '2024-01-01';
      const dateTo = '2024-01-31';
      const mockPayments = [
        { amount: 80, payment_type: 'session', payment_method: 'cash' },
        { amount: 400, payment_type: 'package', payment_method: 'card' },
        { amount: 80, payment_type: 'session', payment_method: 'pix' }
      ];

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({
              data: mockPayments,
              error: null
            })
          })
        })
      } as any);

      const result = await PaymentService.getPaymentStats(dateFrom, dateTo);

      expect(result).toEqual({
        total_amount: 560,
        session_payments: 160,
        package_payments: 400,
        cash_payments: 80,
        card_payments: 400,
        pix_payments: 80,
        transfer_payments: 0
      });
    });
  });

  describe('calculateRemainingSessionsForPatient', () => {
    it('should calculate total remaining sessions from all active packages', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPackages = [
        { remaining_sessions: 5 },
        { remaining_sessions: 3 },
        { remaining_sessions: 2 }
      ];

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockPackages,
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const result = await PaymentService.calculateRemainingSessionsForPatient(patientId);

      expect(result).toBe(10); // 5 + 3 + 2
    });
  });
});