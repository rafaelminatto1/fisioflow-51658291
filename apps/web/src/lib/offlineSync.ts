import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface FisioFlowSyncDB extends DBSchema {
  syncQueue: {
    key: number;
    value: {
      id?: number;
      url: string;
      method: string;
      headers: Record<string, string>;
      body: string;
      timestamp: number;
      retryCount: number;
    };
    indexes: { "by-timestamp": number };
  };
}

const DB_NAME = "fisioflow-sync";
const STORE_NAME = "syncQueue";
const DB_VERSION = 1;

class OfflineSyncManager {
  private dbPromise: Promise<IDBPDatabase<FisioFlowSyncDB>>;
  private isOnline: boolean;
  private syncInProgress: boolean = false;

  constructor() {
    this.dbPromise = openDB<FisioFlowSyncDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("by-timestamp", "timestamp");
      },
    });

    this.isOnline = navigator.onLine;

    window.addEventListener("online", () => {
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });
  }

  /**
   * Adds an API request to the queue to be executed when the device is back online.
   */
  async enqueueRequest(url: string, method: string, headers: HeadersInit, body: any) {
    const db = await this.dbPromise;
    const req = {
      url,
      method,
      headers: headers as Record<string, string>,
      body: JSON.stringify(body),
      timestamp: Date.now(),
      retryCount: 0,
    };
    await db.add(STORE_NAME, req);

    if (this.isOnline) {
      this.processQueue();
    }
  }

  /**
   * Processes the queued requests sequentially.
   */
  async processQueue() {
    if (this.syncInProgress || !this.isOnline) return;
    this.syncInProgress = true;

    try {
      const db = await this.dbPromise;
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const queue = await store.getAll();

      // Sort by timestamp
      queue.sort((a, b) => a.timestamp - b.timestamp);

      for (const req of queue) {
        if (!this.isOnline) break;

        try {
          const response = await fetch(req.url, {
            method: req.method,
            headers: {
              ...req.headers,
              "X-Offline-Sync": "true",
            },
            body: req.body,
          });

          if (response.ok || (response.status >= 400 && response.status < 500)) {
            // Success or client error (no point in retrying)
            await db.delete(STORE_NAME, req.id!);
          } else {
            // Server error, maybe retry later
            req.retryCount += 1;
            await db.put(STORE_NAME, req);
          }
        } catch (error) {
          // Network failure, stop processing
          console.error("[OfflineSync] Failed to process queued request", error);
          break;
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }
}

export const offlineSyncManager = new OfflineSyncManager();
