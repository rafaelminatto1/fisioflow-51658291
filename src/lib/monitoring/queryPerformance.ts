/**
 * TanStack Query Performance Tracking
 * 
 * Tracks query performance metrics including:
 * - Query duration
 * - Cache hits/misses
 * - Error rates
 * - Slow queries
 */

import { QueryClient } from '@tanstack/react-query';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { trackMetric, MetricType } from './index';

interface QueryPerformanceMetrics {
  queryKey: string;
  duration: number;
  cacheHit: boolean;
  success: boolean;
  error?: string;
  timestamp: number;
}

const SLOW_QUERY_THRESHOLD = 1000; // 1 second
const queryMetrics: QueryPerformanceMetrics[] = [];

/**
 * Track query performance
 */
export function trackQueryPerformance(
  queryKey: string,
  duration: number,
  cacheHit: boolean,
  success: boolean,
  error?: string
): void {
  const metric: QueryPerformanceMetrics = {
    queryKey,
    duration,
    cacheHit,
    success,
    error,
    timestamp: Date.now(),
  };

  queryMetrics.push(metric);

  // Keep only last 100 metrics
  if (queryMetrics.length > 100) {
    queryMetrics.shift();
  }

  // Track to monitoring service
  trackMetric(MetricType.DATABASE_QUERY, {
    queryKey,
    duration,
    cacheHit,
    success,
    error,
  });

  // Log slow queries in development
  if (import.meta.env.DEV && duration > SLOW_QUERY_THRESHOLD) {
    logger.warn(`🐌 Slow query: ${queryKey} took ${duration}ms`, {
      duration,
      cacheHit,
      success,
    });
  }

  // Log errors
  if (!success && error) {
    logger.error(`❌ Query error: ${queryKey}`, { error, duration });
  }
}

/**
 * Get query performance statistics
 */
export function getQueryStats(queryKey?: string): {
  totalQueries: number;
  cacheHitRate: number;
  averageDuration: number;
  errorRate: number;
  slowQueries: number;
} {
  const relevantMetrics = queryKey
    ? queryMetrics.filter((m) => m.queryKey === queryKey)
    : queryMetrics;

  if (relevantMetrics.length === 0) {
    return {
      totalQueries: 0,
      cacheHitRate: 0,
      averageDuration: 0,
      errorRate: 0,
      slowQueries: 0,
    };
  }

  const cacheHits = relevantMetrics.filter((m) => m.cacheHit).length;
  const errors = relevantMetrics.filter((m) => !m.success).length;
  const slowQueries = relevantMetrics.filter((m) => m.duration > SLOW_QUERY_THRESHOLD).length;
  const totalDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);

  return {
    totalQueries: relevantMetrics.length,
    cacheHitRate: (cacheHits / relevantMetrics.length) * 100,
    averageDuration: totalDuration / relevantMetrics.length,
    errorRate: (errors / relevantMetrics.length) * 100,
    slowQueries,
  };
}

/**
 * Configure QueryClient with performance tracking
 */
export function configureQueryClientWithTracking(queryClient: QueryClient): void {
  // Add global query cache callbacks
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'success') {
      const query = event.query;
      const queryKey = JSON.stringify(query.queryKey);
      const state = query.state;

      // Calculate duration (approximate)
      const duration = state.dataUpdatedAt - (state.fetchMeta?.startTime || state.dataUpdatedAt);
      const cacheHit = state.fetchStatus === 'idle' && state.data !== undefined;

      trackQueryPerformance(queryKey, duration, cacheHit, true);
    }

    if (event.type === 'updated' && event.action.type === 'error') {
      const query = event.query;
      const queryKey = JSON.stringify(query.queryKey);
      const state = query.state;
      const error = state.error?.toString() || 'Unknown error';

      const duration = state.errorUpdatedAt - (state.fetchMeta?.startTime || state.errorUpdatedAt);

      trackQueryPerformance(queryKey, duration, false, false, error);
    }
  });

  // Log cache stats periodically in development
  if (import.meta.env.DEV) {
    setInterval(() => {
      const stats = getQueryStats();
      if (stats.totalQueries > 0) {
        logger.debug('📊 Query Performance Stats', {
          totalQueries: stats.totalQueries,
          cacheHitRate: `${stats.cacheHitRate.toFixed(1)}%`,
          avgDuration: `${stats.averageDuration.toFixed(0)}ms`,
          errorRate: `${stats.errorRate.toFixed(1)}%`,
          slowQueries: stats.slowQueries,
        });
      }
    }, 60000); // Every minute
  }
}

/**
 * Get slow queries for debugging
 */
export function getSlowQueries(threshold = SLOW_QUERY_THRESHOLD): QueryPerformanceMetrics[] {
  return queryMetrics
    .filter((m) => m.duration > threshold)
    .sort((a, b) => b.duration - a.duration);
}

/**
 * Clear query metrics
 */
export function clearQueryMetrics(): void {
  queryMetrics.length = 0;
}

/**
 * Export metrics for analysis
 */
export function exportQueryMetrics(): QueryPerformanceMetrics[] {
  return [...queryMetrics];
}
