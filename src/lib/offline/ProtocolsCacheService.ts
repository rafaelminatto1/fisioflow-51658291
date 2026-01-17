/**
 * Serviço de cache para protocolos
 * Gerencia persistência offline e fallback automaticamente
 */
import { dbStore } from './IndexedDBStore';
import type { ExerciseProtocol } from '@/hooks/useExerciseProtocols';
import { logger } from '@/lib/errors/logger';

const CACHE_KEY = 'protocols_cache_metadata';
const STORE_NAME = 'exercise_protocols';
const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias (protocolos mudam pouco)
const EMERGENCY_CACHE_KEY = 'protocols_emergency_backup';

export interface CacheMetadata {
    lastUpdated: string;
    count: number;
    version: number;
    expiresAt: string;
}

export interface CacheResult {
    data: ExerciseProtocol[];
    metadata: CacheMetadata | null;
    isExpired: boolean;
    isStale: boolean;
    source: 'indexeddb' | 'localstorage' | 'none';
}

class ProtocolsCacheService {
    private initialized = false;
    private readonly CACHE_VERSION = 1;
    // Protocolos são dados estáticos, então "stale" é menos crítico, 
    // mas vamos considerar stale após 24h para tentar refresh em background
    private readonly STALE_THRESHOLD_MS = 1000 * 60 * 60 * 24;

    async init(): Promise<void> {
        if (this.initialized) return;
        try {
            await dbStore.init();
            this.initialized = true;
            logger.debug('ProtocolsCacheService inicializado', {}, 'ProtocolsCacheService');
        } catch (error) {
            logger.error('Erro ao inicializar ProtocolsCacheService', error, 'ProtocolsCacheService');
            // Não relança erro para permitir fallback
        }
    }

    /**
     * Salva protocolos no cache local com metadata
     */
    async saveToCache(protocols: ExerciseProtocol[], ttlMs: number = DEFAULT_CACHE_TTL_MS): Promise<void> {
        try {
            await this.init();

            const now = new Date();
            const expiresAt = new Date(now.getTime() + ttlMs);

            // Limpar cache anterior
            await dbStore.clear(STORE_NAME);

            if (protocols.length > 0) {
                // Salvar no IndexedDB
                await dbStore.putAll(STORE_NAME, protocols);

                // Salvar backup de emergência no localStorage (apenas dados essenciais se for muito grande)
                this.saveEmergencyBackup(protocols);
            }

            // Salvar metadata
            const metadata: CacheMetadata = {
                lastUpdated: now.toISOString(),
                count: protocols.length,
                version: this.CACHE_VERSION,
                expiresAt: expiresAt.toISOString(),
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(metadata));

            logger.info('Cache de protocolos atualizado', {
                count: protocols.length,
                expiresAt: expiresAt.toISOString()
            }, 'ProtocolsCacheService');
        } catch (error) {
            logger.error('Erro ao salvar cache de protocolos', error, 'ProtocolsCacheService');
        }
    }

    /**
     * Salva backup de emergência no localStorage
     * Útil se IndexedDB falhar ou não estiver disponível
     */
    private saveEmergencyBackup(protocols: ExerciseProtocol[]) {
        try {
            // Se for muitos dados, pode estourar localStorage, então cuidado
            // Protocolos costumam ter texto e JSONs grandes.
            // Vamos tentar salvar, mas com catch.
            const backup = {
                data: protocols,
                timestamp: new Date().toISOString(),
                count: protocols.length
            };
            localStorage.setItem(EMERGENCY_CACHE_KEY, JSON.stringify(backup));
        } catch (e) {
            logger.warn('Não foi possível salvar backup de emergência de protocolos (provavelmente quota excedida)', e, 'ProtocolsCacheService');
        }
    }

    private getEmergencyBackup(): CacheResult {
        try {
            const backupStr = localStorage.getItem(EMERGENCY_CACHE_KEY);
            if (!backupStr) return { data: [], metadata: null, isExpired: true, isStale: true, source: 'none' };

            const backup = JSON.parse(backupStr);
            return {
                data: backup.data || [],
                metadata: {
                    lastUpdated: backup.timestamp,
                    count: backup.count || 0,
                    version: this.CACHE_VERSION,
                    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() // Fake expiry
                },
                isExpired: false, // Backup é sempre considerado "melhor que nada"
                isStale: true,
                source: 'localstorage'
            };
        } catch {
            return { data: [], metadata: null, isExpired: true, isStale: true, source: 'none' };
        }
    }

    /**
     * Recupera protocolos do cache local com fallback
     */
    async getFromCache(): Promise<CacheResult> {
        const emptyResult: CacheResult = {
            data: [],
            metadata: null,
            isExpired: true,
            isStale: true,
            source: 'none'
        };

        try {
            await this.init();

            const metadata = this.getCacheMetadata();

            // 1. Tentar IndexedDB se metadata existir
            if (metadata && metadata.version === this.CACHE_VERSION) {
                try {
                    const cachedData = await dbStore.getAll<ExerciseProtocol>(STORE_NAME);

                    if (cachedData && cachedData.length > 0) {
                        const now = new Date();
                        const lastUpdated = new Date(metadata.lastUpdated);
                        const isStale = now.getTime() - lastUpdated.getTime() > this.STALE_THRESHOLD_MS;

                        logger.info('Protocolos recuperados do IndexedDB', { count: cachedData.length }, 'ProtocolsCacheService');

                        return {
                            data: cachedData,
                            metadata,
                            isExpired: false,
                            isStale,
                            source: 'indexeddb'
                        };
                    }
                } catch (dbError) {
                    logger.error('Falha ao ler IndexedDB, tentando backup', dbError, 'ProtocolsCacheService');
                }
            }

            // 2. Fallback para LocalStorage
            const backup = this.getEmergencyBackup();
            if (backup.source === 'localstorage' && backup.data.length > 0) {
                logger.warn('Usando backup de emergência para protocolos', { count: backup.data.length }, 'ProtocolsCacheService');
                return backup;
            }

            return emptyResult;
        } catch (error) {
            logger.error('Erro geral ao recuperar cache de protocolos', error, 'ProtocolsCacheService');
            // Tentar backup uma última vez em caso de erro no init()
            return this.getEmergencyBackup();
        }
    }

    getCacheMetadata(): CacheMetadata | null {
        try {
            const metadataStr = localStorage.getItem(CACHE_KEY);
            return metadataStr ? JSON.parse(metadataStr) : null;
        } catch {
            return null;
        }
    }
}

export const protocolsCacheService = new ProtocolsCacheService();
