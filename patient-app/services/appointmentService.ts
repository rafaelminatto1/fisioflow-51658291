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
  updateDoc,
  getDoc,
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
    const appointments = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
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

    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
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

    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
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

/**
 * Get appointment by ID
 */
export async function getAppointmentById(
  userId: string,
  appointmentId: string
): Promise<Result<any | null>> {
  return asyncResult(async () => {
    perf.start('firestore_get_appointment_by_id');

    const appointmentRef = doc(db, 'users', userId, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);

    perf.end('firestore_get_appointment_by_id', true);

    if (!appointmentDoc.exists()) {
      return null;
    }

    return {
      id: appointmentDoc.id,
      ...appointmentDoc.data(),
    };
  }, 'getAppointmentById');
}

/**
 * Update appointment (for patient to confirm attendance or add notes)
 */
export interface AppointmentUpdate {
  confirmed?: boolean;
  patientNotes?: string;
  responseToReminder?: boolean;
}

export async function updateAppointment(
  userId: string,
  appointmentId: string,
  updates: AppointmentUpdate
): Promise<Result<void>> {
  return asyncResult(async () => {
    perf.start('firestore_update_appointment');

    const appointmentRef = doc(db, 'users', userId, 'appointments', appointmentId);
    const updateData: any = {
      updated_at: new Date(),
    };

    if (updates.confirmed !== undefined) {
      updateData.confirmed = updates.confirmed;
      updateData.confirmed_at = updates.confirmed ? new Date() : null;
    }
    if (updates.patientNotes !== undefined) {
      updateData.patient_notes = updates.patientNotes;
    }
    if (updates.responseToReminder !== undefined) {
      updateData.response_to_reminder = updates.responseToReminder;
    }

    await updateDoc(appointmentRef, updateData);

    perf.end('firestore_update_appointment', true);
    log.info('APPOINTMENT', 'Appointment updated by patient', { userId, appointmentId, updates });
  }, 'updateAppointment');
}

/**
 * Confirm appointment attendance
 */
export async function confirmAppointment(
  userId: string,
  appointmentId: string
): Promise<Result<void>> {
  return updateAppointment(userId, appointmentId, { confirmed: true });
}
