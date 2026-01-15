import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client - cria um mock encadeado que suporta ambos os padrões
function createMockChain() {
  const mock = vi.fn()
  mock.chain = vi.fn()
  mock.single = vi.fn()
  mock.eq = vi.fn(() => mock)
  mock.select = vi.fn(() => mock)
  mock.insert = vi.fn(() => mock)
  mock.update = vi.fn(() => mock)
  mock.gte = vi.fn(() => mock)
  mock.lte = vi.fn(() => mock)
  return mock
}

const mockSupabaseClient = {
  from: vi.fn(() => createMockChain()),
  rpc: vi.fn()
}

// Mock web-push
const mockWebPush = {
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn()
}

// Mock environment
process.env.VAPID_PUBLIC_KEY = 'test-public-key'
process.env.VAPID_PRIVATE_KEY = 'test-private-key'
process.env.VAPID_SUBJECT = 'mailto:test@example.com'

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient
}))

vi.mock('web-push', () => mockWebPush)

describe('Send Notification Edge Function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sendNotification function', () => {
    it('should send notification to single user successfully', async () => {
      const mockSubscription = {
        id: 'sub-1',
        user_id: 'user-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key'
      }

      const mockNotificationPayload = {
        type: 'appointment_reminder',
        title: 'Lembrete de Consulta',
        body: 'Você tem uma consulta em 1 hora',
        data: {
          appointmentId: 'apt-123',
          url: '/schedule'
        },
        actions: [
          { action: 'confirm', title: 'Confirmar' },
          { action: 'reschedule', title: 'Reagendar' }
        ]
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockSubscription,
        error: null
      })

      mockWebPush.sendNotification.mockResolvedValue({
        statusCode: 201,
        body: 'Success'
      })

      mockSupabaseClient.from().insert.mockResolvedValue({
        data: { id: 'history-1' },
        error: null
      })

      // Import and test the function
      const { sendNotification } = await import('../send-notification/index.ts')
      
      const result = await sendNotification('user-1', mockNotificationPayload)

      expect(result.success).toBe(true)
      expect(mockWebPush.sendNotification).toHaveBeenCalledWith(
        {
          endpoint: mockSubscription.endpoint,
          keys: {
            p256dh: mockSubscription.p256dh,
            auth: mockSubscription.auth
          }
        },
        JSON.stringify(mockNotificationPayload),
        {
          vapidDetails: {
            subject: process.env.VAPID_SUBJECT,
            publicKey: process.env.VAPID_PUBLIC_KEY,
            privateKey: process.env.VAPID_PRIVATE_KEY
          },
          TTL: 86400
        }
      )
    })

    it('should handle user without subscription', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Not found
      })

      const { sendNotification } = await import('../send-notification/index.ts')
      
      const result = await sendNotification('user-without-sub', {
        type: 'test',
        title: 'Test',
        body: 'Test'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('No subscription found for user')
    })

    it('should handle web-push send failure', async () => {
      const mockSubscription = {
        id: 'sub-1',
        user_id: 'user-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key'
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockSubscription,
        error: null
      })

      mockWebPush.sendNotification.mockRejectedValue(new Error('Push service error'))

      mockSupabaseClient.from().insert.mockResolvedValue({
        data: { id: 'history-1' },
        error: null
      })

      const { sendNotification } = await import('../send-notification/index.ts')
      
      const result = await sendNotification('user-1', {
        type: 'test',
        title: 'Test',
        body: 'Test'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Push service error')
    })

    it('should handle expired subscription (410 status)', async () => {
      const mockSubscription = {
        id: 'sub-1',
        user_id: 'user-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key'
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockSubscription,
        error: null
      })

      const expiredError = new Error('Subscription expired')
      ;(expiredError as any).statusCode = 410

      mockWebPush.sendNotification.mockRejectedValue(expiredError)

      // Mock subscription deletion
      mockSupabaseClient.from().delete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })

      const { sendNotification } = await import('../send-notification/index.ts')
      
      const result = await sendNotification('user-1', {
        type: 'test',
        title: 'Test',
        body: 'Test'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Subscription expired')
      
      // Should delete expired subscription
      expect(mockSupabaseClient.from().delete).toHaveBeenCalled()
    })

    it('should validate notification payload', async () => {
      const { sendNotification } = await import('../send-notification/index.ts')
      
      // Test missing required fields
      const result = await sendNotification('user-1', {
        type: 'test'
        // Missing title and body
      } as any)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid notification payload')
    })

    it('should handle notification with custom options', async () => {
      const mockSubscription = {
        id: 'sub-1',
        user_id: 'user-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key'
      }

      const mockNotificationPayload = {
        type: 'system_alert',
        title: 'Sistema em Manutenção',
        body: 'O sistema estará em manutenção das 22:00 às 02:00',
        icon: '/icons/maintenance.png',
        badge: '/icons/badge.png',
        image: '/images/maintenance-banner.jpg',
        requireInteraction: true,
        silent: false,
        tag: 'maintenance-alert',
        data: {
          maintenanceId: 'maint-123',
          url: '/maintenance'
        }
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockSubscription,
        error: null
      })

      mockWebPush.sendNotification.mockResolvedValue({
        statusCode: 201,
        body: 'Success'
      })

      const { sendNotification } = await import('../send-notification/index.ts')
      
      const result = await sendNotification('user-1', mockNotificationPayload)

      expect(result.success).toBe(true)
      expect(mockWebPush.sendNotification).toHaveBeenCalledWith(
        expect.any(Object),
        JSON.stringify(mockNotificationPayload),
        expect.objectContaining({
          vapidDetails: expect.any(Object),
          TTL: 86400
        })
      )
    })

    it('should log notification history', async () => {
      const mockSubscription = {
        id: 'sub-1',
        user_id: 'user-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key'
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockSubscription,
        error: null
      })

      mockWebPush.sendNotification.mockResolvedValue({
        statusCode: 201,
        body: 'Success'
      })

      mockSupabaseClient.from().insert.mockResolvedValue({
        data: { id: 'history-1' },
        error: null
      })

      const { sendNotification } = await import('../send-notification/index.ts')
      
      const payload = {
        type: 'appointment_reminder',
        title: 'Test Notification',
        body: 'Test body'
      }

      await sendNotification('user-1', payload)

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        status: 'sent',
        sent_at: expect.any(String)
      })
    })
  })

  describe('HTTP handler', () => {
    it('should handle POST request correctly', async () => {
      const mockRequest = new Request('http://localhost:3000', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'user-1',
          notification: {
            type: 'appointment_reminder',
            title: 'Test Notification',
            body: 'Test body'
          }
        })
      })

      const mockSubscription = {
        id: 'sub-1',
        user_id: 'user-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key'
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockSubscription,
        error: null
      })

      mockWebPush.sendNotification.mockResolvedValue({
        statusCode: 201,
        body: 'Success'
      })

      const { default: handler } = await import('../send-notification/index.ts')
      
      const response = await handler(mockRequest)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
    })

    it('should handle invalid request method', async () => {
      const mockRequest = new Request('http://localhost:3000', {
        method: 'GET'
      })

      const { default: handler } = await import('../send-notification/index.ts')
      
      const response = await handler(mockRequest)

      expect(response.status).toBe(405)
    })

    it('should handle invalid JSON body', async () => {
      const mockRequest = new Request('http://localhost:3000', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      })

      const { default: handler } = await import('../send-notification/index.ts')
      
      const response = await handler(mockRequest)

      expect(response.status).toBe(400)
    })

    it('should handle missing required fields', async () => {
      const mockRequest = new Request('http://localhost:3000', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Missing userId and notification
        })
      })

      const { default: handler } = await import('../send-notification/index.ts')
      
      const response = await handler(mockRequest)

      expect(response.status).toBe(400)
    })
  })

  describe('Batch notifications', () => {
    it('should send notifications to multiple users', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          user_id: 'user-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/test1',
          p256dh: 'test-p256dh-key-1',
          auth: 'test-auth-key-1'
        },
        {
          id: 'sub-2',
          user_id: 'user-2',
          endpoint: 'https://fcm.googleapis.com/fcm/send/test2',
          p256dh: 'test-p256dh-key-2',
          auth: 'test-auth-key-2'
        }
      ]

      mockSupabaseClient.from().select().eq().mockResolvedValue({
        data: mockSubscriptions,
        error: null
      })

      mockWebPush.sendNotification.mockResolvedValue({
        statusCode: 201,
        body: 'Success'
      })

      const { sendBatchNotifications } = await import('../send-notification/index.ts')
      
      const result = await sendBatchNotifications(['user-1', 'user-2'], {
        type: 'system_alert',
        title: 'System Update',
        body: 'System will be updated tonight'
      })

      expect(result.success).toBe(true)
      expect(result.sent).toBe(2)
      expect(result.failed).toBe(0)
      expect(mockWebPush.sendNotification).toHaveBeenCalledTimes(2)
    })

    it('should handle partial failures in batch', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          user_id: 'user-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/test1',
          p256dh: 'test-p256dh-key-1',
          auth: 'test-auth-key-1'
        },
        {
          id: 'sub-2',
          user_id: 'user-2',
          endpoint: 'https://fcm.googleapis.com/fcm/send/test2',
          p256dh: 'test-p256dh-key-2',
          auth: 'test-auth-key-2'
        }
      ]

      mockSupabaseClient.from().select().eq().mockResolvedValue({
        data: mockSubscriptions,
        error: null
      })

      mockWebPush.sendNotification
        .mockResolvedValueOnce({ statusCode: 201, body: 'Success' })
        .mockRejectedValueOnce(new Error('Push failed'))

      const { sendBatchNotifications } = await import('../send-notification/index.ts')
      
      const result = await sendBatchNotifications(['user-1', 'user-2'], {
        type: 'system_alert',
        title: 'System Update',
        body: 'System will be updated tonight'
      })

      expect(result.success).toBe(true) // Partial success
      expect(result.sent).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
    })
  })
})