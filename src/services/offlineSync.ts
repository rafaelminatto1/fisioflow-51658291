/**
 * Offline Sync Service - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('appointments') → Firestore collection 'appointments'
 * - supabase.from('exercises') → Firestore collection 'exercises'
 * - Uses IndexedDB for offline caching
 */

import { getDB, type FisioFlowDB } from '@/hooks/useOfflineStorage';
import { toast } from 'sonner';
import type { IDBPDatabase } from 'idb';
import { db } from '@/integrations/firebase/app';
import { collection, getDocs, query, where, orderBy, limit as limitClause } from 'firebase/firestore';
import { logger } from '@/lib/errors/logger';

// const db = getFirebaseDb(); // Moved inside functions

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

// Type for payloads that include an id property
interface PayloadWithId {
  id: string | number;
  [key: string]: unknown;
}

/**
 * Configuration options for the sync service
 */
export interface SyncConfig {
  /** Milliseconds between sync attempts when online (default: 60000 = 1 minute) */
  syncInterval?: number;
  /** Milliseconds between retry attempts for failed actions (default: 300000 = 5 minutes) */
  retryInterval?: number;
  /** Maximum concurrent sync operations (default: 5) */
  maxConcurrent?: number;
  /** Master switch for sync (default: true) */
  enabled?: boolean;
  /** Maximum number of retry attempts per action (default: 3) */
  maxRetries?: number;
  /** Whether to show toast notifications (default: true) */
  showNotifications?: boolean;
}

/**
 * Queued offline action
 */
export interface QueuedAction {
  /** Unique action identifier */
  id: string;
  /** Action type (e.g., 'CREATE_SESSION_METRICS') */
  action: string;
  /** Action payload */
  payload: unknown;
  /** Creation timestamp */
  timestamp: number;
  /** Whether action has been synced */
  synced: boolean;
  /** Current retry count */
  retryCount: number;
}

/**
 * Sync statistics
 */
export interface SyncStats {
  /** Total actions in storage */
  totalActions: number;
  /** Actions pending sync */
  pendingActions: number;
  /** Successfully synced actions */
  syncedActions: number;
  /** Actions that failed after max retries */
  failedActions: number;
  /** Last sync timestamp */
  lastSyncTime?: number;
  /** Whether last sync was successful */
  lastSyncSuccess?: boolean;
}

/**
 * Sync event types
 */
export type SyncEventType = 'sync_start' | 'sync_complete' | 'sync_error' | 'action_success' | 'action_failure';

/**
 * Sync event payload
 */
export interface SyncEvent {
  /** Event type */
  type: SyncEventType;
  /** Event timestamp */
  timestamp: number;
  /** Event data */
  data?: {
    actionId?: string;
    actionType?: string;
    error?: Error;
    stats?: SyncStats;
  };
}

/**
 * Sync event listener callback
 */
export type SyncEventListener = (event: SyncEvent) => void;

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default sync interval: 1 minute */
const DEFAULT_SYNC_INTERVAL = 60000;

/** Default retry interval: 5 minutes */
const DEFAULT_RETRY_INTERVAL = 300000;

/** Default max concurrent operations */
const DEFAULT_MAX_CONCURRENT = 5;

/** Default max retry attempts */
const DEFAULT_MAX_RETRIES = 3;

/** Minimum sync interval: 10 seconds */
const MIN_SYNC_INTERVAL = 10000;

/** Maximum sync interval: 10 minutes */
const MAX_SYNC_INTERVAL = 600000;

/** Action type constants */
export const ACTION_TYPES = {
  CREATE_SESSION_METRICS: 'CREATE_SESSION_METRICS',
  UPDATE_GOAL: 'UPDATE_GOAL',
  CREATE_EVOLUTION: 'CREATE_EVOLUTION',
  UPDATE_RISK_SCORE: 'UPDATE_RISK_SCORE',
  UPDATE_PATIENT: 'UPDATE_PATIENT',
  CREATE_APPOINTMENT: 'CREATE_APPOINTMENT',
  UPDATE_APPOINTMENT: 'UPDATE_APPOINTMENT',
  DELETE_APPOINTMENT: 'DELETE_APPOINTMENT',
} as const;

// ============================================================================
// SERVICE CLASS
// ============================================================================

/**
 * Offline Sync Service
 *
 * Manages background synchronization of offline actions.
 * Singleton pattern - use getOfflineSyncService() to get the instance.
 */
class OfflineSyncService {
  private config: SyncConfig;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private listeners: Set<SyncEventListener> = new Set();
  private swRegistration: ServiceWorkerRegistration | null = null;
  private lastSyncStats: SyncStats | null = null;

  constructor(config: SyncConfig = {}) {
    this.config = {
      syncInterval: DEFAULT_SYNC_INTERVAL,
      retryInterval: DEFAULT_RETRY_INTERVAL,
      maxConcurrent: DEFAULT_MAX_CONCURRENT,
      maxRetries: DEFAULT_MAX_RETRIES,
      enabled: true,
      showNotifications: true,
      ...config,
    };

    this.init();
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initializes the sync service
   */
  private async init(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      this.startPeriodicSync();
      return;
    }

    try {
      // Register for background sync if supported
      this.swRegistration = await navigator.serviceWorker.ready;

      // Listen for sync completion messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_COMPLETE') {
          this.emit({
            type: 'sync_complete',
            timestamp: Date.now(),
            data: event.data.stats,
          });
          this.notifyListeners();
        }
      });

      // Listen for sync error messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_ERROR') {
          this.emit({
            type: 'sync_error',
            timestamp: Date.now(),
            data: { error: event.data.error },
          });
        }
      });

      // Start periodic sync as fallback
      this.startPeriodicSync();

      // Listen for online events to trigger immediate sync
      window.addEventListener('online', () => {
        if (this.config.enabled) {
          this.syncNow();
        }
      });

      this.emit({ type: 'sync_start', timestamp: Date.now() });
    } catch (error) {
      logger.warn('Background sync not available, using polling fallback', error, 'offlineSync');
      this.startPeriodicSync();
    }
  }

  // ========================================================================
  // SYNC METHODS
  // ========================================================================

  /**
   * Starts periodic sync interval
   */
  private startPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    const interval = Math.max(
      MIN_SYNC_INTERVAL,
      Math.min(MAX_SYNC_INTERVAL, this.config.syncInterval!)
    );

    this.syncTimer = setInterval(() => {
      if (this.config.enabled && navigator.onLine && !this.isSyncing) {
        this.syncNow().catch(console.error);
      }
    }, interval);
  }

  /**
   * Registers a background sync with the Service Worker
   */
  private async registerBackgroundSync(): Promise<boolean> {
    if (!this.swRegistration || !('sync' in this.swRegistration)) {
      return false;
    }

    try {
      // Service Worker Background Sync API is experimental
      const swReg = this.swRegistration as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      };
      if (swReg.sync) {
        await swReg.sync.register('offline-actions-sync');
      }
      return true;
    } catch (error) {
      logger.warn('Background sync registration failed', error, 'offlineSync');
      return false;
    }
  }

  /**
   * Triggers immediate synchronization
   * @returns Sync statistics
   */
  public async syncNow(): Promise<SyncStats> {
    if (this.isSyncing || !navigator.onLine) {
      return this.getStats();
    }

    this.isSyncing = true;
    this.emit({ type: 'sync_start', timestamp: Date.now() });

    try {
      const db = await getDB();
      const tx = db.transaction('offline_actions', 'readonly');
      const index = tx.store.index('by-synced');
      const pendingActions = await index.getAll(false);

      if (pendingActions.length === 0) {
        this.lastSyncStats = await this.getStats();
        return this.lastSyncStats;
      }

      // Filter actions that haven't exceeded max retries
      const validActions = pendingActions.filter(
        (a) => a.retryCount < (this.config.maxRetries || DEFAULT_MAX_RETRIES)
      );

      if (validActions.length === 0) {
        this.lastSyncStats = await this.getStats();
        return this.lastSyncStats;
      }

      // Process actions in batches
      const batchSize = this.config.maxConcurrent || DEFAULT_MAX_CONCURRENT;
      const results = { successful: 0, failed: 0 };

      for (let i = 0; i < validActions.length; i += batchSize) {
        const batch = validActions.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map((action) => this.processAction(action, db))
        );

        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            results.successful++;
          } else {
            results.failed++;
          }
        });
      }

      this.lastSyncStats = await this.getStats();

      // Show notifications if enabled
      if (this.config.showNotifications) {
        if (results.successful > 0) {
          toast.success(`${results.successful} ações sincronizadas`);
        }
        if (results.failed > 0) {
          toast.warning(`${results.failed} ações falharam`, {
            description: 'Elas serão tentadas novamente.',
          });
        }
      }

      this.emit({
        type: 'sync_complete',
        timestamp: Date.now(),
        data: { stats: this.lastSyncStats },
      });
      this.notifyListeners();

      return this.lastSyncStats;
    } catch (error) {
      logger.error('Sync error', error, 'offlineSync');
      this.emit({
        type: 'sync_error',
        timestamp: Date.now(),
        data: { error: error as Error },
      });
      return this.getStats();
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Processes a single offline action
   * @param action - Action to process
   * @param db - Database instance
   */
  private async processAction(
    action: QueuedAction,
    db: IDBPDatabase<FisioFlowDB>
  ): Promise<void> {
    try {
      // Execute the action
      await this.executeAction(action);

      // Remove from queue
      await db.delete('offline_actions', action.id);

      this.emit({
        type: 'action_success',
        timestamp: Date.now(),
        data: { actionId: action.id, actionType: action.action },
      });
    } catch (error) {
      // Increment retry count
      const maxRetries = this.config.maxRetries || DEFAULT_MAX_RETRIES;
      const updatedAction = {
        ...action,
        retryCount: action.retryCount + 1,
      };

      if (updatedAction.retryCount < maxRetries) {
        await db.put('offline_actions', updatedAction);
      } else {
        // Max retries reached - remove from queue
        await db.delete('offline_actions', action.id);
      }

      this.emit({
        type: 'action_failure',
        timestamp: Date.now(),
        data: {
          actionId: action.id,
          actionType: action.action,
          error: error as Error,
        },
      });

      throw error;
    }
  }

  /**
   * Executes an action (placeholder - replace with actual API calls)
   * @param action - Action to execute
   */
  private async executeAction(action: QueuedAction): Promise<void> {
    const { action: actionType, payload } = action;

    switch (actionType) {
      case ACTION_TYPES.CREATE_SESSION_METRICS:
        await this.apiPost('/api/patient-session-metrics', payload);
        break;
      case ACTION_TYPES.UPDATE_GOAL:
        await this.apiPatch(`/api/patient-goals/${String((payload as PayloadWithId).id)}`, payload);
        break;
      case ACTION_TYPES.CREATE_EVOLUTION:
        await this.apiPost('/api/patient-evolution', payload);
        break;
      case ACTION_TYPES.UPDATE_RISK_SCORE:
        await this.apiPost('/api/patient-risk-scores', payload);
        break;
      case ACTION_TYPES.UPDATE_PATIENT:
        await this.apiPatch(`/api/patients/${String((payload as PayloadWithId).id)}`, payload);
        break;
      case ACTION_TYPES.CREATE_APPOINTMENT:
        await this.apiPost('/api/appointments', payload);
        break;
      case ACTION_TYPES.UPDATE_APPOINTMENT:
        await this.apiPatch(`/api/appointments/${String((payload as PayloadWithId).id)}`, payload);
        break;
      case ACTION_TYPES.DELETE_APPOINTMENT:
        await this.apiDelete(`/api/appointments/${String((payload as PayloadWithId).id)}`);
        break;
      default:
        logger.warn('Unknown action type', { actionType }, 'offlineSync');
    }

    // Simulate API call delay (remove in production)
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  /**
   * API POST request wrapper
   */
  private async apiPost(endpoint: string, payload: unknown): Promise<void> {
    // Placeholder for actual API call
    console.log('[OfflineSyncService] POST', endpoint, payload);
  }

  /**
   * API PATCH request wrapper
   */
  private async apiPatch(endpoint: string, payload: unknown): Promise<void> {
    // Placeholder for actual API call
    console.log('[OfflineSyncService] PATCH', endpoint, payload);
  }

  /**
   * API DELETE request wrapper
   */
  private async apiDelete(endpoint: string): Promise<void> {
    // Placeholder for actual API call
    console.log('[OfflineSyncService] DELETE', endpoint);
  }

  // ========================================================================
  // CACHING
  // ========================================================================

  /**
   * Caches critical data for offline use
   * Fetches upcoming appointments, related patients, and common exercises
   */
  public async cacheCriticalData(): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('[OfflineSyncService] Cannot cache data while offline');
      return;
    }

    try {
      console.log('[OfflineSyncService] Starting critical data caching...');
      // Initialize both databases correctly
      const localDb = await getDB();

      // 1. Cache upcoming appointments (next 24 hours)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Format as YYYY-MM-DD for date comparison
      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      let appointments;
      let apptError: Error | null = null;

      try {
        const appointmentsQ = query(
          collection(db, 'appointments'),
          where('appointment_date', '>=', todayStr),
          where('appointment_date', '<=', tomorrowStr)
        );
        const appointmentsSnapshot = await getDocs(appointmentsQ);
        appointments = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        if ((error as { code?: string })?.code === 'permission-denied') {
          console.log('[OfflineSyncService] Permission denied for appointments (User might be patient/estagiario). Skipping.');
          appointments = [];
        } else {
          apptError = error as Error;
          console.warn('[OfflineSyncService] Error fetching appointments:', apptError.message);
          appointments = [];
        }
      }

      if (appointments && appointments.length > 0) {
        const tx = localDb.transaction(['appointments', 'patients'], 'readwrite');
        const apptStore = tx.objectStore('appointments');

        for (const appt of appointments) {
          await apptStore.put(appt);
          // Note: Firebase doesn't auto-join like Supabase, so patients would need separate query
          // For now, we just store the appointment data
        }
        await tx.done;
        console.log(`[OfflineSyncService] Cached ${appointments.length} appointments`);
      } else {
        console.log('[OfflineSyncService] No appointments to cache for today');
      }

      // 2. Cache common exercises (first 100)
      let exercises;
      try {
        const exercisesQ = query(
          collection(db, 'exercises'),
          limitClause(100)
        );
        const exercisesSnapshot = await getDocs(exercisesQ);
        exercises = exercisesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        if ((error as { code?: string })?.code === 'permission-denied') {
          console.log('[OfflineSyncService] Permission denied for exercises. Skipping.');
          exercises = [];
        } else {
          console.warn('[OfflineSyncService] Error fetching exercises:', error);
          exercises = [];
        }
      }

      if (exercises && exercises.length > 0) {
        const tx = localDb.transaction('exercises', 'readwrite');
        const store = tx.store;
        for (const ex of exercises) {
          await store.put(ex);
        }
        await tx.done;
        console.log(`[OfflineSyncService] Cached ${exercises.length} exercises`);
      }

      console.log('[OfflineSyncService] Critical data caching complete');
    } catch (error) {
      console.error('[OfflineSyncService] Error caching critical data:', error);
    }
  }

  // ========================================================================
  // STATS & LISTENERS
  // ========================================================================

  /**
   * Gets current sync statistics
   * @returns Sync statistics
   */
  public async getStats(): Promise<SyncStats> {
    try {
      const db = await getDB();
      const allActions = await db.getAll('offline_actions');

      let total = 0;
      let pending = 0;
      let synced = 0;
      let failed = 0;

      for (const action of allActions) {
        total++;
        if (action.synced) {
          synced++;
        } else if (action.retryCount >= (this.config.maxRetries || DEFAULT_MAX_RETRIES)) {
          failed++;
        } else {
          pending++;
        }
      }

      return {
        totalActions: total,
        pendingActions: pending,
        syncedActions: synced,
        failedActions: failed,
        lastSyncTime: this.lastSyncStats?.lastSyncTime,
        lastSyncSuccess: this.lastSyncStats?.lastSyncSuccess,
      };
    } catch (error) {
      console.error('[OfflineSyncService] Error getting sync stats:', error);
      return {
        totalActions: 0,
        pendingActions: 0,
        syncedActions: 0,
        failedActions: 0,
        lastSyncSuccess: false,
      };
    }
  }

  /**
   * Subscribes to sync events
   * @param callback - Event listener callback
   * @returns Unsubscribe function
   */
  public subscribe(callback: SyncEventListener): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Emits a sync event to all listeners
   * @param event - Event to emit
   */
  private emit(event: SyncEvent): void {
    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('[OfflineSyncService] Listener error:', error);
      }
    });
  }

  /**
   * Notifies listeners with current stats
   */
  private async notifyListeners(): Promise<void> {
    const stats = await this.getStats();
    this.listeners.forEach((callback) => {
      try {
        callback({
          type: 'sync_complete',
          timestamp: Date.now(),
          data: { stats },
        });
      } catch (error) {
        console.error('[OfflineSyncService] Listener error:', error);
      }
    });
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Starts the sync service
   */
  public start(): void {
    this.config.enabled = true;
    this.startPeriodicSync();
  }

  /**
   * Stops the sync service
   */
  public stop(): void {
    this.config.enabled = false;
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Updates service configuration
   * @param config - Partial config to update
   */
  public updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.syncTimer) {
      this.startPeriodicSync();
    }
  }

  /**
   * Gets current configuration
   * @returns Current config
   */
  public getConfig(): SyncConfig {
    return { ...this.config };
  }

  /**
   * Cleans up the service
   */
  public destroy(): void {
    this.stop();
    this.listeners.clear();
    this.swRegistration = null;
    this.lastSyncStats = null;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let syncServiceInstance: OfflineSyncService | null = null;

/**
 * Gets or creates the singleton sync service instance
 * @param config - Optional config (only used on first call)
 * @returns Sync service instance
 */
export function getOfflineSyncService(config?: SyncConfig): OfflineSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new OfflineSyncService(config);
  }
  return syncServiceInstance;
}

/**
 * Destroys the singleton sync service instance
 */
export function destroyOfflineSyncService(): void {
  if (syncServiceInstance) {
    syncServiceInstance.destroy();
    syncServiceInstance = null;
  }
}

/**
 * Resets the singleton instance (useful for testing)
 */
export function resetOfflineSyncService(): void {
  destroyOfflineSyncService();
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * React hook for offline sync
 *
 * @example
 * ```tsx
 * const { stats, syncNow, isOnline } = useOfflineSync({
 *   syncInterval: 30000, // 30 seconds
 * });
 * ```
 */
export function useOfflineSync(config?: SyncConfig) {
  const [stats, setStats] = useState<SyncStats>({
    totalActions: 0,
    pendingActions: 0,
    syncedActions: 0,
    failedActions: 0,
  });
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const queryClient = useQueryClient();

  useEffect(() => {
    const service = getOfflineSyncService(config);

    // Subscribe to sync events
    const unsubscribe = service.subscribe((event) => {
      if (event.data?.stats) {
        setStats(event.data.stats);
      }

      // Invalidate relevant queries when sync completes
      if (event.type === 'sync_complete' && event.data?.stats?.pendingActions === 0) {
        queryClient.invalidateQueries({ queryKey: ['patient-analytics'] });
        queryClient.invalidateQueries({ queryKey: ['patients'] });
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
      }
    });

    // Load initial stats
    service.getStats().then(setStats);

    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [config, queryClient]);

  const syncNow = useCallback(() => {
    const service = getOfflineSyncService();
    return service.syncNow();
  }, []);

  const startSync = useCallback(() => {
    const service = getOfflineSyncService();
    service.start();
  }, []);

  const stopSync = useCallback(() => {
    const service = getOfflineSyncService();
    service.stop();
  }, []);

  const updateConfig = useCallback((newConfig: Partial<SyncConfig>) => {
    const service = getOfflineSyncService();
    service.updateConfig(newConfig);
  }, []);

  const cacheCriticalData = useCallback(async () => {
    const service = getOfflineSyncService();
    return service.cacheCriticalData();
  }, []);

  return {
    stats,
    syncNow,
    startSync,
    stopSync,
    updateConfig,
    isOnline,
    cacheCriticalData,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { OfflineSyncService };

