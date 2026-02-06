/**
 * Offline Storage Hook with IndexedDB
 *
 * Provides comprehensive offline data persistence and synchronization capabilities
 * for patient analytics, session data, and queued actions.
 *
 * Features:
 * - Patient analytics caching with TTL
 * - Offline action queue with retry logic
 * - Session-based data caching
 * - Connection status monitoring
 * - Automatic sync on reconnect
 * - Storage quota management
 *
 * @module useOfflineStorage
 */


// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * IndexedDB schema for FisioFlow offline storage
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface FisioFlowDB extends DBSchema {
  /** Stores cached patient analytics data */
  patient_analytics: {
    key: string;
    value: {
      patientId: string;
      data: unknown;
      timestamp: number;
      version: number;
    };
    indexes: { 'by-timestamp': number };
  };
  /** Stores queued offline actions for sync */
  offline_actions: {
    key: string;
    value: {
      id: string;
      action: string;
      payload: unknown;
      timestamp: number;
      synced: boolean;
      retryCount: number;
    };
    indexes: { 'by-synced': boolean; 'by-timestamp': number };
  };
  /** Stores temporary session data with expiration */
  session_cache: {
    key: string;
    value: {
      sessionId: string;
      data: unknown;
      timestamp: number;
      expiresAt: number;
    };
    indexes: { 'by-expires': number };
  };
  /** Stores cached patients for offline access */
  patients: {
    key: string;
    value: unknown;
    indexes: { 'by-name': string };
  };
  /** Stores cached appointments for offline access */
  appointments: {
    key: string;
    value: unknown;
    indexes: { 'by-startTime': string; 'by-patientId': string };
  };
  /** Stores cached exercises for offline access */
  exercises: {
    key: string;
    value: unknown;
    indexes: { 'by-category': string };
  };
}

/**
 * Configuration options for offline storage
 */
export interface OfflineStorageOptions {
  /** Database name (default: 'FisioFlowOffline') */
  dbName?: string;
  /** Database version for migrations (default: 1) */
  dbVersion?: number;
  /** Cache expiration time in milliseconds (default: 24 hours) */
  cacheExpiryMs?: number;
  /** Maximum retry attempts for failed actions (default: 3) */
  maxRetryAttempts?: number;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  /** Number of successfully synced actions */
  successful: number;
  /** Number of failed sync actions */
  failed: number;
  /** Number of skipped actions */
  skipped: number;
}

/**
 * Storage quota information
 */
export interface StorageQuota {
  /** Current usage in bytes */
  usage: number;
  /** Total quota in bytes */
  quota: number;
  /** Usage percentage (0-100) */
  usagePercentage: number;
}

/**
 * Connection status information
 */
export interface ConnectionStatus {
  /** Whether currently online */
  isOnline: boolean;
  /** Whether sync is in progress */
  isSyncing: boolean;
  /** Number of pending actions */
  pendingActions: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default database name */
const DEFAULT_DB_NAME = 'FisioFlowOffline';

/** Default database version */
const DEFAULT_DB_VERSION = 2;

/** Default cache expiry: 24 hours */
const DEFAULT_CACHE_EXPIRY = 24 * 60 * 60 * 1000;

/** Default maximum retry attempts */
const DEFAULT_MAX_RETRY_ATTEMPTS = 3;

/** Action types that can be queued offline */
const OFFLINE_ACTION_TYPES = {
  CREATE_SESSION_METRICS: 'CREATE_SESSION_METRICS',
  UPDATE_GOAL: 'UPDATE_GOAL',
  CREATE_EVOLUTION: 'CREATE_EVOLUTION',
  UPDATE_RISK_SCORE: 'UPDATE_RISK_SCORE',
  UPDATE_PATIENT: 'UPDATE_PATIENT',
  CREATE_APPOINTMENT: 'CREATE_APPOINTMENT',
} as const;

// ============================================================================
// DATABASE INSTANCE
// ============================================================================

let dbInstance: IDBPDatabase<FisioFlowDB> | null = null;

/**
 * Gets or creates the IndexedDB instance
 * @returns Promise resolving to the database instance
 */
async function getDB(): Promise<IDBPDatabase<FisioFlowDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<FisioFlowDB>(DEFAULT_DB_NAME, DEFAULT_DB_VERSION, {
    upgrade(db) {
      // Patient analytics store
      if (!db.objectStoreNames.contains('patient_analytics')) {
        const analyticsStore = db.createObjectStore('patient_analytics', {
          keyPath: 'patientId',
        });
        analyticsStore.createIndex('by-timestamp', 'timestamp');
      }

      // Offline actions store
      if (!db.objectStoreNames.contains('offline_actions')) {
        const actionsStore = db.createObjectStore('offline_actions', {
          keyPath: 'id',
        });
        actionsStore.createIndex('by-synced', 'synced');
        actionsStore.createIndex('by-timestamp', 'timestamp');
      }

      // Session cache store
      if (!db.objectStoreNames.contains('session_cache')) {
        const sessionStore = db.createObjectStore('session_cache', {
          keyPath: 'sessionId',
        });
        sessionStore.createIndex('by-expires', 'expiresAt');
      }

      // Patients store
      if (!db.objectStoreNames.contains('patients')) {
        const patientsStore = db.createObjectStore('patients', { keyPath: 'id' });
        patientsStore.createIndex('by-name', 'name');
      }

      // Appointments store
      if (!db.objectStoreNames.contains('appointments')) {
        const apptStore = db.createObjectStore('appointments', { keyPath: 'id' });
        apptStore.createIndex('by-startTime', 'start_time');
        apptStore.createIndex('by-patientId', 'patient_id');
      }

      // Exercises store
      if (!db.objectStoreNames.contains('exercises')) {
        const exStore = db.createObjectStore('exercises', { keyPath: 'id' });
        exStore.createIndex('by-category', 'category');
      }
    },
  });

  return dbInstance;
}

/**
 * Resets the database instance (useful for testing or reinitialization)
 */
export function resetDBInstance(): void {
  dbInstance = null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculates if cached data is expired
 * @param timestamp - Cache timestamp
 * @param expiryMs - Expiry time in milliseconds
 * @returns Whether the cache is expired
 */
function isCacheExpired(timestamp: number, expiryMs: number): boolean {
  return Date.now() - timestamp > expiryMs;
}

/**
 * Generates a unique action ID
 * @param actionType - Type of action
 * @returns Unique action ID
 */
function generateActionId(actionType: string): string {
  return `${actionType}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Validates if an action can be retried
 * @param retryCount - Current retry count
 * @param maxRetries - Maximum allowed retries
 * @returns Whether the action can be retried
 */
function canRetryAction(retryCount: number, maxRetries: number): boolean {
  return retryCount < maxRetries;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook for managing offline storage and synchronization
 *
 * @example
 * ```tsx
 * const {
 *   isOnline,
 *   isSyncing,
 *   pendingActions,
 *   cachePatientAnalytics,
 *   getCachedPatientAnalytics,
 *   queueOfflineAction,
 *   syncPendingActions,
 * } = useOfflineStorage({
 *   cacheExpiryMs: 60 * 60 * 1000, // 1 hour
 * });
 * ```
 */
export function useOfflineStorage(options: OfflineStorageOptions = {}) {
  const {
    cacheExpiryMs = DEFAULT_CACHE_EXPIRY,
    maxRetryAttempts = DEFAULT_MAX_RETRY_ATTEMPTS,
  } = options;

  // ========================================================================
  // STATE
  // ========================================================================

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState(0);
  const [cachedPatients, setCachedPatients] = useState<string[]>([]);
  const syncInProgress = useRef(false);

  // ========================================================================
  // CONNECTION MONITORING
  // ========================================================================

  /**
   * Handles online event - triggers sync and shows notification
   */
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    toast.success('Conexão restaurada', {
      description: 'Sincronizando dados pendentes...',
    });
    syncPendingActions();
  }, [syncPendingActions]);

  /**
   * Handles offline event - shows warning notification
   */
  const handleOffline = useCallback(() => {
    setIsOnline(false);
    toast.warning('Você está offline', {
      description: 'As alterações serão sincronizadas quando reconectar.',
    });
  }, []);

  // Set up connection event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Load initial cache stats
  useEffect(() => {
    loadCacheStats();
  }, [loadCacheStats]);

  // ========================================================================
  // PATIENT ANALYTICS CACHE
  // ========================================================================

  /**
   * Caches patient analytics data
   * @param patientId - Patient identifier
   * @param data - Analytics data to cache
   */
  const cachePatientAnalytics = useCallback(
    async (patientId: string, data: unknown): Promise<void> => {
      try {
        const db = await getDB();
        await db.put('patient_analytics', {
          patientId,
          data,
          timestamp: Date.now(),
          version: 1,
        });
        await loadCacheStats();
      } catch (error) {
        logger.error('Error caching patient analytics', error, 'useOfflineStorage');
        throw error;
      }
    },
    [loadCacheStats]
  );

  /**
   * Retrieves cached patient analytics data
   * @param patientId - Patient identifier
   * @returns Cached analytics data or null if not found/expired
   */
  const getCachedPatientAnalytics = useCallback(
    async (patientId: string): Promise<unknown | null> => {
      try {
        const db = await getDB();
        const cached = await db.get('patient_analytics', patientId);

        if (!cached) return null;

        // Check if cache is expired
        if (isCacheExpired(cached.timestamp, cacheExpiryMs)) {
          await db.delete('patient_analytics', patientId);
          await loadCacheStats();
          return null;
        }

        return cached.data;
      } catch (error) {
        logger.error('Error getting cached analytics', error, 'useOfflineStorage');
        return null;
      }
    },
    [cacheExpiryMs, loadCacheStats]
  );

  /**
   * Clears cached patient analytics data
   * @param patientId - Optional patient ID to clear. If not provided, clears all.
   */
  const clearPatientCache = useCallback(
    async (patientId?: string): Promise<void> => {
      try {
        const db = await getDB();
        if (patientId) {
          await db.delete('patient_analytics', patientId);
        } else {
          await db.clear('patient_analytics');
        }
        await loadCacheStats();
      } catch (error) {
        logger.error('Error clearing cache', error, 'useOfflineStorage');
        throw error;
      }
    },
    [loadCacheStats]
  );

  /**
   * Gets all cached patient IDs
   * @returns Array of cached patient IDs
   */
  const getAllCachedPatients = useCallback(async (): Promise<string[]> => {
    try {
      const db = await getDB();
      const cachedIds: string[] = [];
      for await (const cursor of db.transaction('patient_analytics').store) {
        cachedIds.push(cursor.key);
      }
      return cachedIds;
    } catch (error) {
      logger.error('Error getting cached patients', error, 'useOfflineStorage');
      return [];
    }
  }, []);

  // ========================================================================
  // OFFLINE ACTIONS QUEUE
  // ========================================================================

  /**
   * Queues an offline action for later synchronization
   * @param action - Action type
   * @param payload - Action payload
   * @returns Generated action ID
   */
  const queueOfflineAction = useCallback(
    async (action: string, payload: unknown): Promise<string> => {
      try {
        const db = await getDB();
        const actionId = generateActionId(action);

        await db.add('offline_actions', {
          id: actionId,
          action,
          payload,
          timestamp: Date.now(),
          synced: false,
          retryCount: 0,
        });

        await loadCacheStats();
        toast.info('Ação salva para sincronização posterior');

        return actionId;
      } catch (error) {
        logger.error('Error queuing offline action', error, 'useOfflineStorage');
        throw error;
      }
    },
    [loadCacheStats]
  );

  /**
   * Gets all pending (unsynced) actions that haven't exceeded retry limit
   * @returns Array of pending actions
   */
  const getPendingActions = useCallback(async (): Promise<
    Array<{
      id: string;
      action: string;
      payload: unknown;
      timestamp: number;
      synced: boolean;
      retryCount: number;
    }>
  > => {
    try {
      const db = await getDB();
      const tx = db.transaction('offline_actions', 'readonly');
      const index = tx.store.index('by-synced');
      const actions = await index.getAll(false);

      return actions.filter((a) => canRetryAction(a.retryCount, maxRetryAttempts));
    } catch (error) {
      logger.error('[OfflineStorage] Error getting pending actions', error, 'useOfflineStorage');
      return [];
    }
  }, [maxRetryAttempts]);

  /**
   * Synchronizes all pending offline actions
   * @returns Sync result with success/failure counts
   */
  const syncPendingActions = useCallback(async (): Promise<SyncResult> => {
    if (!isOnline || syncInProgress.current) {
      return { successful: 0, failed: 0, skipped: 0 };
    }

    syncInProgress.current = true;
    setIsSyncing(true);

    const result: SyncResult = { successful: 0, failed: 0, skipped: 0 };

    try {
      const actions = await getPendingActions();

      if (actions.length === 0) {
        return result;
      }

      // Process each action
      for (const action of actions) {
        try {
          // Execute the action (placeholder - replace with actual API calls)
          await executeAction(action.action, action.payload);

          const db = await getDB();
          await db.delete('offline_actions', action.id);

          result.successful++;
        } catch (error) {
          const db = await getDB();
          const updatedAction = {
            ...action,
            retryCount: action.retryCount + 1,
          };

          if (canRetryAction(updatedAction.retryCount, maxRetryAttempts)) {
            await db.put('offline_actions', updatedAction);
          } else {
            await db.delete('offline_actions', action.id);
          }

          result.failed++;
          logger.error('[OfflineStorage] Action failed', error, 'useOfflineStorage');
        }
      }

      await loadCacheStats();

      // Show summary toast
      if (result.successful > 0) {
        toast.success(`${result.successful} ações sincronizadas com sucesso`);
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} ações falharam ao sincronizar`, {
          description: 'Elas serão tentadas novamente.',
        });
      }
    } catch (error) {
      logger.error('[OfflineStorage] Sync error', error, 'useOfflineStorage');
      result.skipped = pendingActions;
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
    }

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, pendingActions, getPendingActions, maxRetryAttempts]);

  /**
   * Executes an offline action (placeholder - replace with actual API calls)
   * @param actionType - Type of action to execute
   * @param payload - Action payload
   */
  async function executeAction(actionType: string, _payload: unknown): Promise<void> {
    // This is a placeholder for actual API calls
    // In production, this would make the appropriate request based on actionType

    switch (actionType) {
      case OFFLINE_ACTION_TYPES.CREATE_SESSION_METRICS:
        // POST /api/patient-session-metrics
        break;
      case OFFLINE_ACTION_TYPES.UPDATE_GOAL:
        // PATCH /api/patient-goals/{id}
        break;
      case OFFLINE_ACTION_TYPES.CREATE_EVOLUTION:
        // POST /api/patient-evolution
        break;
      case OFFLINE_ACTION_TYPES.UPDATE_RISK_SCORE:
        // POST /api/patient-risk-scores
        break;
      default:
        logger.warn('[OfflineStorage] Unknown action type', { actionType }, 'useOfflineStorage');
    }

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // ========================================================================
  // SESSION CACHE
  // ========================================================================

  /**
   * Caches session data with optional expiration
   * @param sessionId - Session identifier
   * @param data - Data to cache
   * @param expiryMs - Time until expiration in milliseconds
   */
  const cacheSessionData = useCallback(
    async (
      sessionId: string,
      data: unknown,
      expiryMs: number = DEFAULT_CACHE_EXPIRY
    ): Promise<void> => {
      try {
        const db = await getDB();
        await db.put('session_cache', {
          sessionId,
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + expiryMs,
        });
      } catch (error) {
        logger.error('[OfflineStorage] Error caching session data', error, 'useOfflineStorage');
        throw error;
      }
    },
    []
  );

  /**
   * Retrieves cached session data
   * @param sessionId - Session identifier
   * @returns Cached session data or null if not found/expired
   */
  const getCachedSessionData = useCallback(
    async (sessionId: string): Promise<unknown | null> => {
      try {
        const db = await getDB();
        const cached = await db.get('session_cache', sessionId);

        if (!cached) return null;

        // Check if expired
        if (Date.now() > cached.expiresAt) {
          await db.delete('session_cache', sessionId);
          return null;
        }

        return cached.data;
      } catch (error) {
        logger.error('[OfflineStorage] Error getting cached session data', error, 'useOfflineStorage');
        return null;
      }
    },
    []
  );

  /**
   * Removes a specific session from cache
   * @param sessionId - Session identifier
   */
  const removeSessionData = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const db = await getDB();
      await db.delete('session_cache', sessionId);
    } catch (error) {
      logger.error('[OfflineStorage] Error removing session data', error, 'useOfflineStorage');
    }
  }, []);

  /**
   * Clears all expired sessions from cache
   * @returns Number of sessions cleared
   */
  const clearExpiredSessions = useCallback(async (): Promise<number> => {
    try {
      const db = await getDB();
      const tx = db.transaction('session_cache', 'readwrite');
      const index = tx.store.index('by-expires');
      const now = Date.now();
      const expiredKeys: string[] = [];

      for await (const cursor of index.iterate()) {
        if (cursor.value.expiresAt < now) {
          expiredKeys.push(cursor.primaryKey as string);
        }
      }

      for (const key of expiredKeys) {
        await db.delete('session_cache', key);
      }

      return expiredKeys.length;
    } catch (error) {
      logger.error('[OfflineStorage] Error clearing expired sessions', error, 'useOfflineStorage');
      return 0;
    }
  }, []);

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Loads cache statistics from IndexedDB
   */
  const loadCacheStats = useCallback(async (): Promise<void> => {
    try {
      const db = await getDB();

      // Count cached patients
      await db.count('patient_analytics');
      const cachedIds = await getAllCachedPatients();
      setCachedPatients(cachedIds);

      // Count pending actions
      const tx = db.transaction('offline_actions', 'readonly');
      const index = tx.store.index('by-synced');
      const pending = await index.count(false);
      setPendingActions(pending);
    } catch (error) {
      logger.error('[OfflineStorage] Error loading cache stats', error, 'useOfflineStorage');
    }
  }, [getAllCachedPatients]);

  /**
   * Clears all cached data (except pending actions)
   */
  const clearAllCache = useCallback(async (): Promise<void> => {
    try {
      const db = await getDB();
      await db.clear('patient_analytics');
      await db.clear('session_cache');
      await loadCacheStats();
      toast.success('Cache limpo com sucesso');
    } catch (error) {
      logger.error('[OfflineStorage] Error clearing cache', error, 'useOfflineStorage');
      toast.error('Erro ao limpar cache');
      throw error;
    }
  }, [loadCacheStats]);

  /**
   * Gets current storage quota information
   * @returns Storage quota details or null if not supported
   */
  const getStorageSize = useCallback(async (): Promise<StorageQuota | null> => {
    try {
      if (
        typeof navigator !== 'undefined' &&
        'storage' in navigator &&
        'estimate' in navigator.storage
      ) {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          usagePercentage:
            estimate.usage && estimate.quota
              ? Math.round((estimate.usage / estimate.quota) * 100)
              : 0,
        };
      }
      return null;
    } catch (error) {
      logger.error('[OfflineStorage] Error getting storage size', error, 'useOfflineStorage');
      return null;
    }
  }, []);

  /**
   * Exports all cached data as JSON
   * @returns Object containing all cached data
   */
  const exportAllData = useCallback(async (): Promise<{
    patientAnalytics: Array<{ patientId: string; data: unknown; timestamp: number }>;
    offlineActions: Array<{ id: string; action: string; payload: unknown; timestamp: number }>;
    sessionCache: Array<{ sessionId: string; data: unknown; expiresAt: number }>;
  }> => {
    try {
      const db = await getDB();

      const patientAnalytics = await db.getAll('patient_analytics');
      const offlineActions = await db.getAll('offline_actions');
      const sessionCache = await db.getAll('session_cache');

      return {
        patientAnalytics: patientAnalytics.map((a) => ({
          patientId: a.patientId,
          data: a.data,
          timestamp: a.timestamp,
        })),
        offlineActions: offlineActions.map((a) => ({
          id: a.id,
          action: a.action,
          payload: a.payload,
          timestamp: a.timestamp,
        })),
        sessionCache: sessionCache.map((s) => ({
          sessionId: s.sessionId,
          data: s.data,
          expiresAt: s.expiresAt,
        })),
      };
    } catch (error) {
      logger.error('[OfflineStorage] Error exporting data', error, 'useOfflineStorage');
      throw error;
    }
  }, []);

  /**
   * Clears failed actions that have exceeded retry limit
   * @returns Number of actions cleared
   */
  const clearFailedActions = useCallback(async (): Promise<number> => {
    try {
      const db = await getDB();
      const tx = db.transaction('offline_actions', 'readwrite');
      let clearedCount = 0;

      for await (const cursor of tx.store) {
        if (cursor.value.retryCount >= maxRetryAttempts && !cursor.value.synced) {
          await cursor.delete();
          clearedCount++;
        }
      }

      if (clearedCount > 0) {
        await loadCacheStats();
      }

      return clearedCount;
    } catch (error) {
      logger.error('[OfflineStorage] Error clearing failed actions', error, 'useOfflineStorage');
      return 0;
    }
  }, [maxRetryAttempts, loadCacheStats]);

  // ========================================================================
  // RETURN VALUE
  // ========================================================================

  return {
    // Connection status
    isOnline,
    isSyncing,
    pendingActions,

    // Patient analytics cache
    cachePatientAnalytics,
    getCachedPatientAnalytics,
    clearPatientCache,
    cachedPatients,
    getAllCachedPatients,

    // Offline actions
    queueOfflineAction,
    syncPendingActions,
    clearFailedActions,

    // Session cache
    cacheSessionData,
    getCachedSessionData,
    removeSessionData,
    clearExpiredSessions,

    // Utilities
    clearAllCache,
    getStorageSize,
    exportAllData,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { getDB };
export type { FisioFlowDB, OfflineStorageOptions, SyncResult, StorageQuota, ConnectionStatus };
export { OFFLINE_ACTION_TYPES };
