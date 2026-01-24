import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import {
  getCachedPatients,
  setCachedPatients,
  getCachedAppointments,
  setCachedAppointments,
  getCachedExercises,
  setCachedExercises,
  getProgressStats,
  setProgressStats,
  getLastSync,
  setLastSync,
  getPainLogs,
  setPainLogs,
  getAchievements,
  setAchievements,
} from './storage';
import { syncQueue, QueuedOperation } from './queue';

/**
 * Collection names in Firestore
 */
export const COLLECTIONS = {
  PATIENTS: 'patients',
  APPOINTMENTS: 'appointments',
  EXERCISES: 'exercises',
  EXERCISE_PROGRESS: 'exercise_progress',
  TREATMENT_PLANS: 'treatment_plans',
  PROGRESS: 'progress',
  PAIN_LOGS: 'pain_logs',
  ACHIEVEMENTS: 'achievements',
  USERS: 'users',
} as const;

/**
 * Sync service for offline-first data synchronization
 */
class OfflineSyncService {
  private syncCallbacks: Set<() => void> = new Set();
  private syncInProgress = false;

  /**
   * Register a callback for sync events
   */
  onSync(callback: () => void): () => void {
    this.syncCallbacks.add(callback);
    return () => this.syncCallbacks.delete(callback);
  }

  /**
   * Notify all registered callbacks
   */
  private notifySync() {
    this.syncCallbacks.forEach(cb => cb());
  }

  /**
   * Check if device is online
   */
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  /**
   * Sync all data for a professional user
   */
  async syncProfessionalData(professionalId: string): Promise<void> {
    if (this.syncInProgress) return;

    this.syncInProgress = true;

    try {
      const isOnline = await this.isOnline();

      if (isOnline) {
        // Sync from Firestore
        await Promise.all([
          this.syncPatients(professionalId),
          this.syncAppointments(professionalId),
          this.syncExercises(professionalId),
        ]);

        // Process pending operations
        await this.processPendingOperations();

        await setLastSync(Date.now());
      }

      this.notifySync();
    } catch (error) {
      console.error('OfflineSync.syncProfessionalData error:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync all data for a patient user
   */
  async syncPatientData(patientId: string): Promise<void> {
    if (this.syncInProgress) return;

    this.syncInProgress = true;

    try {
      const isOnline = await this.isOnline();

      if (isOnline) {
        // Sync from Firestore
        await Promise.all([
          this.syncPatientProfile(patientId),
          this.syncPatientExercises(patientId),
          this.syncPatientProgress(patientId),
          this.syncPatientAchievements(patientId),
        ]);

        // Process pending operations
        await this.processPendingOperations();

        await setLastSync(Date.now());
      }

      this.notifySync();
    } catch (error) {
      console.error('OfflineSync.syncPatientData error:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync patients for a professional
   */
  private async syncPatients(professionalId: string): Promise<void> {
    try {
      const q = query(
        collection(db, COLLECTIONS.PATIENTS),
        where('professionalId', '==', professionalId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);
      const patients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      await setCachedPatients(patients);
    } catch (error) {
      console.error('OfflineSync.syncPatients error:', error);
    }
  }

  /**
   * Sync appointments for a professional
   */
  private async syncAppointments(professionalId: string): Promise<void> {
    try {
      const q = query(
        collection(db, COLLECTIONS.APPOINTMENTS),
        where('professionalId', '==', professionalId)
      );

      const snapshot = await getDocs(q);
      const appointments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      await setCachedAppointments(appointments);
    } catch (error) {
      console.error('OfflineSync.syncAppointments error:', error);
    }
  }

  /**
   * Sync exercise library
   */
  private async syncExercises(professionalId: string): Promise<void> {
    try {
      // Sync all exercises (could be filtered by professional in the future)
      const snapshot = await getDocs(collection(db, COLLECTIONS.EXERCISES));
      const exercises = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      await setCachedExercises(exercises);
    } catch (error) {
      console.error('OfflineSync.syncExercises error:', error);
    }
  }

  /**
   * Sync patient profile
   */
  private async syncPatientProfile(patientId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.PATIENTS, patientId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const patient = { id: docSnap.id, ...docSnap.data() };
        const { setCachedPatient } = await import('./storage');
        await setCachedPatient(patientId, patient);
      }
    } catch (error) {
      console.error('OfflineSync.syncPatientProfile error:', error);
    }
  }

  /**
   * Sync patient exercises (treatment plan)
   */
  private async syncPatientExercises(patientId: string): Promise<void> {
    try {
      const q = query(
        collection(db, COLLECTIONS.EXERCISE_PROGRESS),
        where('patientId', '==', patientId)
      );

      const snapshot = await getDocs(q);
      const exercises = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      const { setTodayExercises } = await import('./storage');
      await setTodayExercises(exercises);
    } catch (error) {
      console.error('OfflineSync.syncPatientExercises error:', error);
    }
  }

  /**
   * Sync patient progress
   */
  private async syncPatientProgress(patientId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.PROGRESS, patientId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const progress = { id: docSnap.id, ...docSnap.data() };
        await setProgressStats(progress);
      }

      // Sync pain logs
      const painQuery = query(
        collection(db, COLLECTIONS.PAIN_LOGS),
        where('patientId', '==', patientId)
      );

      const painSnapshot = await getDocs(painQuery);
      const logs = painSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      await setPainLogs(logs);
    } catch (error) {
      console.error('OfflineSync.syncPatientProgress error:', error);
    }
  }

  /**
   * Sync patient achievements
   */
  private async syncPatientAchievements(patientId: string): Promise<void> {
    try {
      const q = query(
        collection(db, COLLECTIONS.ACHIEVEMENTS),
        where('patientId', '==', patientId)
      );

      const snapshot = await getDocs(q);
      const achievements = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      await setAchievements(achievements);
    } catch (error) {
      console.error('OfflineSync.syncPatientAchievements error:', error);
    }
  }

  /**
   * Process pending offline operations
   */
  private async processPendingOperations(): Promise<void> {
    await syncQueue.process(async (operation: QueuedOperation) => {
      const { type, collection, documentId, data } = operation;

      switch (type) {
        case 'create':
          if (documentId) {
            await setDoc(doc(db, collection, documentId), data);
          } else {
            const newDoc = await addDoc(collection(db, collection), data);
            // Store the new document ID for reference
            operation.documentId = newDoc.id;
          }
          break;

        case 'update':
          if (documentId) {
            await updateDoc(doc(db, collection, documentId), data);
          }
          break;

        case 'patch':
          if (documentId) {
            await updateDoc(doc(db, collection, documentId), data);
          }
          break;

        case 'delete':
          if (documentId) {
            await deleteDoc(doc(db, collection, documentId));
          }
          break;
      }
    });
  }

  /**
   * Get time since last sync
   */
  async getTimeSinceLastSync(): Promise<number | null> {
    const lastSync = await getLastSync();
    if (!lastSync) return null;
    return Date.now() - lastSync;
  }

  /**
   * Check if sync is needed (older than 5 minutes)
   */
  async needsSync(): Promise<boolean> {
    const timeSince = await this.getTimeSinceLastSync();
    if (timeSince === null) return true;
    return timeSince > 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Force a complete re-sync
   */
  async forceSync(userType: 'professional' | 'patient', userId: string): Promise<void> {
    await setLastSync(0); // Reset last sync to force sync

    if (userType === 'professional') {
      await this.syncProfessionalData(userId);
    } else {
      await this.syncPatientData(userId);
    }
  }
}

export const offlineSync = new OfflineSyncService();

/**
 * React hook for offline sync
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = React.useState<boolean | null>(null);
  const [lastSync, setLastSync] = React.useState<number | null>(null);
  const [syncing, setSyncing] = React.useState(false);

  React.useEffect(() => {
    // Get initial network state
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected ?? false);
    });

    // Listen for network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected ?? false;
      setIsOnline(online);

      // Trigger sync when coming back online
      if (online) {
        triggerSync();
      }
    });

    // Load last sync time
    getLastSync().then(setLastSync);

    // Listen for sync events
    const unsubSync = offlineSync.onSync(() => {
      getLastSync().then(setLastSync);
      setSyncing(false);
    });

    return () => {
      unsubscribe();
      unsubSync();
    };
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      // This will be called by the app with proper user context
      await offlineSync.processPendingOperations();
      getLastSync().then(setLastSync);
    } finally {
      setSyncing(false);
    }
  };

  return {
    isOnline,
    lastSync,
    syncing,
    triggerSync,
    needsSync: lastSync ? Date.now() - lastSync > 5 * 60 * 1000 : true,
  };
}

// Import React for the hook
import React from 'react';
import { addDoc } from 'firebase/firestore';
