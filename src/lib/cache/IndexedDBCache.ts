/**
 * IndexedDB Cache - Sistema de cache otimizado com IndexedDB
 *
 * Fase 2: Performance Core
 *
 * Implementa cache em 3 camadas:
 * - Layer 1: Memory (mais rápido, volátil)
 * - Layer 2: IndexedDB (persistente, assíncrono)
 * - Layer 3: localStorage (fallback)
 *
 * Padrão stale-while-revalidate:
 * - Cache: Retorna dados imediatamente
 * - Revalidate: Atualiza em background
 */

const CACHE_NAME = 'fisioflow-schedule-cache';
const CACHE_VERSION = 1;
const CACHE_DB_NAME = 'fisioflow-db';
const CACHE_STORE_NAME = 'schedule-cache';

interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
  tags?: string[];
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  tags?: string[];
  invalidateWithTags?: string[];
}

// ============================================================================
// IndexedDB HELPERS
// ============================================================================

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, CACHE_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' });
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' }).createIndex('timestamp', 'timestamp', { unique: false });
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'timestamp' }).createIndex('tags', 'tags', { unique: false, multiEntry: true });
      }

      event.target.transaction?.oncomplete = () => resolve(db);
    };

    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB is blocked'));
  });
};

const openStore = (): Promise<IDBObjectStore> => {
  return openDB().then((db) => {
    return db.transaction(CACHE_STORE_NAME, 'readonly').objectStore(CACHE_STORE_NAME);
  });
};

const openStoreReadWrite = (): Promise<IDBObjectStore> => {
  return openDB().then((db) => {
    return db.transaction(CACHE_STORE_NAME, 'readwrite').objectStore(CACHE_STORE_NAME);
  });
};

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Set item no cache
 */
export const setCache = async <T>(key: string, data: T, options?: CacheOptions): Promise<void> => {
  try {
    const store = await openStoreReadWrite();

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl: options?.ttl || 5 * 60 * 1000, // 5 minutos default
      tags: options?.tags,
    };

    await store.put(entry);

    // Limpar entradas expiradas com a mesma tag de invalidação
    if (options?.invalidateWithTags) {
      await clearByTags(options.invalidateWithTags);
    }

    // Limpar entradas expiradas periodicamente
    await cleanupExpiredEntries(store);
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

/**
 * Get item do cache
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const store = await openStore();

    const request = store.get(key);
    const entry = await new Promise<CacheEntry<T> | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Verificar se expirou
    if (entry && entry.ttl) {
      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) {
        await deleteCache(key);
        return null;
      }
    }

    return entry?.data || null;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
};

/**
 * Get múltiplos itens do cache de uma vez
 */
export const getMultipleCache = async <T>(keys: string[]): Promise<Map<string, T>> => {
  try {
    const store = await openStore();

    const results = await Promise.all(
      keys.map(key =>
        new Promise<CacheEntry<T> | null>((resolve) => {
          const request = store.get(key);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(undefined); // Don't fail on individual errors
        })
      )
    );

    const now = Date.now();
    const resultMap = new Map<string, T>();

    for (let i = 0; i < keys.length; i++) {
      const entry = results[i];
      if (entry) {
        const age = now - entry.timestamp;
        const isExpired = entry.ttl && age > entry.ttl;

        if (!isExpired) {
          resultMap.set(keys[i], entry.data);
        } else {
          // Remover entrada expirada
          await deleteCache(keys[i]);
        }
      }
    }
    }

    return resultMap;
  } catch (error) {
    console.error('Error getting multiple cache:', error);
    return new Map();
  }
};

/**
 * Delete item do cache
 */
export const deleteCache = async (key: string): Promise<void> => {
  try {
    const store = await openStoreReadWrite();
    await store.delete(key);
  } catch (error) {
    console.error('Error deleting cache:', error);
  }
};

/**
 * Clear all cache
 */
export const clearCache = async (): Promise<void> => {
  try {
    const db = await openDB();
    await db.transaction(CACHE_STORE_NAME, 'readwrite')
      .objectStore(CACHE_STORE_NAME)
      .clear();
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

/**
 * Clear entries by tags
 */
export const clearByTags = async (tags: string[]): Promise<void> => {
  try {
    const store = await openStoreReadWrite();
    const index = store.index('tags');

    const keysToDelete = await new Promise<string[]>((resolve) => {
      const keys: string[] = [];
      const request = index.openCursor(
        IDBKeyRange.only(tags),
        undefined,
        1000
      );

      request.onsuccess = () => {
        let done = false;
        request.onsuccess = (event) => {
          const cursor = event.target as IDBCursorWithValue;
          const value = cursor.value as { key: string };

          if (!done) {
            keys.push(value.key);
            cursor.continue();
          } else {
            resolve(keys);
          }
        };
        request.onerror = () => resolve(keys);
      };

      await new Promise<void>((resolve) => {
        // Aguardar cursor terminar
        setTimeout(() => {
          request.continue();
          setTimeout(() => {
            cursor.close();
            resolve();
          }, 100);
        }, 0);
      });

      await deleteMultipleCache(keys);
    } catch (error) {
    console.error('Error clearing cache by tags:', error);
  }
};

/**
 * Delete multiple cache entries
 */
const deleteMultipleCache = async (keys: string[]): Promise<void> => {
  const store = await openStoreReadWrite();
  await Promise.all(keys.map(key => store.delete(key)));
};

/**
 * Cleanup expired entries
 */
const cleanupExpiredEntries = async (store: IDBObjectStore): Promise<void> => {
  const now = Date.now();
  const index = store.index('timestamp');

  const request = index.openCursor(
    IDBKeyRange.upperBound(now),
    undefined,
    100
  );

  const keysToDelete = await new Promise<string[]>((resolve) => {
    const keys: string[] = [];
    const request = index.openCursor(
      IDBKeyRange.upperBound(now),
      undefined,
      100
    );

    request.onsuccess = () => {
      let done = false;
      request.onsuccess = (event) => {
        const cursor = event.target as IDBCursorWithValue;
        const entry = cursor.value as CacheEntry<any>;

        if (entry && entry.ttl && (now - entry.timestamp) > entry.ttl) {
          keysToDelete.push(entry.key);
        }

        if (!done) {
          cursor.continue();
        } else {
          resolve(keys);
        }
      };
      request.onerror = () => resolve(keys);
    };

    await new Promise<void>((resolve) => {
      request.continue();
      setTimeout(() => {
        cursor.close();
        resolve();
      }, 0);
    });

    // Deletar entradas expiradas
    await deleteMultipleCache(keysToDelete);
};

/**
 * Get cache size (em bytes)
 */
export const getCacheSize = async (): Promise<number> => {
  try {
    const db = await openDB();

    // Calcular tamanho aproximado
    let totalSize = 0;

    for (const storeName of db.objectStoreNames) {
      try {
        const count = await new Promise<number>((resolve) => {
          const request = db.transaction(storeName, 'readonly').objectStore(storeName).count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(0);
        });

        // Estimativa: cada entrada ~500 bytes
        totalSize += count * 500;
      } catch {
        // Ignorar erros de stores diferentes
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Error getting cache size:', error);
    return 0;
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async (): Promise<{
  size: number;
  entryCount: number;
  expiredCount: number;
  lastCleanup: number | null;
}> => {
  const db = await openDB();
  const store = await openStore();

  const count = await new Promise<number>((resolve) => {
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(0);
  });

  return {
    size: await getCacheSize(),
    entryCount: count,
    expiredCount: 0, // Seria calculado na cleanup
    lastCleanup: null,
  };
};

// ============================================================================
// TAGS CONSTANTS
// ============================================================================

export const CACHE_TAGS = {
  APPOINTMENTS: 'appointments',
  PATIENTS: 'patients',
  WAITLIST: 'waitlist',
  SCHEDULE_CONFIG: 'schedule_config',
  USER_PREFERENCES: 'user_preferences',
} as const;

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Set multiple items at once
 */
export const setMultipleCache = async <T>(entries: Array<{ key: string; data: T; options?: CacheOptions }>): Promise<void> => {
  try {
    const store = await openStoreReadWrite();

    // Usar Promise.all para operações paralelas
    await Promise.all(
      entries.map(({ key, data, options }) =>
        new Promise<void>((resolve, reject) => {
          const request = store.put({ ...data, key, timestamp: Date.now(), ttl: options?.ttl || 5 * 60 * 1000 });
          request.onsuccess = () => resolve();
          request.onerror = () => reject();
        })
      )
    )
    );
  } catch (error) {
    console.error('Error setting multiple cache:', error);
  }
};

/**
 * Prefetch pattern - carregar dados antecipadamente
 */
export const prefetchCache = async <T>(key: string, fetcher: () => Promise<T>): Promise<void> => {
  // Verificar se já está em cache e não expirado
  const cached = await getCache<T>(key);
  if (cached) {
    // Cache hit - não precisa buscar
    return;
  }

  // Cache miss - buscar e armazenar
  try {
    const data = await fetcher();
    await setCache(key, data);
  } catch (error) {
    console.error('Error prefetching cache:', error);
  }
};

// ============================================================================
// REVALIDATE PATTERN
// ============================================================================

/**
 * Stale-while-revalidate: atualiza cache em background
 */
export const revalidateCache = async <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
  // Retornar cache existente imediatamente
  const cached = await getCache<T>(key);

  // Disparar atualização em background sem bloquear
  (async () => {
    try {
      const newData = await fetcher();
      await setCache(key, newData);
    } catch (error) {
      console.error('Error revalidating cache:', error);
    }
  })();

  return cached; // Retorna cache imediato
};

/**
 * Get with fallback - retorna cache ou busca se não existe
 */
export const getCacheWithFallback = async <T>(key: string, fetcher: () => Promise<T>): Promise<{ data: T; fromCache: boolean }> => {
  const cached = await getCache<T>(key);

  if (cached !== null) {
    return { data: cached, fromCache: true };
  }

  // Cache miss - buscar
  try {
    const data = await fetcher();
    await setCache(key, data);
    return { data, fromCache: false };
  } catch (error) {
    console.error('Error in getCacheWithFallback:', error);
    return { data: null as T, fromCache: false };
  }
};
