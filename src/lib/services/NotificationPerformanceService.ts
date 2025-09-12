import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/errors/logger';

interface PerformanceMetrics {
  deliveryRate: number;
  averageDeliveryTime: number;
  clickThroughRate: number;
  errorRate: number;
  batchSize: number;
  queueLength: number;
}

interface NotificationBatch {
  id: string;
  notifications: any[];
  scheduledFor: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export class NotificationPerformanceService {
  private static instance: NotificationPerformanceService;
  private metricsCache: Map<string, PerformanceMetrics> = new Map();
  private batchQueue: NotificationBatch[] = [];
  private isProcessing = false;

  private constructor() {
    this.startPerformanceMonitoring();
    this.startBatchProcessor();
  }

  public static getInstance(): NotificationPerformanceService {
    if (!NotificationPerformanceService.instance) {
      NotificationPerformanceService.instance = new NotificationPerformanceService();
    }
    return NotificationPerformanceService.instance;
  }

  /**
   * Start performance monitoring with periodic metrics collection
   */
  private startPerformanceMonitoring(): void {
    // Collect metrics every 5 minutes
    setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        logger.error('Failed to collect performance metrics', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Collect comprehensive performance metrics
   */
  private async collectMetrics(): Promise<PerformanceMetrics> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get notification statistics from the last hour
      const { data: notifications, error } = await supabase
        .from('notification_history')
        .select('*')
        .gte('sent_at', oneHourAgo.toISOString())
        .lte('sent_at', now.toISOString());

      if (error) {
        throw error;
      }

      const total = notifications?.length || 0;
      const delivered = notifications?.filter(n => n.status === 'delivered').length || 0;
      const clicked = notifications?.filter(n => n.clicked_at).length || 0;
      const failed = notifications?.filter(n => n.status === 'failed').length || 0;

      // Calculate delivery times
      const deliveryTimes = notifications
        ?.filter(n => n.delivered_at && n.sent_at)
        .map(n => new Date(n.delivered_at).getTime() - new Date(n.sent_at).getTime()) || [];

      const averageDeliveryTime = deliveryTimes.length > 0 
        ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length 
        : 0;

      const metrics: PerformanceMetrics = {
        deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
        averageDeliveryTime: averageDeliveryTime / 1000, // Convert to seconds
        clickThroughRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
        errorRate: total > 0 ? (failed / total) * 100 : 0,
        batchSize: this.getOptimalBatchSize(),
        queueLength: this.batchQueue.length
      };

      // Cache metrics
      this.metricsCache.set('current', metrics);

      // Store metrics in database for historical analysis
      await this.storeMetrics(metrics);

      return metrics;
    } catch (error) {
      logger.error('Failed to collect metrics', error);
      throw error;
    }
  }

  /**
   * Store metrics in database for historical tracking
   */
  private async storeMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_performance_metrics')
        .insert({
          delivery_rate: metrics.deliveryRate,
          average_delivery_time: metrics.averageDeliveryTime,
          click_through_rate: metrics.clickThroughRate,
          error_rate: metrics.errorRate,
          batch_size: metrics.batchSize,
          queue_length: metrics.queueLength,
          recorded_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Failed to store performance metrics', error);
    }
  }

  /**
   * Get current performance metrics
   */
  public async getCurrentMetrics(): Promise<PerformanceMetrics> {
    const cached = this.metricsCache.get('current');
    if (cached) {
      return cached;
    }

    return await this.collectMetrics();
  }

  /**
   * Get historical performance metrics
   */
  public async getHistoricalMetrics(hours: number = 24): Promise<PerformanceMetrics[]> {
    try {
      const since = new Date();
      since.setHours(since.getHours() - hours);

      const { data, error } = await supabase
        .from('notification_performance_metrics')
        .select('*')
        .gte('recorded_at', since.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data?.map(row => ({
        deliveryRate: row.delivery_rate,
        averageDeliveryTime: row.average_delivery_time,
        clickThroughRate: row.click_through_rate,
        errorRate: row.error_rate,
        batchSize: row.batch_size,
        queueLength: row.queue_length
      })) || [];
    } catch (error) {
      logger.error('Failed to get historical metrics', error);
      return [];
    }
  }

  /**
   * Add notifications to batch queue for optimized delivery
   */
  public async addToBatch(
    notifications: any[], 
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    scheduledFor?: Date
  ): Promise<string> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const batch: NotificationBatch = {
      id: batchId,
      notifications,
      scheduledFor: scheduledFor || new Date(),
      priority,
      status: 'pending'
    };

    // Insert batch in priority order
    const insertIndex = this.findInsertIndex(batch);
    this.batchQueue.splice(insertIndex, 0, batch);

    logger.info('Notifications added to batch', { 
      batchId, 
      count: notifications.length, 
      priority 
    });

    return batchId;
  }

  /**
   * Find the correct insertion index for priority-based queuing
   */
  private findInsertIndex(newBatch: NotificationBatch): number {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    
    for (let i = 0; i < this.batchQueue.length; i++) {
      const currentBatch = this.batchQueue[i];
      
      // Higher priority (lower number) goes first
      if (priorityOrder[newBatch.priority] < priorityOrder[currentBatch.priority]) {
        return i;
      }
      
      // Same priority, check scheduled time
      if (priorityOrder[newBatch.priority] === priorityOrder[currentBatch.priority]) {
        if (newBatch.scheduledFor < currentBatch.scheduledFor) {
          return i;
        }
      }
    }
    
    return this.batchQueue.length;
  }

  /**
   * Start the batch processor
   */
  private startBatchProcessor(): void {
    setInterval(async () => {
      if (!this.isProcessing && this.batchQueue.length > 0) {
        await this.processBatches();
      }
    }, 10000); // Process every 10 seconds
  }

  /**
   * Process notification batches
   */
  private async processBatches(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const now = new Date();
      const batchesToProcess = this.batchQueue.filter(
        batch => batch.status === 'pending' && batch.scheduledFor <= now
      );

      for (const batch of batchesToProcess) {
        await this.processBatch(batch);
      }

      // Remove completed batches
      this.batchQueue = this.batchQueue.filter(
        batch => batch.status === 'pending'
      );
    } catch (error) {
      logger.error('Failed to process notification batches', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single notification batch
   */
  private async processBatch(batch: NotificationBatch): Promise<void> {
    try {
      batch.status = 'processing';
      
      const batchSize = this.getOptimalBatchSize();
      const chunks = this.chunkArray(batch.notifications, batchSize);

      for (const chunk of chunks) {
        await this.sendNotificationChunk(chunk);
        
        // Add delay between chunks to avoid rate limiting
        await this.delay(100);
      }

      batch.status = 'completed';
      
      logger.info('Batch processed successfully', { 
        batchId: batch.id, 
        totalNotifications: batch.notifications.length 
      });
    } catch (error) {
      batch.status = 'failed';
      logger.error('Failed to process batch', error, { batchId: batch.id });
    }
  }

  /**
   * Send a chunk of notifications
   */
  private async sendNotificationChunk(notifications: any[]): Promise<void> {
    try {
      // Call the Supabase Edge Function for batch sending
      const { error } = await supabase.functions.invoke('send-notification', {
        body: { notifications, batch: true }
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Failed to send notification chunk', error);
      throw error;
    }
  }

  /**
   * Get optimal batch size based on current performance
   */
  private getOptimalBatchSize(): number {
    const metrics = this.metricsCache.get('current');
    
    if (!metrics) {
      return 50; // Default batch size
    }

    // Adjust batch size based on error rate
    if (metrics.errorRate > 10) {
      return 25; // Smaller batches for high error rates
    } else if (metrics.errorRate < 2) {
      return 100; // Larger batches for low error rates
    }

    return 50; // Standard batch size
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get system health status
   */
  public async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: PerformanceMetrics;
    issues: string[];
  }> {
    try {
      const metrics = await this.getCurrentMetrics();
      const issues: string[] = [];
      
      // Check for performance issues
      if (metrics.deliveryRate < 95) {
        issues.push(`Low delivery rate: ${metrics.deliveryRate.toFixed(1)}%`);
      }
      
      if (metrics.errorRate > 5) {
        issues.push(`High error rate: ${metrics.errorRate.toFixed(1)}%`);
      }
      
      if (metrics.averageDeliveryTime > 30) {
        issues.push(`Slow delivery: ${metrics.averageDeliveryTime.toFixed(1)}s average`);
      }
      
      if (metrics.queueLength > 100) {
        issues.push(`Large queue: ${metrics.queueLength} batches pending`);
      }

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (issues.length === 0) {
        status = 'healthy';
      } else if (issues.length <= 2) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return { status, metrics, issues };
    } catch (error) {
      logger.error('Failed to get system health', error);
      return {
        status: 'unhealthy',
        metrics: {
          deliveryRate: 0,
          averageDeliveryTime: 0,
          clickThroughRate: 0,
          errorRate: 100,
          batchSize: 0,
          queueLength: 0
        },
        issues: ['Failed to collect metrics']
      };
    }
  }

  /**
   * Optimize notification scheduling based on user engagement patterns
   */
  public async getOptimalSendTime(userId: string): Promise<Date> {
    try {
      // Get user's historical engagement data
      const { data: history, error } = await supabase
        .from('notification_history')
        .select('sent_at, clicked_at')
        .eq('user_id', userId)
        .not('clicked_at', 'is', null)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error || !history || history.length === 0) {
        // Default to 9 AM if no data available
        const defaultTime = new Date();
        defaultTime.setHours(9, 0, 0, 0);
        return defaultTime;
      }

      // Analyze click patterns by hour
      const hourlyEngagement: { [hour: number]: number } = {};
      
      history.forEach(record => {
        const hour = new Date(record.sent_at).getHours();
        hourlyEngagement[hour] = (hourlyEngagement[hour] || 0) + 1;
      });

      // Find the hour with highest engagement
      const bestHour = Object.entries(hourlyEngagement)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || '9';

      const optimalTime = new Date();
      optimalTime.setHours(parseInt(bestHour), 0, 0, 0);
      
      // If the optimal time is in the past today, schedule for tomorrow
      if (optimalTime < new Date()) {
        optimalTime.setDate(optimalTime.getDate() + 1);
      }

      return optimalTime;
    } catch (error) {
      logger.error('Failed to calculate optimal send time', error);
      
      // Fallback to 9 AM
      const fallbackTime = new Date();
      fallbackTime.setHours(9, 0, 0, 0);
      if (fallbackTime < new Date()) {
        fallbackTime.setDate(fallbackTime.getDate() + 1);
      }
      
      return fallbackTime;
    }
  }
}

export const notificationPerformanceService = NotificationPerformanceService.getInstance();