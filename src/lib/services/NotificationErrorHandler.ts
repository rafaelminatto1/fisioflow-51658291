import { logger } from '@/lib/errors/logger'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

export enum NotificationErrorType {
  PERMISSION_DENIED = 'permission_denied',
  SUBSCRIPTION_FAILED = 'subscription_failed',
  NETWORK_ERROR = 'network_error',
  SERVICE_WORKER_ERROR = 'service_worker_error',
  DELIVERY_FAILED = 'delivery_failed',
  INVALID_PAYLOAD = 'invalid_payload',
  RATE_LIMITED = 'rate_limited',
  USER_NOT_FOUND = 'user_not_found',
  TEMPLATE_ERROR = 'template_error',
  DATABASE_ERROR = 'database_error'
}

export interface NotificationError {
  type: NotificationErrorType
  message: string
  originalError?: Error
  context?: Record<string, any>
  timestamp: Date
  retryable: boolean
  retryCount?: number
  maxRetries?: number
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number // milliseconds
  maxDelay: number // milliseconds
  backoffMultiplier: number
  retryableErrors: NotificationErrorType[]
}

export interface FallbackConfig {
  enableInAppNotifications: boolean
  enableEmailFallback: boolean
  enableSMSFallback: boolean
  showUserFriendlyMessages: boolean
  logAllErrors: boolean
}

export class NotificationErrorHandler {
  private static instance: NotificationErrorHandler
  private retryConfig: RetryConfig
  private fallbackConfig: FallbackConfig
  private errorQueue: Map<string, NotificationError[]> = new Map()

  private constructor() {
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryableErrors: [
        NotificationErrorType.NETWORK_ERROR,
        NotificationErrorType.DELIVERY_FAILED,
        NotificationErrorType.SERVICE_WORKER_ERROR,
        NotificationErrorType.RATE_LIMITED
      ]
    }

    this.fallbackConfig = {
      enableInAppNotifications: true,
      enableEmailFallback: false,
      enableSMSFallback: false,
      showUserFriendlyMessages: true,
      logAllErrors: true
    }
  }

  static getInstance(): NotificationErrorHandler {
    if (!NotificationErrorHandler.instance) {
      NotificationErrorHandler.instance = new NotificationErrorHandler()
    }
    return NotificationErrorHandler.instance
  }

  /**
   * Handle notification error with appropriate recovery strategy
   */
  async handleError(error: NotificationError): Promise<boolean> {
    try {
      // Log the error
      if (this.fallbackConfig.logAllErrors) {
        logger.error('Notification error occurred', {
          type: error.type,
          message: error.message,
          context: error.context,
          retryCount: error.retryCount || 0
        }, 'NotificationErrorHandler')
      }

      // Store error for analytics
      await this.storeError(error)

      // Handle specific error types
      switch (error.type) {
        case NotificationErrorType.PERMISSION_DENIED:
          return await this.handlePermissionDenied(error)
        
        case NotificationErrorType.SUBSCRIPTION_FAILED:
          return await this.handleSubscriptionFailed(error)
        
        case NotificationErrorType.NETWORK_ERROR:
          return await this.handleNetworkError(error)
        
        case NotificationErrorType.SERVICE_WORKER_ERROR:
          return await this.handleServiceWorkerError(error)
        
        case NotificationErrorType.DELIVERY_FAILED:
          return await this.handleDeliveryFailed(error)
        
        case NotificationErrorType.RATE_LIMITED:
          return await this.handleRateLimited(error)
        
        case NotificationErrorType.INVALID_PAYLOAD:
          return await this.handleInvalidPayload(error)
        
        case NotificationErrorType.USER_NOT_FOUND:
          return await this.handleUserNotFound(error)
        
        case NotificationErrorType.TEMPLATE_ERROR:
          return await this.handleTemplateError(error)
        
        case NotificationErrorType.DATABASE_ERROR:
          return await this.handleDatabaseError(error)
        
        default:
          return await this.handleGenericError(error)
      }
    } catch (handlerError) {
      logger.error('Error in error handler', handlerError, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Handle permission denied errors
   */
  private async handlePermissionDenied(error: NotificationError): Promise<boolean> {
    try {
      // Show user-friendly message
      if (this.fallbackConfig.showUserFriendlyMessages) {
        toast.error('Permissão para notificações negada', {
          description: 'Você pode ativar nas configurações do navegador',
          action: {
            label: 'Configurar',
            onClick: () => this.showPermissionInstructions()
          }
        })
      }

      // Enable in-app notifications as fallback
      if (this.fallbackConfig.enableInAppNotifications) {
        await this.enableInAppNotificationFallback(error.context?.userId)
      }

      // Store user preference to not ask again for a while
      await this.storePermissionDenialTimestamp(error.context?.userId)

      return true // Handled successfully
    } catch (fallbackError) {
      logger.error('Failed to handle permission denied', fallbackError, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Handle subscription failed errors
   */
  private async handleSubscriptionFailed(error: NotificationError): Promise<boolean> {
    try {
      // Check if retryable
      if (this.isRetryable(error)) {
        return await this.scheduleRetry(error)
      }

      // Show user message
      if (this.fallbackConfig.showUserFriendlyMessages) {
        toast.warning('Problema com notificações push', {
          description: 'Usando notificações no app como alternativa'
        })
      }

      // Enable fallback mechanisms
      if (this.fallbackConfig.enableInAppNotifications) {
        await this.enableInAppNotificationFallback(error.context?.userId)
      }

      return true
    } catch (fallbackError) {
      logger.error('Failed to handle subscription failed', fallbackError, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Handle network errors
   */
  private async handleNetworkError(error: NotificationError): Promise<boolean> {
    try {
      // Queue for retry when network is available
      await this.queueForOfflineRetry(error)

      // Show offline indicator
      if (this.fallbackConfig.showUserFriendlyMessages) {
        toast.info('Sem conexão', {
          description: 'Notificações serão enviadas quando voltar online'
        })
      }

      // Enable offline storage
      await this.storeOfflineNotification(error)

      return true
    } catch (fallbackError) {
      logger.error('Failed to handle network error', fallbackError, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Handle service worker errors
   */
  private async handleServiceWorkerError(error: NotificationError): Promise<boolean> {
    try {
      // Try to re-register service worker
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js')
          logger.info('Service worker re-registered after error', {}, 'NotificationErrorHandler')
        } catch (swError) {
          logger.error('Failed to re-register service worker', swError, 'NotificationErrorHandler')
        }
      }

      // Fallback to in-app notifications
      if (this.fallbackConfig.enableInAppNotifications) {
        await this.enableInAppNotificationFallback(error.context?.userId)
      }

      // Show user message
      if (this.fallbackConfig.showUserFriendlyMessages) {
        toast.warning('Problema técnico com notificações', {
          description: 'Tentando resolver automaticamente...'
        })
      }

      return true
    } catch (fallbackError) {
      logger.error('Failed to handle service worker error', fallbackError, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Handle delivery failed errors
   */
  private async handleDeliveryFailed(error: NotificationError): Promise<boolean> {
    try {
      // Check if retryable
      if (this.isRetryable(error)) {
        return await this.scheduleRetry(error)
      }

      // Try alternative delivery methods
      if (error.context?.notificationData) {
        const delivered = await this.tryAlternativeDelivery(error.context.notificationData, error.context.userId)
        if (delivered) {
          return true
        }
      }

      // Mark as failed and notify admin if critical
      if (error.context?.critical) {
        await this.notifyAdminOfCriticalFailure(error)
      }

      return false
    } catch (fallbackError) {
      logger.error('Failed to handle delivery failed', fallbackError, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Handle rate limited errors
   */
  private async handleRateLimited(error: NotificationError): Promise<boolean> {
    try {
      // Calculate delay based on rate limit info
      const delay = this.calculateRateLimitDelay(error.context?.retryAfter)
      
      // Schedule retry after delay
      setTimeout(async () => {
        await this.scheduleRetry(error)
      }, delay)

      logger.info('Notification rate limited, scheduled retry', { 
        delay, 
        retryAfter: error.context?.retryAfter 
      }, 'NotificationErrorHandler')

      return true
    } catch (fallbackError) {
      logger.error('Failed to handle rate limited', fallbackError, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Handle invalid payload errors
   */
  private async handleInvalidPayload(error: NotificationError): Promise<boolean> {
    try {
      // Log detailed payload info for debugging
      logger.error('Invalid notification payload', {
        payload: error.context?.payload,
        validationErrors: error.context?.validationErrors
      }, 'NotificationErrorHandler')

      // Don't retry invalid payloads
      return false
    } catch (fallbackError) {
      logger.error('Failed to handle invalid payload', fallbackError, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Handle user not found errors
   */
  private async handleUserNotFound(error: NotificationError): Promise<boolean> {
    try {
      // Clean up invalid user subscriptions
      if (error.context?.userId) {
        await this.cleanupInvalidUserSubscriptions(error.context.userId)
      }

      // Don't retry for non-existent users
      return false
    } catch (fallbackError) {
      logger.error('Failed to handle user not found', fallbackError, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Handle template errors
   */
  private async handleTemplateError(error: NotificationError): Promise<boolean> {
    try {
      // Log template error details
      logger.error('Notification template error', {
        templateId: error.context?.templateId,
        templateData: error.context?.templateData,
        renderError: error.message
      }, 'NotificationErrorHandler')

      // Try with fallback template
      if (error.context?.fallbackTemplate) {
        return await this.retryWithFallbackTemplate(error)
      }

      return false
    } catch (fallbackError) {
      logger.error('Failed to handle template error', fallbackError, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Handle database errors
   */
  private async handleDatabaseError(error: NotificationError): Promise<boolean> {
    try {
      // Check if retryable database error
      if (this.isRetryable(error)) {
        return await this.scheduleRetry(error)
      }

      // Store in local cache for later sync
      await this.storeInLocalCache(error)

      return true
    } catch (fallbackError) {
      logger.error('Failed to handle database error', fallbackError, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Handle generic errors
   */
  private async handleGenericError(error: NotificationError): Promise<boolean> {
    try {
      // Log unknown error
      logger.error('Unknown notification error', {
        type: error.type,
        message: error.message,
        context: error.context
      }, 'NotificationErrorHandler')

      // Try generic retry if retryable
      if (this.isRetryable(error)) {
        return await this.scheduleRetry(error)
      }

      return false
    } catch (fallbackError) {
      logger.error('Failed to handle generic error', fallbackError, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: NotificationError): boolean {
    if (!error.retryable) return false
    
    const retryCount = error.retryCount || 0
    const maxRetries = error.maxRetries || this.retryConfig.maxRetries
    
    return retryCount < maxRetries && 
           this.retryConfig.retryableErrors.includes(error.type)
  }

  /**
   * Schedule retry with exponential backoff
   */
  private async scheduleRetry(error: NotificationError): Promise<boolean> {
    try {
      const retryCount = (error.retryCount || 0) + 1
      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount - 1),
        this.retryConfig.maxDelay
      )

      setTimeout(async () => {
        const retryError = {
          ...error,
          retryCount,
          timestamp: new Date()
        }

        // Attempt the original operation again
        await this.retryOriginalOperation(retryError)
      }, delay)

      logger.info('Notification retry scheduled', {
        type: error.type,
        retryCount,
        delay
      }, 'NotificationErrorHandler')

      return true
    } catch (retryError) {
      logger.error('Failed to schedule retry', retryError, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Store error for analytics and debugging
   */
  private async storeError(error: NotificationError): Promise<void> {
    try {
      await supabase
        .from('notification_errors')
        .insert([{
          error_type: error.type,
          error_message: error.message,
          context: error.context || {},
          retry_count: error.retryCount || 0,
          created_at: error.timestamp.toISOString()
        }])
    } catch (dbError) {
      // Don't throw if error storage fails
      logger.error('Failed to store error in database', dbError, 'NotificationErrorHandler')
    }
  }

  /**
   * Enable in-app notification fallback
   */
  private async enableInAppNotificationFallback(userId?: string): Promise<void> {
    try {
      // Set user preference for in-app notifications
      if (userId) {
        await supabase
          .from('notification_preferences')
          .upsert([{
            user_id: userId,
            in_app_fallback_enabled: true
          }])
      }

      logger.info('In-app notification fallback enabled', { userId }, 'NotificationErrorHandler')
    } catch (error) {
      logger.error('Failed to enable in-app fallback', error, 'NotificationErrorHandler')
    }
  }

  /**
   * Show permission instructions to user
   */
  private showPermissionInstructions(): void {
    // This would show a modal or guide for enabling notifications
    toast.info('Para ativar notificações:', {
      description: 'Clique no ícone de cadeado na barra de endereços e permita notificações'
    })
  }

  /**
   * Store permission denial timestamp
   */
  private async storePermissionDenialTimestamp(userId?: string): Promise<void> {
    if (!userId) return

    try {
      await supabase
        .from('notification_preferences')
        .upsert([{
          user_id: userId,
          permission_denied_at: new Date().toISOString()
        }])
    } catch (error) {
      logger.error('Failed to store permission denial timestamp', error, 'NotificationErrorHandler')
    }
  }

  /**
   * Queue notification for offline retry
   */
  private async queueForOfflineRetry(error: NotificationError): Promise<void> {
    try {
      // Store in IndexedDB for offline retry
      if ('indexedDB' in window) {
        const db = await this.openOfflineDB()
        const transaction = db.transaction(['offline_notifications'], 'readwrite')
        const store = transaction.objectStore('offline_notifications')
        
        await store.add({
          error_data: error,
          queued_at: Date.now()
        })
      }
    } catch (error) {
      logger.error('Failed to queue for offline retry', error, 'NotificationErrorHandler')
    }
  }

  /**
   * Store notification offline
   */
  private async storeOfflineNotification(error: NotificationError): Promise<void> {
    try {
      // Store notification data for later delivery
      if (error.context?.notificationData) {
        localStorage.setItem(
          `offline_notification_${Date.now()}`,
          JSON.stringify(error.context.notificationData)
        )
      }
    } catch (storageError) {
      logger.error('Failed to store offline notification', storageError, 'NotificationErrorHandler')
    }
  }

  /**
   * Try alternative delivery methods
   */
  private async tryAlternativeDelivery(notificationData: any, userId: string): Promise<boolean> {
    try {
      // Try in-app notification
      if (this.fallbackConfig.enableInAppNotifications) {
        // This would trigger an in-app notification
        return true
      }

      // Try email fallback
      if (this.fallbackConfig.enableEmailFallback) {
        // This would send an email notification
        return await this.sendEmailNotification(notificationData, userId)
      }

      // Try SMS fallback
      if (this.fallbackConfig.enableSMSFallback) {
        // This would send an SMS notification
        return await this.sendSMSNotification(notificationData, userId)
      }

      return false
    } catch (error) {
      logger.error('Failed alternative delivery methods', error, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Calculate rate limit delay
   */
  private calculateRateLimitDelay(retryAfter?: number): number {
    if (retryAfter) {
      return retryAfter * 1000 // Convert to milliseconds
    }
    
    // Default exponential backoff
    return Math.min(this.retryConfig.baseDelay * 2, this.retryConfig.maxDelay)
  }

  /**
   * Cleanup invalid user subscriptions
   */
  private async cleanupInvalidUserSubscriptions(userId: string): Promise<void> {
    try {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        
      logger.info('Cleaned up invalid user subscriptions', { userId }, 'NotificationErrorHandler')
    } catch (error) {
      logger.error('Failed to cleanup invalid subscriptions', error, 'NotificationErrorHandler')
    }
  }

  /**
   * Retry with fallback template
   */
  private async retryWithFallbackTemplate(error: NotificationError): Promise<boolean> {
    try {
      // This would retry the notification with a simpler template
      logger.info('Retrying with fallback template', { 
        originalTemplate: error.context?.templateId 
      }, 'NotificationErrorHandler')
      
      return true
    } catch (retryError) {
      logger.error('Failed to retry with fallback template', retryError, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Store in local cache for later sync
   */
  private async storeInLocalCache(error: NotificationError): Promise<void> {
    try {
      const cacheKey = `notification_cache_${Date.now()}`
      localStorage.setItem(cacheKey, JSON.stringify(error.context))
    } catch (cacheError) {
      logger.error('Failed to store in local cache', cacheError, 'NotificationErrorHandler')
    }
  }

  /**
   * Retry original operation
   */
  private async retryOriginalOperation(error: NotificationError): Promise<void> {
    try {
      // This would retry the original notification operation
      // Implementation depends on the specific operation being retried
      logger.info('Retrying original operation', { 
        type: error.type,
        retryCount: error.retryCount 
      }, 'NotificationErrorHandler')
    } catch (retryError) {
      logger.error('Failed to retry original operation', retryError, 'NotificationErrorHandler')
      
      // If retry fails, handle the error again (with incremented retry count)
      if (error.retryCount! < this.retryConfig.maxRetries) {
        await this.handleError({
          ...error,
          retryCount: (error.retryCount || 0) + 1
        })
      }
    }
  }

  /**
   * Notify admin of critical failure
   */
  private async notifyAdminOfCriticalFailure(error: NotificationError): Promise<void> {
    try {
      // Send notification to admin users about critical failure
      logger.error('Critical notification failure', {
        type: error.type,
        context: error.context
      }, 'NotificationErrorHandler')
    } catch (adminError) {
      logger.error('Failed to notify admin of critical failure', adminError, 'NotificationErrorHandler')
    }
  }

  /**
   * Send email notification as fallback
   */
  private async sendEmailNotification(notificationData: any, userId: string): Promise<boolean> {
    try {
      // Implementation would send email via email service
      logger.info('Email notification fallback attempted', { userId }, 'NotificationErrorHandler')
      return false // Not implemented
    } catch (error) {
      logger.error('Failed to send email notification', error, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Send SMS notification as fallback
   */
  private async sendSMSNotification(notificationData: any, userId: string): Promise<boolean> {
    try {
      // Implementation would send SMS via SMS service
      logger.info('SMS notification fallback attempted', { userId }, 'NotificationErrorHandler')
      return false // Not implemented
    } catch (error) {
      logger.error('Failed to send SMS notification', error, 'NotificationErrorHandler')
      return false
    }
  }

  /**
   * Open offline database
   */
  private async openOfflineDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NotificationErrorDB', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains('offline_notifications')) {
          db.createObjectStore('offline_notifications', { 
            keyPath: 'id', 
            autoIncrement: true 
          })
        }
      }
    })
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config }
  }

  /**
   * Update fallback configuration
   */
  updateFallbackConfig(config: Partial<FallbackConfig>): void {
    this.fallbackConfig = { ...this.fallbackConfig, ...config }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number
    errorsByType: Record<NotificationErrorType, number>
    retrySuccessRate: number
  } {
    // This would return statistics from stored errors
    return {
      totalErrors: 0,
      errorsByType: {} as Record<NotificationErrorType, number>,
      retrySuccessRate: 0
    }
  }
}

// Export singleton instance
export const notificationErrorHandler = NotificationErrorHandler.getInstance()