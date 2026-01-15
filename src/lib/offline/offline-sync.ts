/**
 * Biblioteca de sincronização offline para PWA
 * @module lib/offline/offline-sync
 */

import { supabase } from '@/integrations/supabase/client';

// =====================================================================
// TYPES
// =====================================================================

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface SyncQueue {
  pending: SyncOperation[];
  processing: boolean;
  lastSync: number | null;
}

export interface OfflineStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

// =====================================================================
// INDEXEDDB STORAGE
// =====================================================================

class IndexedDBStorage implements OfflineStorage {
  private dbName = 'fisioflow-offline';
  private storeName = 'cache';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async get<T>(key: string): Promise<T | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(value, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async remove(key: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// =====================================================================
// SYNC QUEUE
// =====================================================================

class SyncQueueManager {
  private storage: OfflineStorage;
  private queue: SyncQueue = {
    pending: [],
    processing: false,
    lastSync: null,
  };

  constructor(storage: OfflineStorage) {
    this.storage = storage;
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<SyncQueue>('sync-queue');
    if (saved) {
      this.queue = saved;
    }
  }

  async add(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const syncOp: SyncOperation = {
      ...operation,
      id: `${operation.type}-${operation.table}-${Date.now()}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.pending.push(syncOp);
    await this.save();
  }

  async remove(id: string): Promise<void> {
    this.queue.pending = this.queue.pending.filter(op => op.id !== id);
    await this.save();
  }

  async getPending(): Promise<SyncOperation[]> {
    return this.queue.pending;
  }

  async markProcessing(processing: boolean): Promise<void> {
    this.queue.processing = processing;
    await this.save();
  }

  async updateLastSync(): Promise<void> {
    this.queue.lastSync = Date.now();
    await this.save();
  }

  private async save(): Promise<void> {
    await this.storage.set('sync-queue', this.queue);
  }
}

// =====================================================================
// OFFLINE CACHE MANAGER
// =====================================================================

export class OfflineCacheManager {
  private storage: OfflineStorage;
  private syncQueue: SyncQueueManager;
  private syncInProgress = false;

  constructor() {
    this.storage = new IndexedDBStorage();
    this.syncQueue = new SyncQueueManager(this.storage);
  }

  async init(): Promise<void> {
    await this.storage.init();
    await this.syncQueue.init();
  }

  /**
   * Cache data for offline use
   */
  async cacheData(key: string, data: any, ttl?: number): Promise<void> {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || 5 * 60 * 1000, // Default 5 minutes
    };

    await this.storage.set(`cache-${key}`, cacheEntry);
  }

  /**
   * Get cached data if still valid
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    const entry = await this.storage.get<{ data: T; timestamp: number; ttl: number }>(`cache-${key}`);

    if (!entry) return null;

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      await this.storage.remove(`cache-${key}`);
      return null;
    }

    return entry.data;
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    await this.storage.clear();
  }

  /**
   * Queue an operation for sync when online
   */
  async queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    await this.syncQueue.add(operation);

    // Try to sync immediately if online
    if (navigator.onLine) {
      await this.sync();
    }
  }

  /**
   * Sync all pending operations
   */
  async sync(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    this.syncInProgress = true;
    await this.syncQueue.markProcessing(true);

    try {
      const pending = await this.syncQueue.getPending();

      for (const operation of pending) {
        try {
          await this.processOperation(operation);
          await this.syncQueue.remove(operation.id);
        } catch (error) {
          console.error('Failed to sync operation:', operation, error);

          // Update retry count
          operation.retryCount++;

          // Remove if too many retries
          if (operation.retryCount >= 3) {
            await this.syncQueue.remove(operation.id);
          } else {
            // Update in queue
            await this.syncQueue.remove(operation.id);
            await this.syncQueue.add(operation);
          }
        }
      }

      await this.syncQueue.updateLastSync();
    } finally {
      this.syncInProgress = false;
      await this.syncQueue.markProcessing(false);
    }
  }

  private async processOperation(operation: SyncOperation): Promise<void> {
    const { type, table, data } = operation;

    switch (type) {
      case 'create':
        await supabase.from(table).insert(data);
        break;

      case 'update': {
        const { id, ...updateData } = data;
        await supabase.from(table).update(updateData).eq('id', id);
        break;
      }

      case 'delete':
        await supabase.from(table).delete().eq('id', data.id);
        break;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    pending: number;
    processing: boolean;
    lastSync: number | null;
  }> {
    const pending = await this.syncQueue.getPending();
    return {
      pending: pending.length,
      processing: this.syncInProgress,
      lastSync: this.syncQueue['queue'].lastSync,
    };
  }
}

// =====================================================================
// GLOBAL INSTANCE
// =====================================================================

let offlineCacheManager: OfflineCacheManager | null = null;

export function getOfflineCacheManager(): OfflineCacheManager {
  if (!offlineCacheManager) {
    offlineCacheManager = new OfflineCacheManager();
  }

  return offlineCacheManager;
}

// =====================================================================
// HOOKS
// =====================================================================

export async function initOfflineCache(): Promise<void> {
  const manager = getOfflineCacheManager();
  await manager.init();

  // Listen for online/offline events
  window.addEventListener('online', async () => {
    console.log('Device online - syncing...');
    await manager.sync();
  });

  // Sync on page load if online
  if (navigator.onLine) {
    await manager.sync();
  }
}

export async function cacheOfflineData(key: string, data: any, ttl?: number): Promise<void> {
  const manager = getOfflineCacheManager();
  await manager.cacheData(key, data, ttl);
}

export async function getCachedOfflineData<T>(key: string): Promise<T | null> {
  const manager = getOfflineCacheManager();
  return manager.getCachedData<T>(key);
}

export async function queueOfflineOperation(
  operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>
): Promise<void> {
  const manager = getOfflineCacheManager();
  await manager.queueOperation(operation);
}

export async function syncOfflineData(): Promise<void> {
  const manager = getOfflineCacheManager();
  await manager.sync();
}

export async function getOfflineSyncStatus(): Promise<{
  pending: number;
  processing: boolean;
  lastSync: number | null;
}> {
  const manager = getOfflineCacheManager();
  return manager.getSyncStatus();
}

// =====================================================================
// EXPORTS
// =====================================================================

export { OfflineCacheManager };
export default getOfflineCacheManager;
