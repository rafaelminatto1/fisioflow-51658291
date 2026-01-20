/**
 * Supabase Integration Module
 *
 * Central exports for Supabase client, utilities, and helpers.
 */

// Core client
export { supabase } from './client';
export type { Database } from './types';

// Utilities
export {
    // Retry logic
    withRetry,
    type RetryOptions,

    // Query helpers
    handleQueryResult,
    executeQuery,
    type QueryResult,

    // Health check
    healthCheck,
    waitForHealthy,
    type HealthCheckResult,

    // Batch operations
    batchQuery,
    transaction,

    // Pagination
    fetchAllPages,

    // Validation
    validateRequired,
    validateTypes,

    // Performance monitoring
    QueryPerformanceTracker,
    performanceTracker,
    trackQuery,

    // Auth helpers
    getSession,
    getUser,
    refreshSession,
} from './supabase-utils';

// Error codes
export { SupabaseErrorCode } from './supabase-utils';

// Query builder
export {
    SupabaseQueryBuilder,
    createQuery,
    select,
    selectOne,
    insert,
    update,
    deleteRows,
    bulkInsert,
    upsert,
    createQueryHook,
    type QueryOptions,
    type QueryFilter,
    type FilterOperator,
    type SortOrder,
    type InsertOptions,
    type UpdateOptions,
    type DeleteOptions,
} from './query-builder';
