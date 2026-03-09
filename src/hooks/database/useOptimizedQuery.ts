/**
 * Optimized Query Hook - runtime agnostic.
 *
 * Mantém cache/métricas para compatibilidade com o dashboard de performance,
 * sem acoplar a aplicação ao Firestore.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fisioLogger as logger } from '@/lib/errors/logger';

export interface OptimizedQueryOptions {
  table: string;
  columns?: string;
  filter?: { column: string; operator: string; value: unknown };
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  enabled?: boolean;
  cacheTtl?: number;
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

interface CacheEntry<T> {
  data: T[];
  timestamp: number;
  ttl: number;
  key: string;
}

interface QueryMetric {
  queryKey: string;
  duration: number;
  cacheHit: boolean;
  timestamp: number;
}

const queryCache = new Map<string, CacheEntry<unknown>>();
const queryMetrics: QueryMetric[] = [];
const MAX_METRICS = 100;

function generateCacheKey(options: OptimizedQueryOptions): string {
  const { table, columns, filter, orderBy, limit } = options;
  return JSON.stringify({ table, columns, filter, orderBy, limit });
}

function getFromCache<T>(key: string): T[] | null {
  const entry = queryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    queryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T[], ttl: number): void {
  queryCache.set(key, { data, timestamp: Date.now(), ttl, key });
}

function trackQueryMetric(metric: QueryMetric): void {
  queryMetrics.push(metric);
  if (queryMetrics.length > MAX_METRICS) queryMetrics.shift();
}

export function invalidateQueryCache(table?: string): void {
  if (!table) {
    queryCache.clear();
    return;
  }
  for (const key of queryCache.keys()) {
    if (key.includes(`"table":"${table}"`)) {
      queryCache.delete(key);
    }
  }
}

export function getQueryMetrics(): QueryMetric[] {
  return [...queryMetrics];
}

export function getAverageQueryTime(): number {
  if (queryMetrics.length === 0) return 0;
  return queryMetrics.reduce((sum, metric) => sum + metric.duration, 0) / queryMetrics.length;
}

export function getCacheHitRate(): number {
  if (queryMetrics.length === 0) return 0;
  return (queryMetrics.filter((metric) => metric.cacheHit).length / queryMetrics.length) * 100;
}

export function useOptimizedQuery<T = unknown>(
  _options: OptimizedQueryOptions,
): QueryResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(false);
    setError(null);
    setData([]);
  }, []);

  const invalidateCache = useCallback(() => {
    invalidateQueryCache(_options.table);
  }, [_options.table]);

  return { data, isLoading, error, refetch, invalidateCache };
}

export function usePaginatedQuery<T = unknown>(options: PaginatedQueryOptions): PaginatedQueryResult<T> {
  const [currentPage, setCurrentPage] = useState(options.initialPage ?? 1);
  const [data, setData] = useState<T[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const pageSize = options.pageSize ?? 20;
  const totalCount = data?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    data,
    isLoading: false,
    error,
    refetch: async () => {
      setError(null);
      setData([]);
    },
    invalidateCache: () => invalidateQueryCache(options.table),
    currentPage,
    totalPages,
    totalCount,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    nextPage: () => setCurrentPage((page) => Math.min(totalPages, page + 1)),
    previousPage: () => setCurrentPage((page) => Math.max(1, page - 1)),
    goToPage: (page) => setCurrentPage(Math.max(1, Math.min(totalPages, page))),
  };
}

export function useInfiniteQuery<T = unknown>(options: OptimizedQueryOptions & { batchSize?: number }) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const metricKey = useRef(generateCacheKey(options));

  const loadMore = useCallback(async () => {
    const startTime = performance.now();
    setIsLoading(true);
    try {
      const cached = getFromCache<T>(metricKey.current);
      if (cached) {
        setData(cached);
        setHasMore(false);
        trackQueryMetric({ queryKey: metricKey.current, duration: 0, cacheHit: true, timestamp: Date.now() });
        return;
      }
      setData([]);
      setHasMore(false);
      trackQueryMetric({
        queryKey: metricKey.current,
        duration: performance.now() - startTime,
        cacheHit: false,
        timestamp: Date.now(),
      });
    } catch (err) {
      logger.error('Infinite query failed', err, 'useInfiniteQuery');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options.enabled !== false && data.length === 0) {
      void loadMore();
    }
  }, [data.length, loadMore, options.enabled]);

  return {
    data,
    isLoading,
    hasMore,
    loadMore,
    reset: () => setData([]),
  };
}

export const QueryOptimizer = {
  useOptimizedQuery,
  usePaginatedQuery,
  useInfiniteQuery,
  invalidateQueryCache,
  getQueryMetrics,
  getAverageQueryTime,
  getCacheHitRate,
};
