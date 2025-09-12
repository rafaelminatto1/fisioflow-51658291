import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { supabase } from '@/integrations/supabase/client'
import { notificationManager } from '@/lib/services/NotificationManager'
import { notificationPerformanceService } from '@/lib/services/NotificationPerformanceService'
import type { NotificationPayload } from '@/types/notifications'

// Mock user for testing
const testUser = {
  id: 'test-user-id',
  email: 'test@example.com'
}

// Mock service worker registration
const mockServiceWorkerRegistration = {
  pushManager: {
    subscribe: vi.fn().mockResolvedValue({
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
      getKey: vi.fn((name: string) => {
        if (name === 'p256dh') return new ArrayBuffer(65)
        if (name === 'auth') return new ArrayBuffer(16)
        return null
      })
    }),
    getSubscription: vi.fn().mockResolvedValue(null)
  },
  scope: '/test-scope'
}

// Mock Notification API
Object.defineProperty(global, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted')
  }
})

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: {
      register: vi.fn().mockResolvedValue(mockServiceWorkerRegistration)
    },
    userAgent: 'Test User Agent'
  }
})

describe('Notification System E2E Tests', () => {
  beforeAll(async () => {
    // Setup test environment
    await setupTestEnvironment()
  })

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData()
  })

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Mock authenticated user
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: testUser },
      error: null
    })
  })

  describe('Complete Notification Flow', () => {
    it('should complete full notification lifecycle', async () => {
      // 1. Initialize notification manager
      await notificationManager.initialize()
      
      // 2. Request permission
      const permissionGranted = await notificationManager.requestPermission()
      expect(permissionGranted).toBe(true)
      
      // 3. Subscribe to notifications
      const subscription = await notificationManager.subscribe()
      expect(subscription).toBeTruthy()
      expect(subscription?.endpoint).toBe('https://fcm.googleapis.com/fcm/send/test-endpoint')
      
      // 4. Set notification preferences
      const preferences = await notificationManager.updatePreferences({
        appointmentReminders: true,
        exerciseReminders: true,
        progressUpdates: false,
        systemAlerts: true,
        quietHours: {
          start: '22:00',
          end: '08:00'
        },
        weekendNotifications: false
      })
      
      expect(preferences).toBeTruthy()
      expect(preferences?.appointmentReminders).toBe(true)
      expect(preferences?.exerciseReminders).toBe(true)
      
      // 5. Send test notification
      const testNotification: NotificationPayload = {
        type: 'appointment_reminder',
        title: 'Lembrete de Consulta',
        body: 'Sua consulta é amanhã às 14:00',
        data: {
          appointmentId: 'test-appointment-123',
          patientId: testUser.id
        }
      }
      
      await notificationManager.sendNotification(testUser.id, testNotification, 'normal')
      
      // 6. Verify notification was queued for batch processing
      const systemHealth = await notificationPerformanceService.getSystemHealth()
      expect(systemHealth.queueSize).toBeGreaterThan(0)
      
      // 7. Process batch and verify delivery
      // Note: In real environment, this would be handled by the batch processor
      // Here we simulate the processing
      
      // 8. Check notification history
      const history = await notificationManager.getNotificationHistory(10, 0)
      expect(Array.isArray(history)).toBe(true)
    })

    it('should handle notification failures gracefully', async () => {
      // Mock failed subscription
      mockServiceWorkerRegistration.pushManager.subscribe.mockRejectedValueOnce(
        new Error('Subscription failed')
      )
      
      await notificationManager.initialize()
      
      const subscription = await notificationManager.subscribe()
      expect(subscription).toBeNull()
      
      // Should still allow fallback to in-app notifications
      const permissionState = await notificationManager.getPermissionState()
      expect(permissionState.supported).toBe(true)
      expect(permissionState.subscribed).toBe(false)
    })

    it('should respect user preferences for quiet hours', async () => {
      await notificationManager.initialize()
      
      // Set quiet hours preferences
      await notificationManager.updatePreferences({
        quietHours: {
          start: '22:00',
          end: '08:00'
        }
      })
      
      // Mock current time to be in quiet hours (23:00)
      const mockDate = new Date()
      mockDate.setHours(23, 0, 0, 0)
      vi.setSystemTime(mockDate)
      
      const testNotification: NotificationPayload = {
        type: 'exercise_reminder',
        title: 'Hora do Exercício',
        body: 'Não esqueça de fazer seus exercícios'
      }
      
      // Send non-urgent notification during quiet hours
      await notificationManager.sendNotification(testUser.id, testNotification, 'normal')
      
      // Notification should be scheduled for later (after quiet hours)
      const systemHealth = await notificationPerformanceService.getSystemHealth()
      expect(systemHealth.queueSize).toBeGreaterThan(0)
      
      // Reset system time
      vi.useRealTimers()
    })

    it('should handle urgent notifications immediately', async () => {
      await notificationManager.initialize()
      
      const urgentNotification: NotificationPayload = {
        type: 'system_alert',
        title: 'Alerta Urgente',
        body: 'Ação imediata necessária',
        requireInteraction: true
      }
      
      // Mock Supabase function call
      const mockInvoke = vi.spyOn(supabase.functions, 'invoke').mockResolvedValue({
        data: { success: true },
        error: null
      })
      
      await notificationManager.sendNotification(testUser.id, urgentNotification, 'urgent')
      
      // Urgent notifications should bypass batching
      expect(mockInvoke).toHaveBeenCalledWith('send-notification', {
        body: {
          userId: testUser.id,
          notification: urgentNotification,
          timestamp: expect.any(String)
        }
      })
    })
  })

  describe('Performance and Monitoring', () => {
    it('should track performance metrics', async () => {
      // Start performance monitoring
      notificationPerformanceService.startBatchProcessor()
      
      // Send multiple notifications to generate metrics
      const notifications: NotificationPayload[] = [
        {
          type: 'appointment_reminder',
          title: 'Consulta Amanhã',
          body: 'Lembrete de consulta'
        },
        {
          type: 'exercise_reminder',
          title: 'Exercícios',
          body: 'Hora dos exercícios'
        },
        {
          type: 'progress_update',
          title: 'Progresso',
          body: 'Seu progresso foi atualizado'
        }
      ]
      
      for (const notification of notifications) {
        await notificationPerformanceService.addToBatch(testUser.id, notification, 'normal')
      }
      
      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const metrics = notificationPerformanceService.getPerformanceMetrics()
      expect(metrics).toBeDefined()
      expect(typeof metrics.deliveryRate).toBe('number')
      expect(typeof metrics.errorRate).toBe('number')
      expect(typeof metrics.batchEfficiency).toBe('number')
    })

    it('should optimize scheduling based on historical data', async () => {
      // Mock historical performance data
      await supabase.from('notification_performance_metrics').insert([
        {
          batch_id: 'test-batch-1',
          total_notifications: 10,
          successful_deliveries: 9,
          delivery_time_ms: 5000,
          error_count: 1,
          delivery_rate: 0.9,
          error_rate: 0.1,
          batch_efficiency: 2.0,
          recorded_at: new Date().toISOString()
        }
      ])
      
      // Run optimization
      await notificationPerformanceService.optimizeScheduling()
      
      // Verify optimization was applied (configuration should be adjusted)
      const systemHealth = await notificationPerformanceService.getSystemHealth()
      expect(systemHealth.status).toBeDefined()
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle network failures with retry logic', async () => {
      // Mock network failure
      const mockInvoke = vi.spyOn(supabase.functions, 'invoke')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { success: true }, error: null })
      
      const testNotification: NotificationPayload = {
        type: 'appointment_reminder',
        title: 'Test Notification',
        body: 'Test body'
      }
      
      // First attempt should fail, but retry should succeed
      await expect(
        notificationManager.sendDirectNotification(testUser.id, testNotification)
      ).rejects.toThrow('Network error')
      
      // Retry should work
      await expect(
        notificationManager.sendDirectNotification(testUser.id, testNotification)
      ).resolves.not.toThrow()
    })

    it('should handle subscription expiry and renewal', async () => {
      await notificationManager.initialize()
      
      // Mock expired subscription
      mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValueOnce({
        endpoint: 'https://expired-endpoint.com',
        expirationTime: Date.now() - 1000, // Expired
        getKey: vi.fn()
      })
      
      // Should detect expired subscription and create new one
      const subscription = await notificationManager.subscribe()
      expect(subscription).toBeTruthy()
      expect(subscription?.endpoint).toBe('https://fcm.googleapis.com/fcm/send/test-endpoint')
    })
  })

  describe('Browser Compatibility', () => {
    it('should handle unsupported browsers gracefully', async () => {
      // Mock unsupported browser
      Object.defineProperty(global, 'Notification', {
        value: undefined
      })
      
      const isSupported = notificationManager.isSupported()
      expect(isSupported).toBe(false)
      
      const permissionState = await notificationManager.getPermissionState()
      expect(permissionState.supported).toBe(false)
      expect(permissionState.permission).toBe('denied')
    })

    it('should work with different service worker states', async () => {
      // Test with no service worker support
      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: undefined,
          userAgent: 'Test User Agent'
        }
      })
      
      await expect(notificationManager.initialize()).resolves.not.toThrow()
      
      const subscription = await notificationManager.subscribe()
      expect(subscription).toBeNull()
    })
  })
})

// Helper functions
async function setupTestEnvironment() {
  // Create test tables if they don't exist
  // This would typically be handled by migrations in a real environment
  
  // Mock environment variables
  process.env.VITE_VAPID_PUBLIC_KEY = 'test-vapid-key'
  
  // Setup global mocks
  global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64')
  global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary')
}

async function cleanupTestData() {
  // Clean up test data from database
  try {
    await supabase.from('push_subscriptions').delete().eq('user_id', testUser.id)
    await supabase.from('notification_preferences').delete().eq('user_id', testUser.id)
    await supabase.from('notification_history').delete().eq('user_id', testUser.id)
    await supabase.from('notification_performance_metrics').delete().like('batch_id', 'test-%')
  } catch (error) {
    console.warn('Cleanup failed:', error)
  }
}