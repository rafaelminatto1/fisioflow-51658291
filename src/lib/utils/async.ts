/**
 * Async utility functions for handling promises with timeout and retry logic
 * These utilities help manage unreliable network operations and provide
 * consistent error handling across the application.
 */

export interface AsyncOptions {
  timeoutMs?: number;
  maxRetries?: number;
  initialDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Wraps a promise with a timeout. Rejects if the promise doesn't resolve
 * within the specified time.
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds (default: 8000)
 * @returns A promise that rejects on timeout
 *
 * @example
 * ```ts
 * const result = await withTimeout(
 *   fetch('/api/data'),
 *   5000
 * );
 * ```
 */
export function withTimeout<T>(
  promise: PromiseLike<T> | T,
  timeoutMs: number = 8000
): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout após ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Retries an async operation with exponential backoff.
 *
 * @param fn - The async function to retry
 * @param options - Retry options
 * @returns The result of the successful operation
 *
 * @example
 * ```ts
 * const result = await retryWithBackoff(
 *   () => fetch('/api/data'),
 *   { maxRetries: 3, initialDelayMs: 1000 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => PromiseLike<T> | T,
  options: AsyncOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        throw error;
      }

      // Don't delay after the last attempt
      if (attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        onRetry?.(attempt + 1, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Combines timeout and retry logic for robust async operations.
 *
 * @param fn - The async function to execute
 * @param options - Combined timeout and retry options
 * @returns The result of the successful operation
 *
 * @example
 * ```ts
 * const result = await executeWithRetry(
 *   () => getDocs(query(collection(db, 'appointments'))),
 *   { timeoutMs: 10000, maxRetries: 3 }
 * );
 * ```
 */
export async function executeWithRetry<T>(
  fn: () => PromiseLike<T> | T,
  options: AsyncOptions = {}
): Promise<T> {
  const { timeoutMs = 8000, ...retryOptions } = options;

  return retryWithBackoff(
    () => withTimeout(fn, timeoutMs),
    retryOptions
  );
}

/**
 * Checks if an error is a network error that should be retried.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Retry on network errors
    if (
      error.message.includes('fetch failed') ||
      error.message.includes('network') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('timeout')
    ) {
      return true;
    }

    // Retry on specific Supabase/Postgres errors
    if (
      error.message.includes('408') || // Request timeout
      error.message.includes('503') || // Service unavailable
      error.message.includes('504') || // Gateway timeout
      error.message.includes('connection') ||
      error.message.includes('FATAL: remaining connection slots are reserved')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, waitMs);
  };
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastResult: ReturnType<T>;

  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      inThrottle = true;
      lastResult = func.apply(this, args);

      setTimeout(() => {
        inThrottle = false;
      }, waitMs);
    }

    return lastResult;
  };
}
