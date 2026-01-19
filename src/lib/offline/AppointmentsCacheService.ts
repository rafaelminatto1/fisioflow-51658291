/**
 * Service for caching appointments data offline.
 * Provides methods for managing appointment data in local storage for offline use.
 */
import { logger } from '@/lib/errors/logger';
import { AppointmentBase } from '@/types/appointment';

interface CacheMetadata {
    lastUpdated: string;
    organizationId?: string;
}

interface CacheResult<T> {
    data: T[];
    isStale: boolean;
    metadata: CacheMetadata | null;
    source: 'indexeddb' | 'localstorage' | 'memory';
}

class AppointmentsCacheService {
    private readonly CACHE_KEY_PREFIX = 'appointments_cache';
    private readonly CACHE_TIMESTAMP_KEY_PREFIX = 'appointments_cache_timestamp';
    private readonly CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

    private getCacheKey(organizationId?: string): string {
        return organizationId ? `${this.CACHE_KEY_PREFIX}_${organizationId}` : this.CACHE_KEY_PREFIX;
    }

    private getTimestampKey(organizationId?: string): string {
        return organizationId ? `${this.CACHE_TIMESTAMP_KEY_PREFIX}_${organizationId}` : this.CACHE_TIMESTAMP_KEY_PREFIX;
    }

    private currentOrganizationId?: string;

    /**
     * Check if cached data is still valid (not expired)
     */
    async isCacheValid(organizationId?: string): Promise<boolean> {
        const timestamp = localStorage.getItem(this.getTimestampKey(organizationId));
        if (!timestamp) return false;

        const cacheTime = parseInt(timestamp, 10);
        return Date.now() - cacheTime < this.CACHE_DURATION_MS;
    }

    /**
     * Get cache age in minutes
     */
    getCacheAgeMinutes(organizationId?: string): number {
        const key = this.getTimestampKey(organizationId || this.currentOrganizationId);
        const timestamp = localStorage.getItem(key);
        if (!timestamp) return Infinity;
        return Math.round((Date.now() - parseInt(timestamp, 10)) / 60000);
    }

    /**
     * Get cached appointments
     */
    async getFromCache(organizationId?: string): Promise<CacheResult<AppointmentBase>> {
        this.currentOrganizationId = organizationId;
        try {
            const cached = localStorage.getItem(this.getCacheKey(organizationId));
            if (!cached) {
                return { data: [], isStale: false, metadata: null, source: 'memory' };
            }

            const isValid = await this.isCacheValid(organizationId);
            const timestamp = localStorage.getItem(this.getTimestampKey(organizationId));

            // Parse and convert dates back to Date objects
            const rawData = JSON.parse(cached);
            const data: AppointmentBase[] = (rawData || []).map((apt: Record<string, unknown>) => ({
                ...apt,
                date: apt.date ? new Date(apt.date as string) : new Date(),
                createdAt: apt.createdAt ? new Date(apt.createdAt as string) : new Date(),
                updatedAt: apt.updatedAt ? new Date(apt.updatedAt as string) : new Date(),
            }));

            return {
                data,
                isStale: !isValid,
                metadata: timestamp ? { lastUpdated: new Date(parseInt(timestamp, 10)).toISOString(), organizationId } : null,
                source: 'localstorage'
            };
        } catch (error) {
            logger.error('Error reading appointments cache', error, 'AppointmentsCacheService');
            return { data: [], isStale: false, metadata: null, source: 'memory' };
        }
    }

    /**
     * Save appointments to cache
     */
    async saveToCache(data: AppointmentBase[], organizationId?: string): Promise<void> {
        this.currentOrganizationId = organizationId;
        try {
            // Convert dates to ISO strings for storage
            const serialized = data.map(apt => ({
                ...apt,
                date: apt.date instanceof Date ? apt.date.toISOString() : apt.date,
                createdAt: apt.createdAt instanceof Date ? apt.createdAt.toISOString() : apt.createdAt,
                updatedAt: apt.updatedAt instanceof Date ? apt.updatedAt.toISOString() : apt.updatedAt,
            }));
            localStorage.setItem(this.getCacheKey(organizationId), JSON.stringify(serialized));
            localStorage.setItem(this.getTimestampKey(organizationId), Date.now().toString());
        } catch (error) {
            logger.error('Error caching appointments', error, 'AppointmentsCacheService');
        }
    }

    /**
     * Clear the appointments cache
     */
    async clearCache(organizationId?: string): Promise<void> {
        try {
            localStorage.removeItem(this.getCacheKey(organizationId));
            localStorage.removeItem(this.getTimestampKey(organizationId));
        } catch (error) {
            logger.error('Error clearing appointments cache', error, 'AppointmentsCacheService');
        }
    }
}

export const appointmentsCacheService = new AppointmentsCacheService();
