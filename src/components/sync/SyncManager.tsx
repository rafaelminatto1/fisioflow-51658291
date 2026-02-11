/**
 * SyncManager Component
 *
 * Gerencia sincronização offline/online da aplicação.
 * Componente lógico que não renderiza UI, apenas coordena o sync.
 *
 * Funcionalidades:
 * - Cache de dados críticos ao ficar online
 * - Sincronização automática periódica
 * - Retentativa em caso de falha
 * - Monitoramento de status de conexão
 */

import { useEffect, useRef, useCallback } from 'react';
import { useOfflineSync } from '@/services/offlineSync';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

const SYNC_MANAGER_VERSION = '1.1.0';

interface SyncManagerOptions {
	/** Intervalo entre sincronizações em ms (padrão: 60000 = 1 minuto) */
	syncInterval?: number;
	/** Mostrar notificações toast (padrão: true) */
	showNotifications?: boolean;
	/** Habilitar cache de dados críticos (padrão: true) */
	enableCriticalDataCache?: boolean;
	/** Habilitar logging detalhado (padrão: false em produção) */
	verboseLogging?: boolean;
}

const DEFAULT_OPTIONS: Required<SyncManagerOptions> = {
	syncInterval: 60000,
	showNotifications: true,
	enableCriticalDataCache: true,
	verboseLogging: import.meta.env.DEV,
};

/**
 * Componente SyncManager - Gerencia sincronização offline/online
 *
 * Este componente não renderiza nada visualmente, apenas:
 * 1. Monitora mudanças de status online/offline
 * 2. Dispara cache de dados críticos quando online
 * 3. Coordena sincronizações periódicas
 *
 * @example
 * ```tsx
 * <SyncManager />
 * ```
 */
export function SyncManager(userOptions: SyncManagerOptions = {}) {
	const options = { ...DEFAULT_OPTIONS, ...userOptions };

	const { stats, syncNow, isOnline, cacheCriticalData, startSync, stopSync } = useOfflineSync({
		syncInterval: options.syncInterval,
		showNotifications: options.showNotifications,
	});

	const { connectionType } = useConnectionStatus();

	// Refs para evitar chamadas duplicadas
	const isCachingRef = useRef(false);
	const lastSyncTimeRef = useRef<number>(0);
	const initialCacheDoneRef = useRef(false);

	/**
	 * Função para fazer cache de dados críticos com retry
	 */
	const performCriticalDataCache = useCallback(async (retryCount = 0): Promise<boolean> => {
		if (isCachingRef.current) {
			if (options.verboseLogging) {
				logger.debug('[SyncManager] Cache já em progresso, pulando', {}, 'SyncManager');
			}
			return false;
		}

		isCachingRef.current = true;

		try {
			if (options.verboseLogging) {
				logger.info('[SyncManager] Iniciando cache de dados críticos', {
					retryCount,
					connectionType,
				}, 'SyncManager');
			}

			await cacheCriticalData();

			if (options.verboseLogging) {
				logger.info('[SyncManager] Cache de dados críticos concluído', {
					pendingActions: stats.pendingActions,
				}, 'SyncManager');
			}

			return true;
		} catch (error) {
			logger.error('[SyncManager] Erro ao fazer cache de dados críticos', {
				error: error instanceof Error ? error.message : String(error),
				retryCount,
			}, 'SyncManager');

			// Retry com backoff exponencial (máximo 3 tentativas)
			if (retryCount < 3) {
				const delay = Math.pow(2, retryCount) * 1000;
				if (options.verboseLogging) {
					logger.info(`[SyncManager] Tentando novamente em ${delay}ms`, { retryCount: retryCount + 1 }, 'SyncManager');
				}
				await new Promise(resolve => setTimeout(resolve, delay));
				return performCriticalDataCache(retryCount + 1);
			}

			return false;
		} finally {
			isCachingRef.current = false;
		}
	}, [cacheCriticalData, stats.pendingActions, connectionType, options.verboseLogging]);

	/**
	 * Função para forçar sincronização imediata
	 */
	const forceSyncNow = useCallback(async (): Promise<void> => {
		const now = Date.now();
		const timeSinceLastSync = now - lastSyncTimeRef.current;

		// Evitar syncs muito frequentes (mínimo 5 segundos)
		if (timeSinceLastSync < 5000) {
			if (options.verboseLogging) {
				logger.debug('[SyncManager] Sync muito recente, ignorando', {
					timeSinceLastSync,
				}, 'SyncManager');
			}
			return;
		}

		try {
			if (options.verboseLogging) {
				logger.info('[SyncManager] Forçando sincronização', {
					pendingActions: stats.pendingActions,
				}, 'SyncManager');
			}

			const result = await syncNow();
			lastSyncTimeRef.current = now;

			if (options.verboseLogging) {
				logger.info('[SyncManager] Sincronização concluída', {
					result,
					stats,
				}, 'SyncManager');
			}
		} catch (error) {
			logger.error('[SyncManager] Erro na sincronização forçada', {
				error: error instanceof Error ? error.message : String(error),
			}, 'SyncManager');
		}
	}, [syncNow, stats, options.verboseLogging]);

	// Inicialização: fazer cache inicial quando online
	useEffect(() => {
		if (!options.enableCriticalDataCache) {
			return;
		}

		if (isOnline && !initialCacheDoneRef.current) {
			if (options.verboseLogging) {
				logger.info('[SyncManager] Primeira inicialização online', {}, 'SyncManager');
			}

			// Pequeno delay para evitar conflitos com outras inicializações
			const timer = setTimeout(() => {
				performCriticalDataCache().then(success => {
					if (success) {
						initialCacheDoneRef.current = true;
						if (options.verboseLogging) {
							logger.info('[SyncManager] Cache inicial concluído', {}, 'SyncManager');
						}
					}
				});
			}, 2000);

			return () => clearTimeout(timer);
		}
	}, [isOnline, options.enableCriticalDataCache, options.verboseLogging, performCriticalDataCache]);

	// Cache de dados críticos quando voltar a ficar online
	useEffect(() => {
		if (!options.enableCriticalDataCache || !isOnline) {
			return;
		}

		// Só fazer cache se a transição foi de offline para online
		const handleOnline = () => {
			if (options.verboseLogging) {
				logger.info('[SyncManager] Transição offline → online detectada', {
					connectionType,
				}, 'SyncManager');
			}

			// Delay para garantir que a conexão está estável
			const timer = setTimeout(() => {
				performCriticalDataCache();
			}, 1000);

			return () => clearTimeout(timer);
		};

		// Usar event listener para capturar a transição
		window.addEventListener('online', handleOnline);

		return () => {
			window.removeEventListener('online', handleOnline);
		};
	}, [isOnline, connectionType, options.enableCriticalDataCache, options.verboseLogging, performCriticalDataCache]);

	// Logging de mudanças de status
	useEffect(() => {
		if (options.verboseLogging && stats.pendingActions > 0) {
			logger.info('[SyncManager] Status de sync atualizado', {
				pendingActions: stats.pendingActions,
				totalActions: stats.totalActions,
				syncedActions: stats.syncedActions,
				failedActions: stats.failedActions,
				lastSyncTime: stats.lastSyncTime,
			}, 'SyncManager');
		}
	}, [stats.pendingActions, stats.totalActions, stats.syncedActions, stats.failedActions, stats.lastSyncTime, options.verboseLogging]);

	// Expor função global para debugging (apenas em DEV)
	useEffect(() => {
		if (import.meta.env.DEV && typeof window !== 'undefined') {
			(window as unknown).__fisioflow_sync_manager__ = {
				stats,
				isOnline,
				syncNow: forceSyncNow,
				cacheCriticalData: performCriticalDataCache,
				version: SYNC_MANAGER_VERSION,
			};

			if (options.verboseLogging) {
				logger.info('[SyncManager] API exposta em window.__fisioflow_sync_manager__', {
					version: SYNC_MANAGER_VERSION,
				}, 'SyncManager');
			}
		}

		return () => {
			if (import.meta.env.DEV && typeof window !== 'undefined') {
				delete (window as unknown).__fisioflow_sync_manager__;
			}
		};
	}, [stats, isOnline, forceSyncNow, performCriticalDataCache, options.verboseLogging]);

	// Cleanup ao desmontar
	useEffect(() => {
		return () => {
			if (options.verboseLogging) {
				logger.info('[SyncManager] Componente desmontado', {
					stats,
					isOnline,
				}, 'SyncManager');
			}
		};
	}, [stats, isOnline, options.verboseLogging]);

	// Este componente não renderiza nada
	return null;
}

/**
 * Hook para usar o SyncManager programaticamente
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { forceSync, isCaching, stats } = useSyncManager();
 *
 *   return (
 *     <button onClick={forceSync}>
 *       Sync Now ({stats.pendingActions} pending)
 *     </button>
 *   );
 * }
 * ```
 */
export function useSyncManager() {
	const { stats, syncNow, isOnline, cacheCriticalData } = useOfflineSync({
		syncInterval: 60000,
		showNotifications: true,
	});

	const forceSync = useCallback(async () => {
		return syncNow();
	}, [syncNow]);

	const forceCache = useCallback(async () => {
		return cacheCriticalData();
	}, [cacheCriticalData]);

	return {
		stats,
		isOnline,
		forceSync,
		forceCache,
		isCaching: false, // TODO: Adicionar estado de caching se necessário
	};
}
