import { openDB, IDBPDatabase } from "idb";
import type { FisioFlowDB } from "./types";

const DEFAULT_DB_NAME = "FisioFlowOffline";
const DEFAULT_DB_VERSION = 2;

let dbInstance: IDBPDatabase<FisioFlowDB> | null = null;

/**
 * Gets or creates the IndexedDB instance
 */
export async function getDB(): Promise<IDBPDatabase<FisioFlowDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<FisioFlowDB>(DEFAULT_DB_NAME, DEFAULT_DB_VERSION, {
    upgrade(db) {
      // Patient analytics store
      if (!db.objectStoreNames.contains("patient_analytics")) {
        const analyticsStore = db.createObjectStore("patient_analytics", {
          keyPath: "patientId",
        });
        analyticsStore.createIndex("by-timestamp", "timestamp");
      }

      // Offline actions store
      if (!db.objectStoreNames.contains("offline_actions")) {
        const actionsStore = db.createObjectStore("offline_actions", {
          keyPath: "id",
        });
        actionsStore.createIndex("by-synced", "synced");
        actionsStore.createIndex("by-timestamp", "timestamp");
      }

      // Session cache store
      if (!db.objectStoreNames.contains("session_cache")) {
        const sessionStore = db.createObjectStore("session_cache", {
          keyPath: "sessionId",
        });
        sessionStore.createIndex("by-expires", "expiresAt");
      }

      // Patients store
      if (!db.objectStoreNames.contains("patients")) {
        const patientsStore = db.createObjectStore("patients", {
          keyPath: "id",
        });
        patientsStore.createIndex("by-name", "name");
      }

      // Appointments store
      if (!db.objectStoreNames.contains("appointments")) {
        const apptStore = db.createObjectStore("appointments", {
          keyPath: "id",
        });
        apptStore.createIndex("by-startTime", "start_time");
        apptStore.createIndex("by-patientId", "patient_id");
      }

      // Exercises store
      if (!db.objectStoreNames.contains("exercises")) {
        const exStore = db.createObjectStore("exercises", { keyPath: "id" });
        exStore.createIndex("by-category", "category");
      }
    },
  });

  return dbInstance;
}

export function resetDBInstance(): void {
  dbInstance = null;
}
