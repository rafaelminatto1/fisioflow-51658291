import { useCallback, useEffect, useState } from 'react'
import { 
  notificationErrorHandler, 
  NotificationError, 
  NotificationErrorType,
  RetryConfig,
  FallbackConfig
} from '@/lib/services/NotificationErrorHandler'
import { logger } from '@/lib/errors/logger'
import { toast } from 'sonner'

export const useNotificationErrorHandling = () => {
  const [errorStats, setErrorStats] = useState({
    totalErrors: 0,
    errorsByType: {} as Record<NotificationErrorType, number>,
    retrySuccessRate: 0
  })
  
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      logger.info('Network connection restored', {}, 'useNotificationErrorHandling')
      
      // Process any queued offline notifications
      processOfflineQueue()
    }

    const handleOffline = () => {
      setIsOnline(false)
      logger.warn('Network connection lost', {}, 'useNotificationErrorHandling')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  /**
   * Handle notification error
   */
  const handleError = useCallback(async (error: NotificationError): Promise<boolean> => {
    try {
      const handled = await notificationErrorHandler.handleError(error)
      
      // Update error stats
      setErrorStats(prev => ({
        totalErrors: prev.totalErrors + 1,
        errorsByType: {
          ...prev.errorsByType,
          [error.type]: (prev.errorsByType[error.type] || 0) + 1
        },
        retrySuccessRate: prev.retrySuccessRate // Would be calculated from actual retry results
      }))

      return handled
    } catch (handlerError) {
      logger.error('Error in error handler hook', handlerError, 'useNotificationErrorHandling')
      return false
    }
  }, [])

  /**
   * Create error from exception
   */
  const createError = useCallback((
    type: NotificationErrorType,
    message: string,
    originalError?: Error,
    context?: Record<string, any>,
    retryable: boolean = true
  ): NotificationError => {
    return {
      type,
      message,
      originalError,
      context,
      timestamp: new Date(),
      retryable,
      retryCount: 0
    }
  }, [])

  /**
   * Handle permission denied error
   */
  const handlePermissionDenied = useCallback(async (context?: Record<string, any>) => {
    const error = createError(
      NotificationErrorType.PERMISSION_DENIED,
      'User denied notification permission',
      undefined,
      context,
      false
    )
    
    return await handleError(error)
  }, [createError, handleError])

  /**
   * Handle subscription failed error
   */
  const handleSubscriptionFailed = useCallback(async (
    originalError: Error,
    context?: Record<string, any>
  ) => {
    const error = createError(
      NotificationErrorType.SUBSCRIPTION_FAILED,
      'Failed to create push subscription',
      originalError,
      context,
      true
    )
    
    return await handleError(error)
  }, [createError, handleError])

  /**
   * Handle network error
   */
  const handleNetworkError = useCallback(async (
    originalError: Error,
    context?: Record<string, any>
  ) => {
    const error = createError(
      NotificationErrorType.NETWORK_ERROR,
      'Network error occurred',
      originalError,
      context,
      true
    )
    
    return await handleError(error)
  }, [createError, handleError])

  /**
   * Handle service worker error
   */
  const handleServiceWorkerError = useCallback(async (
    originalError: Error,
    context?: Record<string, any>
  ) => {
    const error = createError(
      NotificationErrorType.SERVICE_WORKER_ERROR,
      'Service worker error',
      originalError,
      context,
      true
    )
    
    return await handleError(error)
  }, [createError, handleError])

  /**
   * Handle delivery failed error
   */
  const handleDeliveryFailed = useCallback(async (
    message: string,
    context?: Record<string, any>
  ) => {
    const error = createError(
      NotificationErrorType.DELIVERY_FAILED,
      message,
      undefined,
      context,
      true
    )
    
    return await handleError(error)
  }, [createError, handleError])

  /**
   * Handle rate limited error
   */
  const handleRateLimited = useCallback(async (
    retryAfter?: number,
    context?: Record<string, any>
  ) => {
    const error = createError(
      NotificationErrorType.RATE_LIMITED,
      'Rate limit exceeded',
      undefined,
      { ...context, retryAfter },
      true
    )
    
    return await handleError(error)
  }, [createError, handleError])

  /**
   * Handle invalid payload error
   */
  const handleInvalidPayload = useCallback(async (
    validationErrors: string[],
    payload: any
  ) => {
    const error = createError(
      NotificationErrorType.INVALID_PAYLOAD,
      'Invalid notification payload',
      undefined,
      { validationErrors, payload },
      false
    )
    
    return await handleError(error)
  }, [createError, handleError])

  /**
   * Handle user not found error
   */
  const handleUserNotFound = useCallback(async (userId: string) => {
    const error = createError(
      NotificationErrorType.USER_NOT_FOUND,
      'User not found',
      undefined,
      { userId },
      false
    )
    
    return await handleError(error)
  }, [createError, handleError])

  /**
   * Handle template error
   */
  const handleTemplateError = useCallback(async (
    templateId: string,
    templateData: any,
    renderError: Error
  ) => {
    const error = createError(
      NotificationErrorType.TEMPLATE_ERROR,
      'Template rendering failed',
      renderError,
      { templateId, templateData },
      false
    )
    
    return await handleError(error)
  }, [createError, handleError])

  /**
   * Handle database error
   */
  const handleDatabaseError = useCallback(async (
    originalError: Error,
    context?: Record<string, any>
  ) => {
    const error = createError(
      NotificationErrorType.DATABASE_ERROR,
      'Database operation failed',
      originalError,
      context,
      true
    )
    
    return await handleError(error)
  }, [createError, handleError])

  /**
   * Process offline notification queue
   */
  const processOfflineQueue = useCallback(async () => {
    try {
      // Process notifications stored while offline
      const offlineNotifications = getOfflineNotifications()
      
      for (const notification of offlineNotifications) {
        try {
          // Attempt to send the queued notification
          await sendQueuedNotification(notification)
          
          // Remove from offline storage on success
          removeOfflineNotification(notification.id)
        } catch (error) {
          logger.error('Failed to process offline notification', error, 'useNotificationErrorHandling')
        }
      }
      
      if (offlineNotifications.length > 0) {
        toast.success(`${offlineNotifications.length} notificações enviadas após reconexão`)
      }
    } catch (error) {
      logger.error('Failed to process offline queue', error, 'useNotificationErrorHandling')
    }
  }, [])

  /**
   * Get offline notifications from storage
   */
  const getOfflineNotifications = useCallback((): any[] => {
    try {
      const notifications = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('offline_notification_')) {
          const data = localStorage.getItem(key)
          if (data) {
            notifications.push({
              id: key,
              ...JSON.parse(data)
            })
          }
        }
      }
      
      return notifications
    } catch (error) {
      logger.error('Failed to get offline notifications', error, 'useNotificationErrorHandling')
      return []
    }
  }, [])

  /**
   * Send queued notification
   */
  const sendQueuedNotification = useCallback(async (notification: any) => {
    // Implementation would depend on the notification service being used
    logger.info('Sending queued notification', { notificationId: notification.id }, 'useNotificationErrorHandling')
  }, [])

  /**
   * Remove offline notification from storage
   */
  const removeOfflineNotification = useCallback((notificationId: string) => {
    try {
      localStorage.removeItem(notificationId)
    } catch (error) {
      logger.error('Failed to remove offline notification', error, 'useNotificationErrorHandling')
    }
  }, [])

  /**
   * Update retry configuration
   */
  const updateRetryConfig = useCallback((config: Partial<RetryConfig>) => {
    notificationErrorHandler.updateRetryConfig(config)
  }, [])

  /**
   * Update fallback configuration
   */
  const updateFallbackConfig = useCallback((config: Partial<FallbackConfig>) => {
    notificationErrorHandler.updateFallbackConfig(config)
  }, [])

  /**
   * Test error handling
   */
  const testErrorHandling = useCallback(async (errorType: NotificationErrorType) => {
    const testError = createError(
      errorType,
      `Test error of type ${errorType}`,
      undefined,
      { test: true },
      true
    )
    
    const handled = await handleError(testError)
    
    toast.info(`Test error ${errorType} ${handled ? 'handled successfully' : 'failed to handle'}`)
    
    return handled
  }, [createError, handleError])

  /**
   * Clear error statistics
   */
  const clearErrorStats = useCallback(() => {
    setErrorStats({
      totalErrors: 0,
      errorsByType: {} as Record<NotificationErrorType, number>,
      retrySuccessRate: 0
    })
  }, [])

  /**
   * Get error recovery suggestions
   */
  const getRecoverySuggestions = useCallback((errorType: NotificationErrorType): string[] => {
    switch (errorType) {
      case NotificationErrorType.PERMISSION_DENIED:
        return [
          'Clique no ícone de cadeado na barra de endereços',
          'Selecione "Permitir" para notificações',
          'Recarregue a página após alterar as permissões'
        ]
      
      case NotificationErrorType.NETWORK_ERROR:
        return [
          'Verifique sua conexão com a internet',
          'Tente novamente em alguns instantes',
          'As notificações serão enviadas quando voltar online'
        ]
      
      case NotificationErrorType.SERVICE_WORKER_ERROR:
        return [
          'Recarregue a página',
          'Limpe o cache do navegador',
          'Verifique se o navegador suporta service workers'
        ]
      
      default:
        return [
          'Tente novamente em alguns instantes',
          'Verifique sua conexão com a internet',
          'Entre em contato com o suporte se o problema persistir'
        ]
    }
  }, [])

  return {
    // State
    errorStats,
    isOnline,
    
    // Error handlers
    handleError,
    handlePermissionDenied,
    handleSubscriptionFailed,
    handleNetworkError,
    handleServiceWorkerError,
    handleDeliveryFailed,
    handleRateLimited,
    handleInvalidPayload,
    handleUserNotFound,
    handleTemplateError,
    handleDatabaseError,
    
    // Utilities
    createError,
    processOfflineQueue,
    updateRetryConfig,
    updateFallbackConfig,
    testErrorHandling,
    clearErrorStats,
    getRecoverySuggestions
  }
}

export default useNotificationErrorHandling