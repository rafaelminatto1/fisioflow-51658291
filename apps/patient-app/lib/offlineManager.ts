import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { patientApi } from './api';
import { log } from '@/lib/logger';

const OFFLINE_QUEUE_KEY = '@fisioflow_offline_queue';
const LAST_SYNC_KEY = '@fisioflow_last_sync';

export type OperationType =
  | 'complete_exercise'
  | 'update_profile'
  | 'submit_feedback'
  | 'book_appointment'
  | 'cancel_appointment'
  | 'link_professional';

export interface QueuedOperation {
  id: string;
  type: OperationType;
  data: any;
  timestamp: number;
  retries: number;
  userId: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
  lastSync: Date | null;
}

class OfflineManager {
  private queue: QueuedOperation[] = [];
  private isSyncing = false;
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();
  private networkUnsubscribe: (() => void) | null = null;
  private initializedUserId: string | null = null;

  async initialize(userId: string): Promise<void> {
    if (this.initializedUserId === userId && this.networkUnsubscribe) {
      return;
    }

    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }

    this.initializedUserId = userId;
    await this.loadQueue();

    this.networkUnsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected === true && state.isInternetReachable === true;
      if (isOnline && this.queue.length > 0) {
        this.syncAll(userId);
      }
      this.notifyListeners();
    });

    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected === true && netInfo.isInternetReachable === true) {
      await this.syncAll(userId);
    }
  }

  destroy(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    this.syncListeners.clear();
  }

  private async loadQueue(): Promise<void> {
    try {
      const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      this.queue = queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      log.error('Error loading offline queue:', error);
      this.queue = [];
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      log.error('Error saving offline queue:', error);
    }
  }

  async queueOperation(type: OperationType, data: any, userId: string): Promise<void> {
    const operation: QueuedOperation = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      userId,
    };

    this.queue.push(operation);
    await this.saveQueue();
    this.notifyListeners();

    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected === true && netInfo.isInternetReachable === true) {
      this.syncAll(userId);
    }
  }

  async syncAll(userId: string): Promise<void> {
    if (this.isSyncing || this.queue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const operationsToSync = [...this.queue];
      let successCount = 0;

      for (const operation of operationsToSync) {
        try {
          await this.processOperation(operation);
          this.queue = this.queue.filter((item) => item.id !== operation.id);
          successCount++;
        } catch (error) {
          log.error(`Failed to sync operation ${operation.id}:`, error);
          operation.retries += 1;

          if (
            operation.retries >= 10 ||
            Date.now() - operation.timestamp > 7 * 24 * 60 * 60 * 1000
          ) {
            this.queue = this.queue.filter((item) => item.id !== operation.id);
          }
        }
      }

      await this.saveQueue();

      if (successCount > 0) {
        await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      }
    } catch (error) {
      log.error('Error during sync:', error);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  private async processOperation(operation: QueuedOperation): Promise<void> {
    switch (operation.type) {
      case 'complete_exercise':
        await patientApi.completeExercise(operation.data.assignmentId, {
          completed: operation.data.completed,
        });
        break;
      case 'submit_feedback':
        await patientApi.completeExercise(operation.data.assignmentId, {
          completed: true,
          difficulty: operation.data.difficulty,
          painLevel: operation.data.painLevel ?? operation.data.pain,
          notes: operation.data.notes,
          progress: operation.data.progress,
        });
        break;
      case 'update_profile':
        await patientApi.updateProfile(operation.data);
        break;
      case 'book_appointment':
        await patientApi.confirmAppointment(operation.data.appointmentId);
        break;
      case 'cancel_appointment':
        await patientApi.cancelAppointment(operation.data.appointmentId, operation.data.reason);
        break;
      case 'link_professional':
        await patientApi.linkProfessional(operation.data.professionalId);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  async getStatus(): Promise<SyncStatus> {
    const netInfo = await NetInfo.fetch();
    const isOnline = netInfo.isConnected === true && netInfo.isInternetReachable === true;

    let lastSync: Date | null = null;
    try {
      const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (lastSyncStr) {
        lastSync = new Date(lastSyncStr);
      }
    } catch (error) {
      log.error('Error getting last sync time:', error);
    }

    return {
      isOnline,
      isSyncing: this.isSyncing,
      pendingOperations: this.queue.length,
      lastSync,
    };
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  private notifyListeners(): void {
    this.getStatus().then((status) => {
      this.syncListeners.forEach((listener) => listener(status));
    });
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
    this.notifyListeners();
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = `@fisioflow_cache_${key}`;
      const dataJson = await AsyncStorage.getItem(cacheKey);
      if (!dataJson) return null;

      const { data, timestamp } = JSON.parse(dataJson);
      if (Date.now() - timestamp < 60 * 60 * 1000) {
        return data as T;
      }
    } catch (error) {
      log.error('Error getting cached data:', error);
    }
    return null;
  }

  async setCachedData<T>(key: string, data: T): Promise<void> {
    try {
      const cacheKey = `@fisioflow_cache_${key}`;
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      log.error('Error setting cached data:', error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith('@fisioflow_cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      log.error('Error clearing cache:', error);
    }
  }
}

let offlineManagerInstance: OfflineManager | null = null;

export function getOfflineManager(): OfflineManager {
  if (!offlineManagerInstance) {
    offlineManagerInstance = new OfflineManager();
  }
  return offlineManagerInstance;
}

export async function initializeOfflineManager(userId: string): Promise<OfflineManager> {
  const manager = getOfflineManager();
  await manager.initialize(userId);
  return manager;
}

export async function queueCompleteExercise(
  userId: string,
  assignmentId: string,
  _exerciseId: string,
  completed: boolean,
): Promise<void> {
  const manager = getOfflineManager();
  await manager.queueOperation('complete_exercise', { assignmentId, completed }, userId);
}

export async function queueUpdateProfile(userId: string, data: any): Promise<void> {
  const manager = getOfflineManager();
  await manager.queueOperation('update_profile', data, userId);
}
