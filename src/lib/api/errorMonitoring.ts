/**
 * API Error Monitoring with Sentry
 * Provides enhanced error tracking and monitoring for API requests
 */

import * as Sentry from '@sentry/react';
import { fisioLogger as logger } from '@/lib/errors/logger';

type RequestError = Error & {
  status?: number;
  payload?: unknown;
  isRetryable?: boolean;
  errorType?: 'network' | 'timeout' | 'auth' | 'server_transient' | 'server_persistent' | 'client' | 'unknown';
  requestUrl?: string;
  requestId?: string;
};

/**
 * Track API error with enhanced context
 */
export function trackApiError(error: unknown, context: {
  path: string;
  method?: string;
  requestId?: string;
  duration?: number;
}): void {
  if (!(error instanceof Error)) {
    logger.warn('Tentativa de tracking de erro não-Error', { error, context }, 'api-error-monitoring');
    return;
  }

  const { path, method = 'GET', requestId, duration } = context;
  const typedError = error as RequestError;

  // Determine severity based on error type
  const severity = determineSeverity(typedError);

  // Add breadcrumb for API call
  Sentry.addBreadcrumb({
    category: 'api',
    message: `API ${method} ${path}`,
    level: severity,
    data: {
      path,
      method,
      requestId,
      duration,
      status: typedError.status,
      errorType: typedError.errorType,
      isRetryable: typedError.isRetryable,
    },
  });

  // Only send actual errors to Sentry (not circuit breaker warnings)
  const shouldSendToSentry = shouldSendError(typedError);
  
  if (shouldSendToSentry) {
    Sentry.captureException(error, {
      tags: {
        errorType: typedError.errorType || 'unknown',
        httpStatus: typedError.status?.toString() || 'none',
        apiPath: path,
        apiMethod: method,
        isRetryable: typedError.isRetryable ? 'true' : 'false',
      },
      extra: {
        requestId,
        duration,
        requestUrl: typedError.requestUrl,
        errorPayload: typedError.payload,
      },
      level: severity,
    });
  }

  // Log locally for immediate debugging
  logApiError(typedError, context, severity);
}

/**
 * Determine Sentry severity level based on error
 */
function determineSeverity(error: RequestError): 'error' | 'warning' | 'info' {
  if (!error.errorType) {
    return 'error';
  }

  switch (error.errorType) {
    case 'network':
      return 'warning';
    case 'timeout':
      return 'warning';
    case 'auth':
      return 'error';
    case 'server_transient':
      return 'warning';
    case 'server_persistent':
      return 'error';
    case 'client':
      return 'warning';
    default:
      return 'error';
  }
}

/**
 * Determine if error should be sent to Sentry
 */
function shouldSendError(error: RequestError): boolean {
  // Don't send circuit breaker errors
  if ('isCircuitBreakerError' in error && (error as { isCircuitBreakerError: boolean }).isCircuitBreakerError) {
    return false;
  }

  // Don't send rate limit errors (429) - expected during normal operation
  if (error.status === 429) {
    return false;
  }

  // Don't send 404 errors for non-critical resources
  if (error.status === 404) {
    return false;
  }

  // Don't send client errors (4xx) in development
  if (error.status && error.status >= 400 && error.status < 500) {
    if (import.meta.env.DEV) {
      return false;
    }
  }

  // Send all server errors (5xx) and unknown errors
  return true;
}

/**
 * Log API error locally for immediate debugging
 */
function logApiError(error: RequestError, context: { path: string; method?: string; requestId?: string; duration?: number }, severity: string): void {
  const { path, method = 'GET', requestId, duration } = context;
  
  const logMessage = `[API Error] ${method} ${path}`;
  const logData = {
    status: error.status,
    errorType: error.errorType,
    isRetryable: error.isRetryable,
    requestId,
    duration: duration ? `${duration}ms` : undefined,
    severity,
  };

  switch (severity) {
    case 'error':
      logger.error(logMessage, error, 'api-error-monitoring', logData);
      break;
    case 'warning':
      logger.warn(logMessage, error, 'api-error-monitoring', logData);
      break;
    case 'info':
      logger.info(logMessage, error, 'api-error-monitoring', logData);
      break;
  }
}

/**
 * Track successful API call for performance monitoring
 */
export function trackApiSuccess(context: {
  path: string;
  method?: string;
  requestId?: string;
  duration: number;
  status?: number;
}): void {
  const { path, method = 'GET', requestId, duration, status } = context;

  // Add breadcrumb for successful API call
  Sentry.addBreadcrumb({
    category: 'api',
    message: `API ${method} ${path} - Success`,
    level: 'info',
    data: {
      path,
      method,
      requestId,
      duration,
      status,
    },
  });

  // Track performance metrics
  Sentry.startSpan({
    name: `api_${method.toLowerCase()}`,
    op: 'api.call',
    attributes: {
      'api.path': path,
      'api.method': method,
      'api.status': status?.toString(),
    },
  }, () => {
    // Span will be automatically measured
  });

  // Log success in development
  if (import.meta.env.DEV && duration > 5000) {
    logger.warn(
      `[API Slow] ${method} ${path}`,
      { duration: `${duration}ms`, requestId },
      'api-error-monitoring'
    );
  }
}

/**
 * Track circuit breaker state changes
 */
export function trackCircuitBreakerState(context: {
  path: string;
  state: 'OPEN' | 'CLOSED' | 'HALF_OPEN';
  failures: number;
  reason?: string;
}): void {
  const { path, state, failures, reason } = context;

  Sentry.addBreadcrumb({
    category: 'circuit-breaker',
    message: `Circuit Breaker ${state} for ${path}`,
    level: state === 'OPEN' ? 'warning' : 'info',
    data: {
      path,
      state,
      failures,
      reason,
    },
  });

  if (state === 'OPEN') {
    Sentry.captureMessage(
      `Circuit Breaker OPENED for ${path}`,
      {
        level: 'warning',
        tags: {
          feature: 'circuit-breaker',
          state: 'OPEN',
          path,
        },
        extra: {
          failures,
          reason,
        },
      }
    );

    logger.warn(
      `[Circuit Breaker] OPEN for ${path}`,
      { failures, reason },
      'api-error-monitoring'
    );
  } else {
    logger.info(
      `[Circuit Breaker] ${state} for ${path}`,
      { failures },
      'api-error-monitoring'
    );
  }
}

/**
 * Track retry attempts
 */
export function trackRetryAttempt(context: {
  path: string;
  method?: string;
  attempt: number;
  maxAttempts: number;
  error: RequestError;
}): void {
  const { path, method = 'GET', attempt, maxAttempts, error } = context;

  Sentry.addBreadcrumb({
    category: 'api-retry',
    message: `Retry attempt ${attempt}/${maxAttempts} for ${method} ${path}`,
    level: 'warning',
    data: {
      path,
      method,
      attempt,
      maxAttempts,
      errorType: error.errorType,
      status: error.status,
    },
  });

  logger.warn(
    `[API Retry] ${method} ${path} - Attempt ${attempt}/${maxAttempts}`,
    { errorType: error.errorType, status: error.status },
    'api-error-monitoring'
  );
}

/**
 * Create a performance measurement wrapper
 */
export function measureApiPerformance<T>(
  operation: () => Promise<T>,
  context: { path: string; method?: string }
): Promise<T> {
  const startTime = Date.now();
  const { path, method = 'GET' } = context;

  return operation()
    .then((result) => {
      const duration = Date.now() - startTime;
      trackApiSuccess({ path, method, duration });
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      trackApiError(error, { path, method, duration });
      throw error;
    });
}
