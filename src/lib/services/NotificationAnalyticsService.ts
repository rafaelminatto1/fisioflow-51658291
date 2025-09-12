import { supabase } from '@/integrations/supabase/client'
import { NotificationAnalytics, NotificationType } from '@/types/notifications'
import { logger } from '@/lib/errors/logger'

export interface NotificationMetrics {
  totalSent: number
  totalDelivered: number
  totalClicked: number
  totalFailed: number
  deliveryRate: number
  clickRate: number
  engagementRate: number
}

export interface NotificationTrends {
  date: string
  sent: number
  delivered: number
  clicked: number
  failed: number
}

export interface UserEngagementMetrics {
  userId: string
  userName?: string
  totalNotifications: number
  clickedNotifications: number
  engagementRate: number
  preferredTypes: NotificationType[]
  lastActivity: string
}

export interface NotificationPerformanceReport {
  overview: NotificationMetrics
  byType: Record<NotificationType, NotificationMetrics>
  trends: NotificationTrends[]
  topEngagedUsers: UserEngagementMetrics[]
  lowEngagementUsers: UserEngagementMetrics[]
  recommendations: string[]
}

export class NotificationAnalyticsService {
  private static instance: NotificationAnalyticsService

  private constructor() {}

  static getInstance(): NotificationAnalyticsService {
    if (!NotificationAnalyticsService.instance) {
      NotificationAnalyticsService.instance = new NotificationAnalyticsService()
    }
    return NotificationAnalyticsService.instance
  }

  /**
   * Get comprehensive notification analytics
   */
  async getNotificationAnalytics(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<NotificationAnalytics[]> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      const end = endDate || new Date()

      const { data, error } = await supabase.rpc('get_notification_analytics', {
        p_start_date: start.toISOString(),
        p_end_date: end.toISOString(),
        p_user_id: userId || null
      })

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      logger.error('Failed to get notification analytics', error, 'NotificationAnalyticsService')
      return []
    }
  }

  /**
   * Get detailed performance report
   */
  async getPerformanceReport(
    startDate?: Date,
    endDate?: Date
  ): Promise<NotificationPerformanceReport> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const end = endDate || new Date()

      // Get overall analytics
      const analytics = await this.getNotificationAnalytics(start, end)
      
      // Calculate overview metrics
      const overview = this.calculateOverviewMetrics(analytics)
      
      // Group by notification type
      const byType = this.groupAnalyticsByType(analytics)
      
      // Get trends data
      const trends = await this.getNotificationTrends(start, end)
      
      // Get user engagement data
      const { topEngagedUsers, lowEngagementUsers } = await this.getUserEngagementMetrics(start, end)
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(overview, byType, topEngagedUsers, lowEngagementUsers)

      return {
        overview,
        byType,
        trends,
        topEngagedUsers,
        lowEngagementUsers,
        recommendations
      }
    } catch (error) {
      logger.error('Failed to get performance report', error, 'NotificationAnalyticsService')
      throw error
    }
  }

  /**
   * Get notification trends over time
   */
  async getNotificationTrends(startDate: Date, endDate: Date): Promise<NotificationTrends[]> {
    try {
      const { data, error } = await supabase
        .from('notification_history')
        .select('sent_at, status')
        .gte('sent_at', startDate.toISOString())
        .lte('sent_at', endDate.toISOString())
        .order('sent_at', { ascending: true })

      if (error) {
        throw error
      }

      // Group by date
      const trendsByDate = new Map<string, NotificationTrends>()
      
      data?.forEach(notification => {
        const date = notification.sent_at.split('T')[0] // Get date part only
        
        if (!trendsByDate.has(date)) {
          trendsByDate.set(date, {
            date,
            sent: 0,
            delivered: 0,
            clicked: 0,
            failed: 0
          })
        }
        
        const trend = trendsByDate.get(date)!
        trend.sent++
        
        switch (notification.status) {
          case 'delivered':
            trend.delivered++
            break
          case 'clicked':
            trend.clicked++
            trend.delivered++ // Clicked implies delivered
            break
          case 'failed':
            trend.failed++
            break
        }
      })

      return Array.from(trendsByDate.values()).sort((a, b) => a.date.localeCompare(b.date))
    } catch (error) {
      logger.error('Failed to get notification trends', error, 'NotificationAnalyticsService')
      return []
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(
    startDate: Date, 
    endDate: Date
  ): Promise<{ topEngagedUsers: UserEngagementMetrics[], lowEngagementUsers: UserEngagementMetrics[] }> {
    try {
      const { data, error } = await supabase
        .from('notification_history')
        .select(`
          user_id,
          type,
          status,
          sent_at,
          clicked_at,
          profiles (
            full_name
          )
        `)
        .gte('sent_at', startDate.toISOString())
        .lte('sent_at', endDate.toISOString())

      if (error) {
        throw error
      }

      // Group by user
      const userMetrics = new Map<string, UserEngagementMetrics>()
      
      data?.forEach(notification => {
        if (!userMetrics.has(notification.user_id)) {
          userMetrics.set(notification.user_id, {
            userId: notification.user_id,
            userName: notification.profiles?.full_name,
            totalNotifications: 0,
            clickedNotifications: 0,
            engagementRate: 0,
            preferredTypes: [],
            lastActivity: notification.sent_at
          })
        }
        
        const metrics = userMetrics.get(notification.user_id)!
        metrics.totalNotifications++
        
        if (notification.status === 'clicked') {
          metrics.clickedNotifications++
        }
        
        // Update last activity
        if (notification.clicked_at && notification.clicked_at > metrics.lastActivity) {
          metrics.lastActivity = notification.clicked_at
        }
      })

      // Calculate engagement rates and sort
      const allUsers = Array.from(userMetrics.values()).map(user => ({
        ...user,
        engagementRate: user.totalNotifications > 0 ? (user.clickedNotifications / user.totalNotifications) * 100 : 0
      }))

      // Get preferred types for each user
      for (const user of allUsers) {
        user.preferredTypes = await this.getUserPreferredTypes(user.userId, startDate, endDate)
      }

      // Sort by engagement rate
      allUsers.sort((a, b) => b.engagementRate - a.engagementRate)
      
      const topEngagedUsers = allUsers.slice(0, 10) // Top 10
      const lowEngagementUsers = allUsers.filter(u => u.engagementRate < 20).slice(0, 10) // Bottom performers

      return { topEngagedUsers, lowEngagementUsers }
    } catch (error) {
      logger.error('Failed to get user engagement metrics', error, 'NotificationAnalyticsService')
      return { topEngagedUsers: [], lowEngagementUsers: [] }
    }
  }

  /**
   * Get user's preferred notification types based on click patterns
   */
  private async getUserPreferredTypes(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<NotificationType[]> {
    try {
      const { data, error } = await supabase
        .from('notification_history')
        .select('type, status')
        .eq('user_id', userId)
        .gte('sent_at', startDate.toISOString())
        .lte('sent_at', endDate.toISOString())

      if (error || !data) {
        return []
      }

      // Calculate click rate by type
      const typeMetrics = new Map<NotificationType, { sent: number, clicked: number }>()
      
      data.forEach(notification => {
        const type = notification.type as NotificationType
        
        if (!typeMetrics.has(type)) {
          typeMetrics.set(type, { sent: 0, clicked: 0 })
        }
        
        const metrics = typeMetrics.get(type)!
        metrics.sent++
        
        if (notification.status === 'clicked') {
          metrics.clicked++
        }
      })

      // Sort by click rate and return top types
      return Array.from(typeMetrics.entries())
        .map(([type, metrics]) => ({
          type,
          clickRate: metrics.sent > 0 ? (metrics.clicked / metrics.sent) * 100 : 0
        }))
        .filter(item => item.clickRate > 0)
        .sort((a, b) => b.clickRate - a.clickRate)
        .slice(0, 3)
        .map(item => item.type)
    } catch (error) {
      logger.error('Failed to get user preferred types', error, 'NotificationAnalyticsService')
      return []
    }
  }

  /**
   * Calculate overview metrics from analytics data
   */
  private calculateOverviewMetrics(analytics: NotificationAnalytics[]): NotificationMetrics {
    const totals = analytics.reduce(
      (acc, item) => ({
        totalSent: acc.totalSent + item.totalSent,
        totalDelivered: acc.totalDelivered + item.totalDelivered,
        totalClicked: acc.totalClicked + item.totalClicked,
        totalFailed: acc.totalFailed + item.totalFailed
      }),
      { totalSent: 0, totalDelivered: 0, totalClicked: 0, totalFailed: 0 }
    )

    const deliveryRate = totals.totalSent > 0 ? (totals.totalDelivered / totals.totalSent) * 100 : 0
    const clickRate = totals.totalDelivered > 0 ? (totals.totalClicked / totals.totalDelivered) * 100 : 0
    const engagementRate = totals.totalSent > 0 ? (totals.totalClicked / totals.totalSent) * 100 : 0

    return {
      ...totals,
      deliveryRate,
      clickRate,
      engagementRate
    }
  }

  /**
   * Group analytics by notification type
   */
  private groupAnalyticsByType(analytics: NotificationAnalytics[]): Record<NotificationType, NotificationMetrics> {
    const byType: Record<string, NotificationMetrics> = {}

    analytics.forEach(item => {
      const deliveryRate = item.totalSent > 0 ? (item.totalDelivered / item.totalSent) * 100 : 0
      const clickRate = item.totalDelivered > 0 ? (item.totalClicked / item.totalDelivered) * 100 : 0
      const engagementRate = item.totalSent > 0 ? (item.totalClicked / item.totalSent) * 100 : 0

      byType[item.notificationType] = {
        totalSent: item.totalSent,
        totalDelivered: item.totalDelivered,
        totalClicked: item.totalClicked,
        totalFailed: item.totalFailed,
        deliveryRate,
        clickRate,
        engagementRate
      }
    })

    return byType as Record<NotificationType, NotificationMetrics>
  }

  /**
   * Generate recommendations based on analytics
   */
  private generateRecommendations(
    overview: NotificationMetrics,
    byType: Record<NotificationType, NotificationMetrics>,
    topUsers: UserEngagementMetrics[],
    lowUsers: UserEngagementMetrics[]
  ): string[] {
    const recommendations: string[] = []

    // Overall performance recommendations
    if (overview.deliveryRate < 85) {
      recommendations.push('Taxa de entrega baixa (<85%). Verifique configurações de push e permissões dos usuários.')
    }

    if (overview.clickRate < 15) {
      recommendations.push('Taxa de cliques baixa (<15%). Considere melhorar títulos e conteúdo das notificações.')
    }

    if (overview.engagementRate < 10) {
      recommendations.push('Engajamento geral baixo (<10%). Revise frequência e relevância das notificações.')
    }

    // Type-specific recommendations
    Object.entries(byType).forEach(([type, metrics]) => {
      if (metrics.totalSent > 10) { // Only for types with significant volume
        if (metrics.clickRate < 10) {
          recommendations.push(`Notificações de ${type} têm baixo engajamento. Considere personalizar o conteúdo.`)
        }
        
        if (metrics.deliveryRate < 80) {
          recommendations.push(`Problemas de entrega em ${type}. Verifique configurações específicas.`)
        }
      }
    })

    // User engagement recommendations
    if (lowUsers.length > topUsers.length * 0.3) {
      recommendations.push('Muitos usuários com baixo engajamento. Considere segmentação e personalização.')
    }

    if (topUsers.length > 0) {
      const avgTopEngagement = topUsers.reduce((sum, u) => sum + u.engagementRate, 0) / topUsers.length
      if (avgTopEngagement > 50) {
        recommendations.push('Usuários engajados respondem bem. Aplique estratégias similares para outros usuários.')
      }
    }

    // Timing recommendations
    recommendations.push('Analise horários de maior engajamento para otimizar timing das notificações.')
    
    // Content recommendations
    if (overview.clickRate > 20) {
      recommendations.push('Boa taxa de cliques! Mantenha o padrão de conteúdo atual.')
    }

    return recommendations.slice(0, 8) // Limit to 8 recommendations
  }

  /**
   * Track notification interaction
   */
  async trackNotificationInteraction(
    notificationId: string,
    action: 'delivered' | 'clicked' | 'dismissed',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Update notification status
      await supabase.rpc('update_notification_status', {
        p_notification_id: notificationId,
        p_status: action === 'dismissed' ? 'delivered' : action
      })

      // Log interaction for analytics
      if (metadata) {
        await supabase
          .from('notification_interactions')
          .insert([{
            notification_id: notificationId,
            action,
            metadata,
            created_at: new Date().toISOString()
          }])
      }

      logger.info('Notification interaction tracked', { 
        notificationId, 
        action 
      }, 'NotificationAnalyticsService')
    } catch (error) {
      logger.error('Failed to track notification interaction', error, 'NotificationAnalyticsService')
    }
  }

  /**
   * Get A/B testing results for notification variations
   */
  async getABTestResults(testId: string): Promise<{
    variantA: NotificationMetrics
    variantB: NotificationMetrics
    winner?: 'A' | 'B'
    confidence: number
  } | null> {
    try {
      // This would implement A/B testing analytics
      // For now, return null as it requires additional schema
      return null
    } catch (error) {
      logger.error('Failed to get A/B test results', error, 'NotificationAnalyticsService')
      return null
    }
  }

  /**
   * Export analytics data to CSV
   */
  async exportAnalyticsToCSV(
    startDate: Date,
    endDate: Date,
    includeUserData: boolean = false
  ): Promise<string> {
    try {
      const analytics = await this.getNotificationAnalytics(startDate, endDate)
      
      let csvContent = 'Type,Total Sent,Total Delivered,Total Clicked,Total Failed,Delivery Rate,Click Rate\n'
      
      analytics.forEach(item => {
        csvContent += `${item.notificationType},${item.totalSent},${item.totalDelivered},${item.totalClicked},${item.totalFailed},${item.deliveryRate.toFixed(2)},${item.clickRate.toFixed(2)}\n`
      })

      if (includeUserData) {
        const { topEngagedUsers } = await this.getUserEngagementMetrics(startDate, endDate)
        csvContent += '\n\nUser ID,User Name,Total Notifications,Clicked Notifications,Engagement Rate\n'
        
        topEngagedUsers.forEach(user => {
          csvContent += `${user.userId},${user.userName || 'N/A'},${user.totalNotifications},${user.clickedNotifications},${user.engagementRate.toFixed(2)}\n`
        })
      }

      return csvContent
    } catch (error) {
      logger.error('Failed to export analytics to CSV', error, 'NotificationAnalyticsService')
      throw error
    }
  }
}

// Export singleton instance
export const notificationAnalyticsService = NotificationAnalyticsService.getInstance()