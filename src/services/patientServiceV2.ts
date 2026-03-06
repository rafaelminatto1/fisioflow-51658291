import { patientsApi } from '@/integrations/firebase/functions';

export interface PatientV2 {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birth_date?: string; // YYYY-MM-DD
  gender?: string;
  address?: unknown;
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
    const response = await patientsApi.list(params);
    const perPage = params.limit ?? 50;
    const total = response.total ?? response.data.length;
    return {
      data: response.data as unknown as PatientV2[],
      total,
      page: Math.floor((params.offset ?? 0) / perPage) + 1,
      perPage,
    };
  },

  /**
   * Busca um paciente pelo ID
   */
  get: async (patientId: string): Promise<{ data: PatientV2 }> => {
    const data = await patientsApi.get(patientId);
    return { data: data as unknown as PatientV2 };
  },

  /**
   * Cria um novo paciente
   */
  create: async (data: Partial<PatientV2>): Promise<{ data: PatientV2 }> => {
    const created = await patientsApi.create(data as Record<string, unknown>);
    return { data: created as unknown as PatientV2 };
  },

  /**
   * Atualiza um paciente
   */
  update: async (patientId: string, data: Partial<PatientV2>): Promise<{ data: PatientV2 }> => {
    const updated = await patientsApi.update(patientId, data as Record<string, unknown>);
    return { data: updated as unknown as PatientV2 };
  },

  /**
   * Deleta (soft delete) um paciente
   */
  delete: async (patientId: string): Promise<{ success: boolean }> => {
    return patientsApi.delete(patientId);
  },

  /**
   * Busca estatísticas do paciente
   */
  getStats: async (patientId: string) => {
    return patientsApi.getStats(patientId);
  }
};
