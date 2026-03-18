/**
 * Advanced Request Deduplication System
 * 
 * Prevents duplicate requests to the same endpoint with the same parameters.
 * Works alongside React Query's built-in deduplication for extra safety.
 */

type PendingRequest = {
  url: string;
  method: string;
  timestamp: number;
  promise: Promise<any>;
  abortController: AbortController;
};

export class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private readonly requestTTL: number; // Time in ms to keep request in memory

  constructor(requestTTL: number = 60000) { // 1 minute default TTL
    this.requestTTL = requestTTL;
    
    // Cleanup old requests periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 30000); // Cleanup every 30 seconds
  }

  /**
   * Generate a unique key for a request
   */
  private getRequestKey(url: string, method: string, body?: unknown): string {
    const bodyString = body ? JSON.stringify(body) : '';
    return `${method}:${url}:${bodyString}`;
  }

  /**
   * Check if a request is already pending
   */
  private isPending(key: string): boolean {
    const request = this.pendingRequests.get(key);
    if (!request) return false;
    
    // Clean up expired requests
    if (Date.now() - request.timestamp > this.requestTTL) {
      this.pendingRequests.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Execute a request with deduplication
   * If the same request is already in flight, return the existing promise
   */
  async execute<T>(
    url: string,
    method: string,
    fetchFn: (signal?: AbortSignal) => Promise<T>,
    body?: unknown
  ): Promise<T> {
    const key = this.getRequestKey(url, method, body);

    // If request is already pending, return existing promise
    if (this.isPending(key)) {
      const existingRequest = this.pendingRequests.get(key)!;
      console.debug(`[RequestDeduplicator] Reusing pending request`, {
        url,
        method,
        age: Date.now() - existingRequest.timestamp
      });
      return existingRequest.promise as Promise<T>;
    }

    // Create new request
    const abortController = new AbortController();
    const timestamp = Date.now();

    const promise = fetchFn(abortController.signal)
      .finally(() => {
        // Remove from pending requests after completion
        this.pendingRequests.delete(key);
      });

    // Store request
    this.pendingRequests.set(key, {
      url,
      method,
      timestamp,
      promise,
      abortController,
    });

    console.debug(`[RequestDeduplicator] New request initiated`, {
      url,
      method,
      key
    });

    return promise;
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    this.pendingRequests.forEach((request) => {
      request.abortController.abort();
    });
    this.pendingRequests.clear();
    
    console.info('[RequestDeduplicator] All requests cancelled', {
      count: this.pendingRequests.size
    });
  }

  /**
   * Cancel specific request
   */
  cancelRequest(url: string, method: string, body?: unknown): boolean {
    const key = this.getRequestKey(url, method, body);
    const request = this.pendingRequests.get(key);
    
    if (request) {
      request.abortController.abort();
      this.pendingRequests.delete(key);
      console.debug(`[RequestDeduplicator] Request cancelled`, {
        url,
        method,
        key
      });
      return true;
    }
    
    return false;
  }

  /**
   * Clean up expired requests
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    this.pendingRequests.forEach((request, key) => {
      if (now - request.timestamp > this.requestTTL) {
        request.abortController.abort();
        this.pendingRequests.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.debug(`[RequestDeduplicator] Cleaned up expired requests`, {
        count: cleaned,
        remaining: this.pendingRequests.size
      });
    }
  }

  /**
   * Get statistics about pending requests
   */
  getStats(): { pending: number; keys: string[] } {
    return {
      pending: this.pendingRequests.size,
      keys: Array.from(this.pendingRequests.keys()),
    };
  }

  /**
   * Destroy deduplicator and cleanup
   */
  destroy(): void {
    this.cancelAll();
    clearInterval(this.cleanupInterval);
  }
}

// Singleton instance for application-wide deduplication
const requestDeduplicator = new RequestDeduplicator();

export { requestDeduplicator };

/**
 * Higher-order function to wrap fetch calls with deduplication
 */
export function withDeduplication<T extends any[], R>(
  fetchFn: (signal?: AbortSignal) => Promise<R>,
  url: string,
  method: string = 'GET',
  body?: unknown
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return requestDeduplicator.execute(url, method, fetchFn, body);
  };
}

/**
 * React hook for request deduplication
 */
export function useRequestDeduplication() {
  return {
    deduplicate: <T>(
      url: string,
      method: string,
      fetchFn: (signal?: AbortSignal) => Promise<T>,
      body?: unknown
    ) => requestDeduplicator.execute(url, method, fetchFn, body),
    
    cancel: (url: string, method: string, body?: unknown) =>
      requestDeduplicator.cancelRequest(url, method, body),
    
    cancelAll: () => requestDeduplicator.cancelAll(),
    
    getStats: () => requestDeduplicator.getStats(),
  };
}

/**
 * Deduplication settings for specific endpoints
 */
export const DEDUPLICATION_SETTINGS = {
  // Patient list requests - highly likely to be duplicated
  '/api/patients': {
    enabled: true,
    ttl: 30000, // 30 seconds
  },
  
  // Search requests - very likely to be duplicated during typing
  '/api/search': {
    enabled: true,
    ttl: 5000, // 5 seconds (shorter for search)
  },
  
  // Stats and analytics - cache for longer
  '/api/patients/*/stats': {
    enabled: true,
    ttl: 60000, // 1 minute
  },
  
  // Appointments - moderate deduplication
  '/api/appointments': {
    enabled: true,
    ttl: 15000, // 15 seconds
  },
  
  // Disable for mutations
  mutations: {
    enabled: false,
  },
};
