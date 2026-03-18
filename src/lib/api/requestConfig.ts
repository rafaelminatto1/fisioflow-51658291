/**
 * API Request Configuration
 * Centralized configuration for request timeouts, retries, and other options
 */

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

export type RequestCategory = 
  | 'query'          // Simple GET requests (default: 10s)
  | 'mutation'       // Write operations (default: 30s)
  | 'upload'         // File uploads (default: 60s)
  | 'bulk'           // Bulk operations (default: 45s)
  | 'report'         // Report generation (default: 120s)
  | 'search'         // Search queries (default: 15s)
  | 'streaming'      // Long-running operations (default: 300s);

/**
 * Default timeout configurations by request category
 */
export const REQUEST_TIMEOUTS: Record<RequestCategory, number> = {
  query: 10000,      // 10 seconds
  mutation: 30000,   // 30 seconds
  upload: 60000,     // 60 seconds
  bulk: 45000,       // 45 seconds
  report: 120000,    // 2 minutes
  search: 15000,      // 15 seconds
  streaming: 300000,  // 5 minutes
};

/**
 * Default retry configurations by request category
 */
export const REQUEST_RETRY_CONFIG: Record<RequestCategory, { max: number; delay: number }> = {
  query: { max: 3, delay: 1000 },
  mutation: { max: 1, delay: 2000 },    // Less retries for writes
  upload: { max: 1, delay: 3000 },      // Even less for uploads
  bulk: { max: 2, delay: 2000 },
  report: { max: 1, delay: 5000 },
  search: { max: 2, delay: 1500 },
  streaming: { max: 0, delay: 0 },      // No retries for streaming
};

/**
 * Path-specific configurations (overrides category defaults)
 */
export const PATH_SPECIFIC_CONFIG: Record<string, Partial<RequestOptions>> = {
  // Patient endpoints
  '/api/patients': { timeout: 15000 }, // 15s for patient list (can be large)
  '/api/patients/stats': { timeout: 20000 }, // 20s for stats
  
  // Document/attachment endpoints
  '/api/patients/*/attachments': { category: 'upload' as any },
  
  // Report endpoints
  '/api/reports': { timeout: 120000 },
  '/api/reports/generate': { timeout: 180000 },
  
  // Search endpoints
  '/api/search': { timeout: 20000 },
  
  // Bulk operations
  '/api/bulk': { timeout: 60000 },
  
  // Medical records (can have large data)
  '/api/medical-records': { timeout: 25000 },
  
  // Analytics/insights
  '/api/analytics': { timeout: 30000 },
  '/api/insights': { timeout: 30000 },
};

/**
 * Get timeout for a specific path/method combination
 */
export function getRequestTimeout(
  path: string,
  method: string = 'GET',
  category?: RequestCategory
): number {
  // Check for path-specific config
  const pathConfig = PATH_SPECIFIC_CONFIG[path];
  if (pathConfig?.timeout) {
    return pathConfig.timeout;
  }
  
  // Determine category from method if not provided
  if (!category) {
    category = inferCategoryFromMethod(method);
  }
  
  // Return category default
  return REQUEST_TIMEOUTS[category];
}

/**
 * Infer request category from HTTP method
 */
function inferCategoryFromMethod(method: string): RequestCategory {
  const upperMethod = method.toUpperCase();
  
  switch (upperMethod) {
    case 'GET':
      return 'query';
    case 'POST':
      return 'mutation';
    case 'PUT':
      return 'mutation';
    case 'PATCH':
      return 'mutation';
    case 'DELETE':
      return 'mutation';
    default:
      return 'query';
  }
}

/**
 * Get retry configuration for a request
 */
export function getRetryConfig(
  path: string,
  method: string = 'GET'
): { max: number; delay: number } {
  // Check for path-specific config
  const pathConfig = PATH_SPECIFIC_CONFIG[path];
  
  // Determine category from method
  const category = inferCategoryFromMethod(method);
  
  // Return category default
  return REQUEST_RETRY_CONFIG[category];
}

/**
 * Get complete request options
 */
export function getRequestOptions(
  path: string,
  method: string = 'GET',
  overrides?: Partial<RequestOptions>
): RequestOptions {
  const category = inferCategoryFromMethod(method);
  const timeout = getRequestTimeout(path, method, category);
  const retryConfig = getRetryConfig(path, method);
  
  return {
    timeout,
    retries: retryConfig.max,
    retryDelay: retryConfig.delay,
    method: method as any,
    ...overrides,
  };
}
