/**
 * API Client for Professional App
 * Re-architected to use Cloudflare Workers and Neon DB
 *
 * @module lib/api
 */

import { config } from './config';
import { getToken } from './token-storage';
import {
  ApiPatient,
  ApiAppointment,
  ApiExercise,
  ApiEvolution,
  ApiDashboardStats,
  ApiResponse
} from '@/types/api';

export * from '@/types/api';

class ApiError extends Error {
  constructor(
    public endpoint: string,
    public status: number,
    public message: string
  ) {
    super(`API Error [${endpoint}]: ${status} - ${message}`);
    this.name = 'ApiError';
  }
}

// ============================================================
// AUTH TOKEN
// ============================================================

async function getAuthToken(): Promise<string> {
  const token = await getToken();
  if (!token) {
    throw new Error('User not authenticated');
  }
  return token;
}

// ============================================================
// FETCH HELPERS
// ============================================================

function cleanRequestData(data: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

interface FetchOptions extends RequestInit {
  data?: any;
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  skipAuth?: boolean;
}

export async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const token = options.skipAuth ? null : await getAuthToken();
  const { data, params, timeout = 10000, ...fetchInit } = options;

  let baseUrl = config.apiUrl;
  if (baseUrl.endsWith('/') && endpoint.startsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  } else if (!baseUrl.endsWith('/') && !endpoint.startsWith('/')) {
    baseUrl = baseUrl + '/';
  }
  
  if (baseUrl.endsWith('/api') && endpoint.startsWith('/api')) {
    baseUrl = baseUrl.slice(0, -4);
  }

  let url = `${baseUrl}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const method = fetchInit.method || (data ? 'POST' : 'GET');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token.trim()}`;
  }

  if (fetchInit.headers) {
    Object.assign(headers, fetchInit.headers);
  }

  const body = data ? JSON.stringify(cleanRequestData(data)) : undefined;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchInit,
      method,
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        // Silently fail json parse
      }
      throw new ApiError(endpoint, response.status, errorMessage);
    }

    return await response.json() as T;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Tempo de conexão esgotado (timeout)');
    }
    throw error;
  }
}

// ============================================================
// DASHBOARD API
// ============================================================
export async function getDashboardStats(organizationId?: string): Promise<ApiDashboardStats> {
    const response = await fetchApi<ApiResponse<ApiDashboardStats>>('/api/insights/dashboard', {
        params: { organizationId }
    });
    return response.data || {
        activePatients: 0,
        todayAppointments: 0,
        pendingAppointments: 0,
        completedAppointments: 0,
    };
}

// ============================================================
// PATIENTS API
// ============================================================

export async function getPatients(
  organizationId?: string,
  options?: { status?: string; search?: string; limit?: number }
): Promise<ApiPatient[]> {
  const response = await fetchApi<ApiResponse<ApiPatient[]>>('/api/patients', {
      params: { 
          organizationId, 
          status: options?.status, 
          search: options?.search, 
          limit: options?.limit || 100 
      }
  });
  return response.data || [];
}

export async function getPatientById(id: string): Promise<ApiPatient> {
  const response = await fetchApi<ApiResponse<ApiPatient>>(`/api/patients/${encodeURIComponent(id)}`);
  if (!response.data) throw new Error('Paciente não encontrado');
  return response.data;
}

export async function createPatient(data: Partial<ApiPatient>): Promise<ApiPatient> {
  const response = await fetchApi<ApiResponse<ApiPatient>>('/api/patients', {
      method: 'POST',
      data
  });
  if (response.error) throw new Error(response.error);
  return response.data;
}

export async function updatePatient(id: string, data: Partial<ApiPatient>): Promise<ApiPatient> {
  const response = await fetchApi<ApiResponse<ApiPatient>>(`/api/patients/${encodeURIComponent(id)}`, {
      method: 'PUT',
      data
  });
  if (response.error) throw new Error(response.error);
  return response.data;
}

export async function deletePatient(id: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/api/patients/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ============================================================
// APPOINTMENTS API
// ============================================================

export async function getAppointments(
  organizationId?: string,
  options?: {
    dateFrom?: string;
    dateTo?: string;
    therapistId?: string;
    status?: string;
    patientId?: string;
    limit?: number;
  }
): Promise<ApiAppointment[]> {
  const response = await fetchApi<ApiResponse<ApiAppointment[]>>('/api/appointments', {
      params: { 
          organizationId, 
          dateFrom: options?.dateFrom,
          dateTo: options?.dateTo,
          therapistId: options?.therapistId,
          status: options?.status,
          patientId: options?.patientId,
          limit: options?.limit || 100 
      }
  });
  return response.data || [];
}

export async function getAppointmentById(id: string): Promise<ApiAppointment> {
  const response = await fetchApi<ApiResponse<ApiAppointment>>(`/api/appointments/${encodeURIComponent(id)}`);
  if (!response.data) throw new Error('Agendamento não encontrado');
  return response.data;
}

export async function createAppointment(data: Partial<ApiAppointment>): Promise<ApiAppointment> {
  const response = await fetchApi<ApiResponse<ApiAppointment>>('/api/appointments', {
      method: 'POST',
      data
  });
  if (response.error) throw new Error(response.error);
  return response.data;
}

export async function updateAppointment(
  id: string,
  data: Partial<ApiAppointment>
): Promise<ApiAppointment> {
  const response = await fetchApi<ApiResponse<ApiAppointment>>(`/api/appointments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      data
  });
  if (response.error) throw new Error(response.error);
  return response.data;
}

export async function cancelAppointment(id: string, reason?: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/api/appointments/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      data: { reason }
  });
}

// ============================================================
// EXERCISES API
// ============================================================

export async function getExercises(
  options?: { category?: string; difficulty?: string; search?: string; limit?: number }
): Promise<ApiExercise[]> {
  const response = await fetchApi<ApiResponse<ApiExercise[]>>('/api/exercises', {
      params: { 
          category: options?.category,
          difficulty: options?.difficulty,
          q: options?.search,
          limit: options?.limit || 100 
      }
  });
  return response.data || [];
}

// ============================================================
// EVOLUTIONS API
// ============================================================

export async function getEvolutions(patientId: string): Promise<ApiEvolution[]> {
    const response = await fetchApi<ApiResponse<ApiEvolution[]>>(`/api/patients/${encodeURIComponent(patientId)}/medical-records`, {
        params: { type: 'evolution' }
    });
    return response.data || [];
}

// ============================================================
// TAREFAS API
// ============================================================

export async function getTarefas(params?: any): Promise<any[]> {
  const response = await fetchApi<ApiResponse<any[]>>('/api/tarefas', {
    params,
  });
  return response.data || [];
}

// ============================================================
// MESSAGING API
// ============================================================

export async function getConversations(): Promise<any[]> {
  const response = await fetchApi<ApiResponse<any[]>>('/api/messaging/conversations');
  return response.data || [];
}

export async function sendMessage(participantId: string, content: string): Promise<any> {
    const response = await fetchApi<ApiResponse<any>>('/api/messaging/messages', {
        method: 'POST',
        data: { receiverId: participantId, content }
    });
    return response.data;
}

// ============================================================
// PATIENT FINANCIAL RECORDS API
// ============================================================

export interface ApiFinancialRecord {
  id: string;
  organization_id: string;
  patient_id: string;
  appointment_id?: string;
  session_date: string;
  session_value: number;
  discount_value: number;
  discount_type?: 'percentage' | 'fixed' | 'partnership';
  partnership_id?: string;
  partnership?: {
    name: string;
    discount_type: string;
    discount_value: number;
  };
  final_value: number;
  payment_method?: string;
  payment_status: string;
  paid_amount: number;
  paid_date?: string;
  notes?: string;
  is_barter: boolean;
  barter_notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  patient_name?: string;
}

function mapDbRecordToApiRecord(dbRecord: any): ApiFinancialRecord {
  return {
    id: dbRecord.id,
    organization_id: dbRecord.organization_id,
    patient_id: dbRecord.patient_id,
    appointment_id: dbRecord.appointment_id,
    session_date: dbRecord.data_vencimento || dbRecord.created_at?.split('T')[0],
    session_value: Number(dbRecord.valor),
    discount_value: 0,
    discount_type: undefined,
    partnership_id: undefined,
    final_value: Number(dbRecord.valor),
    payment_method: dbRecord.forma_pagamento,
    payment_status: dbRecord.status === 'concluido' ? 'paid' : 'pending',
    paid_amount: dbRecord.status === 'concluido' ? Number(dbRecord.valor) : 0,
    paid_date: dbRecord.pago_em,
    notes: dbRecord.observacoes,
    is_barter: false,
    barter_notes: undefined,
    created_by: undefined,
    created_at: dbRecord.created_at,
    updated_at: dbRecord.updated_at,
    patient_name: dbRecord.patient_name,
  };
}

export interface ApiFinancialSummary {
  total_sessions: number;
  paid_sessions: number;
  pending_sessions: number;
  total_value: number;
  total_paid: number;
  total_pending: number;
  average_session_value: number;
}

export async function getPatientFinancialRecords(
  patientId: string,
  options?: { status?: string }
): Promise<ApiFinancialRecord[]> {
  const response = await fetchApi<ApiResponse<any[]>>(
    `/api/financial/contas?patientId=${patientId}${options?.status ? `&status=${options.status === 'paid' ? 'concluido' : 'pendente'}` : ''}`
  );
  return (response.data || []).map(mapDbRecordToApiRecord);
}

export async function getPatientFinancialSummary(
  patientId: string
): Promise<ApiFinancialSummary> {
  const records = await getPatientFinancialRecords(patientId);
  
  const paidRecords = records.filter(r => r.payment_status === 'paid');
  const pendingRecords = records.filter(r => r.payment_status === 'pending');
  
  return {
    total_sessions: records.length,
    paid_sessions: paidRecords.length,
    pending_sessions: pendingRecords.length,
    total_value: records.reduce((sum, r) => sum + r.session_value, 0),
    total_paid: paidRecords.reduce((sum, r) => sum + r.final_value, 0),
    total_pending: pendingRecords.reduce((sum, r) => sum + r.final_value, 0),
    average_session_value: records.length > 0 
      ? records.reduce((sum, r) => sum + r.session_value, 0) / records.length 
      : 0,
  };
}

export async function getAllFinancialRecords(options?: { startDate?: string; endDate?: string }): Promise<(ApiFinancialRecord & { patient_name: string })[]> {
  const params: string[] = [];
  if (options?.startDate) params.push(`dateFrom=${options.startDate}`);
  if (options?.endDate) params.push(`dateTo=${options.endDate}`);
  
  const queryString = params.length > 0 ? `?${params.join('&')}` : '';
  const response = await fetchApi<ApiResponse<any[]>>(
    `/api/financial/contas${queryString}`
  );
  return (response.data || []).map(mapDbRecordToApiRecord) as (ApiFinancialRecord & { patient_name: string })[];
}

export async function createFinancialRecord(data: {
  patient_id: string;
  session_date: string;
  session_value: number;
  payment_method?: string;
  notes?: string;
}): Promise<ApiFinancialRecord> {
  const response = await fetchApi<ApiResponse<any>>('/api/financial/contas', {
    method: 'POST',
    data: {
      tipo: 'receita',
      valor: data.session_value,
      status: 'pendente',
      descricao: `Sessão em ${data.session_date}`,
      patient_id: data.patient_id,
      forma_pagamento: data.payment_method,
      observacoes: data.notes,
      data_vencimento: data.session_date.split('T')[0],
    }
  });
  if (response.error) throw new Error(response.error);
  return mapDbRecordToApiRecord(response.data);
}

export async function updateFinancialRecord(
  recordId: string,
  data: Partial<ApiFinancialRecord>
): Promise<ApiFinancialRecord> {
  const updateData: any = {};
  
  if (data.payment_status !== undefined) updateData.status = data.payment_status === 'paid' ? 'concluido' : 'pendente';
  if (data.payment_method !== undefined) updateData.forma_pagamento = data.payment_method;
  if (data.final_value !== undefined) updateData.valor = data.final_value;
  if (data.notes !== undefined) updateData.observacoes = data.notes;
  
  const response = await fetchApi<ApiResponse<any>>(
    `/api/financial/contas/${recordId}`,
    {
      method: 'PUT',
      data: updateData
    }
  );
  if (response.error) throw new Error(response.error);
  return mapDbRecordToApiRecord(response.data);
}

export async function deleteFinancialRecord(recordId: string): Promise<void> {
  await fetchApi<{ success: boolean }>(`/api/financial/contas/${recordId}`, {
    method: 'DELETE'
  });
}

export async function markFinancialRecordAsPaid(
  recordId: string,
  paymentMethod: string,
  paidDate?: string
): Promise<ApiFinancialRecord> {
  const response = await fetchApi<ApiResponse<any>>(
    `/api/financial/contas/${recordId}`,
    {
      method: 'PUT',
      data: {
        status: 'concluido',
        forma_pagamento: paymentMethod,
        pago_em: paidDate || new Date().toISOString().split('T')[0]
      }
    }
  );
  if (response.error) throw new Error(response.error);
  return mapDbRecordToApiRecord(response.data);
}
