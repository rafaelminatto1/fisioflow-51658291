import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/errors/logger';
import { sanitizeString, sanitizeEmail, cleanCPF, cleanPhone } from '@/lib/validations';

// ============================================================================================
// TYPES
// ============================================================================================

export interface Patient {
  id: string;
  full_name: string;
  name?: string; // Alias for full_name
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  gender?: 'masculino' | 'feminino' | 'outro' | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  emergency_contact?: string | null;
  emergency_contact_relationship?: string | null;
  emergency_phone?: string | null;
  observations?: string | null;
  medical_history?: string | null;
  main_condition?: string | null;
  health_insurance?: string | null;
  insurance_number?: string | null;
  status?: 'Inicial' | 'Em Tratamento' | 'Recuperação' | 'Concluído' | null;
  progress?: number | null;
  allergies?: string | null;
  medications?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  blood_type?: string | null;
  marital_status?: string | null;
  profession?: string | null;
  education_level?: string | null;
  consent_data?: boolean | null;
  consent_image?: boolean | null;
  incomplete_registration?: boolean | null;
  organization_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PatientCreateInput {
  full_name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birth_date: string;
  gender: 'masculino' | 'feminino' | 'outro';
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  emergency_contact?: string;
  emergency_contact_relationship?: string;
  emergency_phone?: string;
  medical_history?: string;
  main_condition: string;
  health_insurance?: string;
  insurance_number?: string;
  allergies?: string;
  medications?: string;
  weight_kg?: number;
  height_cm?: number;
  blood_type?: string;
  marital_status?: string;
  profession?: string;
  education_level?: string;
  observations?: string;
  organization_id: string;
}

export interface PatientUpdateInput extends Partial<Omit<PatientCreateInput, 'organization_id' | 'birth_date'>> {
  birth_date?: string;
  status?: 'Inicial' | 'Em Tratamento' | 'Recuperação' | 'Concluído';
  progress?: number;
  consent_data?: boolean;
  consent_image?: boolean;
  incomplete_registration?: boolean;
}

// ============================================================================================
// HOOKS
// ============================================================================================

/**
 * Fetch all patients for the current organization
 */
export const usePatients = () => {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async (): Promise<Patient[]> => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as Patient[];
    },
  });
};

/**
 * Fetch a single patient by ID
 */
export const usePatient = (id: string | undefined) => {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: async (): Promise<Patient | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Patient;
    },
    enabled: !!id,
  });
};

/**
 * Create a new patient
 */
export const useCreatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PatientCreateInput): Promise<Patient> => {
      // Sanitize data
      const sanitizedData = {
        full_name: sanitizeString(input.full_name, 200),
        email: input.email ? sanitizeEmail(input.email) : null,
        phone: input.phone ? cleanPhone(input.phone) : null,
        cpf: input.cpf ? cleanCPF(input.cpf) : null,
        birth_date: input.birth_date,
        gender: input.gender,
        address: input.address ? sanitizeString(input.address, 500) : null,
        city: input.city ? sanitizeString(input.city, 100) : null,
        state: input.state ? sanitizeString(input.state, 2) : null,
        zip_code: input.zip_code ? sanitizeString(input.zip_code, 10) : null,
        emergency_contact: input.emergency_contact ? sanitizeString(input.emergency_contact, 200) : null,
        emergency_contact_relationship: input.emergency_contact_relationship ? sanitizeString(input.emergency_contact_relationship, 100) : null,
        emergency_phone: input.emergency_phone ? cleanPhone(input.emergency_phone) : null,
        medical_history: input.medical_history ? sanitizeString(input.medical_history, 5000) : null,
        main_condition: sanitizeString(input.main_condition, 500),
        health_insurance: input.health_insurance ? sanitizeString(input.health_insurance, 200) : null,
        insurance_number: input.insurance_number ? sanitizeString(input.insurance_number, 100) : null,
        allergies: input.allergies ? sanitizeString(input.allergies, 500) : null,
        medications: input.medications ? sanitizeString(input.medications, 500) : null,
        weight_kg: input.weight_kg || null,
        height_cm: input.height_cm || null,
        blood_type: input.blood_type || null,
        marital_status: input.marital_status || null,
        profession: input.profession ? sanitizeString(input.profession, 200) : null,
        education_level: input.education_level || null,
        observations: input.observations ? sanitizeString(input.observations, 5000) : null,
        status: 'Inicial' as const,
        progress: 0,
        consent_data: true,
        consent_image: false,
        incomplete_registration: false,
        organization_id: input.organization_id,
      };

      const { data, error } = await supabase
        .from('patients')
        .insert([sanitizedData])
        .select()
        .single();

      if (error) throw error;
      return data as Patient;
    },
    onSuccess: (data) => {
      logger.info('Paciente criado com sucesso', { id: data.id, name: data.full_name }, 'useCreatePatient');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast({
        title: 'Paciente cadastrado!',
        description: `${data.full_name} foi adicionado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      logger.error('Erro ao criar paciente', error, 'useCreatePatient');
      let errorMessage = 'Não foi possível cadastrar o paciente.';

      if (error.message.includes('duplicate key') || error.message.includes('unique')) {
        errorMessage = 'Já existe um paciente com este CPF ou email.';
      }

      toast({
        title: 'Erro ao cadastrar',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Update an existing patient
 */
export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PatientUpdateInput }): Promise<Patient> => {
      // Sanitize data
      const sanitizedData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (data.full_name !== undefined) sanitizedData.full_name = sanitizeString(data.full_name, 200);
      if (data.email !== undefined) sanitizedData.email = data.email ? sanitizeEmail(data.email) : null;
      if (data.phone !== undefined) sanitizedData.phone = data.phone ? cleanPhone(data.phone) : null;
      if (data.cpf !== undefined) sanitizedData.cpf = data.cpf ? cleanCPF(data.cpf) : null;
      if (data.birth_date !== undefined) sanitizedData.birth_date = data.birth_date;
      if (data.gender !== undefined) sanitizedData.gender = data.gender;
      if (data.address !== undefined) sanitizedData.address = data.address ? sanitizeString(data.address, 500) : null;
      if (data.city !== undefined) sanitizedData.city = data.city ? sanitizeString(data.city, 100) : null;
      if (data.state !== undefined) sanitizedData.state = data.state ? sanitizeString(data.state, 2) : null;
      if (data.zip_code !== undefined) sanitizedData.zip_code = data.zip_code ? sanitizeString(data.zip_code, 10) : null;
      if (data.emergency_contact !== undefined) sanitizedData.emergency_contact = data.emergency_contact ? sanitizeString(data.emergency_contact, 200) : null;
      if (data.emergency_contact_relationship !== undefined) sanitizedData.emergency_contact_relationship = data.emergency_contact_relationship ? sanitizeString(data.emergency_contact_relationship, 100) : null;
      if (data.emergency_phone !== undefined) sanitizedData.emergency_phone = data.emergency_phone ? cleanPhone(data.emergency_phone) : null;
      if (data.medical_history !== undefined) sanitizedData.medical_history = data.medical_history ? sanitizeString(data.medical_history, 5000) : null;
      if (data.main_condition !== undefined) sanitizedData.main_condition = sanitizeString(data.main_condition, 500);
      if (data.health_insurance !== undefined) sanitizedData.health_insurance = data.health_insurance ? sanitizeString(data.health_insurance, 200) : null;
      if (data.insurance_number !== undefined) sanitizedData.insurance_number = data.insurance_number ? sanitizeString(data.insurance_number, 100) : null;
      if (data.allergies !== undefined) sanitizedData.allergies = data.allergies ? sanitizeString(data.allergies, 500) : null;
      if (data.medications !== undefined) sanitizedData.medications = data.medications ? sanitizeString(data.medications, 500) : null;
      if (data.weight_kg !== undefined) sanitizedData.weight_kg = data.weight_kg || null;
      if (data.height_cm !== undefined) sanitizedData.height_cm = data.height_cm || null;
      if (data.blood_type !== undefined) sanitizedData.blood_type = data.blood_type || null;
      if (data.marital_status !== undefined) sanitizedData.marital_status = data.marital_status || null;
      if (data.profession !== undefined) sanitizedData.profession = data.profession ? sanitizeString(data.profession, 200) : null;
      if (data.education_level !== undefined) sanitizedData.education_level = data.education_level || null;
      if (data.observations !== undefined) sanitizedData.observations = data.observations ? sanitizeString(data.observations, 5000) : null;
      if (data.status !== undefined) sanitizedData.status = data.status;
      if (data.progress !== undefined) sanitizedData.progress = data.progress;
      if (data.consent_data !== undefined) sanitizedData.consent_data = data.consent_data;
      if (data.consent_image !== undefined) sanitizedData.consent_image = data.consent_image;
      if (data.incomplete_registration !== undefined) sanitizedData.incomplete_registration = data.incomplete_registration;

      const { data, error } = await supabase
        .from('patients')
        .update(sanitizedData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Patient;
    },
    onSuccess: (data) => {
      logger.info('Paciente atualizado com sucesso', { id: data.id }, 'useUpdatePatient');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', data.id] });
      toast({
        title: 'Paciente atualizado!',
        description: `As informações de ${data.full_name} foram atualizadas.`,
      });
    },
    onError: (error: Error) => {
      logger.error('Erro ao atualizar paciente', error, 'useUpdatePatient');
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Não foi possível atualizar o paciente.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Delete a patient
 */
export const useDeletePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, id) => {
      logger.info('Paciente deletado com sucesso', { id }, 'useDeletePatient');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', id] });
      toast({
        title: 'Paciente excluído',
        description: 'O paciente foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      logger.error('Erro ao deletar paciente', error, 'useDeletePatient');
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Não foi possível excluir o paciente.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Update patient status
 */
export const useUpdatePatientStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'Inicial' | 'Em Tratamento' | 'Recuperação' | 'Concluído' }): Promise<Patient> => {
      const { data, error } = await supabase
        .from('patients')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Patient;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', data.id] });
      toast({
        title: 'Status atualizado',
        description: `O status do paciente foi alterado para ${data.status}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
