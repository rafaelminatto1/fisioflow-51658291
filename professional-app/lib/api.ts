/**
 * API Client for Professional App
 * Re-architected to use Cloudflare Workers and Neon DB
 *
 * @module lib/api
 */

import { config } from './config';
import { authApi } from './auth-api';

// ============================================================
// TYPES
// ============================================================

export interface ApiPatient {
  id: string;
  name: string;
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
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ApiAppointment {
  id: string;
  patientId?: string; // Client side or camelCase API
  patient_id?: string; // snake_case API
  patient_name?: string;
  therapistId?: string; // Client side or camelCase API
  therapist_id?: string; // snake_case API
  date: string;
  startTime?: string; // Client side or camelCase API
  start_time?: string; // snake_case API
  endTime?: string; // Client side or camelCase API
  end_time?: string; // snake_case API
  status: string;
  type?: string;
  notes?: string;
  session_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiExercise {
  id: string;
  name: string;
  description?: string;
  instructions?: string[];
  category?: string;
  difficulty?: string;
  videoUrl?: string;
  imageUrl?: string;
  sets?: number;
  reps?: number;
  duration?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiEvolution {
    id: string;
    patient_id: string;
    therapist_id: string;
    appointment_id?: string;
    date: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    pain_level?: number;
    attachments?: string[];
    created_at: string;
    updated_at: string;
}

export interface ApiDashboardStats {
    activePatients: number;
    todayAppointments: number;
    pendingAppointments: number;
    completedAppointments: number;
}

export interface ApiPartnership {
  id: string;
  organization_id: string;
  name: string;
  cnpj?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  allows_barter: boolean;
  barter_description?: string;
  barter_sessions_limit?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  };
  final_value: number;
  payment_method?: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'transfer' | 'barter' | 'other';
  payment_status: 'pending' | 'paid' | 'partial' | 'cancelled' | 'refunded';
  paid_amount: number;
  paid_date?: string;
  notes?: string;
  is_barter: boolean;
  barter_notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
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

interface ApiResponse<T> {
  data: T;
  error?: string;
  total?: number;
}

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
  const token = await authApi.getToken();
  if (!token) {
    throw new Error('User not authenticated');
  }
  return token;
}

// ============================================================
// FETCH HELPERS
// ============================================================

/**
 * Clean request data by removing undefined values
 */
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
}

export async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const token = await getAuthToken();
  const { data, params, timeout = 10000, ...fetchInit } = options;

  let url = `${config.apiUrl}${endpoint}`;
  
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
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(fetchInit.headers || {}),
  };

  const body = data ? JSON.stringify(cleanRequestData(data)) : undefined;

  console.log(`[API] ${method} ${url}`);

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
      const responseClone = response.clone();
      
      try {
        const errorJson = await responseClone.json();
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch (jsonError) {
        try {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        } catch (textError) {
          console.warn('[API] Could not parse error response:', jsonError, textError);
        }
      }

      throw new ApiError(endpoint, response.status, errorMessage);
    }

    return response.json() as Promise<T>;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Tempo de conexão esgotado (timeout)');
    }
    console.error(`[API] ${method} ${endpoint}:`, error);
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

export async function getPatientById(id: string): Promise<ApiPatient | null> {
  try {
    const response = await fetchApi<ApiResponse<ApiPatient>>(`/api/patients/${encodeURIComponent(id)}`);
    return response.data || null;
  } catch {
    return null;
  }
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

export async function getAppointmentById(id: string): Promise<ApiAppointment | null> {
  try {
    const response = await fetchApi<ApiResponse<ApiAppointment>>(`/api/appointments/${encodeURIComponent(id)}`);
    return response.data || null;
  } catch {
    return null;
  }
}

export async function createAppointment(data: {
  patientId: string;
  date: string;
  startTime: string;
  endTime: string;
  therapistId?: string;
  organizationId?: string;
  type?: string;
  notes?: string;
}): Promise<ApiAppointment> {
  const payload = {
      patientId: data.patientId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      therapistId: data.therapistId,
      organizationId: data.organizationId,
      notes: data.notes,
  };
  const response = await fetchApi<ApiResponse<ApiAppointment>>('/api/appointments', {
      method: 'POST',
      data: payload
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

export async function getExerciseById(id: string): Promise<ApiExercise | null> {
  try {
    const response = await fetchApi<ApiResponse<ApiExercise>>(`/api/exercises/${encodeURIComponent(id)}`);
    return response.data || null;
  } catch {
    return null;
  }
}

export async function createExercise(data: Partial<ApiExercise>): Promise<ApiExercise> {
  const response = await fetchApi<ApiResponse<ApiExercise>>('/api/exercises', {
      method: 'POST',
      data
  });
  if (response.error) throw new Error(response.error);
  return response.data;
}

export async function updateExercise(id: string, data: Partial<ApiExercise>): Promise<ApiExercise> {
  const response = await fetchApi<ApiResponse<ApiExercise>>(`/api/exercises/${encodeURIComponent(id)}`, {
      method: 'PUT',
      data
  });
  if (response.error) throw new Error(response.error);
  return response.data;
}

export async function deleteExercise(id: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/api/exercises/${encodeURIComponent(id)}`, { method: 'DELETE' });
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

export async function getEvolutionById(id: string): Promise<ApiEvolution | null> {
    try {
        const response = await fetchApi<ApiResponse<ApiEvolution>>(`/api/evolution/${encodeURIComponent(id)}`);
        return response.data || null;
    } catch {
        return null;
    }
}

export async function createEvolution(data: Partial<ApiEvolution>): Promise<ApiEvolution> {
    const response = await fetchApi<ApiResponse<ApiEvolution>>('/api/evolution', {
        method: 'POST',
        data
    });
    if (response.error) throw new Error(response.error);
    return response.data;
}

export async function updateEvolution(id: string, data: Partial<ApiEvolution>): Promise<ApiEvolution> {
    const response = await fetchApi<ApiResponse<ApiEvolution>>(`/api/evolution/${encodeURIComponent(id)}`, {
        method: 'PUT',
        data
    });
    if (response.error) throw new Error(response.error);
    return response.data;
}

export async function deleteEvolution(id: string): Promise<{ success: boolean }> {
    return fetchApi<{ success: boolean }>(`/api/evolution/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ============================================================
// PARTNERSHIPS API
// ============================================================

export async function getPartnerships(options?: {
  activeOnly?: boolean;
  limit?: number;
}): Promise<ApiPartnership[]> {
  const response = await fetchApi<ApiResponse<ApiPartnership[]>>('/api/partnerships', {
      params: { 
          activeOnly: options?.activeOnly,
          limit: options?.limit || 100 
      }
  });
  return response.data || [];
}

export async function getPartnershipById(id: string): Promise<ApiPartnership | null> {
  try {
    const response = await fetchApi<ApiResponse<ApiPartnership>>(`/api/partnerships/${encodeURIComponent(id)}`);
    return response.data || null;
  } catch {
    return null;
  }
}

export async function createPartnership(data: Partial<ApiPartnership>): Promise<ApiPartnership> {
  const response = await fetchApi<ApiResponse<ApiPartnership>>('/api/partnerships', {
      method: 'POST',
      data
  });
  if (response.error) throw new Error(response.error);
  return response.data;
}

export async function updatePartnership(id: string, data: Partial<ApiPartnership>): Promise<ApiPartnership> {
  const response = await fetchApi<ApiResponse<ApiPartnership>>(`/api/partnerships/${encodeURIComponent(id)}`, {
      method: 'PUT',
      data
  });
  if (response.error) throw new Error(response.error);
  return response.data;
}

export async function deletePartnership(id: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/api/partnerships/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ============================================================
// PATIENT FINANCIAL RECORDS API
// ============================================================

export async function getAllFinancialRecords(
  options?: { startDate?: string; endDate?: string; limit?: number }
): Promise<(ApiFinancialRecord & { patient_name: string })[]> {
  const response = await fetchApi<ApiResponse<(ApiFinancialRecord & { patient_name: string })[]>>('/api/financial/transacoes', {
      params: { 
          startDate: options?.startDate,
          endDate: options?.endDate,
          limit: options?.limit || 100 
      }
  });
  return response.data || [];
}

export async function getPatientFinancialRecords(
  patientId: string,
  options?: { status?: string; limit?: number }
): Promise<ApiFinancialRecord[]> {
  const response = await fetchApi<ApiResponse<ApiFinancialRecord[]>>(`/api/financial/transacoes/patient/${encodeURIComponent(patientId)}`, {
      params: { 
          status: options?.status,
          limit: options?.limit || 100 
      }
  });
  return response.data || [];
}

export async function getPatientFinancialSummary(patientId: string): Promise<ApiFinancialSummary | null> {
  try {
    const response = await fetchApi<ApiResponse<ApiFinancialSummary>>(`/api/financial/summary/patient/${encodeURIComponent(patientId)}`);
    return response.data || null;
  } catch {
    return null;
  }
}

export async function createFinancialRecord(data: any): Promise<ApiFinancialRecord> {
  const response = await fetchApi<ApiResponse<ApiFinancialRecord>>('/api/financial/transacoes', {
      method: 'POST',
      data
  });
  if (response.error) throw new Error(response.error);
  return response.data;
}

export async function updateFinancialRecord(
  recordId: string,
  data: Partial<ApiFinancialRecord>
): Promise<ApiFinancialRecord> {
  const response = await fetchApi<ApiResponse<ApiFinancialRecord>>(`/api/financial/transacoes/${encodeURIComponent(recordId)}`, {
      method: 'PUT',
      data
  });
  if (response.error) throw new Error(response.error);
  return response.data;
}

export async function deleteFinancialRecord(recordId: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/api/financial/transacoes/${encodeURIComponent(recordId)}`, { method: 'DELETE' });
}

export async function markFinancialRecordAsPaid(
  recordId: string,
  paymentMethod: string,
  paidDate?: string
): Promise<ApiFinancialRecord> {
  const response = await fetchApi<ApiResponse<ApiFinancialRecord>>(`/api/financial/transacoes/${encodeURIComponent(recordId)}/pay`, {
      method: 'POST',
      data: {
        payment_method: paymentMethod,
        paid_date: paidDate,
      }
  });
  if (response.error) throw new Error(response.error);
  return response.data;
}
// ============================================================
// MESSAGING API
// ============================================================

export interface ApiConversation {
  id: string;
  participantId: string;
  participantName: string;
  participantType: 'patient' | 'professional';
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export interface ApiMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file';
  createdAt: string;
  readAt?: string;
}

export async function getConversations(): Promise<ApiConversation[]> {
  const response = await fetchApi<ApiResponse<ApiConversation[]>>('/api/messaging/conversations');
  return response.data || [];
}

export async function getConversationMessages(participantId: string): Promise<ApiMessage[]> {
  const response = await fetchApi<ApiResponse<ApiMessage[]>>(`/api/messaging/conversations/${encodeURIComponent(participantId)}/messages`);
  return response.data || [];
}

export async function sendMessage(participantId: string, content: string, type: string = 'text'): Promise<ApiMessage> {
  const response = await fetchApi<ApiResponse<ApiMessage>>('/api/messaging/messages', {
    method: 'POST',
    data: {
      receiverId: participantId,
      content,
      type
    }
  });
  if (response.error) throw new Error(response.error);
  return response.data;
}

export async function markAsRead(participantId: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/api/messaging/conversations/${encodeURIComponent(participantId)}/read`, {
    method: 'POST'
  });
}
