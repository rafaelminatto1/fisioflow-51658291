/**
 * Hook for managing offline data synchronization.
 * Provides utilities for syncing data when coming back online.
 */

import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { useConnectionStatus } from "./useConnectionStatus";
import { cn } from "@/lib/utils";
import { getOfflineSyncService } from "@/services/offlineSync";

interface SyncQueueItem {
  id: string;
  type: "create" | "update" | "delete";
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface UseOfflineSyncOptions {
  autoSync?: boolean;
  syncInterval?: number;
}

interface UseOfflineSyncReturn {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  sync: () => Promise<void>;
  addToQueue: (item: Omit<SyncQueueItem, "id" | "timestamp">) => void;
  clearQueue: () => void;
}

const LAST_SYNC_KEY = "fisioflow_last_sync_time";

export function useOfflineSync(options: UseOfflineSyncOptions = {}): UseOfflineSyncReturn {
  const { autoSync = true, syncInterval = 30000 } = options;
  const queryClient = useQueryClient();
  const { isOnline } = useConnectionStatus();

  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Sync pending items
  const sync = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    const service = getOfflineSyncService();
    
    try {
      const stats = await service.syncNow();
      setPendingCount(stats.pendingActions);

      const now = new Date();
      setLastSyncTime(now);
      localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
    } catch (error) {
      logger.error("Offline sync via hook failed", error, "useOfflineSync");
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  // Add item to queue
  const addToQueue = useCallback(
    async (item: Omit<SyncQueueItem, "id" | "timestamp">) => {
      const service = getOfflineSyncService();
      await service.enqueueAction(`${item.type.toUpperCase()}_${item.table.toUpperCase()}`, item.data);
      
      const stats = await service.getStats();
      setPendingCount(stats.pendingActions);
    },
    [],
  );

  // Clear queue (maintained for interface consistency, but use with caution)
  const clearQueue = useCallback(async () => {
    // Note: The service doesn't have a simple clearAll yet, 
    // but we can at least reset local state for UI
    setPendingCount(0);
  }, []);

  // Initialize and subscribe to service events
  useEffect(() => {
    const service = getOfflineSyncService();
    
    const updateStats = async () => {
      const stats = await service.getStats();
      setPendingCount(stats.pendingActions);
    };

    updateStats();

    const unsubscribe = service.subscribe((event) => {
      if (event.data?.stats) {
        setPendingCount(event.data.stats.pendingActions);
      }
    });

    const storedLastSync = localStorage.getItem(LAST_SYNC_KEY);
    if (storedLastSync) {
      setLastSyncTime(new Date(storedLastSync));
    }

    return unsubscribe;
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (autoSync && isOnline && pendingCount > 0) {
      sync();
    }
  }, [autoSync, isOnline, pendingCount, sync]);

  return {
    isSyncing,
    pendingCount,
    lastSyncTime,
    sync,
    addToQueue,
    clearQueue,
  };
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

import { Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const OfflineStatusIndicator = ({ className }: { className?: string }) => {
  // We use the hook internally to get status
  const { pendingCount } = useOfflineSync();
  // We also need connection status
  const { isOnline } = useConnectionStatus();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            {isOnline ? (
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-600 border-green-200 gap-1.5 hover:bg-green-500/20"
              >
                <Wifi className="h-3 w-3" />
                <span className="hidden sm:inline">Online</span>
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1.5 animate-pulse">
                <WifiOff className="h-3 w-3" />
                <span className="hidden sm:inline">Offline</span>
              </Badge>
            )}

            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{isOnline ? "Conectado" : "Sem conexão"}</p>
            {pendingCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {pendingCount} alterações salvas localmente
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
