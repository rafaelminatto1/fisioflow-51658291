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
