/**
 * Serviço de armazenamento offline usando IndexedDB
 * Fornece interface para persistência de dados quando offline
 */

const DB_NAME = 'FisioFlowOfflineDB';
const DB_VERSION = 3;

interface StoreConfig {
  name: string;
  keyPath: string;
  indexes?: { name: string; keyPath: string; unique?: boolean }[];
}

const STORES: StoreConfig[] = [
  {
    name: 'appointments',
    keyPath: 'id',
    indexes: [
      { name: 'date', keyPath: 'appointment_date' },
      { name: 'patientId', keyPath: 'patient_id' },
    ],
  },
  {
    name: 'patients',
    keyPath: 'id',
    indexes: [{ name: 'name', keyPath: 'full_name' }],
  },
  {
    name: 'exercises',
    keyPath: 'id',
    indexes: [{ name: 'category', keyPath: 'category' }],
  },
  {
    name: 'pendingSync',
    keyPath: 'id',
    indexes: [{ name: 'timestamp', keyPath: 'timestamp' }],
  },
  {
    name: 'cachedData',
    keyPath: 'key',
    indexes: [{ name: 'expiresAt', keyPath: 'expiresAt' }],
  },
];

class OfflineStorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        STORES.forEach((storeConfig) => {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const store = db.createObjectStore(storeConfig.name, {
              keyPath: storeConfig.keyPath,
            });

            storeConfig.indexes?.forEach((index) => {
              store.createIndex(index.name, index.keyPath, {
                unique: index.unique,
              });
            });
          }
        });
      };
    });
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  async set(storeName: string, value: unknown): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Cache com expiração
  async setCache(key: string, value: unknown, ttlMinutes: number = 60): Promise<void> {
    const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
    await this.set('cachedData', { key, value, expiresAt });
  }

  async getCache<T>(key: string): Promise<T | null> {
    const cached = await this.get<{ key: string; value: T; expiresAt: number }>(
      'cachedData',
      key
    );

    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      await this.delete('cachedData', key);
      return null;
    }

    return cached.value;
  }

  // Sync pendente
  async addPendingSync(data: unknown): Promise<void> {
    const id = `${Date.now()}-${Math.random()}`;
    await this.set('pendingSync', {
      id,
      ...data,
      timestamp: Date.now(),
    });
  }

  async getPendingSync<T>(): Promise<T[]> {
    return this.getAll<T>('pendingSync');
  }

  async clearPendingSync(id: string): Promise<void> {
    await this.delete('pendingSync', id);
  }
}

export const offlineStorage = new OfflineStorageService();
