/**
 * Service for caching patients data offline.
 */
import { Patient } from '@/schemas/patient';
import { logger } from '@/lib/errors/logger';

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

class PatientsCacheService {
    private readonly CACHE_KEY_PREFIX = 'patients_cache';
    private readonly CACHE_TIMESTAMP_KEY_PREFIX = 'patients_cache_timestamp';
    private readonly CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

    private getCacheKey(organizationId?: string): string {
        return organizationId ? `${this.CACHE_KEY_PREFIX}_${organizationId}` : this.CACHE_KEY_PREFIX;
    }

    private getTimestampKey(organizationId?: string): string {
        return organizationId ? `${this.CACHE_TIMESTAMP_KEY_PREFIX}_${organizationId}` : this.CACHE_TIMESTAMP_KEY_PREFIX;
    }

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
     * Get cached patients
     */
    async getFromCache(organizationId?: string): Promise<CacheResult<Patient>> {
        try {
            const cached = localStorage.getItem(this.getCacheKey(organizationId));
            if (!cached) {
                return { data: [], isStale: false, metadata: null, source: 'memory' };
            }

            const isValid = await this.isCacheValid(organizationId);
            const timestamp = localStorage.getItem(this.getTimestampKey(organizationId));

            return {
                data: JSON.parse(cached) as Patient[],
                isStale: !isValid,
                metadata: timestamp ? { lastUpdated: new Date(parseInt(timestamp, 10)).toISOString(), organizationId } : null,
                source: 'localstorage'
            };
        } catch (error) {
            logger.error('Error reading patients cache', error, 'PatientsCacheService');
            return { data: [], isStale: false, metadata: null, source: 'memory' };
        }
    }

    /**
     * Save patients to cache
     */
    async saveToCache(data: Patient[], organizationId?: string): Promise<void> {
        try {
            localStorage.setItem(this.getCacheKey(organizationId), JSON.stringify(data));
            localStorage.setItem(this.getTimestampKey(organizationId), Date.now().toString());
        } catch (error) {
            logger.error('Error caching patients', error, 'PatientsCacheService');
        }
    }

    /**
     * Clear the patients cache
     */
    async clearCache(organizationId?: string): Promise<void> {
        try {
            localStorage.removeItem(this.getCacheKey(organizationId));
            localStorage.removeItem(this.getTimestampKey(organizationId));
        } catch (error) {
            logger.error('Error clearing patients cache', error, 'PatientsCacheService');
        }
    }

    /**
     * Get cache age in minutes
     */
    getCacheAgeMinutes(organizationId?: string): number {
        const timestamp = localStorage.getItem(this.getTimestampKey(organizationId));
        if (!timestamp) return Infinity;
        return Math.round((Date.now() - parseInt(timestamp, 10)) / 60000);
    }
}

export const patientsCacheService = new PatientsCacheService();
