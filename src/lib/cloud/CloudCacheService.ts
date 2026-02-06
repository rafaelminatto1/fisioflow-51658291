/**
 * Cloud Cache Service
 *
 * Uses Firebase Storage to store a snapshot of appointments for cross-device persistence.
 * This acts as a secondary cache layer when:
 * 1. Firebase is unreachable/slow
 * 2. User switches devices (local IndexedDB is empty)
 *
 * Migrated from Vercel Blob to Firebase Storage
 */

import { ref, uploadBytes, getDownloadURL, getBytes } from 'firebase/storage';
import { getFirebaseStorage } from '@/integrations/firebase/storage';
import type { AppointmentBase } from '@/types/appointment';
import { fisioLogger as logger } from '@/lib/errors/logger';

const STORAGE_CACHE_PREFIX = 'cache/appointments/';

export class CloudCacheService {
    /**
     * Save appointments snapshot to Firebase Storage
     */
    async saveSnapshot(userId: string, appointments: AppointmentBase[]): Promise<void> {
        try {
            const storage = getFirebaseStorage();
            const filename = `${STORAGE_CACHE_PREFIX}${userId}.json`;
            const data = JSON.stringify({
                timestamp: Date.now(),
                userId,
                count: appointments.length,
                data: appointments,
            });

            const storageRef = ref(storage, filename);
            const blob = new Blob([data], { type: 'application/json' });

            await uploadBytes(storageRef, blob);

            logger.info('Cloud snapshot saved', { userId, count: appointments.length });
        } catch (error) {
            logger.error('Failed to save cloud snapshot', error);
            // Don't throw - this is an auxiliary service
        }
    }

    /**
     * Fetch appointments snapshot from Firebase Storage
     */
    async getSnapshot(userId: string): Promise<AppointmentBase[] | null> {
        try {
            const storage = getFirebaseStorage();
            const filename = `${STORAGE_CACHE_PREFIX}${userId}.json`;
            const storageRef = ref(storage, filename);

            // Download the file content
            const bytes = await getBytes(storageRef);
            const text = new TextDecoder().decode(bytes);
            const snapshot = JSON.parse(text);

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
