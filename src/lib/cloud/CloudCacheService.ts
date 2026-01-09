/**
 * Cloud Cache Service
 * 
 * Uses Vercel Blob to store a snapshot of appointments for cross-device persistence.
 * This acts as a secondary cache layer when:
 * 1. Supabase is unreachable/slow
 * 2. User switches devices (local IndexedDB is empty)
 */
import { put, list, del } from '@vercel/blob';
import type { AppointmentBase } from '@/types/appointment';
import { logger } from '@/lib/errors/logger';

const BLOB_CACHE_PREFIX = 'cache/appointments/';

export class CloudCacheService {
    /**
     * Save appointments snapshot to Vercel Blob
     */
    async saveSnapshot(userId: string, appointments: AppointmentBase[]): Promise<void> {
        try {
            const filename = `${BLOB_CACHE_PREFIX}${userId}.json`;
            const data = JSON.stringify({
                timestamp: Date.now(),
                userId,
                count: appointments.length,
                data: appointments,
            });

            // Upload new snapshot (overwrites automatically if same name, but good to be explicit)
            await put(filename, data, {
                access: 'public',
                addRandomSuffix: false, // Keep constant filename per user for easier retrieval
            });

            logger.info('Cloud snapshot saved', { userId, count: appointments.length });
        } catch (error) {
            logger.error('Failed to save cloud snapshot', error);
            // Don't throw - this is an auxiliary service
        }
    }

    /**
     * Fetch appointments snapshot from Vercel Blob
     */
    async getSnapshot(userId: string): Promise<AppointmentBase[] | null> {
        try {
            // Find the user's cache file
            const filename = `${BLOB_CACHE_PREFIX}${userId}.json`;
            const { blobs } = await list({ prefix: filename, limit: 1 });

            if (blobs.length === 0) return null;

            // Fetch content
            const response = await fetch(blobs[0].url);
            if (!response.ok) return null;

            const snapshot = await response.json();

            // Basic validation
            if (snapshot.userId !== userId) return null;

            // Check age (e.g., ignore if older than 24h)
            if (Date.now() - snapshot.timestamp > 24 * 60 * 60 * 1000) {
                return null;
            }

            return snapshot.data;
        } catch (error) {
            logger.warn('Failed to fetch cloud snapshot', error);
            return null;
        }
    }
}

export const cloudCacheService = new CloudCacheService();
