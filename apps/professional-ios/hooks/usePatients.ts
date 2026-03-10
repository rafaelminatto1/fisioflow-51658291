import { useEffect, useState, useCallback } from 'react';
import { profApi } from '@/lib/api';
import type { Patient, PatientStatus } from '@/types';

export function usePatients() {
  const [data, setData] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const patients = await profApi.getPatients();
      
      const mappedPatients: Patient[] = patients.map((item: any) => ({
        id: item.id,
        name: item.name || item.full_name || '',
        email: item.email,
        phone: item.phone,
        cpf: item.cpf,
        rg: item.rg,
        birthDate: item.birth_date || item.birthDate || '',
        gender: item.gender || 'outro',
        address: item.address,
        city: item.city,
        state: item.state,
        zip_code: item.zip_code,
        emergencyContact: item.emergency_contact || item.emergencyContact,
        emergencyContactRelationship: item.emergencyContactRelationship,
        emergency_phone: item.emergency_phone,
        medicalHistory: item.medicalHistory,
        mainCondition: item.mainCondition || '',
        status: item.status || 'Inicial',
        progress: item.progress || 0,
        observations: item.observations,
        insurancePlan: item.insurancePlan || item.health_insurance,
        insuranceNumber: item.insuranceNumber || item.insurance_number,
        insuranceValidity: item.insuranceValidity,
        maritalStatus: item.maritalStatus,
        profession: item.profession,
        educationLevel: item.educationLevel,
        bloodType: item.bloodType,
        allergies: item.allergies,
        medications: item.medications,
        weight: item.weight,
        height: item.height,
        photo_url: item.photo_url,
        incomplete_registration: item.incomplete_registration,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      }));

      setData(mappedPatients);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get single patient by ID
  const getById = useCallback(async (id: string) => {
    try {
      const data = await profApi.getPatient(id);
      return {
        ...data,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      } as Patient;
    } catch (err) {
      console.error('Error fetching patient:', err);
      throw err;
    }
  }, []);

  // Create new patient
  const create = useCallback(async (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const result = await profApi.createPatient(patient);
      await fetchData();
      return result.id;
    } catch (err) {
      console.error('Error creating patient:', err);
      throw err;
    }
  }, [fetchData]);

  // Update patient
  const update = useCallback(async (id: string, updates: Partial<Patient>) => {
    try {
      await profApi.updatePatient(id, updates);
      await fetchData();
    } catch (err) {
      console.error('Error updating patient:', err);
      throw err;
    }
  }, [fetchData]);

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
      await profApi.delete(`/api/prof/patients/${id}`);
      await fetchData();
    } catch (err) {
      console.error('Error deleting patient:', err);
      throw err;
    }
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, getById, create, update, updateStatus, updateProgress, remove };
}
