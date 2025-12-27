// Hook para gerenciar sincronização offline
import { useEffect, useState, useCallback } from 'react';
import { syncManager, SyncResult } from '@/lib/offline/SyncManager';
import { dbStore } from '@/lib/offline/IndexedDBStore';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [syncQueueLength, setSyncQueueLength] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar fila de sincronização periodicamente
    const checkQueue = async () => {
      const queue = await dbStore.getSyncQueue();
      setSyncQueueLength(queue.length);
    };

    checkQueue();
    const interval = setInterval(checkQueue, 5000);

    // Listener para resultados de sincronização
    const unsubscribe = syncManager.onSync((result) => {
      setLastSyncResult(result);
      setIsSyncing(false);
      checkQueue();
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    const result = await syncManager.sync();
    setLastSyncResult(result);
    setIsSyncing(false);
    return result;
  }, []);

  const cacheCriticalData = useCallback(async () => {
    await syncManager.cacheCriticalData();
  }, []);

  return {
    isOnline,
    isSyncing,
    lastSyncResult,
    syncQueueLength,
    sync,
    cacheCriticalData,
  };
}
