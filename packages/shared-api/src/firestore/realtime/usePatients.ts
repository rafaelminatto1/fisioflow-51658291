import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config';
import { COLLECTIONS } from '@fisioflow/shared-constants';

export interface Patient {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  isActive: boolean;
  professionalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function usePatients(professionalId?: string) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Query for patients
    let query;
    if (professionalId) {
      // If professionalId provided, get only their patients
      query = query(
        collection(db, COLLECTIONS.PATIENTS),
        where('professionalId', '==', professionalId),
        where('isActive', '==', true)
      );
    } else {
      // Get all active patients
      query = query(
        collection(db, COLLECTIONS.PATIENTS),
        where('isActive', '==', true)
      );
    }

    // Real-time listener
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const patientsList: Patient[] = [];
        snapshot.forEach((doc) => {
          patientsList.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          } as Patient);
        });
        setPatients(patientsList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching patients:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [professionalId]);

  return { patients, loading, error };
}
