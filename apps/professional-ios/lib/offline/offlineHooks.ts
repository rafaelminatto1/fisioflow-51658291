/**
 * Offline-aware data hooks
 * Wraps data hooks with offline caching and sync functionality
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSyncManager, SyncStatus } from './syncManager';
import { getCacheManager } from './cacheManager';

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Re-export types
export type { SyncStatus, SyncOperation } from './syncManager';
export type { CacheMetadata, CacheStats } from './cacheManager';

/**
 * Hook for sync status
 */
export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(() => getSyncManager().getStatus());

  useEffect(() => {
    const unsubscribe = getSyncManager().subscribe((newStatus) => {
      setStatus(newStatus);
    });

    return () => unsubscribe();
  }, []);

  return status;
}

/**
 * Hook for forcing sync
 */
export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const success = await getSyncManager().forceSync();
      if (!success) {
        throw new Error('Sync completed with errors');
      }
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return { sync, isSyncing, error };
}

/**
 * Offline-aware document hook
 */
export function useOfflineDoc<T>(
  collectionName: string,
  documentId: string | undefined,
  options?: {
    enabled?: boolean;
    ttl?: number;
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!documentId || options?.enabled === false) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const cacheKey = `${collectionName}_${documentId}`;

    setLoading(true);
    setIsFromCache(false);

    // Try cache first
    getCacheManager().then(async (cache) => {
      const cached = await cache.get<T>(cacheKey);
      if (cached && !cancelled) {
        setData(cached);
        setIsFromCache(true);
        setLoading(false);
      }

      // Then fetch from Firestore
      try {
        const docRef = doc(db, collectionName, documentId);

        unsubscribeRef.current = onSnapshot(
          docRef,
          (snapshot) => {
            if (cancelled) return;

            if (snapshot.exists()) {
              const docData = {
                id: snapshot.id,
                ...snapshot.data(),
              } as T;

              setData(docData);
              setIsFromCache(false);
              setLoading(false);

              // Update cache
              cache.set(cacheKey, docData, { ttl: options?.ttl });
            } else {
              setData(null);
              setLoading(false);
            }
          },
          (err) => {
            if (cancelled) return;
            setError(err as Error);
            setLoading(false);
          }
        );
      } catch (err) {
        if (cancelled) return;
        setError(err as Error);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [collectionName, documentId, options?.enabled, options?.ttl]);

  return { data, loading, error, isFromCache };
}

/**
 * Offline-aware collection hook
 */
export function useOfflineCollection<T>(
  collectionName: string,
  constraints?: {
    where?: [string, any, any];
    orderBy?: [string, 'asc' | 'desc'];
    limit?: number;
  },
  options?: {
    enabled?: boolean;
    ttl?: number;
  }
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (options?.enabled === false) {
      setData([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Build cache key
    const cacheParts = [collectionName];
    if (constraints?.where) {
      cacheParts.push(`${constraints.where[0]}_${constraints.where[2]}`);
    }
    if (constraints?.orderBy) {
      cacheParts.push(`order_${constraints.orderBy[0]}`);
    }
    const cacheKey = cacheParts.join('_');

    setLoading(true);
    setIsFromCache(false);

    // Try cache first
    getCacheManager().then(async (cache) => {
      const cached = await cache.get<T[]>(cacheKey);
      if (cached && !cancelled) {
        setData(cached);
        setIsFromCache(true);
        setLoading(false);
      }

      // Then fetch from Firestore
      try {
        let q = collection(db, collectionName);

        if (constraints?.where) {
          q = query(q, where(...constraints.where));
        }
        if (constraints?.orderBy) {
          q = query(q, orderBy(...constraints.orderBy));
        }
        if (constraints?.limit) {
          q = query(q, limit(constraints.limit));
        }

        unsubscribeRef.current = onSnapshot(
          q,
          (snapshot) => {
            if (cancelled) return;

            const collectionData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as T[];

            setData(collectionData);
            setIsFromCache(false);
            setLoading(false);

            // Update cache
            cache.set(cacheKey, collectionData, { ttl: options?.ttl });
          },
          (err) => {
            if (cancelled) return;
            setError(err as Error);
            setLoading(false);
          }
        );
      } catch (err) {
        if (cancelled) return;
        setError(err as Error);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [collectionName, constraints?.where?.[2], constraints?.orderBy?.[0], constraints?.limit, options?.enabled, options?.ttl]);

  return { data, loading, error, isFromCache };
}

/**
 * Offline-aware mutations
 */
export function useOfflineMutations(collectionName: string) {
  const [isPending, setIsPending] = useState(false);

  const create = useCallback(
    async (data: any, options?: { queueOffline?: boolean; priority?: 'high' | 'normal' | 'low' }) => {
      setIsPending(true);

      try {
        const syncManager = getSyncManager();

        // Add timestamp and metadata
        const documentData = {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (options?.queueOffline !== false) {
          // Queue for sync
          await syncManager.queueOperation(
            collectionName,
            'create',
            documentData,
            undefined,
            options?.priority
          );

          // Return optimistic ID
          return {
            id: `pending_${Date.now()}`,
            ...data,
            _pending: true,
          };
        } else {
          // Write directly to Firestore
          const docRef = await addDoc(collection(db, collectionName), documentData);
          return { id: docRef.id, ...data };
        }
      } finally {
        setIsPending(false);
      }
    },
    [collectionName]
  );

  const update = useCallback(
    async (documentId: string, data: any, options?: { queueOffline?: boolean; priority?: 'high' | 'normal' | 'low' }) => {
      setIsPending(true);

      try {
        const syncManager = getSyncManager();

        const documentData = {
          ...data,
          updatedAt: serverTimestamp(),
        };

        if (options?.queueOffline !== false) {
          // Queue for sync
          await syncManager.queueOperation(
            collectionName,
            'update',
            documentData,
            documentId,
            options?.priority
          );

          // Update cache optimistically
          const cache = await getCacheManager();
          const cacheKey = `${collectionName}_${documentId}`;
          const existing = await cache.get(cacheKey);
          if (existing) {
            await cache.set(cacheKey, { ...existing, ...data });
          }

          return true;
        } else {
          // Write directly to Firestore
          await updateDoc(doc(db, collectionName, documentId), documentData);
          return true;
        }
      } finally {
        setIsPending(false);
      }
    },
    [collectionName]
  );

  const remove = useCallback(
    async (documentId: string, options?: { queueOffline?: boolean; priority?: 'high' | 'normal' | 'low' }) => {
      setIsPending(true);

      try {
        const syncManager = getSyncManager();

        if (options?.queueOffline !== false) {
          // Queue for sync
          await syncManager.queueOperation(
            collectionName,
            'delete',
            {},
            documentId,
            options?.priority
          );

          // Remove from cache optimistically
          const cache = await getCacheManager();
          await cache.remove(`${collectionName}_${documentId}`);

          return true;
        } else {
          // Delete directly from Firestore
          await deleteDoc(doc(db, collectionName, documentId));
          return true;
        }
      } finally {
        setIsPending(false);
      }
    },
    [collectionName]
  );

  return { create, update, remove, isPending };
}

/**
 * Hook for cache statistics
 */
export function useCacheStats() {
  const [stats, setStats] = useState<{
    totalEntries: number;
    totalSize: number;
    entriesByCollection: Record<string, number>;
  }>({
    totalEntries: 0,
    totalSize: 0,
    entriesByCollection: {},
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const cache = await getCacheManager();
      const cacheStats = await cache.getStats();
      setStats(cacheStats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const clearCache = useCallback(async (pattern?: string) => {
    const cache = await getCacheManager();
    if (pattern) {
      await cache.invalidatePattern(pattern);
    } else {
      await cache.clear();
    }
    await refresh();
  }, [refresh]);

  return { ...stats, loading, refresh, clearCache };
}

/**
 * Hook for offline data warming
 */
export function useWarmupCache() {
  const [isWarming, setIsWarming] = useState(false);

  const warmup = useCallback(async (userId: string) => {
    setIsWarming(true);
    try {
      const cache = await getCacheManager();
      await cache.warmup(userId);
    } finally {
      setIsWarming(false);
    }
  }, []);

  return { warmup, isWarming };
}
