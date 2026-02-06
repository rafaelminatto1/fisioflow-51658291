/**
 * Time Tracking Service - Firebase Firestore Integration
 * Serviço para gerenciamento de entradas de tempo no Firestore
 */
import {

  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/app';

import type {
  TimeEntry,
  TimeEntryFilters,
  ActiveTimer,
} from '@/types/timetracking';
import { normalizeFirestoreData } from '@/utils/firestoreData';

const COLLECTION_NAME = 'time_entries';

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Criar nova entrada de tempo
 */
export async function createTimeEntry(
  organizationId: string,
  entry: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<TimeEntry> {
  const entryRef = doc(collection(db, 'organizations', organizationId, COLLECTION_NAME));
  const now = Timestamp.now();

  const newEntry: TimeEntry = {
    ...entry,
    id: entryRef.id,
    created_at: now,
    updated_at: now,
  };

  await setDoc(entryRef, newEntry);

  return newEntry;
}

/**
 * Obter entrada por ID
 */
export async function getTimeEntry(
  organizationId: string,
  entryId: string
): Promise<TimeEntry | null> {
  const entryRef = doc(db, 'organizations', organizationId, COLLECTION_NAME, entryId);
  const entrySnap = await getDoc(entryRef);

  if (!entrySnap.exists()) {
    return null;
  }

  return { id: entrySnap.id, ...entrySnap.data() } as TimeEntry;
}

/**
 * Atualizar entrada
 */
export async function updateTimeEntry(
  organizationId: string,
  entryId: string,
  updates: Partial<Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const entryRef = doc(db, 'organizations', organizationId, COLLECTION_NAME, entryId);

  await updateDoc(entryRef, {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

/**
 * Deletar entrada
 */
export async function deleteTimeEntry(
  organizationId: string,
  entryId: string
): Promise<void> {
  const entryRef = doc(db, 'organizations', organizationId, COLLECTION_NAME, entryId);
  await deleteDoc(entryRef);
}

/**
 * Buscar entradas com filtros
 */
export async function getTimeEntries(
  organizationId: string,
  filters: TimeEntryFilters = {}
): Promise<TimeEntry[]> {
  const collectionRef = collection(db, 'organizations', organizationId, COLLECTION_NAME);

  // Build query
  let q = query(collectionRef);

  if (filters.user_id) {
    q = query(q, where('user_id', '==', filters.user_id));
  }

  if (filters.start_date) {
    q = query(q, where('start_time', '>=', filters.start_date));
  }

  if (filters.end_date) {
    q = query(q, where('start_time', '<=', filters.end_date));
  }

  if (filters.is_billable !== undefined) {
    q = query(q, where('is_billable', '==', filters.is_billable));
  }

  if (filters.patient_id) {
    q = query(q, where('patient_id', '==', filters.patient_id));
  }

  if (filters.project_id) {
    q = query(q, where('project_id', '==', filters.project_id));
  }

  if (filters.task_id) {
    q = query(q, where('task_id', '==', filters.task_id));
  }

  // Order by start time descending
  q = query(q, orderBy('start_time', 'desc'));

  if (filters.limit) {
    q = query(q, where('start_time', '>=', filters.limit));
  }

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...normalizeFirestoreData(doc.data()),
  })) as TimeEntry[];
}

/**
 * Buscar entradas de um período (semana, mês, etc)
 */
export async function getTimeEntriesByPeriod(
  organizationId: string,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<TimeEntry[]> {
  return getTimeEntries(organizationId, {
    user_id: userId,
    start_date: Timestamp.fromDate(startDate),
    end_date: Timestamp.fromDate(endDate),
  });
}

// ============================================================================
// Real-time Listeners
// ============================================================================

/**
 * Listener em tempo real para entradas do usuário
 */
export function listenToUserTimeEntries(
  organizationId: string,
  userId: string,
  callback: (entries: TimeEntry[]) => void,
  onError?: (error: Error) => void
): () => void {
  const collectionRef = collection(db, 'organizations', organizationId, COLLECTION_NAME);
  const q = query(
    collectionRef,
    where('user_id', '==', userId),
    orderBy('start_time', 'desc')
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...normalizeFirestoreData(doc.data()),
      })) as TimeEntry[];
      callback(entries);
    },
    (error) => {
      onError?.(error as Error);
    }
  );

  return unsubscribe;
}

/**
 * Listener para entradas de hoje
 */
export function listenToTodayTimeEntries(
  organizationId: string,
  userId: string,
  callback: (entries: TimeEntry[]) => void
): () => void {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return listenToUserTimeEntries(
    organizationId,
    userId,
    (entries) => {
      const todayEntries = entries.filter((e) => {
        const entryDate = e.start_time.toDate();
        return entryDate >= startOfDay && entryDate <= endOfDay;
      });
      callback(todayEntries);
    }
  );
}

// ============================================================================
// Timer Management
// ============================================================================

/**
 * Salvar estado do timer ativo (draft)
 */
export async function saveActiveTimerDraft(
  userId: string,
  timer: ActiveTimer
): Promise<void> {
  const draftRef = doc(db, 'users', userId, 'timer_draft', 'active');
  await setDoc(draftRef, {
    timer,
    last_updated: serverTimestamp(),
  }, { merge: true });
}

/**
 * Carregar timer ativo do draft
 */
export async function getActiveTimerDraft(
  userId: string
): Promise<ActiveTimer | null> {
  const draftRef = doc(db, 'users', userId, 'timer_draft', 'active');
  const draftSnap = await getDoc(draftRef);

  if (!draftSnap.exists()) {
    return null;
  }

  const data = draftSnap.data();
  const lastUpdated = data.last_updated?.toDate() || new Date(0);
  const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);

  // Descartar timers muito antigos (> 24h)
  if (hoursSinceUpdate > 24) {
    await deleteDoc(draftRef);
    return null;
  }

  return data.timer as ActiveTimer;
}

/**
 * Limpar timer draft
 */
export async function clearActiveTimerDraft(userId: string): Promise<void> {
  const draftRef = doc(db, 'users', userId, 'timer_draft', 'active');
  await deleteDoc(draftRef);
}

/**
 * Finalizar timer e criar entrada
 */
export async function finalizeTimer(
  organizationId: string,
  userId: string,
  timer: ActiveTimer
): Promise<TimeEntry> {
  const startTime = new Date(timer.start_time);
  const endTime = new Date();
  const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

  const entry: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'> = {
    user_id: userId,
    organization_id: organizationId,
    description: timer.description,
    start_time: Timestamp.fromDate(startTime),
    end_time: Timestamp.fromDate(endTime),
    duration_seconds: durationSeconds,
    is_billable: timer.is_billable,
    hourly_rate: timer.hourly_rate,
    total_value: timer.hourly_rate
      ? (durationSeconds / 3600) * timer.hourly_rate
      : undefined,
    task_id: timer.task_id,
    patient_id: timer.patient_id,
    project_id: timer.project_id,
    tags: timer.tags,
  };

  // Criar entrada e limpar draft em uma transação
  const timeEntry = await runTransaction(db, async (transaction) => {
    const entryRef = doc(collection(db, 'organizations', organizationId, COLLECTION_NAME));
    const now = Timestamp.now();

    const newEntry: TimeEntry = {
      ...entry,
      id: entryRef.id,
      created_at: now,
      updated_at: now,
    };

    transaction.set(entryRef, newEntry);

    // Limpar draft
    const draftRef = doc(db, 'users', userId, 'timer_draft', 'active');
    transaction.delete(draftRef);

    return newEntry;
  });

  return timeEntry;
}

// ============================================================================
// Statistics & Aggregation
// ============================================================================

/**
 * Calcular estatísticas de tempo para um período
 */
export async function getTimeStats(
  organizationId: string,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  total_seconds: number;
  billable_seconds: number;
  non_billable_seconds: number;
  entries_count: number;
  total_value: number;
}> {
  const entries = await getTimeEntriesByPeriod(organizationId, userId, startDate, endDate);

  return entries.reduce(
    (acc, entry) => {
      acc.total_seconds += entry.duration_seconds;
      acc.entries_count += 1;

      if (entry.is_billable) {
        acc.billable_seconds += entry.duration_seconds;
      } else {
        acc.non_billable_seconds += entry.duration_seconds;
      }

      if (entry.total_value) {
        acc.total_value += entry.total_value;
      }

      return acc;
    },
    {
      total_seconds: 0,
      billable_seconds: 0,
      non_billable_seconds: 0,
      entries_count: 0,
      total_value: 0,
    }
  );
}

/**
 * Obter resumo diário para um período
 */
export async function getDailyBreakdown(
  organizationId: string,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: string; total_seconds: number; billable_seconds: number; entries: number }>> {
  const entries = await getTimeEntriesByPeriod(organizationId, userId, startDate, endDate);

  // Group by date
  const byDate = new Map<string, { total_seconds: number; billable_seconds: number; entries: number }>();

  entries.forEach((entry) => {
    const dateKey = entry.start_time.toDate().toISOString().split('T')[0];

    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, { total_seconds: 0, billable_seconds: 0, entries: 0 });
    }

    const stats = byDate.get(dateKey)!;
    stats.total_seconds += entry.duration_seconds;
    stats.entries += 1;

    if (entry.is_billable) {
      stats.billable_seconds += entry.duration_seconds;
    }
  });

  // Convert to array and sort
  return Array.from(byDate.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));
}