import { supabase } from '@/integrations/supabase/client'
import { NotificationType } from '@/types/notifications'
import { logger } from '@/lib/errors/logger'

export interface NotificationTemplate {
  id: string
  type: NotificationType
  title_template: string
  body_template: string
  icon_url?: string
  badge_url?: string
  actions: any[]
  default_data: Record<string, any>
  active: boolean
  created_at: string
  updated_at: string
}

export interface BroadcastNotificationRequest {
  type: NotificationType
  title: string
  body: string
  target: 'all' | 'therapists' | 'patients' | 'admins'
  userIds?: string[]
  scheduleAt?: Date
  data?: Record<string, any>
}

export interface NotificationCampaign {
  id: string
  name: string
  description?: string
  template_id: string
  target_criteria: Record<string, any>
  scheduled_at?: string
  sent_at?: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
  total_recipients: number
  sent_count: number
  delivered_count: number
  clicked_count: number
  failed_count: number
  created_by: string
  created_at: string
}

export interface SystemNotificationSettings {
  global_notifications_enabled: boolean
  development_mode: boolean
  detailed_logging: boolean
  rate_limit_per_user_hour: number
  batch_size: number
  retry_attempts: number
  quiet_hours_start: string
  quiet_hours_end: string
}

export class AdminNotificationService {
  private static instance: AdminNotificationService

  private constructor() {}

  static getInstance(): AdminNotificationService {
    if (!AdminNotificationService.instance) {
      AdminNotificationService.instance = new AdminNotificationService()
    }
    return AdminNotificationService.instance
  }

  /**
   * Get all notification templates
   */
  async getNotificationTemplates(): Promise<NotificationTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('Failed to get notification templates', error, 'AdminNotificationService')
      throw error
    }
  }

  /**
   * Create notification template
   */
  async createNotificationTemplate(template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<NotificationTemplate> {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .insert([template])
        .select()
        .single()

      if (error) throw error
      
      logger.info('Notification template created', { templateId: data.id, type: template.type }, 'AdminNotificationService')
      return data
    } catch (error) {
      logger.error('Failed to create notification template', error, 'AdminNotificationService')
      throw error
    }
  }

  /**
   * Update notification template
   */
  async updateNotificationTemplate(id: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      
      logger.info('Notification template updated', { templateId: id }, 'AdminNotificationService')
      return data
    } catch (error) {
      logger.error('Failed to update notification template', error, 'AdminNotificationService')
      throw error
    }
  }

  /**
   * Delete notification template
   */
  async deleteNotificationTemplate(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      logger.info('Notification template deleted', { templateId: id }, 'AdminNotificationService')
    } catch (error) {
      logger.error('Failed to delete notification template', error, 'AdminNotificationService')
      throw error
    }
  }

  /**
   * Send broadcast notification
   */
  async sendBroadcastNotification(request: BroadcastNotificationRequest): Promise<{
    campaignId?: string
    recipientCount: number
    scheduled: boolean
  }> {
    try {
      // Get target users based on criteria
      const targetUsers = await this.getTargetUsers(request.target, request.userIds)
      
      if (targetUsers.length === 0) {
        throw new Error('No target users found')
      }

      // If scheduled, create campaign and schedule
      if (request.scheduleAt && request.scheduleAt > new Date()) {
        return await this.scheduleBroadcast(request, targetUsers)
      }

      // Send immediately
      return await this.sendImmediateBroadcast(request, targetUsers)
    } catch (error) {
      logger.error('Failed to send broadcast notification', error, 'AdminNotificationService')
      throw error
    }
  }

  /**
   * Get target users based on criteria
   */
  private async getTargetUsers(target: string, userIds?: string[]): Promise<string[]> {
    try {
      if (userIds && userIds.length > 0) {
        return userIds
      }

      let query = supabase.from('profiles').select('id')

      switch (target) {
        case 'therapists':
          query = query.eq('role', 'therapist')
          break
        case 'patients':
          query = query.eq('role', 'patient')
          break
        case 'admins':
          query = query.eq('role', 'admin')
          break
        case 'all':
        default:
          // No additional filter for all users
          break
      }

      const { data, error } = await query.eq('active', true)

      if (error) throw error
      return data?.map(user => user.id) || []
    } catch (error) {
      logger.error('Failed to get target users', error, 'AdminNotificationService')
      return []
    }
  }

  /**
   * Schedule broadcast notification
   */
  private async scheduleBroadcast(
    request: BroadcastNotificationRequest, 
    targetUsers: string[]
  ): Promise<{ campaignId: string, recipientCount: number, scheduled: boolean }> {
    try {
      // Use the schedule-notifications function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/schedule-notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: request.type,
          title: request.title,
          body: request.body,
          scheduleAt: request.scheduleAt?.toISOString(),
          targetUsers,
          data: request.data
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to schedule broadcast: ${response.statusText}`)
      }

      const result = await response.json()
      
      logger.info('Broadcast notification scheduled', { 
        recipientCount: targetUsers.length,
        scheduleAt: request.scheduleAt 
      }, 'AdminNotificationService')

      return {
        campaignId: result.campaignId || 'scheduled',
        recipientCount: targetUsers.length,
        scheduled: true
      }
    } catch (error) {
      logger.error('Failed to schedule broadcast', error, 'AdminNotificationService')
      throw error
    }
  }

  /**
   * Send immediate broadcast notification
   */
  private async sendImmediateBroadcast(
    request: BroadcastNotificationRequest, 
    targetUsers: string[]
  ): Promise<{ recipientCount: number, scheduled: boolean }> {
    try {
      const batchSize = 50 // Send in batches to avoid overwhelming the system
      let successCount = 0
      let failureCount = 0

      // Process users in batches
      for (let i = 0; i < targetUsers.length; i += batchSize) {
        const batch = targetUsers.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (userId) => {
          try {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId,
                type: request.type,
                title: request.title,
                body: request.body,
                data: request.data || {}
              })
            })

            if (response.ok) {
              successCount++
            } else {
              failureCount++
            }
          } catch (error) {
            failureCount++
            logger.error('Failed to send notification to user', error, 'AdminNotificationService')
          }
        })

        await Promise.all(batchPromises)
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < targetUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      logger.info('Broadcast notification sent', { 
        totalUsers: targetUsers.length,
        successCount,
        failureCount 
      }, 'AdminNotificationService')

      return {
        recipientCount: successCount,
        scheduled: false
      }
    } catch (error) {
      logger.error('Failed to send immediate broadcast', error, 'AdminNotificationService')
      throw error
    }
  }

  /**
   * Get notification campaigns
   */
  async getNotificationCampaigns(): Promise<NotificationCampaign[]> {
    try {
      // This would require a campaigns table - for now return empty array
      return []
    } catch (error) {
      logger.error('Failed to get notification campaigns', error, 'AdminNotificationService')
      return []
    }
  }

  /**
   * Cancel scheduled campaign
   */
  async cancelCampaign(campaignId: string): Promise<void> {
    try {
      // Implementation would depend on how campaigns are stored and scheduled
      logger.info('Campaign cancelled', { campaignId }, 'AdminNotificationService')
    } catch (error) {
      logger.error('Failed to cancel campaign', error, 'AdminNotificationService')
      throw error
    }
  }

  /**
   * Get system notification settings
   */
  async getSystemSettings(): Promise<SystemNotificationSettings> {
    try {
      // This would typically be stored in a settings table
      // For now, return default values
      return {
        global_notifications_enabled: true,
        development_mode: false,
        detailed_logging: true,
        rate_limit_per_user_hour: 10,
        batch_size: 100,
        retry_attempts: 3,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00'
      }
    } catch (error) {
      logger.error('Failed to get system settings', error, 'AdminNotificationService')
      throw error
    }
  }

  /**
   * Update system notification settings
   */
  async updateSystemSettings(settings: Partial<SystemNotificationSettings>): Promise<SystemNotificationSettings> {
    try {
      // This would update the settings in the database
      // For now, just log the update
      logger.info('System settings updated', { settings }, 'AdminNotificationService')
      
      // Return updated settings (would come from database in real implementation)
      return await this.getSystemSettings()
    } catch (error) {
      logger.error('Failed to update system settings', error, 'AdminNotificationService')
      throw error
    }
  }

  /**
   * Test notification delivery
   */
  async testNotification(userId: string, type: NotificationType): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          type,
          title: 'Teste de Notificação',
          body: 'Esta é uma notificação de teste do sistema FisioFlow.',
          data: {
            test: true,
            timestamp: new Date().toISOString()
          }
        })
      })

      const success = response.ok
      
      logger.info('Test notification sent', { 
        userId, 
        type, 
        success 
      }, 'AdminNotificationService')

      return success
    } catch (error) {
      logger.error('Failed to send test notification', error, 'AdminNotificationService')
      return false
    }
  }

  /**
   * Get notification delivery statistics
   */
  async getDeliveryStats(days: number = 7): Promise<{
    totalSent: number
    totalDelivered: number
    totalClicked: number
    totalFailed: number
    deliveryRate: number
    clickRate: number
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      
      const { data, error } = await supabase.rpc('get_notification_analytics', {
        p_start_date: startDate.toISOString(),
        p_end_date: new Date().toISOString(),
        p_user_id: null
      })

      if (error) throw error

      // Aggregate the results
      const totals = (data || []).reduce(
        (acc: any, item: any) => ({
          totalSent: acc.totalSent + item.total_sent,
          totalDelivered: acc.totalDelivered + item.total_delivered,
          totalClicked: acc.totalClicked + item.total_clicked,
          totalFailed: acc.totalFailed + item.total_failed
        }),
        { totalSent: 0, totalDelivered: 0, totalClicked: 0, totalFailed: 0 }
      )

      const deliveryRate = totals.totalSent > 0 ? (totals.totalDelivered / totals.totalSent) * 100 : 0
      const clickRate = totals.totalDelivered > 0 ? (totals.totalClicked / totals.totalDelivered) * 100 : 0

      return {
        ...totals,
        deliveryRate,
        clickRate
      }
    } catch (error) {
      logger.error('Failed to get delivery stats', error, 'AdminNotificationService')
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalClicked: 0,
        totalFailed: 0,
        deliveryRate: 0,
        clickRate: 0
      }
    }
  }
}

// Export singleton instance
export const adminNotificationService = AdminNotificationService.getInstance()