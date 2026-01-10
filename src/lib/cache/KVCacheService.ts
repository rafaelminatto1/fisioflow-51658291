/**
 * Vercel KV Cache Service
 *
 * Distributed Redis-based caching layer using Vercel KV
 * Replaces in-memory caching with persistent, shared cache across deployments
 */

import { kv } from '@vercel/kv';
import { supabase } from '../supabase/client';

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
}

export interface CacheStats {
  hits: number;
  misses: number;
  rate: number;
}

// Cache statistics for monitoring
const stats = {
  hits: 0,
  misses: 0,
};

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
    console.error('Cache get error:', error);
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
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
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
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
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
    console.error('Cache invalidate pattern error:', error);
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
 * Specific cache helpers for FisioFlow entities
 */

export class PatientCache {
  private static readonly prefix = 'patient';
  private static readonly defaultTTL = 3600; // 1 hour

  static async get(patientId: string) {
    return getCache<any>(`${this.prefix}:${patientId}`, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async set(patientId: string, data: any) {
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
    return getCache<any>(`${this.prefix}:${appointmentId}`, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async set(appointmentId: string, data: any) {
    return setCache(`${this.prefix}:${appointmentId}`, data, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async getByPatient(patientId: string) {
    return getCache<any[]>(`${this.prefix}:patient:${patientId}`, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async setByPatient(patientId: string, data: any[]) {
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
    return getCache<any>(`${this.prefix}:${exerciseId}`, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async set(exerciseId: string, data: any) {
    return setCache(`${this.prefix}:${exerciseId}`, data, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async getAll() {
    return getCache<any[]>(`${this.prefix}:all`, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async setAll(data: any[]) {
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
    return getCache<any>(`${this.prefix}:${protocolId}`, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async set(protocolId: string, data: any) {
    return setCache(`${this.prefix}:${protocolId}`, data, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async getAll() {
    return getCache<any[]>(`${this.prefix}:all`, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async setAll(data: any[]) {
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
    return getCache<any>(`${this.prefix}:${sessionId}`, {
      prefix: 'fisioflow',
      ttl: this.defaultTTL,
    });
  }

  static async set(sessionId: string, data: any) {
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
