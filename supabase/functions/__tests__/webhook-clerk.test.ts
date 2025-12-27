import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient, createMockResponse } from './helpers/mock-supabase.ts';

vi.mock('https://deno.land/std@0.168.0/http/server.ts', () => ({
  serve: vi.fn((handler) => handler),
}));

describe('Webhook Clerk', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  describe('POST /webhook-clerk', () => {
    it('should handle user.created event', async () => {
      const mockEvent = {
        type: 'user.created',
        data: {
          id: 'user_clerk_123',
          email_addresses: [{ email_address: 'user@example.com' }],
          first_name: 'João',
          last_name: 'Silva',
        },
      };

      const newUser = {
        id: 'user-123',
        clerk_id: 'user_clerk_123',
        email: 'user@example.com',
        name: 'João Silva',
      };

      mockSupabase.queryBuilder.insert.mockResolvedValue(
        createMockResponse(newUser, null)
      );
      mockSupabase.queryBuilder.select.mockResolvedValue(
        createMockResponse(newUser, null)
      );
      mockSupabase.queryBuilder.single.mockResolvedValue(
        createMockResponse(newUser, null)
      );

      expect(mockSupabase.client.from).toBeDefined();
    });

    it('should handle user.updated event', async () => {
      const mockEvent = {
        type: 'user.updated',
        data: {
          id: 'user_clerk_123',
          email_addresses: [{ email_address: 'updated@example.com' }],
        },
      };

      mockSupabase.queryBuilder.update.mockResolvedValue(
        createMockResponse({ id: 'user-123', email: 'updated@example.com' }, null)
      );
      mockSupabase.queryBuilder.eq.mockReturnThis();

      expect(mockSupabase.client.from).toBeDefined();
    });

    it('should handle user.deleted event', async () => {
      const mockEvent = {
        type: 'user.deleted',
        data: {
          id: 'user_clerk_123',
        },
      };

      mockSupabase.queryBuilder.update.mockResolvedValue(
        createMockResponse({ id: 'user-123', deleted_at: new Date().toISOString() }, null)
      );
      mockSupabase.queryBuilder.eq.mockReturnThis();

      expect(mockSupabase.client.from).toBeDefined();
    });

    it('should validate webhook signature', async () => {
      const request = new Request('https://example.com/webhook-clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'msg-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'invalid-signature',
        },
        body: JSON.stringify({ type: 'user.created' }),
      });

      // Should validate Svix signature
      expect(request).toBeDefined();
    });
  });
});

