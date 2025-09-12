import { supabase } from '@/integrations/supabase/client'
import { NotificationPayload, NotificationHistory } from '@/types/notifications'
import { logger } from '@/lib/errors/logger'

/**
 * Service for handling notification security and privacy compliance
 * Implements LGPD compliance and data protection measures
 */
export class NotificationSecurityService {
  private static instance: NotificationSecurityService
  private encryptionKey: string | null = null

  private constructor() {
    this.initializeEncryption()
  }

  public static getInstance(): NotificationSecurityService {
    if (!NotificationSecurityService.instance) {
      NotificationSecurityService.instance = new NotificationSecurityService()
    }
    return NotificationSecurityService.instance
  }

  /**
   * Initialize encryption for sensitive notification data
   */
  private async initializeEncryption(): Promise<void> {
    try {
      // In production, this should come from a secure key management service
      this.encryptionKey = process.env.VITE_NOTIFICATION_ENCRYPTION_KEY || 'default-key'
    } catch (error) {
      logger.error('Failed to initialize notification encryption', error)
    }
  }

  /**
   * Encrypt sensitive data in notification payload
   */
  public async encryptNotificationData(payload: NotificationPayload): Promise<NotificationPayload> {
    try {
      if (!this.shouldEncryptPayload(payload)) {
        return payload
      }

      const encryptedPayload = { ...payload }

      // Encrypt sensitive data fields
      if (payload.data) {
        encryptedPayload.data = await this.encryptData(payload.data)
      }

      // Add encryption metadata
      encryptedPayload.data = {
        ...encryptedPayload.data,
        _encrypted: true,
        _encryptionVersion: '1.0'
      }

      return encryptedPayload
    } catch (error) {
      logger.error('Failed to encrypt notification data', error)
      return payload
    }
  }

  /**
   * Decrypt notification data when needed
   */
  public async decryptNotificationData(payload: NotificationPayload): Promise<NotificationPayload> {
    try {
      if (!payload.data?._encrypted) {
        return payload
      }

      const decryptedPayload = { ...payload }
      decryptedPayload.data = await this.decryptData(payload.data)

      // Remove encryption metadata
      delete decryptedPayload.data._encrypted
      delete decryptedPayload.data._encryptionVersion

      return decryptedPayload
    } catch (error) {
      logger.error('Failed to decrypt notification data', error)
      return payload
    }
  }

  /**
   * Check if payload contains sensitive data that should be encrypted
   */
  private shouldEncryptPayload(payload: NotificationPayload): boolean {
    const sensitiveTypes = [
      'appointment_reminder',
      'therapist_message',
      'payment_reminder'
    ]

    return sensitiveTypes.includes(payload.type)
  }

  /**
   * Simple encryption implementation (in production, use proper encryption library)
   */
  private async encryptData(data: Record<string, any>): Promise<Record<string, any>> {
    if (!this.encryptionKey) {
      return data
    }

    // This is a simplified implementation
    // In production, use proper encryption like AES-256-GCM
    const encrypted = { ...data }
    
    const sensitiveFields = ['patientName', 'therapistName', 'appointmentDetails', 'paymentAmount']
    
    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        encrypted[field] = btoa(encrypted[field].toString())
      }
    }

    return encrypted
  }

  /**
   * Simple decryption implementation
   */
  private async decryptData(data: Record<string, any>): Promise<Record<string, any>> {
    if (!this.encryptionKey) {
      return data
    }

    const decrypted = { ...data }
    
    const sensitiveFields = ['patientName', 'therapistName', 'appointmentDetails', 'paymentAmount']
    
    for (const field of sensitiveFields) {
      if (decrypted[field]) {
        try {
          decrypted[field] = atob(decrypted[field])
        } catch {
          // If decryption fails, keep original value
        }
      }
    }

    return decrypted
  }

  /**
   * Record user consent for notifications
   */
  public async recordUserConsent(userId: string, consentData: {
    notificationsEnabled: boolean
    dataProcessingConsent: boolean
    marketingConsent: boolean
    consentDate: Date
    ipAddress?: string
    userAgent?: string
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_consent')
        .upsert({
          user_id: userId,
          notifications_enabled: consentData.notificationsEnabled,
          data_processing_consent: consentData.dataProcessingConsent,
          marketing_consent: consentData.marketingConsent,
          consent_date: consentData.consentDate.toISOString(),
          ip_address: consentData.ipAddress,
          user_agent: consentData.userAgent,
          updated_at: new Date().toISOString()
        })

      if (error) {
        throw error
      }

      logger.info('User consent recorded', { userId })
    } catch (error) {
      logger.error('Failed to record user consent', error)
      throw error
    }
  }

  /**
   * Get user consent status
   */
  public async getUserConsent(userId: string): Promise<{
    notificationsEnabled: boolean
    dataProcessingConsent: boolean
    marketingConsent: boolean
    consentDate?: Date
  } | null> {
    try {
      const { data, error } = await supabase
        .from('notification_consent')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (!data) {
        return null
      }

      return {
        notificationsEnabled: data.notifications_enabled,
        dataProcessingConsent: data.data_processing_consent,
        marketingConsent: data.marketing_consent,
        consentDate: data.consent_date ? new Date(data.consent_date) : undefined
      }
    } catch (error) {
      logger.error('Failed to get user consent', error)
      return null
    }
  }

  /**
   * Validate user has proper consent before sending notifications
   */
  public async validateUserConsent(userId: string, notificationType: string): Promise<boolean> {
    try {
      const consent = await this.getUserConsent(userId)
      
      if (!consent) {
        return false
      }

      // Check general notification consent
      if (!consent.notificationsEnabled) {
        return false
      }

      // Check specific consent for marketing notifications
      if (notificationType === 'marketing' && !consent.marketingConsent) {
        return false
      }

      return true
    } catch (error) {
      logger.error('Failed to validate user consent', error)
      return false
    }
  }

  /**
   * Anonymize notification data for analytics
   */
  public anonymizeNotificationData(notification: NotificationHistory): Partial<NotificationHistory> {
    return {
      id: notification.id,
      type: notification.type,
      status: notification.status,
      sentAt: notification.sentAt,
      deliveredAt: notification.deliveredAt,
      clickedAt: notification.clickedAt,
      retryCount: notification.retryCount,
      // Remove all personally identifiable information
      userId: 'anonymized',
      title: 'anonymized',
      body: 'anonymized',
      data: {}
    }
  }

  /**
   * Delete user notification data (LGPD right to be forgotten)
   */
  public async deleteUserNotificationData(userId: string): Promise<void> {
    try {
      // Delete notification history
      const { error: historyError } = await supabase
        .from('notification_history')
        .delete()
        .eq('user_id', userId)

      if (historyError) {
        throw historyError
      }

      // Delete push subscriptions
      const { error: subscriptionError } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)

      if (subscriptionError) {
        throw subscriptionError
      }

      // Delete preferences
      const { error: preferencesError } = await supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', userId)

      if (preferencesError) {
        throw preferencesError
      }

      // Delete consent records
      const { error: consentError } = await supabase
        .from('notification_consent')
        .delete()
        .eq('user_id', userId)

      if (consentError) {
        throw consentError
      }

      logger.info('User notification data deleted', { userId })
    } catch (error) {
      logger.error('Failed to delete user notification data', error)
      throw error
    }
  }

  /**
   * Export user notification data (LGPD right to data portability)
   */
  public async exportUserNotificationData(userId: string): Promise<{
    subscriptions: any[]
    preferences: any[]
    history: any[]
    consent: any[]
  }> {
    try {
      const [subscriptions, preferences, history, consent] = await Promise.all([
        supabase.from('push_subscriptions').select('*').eq('user_id', userId),
        supabase.from('notification_preferences').select('*').eq('user_id', userId),
        supabase.from('notification_history').select('*').eq('user_id', userId),
        supabase.from('notification_consent').select('*').eq('user_id', userId)
      ])

      return {
        subscriptions: subscriptions.data || [],
        preferences: preferences.data || [],
        history: history.data || [],
        consent: consent.data || []
      }
    } catch (error) {
      logger.error('Failed to export user notification data', error)
      throw error
    }
  }

  /**
   * Implement data retention policy
   */
  public async cleanupExpiredNotificationData(): Promise<void> {
    try {
      const retentionDays = 365 // Keep notification history for 1 year
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      // Delete old notification history
      const { error } = await supabase
        .from('notification_history')
        .delete()
        .lt('sent_at', cutoffDate.toISOString())

      if (error) {
        throw error
      }

      logger.info('Expired notification data cleaned up', { cutoffDate })
    } catch (error) {
      logger.error('Failed to cleanup expired notification data', error)
      throw error
    }
  }

  /**
   * Audit notification access and operations
   */
  public async auditNotificationAccess(userId: string, action: string, details: Record<string, any>): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_audit_log')
        .insert({
          user_id: userId,
          action,
          details,
          ip_address: details.ipAddress,
          user_agent: details.userAgent,
          timestamp: new Date().toISOString()
        })

      if (error) {
        throw error
      }
    } catch (error) {
      logger.error('Failed to audit notification access', error)
    }
  }

  /**
   * Validate notification content for compliance
   */
  public validateNotificationContent(payload: NotificationPayload): {
    isValid: boolean
    violations: string[]
  } {
    const violations: string[] = []

    // Check for sensitive information in title/body
    const sensitivePatterns = [
      /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, // CPF
      /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/, // CNPJ
      /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email
    ]

    const content = `${payload.title} ${payload.body}`
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(content)) {
        violations.push('Contains sensitive information in title/body')
        break
      }
    }

    // Check title/body length for compliance
    if (payload.title.length > 100) {
      violations.push('Title exceeds maximum length')
    }

    if (payload.body.length > 300) {
      violations.push('Body exceeds maximum length')
    }

    return {
      isValid: violations.length === 0,
      violations
    }
  }

  /**
   * Record consent with detailed information
   */
  public static async recordConsent(consentData: {
    pushNotifications: boolean
    dataProcessing: boolean
    analytics: boolean
    marketing: boolean
    timestamp: string
    ipAddress?: string
    userAgent?: string
  }): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('notification_consent')
        .upsert({
          user_id: user.id,
          notifications_enabled: consentData.pushNotifications,
          data_processing_consent: consentData.dataProcessing,
          analytics_consent: consentData.analytics,
          marketing_consent: consentData.marketing,
          consent_date: consentData.timestamp,
          ip_address: consentData.ipAddress,
          user_agent: consentData.userAgent,
          updated_at: new Date().toISOString()
        })

      if (error) {
        throw error
      }

      logger.info('User consent recorded', { userId: user.id })
    } catch (error) {
      logger.error('Failed to record user consent', error)
      throw error
    }
  }

  /**
   * Get client IP address (simplified implementation)
   */
  public static async getClientIP(): Promise<string> {
    try {
      // In a real implementation, you might use a service to get the IP
      // For now, return a placeholder
      return 'client-ip-hidden'
    } catch {
      return 'unknown'
    }
  }
}

export const notificationSecurityService = NotificationSecurityService.getInstance()