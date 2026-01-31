import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { COLLECTIONS } from '@fisioflow/shared-constants';
import { startOfDay, endOfDay, addDays, format } from 'date-fns';

export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  patientName: string;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  type: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function useAppointments(professionalId?: string, date: Date = new Date()) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Start and end of the selected day
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Build query
    const appointmentsRef = collection(db, COLLECTIONS.APPOINTMENTS);

    let q;
    if (professionalId) {
      q = query(
        appointmentsRef,
        where('professionalId', '==', professionalId),
        where('startTime', '>=', dayStart),
        where('startTime', '<=', dayEnd),
        orderBy('startTime', 'asc')
      );
    } else {
      q = query(
        appointmentsRef,
        where('startTime', '>=', dayStart),
        where('startTime', '<=', dayEnd),
        orderBy('startTime', 'asc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const appointmentsList: Appointment[] = [];
        snapshot.forEach((doc) => {
          appointmentsList.push({
            id: doc.id,
            ...doc.data(),
            startTime: doc.data().startTime?.toDate() || new Date(),
            endTime: doc.data().endTime?.toDate() || new Date(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          } as Appointment);
        });
        setAppointments(appointmentsList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching appointments:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [professionalId, date]);

  return { appointments, loading, error };
}

// Hook for weekly appointments (calendar view)
export function useWeeklyAppointments(professionalId?: string, startDate: Date = new Date()) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const weekStart = startOfDay(startDate);
    const weekEnd = endOfDay(addDays(startDate, 6));

    const appointmentsRef = collection(db, COLLECTIONS.APPOINTMENTS);

    let q;
    if (professionalId) {
      q = query(
        appointmentsRef,
        where('professionalId', '==', professionalId),
        where('startTime', '>=', weekStart),
        where('startTime', '<=', weekEnd),
        orderBy('startTime', 'asc')
      );
    } else {
      q = query(
        appointmentsRef,
        where('startTime', '>=', weekStart),
        where('startTime', '<=', weekEnd),
        orderBy('startTime', 'asc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const appointmentsList: Appointment[] = [];
        snapshot.forEach((doc) => {
          appointmentsList.push({
            id: doc.id,
            ...doc.data(),
            startTime: doc.data().startTime?.toDate() || new Date(),
            endTime: doc.data().endTime?.toDate() || new Date(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          } as Appointment);
        });
        setAppointments(appointmentsList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching weekly appointments:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [professionalId, startDate]);

  return { appointments, loading, error };
}
