/**
 * Appointment Service
 * Handles appointment-related operations
 */

import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { asyncResult, Result } from '@/lib/async';
import { log } from '@/lib/logger';
import { perf } from '@/lib/performance';

/**
 * Subscribe to appointments for a user
 */
export function subscribeToAppointments(
  userId: string,
  callback: (appointments: any[]) => void
): () => void {
  const appointmentsRef = collection(db, 'users', userId, 'appointments');
  const q = query(appointmentsRef, orderBy('date', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const appointments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(appointments);
  });

  return unsubscribe;
}

/**
 * Get upcoming appointments for a user
 */
export async function getUpcomingAppointments(userId: string): Promise<Result<any[]>> {
  return asyncResult(async () => {
    perf.start('firestore_get_upcoming_appointments');

    const now = new Date();
    const appointmentsRef = collection(db, 'users', userId, 'appointments');
    const q = query(
      appointmentsRef,
      where('date', '>=', now),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);

    perf.end('firestore_get_upcoming_appointments', true);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }, 'getUpcomingAppointments');
}

/**
 * Get past appointments for a user
 */
export async function getPastAppointments(userId: string): Promise<Result<any[]>> {
  return asyncResult(async () => {
    perf.start('firestore_get_past_appointments');

    const now = new Date();
    const appointmentsRef = collection(db, 'users', userId, 'appointments');
    const q = query(
      appointmentsRef,
      where('date', '<', now),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);

    perf.end('firestore_get_past_appointments', true);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }, 'getPastAppointments');
}

/**
 * Get next appointment for a user
 */
export async function getNextAppointment(userId: string): Promise<Result<any | null>> {
  return asyncResult(async () => {
    const result = await getUpcomingAppointments(userId);

    if (!result.success || !result.data || result.data.length === 0) {
      return null;
    }

    return result.data[0];
  }, 'getNextAppointment');
}
