import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNotifications } from '../useNotifications'
import { notificationManager } from '@/lib/services/NotificationManager'

// Mock dependencies
vi.mock('@/lib/services/NotificationManager')

const mockNotificationHistory = [
  {
    id: 'notif-1',
    userId: 'user-1',
    type: 'appointment_reminder',
    title: 'Test Notification',
    body: 'Test body',
    data: {},
    sentAt: new Date(),
    status: 'sent',
    errorMessage: null,
    retryCount: 0
  }
]

const mockPreferences = {
  userId: 'user-1',
  appointmentReminders: true,
  exerciseReminders: true,
  progressUpdates: false,
  systemAlerts: true,
  therapistMessages: true,
  paymentReminders: false,
  quietHours: {
    start: '22:00',
    end: '08:00'
  },
  weekendNotifications: false
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock NotificationManager methods
    vi.mocked(notificationManager.initialize).mockResolvedValue()
    vi.mocked(notificationManager.getNotificationHistory).mockResolvedValue(mockNotificationHistory)
    vi.mocked(notificationManager.getPreferences).mockResolvedValue(mockPreferences)
    vi.mocked(notificationManager.updatePreferences).mockResolvedValue(mockPreferences)
    vi.mocked(notificationManager.requestPermission).mockResolvedValue(true)
    vi.mocked(notificationManager.subscribe).mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      endpoint: 'https://test-endpoint.com',
      keys: {
        p256dh: 'test-p256dh',
        auth: 'test-auth'
      },
      userAgent: 'Test User Agent',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    vi.mocked(notificationManager.getPermissionState).mockResolvedValue({
      permission: 'granted',
      supported: true,
      subscribed: true,
      subscription: {
        id: 'sub-1',
        userId: 'user-1',
        endpoint: 'https://test-endpoint.com',
        keys: {
          p256dh: 'test-p256dh',
          auth: 'test-auth'
        },
        userAgent: 'Test User Agent',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  })

  it('should initialize notification manager on mount', async () => {
    renderHook(() => useNotifications())
    
    await waitFor(() => {
      expect(notificationManager.initialize).toHaveBeenCalled()
    })
  })

  it('should load notification history', async () => {
    const { result } = renderHook(() => useNotifications())
    
    await waitFor(() => {
      expect(result.current.notifications).toEqual(mockNotificationHistory)
      expect(result.current.loading).toBe(false)
    })
  })

  it('should load preferences', async () => {
    const { result } = renderHook(() => useNotifications())
    
    await waitFor(() => {
      expect(result.current.preferences).toEqual(mockPreferences)
    })
  })

  it('should handle permission request', async () => {
    const { result } = renderHook(() => useNotifications())
    
    await act(async () => {
      const granted = await result.current.requestPermission()
      expect(granted).toBe(true)
    })
    
    expect(notificationManager.requestPermission).toHaveBeenCalled()
  })

  it('should handle subscription', async () => {
    const { result } = renderHook(() => useNotifications())
    
    await act(async () => {
      await result.current.subscribe()
    })
    
    expect(notificationManager.subscribe).toHaveBeenCalled()
  })

  it('should update preferences', async () => {
    const { result } = renderHook(() => useNotifications())
    
    const newPreferences = { appointmentReminders: false }
    
    await act(async () => {
      await result.current.updatePreferences(newPreferences)
    })
    
    expect(notificationManager.updatePreferences).toHaveBeenCalledWith(newPreferences)
  })

  it('should refresh data', async () => {
    const { result } = renderHook(() => useNotifications())
    
    await act(async () => {
      await result.current.refresh()
    })
    
    expect(notificationManager.getNotificationHistory).toHaveBeenCalledTimes(2) // Once on mount, once on refresh
    expect(notificationManager.getPreferences).toHaveBeenCalledTimes(2)
  })

  it('should handle loading states', async () => {
    // Mock slow response
    vi.mocked(notificationManager.getNotificationHistory).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockNotificationHistory), 100))
    )
    
    const { result } = renderHook(() => useNotifications())
    
    expect(result.current.loading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('should handle errors gracefully', async () => {
    vi.mocked(notificationManager.getNotificationHistory).mockRejectedValue(new Error('Load failed'))
    
    const { result } = renderHook(() => useNotifications())
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.notifications).toEqual([])
    })
  })

  it('should get unread count', async () => {
    const { result } = renderHook(() => useNotifications())
    
    await waitFor(() => {
      expect(result.current.unreadCount).toBe(1) // One notification with 'sent' status
    })
  })

  it('should mark notification as clicked', async () => {
    const { result } = renderHook(() => useNotifications())
    
    await act(async () => {
      await result.current.markAsClicked('notif-1')
    })
    
    expect(notificationManager.markNotificationClicked).toHaveBeenCalledWith('notif-1')
  })

  it('should get permission state', async () => {
    const { result } = renderHook(() => useNotifications())
    
    await waitFor(() => {
      expect(result.current.permissionState).toEqual({
        permission: 'granted',
        supported: true,
        subscribed: true,
        subscription: expect.any(Object)
      })
    })
  })
})