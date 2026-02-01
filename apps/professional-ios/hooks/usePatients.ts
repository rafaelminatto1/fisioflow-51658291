import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Patient, PatientStatus } from '@/types';

export function usePatients() {
  const [data, setData] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(() => {
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

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = fetchData();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchData]);

  // Get single patient by ID
  const getById = useCallback(async (id: string) => {
    try {
      const docRef = doc(db, 'patients', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
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
        } as Patient;
      }
      return null;
    } catch (err) {
      console.error('Error fetching patient:', err);
      throw err;
    }
  }, []);

  // Create new patient
  const create = useCallback(async (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'patients'), {
        full_name: patient.name,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        cpf: patient.cpf,
        rg: patient.rg,
        birth_date: patient.birthDate,
        gender: patient.gender,
        address: patient.address,
        city: patient.city,
        state: patient.state,
        zip_code: patient.zip_code,
        emergency_contact: patient.emergencyContact,
        emergencyContactRelationship: patient.emergencyContactRelationship,
        emergency_phone: patient.emergency_phone,
        medicalHistory: patient.medicalHistory,
        mainCondition: patient.mainCondition || '',
        status: patient.status || 'Inicial',
        progress: patient.progress || 0,
        observations: patient.observations,
        health_insurance: patient.insurancePlan,
        insurance_number: patient.insuranceNumber,
        insuranceValidity: patient.insuranceValidity,
        maritalStatus: patient.maritalStatus,
        profession: patient.profession,
        educationLevel: patient.educationLevel,
        bloodType: patient.bloodType,
        allergies: patient.allergies,
        medications: patient.medications,
        weight: patient.weight,
        height: patient.height,
        photo_url: patient.photo_url,
        incomplete_registration: patient.incomplete_registration,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.error('Error creating patient:', err);
      throw err;
    }
  }, []);

  // Update patient
  const update = useCallback(async (id: string, updates: Partial<Patient>) => {
    try {
      const updateData: any = { updated_at: serverTimestamp() };

      if (updates.name !== undefined) updateData.full_name = updates.name;
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.cpf !== undefined) updateData.cpf = updates.cpf;
      if (updates.rg !== undefined) updateData.rg = updates.rg;
      if (updates.birthDate !== undefined) updateData.birth_date = updates.birthDate;
      if (updates.gender !== undefined) updateData.gender = updates.gender;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.city !== undefined) updateData.city = updates.city;
      if (updates.state !== undefined) updateData.state = updates.state;
      if (updates.zip_code !== undefined) updateData.zip_code = updates.zip_code;
      if (updates.emergencyContact !== undefined) updateData.emergency_contact = updates.emergencyContact;
      if (updates.emergencyContactRelationship !== undefined) updateData.emergencyContactRelationship = updates.emergencyContactRelationship;
      if (updates.emergency_phone !== undefined) updateData.emergency_phone = updates.emergency_phone;
      if (updates.medicalHistory !== undefined) updateData.medicalHistory = updates.medicalHistory;
      if (updates.mainCondition !== undefined) updateData.mainCondition = updates.mainCondition;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.progress !== undefined) updateData.progress = updates.progress;
      if (updates.observations !== undefined) updateData.observations = updates.observations;
      if (updates.insurancePlan !== undefined) updateData.health_insurance = updates.insurancePlan;
      if (updates.insuranceNumber !== undefined) updateData.insurance_number = updates.insuranceNumber;
      if (updates.weight !== undefined) updateData.weight = updates.weight;
      if (updates.height !== undefined) updateData.height = updates.height;

      await updateDoc(doc(db, 'patients', id), updateData);
    } catch (err) {
      console.error('Error updating patient:', err);
      throw err;
    }
  }, []);

  // Update patient status
  const updateStatus = useCallback(async (id: string, status: PatientStatus) => {
    return update(id, { status });
  }, [update]);

  // Update patient progress
  const updateProgress = useCallback(async (id: string, progress: number) => {
    return update(id, { progress });
  }, [update]);

  // Delete patient
  const remove = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'patients', id));
    } catch (err) {
      console.error('Error deleting patient:', err);
      throw err;
    }
  }, []);

  return { data, loading, error, refetch: fetchData, getById, create, update, updateStatus, updateProgress, remove };
}
