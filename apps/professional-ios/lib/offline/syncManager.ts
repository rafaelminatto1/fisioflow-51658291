/**
 * Offline Sync Manager
 * Handles offline data synchronization with Firebase
 */

import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const SYNC_QUEUE_KEY = '@fisioflow_sync_queue';
const LAST_SYNC_KEY = '@fisioflow_last_sync';

export interface SyncOperation {
  id: string;
  collection: string;
  documentId?: string;
  type: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
  priority: 'high' | 'normal' | 'low';
  /** Timestamp do servidor para detecção de conflitos */
  serverTimestamp?: number;
  /** Versão dos dados para merge automático */
  version?: number;
}

/**
 * Estratégias de resolução de conflitos
 */
export enum ConflictResolutionStrategy {
  LAST_WRITE_WINS = 'last_write_wins',
  MERGE_WITH_PROMPT = 'merge_with_prompt',
  LOCAL_WINS = 'local_wins',
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
  lastSync: number | null;
  lastSyncSuccessful: boolean;
}

export interface SyncOptions {
  batchSize?: number;
  retryDelay?: number;
  maxRetries?: number;
  syncOnForeground?: boolean;
  /** Estratégia de resolução de conflitos */
  conflictResolution?: ConflictResolutionStrategy;
}

class SyncManager {
  private queue: SyncOperation[] = [];
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private appState: AppStateStatus = 'active';
  private networkUnsubscribe: (() => void) | null = null;
  private appStateUnsubscribe: (() => void) | null = null;

  private defaultOptions: SyncOptions = {
    batchSize: 50,
    retryDelay: 5000,
    maxRetries: 3,
    syncOnForeground: true,
  };

  constructor() {
    // Don't auto-initialize in constructor - call initialize() explicitly
  }

  async initialize(): Promise<void> {
    // Load existing queue from storage
    await this.loadQueue();

    // Check initial online status
    const netInfo = await NetInfo.fetch();
    this.isOnline = netInfo.isConnected ?? true;

    // Setup network listener
    this.setupNetworkListener();

    // Setup app state listener
    this.setupAppStateListener();

    // Start sync loop
    this.startSyncLoop();
  }

  private setupNetworkListener() {
    this.networkUnsubscribe = NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? true;

      if (wasOffline && this.isOnline) {
        // Came back online - trigger sync
        this.sync();
      }

      this.notifyListeners();
    });
  }

  private setupAppStateListener() {
    this.appStateUnsubscribe = AppState.addEventListener('change', (nextAppState) => {
      if (
        this.appState.match(/inactive|background/) &&
        nextAppState === 'active' &&
        this.defaultOptions.syncOnForeground
      ) {
        // App came to foreground - trigger sync
        this.sync();
      }
      this.appState = nextAppState;
    });
  }

  private async loadQueue() {
    try {
      const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      this.queue = data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.queue = [];
    }
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  private startSyncLoop() {
    // Clear existing interval if any
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.queue.length > 0) {
        this.sync();
      }
    }, 30000);
  }

  private stopSyncLoop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Add an operation to the sync queue
   */
  async queueOperation(
    collectionName: string,
    type: SyncOperation['type'],
    data: Record<string, unknown>,
    documentId?: string,
    priority: SyncOperation['priority'] = 'normal'
  ): Promise<void> {
    const operation: SyncOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      collection: collectionName,
      documentId,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      priority,
    };

    // Insert based on priority
    if (priority === 'high') {
      this.queue.unshift(operation);
    } else {
      this.queue.push(operation);
    }

    await this.saveQueue();
    this.notifyListeners();

    // Try to sync immediately if online
    if (this.isOnline) {
      this.sync();
    }
  }

  /**
   * Resolve conflito entre operação local e dados do servidor
   *
   * @param operation - Operação local que gerou o conflito
   * @param serverData - Dados do servidor que entraram em conflito
   * @returns Dados a serem sincronizados
   */
  private resolveConflict(
    operation: SyncOperation,
    serverData: Record<string, unknown>
  ): Record<string, unknown> {
    const strategy = this.defaultOptions.conflictResolution || ConflictResolutionStrategy.LAST_WRITE_WINS;

    switch (strategy) {
      case ConflictResolutionStrategy.LAST_WRITE_WINS:
        // Última escrita vence - baseada em timestamp do servidor
        // Se o servidor tem timestamp mais recente, ele vence
        // Se não tem timestamp no servidor, assume que o servidor está mais atualizado
        console.log(`[SyncManager] Resolvendo conflito com LAST_WRITE_WINS: ${operation.id}`);
        return {
          ...serverData,
          // Preserva timestamp do servidor
          syncedAt: serverTimestamp(),
          // Marca que foi resolvido com conflito
          _conflictResolved: true,
          _conflictResolution: 'server_wins',
        };

      case ConflictResolutionStrategy.MERGE_WITH_PROMPT:
        // Merge com prompt - requer intervenção do usuário
        console.log(`[SyncManager] Resolvendo conflito com MERGE_WITH_PROMPT: ${operation.id}`);
        // Aqui seria necessário armazenar para merge manual
        return {
          ...serverData,
          syncedAt: serverTimestamp(),
          _conflictResolved: true,
          _conflictResolution: 'merge_required',
          _localData: operation.data,
        };

      case ConflictResolutionStrategy.LOCAL_WINS:
        // Local vence - usado quando o usuário offline tem versão mais recente
        console.log(`[SyncManager] Resolvendo conflito com LOCAL_WINS: ${operation.id}`);
        return {
          ...operation.data,
          syncedAt: serverTimestamp(),
          _conflictResolved: true,
          _conflictResolution: 'local_wins',
          _serverData: serverData,
        };
    }
  }

  /**
   * Sync all pending operations
   */
  async sync(options?: SyncOptions): Promise<boolean> {
    if (this.isSyncing) {
      return false;
    }
    if (!this.isOnline) {
      console.log('Offline - skipping sync');
      return false;
    }
    if (this.queue.length === 0) {
      return true;
    }
    this.isSyncing = true;
    this.notifyListeners();
    const opts = { ...this.defaultOptions, ...options };
    let failCount = 0;

    try {
      // Sort by priority and timestamp
      const sortedQueue = [...this.queue].sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });

      // Process in batches
      const batch = sortedQueue.slice(0, opts.batchSize!);

      for (const operation of batch) {
        try {
          // Verifica se há conflito antes de processar
          if (operation.type === 'update') {
            const { data: resolvedData, hadConflict } = await this.checkAndResolveConflict(operation);
            if (hadConflict) {
              // Se houve conflito resolvido, usa os dados resolvidos
              operation.data = resolvedData;
              console.log(`[SyncManager] Conflito resolvido para ${operation.id}:`, resolvedData);
            }
          }

          await this.processOperation(operation);
          this.queue = this.queue.filter((op) => op.id !== operation.id);
        } catch (error) {
          console.error(`Failed to sync operation ${operation.id}:`, error);

          // Update operation in queue
          const opIndex = this.queue.findIndex((op) => op.id === operation.id);
          if (opIndex !== -1) {
            this.queue[opIndex].retries++;
            if (this.queue[opIndex].retries >= opts.maxRetries!) {
              // Max retries reached - remove from queue
              this.queue = this.queue.filter((op) => op.id !== operation.id);
              failCount++;
              // Log for manual review
              await this.logFailedOperation(operation, error);
            }
          }

          // Exponential backoff before next operation
          await new Promise((resolve) =>
            setTimeout(resolve, opts.retryDelay! * Math.pow(2, operation.retries))
          );
        }
      }

      await this.saveQueue();

      // Update last sync timestamp
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

      // Notify if there are still items to sync
      if (this.queue.length > 0) {
        // Continue syncing after a short delay
        setTimeout(() => this.sync(options), 1000);
      }
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    return failCount === 0;
  }

  /**
   * Verifica e resolve conflitos para operações de update
   *
   * @param operation - Operação local com dados a serem sincronizados
   * @returns Objeto com dados resolvidos e flag se houve conflito
   */
  private async checkAndResolveConflict(
    operation: SyncOperation
  ): Promise<{ data: Record<string, unknown>; hadConflict: boolean }> {
    const { collection, documentId, data, timestamp, version } = operation;

    // Tenta buscar dados atuais do servidor
    try {
      const docRef = documentId
        ? doc(db, collection, documentId)
        : doc(db, collection, data.id || 'unknown');

      const serverDoc = await getDoc(docRef);

      if (!serverDoc.exists()) {
        // Documento não existe no servidor - sem conflito
        console.log(`[SyncManager] Documento não existe: ${data.id || 'unknown'}`);
        return { data, hadConflict: false };
      }

      const serverData = serverDoc.data();

      // Verifica se os dados mudaram (indicação de atualização simultânea)
      const hasLocalChanges = timestamp > (serverData.syncedAt as number || 0);

      if (!hasLocalChanges) {
        // Sem conflito - dados locais são mais antigos
        console.log(`[SyncManager] Sem conflito: ${data.id || 'unknown'}`);
        return { data, hadConflict: false };
      }

      // Houve mudança local após o último sync do servidor - CONFLITO!
      console.warn(`[SyncManager] CONFLITO DETECTADO: ${data.id || 'unknown'}`);
      console.log('[SyncManager] Dados locais:', data);
      console.log('[SyncManager] Dados servidor:', serverData);

      // Resolve o conflito usando a estratégia configurada
      return {
        data: this.resolveConflict(operation, serverData),
        hadConflict: true,
      };
    } catch (error: any) {
      console.error('[SyncManager] Erro ao verificar conflito:', error);
      // Em caso de erro, continua com dados locais (fallback)
      return { data, hadConflict: false };
    }
  }
  async sync(options?: SyncOptions): Promise<boolean> {
    if (this.isSyncing) {
      return false;
    }

    if (!this.isOnline) {
      console.log('Offline - skipping sync');
      return false;
    }

    if (this.queue.length === 0) {
      return true;
    }

    this.isSyncing = true;
    this.notifyListeners();

    const opts = { ...this.defaultOptions, ...options };
    let failCount = 0;

    try {
      // Sort by priority and timestamp
      const sortedQueue = [...this.queue].sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });

      // Process in batches
      const batch = sortedQueue.slice(0, opts.batchSize!);

      for (const operation of batch) {
        try {
          await this.processOperation(operation);
          this.queue = this.queue.filter((op) => op.id !== operation.id);
        } catch (error) {
          console.error(`Failed to sync operation ${operation.id}:`, error);

          // Update the operation in the queue
          const opIndex = this.queue.findIndex((op) => op.id === operation.id);
          if (opIndex !== -1) {
            this.queue[opIndex].retries++;

            if (this.queue[opIndex].retries >= opts.maxRetries!) {
              // Max retries reached - remove from queue
              this.queue = this.queue.filter((op) => op.id !== operation.id);
              failCount++;

              // Log for manual review
              await this.logFailedOperation(operation, error);
            }
          }

          // Exponential backoff before next operation
          await new Promise((resolve) =>
            setTimeout(resolve, opts.retryDelay! * Math.pow(2, operation.retries))
          );
        }
      }

      await this.saveQueue();

      // Update last sync timestamp
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

      // Notify if there are still items to sync
      if (this.queue.length > 0) {
        // Continue syncing after a short delay
        setTimeout(() => this.sync(options), 1000);
      }
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    return failCount === 0;
  }

  private async processOperation(operation: SyncOperation): Promise<void> {
    const { collection: collectionName, type, data, documentId } = operation;

    switch (type) {
      case 'create':
        await addDoc(collection(db, collectionName), {
          ...data,
          syncedAt: serverTimestamp(),
        });
        break;

      case 'update':
        if (!documentId) {
          throw new Error('documentId required for update operation');
        }
        await updateDoc(doc(db, collectionName, documentId), {
          ...data,
          syncedAt: serverTimestamp(),
        });
        break;

      case 'delete':
        if (!documentId) {
          throw new Error('documentId required for delete operation');
        }
        await deleteDoc(doc(db, collectionName, documentId));
        break;
    }
  }

  private async logFailedOperation(operation: SyncOperation, error: unknown) {
    const failedOpsKey = '@fisioflow_failed_operations';
    try {
      const existing = await AsyncStorage.getItem(failedOpsKey);
      const failed = existing ? JSON.parse(existing) : [];
      failed.push({
        ...operation,
        error: error instanceof Error ? error.message : String(error),
        failedAt: Date.now(),
      });
      // Keep only last 100 failed operations
      const trimmed = failed.slice(-100);
      await AsyncStorage.setItem(failedOpsKey, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to log failed operation:', e);
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingOperations: this.queue.length,
      lastSync: null,
      lastSyncSuccessful: true,
    };
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current status
    try {
      listener(this.getStatus());
    } catch (error) {
      console.error('Error in initial listener call:', error);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error notifying sync listener:', error);
      }
    });
  }

  /**
   * Clear all pending operations
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Force sync retry
   */
  async forceSync(): Promise<boolean> {
    return this.sync();
  }

  /**
   * Get pending operations count by collection
   */
  getPendingCount(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const op of this.queue) {
      counts[op.collection] = (counts[op.collection] || 0) + 1;
    }
    return counts;
  }

  /**
   * Get all pending operations (for debugging)
   */
  getPendingOperations(): SyncOperation[] {
    return [...this.queue];
  }

  /**
   * Cleanup - remove old failed operations
   */
  async cleanup(olderThanDays: number = 30): Promise<void> {
    const failedOpsKey = '@fisioflow_failed_operations';
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    try {
      const existing = await AsyncStorage.getItem(failedOpsKey);
      if (!existing) return;

      const failed = JSON.parse(existing) as Array<{ failedAt: number }>;
      const filtered = failed.filter((op) => op.failedAt > cutoffTime);
      await AsyncStorage.setItem(failedOpsKey, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to cleanup old operations:', error);
    }
  }

  /**
   * Destroy the sync manager
   */
  destroy() {
    this.stopSyncLoop();
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    if (this.appStateUnsubscribe) {
      this.appStateUnsubscribe();
      this.appStateUnsubscribe = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance
let syncManagerInstance: SyncManager | null = null;

export function getSyncManager(): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager();
    // Auto-initialize on first access
    syncManagerInstance.initialize().catch((error) => {
      console.error('Failed to initialize sync manager:', error);
    });
  }
  return syncManagerInstance;
}

export function destroySyncManager() {
  if (syncManagerInstance) {
    syncManagerInstance.destroy();
    syncManagerInstance = null;
  }
}
