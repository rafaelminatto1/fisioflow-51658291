import { useEffect } from 'react';
import { useOfflineSync } from '@/services/offlineSync';
import { fisioLogger as logger } from '@/lib/errors/logger';

export function SyncManager() {
    const { _stats, _syncNow, isOnline, cacheCriticalData } = useOfflineSync({
        syncInterval: 60000, // 1 minute
        showNotifications: true
    });

    // Cache critical data when coming online
    useEffect(() => {
        if (isOnline) {
            cacheCriticalData().catch(err => logger.error('Error caching critical data', err, 'SyncManager'));
        }
    }, [isOnline, cacheCriticalData]);

    // Auto-sync when coming back online is handled by the hook/service
    // We just render nothing as this is a logic component

    return null;
}
