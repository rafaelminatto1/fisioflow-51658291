/**
 * Performance Monitoring Utilities for Firebase
 *
 * Migration from Supabase to Firebase:
 * - Supabase RPC functions → Firebase Cloud Functions (pending)
 * - PostgreSQL statistics → Firebase Analytics / Monitoring
 *
 * Note: Many of the PostgreSQL-specific features have been removed or simplified
 * since Firebase doesn't have the same database introspection capabilities.
 */

import { logger } from '@/lib/errors/logger';
import { getFirebaseDb } from '@/integrations/firebase/app';

const db = getFirebaseDb();

// ============================================================================
// TYPES
// ============================================================================

export interface SlowQuery {
  queryId: string;
  calls: number;
  totalTime: number;
  meanTime: number;
  maxTime: number;
  query: string;
}

export interface QueryMetrics {
  queryName: string;
  duration: number;
  cached: boolean;
  timestamp: number;
}

export interface PerformanceReport {
  slowQueries: SlowQuery[];
  recommendations: string[];
  metrics: QueryMetrics[];
}

// ============================================================================
// QUERY PERFORMANCE ANALYSIS
// ============================================================================

// In-memory storage for query metrics (in production, use Firebase Analytics)
const queryMetrics: QueryMetrics[] = [];
const MAX_METRICS = 1000;

/**
 * Track query performance with automatic logging
 * Use this wrapper around Firebase queries
 */
export async function trackQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  thresholdMs: number = 1000
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;

    // Store metric
    const metric: QueryMetrics = {
      queryName,
      duration,
      cached: false,
      timestamp: Date.now(),
    };

    queryMetrics.push(metric);

    // Keep only recent metrics
    if (queryMetrics.length > MAX_METRICS) {
      queryMetrics.shift();
    }

    if (duration > thresholdMs) {
      logger.warn(`Slow query detected: ${queryName}`, { duration: `${duration.toFixed(2)}ms` }, 'PerformanceMonitor');
    } else {
      logger.debug(`Query: ${queryName}`, { duration: `${duration.toFixed(2)}ms` }, 'PerformanceMonitor');
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error(`Query failed: ${queryName}`, { error, duration: `${duration.toFixed(2)}ms` }, 'PerformanceMonitor');
    throw error;
  }
}

// ============================================================================
// PERFORMANCE REPORT
// ============================================================================

/**
 * Generate a comprehensive performance report
 * Note: Firebase doesn't have the same database introspection as PostgreSQL,
 * so this report is simplified compared to the Supabase version.
 */
export async function generatePerformanceReport(): Promise<PerformanceReport> {
  const slowQueries: SlowQuery[] = [];
  const recommendations: string[] = [];

  // Analyze query metrics
  const slowQueryMetrics = queryMetrics.filter(m => m.duration > 500);
  slowQueryMetrics.forEach(m => {
    slowQueries.push({
      queryId: m.queryName.substring(0, 20),
      calls: 1,
      totalTime: m.duration,
      meanTime: m.duration,
      maxTime: m.duration,
      query: m.queryName,
    });
  });

  // Generate recommendations
  if (slowQueryMetrics.length > 5) {
    recommendations.push('Multiple slow queries detected - consider implementing caching');
  }

  if (slowQueryMetrics.length > 0) {
    const avgDuration = slowQueryMetrics.reduce((sum, m) => sum + m.duration, 0) / slowQueryMetrics.length;
    if (avgDuration > 2000) {
      recommendations.push('Average query time is high - consider using Firebase indexes or pagination');
    }
  }

  // Check cache hit rate
  const cachedQueries = queryMetrics.filter(m => m.cached);
  const cacheHitRate = queryMetrics.length > 0 ? cachedQueries.length / queryMetrics.length : 0;

  if (cacheHitRate < 0.3) {
    recommendations.push('Low cache hit rate - consider implementing query caching');
  }

  return {
    slowQueries,
    recommendations,
    metrics: queryMetrics.slice(-100), // Last 100 metrics
  };
}

// ============================================================================
// CACHED QUERIES (for frequently accessed data)
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const queryCache = new Map<string, CacheEntry<unknown>>();

/**
 * Cache-aware query wrapper
 */
export async function cachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  ttlMs: number = 60000 // 1 minute default
): Promise<T> {
  const cached = queryCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    logger.debug(`Cache hit: ${cacheKey}`, {}, 'PerformanceMonitor');
    return cached.data as T;
  }

  logger.debug(`Cache miss: ${cacheKey}`, {}, 'PerformanceMonitor');
  
  // Track the actual query
  const result = await trackQuery(cacheKey, queryFn);

  queryCache.set(cacheKey, {
    data: result,
    timestamp: Date.now(),
    ttl: ttlMs
  });

  return result;
}

/**
 * Clear specific cache entry or all cache
 */
export function clearCache(cacheKey?: string): void {
  if (cacheKey) {
    queryCache.delete(cacheKey);
    logger.debug(`Cleared cache: ${cacheKey}`, {}, 'PerformanceMonitor');
  } else {
    queryCache.clear();
    logger.debug('Cleared all query cache', {}, 'PerformanceMonitor');
  }
}

/**
 * Preload critical data into cache
 */
export async function preloadCache(): Promise<void> {
  logger.info('Preloading query cache...', {}, 'PerformanceMonitor');

  try {
    // In production, preload critical data here
    // For now, this is a placeholder
    logger.info('Cache preloading is configured but no data is preloaded', {}, 'PerformanceMonitor');
  } catch (error) {
    logger.warn('Failed to preload cache', error, 'PerformanceMonitor');
  }
}

// ============================================================================
// FIRESTORE-SPECIFIC PERFORMANCE HELPERS
// ============================================================================

/**
 * Create an optimized query with selective field loading
 */
export function optimizedQuery(
  collectionPath: string,
  options: {
    filters?: Array<{ field: string; op: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'array-contains'; value: unknown }>;
    orderBy?: { field: string; direction: 'asc' | 'desc' };
    limit?: number;
  }
) {
  // This is a placeholder - in a real implementation, you'd build the Firestore query here
  // For now, it returns metadata about the query
  return {
    collectionPath,
    options,
    estimatedCost: options?.limit ? options.limit * 1 : 'variable',
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const PerformanceMonitor = {
  trackQuery,
  generatePerformanceReport,
  cachedQuery,
  clearCache,
  preloadCache,
  optimizedQuery,
};

// Extend Window interface for type checking
declare global {
  interface Window {
    PerformanceMonitor?: typeof PerformanceMonitor;
  }
}

// Export to window for debugging in production
if (typeof window !== 'undefined') {
  window.PerformanceMonitor = PerformanceMonitor;
}
