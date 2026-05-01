/**
 * offline-queue.ts — IndexedDB queue for offline API operations.
 *
 * Operations enqueued here are drained by the service worker "fisioflow-sync"
 * Background Sync tag when connectivity is restored.
 *
 * If Background Sync is not supported (Safari), the queue is drained on the
 * next app foreground event via drainNow().
 */

const DB_NAME = "fisioflow-offline";
const DB_VERSION = 1;
const STORE_NAME = "ops";

export interface OfflineOp {
  id: string;
  method: string;
  url: string;
  body?: unknown;
  status: "pending" | "failed";
  failReason?: string;
  createdAt: number;
  attempts: number;
}

type NewOp = Pick<OfflineOp, "method" | "url" | "body">;

// ── DB Lifecycle ─────────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status");
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Queue Operations ──────────────────────────────────────────────────────────

export async function enqueue(op: NewOp): Promise<string> {
  const db = await getDB();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const record: OfflineOp = { ...op, id, status: "pending", createdAt: Date.now(), attempts: 0 };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Request background sync (may silently fail on unsupported browsers)
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    const reg = await navigator.serviceWorker.ready;
    await (reg as any).sync.register("fisioflow-sync").catch(() => {});
  }

  return id;
}

export async function getPendingOps(): Promise<OfflineOp[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).index("status").getAll("pending");
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllOps(): Promise<OfflineOp[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function markDone(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearFailed(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.index("status").openCursor(IDBKeyRange.only("failed"));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function pendingCount(): Promise<number> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).index("status").count(IDBKeyRange.only("pending"));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Foreground Drain (Safari fallback) ───────────────────────────────────────

/**
 * Drain the queue synchronously in the foreground.
 * Used when Background Sync API is unavailable (Safari iOS).
 * Call this on app mount / online event.
 */
export async function drainNow(getToken: () => Promise<string | null>): Promise<number> {
  if (!navigator.onLine) return 0;

  const ops = await getPendingOps();
  if (ops.length === 0) return 0;

  let synced = 0;
  const token = await getToken();

  for (const op of ops) {
    try {
      const res = await fetch(op.url, {
        method: op.method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: op.body ? JSON.stringify(op.body) : undefined,
      });

      if (res.ok) {
        await markDone(op.id);
        synced++;
      }
    } catch {
      // Network still unavailable — leave in queue
    }
  }

  return synced;
}
