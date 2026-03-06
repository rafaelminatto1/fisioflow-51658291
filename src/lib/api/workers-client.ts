/**
 * Cliente HTTP para a API Cloudflare Workers (Hono + Neon)
 *
 * URL base: VITE_WORKERS_API_URL (dev: http://localhost:8787)
 *
 * Inclui automaticamente o token JWT do Neon Auth.
 */
import { getNeonAccessToken } from '@/lib/auth/neon-token';

const BASE_URL = (import.meta.env.VITE_WORKERS_API_URL ?? 'http://localhost:8788').replace(
  /\/$/,
  '',
);

async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await getNeonAccessToken();
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authHeaders = await getAuthHeader();
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    const refreshedToken = await getNeonAccessToken({ forceSessionReload: true });
    const retry = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshedToken}`,
        ...options.headers,
      },
    });

    if (!retry.ok) {
      const retryBody = await retry.json().catch(() => ({ error: retry.statusText }));
      throw new Error(retryBody?.error ?? `HTTP ${retry.status}`);
    }

    return retry.json() as Promise<T>;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ===== TIPOS =====
export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; pages: number };
}

export interface Exercise {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  difficulty: 'iniciante' | 'intermediario' | 'avancado';
  imageUrl: string | null;
  videoUrl: string | null;
  musclesPrimary: string[];
  bodyParts: string[];
  equipment: string[];
  durationSeconds: number | null;
  description: string | null;
}

export interface ExerciseCategory {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  color: string | null;
  orderIndex: number;
}

export interface Protocol {
  id: string;
  slug: string | null;
  name: string;
  conditionName: string | null;
  protocolType: string;
  evidenceLevel: string | null;
  description: string | null;
  weeksTotal: number | null;
  tags: string[];
  icd10Codes: string[];
}

export interface WikiPage {
  id: string;
  slug: string;
  title: string;
  icon: string | null;
  category: string | null;
  tags: string[];
  viewCount: number;
  version: number;
  updatedAt: string;
}

export interface WikiPageFull extends WikiPage {
  content: string | null;
  htmlContent: string | null;
  parentId: string | null;
  isPublished: boolean;
  isPublic: boolean;
  createdAt: string;
}

export interface ExerciseTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  conditionName: string | null;
  templateVariant: string | null;
  clinicalNotes: string | null;
  contraindications: string | null;
  precautions: string | null;
  progressionNotes: string | null;
  evidenceLevel: 'A' | 'B' | 'C' | 'D' | null;
  bibliographicReferences: string[];
  isActive: boolean;
  isPublic: boolean;
  organizationId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseTemplateItem {
  id: string;
  templateId: string;
  exerciseId: string;
  orderIndex: number;
  sets: number | null;
  repetitions: number | null;
  duration: number | null;
  notes: string | null;
  weekStart: number | null;
  weekEnd: number | null;
  clinicalNotes: string | null;
  focusMuscles: string[];
  purpose: string | null;
  createdAt: string;
  updatedAt: string;
}

// ===== API EXERCISES =====
export const exercisesApi = {
  categories: () =>
    request<{ data: ExerciseCategory[] }>('/api/exercises/categories'),

  list: (params?: {
    q?: string;
    category?: string;
    difficulty?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return request<PaginatedResponse<Exercise>>(`/api/exercises${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) =>
    request<{ data: Exercise }>(`/api/exercises/${id}`),

  searchSemantic: (q: string, limit: number = 10) =>
    request<{ data: (Exercise & { similarity: number })[] }>(`/api/exercises/search/semantic?q=${encodeURIComponent(q)}&limit=${limit}`),

  favorite: (id: string) =>
    request<{ ok: boolean }>(`/api/exercises/${id}/favorite`, { method: 'POST' }),

  unfavorite: (id: string) =>
    request<{ ok: boolean }>(`/api/exercises/${id}/favorite`, { method: 'DELETE' }),

  myFavorites: () =>
    request<{ data: Exercise[] }>('/api/exercises/favorites/me'),

  create: (data: Omit<Exercise, 'id' | 'slug'>) =>
    request<{ data: Exercise }>('/api/exercises', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Exercise>) =>
    request<{ data: Exercise }>(`/api/exercises/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/exercises/${id}`, {
      method: 'DELETE',
    }),
};

// ===== API PROTOCOLS =====
export const protocolsApi = {
  list: (params?: {
    q?: string;
    type?: string;
    evidenceLevel?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return request<PaginatedResponse<Protocol>>(`/api/protocols${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) =>
    request<{ data: Protocol & { protocolExercises: unknown[] } }>(`/api/protocols/${id}`),

  create: (data: Omit<Protocol, 'id'> & Record<string, unknown>) =>
    request<{ data: Protocol }>('/api/protocols', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Protocol> & Record<string, unknown>) =>
    request<{ data: Protocol }>(`/api/protocols/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/api/protocols/${id}`, {
      method: 'DELETE',
    }),
};

// ===== API WIKI =====
export const wikiApi = {
  list: (params?: { q?: string; category?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return request<PaginatedResponse<WikiPage>>(`/api/wiki${qs ? `?${qs}` : ''}`);
  },

  get: (slug: string) =>
    request<{ data: WikiPageFull }>(`/api/wiki/${slug}`),

  children: (slug: string) =>
    request<{ data: WikiPage[] }>(`/api/wiki/${slug}/children`),

  versions: (slug: string) =>
    request<{ data: unknown[] }>(`/api/wiki/${slug}/versions`),

  create: (data: Omit<WikiPageFull, 'id' | 'slug' | 'updatedAt' | 'createdAt' | 'viewCount' | 'version'> & { comment?: string }) =>
    request<{ data: WikiPageFull }>('/api/wiki', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (slug: string, data: Partial<WikiPageFull> & { comment?: string }) =>
    request<{ data: WikiPageFull }>(`/api/wiki/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (slug: string) =>
    request<{ ok: boolean }>(`/api/wiki/${slug}`, {
      method: 'DELETE',
    }),
};

// ===== API TEMPLATES =====
export const templatesApi = {
  list: (params?: { q?: string; category?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return request<PaginatedResponse<ExerciseTemplate>>(`/api/templates${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) =>
    request<{ data: ExerciseTemplate & { items: ExerciseTemplateItem[] } }>(
      `/api/templates/${id}`,
    ),

  create: (data: Omit<ExerciseTemplate, 'id'> & { items: any[] }) =>
    request<{ data: ExerciseTemplate & { items: ExerciseTemplateItem[] } }>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<ExerciseTemplate> & { items?: any[] }) =>
    request<{ data: ExerciseTemplate & { items: ExerciseTemplateItem[] } }>(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/templates/${id}`, {
      method: 'DELETE',
    }),
};

// ===== API SESSIONS (SOAP Records) =====
export interface SessionRecord {
  id: string;
  patient_id: string;
  appointment_id?: string;
  session_number?: number;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  status: 'draft' | 'finalized' | 'cancelled';
  pain_level?: number;
  pain_location?: string;
  pain_character?: string;
  duration_minutes?: number;
  last_auto_save_at?: string;
  finalized_at?: string;
  finalized_by?: string;
  record_date: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  signed_at?: string;
}

export const sessionsApi = {
  list: (params: {
    patientId: string;
    status?: string;
    appointmentId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries({
          patientId: params.patientId,
          status: params.status,
          appointmentId: params.appointmentId,
          limit: params.limit?.toString(),
          offset: params.offset?.toString(),
        }).filter(([, v]) => v != null) as [string, string][],
      ),
    ).toString();
    return request<{ data: SessionRecord[]; total: number }>(
      `/api/sessions${qs ? `?${qs}` : ''}`,
    );
  },

  get: (id: string) => request<{ data: SessionRecord }>(`/api/sessions/${id}`),

  create: (data: Omit<SessionRecord, 'id' | 'created_at' | 'updated_at'>) =>
    request<{ data: SessionRecord }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Omit<SessionRecord, 'id' | 'created_at'>>) =>
    request<{ data: SessionRecord }>(`/api/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  finalize: (id: string) =>
    request<{ data: SessionRecord }>(`/api/sessions/${id}/finalize`, { method: 'POST' }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/sessions/${id}`, { method: 'DELETE' }),

  autosave: (
    data: Partial<SessionRecord> & { patient_id: string; recordId?: string },
  ) =>
    request<{ data: SessionRecord & { isNew?: boolean } }>('/api/sessions/autosave', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ===== API DOCUMENTS =====
export interface PatientDocument {
  id: string;
  patient_id: string;
  organization_id: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  category: string;
  description?: string;
  storage_url?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export const documentsApi = {
  list: (patientId: string) =>
    request<{ data: PatientDocument[] }>(`/api/documents?patientId=${encodeURIComponent(patientId)}`),

  create: (data: Omit<PatientDocument, 'id' | 'organization_id' | 'uploaded_by' | 'created_at' | 'updated_at'>) =>
    request<{ data: PatientDocument }>('/api/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean; file_path?: string }>(`/api/documents/${id}`, { method: 'DELETE' }),
};

// ===== API EXAMS =====
export interface PatientExamFile {
  id: string;
  exam_id: string;
  file_path: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  storage_url?: string;
}

export interface PatientExam {
  id: string;
  patient_id: string;
  title: string;
  exam_date?: string;
  exam_type?: string;
  description?: string;
  created_at: string;
  files?: PatientExamFile[];
}

export const examsApi = {
  list: (patientId: string) =>
    request<{ data: PatientExam[] }>(`/api/exams?patientId=${encodeURIComponent(patientId)}`),

  create: (data: { patient_id: string; title: string; exam_date?: string; exam_type?: string; description?: string }) =>
    request<{ data: PatientExam }>('/api/exams', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addFile: (examId: string, file: Omit<PatientExamFile, 'id' | 'exam_id'>) =>
    request<{ data: PatientExamFile }>(`/api/exams/${examId}/files`, {
      method: 'POST',
      body: JSON.stringify(file),
    }),

  delete: (id: string) =>
    request<{ ok: boolean; deleted_files?: string[] }>(`/api/exams/${id}`, { method: 'DELETE' }),

  deleteFile: (examId: string, fileId: string) =>
    request<{ ok: boolean }>(`/api/exams/${examId}/files/${fileId}`, { method: 'DELETE' }),
};

// ===== API MEDICAL REQUESTS =====
export interface MedicalRequestFile {
  id: string;
  medical_request_id: string;
  file_path: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  storage_url?: string;
}

export interface MedicalRequest {
  id: string;
  patient_id: string;
  doctor_name?: string;
  request_date?: string;
  notes?: string;
  created_at: string;
  files?: MedicalRequestFile[];
}

export const medicalRequestsApi = {
  list: (patientId: string) =>
    request<{ data: MedicalRequest[] }>(`/api/medical-requests?patientId=${encodeURIComponent(patientId)}`),

  create: (data: { patient_id: string; doctor_name?: string; request_date?: string; notes?: string }) =>
    request<{ data: MedicalRequest }>('/api/medical-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addFile: (requestId: string, file: Omit<MedicalRequestFile, 'id' | 'medical_request_id'>) =>
    request<{ data: MedicalRequestFile }>(`/api/medical-requests/${requestId}/files`, {
      method: 'POST',
      body: JSON.stringify(file),
    }),

  delete: (id: string) =>
    request<{ ok: boolean; deleted_files?: string[] }>(`/api/medical-requests/${id}`, { method: 'DELETE' }),

  deleteFile: (requestId: string, fileId: string) =>
    request<{ ok: boolean }>(`/api/medical-requests/${requestId}/files/${fileId}`, { method: 'DELETE' }),
};

// ===== API GOALS =====
export interface PatientGoal {
  id: string;
  patient_id: string;
  organization_id: string;
  description: string;
  target_date?: string;
  status: string;
  priority?: string;
  achieved_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const goalsApi = {
  list: (patientId: string) =>
    request<{ data: PatientGoal[] }>(`/api/goals?patientId=${encodeURIComponent(patientId)}`),

  create: (data: { patient_id: string; description?: string; goal_title?: string; target_date?: string; priority?: string; status?: string }) =>
    request<{ data: PatientGoal }>('/api/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Pick<PatientGoal, 'status' | 'description' | 'priority' | 'target_date' | 'achieved_at'>>) =>
    request<{ data: PatientGoal }>(`/api/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/goals/${id}`, { method: 'DELETE' }),
};

// ===== API SESSION ATTACHMENTS =====
export interface SessionAttachment {
  id: string;
  session_id: string;
  patient_id: string;
  file_name: string;
  original_name?: string;
  file_url: string;
  thumbnail_url?: string;
  file_type?: string;
  mime_type?: string;
  category?: string;
  size_bytes?: number;
  description?: string;
  uploaded_by?: string;
  uploaded_at: string;
}

export const sessionAttachmentsApi = {
  list: (sessionId: string) =>
    request<{ data: SessionAttachment[] }>(`/api/sessions/${sessionId}/attachments`),

  create: (sessionId: string, data: Omit<SessionAttachment, 'id' | 'session_id' | 'patient_id' | 'uploaded_by' | 'uploaded_at'>) =>
    request<{ data: SessionAttachment }>(`/api/sessions/${sessionId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (sessionId: string, attachmentId: string) =>
    request<{ ok: boolean }>(`/api/sessions/${sessionId}/attachments/${attachmentId}`, { method: 'DELETE' }),
};

// ===== API SESSION TEMPLATES =====
export interface SessionTemplate {
  id: string;
  organization_id?: string;
  therapist_id?: string;
  name: string;
  description?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  is_global?: boolean;
  created_at: string;
  updated_at: string;
}

export const sessionTemplatesApi = {
  list: () =>
    request<{ data: SessionTemplate[] }>('/api/sessions/templates'),

  create: (data: Pick<SessionTemplate, 'name' | 'description' | 'subjective' | 'objective' | 'assessment' | 'plan' | 'is_global'>) =>
    request<{ data: SessionTemplate }>('/api/sessions/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Pick<SessionTemplate, 'name' | 'description' | 'subjective' | 'objective' | 'assessment' | 'plan' | 'is_global'>>) =>
    request<{ data: SessionTemplate }>(`/api/sessions/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/sessions/templates/${id}`, { method: 'DELETE' }),
};

// ===== API GOAL PROFILES =====
export interface GoalProfileRow {
  id: string;
  organization_id?: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  version: number;
  applicable_tests: string[];
  quality_gate?: unknown;
  targets: unknown[];
  clinician_notes_template?: string;
  patient_notes_template?: string;
  evidence: unknown[];
  default_pinned_metric_keys: string[];
  tags: string[];
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export const goalProfilesApi = {
  list: () =>
    request<{ data: GoalProfileRow[] }>('/api/goal-profiles'),

  get: (id: string) =>
    request<{ data: GoalProfileRow }>(`/api/goal-profiles/${id}`),

  create: (data: Partial<GoalProfileRow> & { id: string; name: string }) =>
    request<{ data: GoalProfileRow }>('/api/goal-profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, updates: Partial<GoalProfileRow>) =>
    request<{ data: GoalProfileRow }>(`/api/goal-profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  publish: (id: string) =>
    request<{ data: GoalProfileRow }>(`/api/goal-profiles/${id}/publish`, { method: 'POST' }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/goal-profiles/${id}`, { method: 'DELETE' }),
};

// ===== HEALTH CHECK =====
export const healthApi = {
  check: () =>
    request<{ status: string; environment: string; timestamp: string; version: string }>(
      '/api/health',
    ),
};
