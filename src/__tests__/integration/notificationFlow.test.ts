import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'
import { notificationManager } from '@/lib/services/NotificationManager'
import { supabase } from '@/integrations/supabase/client'

// Mock dependencies
vi.mock('@/lib/services/NotificationManager')
vi.mock('@/integrations/supabase/client')

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('Notification System Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful initialization
    vi.mocked(notificationManager.initialize).mockResolvedValue()
    vi.mocked(notificationManager.isSupported).mockReturnValue(true)
    vi.mocked(notificationManager.getPermissionState).mockResolvedValue({
      permission: 'default',
      supported: true,
      subscribed: false,
      subscription: undefined
    })
    vi.mocked(notificationManager.getNotificationHistory).mockResolvedValue([])
    vi.mocked(notificationManager.getPreferences).mockResolvedValue({
      userId: 'test-user',
      appointmentReminders: true,
      exerciseReminders: true,
      progressUpdates: true,
      systemAlerts: true,
      therapistMessages: true,
      paymentReminders: true,
      quietHours: { start: '22:00', end: '08:00' },
      weekendNotifications: false
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Permission Request Flow', () => {
    it('should complete full permission request and subscription flow', async () => {
      // Mock permission request success
      vi.mocked(notificationManager.requestPermission).mockResolvedValue(true)
      vi.mocked(notificationManager.subscribe).mockResolvedValue({
        id: 'sub-1',
        userId: 'test-user',
        endpoint: 'https://test-endpoint.com',
        keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
        userAgent: 'Test User Agent',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      )

      // Find and click enable notifications button
      const enableButton = await screen.findByText('Ativar Notificações')
      fireEvent.click(enableButton)

      await waitFor(() => {
        expect(notificationManager.requestPermission).toHaveBeenCalled()
        expect(notificationManager.subscribe).toHaveBeenCalled()
      })
    })

    it('should handle permission denied gracefully', async () => {
      vi.mocked(notificationManager.requestPermission).mockResolvedValue(false)

      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      )

      const enableButton = await screen.findByText('Ativar Notificações')
      fireEvent.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText(/permissão negada/i)).toBeInTheDocument()
      })
    })

    it('should show unsupported browser message', async () => {
      vi.mocked(notificationManager.isSupported).mockReturnValue(false)

      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/navegador não suporta/i)).toBeInTheDocument()
      })
    })
  })

  describe('Notification Preferences Management', () => {
    it('should update preferences and reflect changes', async () => {
      const updatedPreferences = {
        userId: 'test-user',
        appointmentReminders: false,
        exerciseReminders: true,
        progressUpdates: true,
        systemAlerts: true,
        therapistMessages: true,
        paymentReminders: true,
        quietHours: { start: '22:00', end: '08:00' },
        weekendNotifications: false
      }

      vi.mocked(notificationManager.updatePreferences).mockResolvedValue(updatedPreferences)

      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      )

      // Toggle appointment reminders off
      const appointmentToggle = await screen.findByLabelText(/lembretes de consulta/i)
      fireEvent.click(appointmentToggle)

      await waitFor(() => {
        expect(notificationManager.updatePreferences).toHaveBeenCalledWith({
          appointmentReminders: false
        })
      })
    })

    it('should update quiet hours', async () => {
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      )

      const startTimeInput = await screen.findByLabelText(/horário de início/i)
      fireEvent.change(startTimeInput, { target: { value: '23:00' } })

      const endTimeInput = await screen.findByLabelText(/horário de fim/i)
      fireEvent.change(endTimeInput, { target: { value: '07:00' } })

      await waitFor(() => {
        expect(notificationManager.updatePreferences).toHaveBeenCalledWith({
          quietHours: { start: '23:00', end: '07:00' }
        })
      })
    })
  })

  describe('Notification Display and Interaction', () => {
    it('should display notifications in notification center', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'test-user',
          type: 'appointment_reminder',
          title: 'Lembrete de Consulta',
          body: 'Consulta em 1 hora',
          data: { appointmentId: 'apt-123' },
          sentAt: new Date(),
          status: 'sent',
          errorMessage: null,
          retryCount: 0
        },
        {
          id: 'notif-2',
          userId: 'test-user',
          type: 'exercise_reminder',
          title: 'Hora dos Exercícios',
          body: 'Faça seus exercícios prescritos',
          data: { exerciseId: 'ex-123' },
          sentAt: new Date(),
          status: 'delivered',
          errorMessage: null,
          retryCount: 0
        }
      ]

      vi.mocked(notificationManager.getNotificationHistory).mockResolvedValue(mockNotifications)

      render(
        <TestWrapper>
          <NotificationCenter />
        </TestWrapper>
      )

      // Open notification center
      const bellButton = screen.getByRole('button')
      fireEvent.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('Lembrete de Consulta')).toBeInTheDocument()
        expect(screen.getByText('Hora dos Exercícios')).toBeInTheDocument()
      })
    })

    it('should handle notification click and navigation', async () => {
      const mockNavigate = vi.fn()
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom')
        return {
          ...actual,
          useNavigate: () => mockNavigate
        }
      })

      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'test-user',
          type: 'appointment_reminder',
          title: 'Lembrete de Consulta',
          body: 'Consulta em 1 hora',
          data: { appointmentId: 'apt-123' },
          sentAt: new Date(),
          status: 'sent',
          errorMessage: null,
          retryCount: 0
        }
      ]

      vi.mocked(notificationManager.getNotificationHistory).mockResolvedValue(mockNotifications)
      vi.mocked(notificationManager.markNotificationClicked).mockResolvedValue()

      render(
        <TestWrapper>
          <NotificationCenter />
        </TestWrapper>
      )

      const bellButton = screen.getByRole('button')
      fireEvent.click(bellButton)

      await waitFor(() => {
        const notification = screen.getByText('Lembrete de Consulta')
        fireEvent.click(notification)
      })

      expect(notificationManager.markNotificationClicked).toHaveBeenCalledWith('notif-1')
    })
  })

  describe('Real-time Notification Updates', () => {
    it('should handle real-time notification updates via Supabase', async () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      }

      vi.mocked(supabase.channel).mockReturnValue(mockChannel)

      render(
        <TestWrapper>
          <NotificationCenter />
        </TestWrapper>
      )

      // Verify real-time subscription setup
      expect(supabase.channel).toHaveBeenCalledWith('notification-updates')
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'notification_history'
        }),
        expect.any(Function)
      )
    })

    it('should update notification list when new notification arrives', async () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      }

      let realtimeCallback: Function

      mockChannel.on.mockImplementation((event, config, callback) => {
        if (event === 'postgres_changes') {
          realtimeCallback = callback
        }
        return mockChannel
      })

      vi.mocked(supabase.channel).mockReturnValue(mockChannel)

      const initialNotifications = [
        {
          id: 'notif-1',
          userId: 'test-user',
          type: 'appointment_reminder',
          title: 'Consulta Antiga',
          body: 'Consulta antiga',
          data: {},
          sentAt: new Date(),
          status: 'sent',
          errorMessage: null,
          retryCount: 0
        }
      ]

      vi.mocked(notificationManager.getNotificationHistory)
        .mockResolvedValueOnce(initialNotifications)
        .mockResolvedValueOnce([
          ...initialNotifications,
          {
            id: 'notif-2',
            userId: 'test-user',
            type: 'exercise_reminder',
            title: 'Nova Notificação',
            body: 'Nova notificação em tempo real',
            data: {},
            sentAt: new Date(),
            status: 'sent',
            errorMessage: null,
            retryCount: 0
          }
        ])

      render(
        <TestWrapper>
          <NotificationCenter />
        </TestWrapper>
      )

      const bellButton = screen.getByRole('button')
      fireEvent.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('Consulta Antiga')).toBeInTheDocument()
      })

      // Simulate real-time notification
      const newNotification = {
        new: {
          id: 'notif-2',
          user_id: 'test-user',
          type: 'exercise_reminder',
          title: 'Nova Notificação',
          body: 'Nova notificação em tempo real'
        }
      }

      await waitFor(() => {
        realtimeCallback(newNotification)
      })

      await waitFor(() => {
        expect(screen.getByText('Nova Notificação')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(notificationManager.getNotificationHistory).mockRejectedValue(
        new Error('Network error')
      )

      render(
        <TestWrapper>
          <NotificationCenter />
        </TestWrapper>
      )

      const bellButton = screen.getByRole('button')
      fireEvent.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('Nenhuma notificação')).toBeInTheDocument()
      })
    })

    it('should retry failed operations', async () => {
      vi.mocked(notificationManager.updatePreferences)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          userId: 'test-user',
          appointmentReminders: false,
          exerciseReminders: true,
          progressUpdates: true,
          systemAlerts: true,
          therapistMessages: true,
          paymentReminders: true,
          quietHours: { start: '22:00', end: '08:00' },
          weekendNotifications: false
        })

      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      )

      const appointmentToggle = await screen.findByLabelText(/lembretes de consulta/i)
      fireEvent.click(appointmentToggle)

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByText(/erro ao atualizar/i)).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByText(/tentar novamente/i)
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(notificationManager.updatePreferences).toHaveBeenCalledTimes(2)
      })
    })

    it('should handle subscription failures', async () => {
      vi.mocked(notificationManager.requestPermission).mockResolvedValue(true)
      vi.mocked(notificationManager.subscribe).mockRejectedValue(
        new Error('Subscription failed')
      )

      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      )

      const enableButton = await screen.findByText('Ativar Notificações')
      fireEvent.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText(/erro ao ativar notificações/i)).toBeInTheDocument()
      })
    })
  })

  describe('Offline Functionality', () => {
    it('should queue notifications when offline', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }

      Object.defineProperty(global, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      })

      render(
        <TestWrapper>
          <NotificationCenter />
        </TestWrapper>
      )

      // Simulate offline notification
      const offlineNotification = {
        id: 'offline-1',
        type: 'appointment_reminder',
        title: 'Offline Notification',
        body: 'This should be queued',
        timestamp: Date.now()
      }

      // This would typically be triggered by the service worker
      window.dispatchEvent(new CustomEvent('notification-queued', {
        detail: offlineNotification
      }))

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'offline-notifications',
        expect.stringContaining('Offline Notification')
      )
    })

    it('should sync queued notifications when back online', async () => {
      const queuedNotifications = [
        {
          id: 'offline-1',
          type: 'appointment_reminder',
          title: 'Queued Notification',
          body: 'This was queued offline',
          timestamp: Date.now() - 60000
        }
      ]

      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue(JSON.stringify(queuedNotifications)),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }

      Object.defineProperty(global, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      })

      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      render(
        <TestWrapper>
          <NotificationCenter />
        </TestWrapper>
      )

      // Go back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })

      window.dispatchEvent(new Event('online'))

      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('offline-notifications')
      })
    })
  })
})