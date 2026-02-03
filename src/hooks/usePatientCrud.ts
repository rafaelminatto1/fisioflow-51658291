import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsApi } from '@/integrations/firebase/functions';
import { toast } from '@/hooks/use-toast';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { sanitizeString, sanitizeEmail, cleanCPF, cleanPhone } from '@/lib/validations';
import { useState, useCallback } from 'react';

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

export interface PatientsQueryParams {
  organizationId?: string | null;
  status?: string | null;
  searchTerm?: string;
  pageSize?: number;
  currentPage?: number;
}

export interface PatientsPaginatedResult {
  data: Patient[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  error: Error | null;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  refetch: () => void;
}

// ============================================================================================
// HOOKS
// ============================================================================================

/**
 * Fetch all patients for the current organization
 * Uses centralized query constants for consistency
 */
export const usePatients = (organizationId?: string | null) => {
  return useQuery({
    queryKey: ['patients', organizationId],
    queryFn: async (): Promise<Patient[]> => {
      if (!organizationId) return [];
      const response = await patientsApi.list({ organizationId, limit: 1000 });
      return (response.data as Patient[]) ?? [];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Fetch a single patient by ID
 * Uses centralized query constants for consistency
 */
export const usePatient = (id: string | undefined) => {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: async (): Promise<Patient | null> => {
      if (!id) return null;
      const response = await patientsApi.get(id);
      return response.data as Patient;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
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

      // Use Firebase Functions API
      const response = await patientsApi.create(sanitizedData);
      return response.data as Patient;
    },
    onSuccess: (data) => {
      // Dado sensível removido: nome completo mascarado para logs (LGPD)
      const firstName = data.full_name ? data.full_name.split(' ')[0] : '***';
      logger.info('Paciente criado com sucesso', { id: data.id, name: firstName }, 'useCreatePatient');
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
    mutationFn: async ({ id, data: inputData }: { id: string; data: PatientUpdateInput }): Promise<Patient> => {
      // Sanitize data
      const sanitizedData: Record<string, string | number | boolean | null> = {
        updated_at: new Date().toISOString(),
      };

      if (inputData.full_name !== undefined) sanitizedData.full_name = sanitizeString(inputData.full_name, 200);
      if (inputData.email !== undefined) sanitizedData.email = inputData.email ? sanitizeEmail(inputData.email) : null;
      if (inputData.phone !== undefined) sanitizedData.phone = inputData.phone ? cleanPhone(inputData.phone) : null;
      if (inputData.cpf !== undefined) sanitizedData.cpf = inputData.cpf ? cleanCPF(inputData.cpf) : null;
      if (inputData.birth_date !== undefined) sanitizedData.birth_date = inputData.birth_date;
      if (inputData.gender !== undefined) sanitizedData.gender = inputData.gender;
      if (inputData.address !== undefined) sanitizedData.address = inputData.address ? sanitizeString(inputData.address, 500) : null;
      if (inputData.city !== undefined) sanitizedData.city = inputData.city ? sanitizeString(inputData.city, 100) : null;
      if (inputData.state !== undefined) sanitizedData.state = inputData.state ? sanitizeString(inputData.state, 2) : null;
      if (inputData.zip_code !== undefined) sanitizedData.zip_code = inputData.zip_code ? sanitizeString(inputData.zip_code, 10) : null;
      if (inputData.emergency_contact !== undefined) sanitizedData.emergency_contact = inputData.emergency_contact ? sanitizeString(inputData.emergency_contact, 200) : null;
      if (inputData.emergency_contact_relationship !== undefined) sanitizedData.emergency_contact_relationship = inputData.emergency_contact_relationship ? sanitizeString(inputData.emergency_contact_relationship, 100) : null;
      if (inputData.emergency_phone !== undefined) sanitizedData.emergency_phone = inputData.emergency_phone ? cleanPhone(inputData.emergency_phone) : null;
      if (inputData.medical_history !== undefined) sanitizedData.medical_history = inputData.medical_history ? sanitizeString(inputData.medical_history, 5000) : null;
      if (inputData.main_condition !== undefined) sanitizedData.main_condition = sanitizeString(inputData.main_condition, 500);
      if (inputData.health_insurance !== undefined) sanitizedData.health_insurance = inputData.health_insurance ? sanitizeString(inputData.health_insurance, 200) : null;
      if (inputData.insurance_number !== undefined) sanitizedData.insurance_number = inputData.insurance_number ? sanitizeString(inputData.insurance_number, 100) : null;
      if (inputData.allergies !== undefined) sanitizedData.allergies = inputData.allergies ? sanitizeString(inputData.allergies, 500) : null;
      if (inputData.medications !== undefined) sanitizedData.medications = inputData.medications ? sanitizeString(inputData.medications, 500) : null;
      if (inputData.weight_kg !== undefined) sanitizedData.weight_kg = inputData.weight_kg || null;
      if (inputData.height_cm !== undefined) sanitizedData.height_cm = inputData.height_cm || null;
      if (inputData.blood_type !== undefined) sanitizedData.blood_type = inputData.blood_type || null;
      if (inputData.marital_status !== undefined) sanitizedData.marital_status = inputData.marital_status || null;
      if (inputData.profession !== undefined) sanitizedData.profession = inputData.profession ? sanitizeString(inputData.profession, 200) : null;
      if (inputData.education_level !== undefined) sanitizedData.education_level = inputData.education_level || null;
      if (inputData.observations !== undefined) sanitizedData.observations = inputData.observations ? sanitizeString(inputData.observations, 5000) : null;
      if (inputData.status !== undefined) sanitizedData.status = inputData.status;
      if (inputData.progress !== undefined) sanitizedData.progress = inputData.progress;
      if (inputData.consent_data !== undefined) sanitizedData.consent_data = inputData.consent_data;
      if (inputData.consent_image !== undefined) sanitizedData.consent_image = inputData.consent_image;
      if (inputData.incomplete_registration !== undefined) sanitizedData.incomplete_registration = inputData.incomplete_registration;

      // Use Firebase Functions API
      const response = await patientsApi.update(id, sanitizedData);
      return response.data as Patient;
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
      await patientsApi.delete(id);
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
      const response = await patientsApi.update(id, { status });
      return response.data as Patient;
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

/**
 * Fetch patients with server-side pagination and filtering
 * @param params Query parameters including organizationId, status, searchTerm, pageSize, currentPage
 * @returns Paginated result with data and pagination controls
 */
export const usePatientsPaginated = (params: PatientsQueryParams = {}): PatientsPaginatedResult => {
  const {
    organizationId,
    status,
    searchTerm,
    pageSize = 20,
    currentPage: initialPage = 1,
  } = params;

  const [currentPage, setCurrentPage] = useState(initialPage);

  const queryResult = useQuery({
    queryKey: ['patients', 'paginated', organizationId, status, searchTerm, currentPage, pageSize],
    queryFn: async (): Promise<{ data: Patient[]; count: number }> => {
      if (!organizationId) return { data: [], count: 0 };

      const response = await patientsApi.list({
        organizationId,
        status: (status === 'all' || status === null) ? undefined : status,
        search: searchTerm,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      });

      return {
        data: (response.data as Patient[]) || [],
        count: response.total || 0,
      };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const totalCount = queryResult.data?.count || 0;
  const data = queryResult.data?.data || [];
  const totalPages = Math.ceil(totalCount / pageSize);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(p => p + 1);
    }
  }, [currentPage, totalPages]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(p => p - 1);
    }
  }, [currentPage]);

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  return {
    data,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    isLoading: queryResult.isLoading,
    error: queryResult.error || null,
    nextPage,
    previousPage,
    goToPage,
    refetch: queryResult.refetch,
  };
};
