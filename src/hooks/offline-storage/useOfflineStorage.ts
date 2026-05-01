import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { fisioLogger as logger } from "@/lib/errors/logger";
import type { 
  OfflineStorageOptions, 
  SyncResult, 
  StorageQuota, 
  OFFLINE_ACTION_TYPES 
} from "./types";
import { getDB } from "./database";
import { isCacheExpired, generateActionId, canRetryAction } from "./utils";

const DEFAULT_CACHE_EXPIRY = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_RETRY_ATTEMPTS = 3;

export function useOfflineStorage(options: OfflineStorageOptions = {}) {
  const { cacheExpiryMs = DEFAULT_CACHE_EXPIRY, maxRetryAttempts = DEFAULT_MAX_RETRY_ATTEMPTS } =
    options;

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState(0);
  const [cachedPatients, setCachedPatients] = useState<string[]>([]);
  const syncInProgress = useRef(false);

  const getAllCachedPatients = useCallback(async (): Promise<string[]> => {
    try {
      const db = await getDB();
      const cachedIds: string[] = [];
      for await (const cursor of db.transaction("patient_analytics").store) {
        cachedIds.push(cursor.key);
      }
      return cachedIds;
    } catch (error) {
      logger.error("Error getting cached patients", error, "useOfflineStorage");
      return [];
    }
  }, []);

  const loadCacheStats = useCallback(async (): Promise<void> => {
    try {
      const db = await getDB();
      const cachedIds = await getAllCachedPatients();
      setCachedPatients(cachedIds);

      const tx = db.transaction("offline_actions", "readonly");
      const index = tx.store.index("by-synced");
      const pending = await index.count(false);
      setPendingActions(pending);
    } catch (error) {
      logger.error("[OfflineStorage] Error loading cache stats", error, "useOfflineStorage");
    }
  }, [getAllCachedPatients]);

  const getPendingActions = useCallback(async () => {
    try {
      const db = await getDB();
      const tx = db.transaction("offline_actions", "readonly");
      const index = tx.store.index("by-synced");
      const actions = await index.getAll(false);

      return actions.filter((a) => canRetryAction(a.retryCount, maxRetryAttempts));
    } catch (error) {
      logger.error("[OfflineStorage] Error getting pending actions", error, "useOfflineStorage");
      return [];
    }
  }, [maxRetryAttempts]);

  // Placeholder for action execution - should be injected or handled via a sync registry
  const executeAction = async (actionType: string, _payload: unknown): Promise<void> => {
    // In a real scenario, this would call specific API services
    logger.info(`[OfflineStorage] Executing ${actionType}`, { _payload });
    await new Promise((resolve) => setTimeout(resolve, 100));
  };

  const syncPendingActions = useCallback(async (): Promise<SyncResult> => {
    if (!isOnline || syncInProgress.current) {
      return { successful: 0, failed: 0, skipped: 0 };
    }

    syncInProgress.current = true;
    setIsSyncing(true);

    const result: SyncResult = { successful: 0, failed: 0, skipped: 0 };

    try {
      const actions = await getPendingActions();

      if (actions.length === 0) {
        return result;
      }

      for (const action of actions) {
        try {
          await executeAction(action.action, action.payload);

          const db = await getDB();
          await db.delete("offline_actions", action.id);

          result.successful++;
        } catch (error) {
          const db = await getDB();
          const updatedAction = {
            ...action,
            retryCount: action.retryCount + 1,
          };

          if (canRetryAction(updatedAction.retryCount, maxRetryAttempts)) {
            await db.put("offline_actions", updatedAction);
          } else {
            await db.delete("offline_actions", action.id);
          }

          result.failed++;
          logger.error("[OfflineStorage] Action failed", error, "useOfflineStorage");
        }
      }

      await loadCacheStats();

      if (result.successful > 0) {
        toast.success(`${result.successful} ações sincronizadas com sucesso`);
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} ações falharam ao sincronizar`, {
          description: "Elas serão tentadas novamente.",
        });
      }
    } catch (error) {
      logger.error("[OfflineStorage] Sync error", error, "useOfflineStorage");
      result.skipped = pendingActions;
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
    }

    return result;
  }, [getPendingActions, isOnline, loadCacheStats, maxRetryAttempts, pendingActions]);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    toast.success("Conexão restaurada", {
      description: "Sincronizando dados pendentes...",
    });
    void syncPendingActions();
  }, [syncPendingActions]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    toast.warning("Você está offline", {
      description: "As alterações serão sincronizadas quando reconectar.",
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  useEffect(() => {
    void loadCacheStats();
  }, [loadCacheStats]);

  const cachePatientAnalytics = useCallback(
    async (patientId: string, data: unknown): Promise<void> => {
      try {
        const db = await getDB();
        await db.put("patient_analytics", {
          patientId,
          data,
          timestamp: Date.now(),
          version: 1,
        });
        await loadCacheStats();
      } catch (error) {
        logger.error("Error caching patient analytics", error, "useOfflineStorage");
        throw error;
      }
    },
    [loadCacheStats],
  );

  const getCachedPatientAnalytics = useCallback(
    async (patientId: string): Promise<unknown | null> => {
      try {
        const db = await getDB();
        const cached = await db.get("patient_analytics", patientId);

        if (!cached) return null;

        if (isCacheExpired(cached.timestamp, cacheExpiryMs)) {
          await db.delete("patient_analytics", patientId);
          await loadCacheStats();
          return null;
        }

        return cached.data;
      } catch (error) {
        logger.error("Error getting cached analytics", error, "useOfflineStorage");
        return null;
      }
    },
    [cacheExpiryMs, loadCacheStats],
  );

  const queueOfflineAction = useCallback(
    async (action: string, payload: unknown): Promise<string> => {
      try {
        const db = await getDB();
        const actionId = generateActionId(action);

        await db.add("offline_actions", {
          id: actionId,
          action,
          payload,
          timestamp: Date.now(),
          synced: false,
          retryCount: 0,
        });

        await loadCacheStats();
        toast.info("Ação salva para sincronização posterior");

        return actionId;
      } catch (error) {
        logger.error("Error queuing offline action", error, "useOfflineStorage");
        throw error;
      }
    },
    [loadCacheStats],
  );

  const getStorageSize = useCallback(async (): Promise<StorageQuota | null> => {
    try {
      if (
        typeof navigator !== "undefined" &&
        "storage" in navigator &&
        "estimate" in navigator.storage
      ) {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          usagePercentage:
            estimate.usage && estimate.quota
              ? Math.round((estimate.usage / estimate.quota) * 100)
              : 0,
        };
      }
      return null;
    } catch (error) {
      logger.error("[OfflineStorage] Error getting storage size", error, "useOfflineStorage");
      return null;
    }
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingActions,
    cachedPatients,
    cachePatientAnalytics,
    getCachedPatientAnalytics,
    queueOfflineAction,
    syncPendingActions,
    getStorageSize,
    loadCacheStats,
  };
}
