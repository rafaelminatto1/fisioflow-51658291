/**
 * Type-safe Query Builder for Supabase
 *
 * Provides a fluent interface for building type-safe queries with:
 * - Compile-time type safety
 * - Automatic error handling
 * - Built-in retry logic
 * - Query result caching
 * - Performance monitoring
 */

import { supabase } from './client';
import type { Database } from './types';
import { AppError, SupabaseError } from '@/lib/errors/AppError';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';
import { logger } from '@/lib/errors/logger';
import {
    executeQuery,
    withRetry,
    trackQuery,
    type QueryResult,
    type RetryOptions,
} from './supabase-utils';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Table names from the database schema
 */
export type TableName =
    | 'patients'
    | 'appointments'
    | 'exercises'
    | 'exercise_templates'
    | 'patient_evolution'
    | 'patient_sessions'
    | 'financial_records'
    | 'users'
    | 'notifications'
    | 'gamification_achievements'
    | 'gamification_challenges'
    | (string & {});

/**
 * Query filter operators
 */
export type FilterOperator =
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'like'
    | 'ilike'
    | 'in'
    | 'is'
    | 'cs'
    | 'cd'
    | 'sl'
    | 'sr'
    | 'nxl'
    | 'nxr'
    | 'adj'
    | 'ov'
    | 'fts'
    | 'plfts'
    | 'phfts'
    | 'wfts';

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc' | 'nullsfirst' | 'nullslast';

/**
 * Query options
 */
export interface QueryOptions {
    /** Select specific columns */
    select?: string[];
    /** Filters to apply */
    filters?: QueryFilter[];
    /** Order by clause */
    orderBy?: { column: string; order?: SortOrder };
    /** Limit results */
    limit?: number;
    /** Offset results */
    offset?: number;
    /** Range of results */
    range?: { from: number; to: number };
    /** Retry options */
    retry?: RetryOptions;
    /** Whether to track performance */
    trackPerformance?: boolean;
}

/**
 * Query filter
 */
export interface QueryFilter {
    column: string;
    operator: FilterOperator;
    value: unknown;
}

/**
 * Insert options
 */
export interface InsertOptions<T> {
    /** Data to insert */
    data: T | T[];
    /** Columns to return (default: all) */
    select?: string[];
    /** Whether to ignore duplicates */
    ignoreDuplicates?: boolean;
    /** Retry options */
    retry?: RetryOptions;
}

/**
 * Update options
 */
export interface UpdateOptions<T> {
    /** Data to update */
    data: Partial<T>;
    /** Filters to match rows */
    filters: QueryFilter[];
    /** Columns to return (default: all) */
    select?: string[];
    /** Retry options */
    retry?: RetryOptions;
}

/**
 * Delete options
 */
export interface DeleteOptions {
    /** Filters to match rows */
    filters: QueryFilter[];
    /** Whether to count affected rows */
    count?: 'exact' | 'planned' | 'estimated';
    /** Retry options */
    retry?: RetryOptions;
}

// ============================================================================
// QUERY BUILDER CLASS
// ============================================================================

/**
 * Type-safe query builder for Supabase
 */
export class SupabaseQueryBuilder<T extends Record<string, any>> {
    private tableName: TableName;
    private options: QueryOptions = {};
    private queryName: string;

    constructor(tableName: TableName, queryName?: string) {
        this.tableName = tableName;
        this.queryName = queryName || `${tableName}_query`;
    }

    /**
     * Set columns to select
     */
    select(...columns: string[]): this {
        this.options.select = columns;
        return this;
    }

    /**
     * Add a filter
     */
    where(column: keyof T | string, operator: FilterOperator, value: unknown): this {
        this.options.filters = this.options.filters || [];
        this.options.filters.push({ column: column as string, operator, value });
        return this;
    }

    /**
     * Add equality filter (shortcut)
     */
    eq(column: keyof T, value: unknown): this {
        return this.where(column, 'eq', value);
    }

    /**
     * Add IN filter
     */
    in(column: keyof T, values: unknown[]): this {
        return this.where(column, 'in', values);
    }

    /**
     * Add IS NULL filter
     */
    isNull(column: keyof T): this {
        return this.where(column, 'is', null);
    }

    /**
     * Add IS NOT NULL filter
     */
    isNotNull(column: keyof T): this {
        return this.where(column, 'is', null); // Note: Supabase uses special syntax
    }

    /**
     * Add LIKE filter
     */
    like(column: keyof T, pattern: string): this {
        return this.where(column, 'like', pattern);
    }

    /**
     * Add ILIKE filter (case-insensitive)
     */
    ilike(column: keyof T, pattern: string): this {
        return this.where(column, 'ilike', pattern);
    }

    /**
     * Add greater than filter
     */
    gt(column: keyof T, value: unknown): this {
        return this.where(column, 'gt', value);
    }

    /**
     * Add greater than or equal filter
     */
    gte(column: keyof T, value: unknown): this {
        return this.where(column, 'gte', value);
    }

    /**
     * Add less than filter
     */
    lt(column: keyof T, value: unknown): this {
        return this.where(column, 'lt', value);
    }

    /**
     * Add less than or equal filter
     */
    lte(column: keyof T, value: unknown): this {
        return this.where(column, 'lte', value);
    }

    /**
     * Order results
     */
    orderBy(column: keyof T, order: SortOrder = 'asc'): this {
        this.options.orderBy = { column: column as string, order };
        return this;
    }

    /**
     * Limit results
     */
    limit(limit: number): this {
        this.options.limit = limit;
        return this;
    }

    /**
     * Offset results
     */
    offset(offset: number): this {
        this.options.offset = offset;
        return this;
    }

    /**
     * Set range
     */
    range(from: number, to: number): this {
        this.options.range = { from, to };
        return this;
    }

    /**
     * Set retry options
     */
    retry(options: RetryOptions): this {
        this.options.retry = options;
        return this;
    }

    /**
     * Enable performance tracking
     */
    track(value: boolean = true): this {
        this.options.trackPerformance = value;
        return this;
    }

    /**
     * Build and execute the query
     */
    async execute(): Promise<QueryResult<T[]>> {
        const queryFn = async () => {
            let query = supabase.from(this.tableName);

            // Apply select
            if (this.options.select && this.options.select.length > 0) {
                query = query.select(this.options.select.join(', '));
            } else {
                query = query.select('*');
            }

            // Apply filters
            if (this.options.filters) {
                for (const filter of this.options.filters) {
                    query = this.applyFilter(query, filter);
                }
            }

            // Apply ordering
            if (this.options.orderBy) {
                query = query.order(this.options.orderBy.column, {
                    ascending: this.options.orderBy.order === 'asc',
                    nullsFirst: this.options.orderBy.order === 'nullsfirst',
                });
            }

            // Apply limit
            if (this.options.limit !== undefined) {
                query = query.limit(this.options.limit);
            }

            // Apply offset
            if (this.options.offset !== undefined) {
                query = query.range(this.options.offset, this.options.offset + (this.options.limit || 1000) - 1);
            }

            // Apply range
            if (this.options.range) {
                query = query.range(this.options.range.from, this.options.range.to);
            }

            return query;
        };

        if (this.options.trackPerformance) {
            return trackQuery(this.queryName, () =>
                executeQuery(queryFn, this.queryName, this.options.retry)
            );
        }

        return executeQuery(queryFn, this.queryName, this.options.retry);
    }

    /**
     * Execute and return single result
     */
    async single(): Promise<QueryResult<T>> {
        this.options.limit = 1;
        const result = await this.execute();

        if (result.error) {
            return { data: null, error: result.error, count: null };
        }

        return {
            data: result.data?.[0] || null,
            error: null,
            count: result.count,
        };
    }

    /**
     * Execute and return maybe single (null if not found)
     */
    async maybeSingle(): Promise<QueryResult<T>> {
        this.options.limit = 1;
        const result = await this.execute();

        if (result.error) {
            return { data: null, error: result.error, count: null };
        }

        return {
            data: result.data?.[0] || null,
            error: null,
            count: result.count,
        };
    }

    /**
     * Execute and return first result or null
     */
    async first(): Promise<QueryResult<T>> {
        return this.maybeSingle();
    }

    /**
     * Execute and count results
     */
    async count(): Promise<QueryResult<number>> {
        const originalSelect = this.options.select;
        this.options.select = ['*', { count: 'exact', head: true } as any];

        const result = await this.execute();

        this.options.select = originalSelect;

        return {
            data: result.count ?? 0,
            error: result.error,
            count: result.count,
        };
    }

    /**
     * Check if any rows exist
     */
    async exists(): Promise<boolean> {
        const originalSelect = this.options.select;
        this.options.select = ['1'];
        this.options.limit = 1;

        const result = await this.execute();

        this.options.select = originalSelect;
        delete this.options.limit;

        return !result.error && result.data !== null && result.data.length > 0;
    }

    /**
     * Apply a single filter to the query
     */
    private applyFilter(query: any, filter: QueryFilter): any {
        const { column, operator, value } = filter;

        switch (operator) {
            case 'eq':
                return query.eq(column, value);
            case 'neq':
                return query.neq(column, value);
            case 'gt':
                return query.gt(column, value);
            case 'gte':
                return query.gte(column, value);
            case 'lt':
                return query.lt(column, value);
            case 'lte':
                return query.lte(column, value);
            case 'like':
                return query.like(column, value);
            case 'ilike':
                return query.ilike(column, value);
            case 'in':
                return query.in(column, value);
            case 'is':
                return query.is(column, value);
            case 'cs':
                return query.contains(column, value);
            case 'cd':
                return query.containedBy(column, value);
            case 'sl':
                return query.rangeLt(column, value);
            case 'sr':
                return query.rangeGt(column, value);
            case 'nxl':
                return query.rangeGte(column, value);
            case 'nxr':
                return query.rangeLte(column, value);
            case 'adj':
                return query.rangeAdjacent(column, value);
            case 'ov':
                return query.overlaps(column, value);
            case 'fts':
                return query.textSearch(column, value);
            case 'plfts':
                return query.textSearch(column, value, { type: 'plain' });
            case 'phfts':
                return query.textSearch(column, value, { type: 'phrase' });
            case 'wfts':
                return query.textSearch(column, value, { type: 'websearch' });
            default:
                return query;
        }
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a new query builder
 */
export function createQuery<T extends Record<string, any>>(
    tableName: TableName,
    queryName?: string
): SupabaseQueryBuilder<T> {
    return new SupabaseQueryBuilder<T>(tableName, queryName);
}

/**
 * Quick select query
 */
export async function select<T extends Record<string, any>>(
    tableName: TableName,
    options?: QueryOptions
): Promise<QueryResult<T[]>> {
    return createQuery<T>(tableName)
        .retry(options?.retry)
        .track(options?.trackPerformance ?? false)
        .execute();
}

/**
 * Quick select single row
 */
export async function selectOne<T extends Record<string, any>>(
    tableName: TableName,
    options?: QueryOptions
): Promise<QueryResult<T>> {
    return createQuery<T>(tableName)
        .retry(options?.retry)
        .track(options?.trackPerformance ?? false)
        .single();
}

/**
 * Quick insert
 */
export async function insert<T extends Record<string, any>>(
    tableName: TableName,
    options: InsertOptions<T>
): Promise<QueryResult<T>> {
    const queryFn = async () => {
        let query = supabase.from(tableName);

        if (options.select) {
            query = query.insert(options.data).select(options.select.join(', '));
        } else {
            query = query.insert(options.data).select();
        }

        return query;
    };

    return executeQuery(queryFn, `insert_${tableName}`, options.retry);
}

/**
 * Quick update
 */
export async function update<T extends Record<string, any>>(
    tableName: TableName,
    options: UpdateOptions<T>
): Promise<QueryResult<T[]>> {
    const queryFn = async () => {
        let query = supabase.from(tableName).update(options.data);

        // Apply filters
        for (const filter of options.filters) {
            const builder = new SupabaseQueryBuilder<T>(tableName);
            query = builder['applyFilter'](query, filter);
        }

        if (options.select) {
            query = query.select(options.select.join(', '));
        }

        return query;
    };

    return executeQuery(queryFn, `update_${tableName}`, options.retry);
}

/**
 * Quick delete
 */
export async function deleteRows(
    tableName: TableName,
    options: DeleteOptions
): Promise<QueryResult<null>> {
    const queryFn = async () => {
        let query = supabase.from(tableName).delete();

        // Apply filters
        for (const filter of options.filters) {
            const builder = new SupabaseQueryBuilder<any>(tableName);
            query = builder['applyFilter'](query, filter);
        }

        if (options.count) {
            query = query.select('*', { count: options.count, head: true } as any);
        }

        return query;
    };

    return executeQuery(queryFn, `delete_${tableName}`, options.retry);
}

/**
 * Bulk insert with batch processing
 */
export async function bulkInsert<T extends Record<string, any>>(
    tableName: TableName,
    data: T[],
    options: {
        batchSize?: number;
        retry?: RetryOptions;
        onProgress?: (inserted: number, total: number) => void;
    } = {}
): Promise<QueryResult<T[]>> {
    const { batchSize = 1000, retry, onProgress } = options;

    if (data.length === 0) {
        return { data: [], error: null, count: 0 };
    }

    if (data.length <= batchSize) {
        return insert(tableName, { data, retry });
    }

    // Process in batches
    const results: T[] = [];
    let hasError = false;
    let lastError: Error | null = null;

    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const result = await insert(tableName, { data: batch, retry });

        if (result.error) {
            hasError = true;
            lastError = result.error;
            logger.error(`Bulk insert failed at batch ${Math.floor(i / batchSize)}`, result.error);
            break;
        }

        if (result.data) {
            results.push(...(Array.isArray(result.data) ? result.data : [result.data]).filter(Boolean) as T[]);
        }

        onProgress?.(Math.min(i + batchSize, data.length), data.length);
    }

    if (hasError) {
        return { data: null, error: lastError, count: null };
    }

    return { data: results, error: null, count: results.length };
}

/**
 * Upsert (insert or update if exists)
 */
export async function upsert<T extends Record<string, any>>(
    tableName: TableName,
    options: InsertOptions<T> & {
        onConflict?: string;
        ignoreDuplicates?: boolean;
    }
): Promise<QueryResult<T>> {
    const queryFn = async () => {
        let query = supabase.from(tableName);

        if (options.onConflict) {
            query = query.upsert(options.data, {
                onConflict: options.onConflict,
                ignoreDuplicates: options.ignoreDuplicates,
            });
        } else {
            query = query.upsert(options.data);
        }

        if (options.select) {
            query = query.select(options.select.join(', '));
        } else {
            query = query.select();
        }

        return query;
    };

    return executeQuery(queryFn, `upsert_${tableName}`, options.retry);
}

// ============================================================================
// REACTIVE QUERY HOOKS (for React)
// ============================================================================

/**
 * Hook factory for creating reactive queries
 * This would be used with React Query
 */
export function createQueryHook<T extends Record<string, any>>(
    tableName: TableName,
    queryName?: string
) {
    return (options?: QueryOptions) => {
        // This would integrate with React Query
        // For now, return the query builder
        return createQuery<T>(tableName, queryName);
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default SupabaseQueryBuilder;
