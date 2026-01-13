/**
 * Performance Monitoring Utilities for Supabase
 *
 * Provides tools to analyze query performance, identify slow queries,
 * and generate optimization recommendations.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/errors/logger';

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

export interface IndexInfo {
  tableName: string;
  indexName: string;
  columns: string[];
  indexType: string;
  isPartial: boolean;
  isUnique: boolean;
}

export interface TableSize {
  tableName: string;
  rowCount: number;
  totalSize: string;
  indexSize: string;
  totalSizeBytes: number;
}

export interface PerformanceReport {
  slowQueries: SlowQuery[];
  missingIndexes: string[];
  largeTables: TableSize[];
  recommendations: string[];
}

// ============================================================================
// QUERY PERFORMANCE ANALYSIS
// ============================================================================

/**
 * Get slow queries from pg_stat_statements
 * Requires the performance_optimization migration to be applied
 */
export async function getSlowQueries(
  minCalls: number = 5,
  minMeanTime: number = 100
): Promise<SlowQuery[]> {
  try {
    const { data, error } = await supabase.rpc('get_slow_queries', {
      min_calls: minCalls,
      min_ms: minMeanTime
    });

    if (error) {
      logger.warn('Could not fetch slow queries (migration may not be applied)', error, 'PerformanceMonitor');
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      queryId: row.query_id as string,
      calls: row.calls as number,
      totalTime: row.total_time as number,
      meanTime: row.mean_time as number,
      maxTime: row.max_time as number,
      query: row.query_text as string
    }));
  } catch (error) {
    logger.error('Error fetching slow queries', error, 'PerformanceMonitor');
    return [];
  }
}

/**
 * Track query performance with automatic logging
 * Use this wrapper around Supabase queries
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
// INDEX ANALYSIS
// ============================================================================

/**
 * Get table sizes to identify large tables that need better indexing
 */
export async function getTableSizes(): Promise<TableSize[]> {
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: `
        SELECT
          schemaname || '.' || tablename as table_name,
          n_live_tup as row_count,
          pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size,
          pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename)) as index_size,
          pg_total_relation_size(schemaname || '.' || tablename) as total_size_bytes
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
        LIMIT 20
      `
    });

    if (error) {
      logger.warn('Could not fetch table sizes', error, 'PerformanceMonitor');
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error fetching table sizes', error, 'PerformanceMonitor');
    return [];
  }
}

/**
 * Get indexes for a specific table
 */
export async function getTableIndexes(tableName: string): Promise<IndexInfo[]> {
  try {
    // This query won't work directly, needs a different approach
    await supabase
      .from('information_schema.statistics')
      .select('*')
      .eq('table_name', tableName);

    // Alternative approach using pg_indexes
    const { data: indexesData, error: indexError } = await supabase.rpc('execute_sql', {
      sql: `
        SELECT
          i.tablename as table_name,
          i.indexname as index_name,
          i.indexdef as index_definition,
          i.indexdef LIKE '%WHERE%' as is_partial,
          i.indexdef LIKE '%UNIQUE%' as is_unique
        FROM pg_indexes i
        WHERE i.schemaname = 'public'
          AND i.tablename = $1
        ORDER BY i.tablename, i.indexname
      `,
      params: [tableName]
    });

    if (indexError) {
      logger.warn(`Could not fetch indexes for ${tableName}`, indexError, 'PerformanceMonitor');
      return [];
    }

    return (indexesData || []).map((row: Record<string, unknown>) => ({
      tableName: row.table_name as string,
      indexName: row.index_name as string,
      columns: [], // Would need more parsing
      indexType: 'btree', // Default assumption
      isPartial: row.is_partial as boolean,
      isUnique: row.is_unique as boolean
    }));
  } catch (error) {
    logger.error(`Error fetching indexes for ${tableName}`, error, 'PerformanceMonitor');
    return [];
  }
}

// ============================================================================
// PERFORMANCE REPORT
// ============================================================================

/**
 * Generate a comprehensive performance report
 */
export async function generatePerformanceReport(): Promise<PerformanceReport> {
  const [slowQueries, tableSizes] = await Promise.all([
    getSlowQueries(),
    getTableSizes()
  ]);

  const recommendations: string[] = [];
  const missingIndexes: string[] = [];

  // Analyze slow queries
  slowQueries.forEach(sq => {
    if (sq.meanTime > 500) {
      recommendations.push(`Query ${sq.queryId.substring(0, 8)} takes ${sq.meanTime.toFixed(2)}ms avg - consider adding index`);
    }
  });

  // Analyze table sizes
  const largeTables = tableSizes.filter(t => t.totalSizeBytes > 10_000_000); // > 10MB
  largeTables.forEach(t => {
    if (t.rowCount > 10000) {
      recommendations.push(`Table ${t.tableName} has ${t.rowCount.toLocaleString()} rows - consider partitioning`);
    }
  });

  // Check for common missing indexes
  const { data: orgIndexCheck } = await supabase.rpc('execute_sql', {
    sql: `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT IN (
          SELECT DISTINCT tablename FROM pg_indexes WHERE indexdef LIKE '%organization_id%'
        )
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
    `
  });

  if (orgIndexCheck && orgIndexCheck.length > 0) {
    orgIndexCheck.forEach((t: { table_name: string }) => {
      missingIndexes.push(`Table ${t.tablename} may need organization_id index`);
    });
  }

  return {
    slowQueries,
    missingIndexes,
    largeTables,
    recommendations
  };
}

// ============================================================================
// REALTIME PERFORMANCE
// ============================================================================

/**
 * Analyze Realtime subscription performance
 */
export function analyzeRealtimePerformance() {
  if (!('RealtimeContext' in window)) {
    return { subscribed: false, message: 'Realtime not initialized' };
  }

  // Check number of channels
  const channels = supabase.getChannels();

  return {
    subscribed: true,
    activeChannels: channels.length,
    channelNames: channels.map((c: { topic: string }) => c.topic),
    recommendation: channels.length > 5
      ? 'Consider consolidating Realtime channels'
      : 'Realtime channel count is healthy'
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
  const data = await queryFn();

  queryCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs
  });

  return data;
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
    // Preload today's appointments
    await cachedQuery(
      'appointments:today',
      async () => {
        const { data } = await supabase
          .from('appointments')
          .select('*')
          .gte('date', new Date().toISOString().split('T')[0])
          .limit(100);
        return data || [];
      },
      30000 // 30 seconds TTL for real-time data
    );

    logger.info('Cache preloaded successfully', {}, 'PerformanceMonitor');
  } catch (error) {
    logger.warn('Failed to preload cache', error, 'PerformanceMonitor');
  }
}

// ============================================================================
// QUERY BUILDER HELPERS
// ============================================================================

/**
 * Build optimized select with only needed columns
 */
export function optimizedSelect(table: string, columns: string[]) {
  return supabase.from(table).select(columns.join(', '));
}

/**
 * Build paginated query to avoid large result sets
 */
export function paginatedQuery(
  table: string,
  page: number = 1,
  pageSize: number = 50
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return supabase
    .from(table)
    .select('*', { count: 'exact' })
    .range(from, to);
}

// ============================================================================
// QUERY STATISTICS
// ============================================================================

export interface QueryStatistics {
  tableName: string;
  seqScan: number;
  idxScan: number;
  idxScanRatio: number;
  tableSize: string;
  indexSize: string;
}

/**
 * Get query statistics showing sequential vs index scans
 * Uses the get_query_statistics function created in migration
 */
export async function getQueryStatistics(): Promise<QueryStatistics[]> {
  try {
    const { data, error } = await supabase.rpc('get_query_statistics');

    if (error) {
      logger.warn('Could not fetch query statistics', error, 'PerformanceMonitor');
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      tableName: row.table_name as string,
      seqScan: row.seq_scan as number,
      idxScan: row.idx_scan as number,
      idxScanRatio: row.idx_scan_ratio as number,
      tableSize: row.table_size as string,
      indexSize: row.index_size as string
    }));
  } catch (error) {
    logger.error('Error fetching query statistics', error, 'PerformanceMonitor');
    return [];
  }
}

/**
 * Trigger analyze performance tables to update statistics
 */
export async function analyzeTables(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('analyze_performance_tables');

    if (error) {
      logger.warn('Could not analyze tables', error, 'PerformanceMonitor');
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error analyzing tables', error, 'PerformanceMonitor');
    return false;
  }
}

/**
 * Refresh the daily metrics materialized view
 */
export async function refreshDailyMetrics(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('refresh_daily_metrics');

    if (error) {
      logger.warn('Could not refresh daily metrics', error, 'PerformanceMonitor');
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error refreshing daily metrics', error, 'PerformanceMonitor');
    return false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const PerformanceMonitor = {
  getSlowQueries,
  trackQuery,
  getTableSizes,
  getTableIndexes,
  generatePerformanceReport,
  analyzeRealtimePerformance,
  cachedQuery,
  clearCache,
  preloadCache,
  optimizedSelect,
  paginatedQuery,
  getQueryStatistics,
  analyzeTables,
  refreshDailyMetrics
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
