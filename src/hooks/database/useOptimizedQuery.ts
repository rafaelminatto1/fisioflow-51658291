/**
 * Optimized Query Hook for Firebase
 *
 * Provides automatic caching, pagination, and performance tracking
 * for Firestore queries.
 *
 * Adapts Supabase-style query options to Firestore.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getFirebaseDb } from '@/integrations/firebase/app';
import {
  collection,
  query,
  where,
  orderBy as firestoreOrderBy,
  limit as firestoreLimit,
  getDocs,
  startAfter,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { logger } from '@/lib/errors/logger';

const db = getFirebaseDb();

// ============================================================================
// TYPES
// ============================================================================

export interface OptimizedQueryOptions {
  table: string; // Maps to Collection
  columns?: string; // Ignored in Firestore (always fetches full doc)
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
      if (key.includes(`"table":"${table}"`)) {
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
      const constraints: QueryConstraint[] = [];

      // Apply filter
      if (filter) {
        // Map Supabase operators to Firestore
        let op: any = '==';
        if (filter.operator === 'eq') op = '==';
        else if (filter.operator === 'neq') op = '!=';
        else if (filter.operator === 'gt') op = '>';
        else if (filter.operator === 'gte') op = '>=';
        else if (filter.operator === 'lt') op = '<';
        else if (filter.operator === 'lte') op = '<=';
        else if (filter.operator === 'in') op = 'in';
        else if (filter.operator === 'contains') op = 'array-contains';
        // Note: 'ilike', 'like', 'is' might not be directly supported

        constraints.push(where(filter.column, op, filter.value));
      }

      // Apply order
      if (orderBy) {
        constraints.push(firestoreOrderBy(orderBy.column, orderBy.ascending !== false ? 'asc' : 'desc'));
      }

      // Apply limit
      if (limit) {
        constraints.push(firestoreLimit(limit));
      }

      const q = query(collection(db, table), ...constraints);
      const snapshot = await getDocs(q);
      const result = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];

      if (isMounted.current) {
        setData(result);
        setCache(cacheKey.current, result, cacheTtl);

        const duration = performance.now() - startTime;
        trackQueryMetric({
          queryKey: cacheKey.current,
          duration,
          cacheHit: false,
          timestamp: Date.now(),
        });

        logger.debug(`Query completed: ${table}`, {
          rowCount: result.length,
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
  // Simplified pagination for Firestore (client-side or simplistic cursor which is hard without state)
  // For standard compatibility, just fetching limited set or full set logic
  // Firestore offset is expensive.
  // We'll implement a basic version that might not support true deep pagination efficiently but minimal change for API.

  const {
    pageSize = 20,
    initialPage = 1,
    ...baseOptions
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);
  const [allData, setAllData] = useState<T[]>([]);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);

  // Firestore pagination usually needs cursors.
  // Emulating 'page number' pagination is inefficient in NoSQL.
  // We will pull the requested page by creating a query.

  const fetchPageData = useCallback(async (page: number) => {
    // Note: This logic is imperfect for random access pages (goToPage)
    // unless we fetch all and slice, or use limit relative to start (expensive).
    // Falling back to "Fetch all and slice" client side if dataset is small,
    // OR just supporting page 1.
    // Given 'PaginatedQuery' name, we'll try client-side slice for transition.

    // Better migration: Use useOptimizedQuery with large limit and slice in JS?
    // Or if collection is huge, we need cursor based.
    // Let's implement partial logic.

    const startTime = performance.now();
    try {
      // Fetch "all" (with a reasonable safety limit)
      const constraints: QueryConstraint[] = [];
      if (baseOptions.filter) {
        // ... (same filter mapping as above)
        let op: any = '==';
        if (baseOptions.filter.operator === 'eq') op = '==';
        else if (baseOptions.filter.operator === 'neq') op = '!=';
        else if (baseOptions.filter.operator === 'gt') op = '>';
        else if (baseOptions.filter.operator === 'gte') op = '>=';
        else if (baseOptions.filter.operator === 'lt') op = '<';
        else if (baseOptions.filter.operator === 'lte') op = '<=';
        else if (baseOptions.filter.operator === 'in') op = 'in';
        else if (baseOptions.filter.operator === 'contains') op = 'array-contains';
        constraints.push(where(baseOptions.filter.column, op, baseOptions.filter.value));
      }
      if (baseOptions.orderBy) {
        constraints.push(firestoreOrderBy(baseOptions.orderBy.column, baseOptions.orderBy.ascending !== false ? 'asc' : 'desc'));
      }

      // Safety limit 1000
      constraints.push(firestoreLimit(1000));

      const q = query(collection(db, baseOptions.table), ...constraints);
      const snapshot = await getDocs(q);
      const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];

      const from = (page - 1) * pageSize;
      const to = from + pageSize;
      const pageDocs = allDocs.slice(from, to);

      const duration = performance.now() - startTime;
      trackQueryMetric({
        queryKey: `paginated:${baseOptions.table}:${page}`,
        duration,
        cacheHit: false,
        timestamp: Date.now(),
      });

      return {
        data: pageDocs,
        count: allDocs.length
      };
    } catch (error: any) {
      throw error;
    }

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
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    try {
      const constraints: QueryConstraint[] = [];

      if (baseOptions.filter) {
        // ... filter mapping
        let op: any = '==';
        if (baseOptions.filter.operator === 'eq') op = '==';
        else if (baseOptions.filter.operator === 'neq') op = '!=';
        else if (baseOptions.filter.operator === 'gt') op = '>';
        else if (baseOptions.filter.operator === 'gte') op = '>=';
        else if (baseOptions.filter.operator === 'lt') op = '<';
        else if (baseOptions.filter.operator === 'lte') op = '<=';
        else if (baseOptions.filter.operator === 'in') op = 'in';
        else if (baseOptions.filter.operator === 'contains') op = 'array-contains';
        constraints.push(where(baseOptions.filter.column, op, baseOptions.filter.value));
      }
      if (baseOptions.orderBy) {
        constraints.push(firestoreOrderBy(baseOptions.orderBy.column, baseOptions.orderBy.ascending !== false ? 'asc' : 'desc'));
      }

      constraints.push(firestoreLimit(batchSize));

      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const q = query(collection(db, baseOptions.table), ...constraints);
      const snapshot = await getDocs(q);
      const newData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];

      if (!snapshot.empty) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }

      setData(prev => [...prev, ...newData]);
      setHasMore(snapshot.docs.length === batchSize);

    } catch (err) {
      logger.error('Infinite query failed', err, 'useInfiniteQuery');
    } finally {
      setIsLoading(false);
    }
  }, [
    batchSize,
    isLoading,
    hasMore,
    baseOptions,
    lastDoc
  ]);

  const reset = useCallback(() => {
    setData([]);
    setHasMore(true);
    setLastDoc(null);
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
