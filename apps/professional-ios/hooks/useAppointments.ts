import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';
import type { Appointment } from '@/types';

export function useAppointments() {
  const { profile } = useAuth();
  const [data, setData] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
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

    return () => unsubscribe();
  }, [profile?.id]);

  return { data, loading, error };
}
