// Store IndexedDB para cache offline
export class IndexedDBStore {
  private dbName: string;
  private version: number;
  private db: IDBDatabase | null = null;

  constructor(dbName: string = 'fisioflow-offline', version: number = 1) {
    this.dbName = dbName;
    this.version = version;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para pacientes
        if (!db.objectStoreNames.contains('patients')) {
          const patientsStore = db.createObjectStore('patients', { keyPath: 'id' });
          patientsStore.createIndex('name', 'name', { unique: false });
          patientsStore.createIndex('organization_id', 'organization_id', { unique: false });
        }

        // Store para agendamentos
        if (!db.objectStoreNames.contains('appointments')) {
          const appointmentsStore = db.createObjectStore('appointments', { keyPath: 'id' });
          appointmentsStore.createIndex('patient_id', 'patient_id', { unique: false });
          appointmentsStore.createIndex('start_time', 'start_time', { unique: false });
          appointmentsStore.createIndex('status', 'status', { unique: false });
        }

        // Store para sessões
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionsStore.createIndex('patient_id', 'patient_id', { unique: false });
          sessionsStore.createIndex('appointment_id', 'appointment_id', { unique: false });
        }

        // Store para exercícios
        if (!db.objectStoreNames.contains('exercises')) {
          const exercisesStore = db.createObjectStore('exercises', { keyPath: 'id' });
          exercisesStore.createIndex('category', 'category', { unique: false });
        }

        // Store para operações pendentes (sync queue)
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('created_at', 'created_at', { unique: false });
        }
      };
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAll<T>(storeName: string, indexName?: string, query?: IDBValidKey | IDBKeyRange): Promise<T[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const source = indexName ? store.index(indexName) : store;
      const request = source.getAll(query);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async put<T>(storeName: string, value: T): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async putAll<T>(storeName: string, values: T[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      let completed = 0;
      const total = values.length;

      if (total === 0) {
        resolve();
        return;
      }

      values.forEach((value) => {
        const request = store.put(value);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
      });
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async addToSyncQueue(operation: {
    type: string;
    action: 'create' | 'update' | 'delete';
    store: string;
    data: any;
    timestamp: string;
  }): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const request = store.add({
        ...operation,
        status: 'pending',
        created_at: new Date().toISOString(),
        retry_count: 0,
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getSyncQueue(): Promise<any[]> {
    return this.getAll('sync_queue', 'status', 'pending');
  }

  async updateSyncQueueItem(id: number, updates: Partial<any>): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const getRequest = store.get(id);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          const updated = { ...item, ...updates };
          const putRequest = store.put(updated);
          putRequest.onerror = () => reject(putRequest.error);
          putRequest.onsuccess = () => resolve();
        } else {
          resolve();
        }
      };
    });
  }
}

// Instância singleton
export const dbStore = new IndexedDBStore();

