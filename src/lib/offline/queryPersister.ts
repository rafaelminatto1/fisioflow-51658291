import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { get, set, del } from "idb-keyval";
import { Persister } from "@tanstack/react-query-persist-client";

/**
 * Custom IDB Persister for TanStack Query
 * Using IndexedDB via idb-keyval for better performance and capacity than localStorage
 */
export const idbPersister: Persister = {
  persistClient: async (persistClient) => {
    await set("fisioflow-query-cache", persistClient);
  },
  restoreClient: async () => {
    return await get("fisioflow-query-cache");
  },
  removeClient: async () => {
    await del("fisioflow-query-cache");
  },
};

/**
 * Standard SyncStorage Persister (Fallback/Optional)
 */
export const localStoragePersister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "FISIOFLOW_OFFLINE_CACHE",
});
