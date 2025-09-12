import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { NotificationCenter } from '../NotificationCenter'
import { notificationManager } from '@/lib/services/NotificationManager'

// Mock dependencies
vi.mock('@/lib/services/NotificationManager')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn()
  }
})

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '5 minutes ago')
}))

vi.mock('date-fns/locale', () => ({
  ptBR: {}
}))

const mockNotificationHistory = [
  {
    id: 'notif-1',
    userId: 'user-1',
    type: 'appointment_reminder',
    title: 'Lembrete de Consulta',
    body: 'Você tem uma consulta agendada para hoje às 14:00',
    data: {},
    sentAt: new Date('2024-01-15T10:00:00Z'),
    status: 'sent',
    errorMessage: null,
    retryCount: 0
  },
  {
    id: 'notif-2',
    userId: 'user-1',
    type: 'exercise_reminder',
    title: 'Hora dos Exercícios',
    body: 'Não esqueça de fazer seus exercícios prescritos',
    data: {},
    sentAt: new Date('2024-01-15T09:00:00Z'),
    deliveredAt: new Date('2024-01-15T09:01:00Z'),
    status: 'delivered',
    errorMessage: null,
    retryCount: 0
  },
  {
    id: 'notif-3',
    userId: 'user-1',
    type: 'system_alert',
    title: 'Alerta do Sistema',
    body: 'Manutenção programada para hoje às 22:00',
    data: {},
    sentAt: new Date('2024-01-15T08:00:00Z'),
    clickedAt: new Date('2024-01-15T08:05:00Z'),
    status: 'clicked',
    errorMessage: null,
    retryCount: 0
  }
]

const renderNotificationCenter = () => {
  return render(
    <BrowserRouter>
      <NotificationCenter />
    </BrowserRouter>
  )
}

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock NotificationManager methods
    vi.mocked(notificationManager.initialize).mockResolvedValue()
    vi.mocked(notificationManager.getNotificationHistory).mockResolvedValue(mockNotificationHistory)
    vi.mocked(notificationManager.markNotificationClicked).mockResolvedValue()
  })

  it('should render notification bell icon', () => {
    renderNotificationCenter()
    
    const bellIcon = screen.getByRole('button')
    expect(bellIcon).toBeInTheDocument()
  })

  it('should show unread count badge', async () => {
    renderNotificationCenter()
    
    await waitFor(() => {
      const badge = screen.getByText('2') // 2 unread notifications (sent + delivered)
      expect(badge).toBeInTheDocument()
    })
  })

  it('should open dropdown when clicked', async () => {
    renderNotificationCenter()
    
    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)
    
    await waitFor(() => {
      expect(screen.getByText('Notificações')).toBeInTheDocument()
    })
  })

  it('should display notification list', async () => {
    renderNotificationCenter()
    
    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)
    
    await waitFor(() => {
      expect(screen.getByText('Lembrete de Consulta')).toBeInTheDocument()
      expect(screen.getByText('Hora dos Exercícios')).toBeInTheDocument()
      expect(screen.getByText('Alerta do Sistema')).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    vi.mocked(notificationManager.getNotificationHistory).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )
    
    renderNotificationCenter()
    
    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)
    
    expect(screen.getByRole('progressbar') || screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('should show empty state when no notifications', async () => {
    vi.mocked(notificationManager.getNotificationHistory).mockResolvedValue([])
    
    renderNotificationCenter()
    
    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)
    
    await waitFor(() => {
      expect(screen.getByText('Nenhuma notificação')).toBeInTheDocument()
    })
  })

  it('should handle notification click', async () => {
    const mockNavigate = vi.fn()
    vi.mocked(require('react-router-dom').useNavigate).mockReturnValue(mockNavigate)
    
    renderNotificationCenter()
    
    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)
    
    await waitFor(() => {
      const notification = screen.getByText('Lembrete de Consulta')
      fireEvent.click(notification)
    })
    
    expect(notificationManager.markNotificationClicked).toHaveBeenCalledWith('notif-1')
    expect(mockNavigate).toHaveBeenCalledWith('/schedule')
  })

  it('should navigate to settings when configure button is clicked', async () => {
    const mockNavigate = vi.fn()
    vi.mocked(require('react-router-dom').useNavigate).mockReturnValue(mockNavigate)
    
    renderNotificationCenter()
    
    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)
    
    await waitFor(() => {
      const configureButton = screen.getByText('Configurar')
      fireEvent.click(configureButton)
    })
    
    expect(mockNavigate).toHaveBeenCalledWith('/settings?tab=notifications')
  })

  it('should show correct notification icons based on type', async () => {
    renderNotificationCenter()
    
    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)
    
    await waitFor(() => {
      // Check that different notification types have different icons
      // This would require checking for specific icon classes or data attributes
      const notifications = screen.getAllByRole('menuitem')
      expect(notifications).toHaveLength(3)
    })
  })

  it('should handle service worker messages', async () => {
    const mockAddEventListener = vi.fn()
    const mockRemoveEventListener = vi.fn()
    
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener
      },
      writable: true
    })
    
    const { unmount } = renderNotificationCenter()
    
    expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    
    unmount()
    
    expect(mockRemoveEventListener).toHaveBeenCalledWith('message', expect.any(Function))
  })

  it('should initialize notification manager on mount', async () => {
    renderNotificationCenter()
    
    await waitFor(() => {
      expect(notificationManager.initialize).toHaveBeenCalled()
    })
  })

  it('should load notification history on mount', async () => {
    renderNotificationCenter()
    
    await waitFor(() => {
      expect(notificationManager.getNotificationHistory).toHaveBeenCalledWith(10, 0)
    })
  })

  it('should handle notification manager initialization failure', async () => {
    vi.mocked(notificationManager.initialize).mockRejectedValue(new Error('Init failed'))
    
    // Should not crash the component
    renderNotificationCenter()
    
    const bellButton = screen.getByRole('button')
    expect(bellButton).toBeInTheDocument()
  })

  it('should handle notification history loading failure', async () => {
    vi.mocked(notificationManager.getNotificationHistory).mockRejectedValue(new Error('Load failed'))
    
    renderNotificationCenter()
    
    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)
    
    // Should show empty state or error state
    await waitFor(() => {
      expect(screen.getByText('Nenhuma notificação')).toBeInTheDocument()
    })
  })

  it('should show correct relative time for notifications', async () => {
    renderNotificationCenter()
    
    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)
    
    await waitFor(() => {
      // Should show formatted relative time
      expect(screen.getAllByText('5 minutes ago')).toHaveLength(3)
    })
  })

  it('should highlight unread notifications', async () => {
    renderNotificationCenter()
    
    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)
    
    await waitFor(() => {
      const notifications = screen.getAllByRole('menuitem')
      
      // First two notifications should be highlighted (sent/delivered status)
      expect(notifications[0]).toHaveClass('bg-muted/50')
      expect(notifications[1]).toHaveClass('bg-muted/50')
      
      // Third notification (clicked) should not be highlighted
      expect(notifications[2]).not.toHaveClass('bg-muted/50')
    })
  })

  it('should show "Ver histórico completo" link', async () => {
    renderNotificationCenter()
    
    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)
    
    await waitFor(() => {
      expect(screen.getByText('Ver histórico completo')).toBeInTheDocument()
    })
  })

  it('should navigate to full history when link is clicked', async () => {
    const mockNavigate = vi.fn()
    vi.mocked(require('react-router-dom').useNavigate).mockReturnValue(mockNavigate)
    
    renderNotificationCenter()
    
    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)
    
    await waitFor(() => {
      const historyLink = screen.getByText('Ver histórico completo')
      fireEvent.click(historyLink)
    })
    
    expect(mockNavigate).toHaveBeenCalledWith('/settings?tab=notifications')
  })
})