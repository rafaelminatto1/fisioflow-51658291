import { supabase } from '@/integrations/supabase/client'
import type { NotificationPayload, NotificationType } from '@/types/notifications'

interface NotificationBatch {
  id: string
  notifications: NotificationPayload[]
  scheduledFor: Date
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

interface PerformanceMetrics {
  deliveryRate: number
  averageDeliveryTime: number
  clickThroughRate: number
  errorRate: number
  batchEfficiency: number
}

interface SmartSchedulingConfig {
  maxBatchSize: number
  batchWindowMs: number
  priorityWeights: Record<string, number>
  quietHoursRespect: boolean
  userTimezoneAware: boolean
}

export class NotificationPerformanceService {
  private batchQueue: Map<string, NotificationBatch> = new Map()
  private performanceMetrics: PerformanceMetrics = {
    deliveryRate: 0,
    averageDeliveryTime: 0,
    clickThroughRate: 0,
    errorRate: 0,
    batchEfficiency: 0
  }
  
  private config: SmartSchedulingConfig = {
    maxBatchSize: 100,
    batchWindowMs: 30000, // 30 seconds
    priorityWeights: {
      urgent: 1,
      high: 0.8,
      normal: 0.5,
      low: 0.2
    },
    quietHoursRespect: true,
    userTimezoneAware: true
  }

  /**
   * Add notification to smart batching queue
   */
  async addToBatch(
    userId: string,
    notification: NotificationPayload,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<void> {
    const batchId = this.getBatchId(userId, priority)
    
    let batch = this.batchQueue.get(batchId)
    if (!batch) {
      batch = {
        id: batchId,
        notifications: [],
        scheduledFor: this.calculateOptimalDeliveryTime(userId, priority),
        priority,
        status: 'pending'
      }
      this.batchQueue.set(batchId, batch)
    }

    batch.notifications.push(notification)

    // Process batch if it reaches max size or is urgent
    if (batch.notifications.length >= this.config.maxBatchSize || priority === 'urgent') {
      await this.processBatch(batchId)
    }
  }

  /**
   * Process notification batch with smart scheduling
   */
  private async processBatch(batchId: string): Promise<void> {
    const batch = this.batchQueue.get(batchId)
    if (!batch || batch.status !== 'pending') return

    batch.status = 'processing'
    const startTime = Date.now()

    try {
      // Group notifications by type for optimization
      const groupedNotifications = this.groupNotificationsByType(batch.notifications)
      
      // Send notifications in optimized order
      const results = await Promise.allSettled(
        Object.entries(groupedNotifications).map(([type, notifications]) =>
          this.sendNotificationGroup(type as NotificationType, notifications)
        )
      )

      // Calculate batch performance
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const deliveryTime = Date.now() - startTime

      // Update performance metrics
      await this.updatePerformanceMetrics({
        batchId,
        totalNotifications: batch.notifications.length,
        successfulDeliveries: successCount,
        deliveryTime,
        errors: results.filter(r => r.status === 'rejected').length
      })

      batch.status = 'completed'
      
      // Log batch completion
      await this.logBatchCompletion(batch, deliveryTime, successCount)
      
    } catch (error) {
      batch.status = 'failed'
      console.error('Batch processing failed:', error)
      
      // Implement retry logic for failed batches
      await this.scheduleRetry(batchId, error as Error)
    } finally {
      // Clean up completed/failed batches after delay
      setTimeout(() => this.batchQueue.delete(batchId), 60000)
    }
  }

  /**
   * Calculate optimal delivery time based on user preferences and system load
   */
  private async calculateOptimalDeliveryTime(
    userId: string,
    priority: 'low' | 'normal' | 'high' | 'urgent'
  ): Promise<Date> {
    const now = new Date()
    
    // Urgent notifications are sent immediately
    if (priority === 'urgent') {
      return now
    }

    // Get user preferences for optimal timing
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('quiet_hours_start, quiet_hours_end, weekend_notifications')
      .eq('user_id', userId)
      .single()

    if (!preferences) {
      return new Date(now.getTime() + this.config.batchWindowMs)
    }

    // Check if we're in quiet hours
    if (this.config.quietHoursRespect && this.isInQuietHours(now, preferences)) {
      return this.getNextActiveHour(preferences)
    }

    // Check weekend preferences
    if (!preferences.weekend_notifications && this.isWeekend(now)) {
      return this.getNextWeekday()
    }

    // Calculate delay based on priority and system load
    const baseDelay = this.config.batchWindowMs * this.config.priorityWeights[priority]
    const systemLoadFactor = await this.getSystemLoadFactor()
    
    return new Date(now.getTime() + baseDelay * systemLoadFactor)
  }

  /**
   * Group notifications by type for batch optimization
   */
  private groupNotificationsByType(notifications: NotificationPayload[]): Record<string, NotificationPayload[]> {
    return notifications.reduce((groups, notification) => {
      const type = notification.type
      if (!groups[type]) {
        groups[type] = []
      }
      groups[type].push(notification)
      return groups
    }, {} as Record<string, NotificationPayload[]>)
  }

  /**
   * Send a group of notifications of the same type
   */
  private async sendNotificationGroup(
    type: NotificationType,
    notifications: NotificationPayload[]
  ): Promise<void> {
    // Use Supabase Edge Function for batch sending
    const { error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'batch',
        notificationType: type,
        notifications,
        timestamp: new Date().toISOString()
      }
    })

    if (error) {
      throw new Error(`Failed to send ${type} notifications: ${error.message}`)
    }
  }

  /**
   * Update performance metrics based on batch results
   */
  private async updatePerformanceMetrics(batchResult: {
    batchId: string
    totalNotifications: number
    successfulDeliveries: number
    deliveryTime: number
    errors: number
  }): Promise<void> {
    const { totalNotifications, successfulDeliveries, deliveryTime, errors } = batchResult

    // Calculate new metrics
    const deliveryRate = successfulDeliveries / totalNotifications
    const errorRate = errors / totalNotifications
    const batchEfficiency = totalNotifications / (deliveryTime / 1000) // notifications per second

    // Update running averages (simple exponential smoothing)
    const alpha = 0.1 // smoothing factor
    this.performanceMetrics.deliveryRate = 
      alpha * deliveryRate + (1 - alpha) * this.performanceMetrics.deliveryRate
    this.performanceMetrics.errorRate = 
      alpha * errorRate + (1 - alpha) * this.performanceMetrics.errorRate
    this.performanceMetrics.batchEfficiency = 
      alpha * batchEfficiency + (1 - alpha) * this.performanceMetrics.batchEfficiency
    this.performanceMetrics.averageDeliveryTime = 
      alpha * deliveryTime + (1 - alpha) * this.performanceMetrics.averageDeliveryTime

    // Store metrics in database for historical tracking
    await supabase.from('notification_performance_metrics').insert({
      batch_id: batchResult.batchId,
      total_notifications: totalNotifications,
      successful_deliveries: successfulDeliveries,
      delivery_time_ms: deliveryTime,
      error_count: errors,
      delivery_rate: deliveryRate,
      error_rate: errorRate,
      batch_efficiency: batchEfficiency,
      recorded_at: new Date().toISOString()
    })
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics }
  }

  /**
   * Get real-time system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'critical'
    metrics: PerformanceMetrics
    queueSize: number
    processingBatches: number
    lastUpdate: Date
  }> {
    const queueSize = Array.from(this.batchQueue.values())
      .filter(batch => batch.status === 'pending').length
    
    const processingBatches = Array.from(this.batchQueue.values())
      .filter(batch => batch.status === 'processing').length

    // Determine system status based on metrics
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
    
    if (this.performanceMetrics.errorRate > 0.1 || this.performanceMetrics.deliveryRate < 0.8) {
      status = 'degraded'
    }
    
    if (this.performanceMetrics.errorRate > 0.25 || this.performanceMetrics.deliveryRate < 0.5) {
      status = 'critical'
    }

    return {
      status,
      metrics: this.performanceMetrics,
      queueSize,
      processingBatches,
      lastUpdate: new Date()
    }
  }

  /**
   * Optimize notification scheduling based on historical data
   */
  async optimizeScheduling(): Promise<void> {
    // Get historical performance data
    const { data: historicalData } = await supabase
      .from('notification_performance_metrics')
      .select('*')
      .gte('recorded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: false })

    if (!historicalData || historicalData.length === 0) return

    // Analyze patterns and adjust configuration
    const avgDeliveryTime = historicalData.reduce((sum, record) => 
      sum + record.delivery_time_ms, 0) / historicalData.length
    
    const avgBatchSize = historicalData.reduce((sum, record) => 
      sum + record.total_notifications, 0) / historicalData.length

    // Adjust batch window based on performance
    if (avgDeliveryTime > 10000) { // If delivery takes more than 10 seconds
      this.config.batchWindowMs = Math.min(this.config.batchWindowMs * 1.2, 60000)
    } else if (avgDeliveryTime < 3000) { // If delivery is very fast
      this.config.batchWindowMs = Math.max(this.config.batchWindowMs * 0.8, 10000)
    }

    // Adjust batch size based on efficiency
    if (avgBatchSize < this.config.maxBatchSize * 0.5) {
      this.config.maxBatchSize = Math.max(this.config.maxBatchSize * 0.9, 20)
    }

    console.log('Notification scheduling optimized:', this.config)
  }

  // Helper methods
  private getBatchId(userId: string, priority: string): string {
    const timeWindow = Math.floor(Date.now() / this.config.batchWindowMs)
    return `${userId}-${priority}-${timeWindow}`
  }

  private isInQuietHours(date: Date, preferences: any): boolean {
    const hour = date.getHours()
    const quietStart = parseInt(preferences.quiet_hours_start?.split(':')[0] || '22')
    const quietEnd = parseInt(preferences.quiet_hours_end?.split(':')[0] || '8')
    
    if (quietStart > quietEnd) {
      return hour >= quietStart || hour < quietEnd
    }
    return hour >= quietStart && hour < quietEnd
  }

  private getNextActiveHour(preferences: any): Date {
    const now = new Date()
    const quietEnd = parseInt(preferences.quiet_hours_end?.split(':')[0] || '8')
    const nextActive = new Date(now)
    nextActive.setHours(quietEnd, 0, 0, 0)
    
    if (nextActive <= now) {
      nextActive.setDate(nextActive.getDate() + 1)
    }
    
    return nextActive
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  private getNextWeekday(): Date {
    const now = new Date()
    const nextWeekday = new Date(now)
    
    while (this.isWeekend(nextWeekday)) {
      nextWeekday.setDate(nextWeekday.getDate() + 1)
    }
    
    nextWeekday.setHours(9, 0, 0, 0) // Start at 9 AM on weekday
    return nextWeekday
  }

  private async getSystemLoadFactor(): Promise<number> {
    // Simple load factor based on queue size
    const queueSize = this.batchQueue.size
    return Math.max(1, Math.min(3, 1 + queueSize / 50))
  }

  private async logBatchCompletion(
    batch: NotificationBatch,
    deliveryTime: number,
    successCount: number
  ): Promise<void> {
    await supabase.from('notification_batch_logs').insert({
      batch_id: batch.id,
      notification_count: batch.notifications.length,
      successful_deliveries: successCount,
      delivery_time_ms: deliveryTime,
      priority: batch.priority,
      completed_at: new Date().toISOString()
    })
  }

  private async scheduleRetry(batchId: string, error: Error): Promise<void> {
    // Implement exponential backoff retry
    const retryDelay = Math.min(300000, 5000 * Math.pow(2, 3)) // Max 5 minutes
    
    setTimeout(async () => {
      const batch = this.batchQueue.get(batchId)
      if (batch && batch.status === 'failed') {
        batch.status = 'pending'
        await this.processBatch(batchId)
      }
    }, retryDelay)
  }

  /**
   * Start automatic batch processing
   */
  startBatchProcessor(): void {
    setInterval(async () => {
      const pendingBatches = Array.from(this.batchQueue.entries())
        .filter(([_, batch]) => batch.status === 'pending' && batch.scheduledFor <= new Date())

      for (const [batchId] of pendingBatches) {
        await this.processBatch(batchId)
      }
    }, 5000) // Check every 5 seconds

    // Run optimization every hour
    setInterval(() => {
      this.optimizeScheduling()
    }, 60 * 60 * 1000)
  }
}

export const notificationPerformanceService = new NotificationPerformanceService()