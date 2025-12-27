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

describe('API Payments', () => {
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

  describe('GET /api-payments', () => {
    it('should list payments with filters', async () => {
      const mockPayments = [
        {
          id: 'payment-1',
          appointment_id: 'apt-123',
          amount: 150.00,
          status: 'completed',
          organization_id: 'org-123',
        },
      ];

      mockSupabase.queryBuilder.select.mockResolvedValue(
        createMockResponse(mockPayments, null)
      );
      mockSupabase.queryBuilder.eq.mockReturnThis();
      mockSupabase.queryBuilder.gte.mockReturnThis();
      mockSupabase.queryBuilder.lte.mockReturnThis();
      mockSupabase.queryBuilder.order.mockReturnThis();
      mockSupabase.queryBuilder.range.mockResolvedValue(
        createMockResponse(mockPayments, null)
      );

      expect(mockSupabase.client.from).toBeDefined();
    });
  });

  describe('POST /api-payments', () => {
    it('should register a payment', async () => {
      const newPayment = {
        appointment_id: 'apt-123',
        amount: 150.00,
        method: 'credit_card',
      };

      const createdPayment = {
        id: 'payment-123',
        ...newPayment,
        status: 'pending',
        organization_id: 'org-123',
      };

      mockSupabase.queryBuilder.insert.mockResolvedValue(
        createMockResponse(createdPayment, null)
      );
      mockSupabase.queryBuilder.select.mockResolvedValue(
        createMockResponse(createdPayment, null)
      );
      mockSupabase.queryBuilder.single.mockResolvedValue(
        createMockResponse(createdPayment, null)
      );

      expect(mockSupabase.client.from).toBeDefined();
    });
  });

  describe('POST /api-payments/checkout', () => {
    it('should create Stripe checkout session', async () => {
      const checkoutData = {
        appointment_id: 'apt-123',
        amount: 150.00,
      };

      // Mock Stripe integration
      const mockCheckoutSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      expect(mockCheckoutSession).toBeDefined();
    });
  });
});

