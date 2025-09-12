import { supabase } from '@/integrations/supabase/client'
import { 
  NotificationPreferences, 
  PushSubscription, 
  NotificationPermissionState,
  CreatePushSubscriptionRequest,
  UpdateNotificationPreferencesRequest,
  NotificationHistory
} from '@/types/notifications'
import { 
  createPushSubscriptionSchema, 
  updateNotificationPreferencesSchema,
  validateNotificationSupport 
} from '@/lib/validations/notifications'
import { logger } from '@/lib/errors/logger'

export class NotificationManager {
  private static instance: NotificationManager
  private registration: ServiceWorkerRegistration | null = null
  private subscription: PushSubscription | null = null

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  /**
   * Initialize the notification manager
   */
  async initialize(): Promise<void> {
    try {
      if (!validateNotificationSupport()) {
        logger.warn('Push notifications not supported', {}, 'NotificationManager')
        return
      }

      // Register service worker if not already registered
      if ('serviceWorker' in navigator) {
        this.registration = await navigator.serviceWorker.register('/sw.js')
        logger.info('Service Worker registered', { scope: this.registration.scope }, 'NotificationManager')
      }

      // Load existing subscription
      await this.loadExistingSubscription()
    } catch (error) {
      logger.error('Failed to initialize NotificationManager', error, 'NotificationManager')
      throw error
    }
  }

  /**
   * Get current notification permission state
   */
  async getPermissionState(): Promise<NotificationPermissionState> {
    const supported = validateNotificationSupport()
    const permission = supported ? Notification.permission : 'denied'
    const subscribed = this.subscription !== null

    return {
      permission,
      supported,
      subscribed,
      subscription: this.subscription || undefined
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (!validateNotificationSupport()) {
        logger.warn('Push notifications not supported', {}, 'NotificationManager')
        return false
      }

      if (Notification.permission === 'granted') {
        return true
      }

      const permission = await Notification.requestPermission()
      const granted = permission === 'granted'

      logger.info('Notification permission requested', { permission, granted }, 'NotificationManager')
      
      return granted
    } catch (error) {
      logger.error('Failed to request notification permission', error, 'NotificationManager')
      return false
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscription | null> {
    try {
      const hasPermission = await this.requestPermission()
      if (!hasPermission) {
        throw new Error('Notification permission denied')
      }

      if (!this.registration) {
        throw new Error('Service Worker not registered')
      }

      // Create push subscription
      const browserSubscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.VITE_VAPID_PUBLIC_KEY || ''
        )
      })

      // Convert to our format
      const subscriptionData: CreatePushSubscriptionRequest = {
        endpoint: browserSubscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(browserSubscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(browserSubscription.getKey('auth')!)
        },
        userAgent: navigator.userAgent
      }

      // Validate subscription data
      const validatedData = createPushSubscriptionSchema.parse(subscriptionData)

      // Save to database
      const { data, error } = await supabase
        .from('push_subscriptions')
        .insert([{
          user_id: (await supabase.auth.getUser()).data.user?.id,
          endpoint: validatedData.endpoint,
          p256dh: validatedData.keys.p256dh,
          auth: validatedData.keys.auth,
          user_agent: validatedData.userAgent
        }])
        .select()
        .single()

      if (error) {
        throw error
      }

      this.subscription = {
        id: data.id,
        userId: data.user_id,
        endpoint: data.endpoint,
        keys: {
          p256dh: data.p256dh,
          auth: data.auth
        },
        userAgent: data.user_agent,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      }

      logger.info('Push subscription created', { subscriptionId: this.subscription.id }, 'NotificationManager')
      
      return this.subscription
    } catch (error) {
      logger.error('Failed to create push subscription', error, 'NotificationManager')
      return null
    }
  }  
/**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<void> {
    try {
      if (!this.registration) {
        return
      }

      const browserSubscription = await this.registration.pushManager.getSubscription()
      if (browserSubscription) {
        await browserSubscription.unsubscribe()
      }

      // Remove from database
      if (this.subscription) {
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', this.subscription.id)

        if (error) {
          throw error
        }
      }

      this.subscription = null
      logger.info('Push subscription removed', {}, 'NotificationManager')
    } catch (error) {
      logger.error('Failed to unsubscribe from push notifications', error, 'NotificationManager')
      throw error
    }
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences | null> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error
      }

      if (!data) {
        return null
      }

      return {
        id: data.id,
        userId: data.user_id,
        appointmentReminders: data.appointment_reminders,
        exerciseReminders: data.exercise_reminders,
        progressUpdates: data.progress_updates,
        systemAlerts: data.system_alerts,
        therapistMessages: data.therapist_messages,
        paymentReminders: data.payment_reminders,
        quietHours: {
          start: data.quiet_hours_start,
          end: data.quiet_hours_end
        },
        weekendNotifications: data.weekend_notifications,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      }
    } catch (error) {
      logger.error('Failed to get notification preferences', error, 'NotificationManager')
      return null
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(preferences: UpdateNotificationPreferencesRequest): Promise<NotificationPreferences | null> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      // Validate preferences
      const validatedPreferences = updateNotificationPreferencesSchema.parse(preferences)

      const updateData: any = {}
      
      if (validatedPreferences.appointmentReminders !== undefined) {
        updateData.appointment_reminders = validatedPreferences.appointmentReminders
      }
      if (validatedPreferences.exerciseReminders !== undefined) {
        updateData.exercise_reminders = validatedPreferences.exerciseReminders
      }
      if (validatedPreferences.progressUpdates !== undefined) {
        updateData.progress_updates = validatedPreferences.progressUpdates
      }
      if (validatedPreferences.systemAlerts !== undefined) {
        updateData.system_alerts = validatedPreferences.systemAlerts
      }
      if (validatedPreferences.therapistMessages !== undefined) {
        updateData.therapist_messages = validatedPreferences.therapistMessages
      }
      if (validatedPreferences.paymentReminders !== undefined) {
        updateData.payment_reminders = validatedPreferences.paymentReminders
      }
      if (validatedPreferences.quietHours) {
        updateData.quiet_hours_start = validatedPreferences.quietHours.start
        updateData.quiet_hours_end = validatedPreferences.quietHours.end
      }
      if (validatedPreferences.weekendNotifications !== undefined) {
        updateData.weekend_notifications = validatedPreferences.weekendNotifications
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert([{
          user_id: user.user.id,
          ...updateData
        }])
        .select()
        .single()

      if (error) {
        throw error
      }

      logger.info('Notification preferences updated', { userId: user.user.id }, 'NotificationManager')

      return {
        id: data.id,
        userId: data.user_id,
        appointmentReminders: data.appointment_reminders,
        exerciseReminders: data.exercise_reminders,
        progressUpdates: data.progress_updates,
        systemAlerts: data.system_alerts,
        therapistMessages: data.therapist_messages,
        paymentReminders: data.payment_reminders,
        quietHours: {
          start: data.quiet_hours_start,
          end: data.quiet_hours_end
        },
        weekendNotifications: data.weekend_notifications,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      }
    } catch (error) {
      logger.error('Failed to update notification preferences', error, 'NotificationManager')
      return null
    }
  }  
/**
   * Get notification history for current user
   */
  async getNotificationHistory(limit: number = 50, offset: number = 0): Promise<NotificationHistory[]> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .eq('user_id', user.user.id)
        .order('sent_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        throw error
      }

      return data.map(item => ({
        id: item.id,
        userId: item.user_id,
        type: item.type,
        title: item.title,
        body: item.body,
        data: item.data || {},
        sentAt: new Date(item.sent_at),
        deliveredAt: item.delivered_at ? new Date(item.delivered_at) : undefined,
        clickedAt: item.clicked_at ? new Date(item.clicked_at) : undefined,
        status: item.status,
        errorMessage: item.error_message,
        retryCount: item.retry_count
      }))
    } catch (error) {
      logger.error('Failed to get notification history', error, 'NotificationManager')
      return []
    }
  }

  /**
   * Mark notification as clicked
   */
  async markNotificationClicked(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_notification_status', {
        p_notification_id: notificationId,
        p_status: 'clicked'
      })

      if (error) {
        throw error
      }

      logger.info('Notification marked as clicked', { notificationId }, 'NotificationManager')
    } catch (error) {
      logger.error('Failed to mark notification as clicked', error, 'NotificationManager')
    }
  }

  /**
   * Load existing subscription from database
   */
  private async loadExistingSubscription(): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        return
      }

      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error
      }

      if (data) {
        this.subscription = {
          id: data.id,
          userId: data.user_id,
          endpoint: data.endpoint,
          keys: {
            p256dh: data.p256dh,
            auth: data.auth
          },
          userAgent: data.user_agent,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        }
      }
    } catch (error) {
      logger.error('Failed to load existing subscription', error, 'NotificationManager')
    }
  }

  /**
   * Utility function to convert VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  /**
   * Utility function to convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  /**
   * Check if notifications are supported and enabled
   */
  isSupported(): boolean {
    return validateNotificationSupport()
  }

  /**
   * Get current subscription
   */
  getCurrentSubscription(): PushSubscription | null {
    return this.subscription
  }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance()