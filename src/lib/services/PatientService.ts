import type { Patient } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export class PatientService {
  static async getPatients(): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('full_name');

    if (error) throw error;

    return data.map(p => ({
      id: p.id,
      name: p.full_name || p.name,
      email: p.email || undefined,
      phone: p.phone || undefined,
      cpf: p.cpf || undefined,
      birthDate: p.birth_date || new Date().toISOString(),
      gender: 'outro',
      mainCondition: p.observations || '',
      status: (p.status === 'active' ? 'Em Tratamento' : 'Inicial'),
      progress: 0,
      incomplete_registration: p.incomplete_registration || false,
      createdAt: p.created_at || new Date().toISOString(),
      updatedAt: p.updated_at || new Date().toISOString(),
    }));
  }

  static async getPatientById(id: string): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      id: data.id,
      name: data.full_name || data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      cpf: data.cpf || undefined,
      birthDate: data.birth_date || new Date().toISOString(),
      gender: 'outro',
      mainCondition: data.observations || '',
      status: (data.status === 'active' ? 'Em Tratamento' : 'Inicial'),
      progress: 0,
      incomplete_registration: data.incomplete_registration || false,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
    };
  }

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
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.full_name || data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      cpf: data.cpf || undefined,
      birthDate: data.birth_date || new Date().toISOString(),
      gender: 'outro',
      mainCondition: data.observations || '',
      status: (data.status === 'active' ? 'Em Tratamento' : 'Inicial'),
      progress: 0,
      incomplete_registration: data.incomplete_registration || false,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
    };
  }

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
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.full_name || data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      cpf: data.cpf || undefined,
      birthDate: data.birth_date || new Date().toISOString(),
      gender: 'outro',
      mainCondition: data.observations || '',
      status: (data.status === 'active' ? 'Em Tratamento' : 'Inicial'),
      progress: 0,
      incomplete_registration: data.incomplete_registration || false,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
    };
  }

  static async deletePatient(id: string): Promise<void> {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getPatientByProfileId(profileId: string): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      name: data.full_name || data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      cpf: data.cpf || undefined,
      birthDate: data.birth_date || new Date().toISOString(),
      gender: 'outro',
      mainCondition: data.observations || '',
      status: (data.status === 'active' ? 'Em Tratamento' : 'Inicial'),
      progress: 0,
      incomplete_registration: data.incomplete_registration || false,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
    };
  }

  static async getPrescribedExercises(patientId: string) {
    const { data, error } = await supabase
      .from('prescribed_exercises')
      .select('*, exercise:exercises(*)')
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

  static async getPainRecords(patientId: string) {
    const { data, error } = await supabase
      .from('patient_pain_records')
      .select('*')
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