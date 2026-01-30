/**
 * Firestore Cache Service
 *
 * Distributed caching layer using Firebase Firestore
 * Replaces Vercel KV (Redis) with Firestore-based cache
 *
 * @version 1.0.0 - Firebase Migration
 *
 * Key differences from Vercel KV:
 * - Uses Firestore collection instead of Redis
 * - Manual TTL handling (expiration field)
 * - No pattern matching - tracked keys instead
 * - No list operations for rate limiting
 */

import { db } from '@/integrations/firebase/app';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import { logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

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

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  expires_at: string;
  created_at: string;
  prefix: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

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

// ============================================================================
// STATE
// ============================================================================

// Enhanced cache statistics for monitoring
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
  lastReset: new Date(),
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a cache key with prefix
 */
function getKey(key: string, prefix: string = 'fisioflow'): string {
  return `${prefix}:${key}`;
}

/**
 * Get the Firestore collection reference for cache
 */
function getCacheCollection() {
  return collection(db, '_cache');
}

/**
 * Get the document reference for a cache key
 */
function getCacheDocRef(key: string, prefix: string = 'fisioflow') {
  const fullKey = getKey(key, prefix);
  // Use base64 encoding to avoid invalid characters in document IDs
  const docId = btoa(fullKey).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return doc(db, '_cache', docId);
}

/**
 * Clean up expired cache entries
 * Runs in background to avoid blocking
 */
async function cleanupExpired(): Promise<void> {
  try {
    const now = new Date().toISOString();

    const q = query(
      collection(db, '_cache'),
      where('expires_at', '<', now)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Delete in batches of 500
      const batchSize = 500;
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = snapshot.docs.slice(i, i + batchSize);

        batchDocs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
      }

      logger.debug(`Cleaned up ${snapshot.docs.length} expired entries`, null, 'cache');
    }
  } catch (error) {
    logger.error('Error cleaning up expired entries', error, 'cache');
  }
}

// Run cleanup periodically (every 5 minutes)
if (typeof window === 'undefined') {
  setInterval(() => cleanupExpired(), 5 * 60 * 1000);
}

// ============================================================================
// PUBLIC API
// ============================================================================

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
    const docRef = getCacheDocRef(key, options?.prefix);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      stats.misses++;
      return null;
    }

    const entry = docSnap.data() as CacheEntry<T>;

    // Check if expired
    if (new Date(entry.expires_at) < new Date()) {
      // Delete expired entry
      await deleteDoc(docRef);
      stats.misses++;
      return null;
    }

    stats.hits++;
    return entry.value;
  } catch (error) {
    logger.error('Get error', error, 'cache');
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
    const docRef = getCacheDocRef(key, options?.prefix);
    const ttl = options?.ttl || 3600;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    await setDoc(docRef, {
      key: getKey(key, options?.prefix),
      value,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      prefix: options?.prefix || 'fisioflow',
    });

    stats.sets++;
    return true;
  } catch (error) {
    logger.error('Set error', error, 'cache');
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
    const docRef = getCacheDocRef(key, options?.prefix);
    await deleteDoc(docRef);
    stats.deletes++;
    return true;
  } catch (error) {
    logger.error('Delete error', error, 'cache');
    stats.errors++;
    return false;
  }
}

/**
 * Invalidate multiple cache keys by pattern
 * Note: Firestore doesn't support pattern matching, so we query by prefix
 */
export async function invalidatePattern(
  pattern: string,
  options?: CacheOptions
): Promise<void> {
  try {
    const prefix = options?.prefix || 'fisioflow';

    // Query all cache entries with this prefix
    const q = query(
      collection(db, '_cache'),
      where('prefix', '==', prefix)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    // Filter by pattern and delete in batches
    const matchingRefs = snapshot.docs
      .filter((doc) => {
        const entry = doc.data() as CacheEntry;
        return entry.key.includes(pattern);
      })
      .map((doc) => doc.ref);

    if (matchingRefs.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < matchingRefs.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchRefs = matchingRefs.slice(i, i + batchSize);

        batchRefs.forEach((ref) => {
          batch.delete(ref);
        });

        await batch.commit();
      }
    }
  } catch (error) {
    logger.error('Invalidate pattern error', error, 'cache');
  }
}

/**
 * Cache wrapper for queries
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
    recommendations.push('High error rate detected - check Firestore connectivity');
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
    logger.error(`Smart invalidation error for ${entityType}`, error, 'cache');
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
        logger.error(`Warm-up failed for ${key}`, error, 'cache');
      }
    })
  );

  const failed = results.filter((r) => r.status === 'rejected').length;
  logger.debug(`Warm-up completed: ${results.length - failed}/${results.length} successful`, null, 'cache');
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
    keys.map(async (key) => {
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
  await Promise.all(keys.map((key) => deleteCache(key, options)));
}

// ============================================================================
// SPECIFIC CACHE HELPERS
// ============================================================================

export class PatientCache {
  private static readonly prefix = 'patient';
  private static readonly defaultTTL = 3600; // 1 hour

  static async get(patientId: string) {
    return getCache(`${this.prefix}:${patientId}`, {
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
    return getCache(`${this.prefix}:${appointmentId}`, {
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
    return getCache(`${this.prefix}:patient:${patientId}`, {
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
    return getCache(`${this.prefix}:${exerciseId}`, {
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
    return getCache(`${this.prefix}:all`, {
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
    await deleteCache(`${this.prefix}:all`, { prefix: 'fisioflow' });
    return invalidatePattern(this.prefix, { prefix: 'fisioflow' });
  }
}

export class ProtocolCache {
  private static readonly prefix = 'protocol';
  private static readonly defaultTTL = 7200; // 2 hours

  static async get(protocolId: string) {
    return getCache(`${this.prefix}:${protocolId}`, {
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
    return getCache(`${this.prefix}:all`, {
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
 * Rate limiting using Firestore
 * Note: This is a simplified version. For production, consider using a dedicated rate-limiting solution
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
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - window * 1000;

  try {
    // Get current request count
    const cached = await getCache<{ count: number; reset: number }>(key, {
      prefix: 'ratelimit',
      ttl: window,
    });

    if (cached && cached.reset > now) {
      // Check if limit exceeded
      if (cached.count >= limit) {
        return {
          success: false,
          limit,
          remaining: 0,
          reset: cached.reset,
        };
      }

      // Increment count
      await setCache(
        key,
        { count: cached.count + 1, reset: cached.reset },
        { prefix: 'ratelimit', ttl: window }
      );

      return {
        success: true,
        limit,
        remaining: limit - cached.count - 1,
        reset: cached.reset,
      };
    }

    // Create new rate limit window
    await setCache(
      key,
      { count: 1, reset: now + window * 1000 },
      { prefix: 'ratelimit', ttl: window }
    );

    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + window * 1000,
    };
  } catch (error) {
    logger.error('Rate limit error', error, 'cache');
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
 * Session storage using Firestore
 */
export class SessionCache {
  private static readonly prefix = 'session';
  private static readonly defaultTTL = 86400; // 24 hours

  static async get(sessionId: string) {
    return getCache(`${this.prefix}:${sessionId}`, {
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

/**
 * Re-export everything for backward compatibility
 * This allows switching between KV and Firestore cache by changing the import
 */
export {
  // Re-export from current KV service for migration
  getCache as kvGetCache,
  setCache as kvSetCache,
  deleteCache as kvDeleteCache,
  invalidatePattern as kvInvalidatePattern,
  cachedQuery as kvCachedQuery,
  getCacheStats as kvGetCacheStats,
  resetCacheStats as kvResetCacheStats,
  getCacheHealth as kvGetCacheHealth,
  smartInvalidate as kvSmartInvalidate,
  warmUpCache as kvWarmUpCache,
  batchGet as kvBatchGet,
  batchSet as kvBatchSet,
  batchDelete as kvBatchDelete,
  rateLimit as kvRateLimit,
  PatientCache as KVPatientCache,
  AppointmentCache as KVAppointmentCache,
  ExerciseCache as KVExerciseCache,
  ProtocolCache as KVProtocolCache,
  SessionCache as KVSessionCache,
  CACHE_TTL as KV_CACHE_TTL,
};
