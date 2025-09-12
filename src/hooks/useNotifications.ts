import { useState, useEffect, useCallback } from 'react'
import { notificationManager } from '@/lib/services/NotificationManager'
import { 
  NotificationPreferences, 
  NotificationPermissionState, 
  NotificationHistory 
} from '@/types/notifications'
import { toast } from 'sonner'

export const useNotifications = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [permissionState, setPermissionState] = useState<NotificationPermissionState | null>(null)
  const [history, setHistory] = useState<NotificationHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Initialize notification manager
  const initialize = useCallback(async () => {
    if (initialized) return
    
    try {
      await notificationManager.initialize()
      setInitialized(true)
      
      // Load initial data
      await Promise.all([
        loadPreferences(),
        loadPermissionState(),
        loadHistory()
      ])
    } catch (error) {
      console.error('Failed to initialize notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [initialized])

  // Load user preferences
  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await notificationManager.getPreferences()
      setPreferences(prefs)
    } catch (error) {
      console.error('Failed to load preferences:', error)
    }
  }, [])

  // Load permission state
  const loadPermissionState = useCallback(async () => {
    try {
      const state = await notificationManager.getPermissionState()
      setPermissionState(state)
    } catch (error) {
      console.error('Failed to load permission state:', error)
    }
  }, [])

  // Load notification history
  const loadHistory = useCallback(async (limit = 10, offset = 0) => {
    try {
      const notifications = await notificationManager.getNotificationHistory(limit, offset)
      if (offset === 0) {
        setHistory(notifications)
      } else {
        setHistory(prev => [...prev, ...notifications])
      }
      return notifications
    } catch (error) {
      console.error('Failed to load notification history:', error)
      return []
    }
  }, [])

  // Request notification permission
  const requestPermission = useCallback(async () => {
    try {
      const granted = await notificationManager.requestPermission()
      if (granted) {
        await notificationManager.subscribe()
        toast.success('Notificações ativadas com sucesso!')
        await loadPermissionState()
        return true
      } else {
        toast.error('Permissão para notificações negada')
        return false
      }
    } catch (error) {
      console.error('Failed to request permission:', error)
      toast.error('Erro ao solicitar permissão para notificações')
      return false
    }
  }, [loadPermissionState])

  // Unsubscribe from notifications
  const unsubscribe = useCallback(async () => {
    try {
      await notificationManager.unsubscribe()
      toast.success('Notificações desativadas')
      await loadPermissionState()
    } catch (error) {
      console.error('Failed to unsubscribe:', error)
      toast.error('Erro ao desativar notificações')
    }
  }, [loadPermissionState])

  // Update preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const updated = await notificationManager.updatePreferences(newPreferences)
      if (updated) {
        setPreferences(updated)
        toast.success('Preferências atualizadas com sucesso!')
        return updated
      } else {
        toast.error('Erro ao atualizar preferências')
        return null
      }
    } catch (error) {
      console.error('Failed to update preferences:', error)
      toast.error('Erro ao atualizar preferências')
      return null
    }
  }, [])

  // Mark notification as clicked
  const markAsClicked = useCallback(async (notificationId: string) => {
    try {
      await notificationManager.markNotificationClicked(notificationId)
      
      // Update local history
      setHistory(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, status: 'clicked', clickedAt: new Date() }
            : notification
        )
      )
    } catch (error) {
      console.error('Failed to mark notification as clicked:', error)
    }
  }, [])

  // Get unread count
  const unreadCount = history.filter(n => 
    n.status === 'sent' || n.status === 'delivered'
  ).length

  // Check if notifications are supported
  const isSupported = notificationManager.isSupported()

  // Initialize on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  // Listen for service worker messages
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICKED') {
        const { data } = event.data
        if (data?.notificationId) {
          markAsClicked(data.notificationId)
        }
        // Reload history to get updated status
        loadHistory()
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [markAsClicked, loadHistory])

  return {
    // State
    preferences,
    permissionState,
    history,
    loading,
    initialized,
    unreadCount,
    isSupported,
    
    // Actions
    initialize,
    requestPermission,
    unsubscribe,
    updatePreferences,
    markAsClicked,
    loadHistory,
    loadPreferences,
    loadPermissionState
  }
}

export default useNotifications