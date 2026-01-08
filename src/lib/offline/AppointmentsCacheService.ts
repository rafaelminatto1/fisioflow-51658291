/**
 * Serviço de cache para agendamentos
 * Gerencia persistência offline e fallback automático
 * 
 * Melhorias:
 * - Cache com expiração configurável
 * - Validação de integridade do cache
 * - Suporte a múltiplas organizações
 * - Logging detalhado para debug
 */
import { dbStore } from './IndexedDBStore';
import type { AppointmentBase } from '@/types/appointment';
import { logger } from '@/lib/errors/logger';

const CACHE_KEY = 'appointments_cache_metadata';
const STORE_NAME = 'appointments';
const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 horas

export interface CacheMetadata {
    lastUpdated: string;
    count: number;
    organizationId?: string;
    version: number;
    expiresAt: string;
}

export interface CacheResult {
    data: AppointmentBase[];
    metadata: CacheMetadata | null;
    isExpired: boolean;
    isStale: boolean;
}

class AppointmentsCacheService {
    private initialized = false;
    private readonly CACHE_VERSION = 1;
    private readonly STALE_THRESHOLD_MS = 1000 * 60 * 5; // 5 minutos = stale

    async init(): Promise<void> {
        if (this.initialized) return;
        try {
            await dbStore.init();
            this.initialized = true;
            logger.debug('AppointmentsCacheService inicializado', {}, 'AppointmentsCacheService');
        } catch (error) {
            logger.error('Erro ao inicializar AppointmentsCacheService', error, 'AppointmentsCacheService');
            throw error;
        }
    }

    /**
     * Salva agendamentos no cache local com metadata
     */
    async saveToCache(appointments: AppointmentBase[], organizationId?: string, ttlMs: number = DEFAULT_CACHE_TTL_MS): Promise<void> {
        try {
            await this.init();

            const now = new Date();
            const expiresAt = new Date(now.getTime() + ttlMs);

            // Limpar cache anterior e salvar novos dados
            await dbStore.clear(STORE_NAME);

            if (appointments.length > 0) {
                // Converter para formato serializável com ID garantido
                const serializableAppointments = appointments.map(apt => ({
                    ...apt,
                    id: apt.id, // Garantir que ID existe (keyPath do IndexedDB)
                    date: apt.date instanceof Date ? apt.date.toISOString() : apt.date,
                    createdAt: apt.createdAt instanceof Date ? apt.createdAt.toISOString() : apt.createdAt,
                    updatedAt: apt.updatedAt instanceof Date ? apt.updatedAt.toISOString() : apt.updatedAt,
                    _cachedAt: now.toISOString(),
                }));

                await dbStore.putAll(STORE_NAME, serializableAppointments);
            }

            // Salvar metadata
            const metadata: CacheMetadata = {
                lastUpdated: now.toISOString(),
                count: appointments.length,
                organizationId,
                version: this.CACHE_VERSION,
                expiresAt: expiresAt.toISOString(),
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(metadata));

            logger.info('Cache atualizado', {
                count: appointments.length,
                organizationId,
                expiresAt: expiresAt.toISOString()
            }, 'AppointmentsCacheService');
        } catch (error) {
            logger.error('Erro ao salvar cache', error, 'AppointmentsCacheService');
        }
    }

    /**
     * Recupera agendamentos do cache local com validações
     */
    async getFromCache(organizationId?: string): Promise<CacheResult> {
        const emptyResult: CacheResult = {
            data: [],
            metadata: null,
            isExpired: true,
            isStale: true
        };

        try {
            await this.init();

            const metadata = this.getCacheMetadata();

            // Verificar se existe metadata
            if (!metadata) {
                logger.debug('Sem cache disponível', {}, 'AppointmentsCacheService');
                return emptyResult;
            }

            // Verificar versão do cache
            if (metadata.version !== this.CACHE_VERSION) {
                logger.warn('Cache com versão incompatível, limpando', {
                    cacheVersion: metadata.version,
                    currentVersion: this.CACHE_VERSION
                }, 'AppointmentsCacheService');
                await this.clearCache();
                return emptyResult;
            }

            // Verificar organização (se especificada)
            if (organizationId && metadata.organizationId !== organizationId) {
                logger.debug('Cache de outra organização', {
                    cacheOrg: metadata.organizationId,
                    requestedOrg: organizationId
                }, 'AppointmentsCacheService');
                return emptyResult;
            }

            // Calcular estados do cache
            const now = new Date();
            const lastUpdated = new Date(metadata.lastUpdated);
            const expiresAt = new Date(metadata.expiresAt);
            const isExpired = now > expiresAt;
            const isStale = now.getTime() - lastUpdated.getTime() > this.STALE_THRESHOLD_MS;

            // Recuperar dados
            const cachedData = await dbStore.getAll<any>(STORE_NAME);

            if (!cachedData || cachedData.length === 0) {
                return emptyResult;
            }

            // Converter datas de volta para objetos Date
            const appointments: AppointmentBase[] = cachedData.map(apt => ({
                ...apt,
                date: apt.date ? new Date(apt.date) : new Date(),
                createdAt: apt.createdAt ? new Date(apt.createdAt) : new Date(),
                updatedAt: apt.updatedAt ? new Date(apt.updatedAt) : new Date(),
            }));

            logger.info('Cache recuperado', {
                count: appointments.length,
                isExpired,
                isStale,
                ageMinutes: Math.round((now.getTime() - lastUpdated.getTime()) / 60000)
            }, 'AppointmentsCacheService');

            return { data: appointments, metadata, isExpired, isStale };
        } catch (error) {
            logger.error('Erro ao recuperar cache', error, 'AppointmentsCacheService');
            return emptyResult;
        }
    }

    /**
     * Obtém metadata do cache de forma síncrona
     */
    getCacheMetadata(): CacheMetadata | null {
        try {
            const metadataStr = localStorage.getItem(CACHE_KEY);
            return metadataStr ? JSON.parse(metadataStr) : null;
        } catch {
            return null;
        }
    }

    /**
     * Verifica se cache existe e não está expirado
     */
    hasValidCache(organizationId?: string): boolean {
        const metadata = this.getCacheMetadata();
        if (!metadata) return false;
        if (metadata.version !== this.CACHE_VERSION) return false;
        if (organizationId && metadata.organizationId !== organizationId) return false;
        if (new Date() > new Date(metadata.expiresAt)) return false;
        return metadata.count > 0;
    }

    /**
     * Limpa o cache completamente
     */
    async clearCache(): Promise<void> {
        try {
            await this.init();
            await dbStore.clear(STORE_NAME);
            localStorage.removeItem(CACHE_KEY);
            logger.info('Cache limpo', {}, 'AppointmentsCacheService');
        } catch (error) {
            logger.error('Erro ao limpar cache', error, 'AppointmentsCacheService');
        }
    }

    /**
     * Retorna idade do cache em minutos
     */
    getCacheAgeMinutes(): number | null {
        const metadata = this.getCacheMetadata();
        if (!metadata) return null;
        const lastUpdated = new Date(metadata.lastUpdated);
        return Math.round((Date.now() - lastUpdated.getTime()) / 60000);
    }
}

// Singleton
export const appointmentsCacheService = new AppointmentsCacheService();
