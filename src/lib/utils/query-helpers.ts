/**
 * Query utility functions for the local data layer
 * Reusable helpers for common query patterns.
 */

// ==============================================================================
// TIMEOUT & RETRY HELPERS
// ==============================================================================

import { fisioLogger as logger } from '@/lib/errors/logger';

const normalizeRecordData = (d: any) => d;

export type Query<T> = {
  source?: unknown;
  constraints?: unknown[];
  _phantom?: T;
};

export type CollectionReference<T> = Query<T>;

const appendQueryConstraints = <T>(query: Query<T>, ...constraints: unknown[]): Query<T> => ({
  ...query,
  constraints: [...(query.constraints ?? []), ...constraints],
});

const where = (field: string, op: string, value: unknown) => ({ type: 'where', field, op, value });
const orderBy = (field: string, direction: 'asc' | 'desc' = 'asc') => ({ type: 'orderBy', field, direction });
const limit = (value: number) => ({ type: 'limit', value });
const startAfter = (value: unknown) => ({ type: 'startAfter', value });

export function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Query timeout após ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true,
  } = options;

  let lastError: Error | unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error) || attempt >= maxRetries - 1) {
        break;
      }

      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ENOTFOUND') ||
      message.includes('ETIMEDOUT') ||
      message.includes('database') ||
      message.includes('unavailable')
    );
  }
  return false;
}

// ==============================================================================
// QUERY BUILDERS
// ==============================================================================

export function applyFilters<T>(
  query: Query<T>,
  filters: {
    organizationId?: string | null;
    status?: string | string[] | null;
    inStatus?: string[] | null;
    searchTerm?: string;
    searchColumns?: string[];
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
    startAfter?: unknown;
  }
): Query<T> {
  let result = query;

  // Organization filter
  if (filters.organizationId) {
    result = appendQueryConstraints(result, where('organization_id', '==', filters.organizationId));
  }

  // Status filters
  if (filters.status && typeof filters.status === 'string') {
    result = appendQueryConstraints(result, where('status', '==', filters.status));
  } else if (filters.inStatus) {
    // The local query abstraction keeps single-value filters deterministic
    // Use array-contains-any for array fields or multiple queries
    if (filters.inStatus.length === 1) {
      result = appendQueryConstraints(result, where('status', '==', filters.inStatus[0]));
    }
    // For multiple values, you'd need to run multiple queries and merge results
  }

  // Ordering
  if (filters.orderBy) {
    result = appendQueryConstraints(result, orderBy(filters.orderBy, filters.ascending ? 'asc' : 'desc'));
  }

  // Pagination
  if (filters.limit) {
    result = appendQueryConstraints(result, limit(filters.limit));
  }

  if (filters.startAfter) {
    result = appendQueryConstraints(result, startAfter(filters.startAfter));
  }

  return result;
}

// ==============================================================================
// TYPE HELPERS
// ==============================================================================

export function isEmpty<T>(data: T[] | null | undefined): data is null | undefined | [] {
  return !data || data.length === 0;
}

export function isServiceError(error: unknown): error is { message: string; code?: string; details?: unknown } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  );
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (isServiceError(error)) return error.message;
  return 'Erro desconhecido';
}

// ==============================================================================
// OFFLINE HELPERS
// ==============================================================================

export function isOnline(): boolean {
  return navigator.onLine;
}

export function isOffline(): boolean {
  return !navigator.onLine;
}

// ==============================================================================
// QUERY RESULT HELPERS
// ==============================================================================

export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  fallback: T,
  context: string
): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    logger.error(`[Query Error] ${context}`, error, 'query-helpers');
    return fallback;
  }
}

export function paginateArray<T>(
  data: T[],
  page: number,
  pageSize: number
): {
  data: T[];
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
} {
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    data: data.slice(startIndex, endIndex),
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

// ==============================================================================
// PERFORMANCE HELPERS
// ==============================================================================

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      fn(...args);
      lastCall = now;
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        fn(...args);
        lastCall = Date.now();
        timeoutId = null;
      }, delay - timeSinceLastCall);
    }
  };
}

// ==============================================================================
// QUERY CONSTRAINT HELPERS
// ==============================================================================

export function createPaginatedQuery<T>(
  collectionRef: CollectionReference<T>,
  options: {
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    pageSize?: number;
    startAfter?: unknown;
    filters?: Array<{ field: string; op: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'array-contains' | 'in'; value: unknown }>;
  }
): Query<T> {
  let q = appendQueryConstraints(collectionRef);

  // Apply filters
  if (options.filters) {
    for (const filter of options.filters) {
      q = appendQueryConstraints(q, where(filter.field, filter.op, filter.value));
    }
  }

  // Apply ordering
  if (options.orderBy) {
    q = appendQueryConstraints(q, orderBy(options.orderBy, options.orderDirection || 'asc'));
  }

  // Apply limit
  if (options.pageSize) {
    q = appendQueryConstraints(q, limit(options.pageSize));
  }

  // Apply cursor
  if (options.startAfter) {
    q = appendQueryConstraints(q, startAfter(options.startAfter));
  }

  return q;
}

export function snapshotToArray<T>(snapshot: { docs: Array<{ id: string; data: () => T }> }): Array<T & { id: string }> {
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...normalizeRecordData(doc.data()),
  })) as Array<T & { id: string }>;
}
