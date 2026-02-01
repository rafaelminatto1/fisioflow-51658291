import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Patient } from '@/types';

export function usePatients() {
  const [data, setData] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Query all patients (ordered by name)
    const q = query(
      collection(db, 'patients'),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const patients: Patient[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          patients.push({
            id: doc.id,
            name: data.name || data.full_name || '',
            email: data.email,
            phone: data.phone,
            cpf: data.cpf,
            rg: data.rg,
            birthDate: data.birth_date || data.birthDate || '',
            gender: data.gender || 'outro',
            address: data.address,
            city: data.city,
            state: data.state,
            zip_code: data.zip_code,
            emergencyContact: data.emergency_contact || data.emergencyContact,
            emergencyContactRelationship: data.emergencyContactRelationship,
            emergency_phone: data.emergency_phone,
            medicalHistory: data.medicalHistory,
            mainCondition: data.mainCondition || '',
            status: data.status || 'Inicial',
            progress: data.progress || 0,
            observations: data.observations,
            insurancePlan: data.insurancePlan || data.health_insurance,
            insuranceNumber: data.insuranceNumber || data.insurance_number,
            insuranceValidity: data.insuranceValidity,
            maritalStatus: data.maritalStatus,
            profession: data.profession,
            educationLevel: data.educationLevel,
            bloodType: data.bloodType,
            allergies: data.allergies,
            medications: data.medications,
            weight: data.weight,
            height: data.height,
            photo_url: data.photo_url,
            incomplete_registration: data.incomplete_registration,
            createdAt: data.created_at?.toDate?.() || new Date(),
            updatedAt: data.updated_at?.toDate?.() || new Date(),
          } as Patient);
        });
        setData(patients);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching patients:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { data, loading, error };
}
