/**
 * Offline Cache Manager
 * Caches data locally for offline access
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const CACHE_PREFIX = '@fisioflow_cache_';
const CACHE_METADATA_PREFIX = '@fisioflow_cache_meta_';
const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface CacheMetadata {
  key: string;
  timestamp: number;
  ttl: number;
  size: number;
  version: number;
}

export interface CacheEntry<T> {
  data: T;
  metadata: CacheMetadata;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  entriesByCollection: Record<string, number>;
}

export interface CacheOptions {
  ttl?: number;
  version?: number;
  persistToDisk?: boolean;
}

class CacheManager {
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      // Load frequently accessed data into memory
      await this.loadHotData();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize cache:', error);
    }
  }

  private async loadHotData() {
    // Load recent patients, appointments, etc.
    const hotKeys = [
      'patients_recent',
      'appointments_upcoming',
      'exercises_library',
      'user_profile',
    ];

    for (const key of hotKeys) {
      try {
        const cached = await this.get(key);
        if (cached) {
          this.memoryCache.set(key, cached);
        }
      } catch (_error) {
        // Ignore errors during preloading
      }
    }
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memEntry = this.memoryCache.get(key);
    if (memEntry && !this.isExpired(memEntry.metadata)) {
      return memEntry.data as T;
    }

    // Check disk cache
    try {
      const data = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!data) return null;

      const entry: CacheEntry<T> = JSON.parse(data);

      // Check if expired
      if (this.isExpired(entry.metadata)) {
        await this.remove(key);
        return null;
      }

      // Store in memory cache
      this.memoryCache.set(key, entry);

      return entry.data;
    } catch (error) {
      console.error(`Failed to get cache for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const metadata: CacheMetadata = {
      key,
      timestamp: Date.now(),
      ttl: options.ttl ?? DEFAULT_CACHE_TTL,
      size: JSON.stringify(data).length,
      version: options.version ?? 1,
    };

    const entry: CacheEntry<T> = { data, metadata };

    // Store in memory
    this.memoryCache.set(key, entry);

    // Persist to disk if requested
    if (options.persistToDisk !== false) {
      try {
        await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
        await AsyncStorage.setItem(
          CACHE_METADATA_PREFIX + key,
          JSON.stringify(metadata)
        );
      } catch (error) {
        console.error(`Failed to persist cache for ${key}:`, error);
        // In case of quota error, try to clear old entries
        await this.cleanupOldEntries();
      }
    }
  }

  /**
   * Remove a specific cache entry
   */
  async remove(key: string): Promise<void> {
    this.memoryCache.delete(key);
    try {
      await AsyncStorage.multiRemove([
        CACHE_PREFIX + key,
        CACHE_METADATA_PREFIX + key,
      ]);
    } catch (error) {
      console.error(`Failed to remove cache for ${key}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(
        (key) =>
          key.startsWith(CACHE_PREFIX) ||
          key.startsWith(CACHE_METADATA_PREFIX)
      );
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Clear cache for a specific collection
   */
  async clearCollection(collectionName: string): Promise<void> {
    const prefix = CACHE_PREFIX + collectionName + '_';
    const metaPrefix = CACHE_METADATA_PREFIX + collectionName + '_';

    // Clear from memory
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(collectionName + '_')) {
        this.memoryCache.delete(key);
      }
    }

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(
        (key) => key.startsWith(prefix) || key.startsWith(metaPrefix)
      );
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error(`Failed to clear collection cache for ${collectionName}:`, error);
    }
  }

  /**
   * Get or fetch pattern - tries cache first, then fetches from source
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached) {
      return cached;
    }

    // Fetch from source
    const data = await fetchFn();

    // Cache the result
    await this.set(key, data, options);

    return data;
  }

  /**
   * Cache a collection from Firestore
   */
  async cacheCollection(
    collectionName: string,
    constraints?: {
      where?: [string, unknown, unknown][];
      orderBy?: [string, 'asc' | 'desc'];
      limit?: number;
    }
  ): Promise<void> {
    try {
      let q = collection(db, collectionName);

      if (constraints) {
        const { where: whereClauses, orderBy: orderByClause, limit: limitNum } = constraints;

        if (whereClauses && whereClauses.length > 0) {
          // Build query with where clauses
          const firstWhere = whereClauses[0];
          q = query(collection(db, collectionName), where(...firstWhere));

          for (let i = 1; i < whereClauses.length; i++) {
            // Note: Firestore only supports one where clause without composite indexes
            // In production, you'd need to handle this differently
          }
        }

        if (orderByClause) {
          q = query(q, orderBy(orderByClause[0], orderByClause[1]));
        }

        if (limitNum) {
          q = query(q, limit(limitNum));
        }
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const cacheKey = this.buildCollectionKey(collectionName, constraints);
      await this.set(cacheKey, data);
    } catch (error) {
      console.error(`Failed to cache collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Cache a single document from Firestore
   */
  async cacheDocument(
    collectionName: string,
    documentId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, documentId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return;
      }

      const data = {
        id: snapshot.id,
        ...snapshot.data(),
      };

      const cacheKey = `${collectionName}_${documentId}`;
      await this.set(cacheKey, data);
    } catch (error) {
      console.error(
        `Failed to cache document ${collectionName}/${documentId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get cached collection data
   */
  async getCachedCollection<T = unknown>(
    collectionName: string,
    constraints?: {
      where?: [string, unknown, unknown][];
      orderBy?: [string, 'asc' | 'desc'];
      limit?: number;
    }
  ): Promise<T[] | null> {
    const cacheKey = this.buildCollectionKey(collectionName, constraints);
    return this.get<T[]>(cacheKey);
  }

  /**
   * Get cached document
   */
  async getCachedDocument<T = unknown>(
    collectionName: string,
    documentId: string
  ): Promise<T | null> {
    const cacheKey = `${collectionName}_${documentId}`;
    return this.get<T>(cacheKey);
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(metadata: CacheMetadata): boolean {
    return Date.now() - metadata.timestamp > metadata.ttl;
  }

  /**
   * Build cache key for collection query
   */
  private buildCollectionKey(
    collectionName: string,
    constraints?: {
      where?: [string, unknown, unknown][];
      orderBy?: [string, 'asc' | 'desc'];
      limit?: number;
    }
  ): string {
    if (!constraints) {
      return `${collectionName}_all`;
    }

    const parts = [collectionName];

    if (constraints.where) {
      constraints.where.forEach(([field, op, value]) => {
        parts.push(`${field}_${op}_${value}`);
      });
    }

    if (constraints.orderBy) {
      parts.push(`order_${constraints.orderBy[0]}_${constraints.orderBy[1]}`);
    }

    if (constraints.limit) {
      parts.push(`limit_${constraints.limit}`);
    }

    return parts.join('_');
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((key) => key.startsWith(CACHE_PREFIX));

    const stats: CacheStats = {
      totalEntries: cacheKeys.length,
      totalSize: 0,
      oldestEntry: null,
      newestEntry: null,
      entriesByCollection: {},
    };

    const timestamps: number[] = [];

    for (const key of cacheKeys) {
      try {
        const metaKey = CACHE_METADATA_PREFIX + key.replace(CACHE_PREFIX, '');
        const metaStr = await AsyncStorage.getItem(metaKey);

        if (metaStr) {
          const meta: CacheMetadata = JSON.parse(metaStr);
          stats.totalSize += meta.size;
          timestamps.push(meta.timestamp);

          const collection = key.split('_')[1];
          stats.entriesByCollection[collection] =
            (stats.entriesByCollection[collection] || 0) + 1;
        }
      } catch (_error) {
        // Ignore metadata read errors
      }
    }

    if (timestamps.length > 0) {
      stats.oldestEntry = Math.min(...timestamps);
      stats.newestEntry = Math.max(...timestamps);
    }

    return stats;
  }

  /**
   * Cleanup old/invalid cache entries
   */
  async cleanupOldEntries(olderThan?: number): Promise<void> {
    const cutoffTime = olderThan ?? Date.now() - DEFAULT_CACHE_TTL;

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const metaKeys = allKeys.filter((key) =>
        key.startsWith(CACHE_METADATA_PREFIX)
      );

      const keysToDelete: string[] = [];

      for (const metaKey of metaKeys) {
        try {
          const metaStr = await AsyncStorage.getItem(metaKey);
          if (!metaStr) continue;

          const meta: CacheMetadata = JSON.parse(metaStr);

          if (meta.timestamp < cutoffTime) {
            const dataKey = CACHE_PREFIX + meta.key;
            keysToDelete.push(dataKey, metaKey);
          }
        } catch (_error) {
          // Invalid metadata - remove both
          const dataKey = metaKey.replace(CACHE_METADATA_PREFIX, CACHE_PREFIX);
          keysToDelete.push(dataKey, metaKey);
        }
      }

      if (keysToDelete.length > 0) {
        await AsyncStorage.multiRemove(keysToDelete);
      }
    } catch (error) {
      console.error('Failed to cleanup old cache entries:', error);
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const matchingKeys = allKeys.filter((key) => {
      const plainKey = key.replace(CACHE_PREFIX, '').replace(CACHE_METADATA_PREFIX, '');
      return plainKey.includes(pattern);
    });

    if (matchingKeys.length > 0) {
      await AsyncStorage.multiRemove(matchingKeys);

      // Also clear from memory
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern)) {
          this.memoryCache.delete(key);
        }
      }
    }
  }

  /**
   * Warm up cache with essential data
   */
  async warmup(userId: string): Promise<void> {
    const essentialData = [
      // User profile
      this.cacheDocument('users', userId),

      // Recent patients
      this.cacheCollection('patients', {
        orderBy: ['updatedAt', 'desc'],
        limit: 50,
      }),

      // Upcoming appointments
      // Note: This would need a proper query for future appointments

      // Exercise library (rarely changes)
      this.cacheCollection('exercises'),
    ];

    await Promise.allSettled(essentialData);
  }
}

// Singleton instance
let cacheManagerInstance: CacheManager | null = null;

export async function getCacheManager(): Promise<CacheManager> {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager();
    await cacheManagerInstance.initialize();
  }
  return cacheManagerInstance;
}

export function destroyCacheManager() {
  cacheManagerInstance = null;
}
