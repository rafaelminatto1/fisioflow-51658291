import type { Patient } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import {
  PATIENT_SELECT,
  devValidate,
  getPatientName,
  type PatientDBStandard
} from '@/lib/constants/patient-queries';

/**
 * Patient service with optimized queries
 * Uses centralized constants for consistency
 */
export class PatientService {
  /**
   * Fetch all patients
   * Uses optimized column selection from constants
   */
  static async getPatients(): Promise<Patient[]> {
    devValidate(PATIENT_SELECT.standard);

    const { data, error } = await supabase
      .from('patients')
      .select<PatientDBStandard>(PATIENT_SELECT.standard)
      .order('full_name');

    if (error) throw error;

    return data.map(p => ({
      id: p.id,
      name: getPatientName(p),
      email: p.email ?? undefined,
      phone: p.phone ?? undefined,
      cpf: p.cpf ?? undefined,
      birthDate: p.birth_date ?? new Date().toISOString(),
      gender: 'outro',
      mainCondition: p.observations ?? '',
      status: (p.status === 'active' ? 'Em Tratamento' : 'Inicial'),
      progress: 0,
      incomplete_registration: p.incomplete_registration ?? false,
      createdAt: p.created_at ?? new Date().toISOString(),
      updatedAt: p.updated_at ?? new Date().toISOString(),
    }));
  }

  /**
   * Fetch a single patient by ID
   */
  static async getPatientById(id: string): Promise<Patient | null> {
    devValidate(PATIENT_SELECT.standard);

    const { data, error } = await supabase
      .from('patients')
      .select<PatientDBStandard>(PATIENT_SELECT.standard)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      id: data.id,
      name: getPatientName(data),
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      cpf: data.cpf ?? undefined,
      birthDate: data.birth_date ?? new Date().toISOString(),
      gender: 'outro',
      mainCondition: data.observations ?? '',
      status: (data.status === 'active' ? 'Em Tratamento' : 'Inicial'),
      progress: 0,
      incomplete_registration: data.incomplete_registration ?? false,
      createdAt: data.created_at ?? new Date().toISOString(),
      updatedAt: data.updated_at ?? new Date().toISOString(),
    };
  }

  /**
   * Create a new patient
   */
  static async createPatient(patient: Omit<Patient, 'id'>): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .insert({
        full_name: patient.name,
        email: patient.email,
        phone: patient.phone,
        cpf: patient.cpf,
        birth_date: patient.birthDate,
        observations: patient.mainCondition,
        status: patient.status === 'Em Tratamento' ? 'active' : 'inactive',
        incomplete_registration: patient.incomplete_registration,
      })
      .select<PatientDBStandard>(PATIENT_SELECT.standard)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: getPatientName(data),
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      cpf: data.cpf ?? undefined,
      birthDate: data.birth_date ?? new Date().toISOString(),
      gender: 'outro',
      mainCondition: data.observations ?? '',
      status: (data.status === 'active' ? 'Em Tratamento' : 'Inicial'),
      progress: 0,
      incomplete_registration: data.incomplete_registration ?? false,
      createdAt: data.created_at ?? new Date().toISOString(),
      updatedAt: data.updated_at ?? new Date().toISOString(),
    };
  }

  /**
   * Update an existing patient
   */
  static async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    const updateData: Record<string, unknown> = {};

    if (updates.name) updateData.full_name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.cpf !== undefined) updateData.cpf = updates.cpf;
    if (updates.birthDate) updateData.birth_date = updates.birthDate;
    if (updates.mainCondition !== undefined) updateData.observations = updates.mainCondition;
    if (updates.status) updateData.status = updates.status === 'Em Tratamento' ? 'active' : 'inactive';
    if (updates.incomplete_registration !== undefined) updateData.incomplete_registration = updates.incomplete_registration;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', id)
      .select<PatientDBStandard>(PATIENT_SELECT.standard)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: getPatientName(data),
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      cpf: data.cpf ?? undefined,
      birthDate: data.birth_date ?? new Date().toISOString(),
      gender: 'outro',
      mainCondition: data.observations ?? '',
      status: (data.status === 'active' ? 'Em Tratamento' : 'Inicial'),
      progress: 0,
      incomplete_registration: data.incomplete_registration ?? false,
      createdAt: data.created_at ?? new Date().toISOString(),
      updatedAt: data.updated_at ?? new Date().toISOString(),
    };
  }

  /**
   * Delete a patient
   */
  static async deletePatient(id: string): Promise<void> {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Fetch patient by profile ID
   */
  static async getPatientByProfileId(profileId: string): Promise<Patient | null> {
    devValidate(PATIENT_SELECT.standard);

    const { data, error } = await supabase
      .from('patients')
      .select<PatientDBStandard>(PATIENT_SELECT.standard)
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      name: getPatientName(data),
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      cpf: data.cpf ?? undefined,
      birthDate: data.birth_date ?? new Date().toISOString(),
      gender: 'outro',
      mainCondition: data.observations ?? '',
      status: (data.status === 'active' ? 'Em Tratamento' : 'Inicial'),
      progress: 0,
      incomplete_registration: data.incomplete_registration ?? false,
      createdAt: data.created_at ?? new Date().toISOString(),
      updatedAt: data.updated_at ?? new Date().toISOString(),
    };
  }

  /**
   * Fetch prescribed exercises for a patient
   */
  static async getPrescribedExercises(patientId: string) {
    const { data, error } = await supabase
      .from('prescribed_exercises')
      .select('id, patient_id, exercise_id, sets, reps, duration, frequency, is_active, created_at, exercise:exercises(id, name, category, difficulty_level, video_url, thumbnail_url)')
      .eq('patient_id', patientId)
      .eq('is_active', true);

    if (error) throw error;
    return data;
  }

  static async logExercise(patientId: string, prescriptionId: string, difficulty: string, notes?: string) {
    const { error } = await supabase
      .from('exercise_logs')
      .insert({
        patient_id: patientId,
        prescribed_exercise_id: prescriptionId,
        difficulty_rating: difficulty as unknown,
        notes,
      });

    if (error) throw error;
  }

  // Optimized: Select specific columns instead of *
  static async getPainRecords(patientId: string) {
    const { data, error } = await supabase
      .from('patient_pain_records')
      .select('id, patient_id, pain_level, pain_type, body_part, notes, created_at, updated_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async savePainRecord(patientId: string, level: number, type: string, bodyPart: string, notes?: string) {
    const { error } = await supabase
      .from('patient_pain_records')
      .insert({
        patient_id: patientId,
        pain_level: level,
        pain_type: type,
        body_part: bodyPart,
        notes,
      });

    if (error) throw error;
  }
}