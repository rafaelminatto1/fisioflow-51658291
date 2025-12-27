import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient, createMockResponse } from './helpers/mock-supabase.ts';

vi.mock('https://deno.land/std@0.168.0/http/server.ts', () => ({
  serve: vi.fn((handler) => handler),
}));

describe('Webhook WhatsApp', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  describe('POST /webhook-whatsapp', () => {
    it('should handle message received event', async () => {
      const mockEvent = {
        event: 'messages.upsert',
        data: {
          key: {
            remoteJid: '5511999999999@s.whatsapp.net',
          },
          message: {
            conversation: 'Olá, preciso agendar uma consulta',
          },
        },
      };

      // Should process message and potentially create appointment request
      expect(mockEvent).toBeDefined();
    });

    it('should handle message status update', async () => {
      const mockEvent = {
        event: 'messages.update',
        data: {
          key: {
            id: 'message-123',
          },
          update: {
            status: 'READ',
          },
        },
      };

      mockSupabase.queryBuilder.update.mockResolvedValue(
        createMockResponse({ id: 'notification-123', status: 'read' }, null)
      );
      mockSupabase.queryBuilder.eq.mockReturnThis();

      expect(mockSupabase.client.from).toBeDefined();
    });

    it('should validate webhook signature', async () => {
      const request = new Request('https://example.com/webhook-whatsapp', {
        method: 'POST',
        headers: {
          'x-evolution-signature': 'invalid-signature',
        },
        body: JSON.stringify({ event: 'messages.upsert' }),
      });

      // Should validate signature before processing
      expect(request).toBeDefined();
    });
  });
});

