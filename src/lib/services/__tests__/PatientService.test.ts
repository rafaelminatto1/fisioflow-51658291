import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatientService } from '../PatientService';
import type { CreatePatientData, UpdatePatientData } from '../PatientService';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn()
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

describe('PatientService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchPatients', () => {
    it('should search patients by name', async () => {
      const mockPatients = [
        {
          id: '1',
          name: 'João Silva',
          phone: '11999999999',
          email: 'joao@email.com',
          session_price: 80.00,
          remaining_sessions: 5,
          status: 'active'
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockPatients,
                  error: null
                })
              })
            })
          })
        })
      });

      const result = await PatientService.searchPatients('João');

      expect(result).toEqual(mockPatients);
      expect(mockSupabase.from).toHaveBeenCalledWith('patients');
    });

    it('should handle search errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Search failed' }
                })
              })
            })
          })
        })
      });

      await expect(PatientService.searchPatients('João')).rejects.toThrow('Failed to search patients: Search failed');
    });
  });

  describe('getPatient', () => {
    it('should get patient by ID', async () => {
      const mockPatient = {
        id: '1',
        name: 'João Silva',
        phone: '11999999999',
        email: 'joao@email.com',
        session_price: 80.00,
        package_sessions: 10,
        remaining_sessions: 5,
        important_notes: 'Paciente regular',
        status: 'active'
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPatient,
              error: null
            })
          })
        })
      });

      const result = await PatientService.getPatient('1');

      expect(result).toEqual(mockPatient);
    });

    it('should return null for non-existent patient', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      });

      const result = await PatientService.getPatient('999');

      expect(result).toBeNull();
    });
  });

  describe('createPatient', () => {
    it('should create a new patient', async () => {
      const patientData: CreatePatientData = {
        name: 'Maria Santos',
        phone: '11888888888',
        email: 'maria@email.com',
        session_price: 90.00,
        package_sessions: 8,
        important_notes: 'Nova paciente'
      };

      const mockCreatedPatient = {
        id: '2',
        ...patientData,
        remaining_sessions: 8,
        status: 'active',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCreatedPatient,
              error: null
            })
          })
        })
      });

      const result = await PatientService.createPatient(patientData);

      expect(result).toEqual(mockCreatedPatient);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '',
        phone: '11888888888',
        email: 'maria@email.com',
        session_price: 90.00
      } as CreatePatientData;

      await expect(PatientService.createPatient(invalidData)).rejects.toThrow('Name, phone, and email are required');
    });

    it('should validate session price', async () => {
      const invalidData: CreatePatientData = {
        name: 'Maria Santos',
        phone: '11888888888',
        email: 'maria@email.com',
        session_price: 0
      };

      await expect(PatientService.createPatient(invalidData)).rejects.toThrow('Session price must be greater than 0');
    });
  });

  describe('updatePatient', () => {
    it('should update patient information', async () => {
      const updates: UpdatePatientData = {
        session_price: 100.00,
        important_notes: 'Preço atualizado'
      };

      const mockUpdatedPatient = {
        id: '1',
        name: 'João Silva',
        session_price: 100.00,
        important_notes: 'Preço atualizado'
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedPatient,
                error: null
              })
            })
          })
        })
      });

      const result = await PatientService.updatePatient('1', updates);

      expect(result).toEqual(mockUpdatedPatient);
    });
  });

  describe('getPatientFinancialData', () => {
    it('should get complete financial data for patient', async () => {
      const mockPatient = {
        id: '1',
        session_price: 80.00,
        package_sessions: 10,
        remaining_sessions: 5
      };

      const mockFinancialSummary = [{
        total_sessions_purchased: 20,
        total_sessions_used: 15,
        total_sessions_remaining: 5,
        total_amount_paid: 1600.00,
        pending_payments_count: 2,
        last_payment_date: '2024-01-15T10:00:00Z'
      }];

      const mockRecentAppointments = [
        { id: '1' }, { id: '2' }, { id: '3' }
      ];

      // Mock patient data fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPatient,
              error: null
            })
          })
        })
      });

      // Mock financial summary RPC
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockFinancialSummary,
        error: null
      });

      // Mock recent appointments fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({
                data: mockRecentAppointments,
                error: null
              })
            })
          })
        })
      });

      const result = await PatientService.getPatientFinancialData('1');

      expect(result).toEqual({
        patient_id: '1',
        session_price: 80.00,
        package_sessions: 10,
        remaining_sessions: 5,
        total_sessions_purchased: 20,
        total_sessions_used: 15,
        total_amount_paid: 1600.00,
        pending_payments_count: 2,
        last_payment_date: '2024-01-15T10:00:00Z',
        average_monthly_sessions: 0.5 // 3 appointments / 6 months
      });
    });
  });

  describe('getPatientAppointmentSummary', () => {
    it('should calculate appointment statistics', async () => {
      const mockAppointments = [
        { id: '1', patient_id: '1', status: 'completed', date: '2024-01-10' },
        { id: '2', patient_id: '1', status: 'completed', date: '2024-01-12' },
        { id: '3', patient_id: '1', status: 'missed', date: '2024-01-14' },
        { id: '4', patient_id: '1', status: 'scheduled', date: '2024-01-20' },
        { id: '5', patient_id: '1', status: 'cancelled', date: '2024-01-16' }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockAppointments,
              error: null
            })
          })
        })
      });

      const result = await PatientService.getPatientAppointmentSummary('1');

      expect(result.patient_id).toBe('1');
      expect(result.total_appointments).toBe(5);
      expect(result.completed_sessions).toBe(2);
      expect(result.missed_sessions).toBe(1);
      expect(result.cancelled_sessions).toBe(1);
    });
  });

  describe('updatePatientSessions', () => {
    it('should update remaining sessions', async () => {
      const mockPatient = { remaining_sessions: 10 };
      const mockUpdatedPatient = {
        id: '1',
        remaining_sessions: 8
      };

      // Mock fetch current sessions
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPatient,
              error: null
            })
          })
        })
      });

      // Mock update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedPatient,
                error: null
              })
            })
          })
        })
      });

      const result = await PatientService.updatePatientSessions('1', 2);

      expect(result.remaining_sessions).toBe(8);
    });

    it('should not allow negative sessions', async () => {
      const mockPatient = { remaining_sessions: 1 };
      const mockUpdatedPatient = {
        id: '1',
        remaining_sessions: 0
      };

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPatient,
              error: null
            })
          })
        })
      });

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedPatient,
                error: null
              })
            })
          })
        })
      });

      const result = await PatientService.updatePatientSessions('1', 5);

      expect(result.remaining_sessions).toBe(0);
    });
  });

  describe('getPatientStats', () => {
    it('should calculate patient statistics', async () => {
      const mockPatients = [
        { status: 'active', remaining_sessions: 5 },
        { status: 'active', remaining_sessions: 0 },
        { status: 'inactive', remaining_sessions: 2 },
        { status: 'active', remaining_sessions: 3 }
      ];

      const mockPendingPayments = [
        { patient_id: '1' },
        { patient_id: '2' },
        { patient_id: '1' } // Duplicate should be counted once
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: mockPatients,
            error: null
          })
        })
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockPendingPayments,
            error: null
          })
        })
      });

      const result = await PatientService.getPatientStats();

      expect(result).toEqual({
        total_active: 3,
        total_inactive: 1,
        with_pending_payments: 2, // Unique patient IDs
        with_remaining_sessions: 2 // Active patients with sessions > 0
      });
    });
  });
});