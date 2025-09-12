import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock global service worker environment
const mockClients = {
  matchAll: vi.fn(),
  openWindow: vi.fn(),
  claim: vi.fn()
}

const mockRegistration = {
  showNotification: vi.fn(),
  getNotifications: vi.fn()
}

let mockEvent = {
  data: {
    json: vi.fn()
  },
  waitUntil: vi.fn(),
  notification: {
    close: vi.fn(),
    data: {},
    tag: 'test-tag'
  },
  action: '',
  reply: ''
}

// Mock service worker global scope
Object.defineProperty(global, 'self', {
  value: {
    addEventListener: vi.fn(),
    registration: mockRegistration,
    clients: mockClients,
    skipWaiting: vi.fn(),
    location: {
      origin: 'http://localhost:3000'
    }
  },
  writable: true
})

// Mock fetch
global.fetch = vi.fn()

describe('Service Worker Push Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock event
    mockEvent = {
      data: {
        json: vi.fn()
      },
      waitUntil: vi.fn(),
      notification: {
        close: vi.fn(),
        data: {},
        tag: 'test-tag'
      },
      action: '',
      reply: ''
    }
    
    // Reset mock implementations
    mockClients.matchAll.mockResolvedValue([])
    mockClients.openWindow.mockResolvedValue({ focus: vi.fn() })
    mockRegistration.showNotification.mockResolvedValue(undefined)
    mockRegistration.getNotifications.mockResolvedValue([])
    
    // Mock fetch responses
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    } as Response)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Push Event Handler', () => {
    it('should handle push event with valid payload', async () => {
      const pushData = {
        type: 'appointment_reminder',
        title: 'Lembrete de Consulta',
        body: 'Você tem uma consulta em 1 hora',
        icon: '/icons/appointment.png',
        badge: '/icons/badge.png',
        data: {
          appointmentId: 'apt-123',
          url: '/schedule'
        },
        actions: [
          { action: 'confirm', title: 'Confirmar' },
          { action: 'reschedule', title: 'Reagendar' }
        ]
      }

      mockEvent.data.json.mockReturnValue(pushData)

      // Import and test the push event handler
      const { handlePushEvent } = await import('../../public/sw.js')
      
      await handlePushEvent(mockEvent)

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        pushData.title,
        {
          body: pushData.body,
          icon: pushData.icon,
          badge: pushData.badge,
          data: pushData.data,
          actions: pushData.actions,
          tag: `${pushData.type}-${pushData.data.appointmentId}`,
          requireInteraction: true,
          silent: false
        }
      )
    })

    it('should handle push event without data', async () => {
      mockEvent.data = null

      const { handlePushEvent } = await import('../../public/sw.js')
      
      await handlePushEvent(mockEvent)

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        'Nova Notificação',
        {
          body: 'Você tem uma nova notificação',
          icon: '/icons/notification.png',
          badge: '/icons/badge.png',
          data: {},
          tag: 'default-notification'
        }
      )
    })

    it('should handle malformed push data', async () => {
      mockEvent.data.json.mockImplementation(() => {
        throw new Error('Invalid JSON')
      })

      const { handlePushEvent } = await import('../../public/sw.js')
      
      await handlePushEvent(mockEvent)

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        'Nova Notificação',
        expect.objectContaining({
          body: 'Você tem uma nova notificação'
        })
      )
    })

    it('should deduplicate notifications by tag', async () => {
      const existingNotification = {
        tag: 'appointment_reminder-apt-123',
        close: vi.fn()
      }

      mockRegistration.getNotifications.mockResolvedValue([existingNotification])

      const pushData = {
        type: 'appointment_reminder',
        title: 'Lembrete de Consulta Atualizado',
        body: 'Horário alterado para 15:00',
        data: { appointmentId: 'apt-123' }
      }

      mockEvent.data.json.mockReturnValue(pushData)

      const { handlePushEvent } = await import('../../public/sw.js')
      
      await handlePushEvent(mockEvent)

      expect(existingNotification.close).toHaveBeenCalled()
      expect(mockRegistration.showNotification).toHaveBeenCalled()
    })
  })

  describe('Notification Click Handler', () => {
    it('should handle notification click with URL', async () => {
      const mockClient = {
        focus: vi.fn(),
        navigate: vi.fn(),
        url: 'http://localhost:3000/dashboard'
      }

      mockClients.matchAll.mockResolvedValue([mockClient])
      
      mockEvent.notification.data = {
        url: '/schedule',
        appointmentId: 'apt-123'
      }

      const { handleNotificationClick } = await import('../../public/sw.js')
      
      await handleNotificationClick(mockEvent)

      expect(mockClient.focus).toHaveBeenCalled()
      expect(mockClient.navigate).toHaveBeenCalledWith('http://localhost:3000/schedule')
      expect(mockEvent.notification.close).toHaveBeenCalled()
    })

    it('should open new window when no client exists', async () => {
      mockClients.matchAll.mockResolvedValue([])
      
      mockEvent.notification.data = {
        url: '/schedule'
      }

      const { handleNotificationClick } = await import('../../public/sw.js')
      
      await handleNotificationClick(mockEvent)

      expect(mockClients.openWindow).toHaveBeenCalledWith('http://localhost:3000/schedule')
      expect(mockEvent.notification.close).toHaveBeenCalled()
    })

    it('should handle notification click without URL', async () => {
      const mockClient = {
        focus: vi.fn(),
        navigate: vi.fn(),
        url: 'http://localhost:3000/dashboard'
      }

      mockClients.matchAll.mockResolvedValue([mockClient])
      
      mockEvent.notification.data = {}

      const { handleNotificationClick } = await import('../../public/sw.js')
      
      await handleNotificationClick(mockEvent)

      expect(mockClient.focus).toHaveBeenCalled()
      expect(mockClient.navigate).toHaveBeenCalledWith('http://localhost:3000/')
    })

    it('should track notification click analytics', async () => {
      mockEvent.notification.data = {
        notificationId: 'notif-123',
        url: '/schedule'
      }

      const { handleNotificationClick } = await import('../../public/sw.js')
      
      await handleNotificationClick(mockEvent)

      expect(fetch).toHaveBeenCalledWith('/api/notifications/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificationId: 'notif-123',
          timestamp: expect.any(String)
        })
      })
    })
  })

  describe('Notification Action Handler', () => {
    it('should handle confirm action', async () => {
      mockEvent.action = 'confirm'
      mockEvent.notification.data = {
        appointmentId: 'apt-123',
        type: 'appointment_reminder'
      }

      const { handleNotificationClick } = await import('../../public/sw.js')
      
      await handleNotificationClick(mockEvent)

      expect(fetch).toHaveBeenCalledWith('/api/appointments/apt-123/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })

    it('should handle reschedule action', async () => {
      const mockClient = {
        focus: vi.fn(),
        navigate: vi.fn(),
        url: 'http://localhost:3000/dashboard'
      }

      mockClients.matchAll.mockResolvedValue([mockClient])
      
      mockEvent.action = 'reschedule'
      mockEvent.notification.data = {
        appointmentId: 'apt-123'
      }

      const { handleNotificationClick } = await import('../../public/sw.js')
      
      await handleNotificationClick(mockEvent)

      expect(mockClient.navigate).toHaveBeenCalledWith(
        'http://localhost:3000/schedule?reschedule=apt-123'
      )
    })

    it('should handle exercise complete action', async () => {
      mockEvent.action = 'complete'
      mockEvent.notification.data = {
        exerciseId: 'ex-123',
        type: 'exercise_reminder'
      }

      const { handleNotificationClick } = await import('../../public/sw.js')
      
      await handleNotificationClick(mockEvent)

      expect(fetch).toHaveBeenCalledWith('/api/exercises/ex-123/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })
  })

  describe('Background Sync', () => {
    it('should handle background sync for offline notifications', async () => {
      const syncEvent = {
        tag: 'notification-sync',
        waitUntil: vi.fn()
      }

      // Mock IndexedDB or localStorage for offline queue
      const mockOfflineQueue = [
        {
          id: 'offline-1',
          type: 'appointment_reminder',
          title: 'Offline Notification',
          body: 'This was queued offline',
          timestamp: Date.now()
        }
      ]

      // Mock getting offline queue
      global.localStorage = {
        getItem: vi.fn().mockReturnValue(JSON.stringify(mockOfflineQueue)),
        setItem: vi.fn(),
        removeItem: vi.fn()
      } as any

      const { handleBackgroundSync } = await import('../../public/sw.js')
      
      await handleBackgroundSync(syncEvent)

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        'Offline Notification',
        expect.objectContaining({
          body: 'This was queued offline'
        })
      )
    })

    it('should clear processed offline notifications', async () => {
      const syncEvent = {
        tag: 'notification-sync',
        waitUntil: vi.fn()
      }

      global.localStorage = {
        getItem: vi.fn().mockReturnValue('[]'),
        setItem: vi.fn(),
        removeItem: vi.fn()
      } as any

      const { handleBackgroundSync } = await import('../../public/sw.js')
      
      await handleBackgroundSync(syncEvent)

      expect(localStorage.removeItem).toHaveBeenCalledWith('offline-notifications')
    })
  })

  describe('Error Handling', () => {
    it('should handle notification display errors', async () => {
      mockRegistration.showNotification.mockRejectedValue(new Error('Display failed'))

      const pushData = {
        title: 'Test Notification',
        body: 'Test body'
      }

      mockEvent.data.json.mockReturnValue(pushData)

      const { handlePushEvent } = await import('../../public/sw.js')
      
      // Should not throw
      await expect(handlePushEvent(mockEvent)).resolves.not.toThrow()
    })

    it('should handle client navigation errors', async () => {
      const mockClient = {
        focus: vi.fn(),
        navigate: vi.fn().mockRejectedValue(new Error('Navigation failed'))
      }

      mockClients.matchAll.mockResolvedValue([mockClient])
      
      mockEvent.notification.data = { url: '/schedule' }

      const { handleNotificationClick } = await import('../../public/sw.js')
      
      // Should fallback to opening new window
      await handleNotificationClick(mockEvent)

      expect(mockClients.openWindow).toHaveBeenCalled()
    })

    it('should handle fetch errors for analytics', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      mockEvent.notification.data = {
        notificationId: 'notif-123'
      }

      const { handleNotificationClick } = await import('../../public/sw.js')
      
      // Should not throw
      await expect(handleNotificationClick(mockEvent)).resolves.not.toThrow()
    })
  })
})