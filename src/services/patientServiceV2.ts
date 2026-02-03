import { apiClient } from '@/lib/api/v2/client';
import { API_URLS } from '@/lib/api/v2/config';

export interface PatientV2 {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birth_date?: string; // YYYY-MM-DD
  gender?: string;
  address?: any;
  status: 'Inicial' | 'Em_Tratamento' | 'Recuperacao' | 'Concluido';
  main_condition?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface ListPatientsParams {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListPatientsResponse {
  data: PatientV2[];
  total: number;
  page: number;
  perPage: number;
}

export const PatientServiceV2 = {
  /**
   * Lista pacientes com paginação e busca
   */
  list: async (params: ListPatientsParams = {}): Promise<ListPatientsResponse> => {
    // V2 usa POST para listagem para suportar body complexo, ou query params.
    // Nossa implementação backend aceita POST.
    return apiClient.post<ListPatientsResponse>(API_URLS.patients.list, params);
  },

  /**
   * Busca um paciente pelo ID
   */
  get: async (patientId: string): Promise<{ data: PatientV2 }> => {
    return apiClient.post<{ data: PatientV2 }>(API_URLS.patients.get, { patientId });
  },

  /**
   * Cria um novo paciente
   */
  create: async (data: Partial<PatientV2>): Promise<{ data: PatientV2 }> => {
    return apiClient.post<{ data: PatientV2 }>(API_URLS.patients.create, data);
  },

  /**
   * Atualiza um paciente
   */
  update: async (patientId: string, data: Partial<PatientV2>): Promise<{ data: PatientV2 }> => {
    return apiClient.post<{ data: PatientV2 }>(API_URLS.patients.update, { patientId, ...data });
  },

  /**
   * Deleta (soft delete) um paciente
   */
  delete: async (patientId: string): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(API_URLS.patients.delete, { patientId });
  },

  /**
   * Busca estatísticas do paciente
   */
  getStats: async (patientId: string) => {
    return apiClient.post(API_URLS.patients.stats, { patientId });
  }
};
