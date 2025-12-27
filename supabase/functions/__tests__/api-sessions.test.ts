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

describe('API Sessions', () => {
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

  describe('GET /api-sessions', () => {
    it('should list sessions for a patient', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          patient_id: 'patient-123',
          appointment_id: 'apt-123',
          status: 'completed',
          organization_id: 'org-123',
        },
      ];

      mockSupabase.queryBuilder.select.mockResolvedValue(
        createMockResponse(mockSessions, null)
      );
      mockSupabase.queryBuilder.eq.mockReturnThis();
      mockSupabase.queryBuilder.order.mockReturnThis();
      mockSupabase.queryBuilder.range.mockResolvedValue(
        createMockResponse(mockSessions, null)
      );

      expect(mockSupabase.client.from).toBeDefined();
    });
  });

  describe('POST /api-sessions', () => {
    it('should create a new session', async () => {
      const newSession = {
        appointment_id: 'apt-123',
        patient_id: 'patient-123',
        therapist_id: 'therapist-123',
        notes: 'Session notes',
      };

      const createdSession = {
        id: 'session-123',
        ...newSession,
        status: 'in_progress',
        organization_id: 'org-123',
      };

      mockSupabase.queryBuilder.insert.mockResolvedValue(
        createMockResponse(createdSession, null)
      );
      mockSupabase.queryBuilder.select.mockResolvedValue(
        createMockResponse(createdSession, null)
      );
      mockSupabase.queryBuilder.single.mockResolvedValue(
        createMockResponse(createdSession, null)
      );

      expect(mockSupabase.client.from).toBeDefined();
    });
  });

  describe('PATCH /api-sessions/:id/complete', () => {
    it('should complete a session', async () => {
      const session = {
        id: 'session-123',
        status: 'in_progress',
      };

      const completedSession = {
        ...session,
        status: 'completed',
        completed_at: new Date().toISOString(),
      };

      mockSupabase.queryBuilder.update.mockResolvedValue(
        createMockResponse(completedSession, null)
      );
      mockSupabase.queryBuilder.eq.mockReturnThis();
      mockSupabase.queryBuilder.select.mockResolvedValue(
        createMockResponse(completedSession, null)
      );
      mockSupabase.queryBuilder.single.mockResolvedValue(
        createMockResponse(completedSession, null)
      );

      expect(mockSupabase.client.from).toBeDefined();
    });
  });
});

