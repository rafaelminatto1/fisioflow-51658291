import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

export interface SyncState {
  status: SyncStatus;
  isOnline: boolean;
  lastSync: Date | null;
  pendingChanges: number;
}

export function useSyncStatus() {
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'synced',
    isOnline: true,
    lastSync: null,
    pendingChanges: 0,
  });

  useEffect(() => {
    // Subscribe to network status
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected ?? true;

      setSyncState((prev) => ({
        ...prev,
        isOnline,
        status: isOnline ? 'synced' : 'offline',
      }));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const setSyncing = () => {
    setSyncState((prev) => ({ ...prev, status: 'syncing' }));
  };

  const setSynced = () => {
    setSyncState((prev) => ({
      ...prev,
      status: 'synced',
      lastSync: new Date(),
      pendingChanges: 0,
    }));
  };

  const setSyncError = () => {
    setSyncState((prev) => ({ ...prev, status: 'error' }));
  };

  const incrementPending = () => {
    setSyncState((prev) => ({
      ...prev,
      pendingChanges: prev.pendingChanges + 1,
    }));
  };

  const decrementPending = () => {
    setSyncState((prev) => ({
      ...prev,
      pendingChanges: Math.max(0, prev.pendingChanges - 1),
    }));
  };

  return {
    ...syncState,
    setSyncing,
    setSynced,
    setSyncError,
    incrementPending,
    decrementPending,
  };
}
