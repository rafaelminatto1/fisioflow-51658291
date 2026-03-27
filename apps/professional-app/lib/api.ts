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
  ApiConversation,
  ApiMessage,
  ApiTarefa,
  ApiPartnership,
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

const evolutionCache = new Map<string, ApiEvolution>();

function normalizeExerciseDifficulty(
  difficulty?: string
): ApiExercise['difficulty'] {
  switch (difficulty) {
    case 'iniciante':
      return 'easy';
    case 'intermediario':
      return 'medium';
    case 'avancado':
      return 'hard';
    default:
      return difficulty;
  }
}

function normalizeAppointment(apiAppointment: ApiAppointment): ApiAppointment {
  return {
    ...apiAppointment,
    patientId: apiAppointment.patientId ?? apiAppointment.patient_id,
    therapistId: apiAppointment.therapistId ?? apiAppointment.therapist_id,
    organizationId: apiAppointment.organizationId ?? apiAppointment.organization_id,
    startTime: apiAppointment.startTime ?? apiAppointment.start_time,
    endTime: apiAppointment.endTime ?? apiAppointment.end_time,
  };
}

function normalizeAppointmentPayload(
  data: Partial<ApiAppointment>
): Record<string, unknown> {
  return cleanRequestData({
    ...data,
    patient_id: data.patient_id ?? data.patientId,
    therapist_id: data.therapist_id ?? data.therapistId,
    organization_id: data.organization_id ?? data.organizationId,
    start_time: data.start_time ?? data.startTime,
    end_time: data.end_time ?? data.endTime,
  });
}

function normalizeExercise(apiExercise: any): ApiExercise {
  return {
    ...apiExercise,
    category: apiExercise.category ?? apiExercise.categoryName ?? apiExercise.categoryId ?? 'Geral',
    difficulty: normalizeExerciseDifficulty(apiExercise.difficulty),
    image_url: apiExercise.image_url ?? apiExercise.imageUrl,
    imageUrl: apiExercise.imageUrl ?? apiExercise.image_url,
    video_url: apiExercise.video_url ?? apiExercise.videoUrl,
    videoUrl: apiExercise.videoUrl ?? apiExercise.video_url,
    created_at: apiExercise.created_at ?? apiExercise.createdAt,
    createdAt: apiExercise.createdAt ?? apiExercise.created_at,
    updated_at: apiExercise.updated_at ?? apiExercise.updatedAt,
    updatedAt: apiExercise.updatedAt ?? apiExercise.updated_at,
    instructions: Array.isArray(apiExercise.instructions) ? apiExercise.instructions : [],
  };
}

function normalizeEvolution(apiEvolution: any): ApiEvolution {
  const normalized: ApiEvolution = {
    ...apiEvolution,
    id: String(apiEvolution.id),
    patient_id: String(apiEvolution.patient_id ?? apiEvolution.patientId ?? ''),
    therapist_id: String(apiEvolution.therapist_id ?? apiEvolution.therapistId ?? apiEvolution.created_by ?? ''),
    appointment_id: apiEvolution.appointment_id ?? apiEvolution.appointmentId,
    date:
      apiEvolution.date ??
      apiEvolution.session_date ??
      apiEvolution.record_date ??
      apiEvolution.created_at ??
      new Date().toISOString(),
    subjective: apiEvolution.subjective ?? apiEvolution.chief_complaint ?? '',
    objective:
      typeof apiEvolution.objective === 'string'
        ? apiEvolution.objective
        : apiEvolution.objective
          ? JSON.stringify(apiEvolution.objective)
          : '',
    assessment: apiEvolution.assessment ?? apiEvolution.medical_history ?? '',
    plan: apiEvolution.plan ?? apiEvolution.lifestyle_habits ?? '',
    pain_level:
      apiEvolution.pain_level ??
      apiEvolution.painLevel ??
      apiEvolution.pain_level_after ??
      apiEvolution.pain_level_before ??
      0,
    attachments: Array.isArray(apiEvolution.attachments) ? apiEvolution.attachments : [],
    observations: apiEvolution.observations,
    exercises_performed: Array.isArray(apiEvolution.exercises_performed)
      ? apiEvolution.exercises_performed
      : [],
    pain_level_before: apiEvolution.pain_level_before,
    pain_level_after: apiEvolution.pain_level_after,
    created_at: apiEvolution.created_at ?? apiEvolution.date ?? new Date().toISOString(),
    updated_at: apiEvolution.updated_at ?? apiEvolution.created_at ?? new Date().toISOString(),
  };

  evolutionCache.set(normalized.id, normalized);
  return normalized;
}

function normalizeConversation(rawConversation: any): ApiConversation {
  const participantId =
    rawConversation.participantId ??
    rawConversation.participant_id ??
    rawConversation.participantIds?.find((id: unknown) => typeof id === 'string' && id !== rawConversation.id) ??
    rawConversation.id;

  const participantName =
    rawConversation.participantName ??
    rawConversation.participant_name ??
    rawConversation.participantNames?.[participantId] ??
    rawConversation.participant_short_name ??
    'Usuário';

  const lastMessage =
    typeof rawConversation.lastMessage === 'string'
      ? rawConversation.lastMessage
      : rawConversation.lastMessage?.content ?? rawConversation.last_message_content ?? '';

  const lastMessageAt =
    rawConversation.lastMessageAt ??
    rawConversation.last_message_at ??
    rawConversation.lastMessage?.createdAt ??
    rawConversation.lastMessage?.created_at ??
    rawConversation.updatedAt ??
    rawConversation.updated_at;

  const unreadCount =
    typeof rawConversation.unreadCount === 'number'
      ? rawConversation.unreadCount
      : rawConversation.unreadCount?.[participantId] ??
        rawConversation.unread_count ??
        0;

  return {
    ...rawConversation,
    id: String(rawConversation.id ?? participantId),
    participantId: String(participantId),
    participantName: String(participantName),
    lastMessage,
    lastMessageAt,
    unreadCount: Number(unreadCount),
    updatedAt: rawConversation.updatedAt ?? rawConversation.updated_at ?? lastMessageAt,
  };
}

function normalizeMessage(rawMessage: any): ApiMessage {
  return {
    ...rawMessage,
    id: String(rawMessage.id),
    sender_id: String(rawMessage.sender_id ?? rawMessage.senderId ?? ''),
    senderId: String(rawMessage.senderId ?? rawMessage.sender_id ?? ''),
    recipient_id: String(rawMessage.recipient_id ?? rawMessage.recipientId ?? ''),
    recipientId: String(rawMessage.recipientId ?? rawMessage.recipient_id ?? ''),
    attachment_url: rawMessage.attachment_url ?? rawMessage.attachmentUrl ?? null,
    attachmentUrl: rawMessage.attachmentUrl ?? rawMessage.attachment_url ?? null,
    attachment_name: rawMessage.attachment_name ?? rawMessage.attachmentName ?? null,
    attachmentName: rawMessage.attachmentName ?? rawMessage.attachment_name ?? null,
    read_at: rawMessage.read_at ?? rawMessage.readAt ?? null,
    readAt: rawMessage.readAt ?? rawMessage.read_at ?? null,
    created_at: rawMessage.created_at ?? rawMessage.createdAt ?? new Date().toISOString(),
    createdAt: rawMessage.createdAt ?? rawMessage.created_at ?? new Date().toISOString(),
  };
}

function normalizeChecklist(rawChecklist: any) {
  return {
    id: String(rawChecklist.id),
    title: String(rawChecklist.title ?? ''),
    items: Array.isArray(rawChecklist.items)
      ? rawChecklist.items.map((item: any) => ({
          id: String(item.id),
          text: String(item.text ?? ''),
          completed: Boolean(item.completed),
        }))
      : [],
  };
}

function normalizeTarefa(rawTarefa: any): ApiTarefa {
  return {
    ...rawTarefa,
    id: String(rawTarefa.id),
    tags: Array.isArray(rawTarefa.tags) ? rawTarefa.tags : [],
    checklists: Array.isArray(rawTarefa.checklists)
      ? rawTarefa.checklists.map(normalizeChecklist)
      : [],
    attachments: Array.isArray(rawTarefa.attachments) ? rawTarefa.attachments : [],
    references: Array.isArray(rawTarefa.references)
      ? rawTarefa.references
      : Array.isArray(rawTarefa.task_references)
        ? rawTarefa.task_references
        : [],
    dependencies: Array.isArray(rawTarefa.dependencies) ? rawTarefa.dependencies : [],
  };
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
    try {
        const response = await fetchApi<ApiResponse<ApiDashboardStats>>('/api/insights/dashboard', {
            params: { organizationId }
        });
        return response.data || {
            activePatients: 0,
            todayAppointments: 0,
            pendingAppointments: 0,
            completedAppointments: 0,
        };
    } catch (error) {
        console.error('[getDashboardStats] Error:', error);
        return {
            activePatients: 0,
            todayAppointments: 0,
            pendingAppointments: 0,
            completedAppointments: 0,
        };
    }
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
  return (response.data || []).map(normalizeAppointment);
}

export async function getAppointmentById(id: string): Promise<ApiAppointment> {
  const response = await fetchApi<ApiResponse<ApiAppointment>>(`/api/appointments/${encodeURIComponent(id)}`);
  if (!response.data) throw new Error('Agendamento não encontrado');
  return normalizeAppointment(response.data);
}

export async function createAppointment(data: Partial<ApiAppointment>): Promise<ApiAppointment> {
  const response = await fetchApi<ApiResponse<ApiAppointment>>('/api/appointments', {
      method: 'POST',
      data: normalizeAppointmentPayload(data)
  });
  if (response.error) throw new Error(response.error);
  return normalizeAppointment(response.data);
}

export async function updateAppointment(
  id: string,
  data: Partial<ApiAppointment>
): Promise<ApiAppointment> {
  const response = await fetchApi<ApiResponse<ApiAppointment>>(`/api/appointments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      data: normalizeAppointmentPayload(data)
  });
  if (response.error) throw new Error(response.error);
  return normalizeAppointment(response.data);
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
  return (response.data || []).map(normalizeExercise);
}

export async function getExerciseById(id: string): Promise<ApiExercise> {
  const response = await fetchApi<ApiResponse<ApiExercise>>(`/api/exercises/${encodeURIComponent(id)}`);
  if (!response.data) throw new Error('Exercício não encontrado');
  return normalizeExercise(response.data);
}

export async function createExercise(data: Partial<ApiExercise>): Promise<ApiExercise> {
  const response = await fetchApi<ApiResponse<ApiExercise>>('/api/exercises', {
    method: 'POST',
    data: cleanRequestData({
      ...data,
      imageUrl: data.imageUrl ?? data.image_url,
      videoUrl: data.videoUrl ?? data.video_url,
    }),
  });
  if (response.error) throw new Error(response.error);
  return normalizeExercise(response.data);
}

export async function updateExercise(id: string, data: Partial<ApiExercise>): Promise<ApiExercise> {
  const response = await fetchApi<ApiResponse<ApiExercise>>(`/api/exercises/${encodeURIComponent(id)}`, {
    method: 'PUT',
    data: cleanRequestData({
      ...data,
      imageUrl: data.imageUrl ?? data.image_url,
      videoUrl: data.videoUrl ?? data.video_url,
    }),
  });
  if (response.error) throw new Error(response.error);
  return normalizeExercise(response.data);
}

export async function deleteExercise(id: string): Promise<{ ok: boolean }> {
  return fetchApi<{ ok: boolean }>(`/api/exercises/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ============================================================
// EVOLUTIONS API
// ============================================================

export async function getEvolutions(patientId: string): Promise<ApiEvolution[]> {
    const response = await fetchApi<ApiResponse<ApiEvolution[]>>('/api/evolution/treatment-sessions', {
        params: { patientId, limit: 100 }
    });
    return (response.data || []).map(normalizeEvolution);
}

export async function getEvolutionById(id: string): Promise<ApiEvolution | null> {
  return evolutionCache.get(id) ?? null;
}

export async function createEvolution(data: Partial<ApiEvolution>): Promise<ApiEvolution> {
  if (!data.patient_id) {
    throw new Error('patient_id é obrigatório');
  }

  // Sempre usa treatment-sessions — appointment_id é opcional no worker
  const response = await fetchApi<ApiResponse<ApiEvolution>>('/api/evolution/treatment-sessions', {
    method: 'POST',
    data: {
      patient_id: data.patient_id,
      therapist_id: data.therapist_id,
      appointment_id: data.appointment_id ?? null,
      session_date: data.date,
      subjective: data.subjective,
      objective: data.objective,
      assessment: data.assessment,
      plan: data.plan,
      exercises_performed: data.exercises_performed ?? [],
      pain_level_before: data.pain_level ?? 0,
      pain_level_after: data.pain_level ?? 0,
    },
  });

  if (response.error) throw new Error(response.error);
  const result = normalizeEvolution(response.data);
  evolutionCache.set(result.id, result);
  return result;
}

export async function updateEvolution(id: string, data: Partial<ApiEvolution>): Promise<ApiEvolution> {
  // Usa PATCH /treatment-sessions/:id diretamente pelo ID
  const response = await fetchApi<ApiResponse<ApiEvolution>>(
    `/api/evolution/treatment-sessions/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      data: {
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        observations: data.observations,
        pain_level_before: data.pain_level,
        pain_level_after: data.pain_level,
        session_date: data.date,
      },
    }
  );

  if (response.error) throw new Error(response.error);
  const result = normalizeEvolution(response.data);
  evolutionCache.set(id, result);
  return result;
}

export async function deleteEvolution(id: string): Promise<{ ok: boolean }> {
  const existing = evolutionCache.get(id);
  if (!existing?.patient_id || existing.appointment_id) {
    throw new Error('Exclusão de evolução não suportada para este registro');
  }

  const response = await fetchApi<{ ok?: boolean }>(
    `/api/patients/${encodeURIComponent(existing.patient_id)}/medical-records/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
  evolutionCache.delete(id);
  return { ok: Boolean(response.ok) };
}

// ============================================================
// TAREFAS API
// ============================================================

export async function getTarefas(params?: any): Promise<ApiTarefa[]> {
  const response = await fetchApi<ApiResponse<ApiTarefa[]>>('/api/tarefas', {
    params,
  });
  return (response.data || []).map(normalizeTarefa);
}

export async function createTarefa(data: Partial<ApiTarefa>): Promise<ApiTarefa> {
  const response = await fetchApi<ApiResponse<ApiTarefa>>('/api/tarefas', {
    method: 'POST',
    data,
  });
  if (response.error) throw new Error(response.error);
  return normalizeTarefa(response.data);
}

export async function updateTarefa(id: string, data: Partial<ApiTarefa>): Promise<ApiTarefa> {
  const response = await fetchApi<ApiResponse<ApiTarefa>>(`/api/tarefas/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    data,
  });
  if (response.error) throw new Error(response.error);
  return normalizeTarefa(response.data);
}

export async function deleteTarefa(id: string): Promise<{ ok?: boolean }> {
  return fetchApi<{ ok?: boolean }>(`/api/tarefas/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function bulkUpdateTarefas(
  updates: Array<{ id: string; data: Partial<ApiTarefa> }>
): Promise<{ ok?: boolean }> {
  const payload = updates.map(({ id, data }) => ({
    id,
    status: data.status,
    order_index: data.order_index,
  }));

  return fetchApi<{ ok?: boolean }>('/api/tarefas/bulk', {
    method: 'POST',
    data: { updates: payload },
  });
}

// ============================================================
// MESSAGING API
// ============================================================

export async function getConversations(): Promise<ApiConversation[]> {
  const response = await fetchApi<ApiResponse<ApiConversation[]>>('/api/messaging/conversations');
  return (response.data || []).map(normalizeConversation);
}

export async function getConversationMessages(participantId: string): Promise<ApiMessage[]> {
  const response = await fetchApi<ApiResponse<ApiMessage[]>>(
    `/api/messaging/conversations/${encodeURIComponent(participantId)}/messages`
  );
  return (response.data || []).map(normalizeMessage);
}

export async function sendMessage(participantId: string, content: string): Promise<ApiMessage> {
    const response = await fetchApi<ApiResponse<ApiMessage>>('/api/messaging/messages', {
        method: 'POST',
        data: { recipientId: participantId, content }
    });
    return normalizeMessage(response.data);
}

export async function markAsRead(participantId: string): Promise<{ success?: boolean }> {
  return fetchApi<{ success?: boolean }>(
    `/api/messaging/conversations/${encodeURIComponent(participantId)}/read`,
    { method: 'POST' }
  );
}

export async function getPartnerships(_options?: { activeOnly?: boolean }): Promise<ApiPartnership[]> {
  return [];
}

export async function getPartnershipById(_id: string): Promise<ApiPartnership | null> {
  return null;
}

export async function createPartnership(data: Partial<ApiPartnership>): Promise<ApiPartnership> {
  return {
    id: String(data.id ?? `local-${Date.now()}`),
    name: data.name ?? 'Nova parceria',
    description: data.description ?? null,
    active: data.active ?? true,
    discount_type: data.discount_type,
    discount_value: data.discount_value,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function updatePartnership(id: string, data: Partial<ApiPartnership>): Promise<ApiPartnership> {
  return {
    id,
    name: data.name ?? 'Parceria',
    description: data.description ?? null,
    active: data.active ?? true,
    discount_type: data.discount_type,
    discount_value: data.discount_value,
    updated_at: new Date().toISOString(),
  };
}

export async function deletePartnership(_id: string): Promise<{ ok: boolean }> {
  return { ok: true };
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

// ============================================================
// PATIENT DUPLICATE CHECK API
// ============================================================

export async function checkPatientNameDuplicate(name: string, organizationId?: string): Promise<{ duplicateExists: boolean }> {
  if (!name || name.trim().length < 3) {
    return { duplicateExists: false };
  }

  const response = await fetchApi<ApiResponse<{ duplicateExists: boolean }>>('/api/patients/check-duplicate', {
    method: 'POST',
    data: { name: name.trim(), organizationId }
  });
  
  return { duplicateExists: response.data?.duplicateExists || false };
}
