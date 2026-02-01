/**
 * Offline Sync Manager - Patient App
 * Manages offline operations and automatic synchronization
 */

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {doc, updateDoc, getDoc, setDoc, serverTimestamp} from 'firebase/firestore';
import {db} from '@/lib/firebase';

// Storage keys
const OFFLINE_QUEUE_KEY = '@fisioflow_offline_queue';
const LAST_SYNC_KEY = '@fisioflow_last_sync';
const CACHE_VERSION_KEY = '@fisioflow_cache_version';

// Operation types
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

/**
 * Offline Manager Class
 */
class OfflineManager {
  private queue: QueuedOperation[] = [];
  private isSyncing: boolean = false;
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();
  private networkUnsubscribe: (() => void) | null = null;

  /**
   * Initialize the offline manager
   */
  async initialize(userId: string): Promise<void> {
    // Load queued operations from storage
    await this.loadQueue();

    // Setup network listener
    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      const isOnline = state.isConnected === true && state.isInternetReachable === true;

      if (isOnline && this.queue.length > 0) {
        // Connection restored, sync pending operations
        this.syncAll(userId);
      }

      this.notifyListeners();
    });

    // Initial sync if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected === true && netInfo.isInternetReachable === true) {
      await this.syncAll(userId);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }
    this.syncListeners.clear();
  }

  /**
   * Load queued operations from AsyncStorage
   */
  private async loadQueue(): Promise<void> {
    try {
      const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (queueJson) {
        this.queue = JSON.parse(queueJson);
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queued operations to AsyncStorage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  /**
   * Add operation to queue
   */
  async queueOperation(
    type: OperationType,
    data: any,
    userId: string
  ): Promise<void> {
    const operation: QueuedOperation = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      userId,
    };

    this.queue.push(operation);
    await this.saveQueue();
    this.notifyListeners();

    // Try to sync immediately if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected === true && netInfo.isInternetReachable === true) {
      this.syncAll(userId);
    }
  }

  /**
   * Sync all queued operations
   */
  async syncAll(userId: string): Promise<void> {
    if (this.isSyncing || this.queue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      // Process operations in order
      const operationsToSync = [...this.queue];
      let successCount = 0;

      for (const operation of operationsToSync) {
        try {
          await this.processOperation(operation);
          // Remove from queue on success
          this.queue = this.queue.filter(op => op.id !== operation.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to sync operation ${operation.id}:`, error);

          // Increment retry count
          operation.retries++;

          // Remove if too many retries (older than 7 days or more than 10 retries)
          if (operation.retries >= 10 || Date.now() - operation.timestamp > 7 * 24 * 60 * 60 * 1000) {
            this.queue = this.queue.filter(op => op.id !== operation.id);
            console.warn(`Removed stale operation ${operation.id}`);
          }
        }
      }

      await this.saveQueue();

      // Update last sync time
      if (successCount > 0) {
        await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      }

      console.log(`Sync complete: ${successCount}/${operationsToSync.length} operations synced`);
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: QueuedOperation): Promise<void> {
    switch (operation.type) {
      case 'complete_exercise':
        await this.syncCompleteExercise(operation);
        break;
      case 'update_profile':
        await this.syncUpdateProfile(operation);
        break;
      case 'submit_feedback':
        await this.syncSubmitFeedback(operation);
        break;
      case 'book_appointment':
        await this.syncBookAppointment(operation);
        break;
      case 'cancel_appointment':
        await this.syncCancelAppointment(operation);
        break;
      case 'link_professional':
        await this.syncLinkProfessional(operation);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Sync exercise completion
   */
  private async syncCompleteExercise(operation: QueuedOperation): Promise<void> {
    const {planId, exerciseId, completed} = operation.data;

    const planRef = doc(db, 'users', operation.userId, 'exercise_plans', planId);
    const planDoc = await getDoc(planRef);

    if (!planDoc.exists()) {
      throw new Error('Exercise plan not found');
    }

    const planData = planDoc.data();
    const exercises = planData.exercises || [];

    const updatedExercises = exercises.map((ex: any) =>
      ex.id === exerciseId
        ? {...ex, completed, completed_at: completed ? new Date(operation.timestamp) : null}
        : ex
    );

    await updateDoc(planRef, {exercises: updatedExercises});
  }

  /**
   * Sync profile update
   */
  private async syncUpdateProfile(operation: QueuedOperation): Promise<void> {
    const userRef = doc(db, 'users', operation.userId);
    await updateDoc(userRef, {
      ...operation.data,
      updated_at: serverTimestamp(),
    });
  }

  /**
   * Sync feedback submission
   */
  private async syncSubmitFeedback(operation: QueuedOperation): Promise<void> {
    const {exerciseId, planId, difficulty, pain, notes} = operation.data;

    const feedbackRef = doc(
      db,
      'users',
      operation.userId,
      'exercise_plans',
      planId,
      'feedback',
      exerciseId
    );

    await setDoc(feedbackRef, {
      difficulty,
      pain,
      notes,
      created_at: serverTimestamp(),
      synced_at: serverTimestamp(),
    });
  }

  /**
   * Sync appointment booking
   */
  private async syncBookAppointment(operation: QueuedOperation): Promise<void> {
    const {appointmentId} = operation.data;

    const appointmentRef = doc(db, 'users', operation.userId, 'appointments', appointmentId);
    await updateDoc(appointmentRef, {
      status: 'confirmed',
      confirmed_at: serverTimestamp(),
    });
  }

  /**
   * Sync appointment cancellation
   */
  private async syncCancelAppointment(operation: QueuedOperation): Promise<void> {
    const {appointmentId, reason} = operation.data;

    const appointmentRef = doc(db, 'users', operation.userId, 'appointments', appointmentId);
    await updateDoc(appointmentRef, {
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_at: serverTimestamp(),
    });
  }

  /**
   * Sync professional linking
   */
  private async syncLinkProfessional(operation: QueuedOperation): Promise<void> {
    const {professionalId, professionalName} = operation.data;

    const userRef = doc(db, 'users', operation.userId);
    await updateDoc(userRef, {
      professional_id: professionalId,
      professional_name: professionalName,
      linked_at: serverTimestamp(),
    });
  }

  /**
   * Get current sync status
   */
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
      console.error('Error getting last sync time:', error);
    }

    return {
      isOnline,
      isSyncing: this.isSyncing,
      pendingOperations: this.queue.length,
      lastSync,
    };
  }

  /**
   * Subscribe to sync status updates
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.getStatus().then(status => {
      this.syncListeners.forEach(listener => listener(status));
    });
  }

  /**
   * Clear all queued operations (useful for logout)
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
    this.notifyListeners();
  }

  /**
   * Get cached data
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = `@fisioflow_cache_${key}`;
      const dataJson = await AsyncStorage.getItem(cacheKey);
      if (dataJson) {
        const {data, timestamp} = JSON.parse(dataJson);
        // Cache expires after 1 hour
        if (Date.now() - timestamp < 60 * 60 * 1000) {
          return data as T;
        }
      }
    } catch (error) {
      console.error('Error getting cached data:', error);
    }
    return null;
  }

  /**
   * Set cached data
   */
  async setCachedData<T>(key: string, data: T): Promise<void> {
    try {
      const cacheKey = `@fisioflow_cache_${key}`;
      const cacheValue = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheValue));
    } catch (error) {
      console.error('Error setting cached data:', error);
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('@fisioflow_cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

// Singleton instance
let offlineManagerInstance: OfflineManager | null = null;

/**
 * Get the offline manager instance
 */
export function getOfflineManager(): OfflineManager {
  if (!offlineManagerInstance) {
    offlineManagerInstance = new OfflineManager();
  }
  return offlineManagerInstance;
}

/**
 * Initialize offline manager for a user
 */
export async function initializeOfflineManager(userId: string): Promise<OfflineManager> {
  const manager = getOfflineManager();
  await manager.initialize(userId);
  return manager;
}

/**
 * Helper function to queue an exercise completion
 */
export async function queueCompleteExercise(
  userId: string,
  planId: string,
  exerciseId: string,
  completed: boolean
): Promise<void> {
  const manager = getOfflineManager();
  await manager.queueOperation('complete_exercise', {planId, exerciseId, completed}, userId);
}

/**
 * Helper function to queue a profile update
 */
export async function queueUpdateProfile(
  userId: string,
  data: any
): Promise<void> {
  const manager = getOfflineManager();
  await manager.queueOperation('update_profile', data, userId);
}
