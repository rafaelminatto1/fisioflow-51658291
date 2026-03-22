/**
 * useOfflineSync Hook
 * Integrates offline manager and network status
 */

import { useState, useEffect } from 'react';
import { getOfflineManager, SyncStatus } from '@/lib/offlineManager';
import { useNetworkStatus } from './useNetworkStatus';
import { useAuthStore } from '@/store/auth';

export function useOfflineSync() {
  const {user} = useAuthStore();
  const networkStatus = useNetworkStatus();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: networkStatus.isConnected && networkStatus.isInternetReachable,
    isSyncing: false,
    pendingOperations: 0,
    lastSync: null,
  });

  useEffect(() => {
    if (!user?.id) return;

    // Initialize offline manager
    const init = async () => {
      try {
        const manager = await getOfflineManager();
        await manager.initialize(user.id);

        // Subscribe to sync status updates
        const unsubscribe = manager.subscribe(setSyncStatus);

        // Get initial status
        const status = await manager.getStatus();
        setSyncStatus(status);

        return unsubscribe;
      } catch (error) {
        console.error('Error initializing offline manager:', error);
        return () => {};
      }
    };

    let unsubscribe: (() => void) | null = null;

    init().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id]);

  // Update online status based on network
  useEffect(() => {
    const isOnline = networkStatus.isConnected && networkStatus.isInternetReachable;
    setSyncStatus(prev => ({...prev, isOnline}));
  }, [networkStatus]);

  /**
   * Manually trigger sync
   */
  const syncNow = async () => {
    if (!user?.id) return;

    const manager = getOfflineManager();
    await manager.syncAll(user.id);
  };

  /**
   * Queue an operation
   */
  const queueOperation = async (
    type: 'complete_exercise' | 'update_profile' | 'submit_feedback',
    data: any
  ) => {
    if (!user?.id) return;

    const manager = getOfflineManager();
    await manager.queueOperation(type, data, user.id);
  };

  /**
   * Clear queue (useful for logout)
   */
  const clearQueue = async () => {
    const manager = getOfflineManager();
    await manager.clearQueue();
  };

  /**
   * Get cached data
   */
  const getCachedData = async <T>(key: string): Promise<T | null> => {
    const manager = getOfflineManager();
    return manager.getCachedData<T>(key);
  };

  /**
   * Set cached data
   */
  const setCachedData = async <T>(key: string, data: T): Promise<void> => {
    const manager = getOfflineManager();
    await manager.setCachedData(key, data);
  };

  return {
    ...syncStatus,
    ...networkStatus,
    syncNow,
    queueOperation,
    clearQueue,
    getCachedData,
    setCachedData,
  };
}
