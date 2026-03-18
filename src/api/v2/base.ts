import { getNeonAccessToken } from '@/lib/auth/neon-token';
import { getWorkersApiUrl } from '@/lib/api/config';
import { getRequestTimeout } from '@/lib/api/requestConfig';
import { trackApiError, trackApiSuccess, measureApiPerformance } from '@/lib/api/errorMonitoring';
import { requestDeduplicator } from '@/lib/api/requestDeduplicator';

/**
 * Enhanced error types for better classification and handling
 */
type RequestError = Error & {
  status?: number;
  payload?: unknown;
  isRetryable?: boolean;
  errorType?: 'network' | 'timeout' | 'auth' | 'server_transient' | 'server_persistent' | 'client' | 'unknown';
  requestUrl?: string;
  requestId?: string;
};

async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await getNeonAccessToken();
  return { Authorization: `Bearer ${token}` };
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authHeaders = await getAuthHeader();
  const url = `${getWorkersApiUrl()}${path}`;
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const method = options.method || 'GET';
  
  // Get configured timeout for this path/method
  const configuredTimeout = getRequestTimeout(path, method);
  const timeout = options.signal ? undefined : configuredTimeout;
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : undefined;
  const startTime = Date.now();

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...authHeaders,
        ...options.headers,
      },
    });

    if (timeoutId) clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    // Handle 401 Unauthorized with token refresh
    if (res.status === 401) {
      try {
        const refreshedToken = await getNeonAccessToken({ forceSessionReload: true });
        const retry = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': `${requestId}-retry`,
            Authorization: `Bearer ${refreshedToken}`,
            ...options.headers,
          },
        });

        const retryDuration = Date.now() - startTime;

        if (!retry.ok) {
          const retryBody = await retry.json().catch(() => ({ error: retry.statusText }));
          const error = new Error(retryBody?.error ?? `HTTP ${retry.status}`) as RequestError;
          error.status = retry.status;
          error.payload = retryBody;
          error.errorType = classifyError(retry.status);
          error.requestUrl = url;
          error.requestId = `${requestId}-retry`;
          error.isRetryable = error.errorType === 'server_transient' || error.errorType === 'timeout';
          
          // Track error with Sentry
          trackApiError(error, { path, method, requestId: `${requestId}-retry`, duration: retryDuration });
          
          throw error;
        }

        // Track success after retry
        trackApiSuccess({ path, method, requestId: `${requestId}-retry`, duration: retryDuration, status: retry.status });
        return retry.json() as Promise<T>;
      } catch (refreshError) {
        const error = new Error(
          refreshError instanceof Error ? refreshError.message : 'Falha ao atualizar token'
        ) as RequestError;
        error.status = 401;
        error.errorType = 'auth';
        error.requestUrl = url;
        error.requestId = requestId;
        error.isRetryable = false;
        
        // Track auth error
        trackApiError(error, { path, method, requestId, duration: Date.now() - startTime });
        
        throw error;
      }
    }

    // Handle error responses
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      const error = new Error(body?.error ?? `HTTP ${res.status}`) as RequestError;
      error.status = res.status;
      error.payload = body;
      error.errorType = classifyError(res.status);
      error.requestUrl = url;
      error.requestId = requestId;
      error.isRetryable = error.errorType === 'server_transient' || error.errorType === 'timeout';
      
      // Track error with Sentry
      trackApiError(error, { path, method, requestId, duration });
      
      console.warn(`[API Request Failed] ${res.status} ${path}`, {
        errorType: error.errorType,
        isRetryable: error.isRetryable,
        requestId
      });
      
      throw error;
    }

    // Handle successful responses
    // Track success with Sentry
    trackApiSuccess({ path, method, requestId, duration, status: res.status });
    
    const contentType = res.headers.get('Content-Type');
    if (contentType?.includes('application/pdf')) {
      return res.blob() as unknown as Promise<T>;
    }

    return res.json() as Promise<T>;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    
    // Handle abort errors (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${timeout}ms`) as RequestError;
      timeoutError.errorType = 'timeout';
      timeoutError.requestUrl = url;
      timeoutError.requestId = requestId;
      timeoutError.isRetryable = true;
      
      // Track timeout error
      trackApiError(timeoutError, { path, method, requestId, duration });
      
      console.error(`[API Request Timeout] ${path}`, {
        timeout: `${timeout}ms`,
        configuredTimeout: `${configuredTimeout}ms`,
        requestId
      });
      
      throw timeoutError;
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = new Error(`Network error: ${error.message}`) as RequestError;
      networkError.errorType = 'network';
      networkError.requestUrl = url;
      networkError.requestId = requestId;
      networkError.isRetryable = true;
      
      // Track network error
      trackApiError(networkError, { path, method, requestId, duration });
      
      console.error(`[API Network Error] ${path}`, {
        error: error.message,
        requestId
      });
      
      throw networkError;
    }
    
    // Re-throw already classified errors
    if (error && typeof error === 'object' && 'errorType' in error) {
      trackApiError(error as RequestError, { path, method, requestId, duration });
      throw error;
    }
    
    // Unknown errors
    const unknownError = new Error(
      error instanceof Error ? error.message : 'Unknown request error'
    ) as RequestError;
    unknownError.errorType = 'unknown';
    unknownError.requestUrl = url;
    unknownError.requestId = requestId;
    unknownError.isRetryable = false;
    
    // Track unknown error
    trackApiError(unknownError, { path, method, requestId, duration });
    
    console.error(`[API Unknown Error] ${path}`, {
      error,
      requestId
    });
    
    throw unknownError;
  }
}

/**
 * Classify HTTP status codes into error types for better handling
 */
function classifyError(status: number): RequestError['errorType'] {
  // Network errors (no response)
  if (status === 0) return 'network';
  
  // Client errors (4xx) - generally not retryable
  if (status >= 400 && status < 500) {
    if (status === 408) return 'timeout'; // Request Timeout
    if (status === 429) return 'server_transient'; // Rate limiting - retry with backoff
    return 'client';
  }
  
  // Server errors (5xx)
  if (status >= 500) {
    // Transient server errors - service unavailable, gateway timeout, bad gateway
    if (status === 503 || status === 504 || status === 502) {
      return 'server_transient';
    }
    // 500 and others - likely persistent issues
    return 'server_persistent';
  }
  
  return 'unknown';
}

export async function requestPublic<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${getWorkersApiUrl()}${path}`;
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const method = options.method || 'GET';
  
  // Get configured timeout for this path/method
  const configuredTimeout = getRequestTimeout(path, method);
  const timeout = options.signal ? undefined : configuredTimeout;
  
  const controller = new AbortController();
  const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : undefined;
  const startTime = Date.now();

  try {
    // Execute fetch with or without deduplication
    const res = await (shouldDeduplicate
      ? requestDeduplicator.execute(url, method, (signal) => executeFetch(signal))
      : executeFetch()
    );

    if (timeoutId) clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      const error = new Error(body?.error ?? `HTTP ${res.status}`) as RequestError;
      error.status = res.status;
      error.payload = body;
      error.errorType = classifyError(res.status);
      error.requestUrl = url;
      error.requestId = requestId;
      error.isRetryable = error.errorType === 'server_transient' || error.errorType === 'timeout';
      
      // Track error with Sentry
      trackApiError(error, { path, method, requestId, duration });
      
      console.warn(`[Public API Request Failed] ${res.status} ${path}`, {
        errorType: error.errorType,
        isRetryable: error.isRetryable,
        requestId
      });
      
      throw error;
    }

    // Track success with Sentry
    trackApiSuccess({ path, method, requestId, duration, status: res.status });
    
    return res.json() as Promise<T>;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    
    // Handle abort errors (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${timeout}ms`) as RequestError;
      timeoutError.errorType = 'timeout';
      timeoutError.requestUrl = url;
      timeoutError.requestId = requestId;
      timeoutError.isRetryable = true;
      
      // Track timeout error
      trackApiError(timeoutError, { path, method, requestId, duration });
      
      console.error(`[Public API Request Timeout] ${path}`, {
        timeout: `${timeout}ms`,
        configuredTimeout: `${configuredTimeout}ms`,
        requestId
      });
      
      throw timeoutError;
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = new Error(`Network error: ${error.message}`) as RequestError;
      networkError.errorType = 'network';
      networkError.requestUrl = url;
      networkError.requestId = requestId;
      networkError.isRetryable = true;
      
      // Track network error
      trackApiError(networkError, { path, method, requestId, duration });
      
      console.error(`[Public API Network Error] ${path}`, {
        error: error.message,
        requestId
      });
      
      throw networkError;
    }
    
    // Re-throw already classified errors
    if (error && typeof error === 'object' && 'errorType' in error) {
      trackApiError(error as RequestError, { path, method, requestId, duration });
      throw error;
    }
    
    // Unknown errors
    const unknownError = new Error(
      error instanceof Error ? error.message : 'Unknown request error'
    ) as RequestError;
    unknownError.errorType = 'unknown';
    unknownError.requestUrl = url;
    unknownError.requestId = requestId;
    unknownError.isRetryable = false;
    
    // Track unknown error
    trackApiError(unknownError, { path, method, requestId, duration });
    
    console.error(`[Public API Unknown Error] ${path}`, {
      error,
      requestId
    });
    
    throw unknownError;
  }
}
