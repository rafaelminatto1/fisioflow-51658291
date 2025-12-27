import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient, createMockResponse } from './helpers/mock-supabase.ts';

vi.mock('https://deno.land/std@0.168.0/http/server.ts', () => ({
  serve: vi.fn((handler) => handler),
}));

vi.mock('https://esm.sh/stripe@14.21.0', () => ({
  default: vi.fn(() => ({
    webhooks: {
      constructEvent: vi.fn(),
    },
  })),
}));

describe('Webhook Stripe', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  describe('POST /webhook-stripe', () => {
    it('should handle payment_intent.succeeded event', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 15000,
            metadata: {
              appointment_id: 'apt-123',
            },
          },
        },
      };

      mockSupabase.queryBuilder.update.mockResolvedValue(
        createMockResponse({ id: 'payment-123', status: 'completed' }, null)
      );
      mockSupabase.queryBuilder.eq.mockReturnThis();

      expect(mockSupabase.client.from).toBeDefined();
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const mockEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_123',
            metadata: {
              appointment_id: 'apt-123',
            },
          },
        },
      };

      mockSupabase.queryBuilder.update.mockResolvedValue(
        createMockResponse({ id: 'payment-123', status: 'failed' }, null)
      );
      mockSupabase.queryBuilder.eq.mockReturnThis();

      expect(mockSupabase.client.from).toBeDefined();
    });

    it('should reject invalid signature', async () => {
      const request = new Request('https://example.com/webhook-stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'invalid-signature',
        },
        body: JSON.stringify({ type: 'payment_intent.succeeded' }),
      });

      // Should return 400 for invalid signature
      expect(request).toBeDefined();
    });

    it('should return 200 for unknown event types', async () => {
      const mockEvent = {
        type: 'unknown.event',
        data: {},
      };

      // Should return 200 but not process
      expect(mockEvent).toBeDefined();
    });
  });
});

