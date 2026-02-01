/**
 * Async Utilities
 * Helper functions for handling async operations with better error handling
 */

import { Alert } from 'react-native';
import { log } from './logger';

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Wrap an async operation in a try-catch and return a Result
 */
export async function asyncResult<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<Result<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    if (context) {
      log.error(context, 'Operation failed', error);
    }
    return { success: false, error: error as Error };
  }
}

/**
 * Safe execute - returns null on error instead of throwing
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  defaultValue: T | null = null
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    log.error('SAFE_ASYNC', 'Operation failed', error);
    return defaultValue;
  }
}

/**
 * Execute with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: boolean;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = true,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      log.warn('RETRY', `Attempt ${attempt}/${maxRetries} failed`, error);

      if (attempt < maxRetries) {
        onRetry?.(attempt, lastError);
        const waitTime = backoff ? delay * attempt : delay;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}

/**
 * Execute with timeout
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Execute multiple operations in parallel and return all results
 */
export async function parallel<T>(
  operations: (() => Promise<T>)[]
): Promise<Result<T>[]> {
  return Promise.all(
    operations.map(op => asyncResult(op))
  );
}

/**
 * Execute operations sequentially, stopping on first error
 */
export async function sequence<T>(
  operations: (() => Promise<T>)[]
): Promise<Result<T>[]> {
  const results: Result<T>[] = [];

  for (const operation of operations) {
    const result = await asyncResult(operation);
    results.push(result);
    if (!result.success) {
      break; // Stop on first error
    }
  }

  return results;
}

/**
 * Batch operations with concurrency limit
 */
export async function batch<T>(
  items: T[],
  processor: (item: T) => Promise<any>,
  concurrency: number = 5
): Promise<void> {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    batches.push(items.slice(i, i + concurrency));
  }

  for (const batch of batches) {
    await Promise.all(batch.map(processor));
  }
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, waitMs);
  };
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limitMs);
    }
  };
}

/**
 * Execute operation with loading state and error alert
 */
export async function withLoading<T>(
  setLoading: (loading: boolean) => void,
  operation: () => Promise<T>,
  options: {
    successMessage?: string;
    errorMessage?: string;
    showErrorAlert?: boolean;
  } = {}
): Promise<T | null> {
  const {
    successMessage,
    errorMessage = 'Ocorreu um erro. Tente novamente.',
    showErrorAlert = true,
  } = options;

  setLoading(true);

  try {
    const result = await operation();

    if (successMessage) {
      Alert.alert('Sucesso', successMessage);
    }

    return result;
  } catch (error) {
    log.error('WITH_LOADING', 'Operation failed', error);

    if (showErrorAlert) {
      const message = (error as any)?.message || errorMessage;
      Alert.alert('Erro', message);
    }

    return null;
  } finally {
    setLoading(false);
  }
}

/**
 * Poll function until condition is met
 */
export async function poll<T>(
  condition: () => Promise<T | boolean>,
  options: {
    interval?: number;
    timeout?: number;
    skipFirst?: boolean;
  } = {}
): Promise<T | null> {
  const {
    interval = 1000,
    timeout = 30000,
    skipFirst = false,
  } = options;

  const startTime = Date.now();

  // Skip first poll if requested
  if (!skipFirst) {
    const result = await condition();
    if (result) {
      return result as T;
    }
  }

  while (Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, interval));

    const result = await condition();
    if (result) {
      return result as T;
    }
  }

  return null; // Timeout
}

/**
 * Create a promise that resolves after a delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Memoize async function results
 */
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, Promise<ReturnType<T>>>();

  return (async (...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const promise = func(...args).finally(() => {
      // Optional: Remove from cache after success/error
      // cache.delete(key);
    });

    cache.set(key, promise);
    return promise;
  }) as T;
}
