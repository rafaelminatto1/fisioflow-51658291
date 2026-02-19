import { useEffect, useState, useCallback } from 'react';

import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';
import type { Appointment, AppointmentStatus } from '@/types';

export function useAppointments() {
  const { profile } = useAuth();
  const [data, setData] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Query appointments for this therapist
    const q = query(
      collection(db, 'appointments'),
      where('therapist_id', '==', profile.id),
      orderBy('date', 'asc'),
      orderBy('time', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const appointments: Appointment[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          appointments.push({
            id: doc.id,
            patientId: data.patient_id || '',
            patientName: data.patient_name || 'Paciente',
            date: data.date || data.appointment_date || '',
            time: data.time || data.appointment_time || data.start_time || '',
            duration: data.duration || 60,
            type: data.type || 'Fisioterapia',
            status: data.status || 'agendado',
            notes: data.notes,
            phone: data.phone,
            therapistId: data.therapist_id,
            room: data.room,
            createdAt: data.created_at?.toDate?.() || new Date(),
            updatedAt: data.updated_at?.toDate?.() || new Date(),
          } as Appointment);
        });
        setData(appointments);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching appointments:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [profile?.id]);

  useEffect(() => {
    const unsubscribe = fetchData();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchData]);

  // Create new appointment
  const create = useCallback(async (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'appointments'), {
        patient_id: appointment.patientId,
        patient_name: appointment.patientName,
        date: appointment.date,
        time: appointment.time,
        duration: appointment.duration,
        type: appointment.type,
        status: appointment.status || 'agendado',
        notes: appointment.notes,
        phone: appointment.phone,
        therapist_id: profile?.id,
        room: appointment.room,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.error('Error creating appointment:', err);
      throw err;
    }
  }, [profile?.id]);

  // Update appointment
  const update = useCallback(async (id: string, updates: Partial<Appointment>) => {
    try {
      await updateDoc(doc(db, 'appointments', id), {
        ...(updates.status && { status: updates.status }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.date && { date: updates.date }),
        ...(updates.time && { time: updates.time }),
        ...(updates.type && { type: updates.type }),
        ...(updates.duration && { duration: updates.duration }),
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating appointment:', err);
      throw err;
    }
  }, []);

  // Update appointment status
  const updateStatus = useCallback(async (id: string, status: AppointmentStatus) => {
    return update(id, { status });
  }, [update]);

  // Delete appointment
  const remove = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'appointments', id));
    } catch (err) {
      console.error('Error deleting appointment:', err);
      throw err;
    }
  }, []);

  return { data, loading, error, refetch: fetchData, create, update, updateStatus, remove };
}
