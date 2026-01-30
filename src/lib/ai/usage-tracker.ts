/**
 * AI Usage Monitoring and Cost Tracking
 *
 * Tracks AI usage, monitors costs, and enforces rate/budget limits.
 * Provides analytics for AI feature optimization.
 *
 * @module lib/ai/usage-monitor
 */

import { collection, doc, setDoc, getDoc, getDocs, query, where, sum, orderBy, limit } from 'firebase/firestore';
import { db } from '@/integrations/firebase/app';
import { AIModelType, AIFeatureCategory, AIUsageRecord } from '@fisioflow/shared-api/firebase/ai/config';
import { logger } from '@/lib/errors/logger';

/**
 * Usage statistics for a period
 */
export interface UsageStats {
  /** Total requests */
  totalRequests: number;

  /** Successful requests */
  successfulRequests: number;

  /** Failed requests */
  failedRequests: number;

  /** Total input tokens */
  totalInputTokens: number;

  /** Total output tokens */
  totalOutputTokens: number;

  /** Total tokens */
  totalTokens: number;

  /** Total cost in USD */
  totalCost: number;

  /** Average request duration in ms */
  averageDuration: number;

  /** Requests by feature */
  requestsByFeature: Record<AIFeatureCategory, number>;

  /** Requests by model */
  requestsByModel: Record<AIModelType, number>;

  /** Cost by feature */
  costByFeature: Record<AIFeatureCategory, number>;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  /** Is rate limited */
  isLimited: boolean;

  /** Remaining requests */
  remaining: number;

  /** Limit */
  limit: number;

  /** Reset timestamp */
  resetAt: Date;

  /** Current count */
  currentCount: number;
}

/**
 * Budget status
 */
export interface BudgetStatus {
  /** Is budget exceeded */
  isExceeded: boolean;

  /** Remaining budget in USD */
  remaining: number;

  /** Total budget in USD */
  budget: number;

  /** Current spend in USD */
  currentSpend: number;

  /** Period */
  period: 'daily' | 'monthly';
}

/**
 * AI Usage Monitor class
 */
class AIUsageMonitorService {
  private collectionName = 'ai_usage_records';
  private cache = new Map<string, Record<AIFeatureCategory, UsageStats>>();
  private cacheExpiry = 60000; // 1 minute

  /**
   * Record AI usage
   */
  async recordUsage(record: Omit<AIUsageRecord, 'id'>): Promise<string> {
    try {
      const id = `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const docRef = doc(db, this.collectionName, id);

      const recordWithId: AIUsageRecord = {
        ...record,
        id,
        timestamp: record.timestamp || new Date(),
      };

      await setDoc(docRef, {
        ...recordWithId,
        timestamp: recordWithId.timestamp.toISOString(),
      });

      // Invalidate relevant cache entries
      this.invalidateCache(record.userId, record.feature);

      return id;
    } catch (error) {
      logger.error('Failed to record AI usage', error, 'usage-tracker');
      throw error;
    }
  }

  /**
   * Get usage statistics for a period
   */
  async getUsageStats(
    userId: string,
    period: 'hour' | 'day' | 'week' | 'month' | 'all',
    feature?: AIFeatureCategory
  ): Promise<UsageStats> {
    const cacheKey = `stats_${userId}_${period}_${feature || 'all'}`;

    // Check cache
    const cached = this.getFromCache<UsageStats>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const startDate = this.getStartDate(period);
      const records = await this.getRecords(userId, startDate, feature);

      const stats = this.calculateStats(records);

      // Cache result
      this.setCache(cacheKey, stats);

      return stats;
    } catch (error) {
      logger.error('Failed to get usage stats', error, 'usage-tracker');
      return this.getEmptyStats();
    }
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(
    userId: string,
    period: 'hour' | 'day',
    limit: number
  ): Promise<RateLimitStatus> {
    const cacheKey = `ratelimit_${userId}_${period}`;

    // Check cache
    const cached = this.getFromCache<RateLimitStatus>(cacheKey);
    if (cached && cached.resetAt > new Date()) {
      return cached;
    }

    try {
      const startDate = period === 'hour'
        ? new Date(Date.now() - 3600000) // 1 hour ago
        : new Date(Date.now() - 86400000); // 24 hours ago

      const records = await this.getRecords(userId, startDate);
      const currentCount = records.length;

      const resetAt = period === 'hour'
        ? new Date(startDate.getTime() + 3600000)
        : new Date(startDate.getTime() + 86400000);

      const status: RateLimitStatus = {
        isLimited: currentCount >= limit,
        remaining: Math.max(0, limit - currentCount),
        limit,
        resetAt,
        currentCount,
      };

      // Cache for shorter time (1 minute)
      this.setCache(cacheKey, status, 60000);

      return status;
    } catch (error) {
      logger.error('Failed to check rate limit', error, 'usage-tracker');
      // Allow request on error
      return {
        isLimited: false,
        remaining: limit,
        limit,
        resetAt: new Date(Date.now() + (period === 'hour' ? 3600000 : 86400000)),
        currentCount: 0,
      };
    }
  }

  /**
   * Check budget limit
   */
  async checkBudgetLimit(
    userId: string,
    period: 'daily' | 'monthly',
    budget: number
  ): Promise<BudgetStatus> {
    const cacheKey = `budget_${userId}_${period}`;

    // Check cache
    const cached = this.getFromCache<BudgetStatus>(cacheKey);
    if (cached) {
      // Check if period has expired
      const now = new Date();
      const periodStart = period === 'daily'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : new Date(now.getFullYear(), now.getMonth(), 1);

      if (cached.currentSpend <= budget && now < periodStart) {
        return cached;
      }
    }

    try {
      const now = new Date();
      const startDate = period === 'daily'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : new Date(now.getFullYear(), now.getMonth(), 1);

      const records = await this.getRecords(userId, startDate);
      const currentSpend = records.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);

      const status: BudgetStatus = {
        isExceeded: currentSpend >= budget,
        remaining: Math.max(0, budget - currentSpend),
        budget,
        currentSpend,
        period,
      };

      // Cache for 5 minutes
      this.setCache(cacheKey, status, 300000);

      return status;
    } catch (error) {
      logger.error('Failed to check budget limit', error, 'usage-tracker');
      // Allow request on error
      return {
        isExceeded: false,
        remaining: budget,
        budget,
        currentSpend: 0,
        period,
      };
    }
  }

  /**
   * Get recent usage records
   */
  async getRecentRecords(
    userId: string,
    count = 50
  ): Promise<AIUsageRecord[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(count)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        timestamp: new Date(doc.data().timestamp as string),
      })) as AIUsageRecord[];
    } catch (error) {
      logger.error('Failed to get recent records', error, 'usage-tracker');
      return [];
    }
  }

  /**
   * Get usage by feature
   */
  async getUsageByFeature(
    userId: string,
    period: 'hour' | 'day' | 'week' | 'month' | 'all' = 'all'
  ): Promise<Record<AIFeatureCategory, UsageStats>> {
    const startDate = this.getStartDate(period);
    const records = await this.getRecords(userId, startDate);

    const byFeature = new Map<AIFeatureCategory, AIUsageRecord[]>();

    for (const record of records) {
      const feature = record.feature;
      if (!byFeature.has(feature)) {
        byFeature.set(feature, []);
      }
      byFeature.get(feature)!.push(record);
    }

    const result: Record<AIFeatureCategory, UsageStats> = {} as Record<AIFeatureCategory, UsageStats>;

    for (const [feature, featureRecords] of byFeature) {
      result[feature] = this.calculateStats(featureRecords);
    }

    return result;
  }

  /**
   * Get usage by model
   */
  async getUsageByModel(
    userId: string,
    period: 'hour' | 'day' | 'week' | 'month' | 'all' = 'all'
  ): Promise<Record<AIModelType, UsageStats>> {
    const startDate = this.getStartDate(period);
    const records = await this.getRecords(userId, startDate);

    const byModel = new Map<AIModelType, AIUsageRecord[]>();

    for (const record of records) {
      const model = record.model;
      if (!byModel.has(model)) {
        byModel.set(model, []);
      }
      byModel.get(model)!.push(record);
    }

    const result: Record<AIModelType, UsageStats> = {} as Record<AIModelType, UsageStats>;

    for (const [model, modelRecords] of byModel) {
      result[model] = this.calculateStats(modelRecords);
    }

    return result;
  }

  /**
   * Get cost estimate for a request
   */
  estimateCost(
    model: AIModelType,
    inputTokens: number,
    outputTokens: number
  ): number {
    const costs: Record<AIModelType, { input: number; output: number }> = {
      [AIModelType.FLASH]: { input: 0.075, output: 0.30 },
      [AIModelType.FLASH_LITE]: { input: 0.075, output: 0.15 },
      [AIModelType.PRO]: { input: 1.25, output: 5.00 },
      [AIModelType.FLASH_LEGACY]: { input: 0.15, output: 0.60 },
      [AIModelType.PRO_LEGACY]: { input: 3.50, output: 10.50 },
    };

    const pricing = costs[model] || costs[AIModelType.FLASH];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Calculate statistics from records
   */
  private calculateStats(records: AIUsageRecord[]): UsageStats {
    const stats: UsageStats = {
      totalRequests: records.length,
      successfulRequests: 0,
      failedRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      averageDuration: 0,
      requestsByFeature: {} as Record<AIFeatureCategory, number>,
      requestsByModel: {} as Record<AIModelType, number>,
      costByFeature: {} as Record<AIFeatureCategory, number>,
    };

    // Initialize counters
    for (const feature of Object.values(AIFeatureCategory)) {
      stats.requestsByFeature[feature] = 0;
      stats.costByFeature[feature] = 0;
    }
    for (const model of Object.values(AIModelType)) {
      stats.requestsByModel[model] = 0;
    }

    let totalDuration = 0;

    for (const record of records) {
      if (record.success) {
        stats.successfulRequests++;
      } else {
        stats.failedRequests++;
      }

      stats.totalInputTokens += record.inputTokens;
      stats.totalOutputTokens += record.outputTokens;
      stats.totalTokens += record.totalTokens;
      stats.totalCost += record.estimatedCost;
      totalDuration += record.duration;

      stats.requestsByFeature[record.feature] =
        (stats.requestsByFeature[record.feature] || 0) + 1;
      stats.requestsByModel[record.model] =
        (stats.requestsByModel[record.model] || 0) + 1;
      stats.costByFeature[record.feature] =
        (stats.costByFeature[record.feature] || 0) + record.estimatedCost;
    }

    stats.totalTokens = stats.totalInputTokens + stats.totalOutputTokens;
    stats.averageDuration = records.length > 0 ? totalDuration / records.length : 0;

    return stats;
  }

  /**
   * Get records for a user and period
   */
  private async getRecords(
    userId: string,
    startDate: Date,
    feature?: AIFeatureCategory
  ): Promise<AIUsageRecord[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('timestamp', '>=', startDate.toISOString())
      );

      const snapshot = await getDocs(q);

      let records = snapshot.docs.map(doc => ({
        ...doc.data(),
        timestamp: new Date(doc.data().timestamp as string),
      })) as AIUsageRecord[];

      if (feature) {
        records = records.filter(r => r.feature === feature);
      }

      return records;
    } catch (error) {
      logger.error('Failed to get records', error, 'usage-tracker');
      return [];
    }
  }

  /**
   * Get start date for period
   */
  private getStartDate(period: 'hour' | 'day' | 'week' | 'month' | 'all'): Date {
    const now = new Date();

    switch (period) {
      case 'hour':
        return new Date(now.getTime() - 3600000);
      case 'day':
        return new Date(now.getTime() - 86400000);
      case 'week':
        return new Date(now.getTime() - 604800000);
      case 'month':
        return new Date(now.getTime() - 2592000000);
      case 'all':
        return new Date(0);
      default:
        return new Date(0);
    }
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.value as T;
    }
    return null;
  }

  /**
   * Set cache
   */
  private setCache<T>(key: string, value: T, ttl = this.cacheExpiry): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  /**
   * Invalidate cache entries
   */
  private invalidateCache(userId: string, feature: AIFeatureCategory): void {
    // Invalidate all user-related cache entries
    for (const [key] of this.cache) {
      if (key.startsWith(userId) || key.startsWith(`stats_${userId}`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get empty stats
   */
  private getEmptyStats(): UsageStats {
    const stats: UsageStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      averageDuration: 0,
      requestsByFeature: {} as Record<AIFeatureCategory, number>,
      requestsByModel: {} as Record<AIModelType, number>,
      costByFeature: {} as Record<AIFeatureCategory, number>,
    };

    for (const feature of Object.values(AIFeatureCategory)) {
      stats.requestsByFeature[feature] = 0;
      stats.costByFeature[feature] = 0;
    }
    for (const model of Object.values(AIModelType)) {
      stats.requestsByModel[model] = 0;
    }

    return stats;
  }
}

/**
 * Singleton instance
 */
let usageMonitor: AIUsageMonitorService | null = null;

/**
 * Get or create usage monitor
 */
export function getAIUsageMonitor(): AIUsageMonitorService {
  if (!usageMonitor) {
    usageMonitor = new AIUsageMonitorService();
  }
  return usageMonitor;
}

/**
 * Export convenience functions
 */
export const AIUsageMonitor = {
  recordUsage: (record: Omit<AIUsageRecord, 'id'>) =>
    getAIUsageMonitor().recordUsage(record),

  getUsageStats: (userId: string, period: 'hour' | 'day' | 'week' | 'month' | 'all', feature?: AIFeatureCategory) =>
    getAIUsageMonitor().getUsageStats(userId, period, feature),

  checkRateLimit: (userId: string, period: 'hour' | 'day', limit: number) =>
    getAIUsageMonitor().checkRateLimit(userId, period, limit),

  checkBudgetLimit: (userId: string, period: 'daily' | 'monthly', budget: number) =>
    getAIUsageMonitor().checkBudgetLimit(userId, period, budget),

  getRecentRecords: (userId: string, count?: number) =>
    getAIUsageMonitor().getRecentRecords(userId, count),

  getUsageByFeature: (userId: string, period?: 'hour' | 'day' | 'week' | 'month' | 'all') =>
    getAIUsageMonitor().getUsageByFeature(userId, period),

  getUsageByModel: (userId: string, period?: 'hour' | 'day' | 'week' | 'month' | 'all') =>
    getAIUsageMonitor().getUsageByModel(userId, period),

  estimateCost: (model: AIModelType, inputTokens: number, outputTokens: number) =>
    getAIUsageMonitor().estimateCost(model, inputTokens, outputTokens),
};
