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
      gender: 'outro' as any,
      mainCondition: p.observations || '',
      status: (p.status === 'active' ? 'Em Tratamento' : 'Inicial') as any,
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
      gender: 'outro' as any,
      mainCondition: data.observations || '',
      status: (data.status === 'active' ? 'Em Tratamento' : 'Inicial') as any,
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
      gender: 'outro' as any,
      mainCondition: data.observations || '',
      status: (data.status === 'active' ? 'Em Tratamento' : 'Inicial') as any,
      progress: 0,
      incomplete_registration: data.incomplete_registration || false,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
    };
  }

  static async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    const updateData: any = {};

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
      gender: 'outro' as any,
      mainCondition: data.observations || '',
      status: (data.status === 'active' ? 'Em Tratamento' : 'Inicial') as any,
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
}