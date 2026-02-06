/**
 * Firebase Realtime Database Cache Service
 *
 * Distributed caching layer using Firebase Realtime Database
 * Replaces Vercel KV with Google Firebase solution
 *
 * @version 3.0.0 - Migrated to Firebase Realtime Database
 */

import { getDatabase, ref, set, get, remove, child } from 'firebase/database';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { firebaseApp } from '@/integrations/firebase/app';

const db = getDatabase(firebaseApp);

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
    const cacheRef = ref(db, fullKey);
    const snapshot = await get(cacheRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      // Check if TTL has expired
      if (data && data._expires && Date.now() > data._expires) {
        await remove(cacheRef);
        stats.misses++;
        return null;
      }
      stats.hits++;
      return data.value;
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
 * Set a value in cache with TTL
 */
export async function setCache<T>(
  key: string,
  value: T,
  options?: CacheOptions
): Promise<boolean> {
  try {
    const fullKey = getKey(key, options?.prefix);
    const ttl = options?.ttl || CACHE_TTL.DEFAULT;
    const cacheRef = ref(db, fullKey);

    const dataToStore = {
      value,
      _expires: Date.now() + (ttl * 1000),
      _created: Date.now(),
    };

    await set(cacheRef, dataToStore);
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
    const cacheRef = ref(db, fullKey);
    await remove(cacheRef);
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
 * Note: Firebase Realtime Database doesn't support pattern matching natively
 */
export async function invalidatePattern(
  pattern: string,
  options?: CacheOptions
): Promise<void> {
  try {
    const prefix = getKey('', options?.prefix);
    const cacheRef = ref(db, prefix);

    // Get all keys at this prefix level
    const snapshot = await get(cacheRef);
    if (snapshot.exists()) {
      const keys = Object.keys(snapshot.val() || {});

      for (const key of keys) {
        if (key.includes(pattern)) {
          await remove(child(cacheRef, key));
        }
      }
    }
  } catch (error) {
    logger.error(`Cache invalidate pattern error for ${pattern}`, error, 'KVCacheService');
  }
}

/**
 * Check cache health
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  stats: CacheStats;
  message: string;
}> {
  try {
    const cacheRef = ref(db, getKey('_health'));
    await set(cacheRef, { timestamp: Date.now() });
    return {
      healthy: true,
      stats: getCacheStats(),
      message: 'Firebase Realtime Database cache is healthy',
    };
  } catch (error) {
    return {
      healthy: false,
      stats: getCacheStats(),
      message: error instanceof Error ? error.message : 'Cache health check failed',
    };
  }
}

/**
 * Warm up cache with multiple keys
 */
export async function warmUpCache(
  keys: string[],
  dataProvider: (key: string) => Promise<unknown>,
  options?: CacheOptions
): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(
    keys.map(async (key) => {
      try {
        const cachedValue = await getCache(key, options);
        if (cachedValue !== null) {
          return { status: 'fulfilled' as const, key };
        }

        const data = await dataProvider(key);
        if (data !== null) {
          await setCache(key, data, options);
          return { status: 'fulfilled' as const, key };
        }

        return { status: 'rejected' as const, key };
      } catch (error) {
        logger.error(`Cache warm-up failed for ${key}`, error, 'KVCacheService');
        return { status: 'rejected' as const, key };
      }
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  logger.info(
    `Cache warm-up completed: ${successful}/${results.length} successful`,
    { successful, failed },
    'KVCacheService'
  );

  return { success: successful, failed };
}

// ==============================================================================
// RATE LIMITING (using Firebase instead of Vercel KV)
// ==============================================================================

interface RateLimitInfo {
  count: number;
  reset: number; // timestamp when count resets
}

export interface RateLimitConfig {
  limit: number;
  window: number; // in seconds
  prefix?: string;
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const key = getKey(`ratelimit:${identifier}`, config.prefix || 'fisioflow');
  const now = Date.now();
  const _windowStart = now - config.window * 1000;

  const cacheRef = ref(db, key);
  const snapshot = await get(cacheRef);

  let info: RateLimitInfo;

  if (snapshot.exists()) {
    const data = snapshot.val() as RateLimitInfo;
    if (data.reset > now) {
      // Still within current window
      info = data;
    } else {
      // Window expired, reset
      info = { count: 0, reset: now + config.window * 1000 };
    }
  } else {
    info = { count: 0, reset: now + config.window * 1000 };
  }

  if (info.count < config.limit) {
    info.count++;
    await set(cacheRef, info);
    return {
      allowed: true,
      remaining: config.limit - info.count,
      reset: info.reset,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    reset: info.reset,
  };
}

// ==============================================================================
// SESSION STORAGE (using Firebase instead of Vercel KV)
// ==============================================================================

export interface SessionData {
  userId: string;
  data: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  try {
    const sessionRef = ref(db, getKey(`session:${sessionId}`));
    const snapshot = await get(sessionRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      // Check session expiration (24 hours default)
      if (Date.now() - data.updatedAt > 86400000) {
        await remove(sessionRef);
        return null;
      }
      return data;
    }

    return null;
  } catch (error) {
    logger.error('Session get error', error, 'KVCacheService');
    return null;
  }
}

export async function setSession(
  sessionId: string,
  userId: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const sessionRef = ref(db, getKey(`session:${sessionId}`));
    const sessionData: SessionData = {
      userId,
      data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await set(sessionRef, sessionData);
    logger.info('Session created', { sessionId, userId }, 'KVCacheService');
  } catch (error) {
    logger.error('Session set error', error, 'KVCacheService');
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const sessionRef = ref(db, getKey(`session:${sessionId}`));
    await remove(sessionRef);
    logger.info('Session deleted', { sessionId }, 'KVCacheService');
  } catch (error) {
    logger.error('Session delete error', error, 'KVCacheService');
  }
}

// ==============================================================================
// SPECIALIZED CACHES (Patient, Appointment, etc.)
// ==============================================================================

export interface PatientCacheEntry {
  data: unknown;
  lastModified: number;
  source: 'server' | 'local';
}

/**
 * Patient-specific cache with smart invalidation
 */
export const PatientCache = {
  async get(patientId: string): Promise<PatientCacheEntry | null> {
    return getCache<PatientCacheEntry>(`patient:${patientId}`, { ttl: CACHE_TTL.LONG });
  },

  async set(patientId: string, data: unknown): Promise<boolean> {
    return setCache(`patient:${patientId}`, {
      data,
      lastModified: Date.now(),
      source: 'server',
    }, { ttl: CACHE_TTL.LONG });
  },

  async invalidate(patientId: string): Promise<void> {
    await deleteCache(`patient:${patientId}`);
  },

  async invalidatePattern(pattern: string): Promise<void> {
    await invalidatePattern(`patient:${pattern}`);
  },
};

/**
 * Appointment-specific cache with time-based invalidation
 */
export const AppointmentCache = {
  async get(appointmentId: string): Promise<PatientCacheEntry | null> {
    return getCache<PatientCacheEntry>(`appointment:${appointmentId}`, { ttl: CACHE_TTL.MEDIUM });
  },

  async set(appointmentId: string, data: unknown): Promise<boolean> {
    return setCache(`appointment:${appointmentId}`, {
      data,
      lastModified: Date.now(),
      source: 'server',
    }, { ttl: CACHE_TTL.MEDIUM });
  },

  async invalidate(appointmentId: string): Promise<void> {
    await deleteCache(`appointment:${appointmentId}`);
  },
};

// ==============================================================================
// BATCH OPERATIONS
// ==============================================================================

export async function getMultiple<T>(
  keys: string[],
  options?: CacheOptions
): Promise<Map<string, T>> {
  const results = await Promise.all(
    keys.map(async (key) => {
      const value = await getCache<T>(key, options);
      return { key, value };
    })
  );

  const map = new Map<string, T>();
  for (const { key, value } of results) {
    if (value !== null) {
      map.set(key, value);
    }
  }

  return map;
}

export async function setMultiple<T>(
  entries: Record<string, T>,
  options?: CacheOptions
): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(
    Object.entries(entries).map(([key, value]) =>
      setCache(key, value, options)
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return { success: successful, failed };
}

/**
 * Invalidate all patient-related cache entries
 */
export async function invalidatePatientCache(patientId: string): Promise<void> {
  await invalidatePattern(`patient:${patientId}*`);
  await invalidatePattern(`appointment:*${patientId}*`);
}

/**
 * Clear all cache (use with caution!)
 */
export async function clearAllCache(prefix?: string): Promise<void> {
  try {
    const cacheRef = ref(db, getKey('', prefix));
    await remove(cacheRef);
    resetCacheStats();
    logger.info('All cache cleared', { prefix }, 'KVCacheService');
  } catch (error) {
    logger.error('Clear cache error', error, 'KVCacheService');
  }
}

// Export common cache functions
export const cache = {
  get: getCache,
  set: setCache,
  delete: deleteCache,
  invalidate: invalidatePattern,
  stats: getCacheStats,
  health: healthCheck,
};

// Export specialized caches
export { PatientCache, AppointmentCache };
