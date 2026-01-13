/**
 * Optimized Query Hook for Supabase
 *
 * Provides automatic caching, pagination, and performance tracking
 * for Supabase queries without external dependencies.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface OptimizedQueryOptions {
  table: string;
  columns?: string;
  filter?: { column: string; operator: string; value: unknown };
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  enabled?: boolean;
  cacheTtl?: number; // milliseconds
  onError?: (error: Error) => void;
}

export interface PaginatedQueryOptions extends OptimizedQueryOptions {
  pageSize?: number;
  initialPage?: number;
}

export interface QueryResult<T = unknown> {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
}

export interface PaginatedQueryResult<T = unknown> extends QueryResult<T> {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
}

// ============================================================================
// CACHE IMPLEMENTATION
// ============================================================================

interface CacheEntry<T> {
  data: T[];
  timestamp: number;
  ttl: number;
  key: string;
}

const queryCache = new Map<string, CacheEntry<unknown>>();

// Generate cache key from options
function generateCacheKey(options: OptimizedQueryOptions): string {
  const { table, columns, filter, orderBy, limit } = options;
  return JSON.stringify({
    table,
    columns,
    filter,
    orderBy,
    limit,
  });
}

// Get from cache if valid
function getFromCache<T>(key: string): T[] | null {
  const entry = queryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    queryCache.delete(key);
    return null;
  }

  return entry.data;
}

// Set cache
function setCache<T>(key: string, data: T[], ttl: number): void {
  queryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
    key,
  });

  // Cleanup old entries periodically
  if (queryCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of queryCache.entries()) {
      if (now - v.timestamp > v.ttl) {
        queryCache.delete(k);
      }
    }
  }
}

// Invalidate cache
export function invalidateQueryCache(table?: string): void {
  if (table) {
    for (const key of queryCache.keys()) {
      if (key.startsWith(`"${table}"`)) {
        queryCache.delete(key);
      }
    }
  } else {
    queryCache.clear();
  }
}

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

interface QueryMetric {
  queryKey: string;
  duration: number;
  cacheHit: boolean;
  timestamp: number;
}

const queryMetrics: QueryMetric[] = [];
const MAX_METRICS = 100;

function trackQueryMetric(metric: QueryMetric): void {
  queryMetrics.push(metric);
  if (queryMetrics.length > MAX_METRICS) {
    queryMetrics.shift();
  }
}

export function getQueryMetrics(): QueryMetric[] {
  return [...queryMetrics];
}

export function getAverageQueryTime(): number {
  if (queryMetrics.length === 0) return 0;
  const total = queryMetrics.reduce((sum, m) => sum + m.duration, 0);
  return total / queryMetrics.length;
}

export function getCacheHitRate(): number {
  if (queryMetrics.length === 0) return 0;
  const hits = queryMetrics.filter(m => m.cacheHit).length;
  return (hits / queryMetrics.length) * 100;
}

// ============================================================================
// OPTIMIZED QUERY HOOK
// ============================================================================

export function useOptimizedQuery<T = unknown>(
  options: OptimizedQueryOptions
): QueryResult<T> {
  const {
    table,
    columns = '*',
    filter,
    orderBy,
    limit = 50,
    enabled = true,
    cacheTtl = 60000, // 1 minute default
    onError,
  } = options;

  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = useRef<string>(generateCacheKey(options));
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Check cache first
    const cached = getFromCache<T>(cacheKey.current);
    if (cached) {
      setData(cached);
      trackQueryMetric({
        queryKey: cacheKey.current,
        duration: 0,
        cacheHit: true,
        timestamp: Date.now(),
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    const startTime = performance.now();

    try {
      let query = supabase.from(table).select(columns);

      // Apply filter
      if (filter) {
        query = query.filter(filter.column, filter.operator, filter.value);
      }

      // Apply order
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      // Apply limit
      query = query.limit(limit);

      const { data: result, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      if (isMounted.current) {
        const typedData = (result as T[]) || [];
        setData(typedData);
        setCache(cacheKey.current, typedData, cacheTtl);

        const duration = performance.now() - startTime;
        trackQueryMetric({
          queryKey: cacheKey.current,
          duration,
          cacheHit: false,
          timestamp: Date.now(),
        });

        logger.debug(`Query completed: ${table}`, {
          rowCount: typedData.length,
          duration: `${duration.toFixed(2)}ms`,
        }, 'useOptimizedQuery');
      }
    } catch (err) {
      if (isMounted.current) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        logger.error(`Query failed: ${table}`, errorObj, 'useOptimizedQuery');
        onError?.(errorObj);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [table, columns, filter, orderBy, limit, enabled, cacheTtl, onError]);

  const refetch = useCallback(async () => {
    invalidateQueryCache(table);
    await fetchData();
  }, [table, fetchData]);

  const invalidateCache = useCallback(() => {
    invalidateQueryCache(table);
  }, [table]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();

    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
    invalidateCache,
  };
}

// ============================================================================
// PAGINATED QUERY HOOK
// ============================================================================

export function usePaginatedQuery<T = unknown>(
  options: PaginatedQueryOptions
): PaginatedQueryResult<T> {
  const {
    pageSize = 20,
    initialPage = 1,
    ...baseOptions
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);
  const [allData, setAllData] = useState<T[]>([]);

  const fetchPageData = useCallback(async (page: number) => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from(baseOptions.table)
      .select(baseOptions.columns || '*', { count: 'exact' });

    // Apply filter
    if (baseOptions.filter) {
      query = query.filter(
        baseOptions.filter.column,
        baseOptions.filter.operator,
        baseOptions.filter.value
      );
    }

    // Apply order
    if (baseOptions.orderBy) {
      query = query.order(baseOptions.orderBy.column, {
        ascending: baseOptions.orderBy.ascending ?? true,
      });
    }

    // Apply range
    query = query.range(from, to);

    const startTime = performance.now();
    const { data, error, count } = await query;
    const duration = performance.now() - startTime;

    if (error) {
      throw error;
    }

    trackQueryMetric({
      queryKey: `paginated:${baseOptions.table}:${page}`,
      duration,
      cacheHit: false,
      timestamp: Date.now(),
    });

    return {
      data: (data as T[]) || [],
      count: count || 0,
    };
  }, [baseOptions, pageSize]);

  const nextPage = useCallback(() => {
    if (currentPage * pageSize < totalCount) {
      setCurrentPage(p => p + 1);
    }
  }, [currentPage, pageSize, totalCount]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(p => p - 1);
    }
  }, [currentPage]);

  const goToPage = useCallback((page: number) => {
    const maxPage = Math.ceil(totalCount / pageSize);
    setCurrentPage(Math.max(1, Math.min(page, maxPage)));
  }, [pageSize, totalCount]);

  const refetch = useCallback(async () => {
    const { data: pageData, count } = await fetchPageData(currentPage);
    setAllData(pageData);
    setTotalCount(count);
  }, [currentPage, fetchPageData]);

  useEffect(() => {
    if (baseOptions.enabled !== false) {
      fetchPageData(currentPage).then(({ data, count }) => {
        setAllData(data);
        setTotalCount(count);
      }).catch((err) => {
        logger.error('Paginated query failed', err, 'usePaginatedQuery');
        baseOptions.onError?.(err);
      });
    }
  }, [currentPage, fetchPageData, baseOptions]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: allData,
    isLoading: false,
    error: null,
    refetch,
    invalidateCache: () => invalidateQueryCache(baseOptions.table),
    currentPage,
    totalPages,
    totalCount,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    nextPage,
    previousPage,
    goToPage,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for infinite scroll queries
 */
export function useInfiniteQuery<T = unknown>(
  options: OptimizedQueryOptions & { batchSize?: number }
) {
  const { batchSize = 20, ...baseOptions } = options;
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    const from = data.length;
    const to = from + batchSize - 1;

    try {
      let query = supabase
        .from(baseOptions.table)
        .select(baseOptions.columns || '*');

      if (baseOptions.filter) {
        query = query.filter(
          baseOptions.filter.column,
          baseOptions.filter.operator,
          baseOptions.filter.value
        );
      }

      if (baseOptions.orderBy) {
        query = query.order(baseOptions.orderBy.column, {
          ascending: baseOptions.orderBy.ascending ?? true,
        });
      }

      query = query.range(from, to);

      const { data: result, error } = await query;

      if (error) throw error;

      const newData = (result as T[]) || [];
      setData(prev => [...prev, ...newData]);
      setHasMore(newData.length === batchSize);
    } catch (err) {
      logger.error('Infinite query failed', err, 'useInfiniteQuery');
    } finally {
      setIsLoading(false);
    }
  }, [
    data.length,
    batchSize,
    isLoading,
    hasMore,
    baseOptions,
  ]);

  const reset = useCallback(() => {
    setData([]);
    setHasMore(true);
  }, []);

  useEffect(() => {
    if (baseOptions.enabled !== false && data.length === 0) {
      loadMore();
    }
  }, [baseOptions.enabled, data.length, loadMore]);

  return {
    data,
    isLoading,
    hasMore,
    loadMore,
    reset,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const QueryOptimizer = {
  useOptimizedQuery,
  usePaginatedQuery,
  useInfiniteQuery,
  invalidateQueryCache,
  getQueryMetrics,
  getAverageQueryTime,
  getCacheHitRate,
};
