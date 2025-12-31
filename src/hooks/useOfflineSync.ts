// Hook para gerenciar sincronização offline
import { useEffect, useState, useCallback } from 'react';
import { syncManager, SyncResult } from '@/lib/offline/SyncManager';
import { dbStore } from '@/lib/offline/IndexedDBStore';
import { logger } from '@/lib/errors/logger';

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
      try {
        const queue = await dbStore.getSyncQueue();
        setSyncQueueLength(queue.length);
      } catch (error) {
        logger.error('Erro ao verificar fila de sincronização', error, 'useOfflineSync');
      }
    };

    checkQueue();
    const interval = setInterval(() => {
      checkQueue();
    }, 5000);

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
    try {
      const result = await syncManager.sync();
      setLastSyncResult(result);
      return result;
    } catch (error) {
      logger.error('Erro ao sincronizar dados offline', error, 'useOfflineSync');
      const errorResult: SyncResult = {
        success: false,
        synced: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
      setLastSyncResult(errorResult);
      return errorResult;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const cacheCriticalData = useCallback(async () => {
    try {
      await syncManager.cacheCriticalData();
    } catch (error) {
      logger.error('Erro ao cachear dados críticos', error, 'useOfflineSync');
    }
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
