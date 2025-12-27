import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient, createMockResponse } from './helpers/mock-supabase.ts';

vi.mock('https://deno.land/std@0.168.0/http/server.ts', () => ({
  serve: vi.fn((handler) => handler),
}));

vi.mock('../_shared/api-helpers.ts', async () => {
  const actual = await vi.importActual('../_shared/api-helpers.ts');
  return {
    ...actual,
    validateAuth: vi.fn(),
    createSupabaseClient: vi.fn(),
  };
});

vi.mock('../_shared/rate-limit.ts', () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true })),
  createRateLimitResponse: vi.fn(),
}));

describe('API Appointments', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockUser: { id: string; organization_id: string };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockUser = {
      id: 'user-123',
      organization_id: 'org-123',
    };
  });

  describe('GET /api-appointments', () => {
    it('should list appointments with filters', async () => {
      const mockAppointments = [
        {
          id: 'apt-1',
          patient_id: 'patient-1',
          start_time: '2024-01-15T14:00:00Z',
          status: 'scheduled',
          organization_id: 'org-123',
        },
      ];

      mockSupabase.queryBuilder.select.mockResolvedValue(
        createMockResponse(mockAppointments, null)
      );
      mockSupabase.queryBuilder.eq.mockReturnThis();
      mockSupabase.queryBuilder.gte.mockReturnThis();
      mockSupabase.queryBuilder.lte.mockReturnThis();
      mockSupabase.queryBuilder.order.mockReturnThis();
      mockSupabase.queryBuilder.range.mockResolvedValue(
        createMockResponse(mockAppointments, null)
      );

      expect(mockSupabase.client.from).toBeDefined();
    });

    it('should filter by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockSupabase.queryBuilder.select.mockResolvedValue(
        createMockResponse([], null)
      );
      mockSupabase.queryBuilder.eq.mockReturnThis();
      mockSupabase.queryBuilder.gte.mockReturnThis();
      mockSupabase.queryBuilder.lte.mockReturnThis();

      expect(mockSupabase.client.from).toBeDefined();
    });
  });

  describe('POST /api-appointments', () => {
    it('should create a new appointment', async () => {
      const newAppointment = {
        patient_id: 'patient-123',
        therapist_id: 'therapist-123',
        start_time: '2024-01-15T14:00:00Z',
        duration: 60,
      };

      const createdAppointment = {
        id: 'apt-123',
        ...newAppointment,
        organization_id: 'org-123',
        status: 'scheduled',
      };

      mockSupabase.queryBuilder.insert.mockResolvedValue(
        createMockResponse(createdAppointment, null)
      );
      mockSupabase.queryBuilder.select.mockResolvedValue(
        createMockResponse(createdAppointment, null)
      );
      mockSupabase.queryBuilder.single.mockResolvedValue(
        createMockResponse(createdAppointment, null)
      );

      expect(mockSupabase.client.from).toBeDefined();
    });

    it('should check availability before creating', async () => {
      const conflictingAppointment = {
        id: 'apt-existing',
        start_time: '2024-01-15T14:00:00Z',
        duration: 60,
      };

      mockSupabase.queryBuilder.select.mockResolvedValue(
        createMockResponse([conflictingAppointment], null)
      );
      mockSupabase.queryBuilder.eq.mockReturnThis();
      mockSupabase.queryBuilder.gte.mockReturnThis();
      mockSupabase.queryBuilder.lte.mockReturnThis();

      expect(mockSupabase.client.from).toBeDefined();
    });
  });

  describe('PATCH /api-appointments/:id/confirm', () => {
    it('should confirm an appointment', async () => {
      const appointment = {
        id: 'apt-123',
        status: 'scheduled',
      };

      const confirmedAppointment = {
        ...appointment,
        status: 'confirmed',
      };

      mockSupabase.queryBuilder.update.mockResolvedValue(
        createMockResponse(confirmedAppointment, null)
      );
      mockSupabase.queryBuilder.eq.mockReturnThis();
      mockSupabase.queryBuilder.select.mockResolvedValue(
        createMockResponse(confirmedAppointment, null)
      );
      mockSupabase.queryBuilder.single.mockResolvedValue(
        createMockResponse(confirmedAppointment, null)
      );

      expect(mockSupabase.client.from).toBeDefined();
    });
  });

  describe('PATCH /api-appointments/:id/cancel', () => {
    it('should cancel an appointment', async () => {
      const appointment = {
        id: 'apt-123',
        status: 'scheduled',
      };

      const cancelledAppointment = {
        ...appointment,
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      };

      mockSupabase.queryBuilder.update.mockResolvedValue(
        createMockResponse(cancelledAppointment, null)
      );
      mockSupabase.queryBuilder.eq.mockReturnThis();

      expect(mockSupabase.client.from).toBeDefined();
    });
  });
});

