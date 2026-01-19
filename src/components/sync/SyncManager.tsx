import { useEffect } from 'react';
import { useOfflineSync } from '@/services/offlineSync';
import { useToast } from '@/hooks/use-toast';

export function SyncManager() {
    const { stats, syncNow, isOnline, cacheCriticalData } = useOfflineSync({
        syncInterval: 60000, // 1 minute
        showNotifications: true
    });

    // Cache critical data when coming online
    useEffect(() => {
        if (isOnline) {
            cacheCriticalData().catch(console.error);
        }
    }, [isOnline, cacheCriticalData]);

    // Auto-sync when coming back online is handled by the hook/service
    // We just render nothing as this is a logic component

    return null;
}
