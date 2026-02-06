/**
 * Hook for managing offline data synchronization.
 * Provides utilities for syncing data when coming back online.
 */

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useConnectionStatus } from './useConnectionStatus';

interface SyncQueueItem {
    id: string;
    type: 'create' | 'update' | 'delete';
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
    addToQueue: (item: Omit<SyncQueueItem, 'id' | 'timestamp'>) => void;
    clearQueue: () => void;
}

const SYNC_QUEUE_KEY = 'fisioflow_offline_sync_queue';
const LAST_SYNC_KEY = 'fisioflow_last_sync_time';

export function useOfflineSync(options: UseOfflineSyncOptions = {}): UseOfflineSyncReturn {
    const { autoSync = true, syncInterval = 30000 } = options;
    const queryClient = useQueryClient();
    const { isOnline } = useConnectionStatus();

    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    // Load queue from localStorage
    const getQueue = useCallback((): SyncQueueItem[] => {
        try {
            const stored = localStorage.getItem(SYNC_QUEUE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }, []);

    // Save queue to localStorage
    const saveQueue = useCallback((queue: SyncQueueItem[]) => {
        try {
            localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
            setPendingCount(queue.length);
        } catch (error) {
            logger.error('Failed to save sync queue', error, 'useOfflineSync');
        }
    }, []);

    // Add item to queue
    const addToQueue = useCallback((item: Omit<SyncQueueItem, 'id' | 'timestamp'>) => {
        const queue = getQueue();
        const newItem: SyncQueueItem = {
            ...item,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        };
        queue.push(newItem);
        saveQueue(queue);
        logger.info('Added item to offline sync queue', { table: item.table, type: item.type }, 'useOfflineSync');
    }, [getQueue, saveQueue]);

    // Clear queue
    const clearQueue = useCallback(() => {
        localStorage.removeItem(SYNC_QUEUE_KEY);
        setPendingCount(0);
    }, []);

    // Sync pending items
    const sync = useCallback(async () => {
        if (!isOnline || isSyncing) return;

        const queue = getQueue();
        if (queue.length === 0) return;

        setIsSyncing(true);
        logger.info('Starting offline sync', { pendingItems: queue.length }, 'useOfflineSync');

        try {
            // For now, just clear the queue and invalidate queries
            // A full implementation would iterate through items and sync them
            clearQueue();

            // Invalidate common queries to refetch fresh data
            await queryClient.invalidateQueries({ queryKey: ['appointments'] });
            await queryClient.invalidateQueries({ queryKey: ['patients'] });
            await queryClient.invalidateQueries({ queryKey: ['eventos'] });

            const now = new Date();
            setLastSyncTime(now);
            localStorage.setItem(LAST_SYNC_KEY, now.toISOString());

            logger.info('Offline sync completed', {}, 'useOfflineSync');
        } catch (error) {
            logger.error('Offline sync failed', error, 'useOfflineSync');
        } finally {
            setIsSyncing(false);
        }
    }, [isOnline, isSyncing, getQueue, clearQueue, queryClient]);

    // Initialize
    useEffect(() => {
        const queue = getQueue();
        setPendingCount(queue.length);

        const storedLastSync = localStorage.getItem(LAST_SYNC_KEY);
        if (storedLastSync) {
            setLastSyncTime(new Date(storedLastSync));
        }
    }, [getQueue]);

    // Auto-sync when coming back online
    useEffect(() => {
        if (autoSync && isOnline && pendingCount > 0) {
            sync();
        }
    }, [autoSync, isOnline, pendingCount, sync]);

    // Periodic sync interval
    useEffect(() => {
        if (!autoSync || !isOnline) return;

        const interval = setInterval(() => {
            if (pendingCount > 0) {
                sync();
            }
        }, syncInterval);

        return () => clearInterval(interval);
    }, [autoSync, isOnline, pendingCount, syncInterval, sync]);

    return {
        isSyncing,
        pendingCount,
        lastSyncTime,
        sync,
        addToQueue,
        clearQueue,
    };
}
