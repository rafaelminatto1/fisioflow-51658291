import type { Patient } from '@/types';
import {

  patientsApi,
  exercisesApi,
  clinicalApi
} from '@/integrations/firebase/functions';
import { getPatientName } from '@/lib/constants/patient-queries';

interface PatientApiData {
  id: string;
  name?: string;
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  birth_date?: string;
  gender?: string;
  main_condition?: string;
  observations?: string;
  status: string;
  progress?: number;
  incomplete_registration?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface PatientUpdateData {
  name?: string;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  birth_date?: string;
  main_condition?: string | null;
  status?: string;
}

/**
 * Patient service with optimized queries
 * Uses centralized constants for consistency
 */
export class PatientService {
  /**
   * Fetch all patients
   * Uses optimized column selection from constants
   */
  static async getPatients(organizationId?: string): Promise<Patient[]> {
    const response = await patientsApi.list({ organizationId, limit: 1000 });
    const data = response.data || [];

    return data.map((p: PatientApiData) => ({
      id: p.id,
      name: p.name || p.full_name || 'Sem nome', // Fallback for name
      email: p.email ?? undefined,
      phone: p.phone ?? undefined,
      cpf: p.cpf ?? undefined,
      birthDate: p.birth_date ?? new Date().toISOString(),
      gender: p.gender || 'outro',
      mainCondition: p.main_condition || p.observations || '',
      status: (p.status === 'Em Tratamento' ? 'Em Tratamento' : 'Inicial'), // Simplify status mapping
      progress: p.progress || 0,
      incomplete_registration: p.incomplete_registration ?? false,
      createdAt: p.created_at ?? new Date().toISOString(),
      updatedAt: p.updated_at ?? new Date().toISOString(),
    }));
  }

  /**
   * Fetch a single patient by ID
   */
  static async getPatientById(id: string): Promise<Patient | null> {
    const response = await patientsApi.get(id);
    const data = response.data;

    if (!data) return null;

    return {
      id: data.id,
      name: data.name || data.full_name,
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      cpf: data.cpf ?? undefined,
      birthDate: data.birth_date ?? new Date().toISOString(),
      gender: data.gender || 'outro',
      mainCondition: data.main_condition || '',
      status: (data.status === 'Em Tratamento' ? 'Em Tratamento' : 'Inicial'),
      progress: data.progress || 0,
      incomplete_registration: false,
      createdAt: data.created_at ?? new Date().toISOString(),
      updatedAt: data.updated_at ?? new Date().toISOString(),
    };
  }

  /**
   * Create a new patient
   */
  static async createPatient(patient: Omit<Patient, 'id'>): Promise<Patient> {
    const response = await patientsApi.create({
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      cpf: patient.cpf,
      birth_date: patient.birthDate,
      main_condition: patient.mainCondition,
      status: patient.status
    });
    const data = response.data;

    return {
      id: data.id,
      name: data.name,
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      cpf: data.cpf ?? undefined,
      birthDate: data.birth_date ?? new Date().toISOString(),
      gender: data.gender || 'outro',
      mainCondition: data.main_condition || '',
      status: data.status,
      progress: 0,
      incomplete_registration: false,
      createdAt: data.created_at ?? new Date().toISOString(),
      updatedAt: data.updated_at ?? new Date().toISOString(),
    };
  }

  /**
   * Update an existing patient
   */
  static async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    const updateData: PatientUpdateData = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.cpf !== undefined) updateData.cpf = updates.cpf;
    if (updates.birthDate) updateData.birth_date = updates.birthDate;
    if (updates.mainCondition !== undefined) updateData.main_condition = updates.mainCondition;
    if (updates.status) updateData.status = updates.status;

    const response = await patientsApi.update(id, updateData);
    const data = response.data;

    return {
      id: data.id,
      name: data.name,
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      cpf: data.cpf ?? undefined,
      birthDate: data.birth_date ?? new Date().toISOString(),
      gender: data.gender || 'outro',
      mainCondition: data.main_condition || '',
      status: data.status,
      progress: data.progress || 0,
      incomplete_registration: false,
      createdAt: data.created_at ?? new Date().toISOString(),
      updatedAt: data.updated_at ?? new Date().toISOString(),
    };
  }

  /**
   * Delete a patient
   */
  static async deletePatient(id: string): Promise<void> {
    await patientsApi.delete(id);
  }

  static async getPatientByProfileId(profileId: string): Promise<Patient | null> {
    const response = await patientsApi.get({ profileId });
    const data = response.data;

    if (!data) return null;

    return {
      id: data.id,
      name: data.name || data.full_name,
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      cpf: data.cpf ?? undefined,
      birthDate: data.birth_date ?? new Date().toISOString(),
      gender: data.gender || 'outro',
      mainCondition: data.observations || data.main_condition || '',
      status: (data.status === 'active' || data.status === 'Em Tratamento' ? 'Em Tratamento' : 'Inicial'),
      progress: data.progress || 0,
      incomplete_registration: data.incomplete_registration ?? false,
      createdAt: data.created_at ?? new Date().toISOString(),
      updatedAt: data.updated_at ?? new Date().toISOString(),
    };
  }

  /**
   * Fetch prescribed exercises for a patient
   */
  static async getPrescribedExercises(patientId: string) {
    const response = await exercisesApi.getPrescribedExercises(patientId);
    return response.data;
  }

  static async logExercise(patientId: string, prescriptionId: string, difficulty: string, notes?: string) {
    await exercisesApi.logExercise({
      patientId,
      prescriptionId,
      difficulty: Number(difficulty), // Ensure number
      notes,
    });
  }

  // Optimized: Select specific columns instead of *
  static async getPainRecords(patientId: string) {
    const response = await clinicalApi.getPainRecords(patientId);
    return response.data;
  }

  static async savePainRecord(patientId: string, level: number, type: string, bodyPart: string, notes?: string) {
    await clinicalApi.savePainRecord({
      patientId,
      level,
      type,
      bodyPart,
      notes,
    });
  }
}