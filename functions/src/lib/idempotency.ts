/**
 * Idempotency Cache Helper for AI Functions
 *
 * Prevents duplicate AI requests and implements caching for cost optimization
 *
 * @module lib/idempotency
 */

import { getFirestore } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

const CACHE_COLLECTION = 'ai_idempotency_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export interface CachedResult<T = any> {
  result: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Generate a cache key from request parameters
 */
export function generateCacheKey(
  feature: string,
  userId: string,
  params: Record<string, any>
): string {
  // Create a deterministic key from the parameters
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  const paramsStr = JSON.stringify(sortedParams);
  return `${feature}_${userId}_${Buffer.from(paramsStr).toString('base64').substring(0, 50)}`;
}

/**
 * Get cached result for a request
 */
export async function getCachedResult<T>(
  cacheKey: string
): Promise<CachedResult<T> | null> {
  try {
    const db = getFirestore();
    const doc = await db.collection(CACHE_COLLECTION).doc(cacheKey).get();

    if (!doc.exists) {
      return null;
    }

    const cached = doc.data() as CachedResult<T>;

    // Check if cache is still valid
    if (Date.now() > cached.expiresAt) {
      // Cache expired, delete it
      await doc.ref.delete();
      return null;
    }

    logger.info(`[Idempotency] Cache hit for key: ${cacheKey}`);
    return cached;
  } catch (error) {
    logger.error('[Idempotency] Error getting cached result:', error);
    return null;
  }
}

/**
 * Set cached result for a request
 */
export async function setCachedResult<T>(
  cacheKey: string,
  result: T,
  ttlMs: number = CACHE_TTL_MS
): Promise<void> {
  try {
    const db = getFirestore();
    const now = Date.now();

    await db.collection(CACHE_COLLECTION).doc(cacheKey).set({
      result,
      timestamp: now,
      expiresAt: now + ttlMs,
    });

    logger.info(`[Idempotency] Cached result for key: ${cacheKey}`);
  } catch (error) {
    logger.error('[Idempotency] Error setting cached result:', error);
    // Don't throw - caching failure shouldn't break the main flow
  }
}

/**
 * Check if a request is in progress (prevent duplicate simultaneous requests)
 */
export async function acquireLock(
  cacheKey: string,
  lockTimeoutMs: number = 60000 // 1 minute lock
): Promise<boolean> {
  try {
    const db = getFirestore();
    const lockRef = db.collection(CACHE_COLLECTION).doc(`lock_${cacheKey}`);
    const now = Date.now();

    // Use transaction to ensure atomicity
    const result = await db.runTransaction(async (transaction) => {
      const lockDoc = await transaction.get(lockRef);

      if (lockDoc.exists) {
        const lock = lockDoc.data();
        // Check if lock expired
        if (lock && lock.expiresAt > now) {
          return false; // Lock still held
        }
      }

      // Acquire lock
      transaction.set(lockRef, {
        locked: true,
        acquiredAt: now,
        expiresAt: now + lockTimeoutMs,
      });

      return true;
    });

    if (result) {
      logger.info(`[Idempotency] Lock acquired for key: ${cacheKey}`);
    }

    return result;
  } catch (error) {
    logger.error('[Idempotency] Error acquiring lock:', error);
    return false;
  }
}

/**
 * Release a lock
 */
export async function releaseLock(cacheKey: string): Promise<void> {
  try {
    const db = getFirestore();
    await db.collection(CACHE_COLLECTION).doc(`lock_${cacheKey}`).delete();
    logger.info(`[Idempotency] Lock released for key: ${cacheKey}`);
  } catch (error) {
    logger.error('[Idempotency] Error releasing lock:', error);
  }
}

/**
 * Wrapper for AI functions with idempotency and caching
 */
export async function withIdempotency<T>(
  feature: string,
  userId: string,
  params: Record<string, any>,
  fn: () => Promise<T>,
  options?: {
    cacheTtl?: number;
    lockTimeout?: number;
    skipCache?: boolean;
  }
): Promise<T> {
  const cacheKey = generateCacheKey(feature, userId, params);

  // Check cache first (unless disabled)
  if (!options?.skipCache) {
    const cached = await getCachedResult<T>(cacheKey);
    if (cached) {
      return cached.result;
    }
  }

  // Try to acquire lock
  const lockAcquired = await acquireLock(cacheKey, options?.lockTimeout);

  if (!lockAcquired) {
    // Lock held, wait and check cache again
    await sleep(500);
    const cached = await getCachedResult<T>(cacheKey);
    if (cached) {
      return cached.result;
    }

    // Still no cache and lock held - throw or wait
    throw new Error('Request already in progress. Please try again in a moment.');
  }

  try {
    // Execute the function
    const result = await fn();

    // Cache the result
    await setCachedResult(cacheKey, result, options?.cacheTtl);

    return result;
  } finally {
    // Always release the lock
    await releaseLock(cacheKey);
  }
}

/**
 * Clean up expired cache entries (call via scheduled function)
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const db = getFirestore();
    const now = Date.now();

    // Find and delete expired entries
    const snapshot = await db
      .collection(CACHE_COLLECTION)
      .where('expiresAt', '<', now)
      .limit(500)
      .get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    logger.info(`[Idempotency] Cleaned up ${snapshot.size} expired cache entries`);

    return snapshot.size;
  } catch (error) {
    logger.error('[Idempotency] Error cleaning up cache:', error);
    return 0;
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
