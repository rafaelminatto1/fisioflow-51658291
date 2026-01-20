/**
 * Supabase Utilities
 *
 * Enhanced utilities for Supabase operations with:
 * - Retry logic with exponential backoff
 * - Type-safe error handling
 * - Query result validation
 * - Performance monitoring
 * - Connection health checks
 */

import { supabase } from './client';
import { AppError } from '@/lib/errors/AppError';
import { logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000ms) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 10000ms) */
  maxDelay?: number;
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Whether to retry on network errors (default: true) */
  retryOnNetworkError?: boolean;
  /** Specific error codes to retry */
  retryOnCodes?: string[];
  /** Callback before each retry */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Query result wrapper with validation
 */
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
  count: number | null;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  latency: number;
  error?: string;
}

/**
 * Supabase error codes from Postgres and Auth
 */
export enum SupabaseErrorCode {
  // Postgres errors
  UNIQUE_VIOLATION = '23505',
  FOREIGN_KEY_VIOLATION = '23503',
  NOT_NULL_VIOLATION = '23502',
  CHECK_VIOLATION = '23514',
  STRING_DATA_RIGHT_TRUNCATION = '22001',

  // Supabase Auth errors
  INVALID_REFRESH_TOKEN = 'invalid_refresh_token',
  SESSION_NOT_FOUND = 'session_not_found',
  EMAIL_NOT_CONFIRMED = 'email_not_confirmed',
  INVALID_CREDENTIALS = 'invalid_credentials',
  USER_ALREADY_EXISTS = 'user_already_exists',

  // RLS (Row Level Security) errors
  RLS_PERMISSION_DENIED = '42501',

  // Connection errors
  CONNECTION_FAILED = 'connection_failed',
  TIMEOUT = 'timeout',
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryOnNetworkError: true,
  retryOnCodes: [],
  onRetry: () => {},
};

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Sleep/delay utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = Math.min(
    options.initialDelay * Math.pow(options.backoffMultiplier, attempt),
    options.maxDelay
  );
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 500;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error, options: Required<RetryOptions>): boolean {
  // Check if error code is in retry list
  if (options.retryOnCodes.length > 0) {
    const appError = error instanceof AppError ? error : null;
    if (appError && options.retryOnCodes.includes(appError.code)) {
      return true;
    }
  }

  // Network errors
  if (options.retryOnNetworkError) {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection')
    );
  }

  return false;
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if this is the last attempt or error is not retryable
      if (attempt === opts.maxAttempts - 1 || !isRetryableError(lastError, opts)) {
        throw lastError;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, opts);
      logger.debug(`Retry attempt ${attempt + 1}/${opts.maxAttempts} after ${delay.toFixed(0)}ms`, {
        error: lastError.message,
      });

      opts.onRetry(attempt + 1, lastError);
      await sleep(delay);
    }
  }

  throw lastError;
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Wrap Supabase query result with error handling
 */
export async function handleQueryResult<T>(
  result: { data: T | null; error: any; count?: number | null },
  context: string
): Promise<QueryResult<T>> {
  const { data, error, count } = result;

  if (error) {
    const appError = mapSupabaseError(error, context);
    return { data: null, error: appError, count: null };
  }

  return { data, error: null, count: count ?? null };
}

/**
 * Map Supabase error to AppError
 */
function mapSupabaseError(error: any, context: string): AppError {
  const message = error.message || 'Erro desconhecido do Supabase';
  const code = error.code || 'SUPABASE_ERROR';
  const hints = error.hints || [];
  const details = error.details || '';

  // Map specific Supabase error codes
  switch (code) {
    case SupabaseErrorCode.UNIQUE_VIOLATION:
      return AppError.badRequest('Registro já existe', 'UNIQUE_VIOLATION');
    case SupabaseErrorCode.FOREIGN_KEY_VIOLATION:
      return AppError.badRequest('Registro relacionado não encontrado', 'FOREIGN_KEY');
    case SupabaseErrorCode.NOT_NULL_VIOLATION:
      return AppError.badRequest('Campo obrigatório não preenchido', 'REQUIRED_FIELD');
    case SupabaseErrorCode.RLS_PERMISSION_DENIED:
      return AppError.forbidden('Você não tem permissão para acessar este recurso', 'RLS_DENIED');
    case SupabaseErrorCode.INVALID_CREDENTIALS:
      return AppError.unauthorized('Credenciais inválidas', 'INVALID_CREDENTIALS');
    case SupabaseErrorCode.SESSION_NOT_FOUND:
      return AppError.unauthorized('Sessão expirada', 'SESSION_EXPIRED');
    case SupabaseErrorCode.EMAIL_NOT_CONFIRMED:
      return AppError.unauthorized('E-mail não confirmado', 'EMAIL_NOT_CONFIRMED');
    default:
      // Network or connection errors
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        return new AppError('Erro de conexão', 'NETWORK_ERROR', 503, true);
      }
      if (message.includes('timeout') || message.includes('timed out')) {
        return new AppError('Operação expirou', 'TIMEOUT', 504, true);
      }
      // Generic error
      return new AppError(message, code, 500, true);
  }
}

/**
 * Execute query with retry and error handling
 */
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any; count?: number | null }>,
  context: string,
  retryOptions?: RetryOptions
): Promise<QueryResult<T>> {
  try {
    const result = await withRetry(queryFn, retryOptions);
    return await handleQueryResult(result, context);
  } catch (error) {
    const appError = error instanceof AppError
      ? error
      : mapSupabaseError(error, context);

    logger.error(`Query failed: ${context}`, appError);
    return { data: null, error: appError, count: null };
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check Supabase connection health
 */
export async function healthCheck(): Promise<HealthCheckResult> {
  const start = performance.now();

  try {
    const { error } = await supabase
      .from('_health_check')
      .select('id')
      .limit(1)
      .maybeSingle();

    const latency = performance.now() - start;

    // Table doesn't exist is OK - we just want to check connection
    if (error && !error.message.includes('does not exist')) {
      return {
        healthy: false,
        latency,
        error: error.message,
      };
    }

    return { healthy: true, latency };
  } catch (error) {
    const latency = performance.now() - start;
    return {
      healthy: false,
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Wait for healthy connection
 */
export async function waitForHealthy(options: {
  timeout?: number;
  interval?: number;
} = {}): Promise<HealthCheckResult> {
  const { timeout = 30000, interval = 1000 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await healthCheck();
    if (result.healthy) {
      return result;
    }
    await sleep(interval);
  }

  return {
    healthy: false,
    latency: 0,
    error: 'Timeout waiting for healthy connection',
  };
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Execute multiple queries in parallel with error aggregation
 */
export async function batchQuery<T>(
  queries: Array<() => Promise<{ data: T | null; error: any }>>,
  options: {
    stopOnError?: boolean;
    maxConcurrency?: number;
  } = {}
): Promise<Array<QueryResult<T>>> {
  const { stopOnError = false, maxConcurrency = 10 } = options;

  // Process in batches to limit concurrency
  const results: Array<QueryResult<T>> = [];

  for (let i = 0; i < queries.length; i += maxConcurrency) {
    const batch = queries.slice(i, i + maxConcurrency);

    const batchResults = await Promise.allSettled(
      batch.map(fn => fn().then(result => handleQueryResult(result, 'batch')))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        if (stopOnError && result.value.error) {
          // Return early with error
          return results;
        }
      } else {
        results.push({
          data: null,
          error: new AppError('Batch query failed', 'BATCH_ERROR', 500, true),
          count: null,
        });
        if (stopOnError) {
          return results;
        }
      }
    }
  }

  return results;
}

// ============================================================================
// TRANSACTION HELPERS
// ============================================================================

/**
 * Execute a series of operations as a logical transaction
 * Note: Supabase doesn't support true client-side transactions,
 * but this helper ensures rollback behavior on error
 */
export async function transaction<T>(
  operations: Array<() => Promise<any>>,
  rollback?: () => Promise<void>
): Promise<{ success: boolean; error?: Error; data?: T }> {
  const completedOperations: Array<{ fn: () => Promise<any>; result: any }> = [];

  try {
    // Execute all operations
    for (const operation of operations) {
      const result = await operation();
      completedOperations.push({ fn: operation, result });
    }

    return { success: true };
  } catch (error) {
    // Attempt rollback
    if (rollback) {
      try {
        await rollback();
        logger.info('Transaction rolled back successfully');
      } catch (rollbackError) {
        logger.error('Rollback failed', rollbackError);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// ============================================================================
// PAGINATION HELPERS
// ============================================================================

/**
 * Fetch all pages of a paginated query
 */
export async function fetchAllPages<T>(
  queryFn: (page: number, pageSize: number) => Promise<{ data: T[] | null; error: any }>,
  options: {
    pageSize?: number;
    maxPages?: number;
  } = {}
): Promise<QueryResult<T[]>> {
  const { pageSize = 1000, maxPages = 100 } = options;
  const allData: T[] = [];

  for (let page = 0; page < maxPages; page++) {
    const result = await handleQueryResult(queryFn(page, pageSize), 'fetchAllPages');

    if (result.error) {
      return { data: null, error: result.error, count: null };
    }

    if (!result.data || result.data.length === 0) {
      break;
    }

    allData.push(...result.data);

    // If we got less than a full page, we're done
    if (result.data.length < pageSize) {
      break;
    }
  }

  return { data: allData, error: null, count: allData.length };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that required fields are present in data
 */
export function validateRequired<T extends Record<string, any>>(
  data: T | null,
  requiredFields: (keyof T)[]
): AppError | null {
  if (!data) {
    return AppError.badRequest('Dados não fornecidos');
  }

  for (const field of requiredFields) {
    if (data[field] === null || data[field] === undefined) {
      return AppError.badRequest(`Campo obrigatório: ${String(field)}`);
    }
  }

  return null;
}

/**
 * Validate data types
 */
export function validateTypes<T extends Record<string, any>>(
  data: T | null,
  types: Partial<Record<keyof T, 'string' | 'number' | 'boolean' | 'object' | 'array'>>
): AppError | null {
  if (!data) {
    return AppError.badRequest('Dados não fornecidos');
  }

  for (const [field, expectedType] of Object.entries(types)) {
    const value = data[field as keyof T];

    if (value !== null && value !== undefined) {
      let actualType = typeof value;
      if (Array.isArray(value)) actualType = 'array';
      else if (value === null) actualType = 'null';
      else if (actualType === 'object') actualType = 'object';

      if (actualType !== expectedType) {
        return AppError.badRequest(
          `Campo ${field} deve ser do tipo ${expectedType}, recebido ${actualType}`
        );
      }
    }
  }

  return null;
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Track query performance
 */
export class QueryPerformanceTracker {
  private queries = new Map<string, number[]>();

  record(queryName: string, duration: number) {
    if (!this.queries.has(queryName)) {
      this.queries.set(queryName, []);
    }
    this.queries.get(queryName)!.push(duration);

    // Warn if query is slow
    if (duration > 1000) {
      logger.warn(`Slow query detected: ${queryName}`, { duration: `${duration}ms` }, 'Performance');
    }
  }

  getStats(queryName: string) {
    const times = this.queries.get(queryName);
    if (!times || times.length === 0) {
      return null;
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return { avg, min, max, count: times.length };
  }

  getAllStats() {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};
    for (const [name] of this.queries) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }
}

export const performanceTracker = new QueryPerformanceTracker();

/**
 * Wrap a query with performance tracking
 */
export async function trackQuery<T>(
  queryName: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    performanceTracker.record(queryName, duration);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceTracker.record(queryName, duration);
    throw error;
  }
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

/**
 * Get current session with error handling
 */
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      throw mapSupabaseError(error, 'getSession');
    }

    return { session, error: null };
  } catch (error) {
    return {
      session: null,
      error: error instanceof AppError ? error : new AppError('Failed to get session', 'AUTH_ERROR', 500, true),
    };
  }
}

/**
 * Get current user with error handling
 */
export async function getUser() {
  const { session, error } = await getSession();

  if (error) {
    return { user: null, error };
  }

  if (!session?.user) {
    return {
      user: null,
      error: AppError.unauthorized('Usuário não autenticado', 'NO_SESSION'),
    };
  }

  return { user: session.user, error: null };
}

/**
 * Refresh session with retry
 */
export async function refreshSession(options?: RetryOptions) {
  return withRetry(
    async () => {
      const { data: { session }, error } = await supabase.auth.refreshSession();

      if (error) {
        throw mapSupabaseError(error, 'refreshSession');
      }

      return session;
    },
    { maxAttempts: 2, ...options }
  );
}
