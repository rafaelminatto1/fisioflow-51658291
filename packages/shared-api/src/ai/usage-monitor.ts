/**
 * AI Usage Monitor
 *
 * Tracks AI API usage, costs, and implements rate limiting for Firebase AI Logic.
 *
 * @module ai/usage-monitor
 */

import { collection, addDoc, query, where, getDocs, orderBy, limit, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';
import type { AIModelType, AIFeatureCategory, AIUsageRecord } from '../firebase/ai/config';

/**
 * Rate limit configuration per user/organization
 */
export interface RateLimitConfig {
  /** Maximum requests per day */
  maxRequestsPerDay: number;

  /** Maximum cost per day in USD */
  maxCostPerDay: number;

  /** Maximum tokens per day */
  maxTokensPerDay: number;

  /** Custom limits per feature */
  featureLimits?: Partial<Record<AIFeatureCategory, number>>;
}

/**
 * Default rate limits for different user tiers
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    maxRequestsPerDay: 50,
    maxCostPerDay: 1.0,
    maxTokensPerDay: 100_000,
  },
  basic: {
    maxRequestsPerDay: 200,
    maxCostPerDay: 5.0,
    maxTokensPerDay: 500_000,
  },
  professional: {
    maxRequestsPerDay: 1000,
    maxCostPerDay: 25.0,
    maxTokensPerDay: 2_500_000,
  },
  enterprise: {
    maxRequestsPerDay: 10000,
    maxCostPerDay: 250.0,
    maxTokensPerDay: 25_000_000,
  },
};

/**
 * Usage statistics for a user/organization
 */
export interface UsageStats {
  /** Total requests today */
  requestCount: number;

  /** Total tokens consumed today */
  totalTokens: number;

  /** Total cost today (USD) */
  totalCost: number;

  /** Requests by feature */
  requestsByFeature: Partial<Record<AIFeatureCategory, number>>;

  /** Tokens by feature */
  tokensByFeature: Partial<Record<AIFeatureCategory, number>>;

  /** Cost by feature */
  costByFeature: Partial<Record<AIFeatureCategory, number>>;

  /** Timestamp of last reset */
  lastReset: Date;
}

/**
 * AI Usage Monitor Class
 */
export class AIUsageMonitor {
  private db = getFirebaseDb();
  private cache = new Map<string, { stats: UsageStats; timestamp: number }>();
  private cacheTTL = 60000; // 1 minute cache

  /**
   * Track an AI request
   */
  async trackRequest(params: {
    userId: string;
    organizationId?: string;
    feature: AIFeatureCategory;
    model: AIModelType;
    inputTokens: number;
    outputTokens: number;
    duration: number;
    success: boolean;
    error?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const {
      userId,
      organizationId,
      feature,
      model,
      inputTokens,
      outputTokens,
      duration,
      success,
      error,
      metadata,
    } = params;

    const totalTokens = inputTokens + outputTokens;

    // Calculate cost based on model pricing
    const cost = this.calculateCost(model, inputTokens, outputTokens);

    const record: Omit<AIUsageRecord, 'id'> = {
      userId,
      feature,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost: cost,
      duration,
      timestamp: new Date(),
      success,
      error,
      metadata: {
        ...metadata,
        organizationId,
      },
    };

    // Store in Firestore
    try {
      await addDoc(collection(this.db, 'ai_usage'), {
        ...record,
        timestamp: record.timestamp.toISOString(),
      });

      // Invalidate cache for this user
      this.cache.delete(userId);
      if (organizationId) {
        this.cache.delete(`org:${organizationId}`);
      }
    } catch (error) {
      console.error('[AIUsageMonitor] Failed to track request:', error);
    }
  }

  /**
   * Get usage statistics for a user/organization today
   */
  async getUsageStats(
    userIdOrOrgId: string,
    isOrganization = false,
    date: Date = new Date()
  ): Promise<UsageStats> {
    const cacheKey = isOrganization ? `org:${userIdOrOrgId}` : userIdOrOrgId;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.stats;
    }

    // Query Firestore
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const field = isOrganization ? 'metadata.organizationId' : 'userId';

    try {
      const q = query(
        collection(this.db, 'ai_usage'),
        where(field, '==', userIdOrOrgId),
        where('timestamp', '>=', startOfDay.toISOString()),
        where('timestamp', '<=', endOfDay.toISOString())
      );

      const snapshot = await getDocs(q);

      const stats: UsageStats = {
        requestCount: snapshot.size,
        totalTokens: 0,
        totalCost: 0,
        requestsByFeature: {},
        tokensByFeature: {},
        costByFeature: {},
        lastReset: date,
      };

      snapshot.forEach(doc => {
        const data = doc.data() as AIUsageRecord;
        stats.totalTokens += data.totalTokens;
        stats.totalCost += data.estimatedCost;

        // Aggregate by feature
        if (!stats.requestsByFeature[data.feature]) {
          stats.requestsByFeature[data.feature] = 0;
          stats.tokensByFeature[data.feature] = 0;
          stats.costByFeature[data.feature] = 0;
        }

        stats.requestsByFeature[data.feature]!++;
        stats.tokensByFeature[data.feature]! += data.totalTokens;
        stats.costByFeature[data.feature]! += data.estimatedCost;
      });

      // Cache the result
      this.cache.set(cacheKey, { stats, timestamp: Date.now() });

      return stats;
    } catch (error) {
      console.error('[AIUsageMonitor] Failed to get usage stats:', error);
      return {
        requestCount: 0,
        totalTokens: 0,
        totalCost: 0,
        requestsByFeature: {},
        tokensByFeature: {},
        costByFeature: {},
        lastReset: date,
      };
    }
  }

  /**
   * Check if user/organization is within rate limits
   */
  async checkRateLimit(
    userIdOrOrgId: string,
    config: RateLimitConfig,
    isOrganization = false
  ): Promise<{ allowed: boolean; reason?: string; stats?: UsageStats }> {
    const stats = await this.getUsageStats(userIdOrOrgId, isOrganization);

    // Check request count
    if (stats.requestCount >= config.maxRequestsPerDay) {
      return {
        allowed: false,
        reason: `Daily request limit reached (${stats.requestCount}/${config.maxRequestsPerDay})`,
        stats,
      };
    }

    // Check token limit
    if (stats.totalTokens >= config.maxTokensPerDay) {
      return {
        allowed: false,
        reason: `Daily token limit reached (${stats.totalTokens}/${config.maxTokensPerDay})`,
        stats,
      };
    }

    // Check cost limit
    if (stats.totalCost >= config.maxCostPerDay) {
      return {
        allowed: false,
        reason: `Daily cost limit reached ($${stats.totalCost.toFixed(2)}/$${config.maxCostPerDay.toFixed(2)})`,
        stats,
      };
    }

    return { allowed: true, stats };
  }

  /**
   * Get usage history with pagination
   */
  async getUsageHistory(params: {
    userIdOrOrgId: string;
    isOrganization?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    startAfter?: QueryDocumentSnapshot;
  }): Promise<{ records: AIUsageRecord[]; hasMore: boolean; lastDoc?: QueryDocumentSnapshot }> {
    const {
      userIdOrOrgId,
      isOrganization = false,
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date(),
      limit = 50,
      startAfter,
    } = params;

    const field = isOrganization ? 'metadata.organizationId' : 'userId';

    try {
      let q = query(
        collection(this.db, 'ai_usage'),
        where(field, '==', userIdOrOrgId),
        where('timestamp', '>=', startDate.toISOString()),
        where('timestamp', '<=', endDate.toISOString()),
        orderBy('timestamp', 'desc'),
        limit(limit)
      );

      if (startAfter) {
        q = query(q, startAfter(startAfter));
      }

      const snapshot = await getDocs(q);

      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: new Date(doc.data().timestamp as string),
      })) as AIUsageRecord[];

      return {
        records,
        hasMore: snapshot.docs.length === limit,
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
      };
    } catch (error) {
      console.error('[AIUsageMonitor] Failed to get usage history:', error);
      return { records: [], hasMore: false };
    }
  }

  /**
   * Get cost estimate for a request
   */
  calculateCost(model: AIModelType, inputTokens: number, outputTokens: number): number {
    // Pricing per 1M tokens (as of 2025)
    const pricing: Record<AIModelType, { input: number; output: number }> = {
      'gemini-2.5-flash': { input: 0.075, output: 0.30 },
      'gemini-2.5-flash-lite': { input: 0.015, output: 0.15 },
      'gemini-2.5-pro': { input: 1.25, output: 5.00 },
      'gemini-1.5-flash': { input: 0.15, output: 0.60 },
      'gemini-1.5-pro': { input: 3.50, output: 10.50 },
    };

    const modelPricing = pricing[model] || pricing['gemini-2.5-flash'];
    const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

    return inputCost + outputCost;
  }

  /**
   * Estimate token count from text
   */
  estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters for English, 3-4 for Portuguese
    return Math.ceil(text.length / 3.5);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get aggregated stats for an organization
   */
  async getOrganizationStats(organizationId: string, days = 30): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    avgCostPerRequest: number;
    topFeatures: Array<{ feature: AIFeatureCategory; count: number }>;
    topModels: Array<{ model: AIModelType; count: number }>;
    successRate: number;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { records } = await this.getUsageHistory({
      userIdOrOrgId: organizationId,
      isOrganization: true,
      startDate,
      limit: 10000,
    });

    const totalRequests = records.length;
    const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);
    const totalCost = records.reduce((sum, r) => sum + r.estimatedCost, 0);
    const successCount = records.filter(r => r.success).length;

    // Aggregate by feature
    const featureCounts: Record<string, number> = {};
    records.forEach(r => {
      featureCounts[r.feature] = (featureCounts[r.feature] || 0) + 1;
    });

    const topFeatures = Object.entries(featureCounts)
      .map(([feature, count]) => ({ feature: feature as AIFeatureCategory, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Aggregate by model
    const modelCounts: Record<string, number> = {};
    records.forEach(r => {
      modelCounts[r.model] = (modelCounts[r.model] || 0) + 1;
    });

    const topModels = Object.entries(modelCounts)
      .map(([model, count]) => ({ model: model as AIModelType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRequests,
      totalTokens,
      totalCost,
      avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      topFeatures,
      topModels,
      successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
    };
  }
}

/**
 * Singleton instance
 */
export const aiUsageMonitor = new AIUsageMonitor();

/**
 * Convenience function to track a request
 */
export async function trackAIRequest(params: {
  userId: string;
  organizationId?: string;
  feature: AIFeatureCategory;
  model: AIModelType;
  inputTokens: number;
  outputTokens: number;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  return aiUsageMonitor.trackRequest(params);
}

/**
 * Convenience function to check rate limits
 */
export async function checkAIRateLimit(
  userIdOrOrgId: string,
  config: RateLimitConfig,
  isOrganization = false
): Promise<{ allowed: boolean; reason?: string; stats?: UsageStats }> {
  return aiUsageMonitor.checkRateLimit(userIdOrOrgId, config, isOrganization);
}
