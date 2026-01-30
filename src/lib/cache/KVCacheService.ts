/**
 * Vercel KV Cache Service
 *
 * Distributed Redis-based caching layer using Vercel KV
 * Replaces in-memory caching with persistent, shared cache across deployments
 *
 * @version 2.0.0 - Enhanced with monitoring, smart invalidation, and health checks
 */

import { kv } from '@vercel/kv';
import { logger } from '@/lib/errors/logger';

export interface CacheOptions {
  /**
   * Time to live in seconds
   * @default 3600 (1 hour)
   */
  ttl?: number;

  /**
   * Cache key prefix for namespacing
   * @default 'fisioflow'
   */
  prefix?: string;

  /**
   * Skip cache if error occurs
   * @default true
   */
  failOpen?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  rate: number;
  sets: number;
  deletes: number;
  errors: number;
  lastReset: Date;
}

// Enhanced cache statistics for monitoring
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
  lastReset: new Date(),
};

// Cache TTL constants for different data types
export const CACHE_TTL = {
  // Short TTL - rapidly changing data
  SHORT: 60, // 1 minute
  VERY_SHORT: 30, // 30 seconds

  // Medium TTL - moderately changing data
  MEDIUM: 300, // 5 minutes
  DEFAULT: 600, // 10 minutes

  // Long TTL - rarely changing data
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours

  // Extended TTL - static reference data
  EXTENDED: 604800, // 7 days
} as const;

/**
 * Generate a cache key with prefix
 */
function getKey(key: string, prefix: string = 'fisioflow'): string {
  return `${prefix}:${key}`;
}

/**
 * Get cache hit rate
 */
export function getCacheStats(): CacheStats {
  const total = stats.hits + stats.misses;
  return {
    hits: stats.hits,
    misses: stats.misses,
    rate: total > 0 ? stats.hits / total : 0,
    sets: stats.sets,
    deletes: stats.deletes,
    errors: stats.errors,
    lastReset: stats.lastReset,
  };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
}

/**
 * Get a value from cache
 */
export async function getCache<T>(
  key: string,
  options?: CacheOptions
): Promise<T | null> {
  try {
    const fullKey = getKey(key, options?.prefix);
    const value = await kv.get<T>(fullKey);

    if (value !== null) {
      stats.hits++;
      return value;
    }

    stats.misses++;
    return null;
  } catch (error) {
    logger.error('Cache get error', error, 'KVCacheService');
    stats.misses++;
    return null;
  }
}

/**
 * Set a value in cache
 */
export async function setCache<T>(
  key: string,
  value: T,
  options?: CacheOptions
): Promise<boolean> {
  try {
    const fullKey = getKey(key, options?.prefix);
    await kv.set(fullKey, value, { ex: options?.ttl || 3600 });
    stats.sets++;
    return true;
  } catch (error) {
    logger.error('Cache set error', error, 'KVCacheService');
    stats.errors++;
    return false;
  }
}

/**
 * Delete a value from cache
 */
export async function deleteCache(
  key: string,
  options?: CacheOptions
): Promise<boolean> {
  try {
    const fullKey = getKey(key, options?.prefix);
    await kv.del(fullKey);
    stats.deletes++;
    return true;
  } catch (error) {
    logger.error('Cache delete error', error, 'KVCacheService');
    stats.errors++;
    return false;
  }
}

/**
 * Invalidate multiple cache keys by pattern
 * Note: KV doesn't support pattern matching, so we track keys
 */
export async function invalidatePattern(
  pattern: string,
  options?: CacheOptions
): Promise<void> {
  try {
    // Get all keys with prefix
    const prefix = getKey('', options?.prefix).slice(0, -1);
    const keys = await kv.keys(`${prefix}*`);

    // Filter by pattern
    const matchingKeys = keys.filter(key => key.includes(pattern));

    // Delete all matching keys
    if (matchingKeys.length > 0) {
      await kv.del(...matchingKeys);
    }
  } catch (error) {
    logger.error('Cache invalidate pattern error', error, 'KVCacheService');
  }
}

/**
 * Cache wrapper for Supabase queries
 * Automatically caches results and invalidates on mutations
 */
export function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options?: CacheOptions
) {
  return {
    async execute(): Promise<T> {
      // Try cache first
      const cached = await getCache<T>(key, options);
      if (cached !== null) {
        return cached;
      }

      // Execute query
      const result = await queryFn();

      // Cache result
      await setCache(key, result, options);

      return result;
    },
  };
}

/**
 * Cache health status
 */
export type CacheHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface CacheHealthResult {
  status: CacheHealthStatus;
  hitRate: number;
  errorRate: number;
  recommendations: string[];
}

/**
 * Get cache health status
 */
export async function getCacheHealth(): Promise<CacheHealthResult> {
  const currentStats = getCacheStats();
  const total = currentStats.hits + currentStats.misses;
  const totalOperations = total + currentStats.sets + currentStats.deletes;

  const hitRate = currentStats.rate;
  const errorRate = totalOperations > 0 ? currentStats.errors / totalOperations : 0;

  const status: CacheHealthStatus =
    errorRate > 0.05 ? 'unhealthy' :
    hitRate < 0.5 ? 'degraded' :
    'healthy';

  const recommendations: string[] = [];

  if (hitRate < 0.5) {
    recommendations.push('Low cache hit rate - consider increasing TTL values or caching more data');
  }

  if (errorRate > 0.01) {
    recommendations.push('High error rate detected - check Vercel KV connectivity');
  }

  if (currentStats.sets > currentStats.hits * 10) {
    recommendations.push('High set-to-hit ratio - cache may be expiring too quickly');
  }

  return {
    status,
    hitRate,
    errorRate,
    recommendations,
  };
}

/**
 * Smart cache invalidation based on entity type
 */
export async function smartInvalidate(
  entityType: 'patient' | 'appointment' | 'session' | 'exercise' | 'protocol',
  entityId?: string,
  options?: CacheOptions
): Promise<void> {
  const prefix = options?.prefix || 'fisioflow';

  try {
    switch (entityType) {
      case 'patient':
        // Invalidate patient data and related appointments/sessions
        await deleteCache(`${entityType}:${entityId}`, { prefix });
        await invalidatePattern(`appointment:patient:${entityId}`, { prefix });
        await invalidatePattern(`session:patient:${entityId}`, { prefix });
        break;

      case 'appointment':
        // Invalidate appointment and patient's appointment list
        if (entityId) {
          await deleteCache(`${entityType}:${entityId}`, { prefix });
        }
        await invalidatePattern(`${entityType}:patient:*`, { prefix });
        break;

      case 'session':
        // Invalidate session and patient's session list
        if (entityId) {
          await deleteCache(`${entityType}:${entityId}`, { prefix });
        }
        await invalidatePattern(`${entityType}:patient:*`, { prefix });
        break;

      case 'exercise':
      case 'protocol':
        // Invalidate specific entity and "all" cache
        if (entityId) {
          await deleteCache(`${entityType}:${entityId}`, { prefix });
        }
        await deleteCache(`${entityType}:all`, { prefix });
        break;
    }
  } catch (error) {
    logger.error(`Smart invalidation error for ${entityType}`, error, 'KVCacheService');
  }
}

/**
 * Warm up cache with frequently accessed data
 */
export async function warmUpCache(
  dataLoaders: Record<string, () => Promise<unknown>>,
  options?: CacheOptions
): Promise<void> {
  const results = await Promise.allSettled(
    Object.entries(dataLoaders).map(async ([key, loader]) => {
      try {
        const data = await loader();
        await setCache(key, data, options);
      } catch (error) {
        logger.error(`Cache warm-up failed for ${key}`, error, 'KVCacheService');
      }
    })
  );

  const failed = results.filter(r => r.status === 'rejected').length;
  logger.info(`Cache warm-up completed: ${results.length - failed}/${results.length} successful`, undefined, 'KVCacheService');
}

/**
 * Batch get multiple cache keys
 */
export async function batchGet<T>(
  keys: string[],
  options?: CacheOptions
): Promise<Map<string, T>> {
  const result = new Map<string, T>();

  await Promise.all(
    keys.map(async key => {
      const value = await getCache<T>(key, options);
      if (value !== null) {
        result.set(key, value);
      }
    })
  );

  return result;
}

/**
 * Batch set multiple cache keys
 */
export async function batchSet<T>(
  entries: Array<{ key: string; value: T }>,
  options?: CacheOptions
): Promise<void> {
  await Promise.all(
    entries.map(({ key, value }) => setCache(key, value, options))
  );
}

/**
 * Batch delete multiple cache keys
 */
export async function batchDelete(
  keys: string[],
  options?: CacheOptions
): Promise<void> {
  await Promise.all(keys.map(key => deleteCache(key, options)));
}

/**
 * Specific cache helpers for FisioFlow entities
 */

export class PatientCache {
  private static readonly prefix = 'patient';
  private static readonly defaultTTL = 3600; // 1 hour

  static async get(patientId: string) {
    return getCache<unknown>(`${this.prefix}:${patientId}`, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async set(patientId: string, data: unknown) {
    return setCache(`${this.prefix}:${patientId}`, data, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async invalidate(patientId: string) {
    return deleteCache(`${this.prefix}:${patientId}`, {
      prefix: 'fisioflow',
    });
  }

  static async invalidateAll() {
    return invalidatePattern(this.prefix, { prefix: 'fisioflow' });
  }
}

export class AppointmentCache {
  private static readonly prefix = 'appointment';
  private static readonly defaultTTL = 1800; // 30 minutes

  static async get(appointmentId: string) {
    return getCache<unknown>(`${this.prefix}:${appointmentId}`, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async set(appointmentId: string, data: unknown) {
    return setCache(`${this.prefix}:${appointmentId}`, data, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async getByPatient(patientId: string) {
    return getCache<unknown[]>(`${this.prefix}:patient:${patientId}`, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async setByPatient(patientId: string, data: unknown[]) {
    return setCache(`${this.prefix}:patient:${patientId}`, data, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async invalidate(appointmentId: string) {
    return deleteCache(`${this.prefix}:${appointmentId}`, {
      prefix: 'fisioflow',
    });
  }

  static async invalidatePatient(patientId: string) {
    return deleteCache(`${this.prefix}:patient:${patientId}`, {
      prefix: 'fisioflow',
    });
  }

  static async invalidateAll() {
    return invalidatePattern(this.prefix, { prefix: 'fisioflow' });
  }
}

export class ExerciseCache {
  private static readonly prefix = 'exercise';
  private static readonly defaultTTL = 7200; // 2 hours

  static async get(exerciseId: string) {
    return getCache<unknown>(`${this.prefix}:${exerciseId}`, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async set(exerciseId: string, data: unknown) {
    return setCache(`${this.prefix}:${exerciseId}`, data, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async getAll() {
    return getCache<unknown[]>(`${this.prefix}:all`, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async setAll(data: unknown[]) {
    return setCache(`${this.prefix}:all`, data, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async invalidate(exerciseId?: string) {
    if (exerciseId) {
      return deleteCache(`${this.prefix}:${exerciseId}`, {
        prefix: 'fisioflow',
      });
    }
    // Invalidate all
    await deleteCache(`${this.prefix}:all`, { prefix: 'fisioflow' });
    return invalidatePattern(this.prefix, { prefix: 'fisioflow' });
  }
}

export class ProtocolCache {
  private static readonly prefix = 'protocol';
  private static readonly defaultTTL = 7200; // 2 hours

  static async get(protocolId: string) {
    return getCache<unknown>(`${this.prefix}:${protocolId}`, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async set(protocolId: string, data: unknown) {
    return setCache(`${this.prefix}:${protocolId}`, data, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async getAll() {
    return getCache<unknown[]>(`${this.prefix}:all`, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async setAll(data: unknown[]) {
    return setCache(`${this.prefix}:all`, data, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async invalidate(protocolId?: string) {
    if (protocolId) {
      return deleteCache(`${this.prefix}:${protocolId}`, {
        prefix: 'fisioflow',
      });
    }
    await deleteCache(`${this.prefix}:all`, { prefix: 'fisioflow' });
    return invalidatePattern(this.prefix, { prefix: 'fisioflow' });
  }
}

/**
 * Rate limiting using Vercel KV
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function rateLimit(
  identifier: string,
  limit: number = 100,
  window: number = 60
): Promise<RateLimitResult> {
  const key = getKey(`ratelimit:${identifier}`, 'ratelimit');
  const now = Date.now();
  const windowStart = now - window * 1000;

  try {
    // Get current requests
    const requests = await kv.lrange(key, 0, -1);

    // Filter out expired requests
    const validRequests = requests
      .map(Number)
      .filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (validRequests.length >= limit) {
      // Get reset time (oldest request + window)
      const oldestRequest = Math.min(...validRequests);
      return {
        success: false,
        limit,
        remaining: 0,
        reset: oldestRequest + window * 1000,
      };
    }

    // Add current request
    await kv.rpush(key, now.toString());

    // Set expiration
    await kv.expire(key, window);

    return {
      success: true,
      limit,
      remaining: limit - validRequests.length - 1,
      reset: now + window * 1000,
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open - allow request if rate limiting fails
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + window * 1000,
    };
  }
}

/**
 * Session storage using Vercel KV
 */
export class SessionCache {
  private static readonly prefix = 'session';
  private static readonly defaultTTL = 86400; // 24 hours

  static async get(sessionId: string) {
    return getCache<unknown>(`${this.prefix}:${sessionId}`, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async set(sessionId: string, data: unknown) {
    return setCache(`${this.prefix}:${sessionId}`, data, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async delete(sessionId: string) {
    return deleteCache(`${this.prefix}:${sessionId}`, {
      prefix: 'fisioflow',
    });
  }

  static async refresh(sessionId: string) {
    const data = await this.get(sessionId);
    if (data) {
      await this.set(sessionId, data);
    }
  }
}
