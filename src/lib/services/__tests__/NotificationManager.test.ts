import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NotificationManager } from '../NotificationManager'
import { supabase } from '@/integrations/supabase/client'

// Mock dependencies
vi.mock('@/integrations/supabase/client')
vi.mock('@/lib/errors/logger')

// Mock browser APIs
const mockServiceWorkerRegistration = {
  pushManager: {
    subscribe: vi.fn(),
    getSubscription: vi.fn()
  },
  scope: '/test-scope'
}

const mockNotification = {
  permission: 'default' as NotificationPermission,
  requestPermission: vi.fn()
}

// Setup global mocks
Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: {
      register: vi.fn().mockResolvedValue(mockServiceWorkerRegistration)
    },
    userAgent: 'Test User Agent'
  },
  writable: true
})

Object.defineProperty(global, 'Notification', {
  value: mockNotification,
  writable: true
})

Object.defineProperty(global, 'window', {
  value: {
    PushManager: class MockPushManager {},
    atob: vi.fn((str) => str),
    btoa: vi.fn((str) => str)
  },
  writable: true
})

describe('NotificationManager', () => {
  let notificationManager: NotificationManager
  
  beforeEach(() => {
    vi.clearAllMocks()
    notificationManager = NotificationManager.getInstance()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = NotificationManager.getInstance()
      const instance2 = NotificationManager.getInstance()
      
      expect(instance1).toBe(instance2)
    })
  })

  describe('initialize', () => {
    it('should register service worker successfully', async () => {
      const registerSpy = vi.spyOn(navigator.serviceWorker, 'register')
      
      await notificationManager.initialize()
      
      expect(registerSpy).toHaveBeenCalledWith('/sw.js')
    })

    it('should handle service worker registration failure', async () => {
      const registerSpy = vi.spyOn(navigator.serviceWorker, 'register')
      registerSpy.mockRejectedValue(new Error('Registration failed'))
      
      await expect(notificationManager.initialize()).rejects.toThrow('Registration failed')
    })

    it('should skip initialization if not supported', async () => {
      // Mock unsupported environment
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      })
      
      await notificationManager.initialize()
      
      // Should not throw and should handle gracefully
      expect(true).toBe(true)
    })
  })

  describe('getPermissionState', () => {
    it('should return correct permission state when supported', async () => {
      mockNotification.permission = 'granted'
      
      const state = await notificationManager.getPermissionState()
      
      expect(state).toEqual({
        permission: 'granted',
        supported: true,
        subscribed: false,
        subscription: undefined
      })
    })

    it('should return unsupported state when not supported', async () => {
      // Mock unsupported environment
      Object.defineProperty(global, 'Notification', {
        value: undefined,
        writable: true
      })
      
      const state = await notificationManager.getPermissionState()
      
      expect(state.supported).toBe(false)
      expect(state.permission).toBe('denied')
    })
  })

  describe('requestPermission', () => {
    it('should return true when permission is already granted', async () => {
      mockNotification.permission = 'granted'
      
      const result = await notificationManager.requestPermission()
      
      expect(result).toBe(true)
      expect(mockNotification.requestPermission).not.toHaveBeenCalled()
    })

    it('should request permission and return true when granted', async () => {
      mockNotification.permission = 'default'
      mockNotification.requestPermission.mockResolvedValue('granted')
      
      const result = await notificationManager.requestPermission()
      
      expect(result).toBe(true)
      expect(mockNotification.requestPermission).toHaveBeenCalled()
    })

    it('should return false when permission is denied', async () => {
      mockNotification.permission = 'default'
      mockNotification.requestPermission.mockResolvedValue('denied')
      
      const result = await notificationManager.requestPermission()
      
      expect(result).toBe(false)
    })

    it('should return false when not supported', async () => {
      // Mock unsupported environment
      Object.defineProperty(global, 'Notification', {
        value: undefined,
        writable: true
      })
      
      const result = await notificationManager.requestPermission()
      
      expect(result).toBe(false)
    })
  })

  describe('subscribe', () => {
    beforeEach(() => {
      mockNotification.permission = 'granted'
      process.env.VITE_VAPID_PUBLIC_KEY = 'test-vapid-key'
    })

    it('should create subscription successfully', async () => {
      const mockSubscription = {
        endpoint: 'https://test-endpoint.com',
        getKey: vi.fn((name) => {
          if (name === 'p256dh') return new ArrayBuffer(8)
          if (name === 'auth') return new ArrayBuffer(8)
          return null
        })
      }

      mockServiceWorkerRegistration.pushManager.subscribe.mockResolvedValue(mockSubscription)
      
      const mockSupabaseResponse = {
        data: {
          id: 'test-id',
          user_id: 'test-user',
          endpoint: 'https://test-endpoint.com',
          p256dh: 'test-p256dh',
          auth: 'test-auth',
          user_agent: 'Test User Agent',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse)
          })
        })
      } as any)

      await notificationManager.initialize()
      const result = await notificationManager.subscribe()
      
      expect(result).toBeTruthy()
      expect(result?.endpoint).toBe('https://test-endpoint.com')
    })

    it('should handle subscription failure', async () => {
      mockServiceWorkerRegistration.pushManager.subscribe.mockRejectedValue(
        new Error('Subscription failed')
      )
      
      await notificationManager.initialize()
      const result = await notificationManager.subscribe()
      
      expect(result).toBeNull()
    })

    it('should handle permission denied', async () => {
      mockNotification.permission = 'denied'
      
      await notificationManager.initialize()
      const result = await notificationManager.subscribe()
      
      expect(result).toBeNull()
    })
  })

  describe('unsubscribe', () => {
    it('should unsubscribe successfully', async () => {
      const mockBrowserSubscription = {
        unsubscribe: vi.fn().mockResolvedValue(true)
      }

      mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(
        mockBrowserSubscription
      )

      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      } as any)

      await notificationManager.initialize()
      await notificationManager.unsubscribe()
      
      expect(mockBrowserSubscription.unsubscribe).toHaveBeenCalled()
    })

    it('should handle unsubscribe failure gracefully', async () => {
      mockServiceWorkerRegistration.pushManager.getSubscription.mockRejectedValue(
        new Error('Unsubscribe failed')
      )
      
      await notificationManager.initialize()
      
      await expect(notificationManager.unsubscribe()).rejects.toThrow('Unsubscribe failed')
    })
  })

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      const mockPreferences = {
        id: 'pref-id',
        user_id: 'test-user',
        appointment_reminders: true,
        exercise_reminders: true,
        progress_updates: false,
        system_alerts: true,
        therapist_messages: true,
        payment_reminders: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        weekend_notifications: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPreferences,
              error: null
            })
          })
        })
      } as any)

      const result = await notificationManager.getPreferences()
      
      expect(result).toBeTruthy()
      expect(result?.appointmentReminders).toBe(true)
      expect(result?.exerciseReminders).toBe(true)
    })

    it('should return null when no preferences found', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' } // Not found error
            })
          })
        })
      } as any)

      const result = await notificationManager.getPreferences()
      
      expect(result).toBeNull()
    })
  })

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
      const updateData = {
        appointmentReminders: false,
        exerciseReminders: true
      }

      const mockUpdatedPreferences = {
        id: 'pref-id',
        user_id: 'test-user',
        appointment_reminders: false,
        exercise_reminders: true,
        progress_updates: true,
        system_alerts: true,
        therapist_messages: true,
        payment_reminders: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        weekend_notifications: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUpdatedPreferences,
              error: null
            })
          })
        })
      } as any)

      const result = await notificationManager.updatePreferences(updateData)
      
      expect(result).toBeTruthy()
      expect(result?.appointmentReminders).toBe(false)
      expect(result?.exerciseReminders).toBe(true)
    })

    it('should handle update failure', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Update failed')
            })
          })
        })
      } as any)

      const result = await notificationManager.updatePreferences({
        appointmentReminders: false
      })
      
      expect(result).toBeNull()
    })
  })

  describe('getNotificationHistory', () => {
    it('should return notification history', async () => {
      const mockHistory = [
        {
          id: 'notif-1',
          user_id: 'test-user',
          type: 'appointment_reminder',
          title: 'Test Notification',
          body: 'Test body',
          data: {},
          sent_at: new Date().toISOString(),
          delivered_at: null,
          clicked_at: null,
          status: 'sent',
          error_message: null,
          retry_count: 0
        }
      ]

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockHistory,
                error: null
              })
            })
          })
        })
      } as any)

      const result = await notificationManager.getNotificationHistory(10, 0)
      
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Test Notification')
    })

    it('should handle history fetch failure', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Fetch failed')
              })
            })
          })
        })
      } as any)

      const result = await notificationManager.getNotificationHistory()
      
      expect(result).toEqual([])
    })
  })

  describe('markNotificationClicked', () => {
    it('should mark notification as clicked', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null
      })

      await notificationManager.markNotificationClicked('test-notification-id')
      
      expect(supabase.rpc).toHaveBeenCalledWith('update_notification_status', {
        p_notification_id: 'test-notification-id',
        p_status: 'clicked'
      })
    })

    it('should handle marking failure gracefully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('Update failed')
      })

      // Should not throw
      await notificationManager.markNotificationClicked('test-notification-id')
      
      expect(supabase.rpc).toHaveBeenCalled()
    })
  })

  describe('isSupported', () => {
    it('should return true when supported', () => {
      const result = notificationManager.isSupported()
      expect(result).toBe(true)
    })

    it('should return false when not supported', () => {
      // Mock unsupported environment
      Object.defineProperty(global, 'Notification', {
        value: undefined,
        writable: true
      })

      const result = notificationManager.isSupported()
      expect(result).toBe(false)
    })
  })
})