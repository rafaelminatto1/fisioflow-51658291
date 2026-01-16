/**
 * Query utility functions for Supabase
 * Reusable helpers for common query patterns
 *
 * @module lib/utils/query-helpers
 */

import type { PostgrestQueryBuilder } from '@supabase/supabase-js';

// ==============================================================================
// TIMEOUT & RETRY HELPERS
// ==============================================================================

/**
 * Wrap a promise with a timeout
 * @throws Error if timeout is exceeded
 */
export function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Query timeout após ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Retry a function with exponential backoff
 */
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

      // Check if we should retry this error
      if (!shouldRetry(error) || attempt >= maxRetries - 1) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Network error types that should trigger a retry
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ENOTFOUND') ||
      message.includes('ETIMEDOUT')
    );
  }
  return false;
}

// ==============================================================================
// QUERY BUILDERS
// ==============================================================================

/**
 * Apply common filters to a Supabase query
 */
export function applyFilters<T extends Record<string, unknown>>(
  query: PostgrestQueryBuilder<T>,
  filters: {
    organizationId?: string | null;
    status?: string | string[] | null;
    inStatus?: string[] | null;
    searchTerm?: string;
    searchColumns?: string[];
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
    offset?: number;
  }
): PostgrestQueryBuilder<T> {
  let result = query;

  // Organization filter
  if (filters.organizationId) {
    result = result.eq('organization_id', filters.organizationId);
  }

  // Status filters
  if (filters.status && typeof filters.status === 'string') {
    result = result.eq('status', filters.status);
  } else if (filters.inStatus) {
    result = result.in('status', filters.inStatus);
  }

  // Search filter
  if (filters.searchTerm && filters.searchColumns) {
    const searchLower = filters.searchTerm.trim().toLowerCase();
    const orFilters = filters.searchColumns.map(col => `${col}.ilike.%${searchLower}%`);
    result = result.or(orFilters.join(','));
  }

  // Ordering
  if (filters.orderBy) {
    result = result.order(filters.orderBy, { ascending: filters.ascending ?? true });
  }

  // Pagination
  if (filters.limit) {
    if (filters.offset !== undefined) {
      result = result.range(filters.offset, filters.offset + filters.limit - 1);
    } else {
      result = result.limit(filters.limit);
    }
  }

  return result;
}

// ==============================================================================
// TYPE HELPERS
// ==============================================================================

/**
 * Check if data is empty (null, undefined, or empty array)
 */
export function isEmpty<T>(data: T[] | null | undefined): data is null | undefined | [] {
  return !data || data.length === 0;
}

/**
 * Type guard for Supabase error
 */
export function isSupabaseError(error: unknown): error is { message: string; code?: string; details?: unknown; hint?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  );
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (isSupabaseError(error)) return error.message;
  return 'Erro desconhecido';
}

// ==============================================================================
// OFFLINE HELPERS
// ==============================================================================

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Check if the browser is offline
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}

// ==============================================================================
// QUERY RESULT HELPERS
// ==============================================================================

/**
 * Transform a query result with error handling
 */
export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  fallback: T,
  context: string
): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    console.error(`[Query Error] ${context}:`, error);
    return fallback;
  }
}

/**
 * Paginate array data in memory (for client-side pagination)
 */
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

/**
 * Debounce function for search inputs
 */
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

/**
 * Throttle function for scroll events
 */
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
