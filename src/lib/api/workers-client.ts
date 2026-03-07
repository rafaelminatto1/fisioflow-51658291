/**
 * Cliente HTTP para a API Cloudflare Workers (Hono + Neon)
 *
 * URL base: VITE_WORKERS_API_URL (dev: http://localhost:8787)
 *
 * Inclui automaticamente o token JWT do Neon Auth.
 */
import { getNeonAccessToken } from '@/lib/auth/neon-token';
import type {
  PatientLifecycleEvent as PatientLifecycleEventType,
  PatientOutcomeMeasure as PatientOutcomeMeasureType,
  PatientSessionMetrics as PatientSessionMetricsType,
  PatientPrediction as PatientPredictionType,
  PatientRiskScore as PatientRiskScoreType,
  PatientInsight as PatientInsightType,
  PatientGoalTracking as PatientGoalTrackingType,
  ClinicalBenchmark as ClinicalBenchmarkType,
  MLTrainingData,
} from '@/types/patientAnalytics';
import type { PathologyRequiredMeasurement, MedicalReturn } from '@/types/evolution';

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

async function requestPublic<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

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

// ===== API PROFILE =====
export interface TherapistSummary {
  id: string;
  name: string;
  crefito?: string;
}

export interface PatientRow {
  id: string;
  name: string;
  full_name?: string;
  cpf?: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  gender?: string | null;
  main_condition?: string | null;
  status?: string;
  progress?: number;
  incomplete_registration?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PatientSurgery {
  id: string;
  name: string;
  surgery_date?: string | null;
  surgeon?: string | null;
  hospital?: string | null;
  post_op_protocol?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface PatientPathology {
  id: string;
  name: string;
  icd_code?: string | null;
  status?: string | null;
  diagnosed_at?: string | null;
  treated_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface PatientStats {
  totalSessions: number;
  upcomingAppointments: number;
  lastVisit?: string;
}

export const patientsApi = {
  list: (params?: {
    status?: string;
    search?: string;
    createdFrom?: string;
    createdTo?: string;
    incompleteRegistration?: boolean;
    sortBy?: 'name_asc' | 'created_at_desc' | 'created_at_asc';
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return request<{ data: PatientRow[]; total?: number }>(`/api/patients${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<{ data: PatientRow }>(`/api/patients/${id}`),
  create: (data: Partial<PatientRow>) =>
    request<{ data: PatientRow }>('/api/patients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<PatientRow>) =>
    request<{ data: PatientRow }>(`/api/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<{ success: boolean }>(`/api/patients/${id}`, { method: 'DELETE' }),
  stats: (id: string) => request<{ data: PatientStats }>(`/api/patients/${id}/stats`),
  lastUpdated: () => request<{ data: { last_updated_at: string | null } }>('/api/patients/last-updated'),
  surgeries: (patientId: string) =>
    request<{ data: PatientSurgery[] }>(
      `/api/patients/${encodeURIComponent(patientId)}/surgeries`,
    ),
  pathologies: (patientId: string) =>
    request<{ data: PatientPathology[] }>(
      `/api/patients/${encodeURIComponent(patientId)}/pathologies`,
    ),
  medicalReturns: (patientId: string) =>
    request<{ data: MedicalReturn[] }>(`/api/patients/${encodeURIComponent(patientId)}/medical-returns`),
};

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';
  active: boolean;
  joined_at: string;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
}

export const organizationMembersApi = {
  list: (params?: { organizationId?: string; userId?: string; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return request<{ data: OrganizationMember[]; total?: number }>(`/api/organization-members${qs ? `?${qs}` : ''}`);
  },
  create: (data: {
    organizationId?: string;
    userId: string;
    role: OrganizationMember['role'];
  }) =>
    request<{ data: OrganizationMember }>('/api/organization-members', {
      method: 'POST',
      body: JSON.stringify({
        organizationId: data.organizationId,
        userId: data.userId,
        role: data.role,
      }),
    }),
  update: (id: string, data: Partial<Pick<OrganizationMember, 'role' | 'active'>>) =>
    request<{ data: OrganizationMember }>(`/api/organization-members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    request<{ success: boolean }>(`/api/organization-members/${id}`, {
      method: 'DELETE',
    }),
};

export interface WorkerOrganization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const organizationsApi = {
  get: (id: string) => request<{ data: WorkerOrganization }>(`/api/organizations/${id}`),
  create: (data: {
    name: string;
    slug: string;
    settings?: Record<string, unknown>;
    active?: boolean;
  }) =>
    request<{ data: WorkerOrganization }>('/api/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: Partial<Omit<WorkerOrganization, 'id' | 'created_at' | 'updated_at'>>,
  ) =>
    request<{ data: WorkerOrganization }>(`/api/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export const profileApi = {
  me: () => request<{ data: { organization_id?: string; organizationId?: string } }>('/api/profile/me'),
  listTherapists: () =>
    request<{ data: TherapistSummary[] }>('/api/profile/therapists'),
};

export interface DashboardResponse {
  data: {
    activePatients: number;
    monthlyRevenue: number;
    occupancyRate: number;
    noShowRate: number;
    confirmationRate: number;
    npsScore: number;
    appointmentsToday: number;
    revenueChart: { date: string; revenue: number }[];
  };
}

export interface FinancialReportResponse {
  data: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    revenueByMethod: Record<string, number>;
    revenueByTherapist: { therapistId: string; therapistName: string; revenue: number; sessions: number }[];
    delinquencyRate: number;
  };
}

export interface PatientEvolutionPoint {
  id: string;
  date: string;
  averageEva: number;
}

export type PatientLifecycleEvent = PatientLifecycleEventType;
export type PatientOutcomeMeasure = PatientOutcomeMeasureType;
export type PatientSessionMetrics = PatientSessionMetricsType;
export type PatientPrediction = PatientPredictionType;
export type PatientRiskScore = PatientRiskScoreType;
export type PatientInsight = PatientInsightType;
export type PatientGoalTracking = PatientGoalTrackingType;
export type ClinicalBenchmark = ClinicalBenchmarkType;

export interface PatientProgressSummary {
  total_sessions: number;
  avg_pain_reduction: number | null;
  total_pain_reduction: number;
  avg_functional_improvement: number | null;
  current_pain_level: number | null;
  initial_pain_level: number | null;
  goals_achieved: number;
  goals_in_progress: number;
  overall_progress_percentage: number | null;
}

export interface MlTrainingPatientRecord {
  id: string;
  created_at: string;
}

export interface MlTrainingStats {
  totalRecords: number;
  outcomeCounts: Record<string, number>;
  ageDistribution: Record<string, number>;
  avgPainReduction: number;
  avgFunctionalImprovement: number;
  successRate: number;
}

export interface PopulationHealthAppointment {
  id: string;
  patient_id?: string;
  date: string;
  status?: string;
  type?: string;
}

export interface PopulationHealthResponse {
  patients: Array<{ id: string; full_name: string; gender?: string; created_at?: string; birth_date?: string }>;
  mlData: MLTrainingData[];
  appointments: PopulationHealthAppointment[];
  totalRecords: number;
}

export interface AnalyticsExerciseUsage {
  name: string;
  count: number;
}

export interface AnalyticsPainRegion {
  name: string;
  value: number;
}

export interface IntelligentReportRecord {
  id?: string;
  patient_id: string;
  report_type: string;
  report_content: string;
  date_range_start?: string;
  date_range_end?: string;
  created_at?: string;
}

export interface IntelligentReportResponse {
  report: string;
  patientId: string;
  reportType: string;
  dateRange: { start: string; end: string };
  generatedAt: string;
}

export const analyticsApi = {
  dashboard: (params?: { period?: string; startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).map(([k, v]) => [k, String(v)]),
    ).toString();
    return request<DashboardResponse>(`/api/analytics/dashboard${qs ? `?${qs}` : ''}`);
  },
  financial: (params: { startDate: string; endDate: string }) =>
    request<FinancialReportResponse>(`/api/analytics/financial?startDate=${encodeURIComponent(
      params.startDate,
    )}&endDate=${encodeURIComponent(params.endDate)}`),
  topExercises: (limit?: number) =>
    request<{ data: AnalyticsExerciseUsage[] }>(
      `/api/analytics/top-exercises${limit ? `?limit=${encodeURIComponent(String(limit))}` : ''}`,
    ),
  painMap: (limit?: number) =>
    request<{ data: AnalyticsPainRegion[] }>(
      `/api/analytics/pain-map${limit ? `?limit=${encodeURIComponent(String(limit))}` : ''}`,
    ),
  intelligentReports: {
    list: (patientId: string) =>
      request<{ data: IntelligentReportRecord[] }>(`/api/analytics/intelligent-reports/${patientId}`),
    generate: (payload: {
      patientId: string;
      reportType: string;
      dateRange: { start: string; end: string };
    }) =>
      request<{ data: IntelligentReportResponse }>('/api/analytics/intelligent-reports', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  patientEvolution: (patientId: string) =>
    request<{ data: PatientEvolutionPoint[] }>(`/api/analytics/patient-evolution/${patientId}`),
  patientProgress: (patientId: string) =>
    request<{ data: PatientProgressSummary }>(`/api/analytics/patient-progress/${patientId}`),
  patientLifecycleEvents: {
    list: (patientId: string) =>
      request<{ data: PatientLifecycleEvent[] }>(`/api/analytics/patient-lifecycle-events/${patientId}`),
    create: (data: {
      patient_id: string;
      event_type: string;
      event_date?: string;
      notes?: string;
    }) =>
      request<{ data: PatientLifecycleEvent }>('/api/analytics/patient-lifecycle-events', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  patientOutcomeMeasures: {
    list: (patientId: string, params?: { measureType?: string; limit?: number }) => {
      const qs = new URLSearchParams(
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString();
      return request<{ data: PatientOutcomeMeasure[] }>(
        `/api/analytics/patient-outcome-measures/${patientId}${qs ? `?${qs}` : ''}`,
      );
    },
    create: (data: {
      patient_id: string;
      measure_type: string;
      measure_name: string;
      score: number;
      normalized_score?: number;
      min_score?: number;
      max_score?: number;
      measurement_date?: string;
      body_part?: string;
      context?: string;
      notes?: string;
    }) =>
      request<{ data: PatientOutcomeMeasure }>('/api/analytics/patient-outcome-measures', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  patientSessionMetrics: {
    list: (patientId: string, params?: { limit?: number }) => {
      const qs = new URLSearchParams(
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString();
      return request<{ data: PatientSessionMetrics[] }>(
        `/api/analytics/patient-session-metrics/${patientId}${qs ? `?${qs}` : ''}`,
      );
    },
    create: (data: Partial<PatientSessionMetricsType & { patient_id: string }>) =>
      request<{ data: PatientSessionMetrics }>('/api/analytics/patient-session-metrics', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  patientPredictions: {
    list: (patientId: string, params?: { predictionType?: string; limit?: number }) => {
      const qs = new URLSearchParams(
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString();
      return request<{ data: PatientPrediction[] }>(
        `/api/analytics/patient-predictions/${patientId}${qs ? `?${qs}` : ''}`,
      );
    },
    upsert: (payload: {
      patient_id: string;
      predictions: Array<{
        prediction_type: string;
        features?: Record<string, unknown>;
        predicted_value?: number;
        predicted_class?: string;
        confidence_score: number;
        confidence_interval?: Record<string, number>;
        target_date?: string;
        timeframe_days?: number;
        model_version: string;
        model_name?: string;
        milestones?: unknown[];
        risk_factors?: unknown[];
        treatment_recommendations?: Record<string, unknown>;
        similar_cases?: Record<string, unknown>;
      }>;
    }) =>
      request<{ data: PatientPrediction[] }>('/api/analytics/patient-predictions/upsert', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  patientRisk: (patientId: string) =>
    request<{ data: PatientRiskScore | null }>(`/api/analytics/patient-risk/${patientId}`),
  patientInsights: {
    list: (patientId: string, params?: { includeAcknowledged?: boolean }) => {
      const qs = new URLSearchParams(
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString();
      return request<{ data: PatientInsight[] }>(
        `/api/analytics/patient-insights/${patientId}${qs ? `?${qs}` : ''}`,
      );
    },
    acknowledge: (insightId: string) =>
      request<{ data: PatientInsight }>(`/api/analytics/patient-insights/${insightId}/acknowledge`, {
        method: 'PATCH',
      }),
  },
  patientGoals: {
    list: (patientId: string) =>
      request<{ data: PatientGoalTracking[] }>(`/api/analytics/patient-goals/${patientId}`),
    create: (data: Partial<PatientGoalTracking & { patient_id: string }>) =>
      request<{ data: PatientGoalTracking }>('/api/analytics/patient-goals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<PatientGoalTracking>) =>
      request<{ data: PatientGoalTracking }>(`/api/analytics/patient-goals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    complete: (id: string) =>
      request<{ data: PatientGoalTracking }>(`/api/analytics/patient-goals/${id}/complete`, {
        method: 'PATCH',
      }),
  },
  clinicalBenchmarks: {
    list: (category?: string) => {
      const qs = category ? `?category=${encodeURIComponent(category)}` : '';
      return request<{ data: ClinicalBenchmark[] }>(`/api/analytics/clinical-benchmarks${qs}`);
    },
  },
  mlTrainingData: {
    collect: (patientId: string) =>
      request<{ data: MLTrainingData }>(`/api/analytics/ml-training-data/patient/${patientId}`),
    upsert: (data: Partial<MLTrainingData>) =>
      request<{ data: MLTrainingData }>('/api/analytics/ml-training-data', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    stats: () => request<{ data: MlTrainingStats }>('/api/analytics/ml-training-data/stats'),
    patients: (params?: { limit?: number }) => {
      const qs = params?.limit ? `?limit=${encodeURIComponent(String(params.limit))}` : '';
      return request<{ data: MlTrainingPatientRecord[] }>(`/api/analytics/ml-training-data/patients${qs}`);
    },
    similar: (options: {
      condition: string;
      minAge?: number;
      maxAge?: number;
      limit?: number;
    }) => {
      const qs = new URLSearchParams(
        Object.entries({
          condition: options.condition,
          minAge: options.minAge,
          maxAge: options.maxAge,
          limit: options.limit,
        }).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
      ).toString();
      return request<{ data: MLTrainingData[] }>(
        `/api/analytics/ml-training-data/similar${qs ? `?${qs}` : ''}`,
      );
    },
  },
  populationHealth: {
    query: (params: { startDate: string; endDate: string }) => {
      const qs = new URLSearchParams({
        startDate: params.startDate,
        endDate: params.endDate,
      }).toString();
      return request<{ data: PopulationHealthResponse }>(
        `/api/analytics/population-health?${qs}`,
      );
    },
  },
};

export interface EvolutionMeasurementRecord {
  id: string;
  patient_id: string;
  measurement_type: string;
  measurement_name: string;
  value?: number | null;
  unit?: string | null;
  notes?: string | null;
  custom_data?: Record<string, unknown> | null;
  measured_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TreatmentSessionRecord {
  id: string;
  patient_id: string;
  therapist_id: string;
  appointment_id: string;
  session_date: string;
  subjective?: string | null;
  objective?: Record<string, unknown> | string | null;
  assessment?: string | null;
  plan?: string | null;
  observations?: string | null;
  pain_level_before?: number | null;
  pain_level_after?: number | null;
  next_session_goals?: string | null;
  created_at: string;
  updated_at: string;
}

export const evolutionApi = {
  measurements: {
    list: (patientId: string, params?: { limit?: number }) => {
      const query = new URLSearchParams(
        Object.entries({
          patientId,
          limit: params?.limit ? String(params.limit) : undefined,
        }).filter(([, value]) => value != null) as [string, string][],
      ).toString();

      return request<{ data: EvolutionMeasurementRecord[] }>(
        `/api/evolution/measurements${query ? `?${query}` : ''}`,
      );
    },
    create: (data: {
      patient_id: string;
      measurement_type: string;
      measurement_name: string;
      value?: number;
      unit?: string;
      notes?: string;
      custom_data?: Record<string, unknown>;
      measured_at?: string;
    }) =>
      request<{ data: EvolutionMeasurementRecord }>('/api/evolution/measurements', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  requiredMeasurements: {
    list: (pathologies: string[]) => {
      const query = new URLSearchParams();
      if (pathologies.length > 0) {
        query.set('pathologies', pathologies.join(','));
      }
      return request<{ data: PathologyRequiredMeasurement[] }>(
        `/api/evolution/required-measurements${query.toString() ? `?${query.toString()}` : ''}`,
      );
    },
  },
  treatmentSessions: {
    upsert: (data: {
      patient_id: string;
      appointment_id: string;
      therapist_id?: string;
      subjective?: string;
      objective?: Record<string, unknown> | string;
      assessment?: string;
      plan?: string;
      observations?: string;
      pain_level_before?: number;
      pain_level_after?: number;
      session_date?: string;
    }) =>
      request<{ data: TreatmentSessionRecord }>('/api/evolution/treatment-sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};

// ===== API APPOINTMENTS =====
export interface AppointmentRow {
  id: string;
  patient_id?: string;
  therapist_id?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  patient_name?: string;
  patient_phone?: string;
  session_type?: string;
}

export interface AppointmentsLastUpdated {
  last_updated_at: string | null;
}

export const appointmentsApi = {
  list: (params?: {
    dateFrom?: string;
    dateTo?: string;
    therapistId?: string;
    status?: string;
    patientId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return request<{ data: AppointmentRow[] }>(`/api/appointments${qs ? `?${qs}` : ''}`);
  },
  lastUpdated: () => request<{ data: AppointmentsLastUpdated }>('/api/appointments/last-updated'),
};

// ===== API FINANCIAL =====
export interface Transacao { id: string; organization_id?: string; user_id?: string; tipo: string; valor: number; descricao?: string; status?: string; categoria?: string; metadata?: Record<string,unknown>; created_at: string; updated_at: string; }
export interface ContaFinanceira { id: string; organization_id: string; tipo: string; valor: number; status?: string; descricao?: string; categoria?: string | null; forma_pagamento?: string | null; data_vencimento?: string; pago_em?: string; data_pagamento?: string | null; patient_id?: string; appointment_id?: string; observacoes?: string; created_at: string; updated_at: string; }
export interface CentroCusto { id: string; organization_id: string; nome: string; descricao?: string; codigo?: string; ativo: boolean; created_at: string; updated_at: string; }
export interface Convenio { id: string; organization_id: string; nome: string; cnpj?: string; telefone?: string; email?: string; contato_responsavel?: string; valor_repasse?: number; prazo_pagamento_dias?: number; observacoes?: string; ativo: boolean; created_at: string; updated_at: string; }
export interface Pagamento { id: string; organization_id?: string; evento_id?: string; appointment_id?: string; valor: number; forma_pagamento?: string; pago_em?: string; observacoes?: string; patient_id?: string; created_at: string; updated_at: string; }
export interface EmpresaParceira { id: string; organization_id?: string | null; nome: string; contato?: string | null; email?: string | null; telefone?: string | null; contrapartidas?: string | null; observacoes?: string | null; ativo: boolean; created_at: string; updated_at: string; }
export interface Fornecedor { id: string; organization_id?: string | null; tipo_pessoa: 'pf' | 'pj'; razao_social: string; nome_fantasia?: string | null; cpf_cnpj?: string | null; inscricao_estadual?: string | null; email?: string | null; telefone?: string | null; celular?: string | null; endereco?: string | null; cidade?: string | null; estado?: string | null; cep?: string | null; observacoes?: string | null; categoria?: string | null; ativo: boolean; created_at: string; updated_at: string; }
export interface FormaPagamento { id: string; organization_id?: string | null; nome: string; tipo: 'geral' | 'entrada' | 'saida'; taxa_percentual: number; dias_recebimento: number; ativo: boolean; created_at: string; updated_at: string; }
export interface PatientPackageRow {
  id: string;
  patient_id: string;
  name: string;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  price?: number | null;
  status?: string | null;
  purchased_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  patient_name?: string | null;
  patient_phone?: string | null;
}

const fin = (path: string, opts?: RequestInit) => request<any>(`/api/financial${path}`, opts);
export const financialApi = {
  transacoes: { list: (p?: {tipo?:string;status?:string;dateFrom?:string;dateTo?:string;limit?:number;offset?:number}) => fin(`/transacoes?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`) , create: (d: Partial<Transacao>) => fin('/transacoes',{method:'POST',body:JSON.stringify(d)}), update: (id:string,d:Partial<Transacao>)=>fin(`/transacoes/${id}`,{method:'PUT',body:JSON.stringify(d)}), delete: (id:string)=>fin(`/transacoes/${id}`,{method:'DELETE'}) },
  contas: { list: (p?: {tipo?:string;status?:string;dateFrom?:string;dateTo?:string;limit?:number;offset?:number}) => fin(`/contas?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`) , create: (d: Partial<ContaFinanceira>) => fin('/contas',{method:'POST',body:JSON.stringify(d)}), update: (id:string,d:Partial<ContaFinanceira>)=>fin(`/contas/${id}`,{method:'PUT',body:JSON.stringify(d)}), delete: (id:string)=>fin(`/contas/${id}`,{method:'DELETE'}) },
  centrosCusto: { list: () => fin('/centros-custo'), create: (d:Partial<CentroCusto>)=>fin('/centros-custo',{method:'POST',body:JSON.stringify(d)}), update:(id:string,d:Partial<CentroCusto>)=>fin(`/centros-custo/${id}`,{method:'PUT',body:JSON.stringify(d)}), delete:(id:string)=>fin(`/centros-custo/${id}`,{method:'DELETE'}) },
  convenios: { list: () => fin('/convenios'), create: (d:Partial<Convenio>)=>fin('/convenios',{method:'POST',body:JSON.stringify(d)}), update:(id:string,d:Partial<Convenio>)=>fin(`/convenios/${id}`,{method:'PUT',body:JSON.stringify(d)}), delete:(id:string)=>fin(`/convenios/${id}`,{method:'DELETE'}) },
  pagamentos: {
    list: (p?: string | {eventoId?:string;patientId?:string;appointmentId?:string;dateFrom?:string;dateTo?:string;limit?:number;offset?:number}) => {
      const params = typeof p === 'string' ? { eventoId: p } : (p ?? {});
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([,v]) => v != null)
            .map(([k,v]) => [k, String(v)]),
        ),
      );
      return fin(`/pagamentos${query.toString() ? `?${query.toString()}` : ''}`);
    },
    create:(d:Partial<Pagamento>)=>fin('/pagamentos',{method:'POST',body:JSON.stringify(d)}),
    update:(id:string,d:Partial<Pagamento>)=>fin(`/pagamentos/${id}`,{method:'PUT',body:JSON.stringify(d)}),
    delete:(id:string)=>fin(`/pagamentos/${id}`,{method:'DELETE'}),
  },
  empresasParceiras: {
    list: () => fin('/empresas-parceiras'),
    create: (d: Partial<EmpresaParceira>) => fin('/empresas-parceiras', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<EmpresaParceira>) => fin(`/empresas-parceiras/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string) => fin(`/empresas-parceiras/${id}`, { method: 'DELETE' }),
  },
  fornecedores: {
    list: () => fin('/fornecedores'),
    create: (d: Partial<Fornecedor>) => fin('/fornecedores', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<Fornecedor>) => fin(`/fornecedores/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string) => fin(`/fornecedores/${id}`, { method: 'DELETE' }),
  },
  formasPagamento: {
    list: () => fin('/formas-pagamento'),
    create: (d: Partial<FormaPagamento>) => fin('/formas-pagamento', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<FormaPagamento>) => fin(`/formas-pagamento/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string) => fin(`/formas-pagamento/${id}`, { method: 'DELETE' }),
  },
  patientPackages: {
    list: (params?: { patientId?: string; status?: string; limit?: number; offset?: number }) => {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      );
      return fin(`/patient-packages${query.toString() ? `?${query.toString()}` : ''}`);
    },
  },
};

export interface Recibo {
  id: string;
  organization_id: string;
  numero_recibo: number;
  patient_id: string | null;
  valor: number;
  valor_extenso: string | null;
  referente: string | null;
  data_emissao: string;
  emitido_por: string | null;
  cpf_cnpj_emitente: string | null;
  assinado: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecibosLastNumber {
  last_number: number;
}

export const recibosApi = {
  list: (params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return request<{ data: Recibo[] }>(`/api/recibos${qs ? `?${qs}` : ''}`);
  },
  create: (data: {
    patient_id?: string | null;
    valor: number;
    valor_extenso?: string | null;
    referente?: string | null;
    data_emissao?: string;
    emitido_por?: string | null;
    cpf_cnpj_emitente?: string | null;
    assinado?: boolean;
  }) =>
    request<{ data: Recibo }>('/api/recibos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  lastNumber: () => request<{ data: RecibosLastNumber }>('/api/recibos/last-number'),
};

// ===== API SCHEDULING =====
export interface RecurringSeries { id: string; organization_id: string; patient_id?: string; therapist_id?: string; recurrence_type: string; recurrence_interval?: number; recurrence_days_of_week?: number[]; appointment_date?: string; appointment_time?: string; duration?: number; appointment_type?: string; notes?: string; auto_confirm?: boolean; is_active: boolean; created_by?: string; canceled_at?: string; created_at: string; updated_at: string; }
export interface WaitlistEntry { id: string; organization_id: string; patient_id?: string; preferred_days?: number[]; preferred_periods?: string[]; preferred_therapist_id?: string; priority: string; status: string; refusal_count?: number; offered_slot?: unknown; offered_at?: string; offer_expires_at?: string; notes?: string; created_at: string; updated_at: string; }
export interface ScheduleCapacityConfig { id: string; day_of_week: number; start_time: string; end_time: string; max_patients: number; created_at?: string; updated_at?: string; }
export interface ScheduleBusinessHour { id: string; day_of_week: number; is_open: boolean; open_time: string; close_time: string; break_start?: string | null; break_end?: string | null; }
export interface ScheduleCancellationRule { id: string; min_hours_before: number; allow_patient_cancellation: boolean; max_cancellations_month: number; charge_late_cancellation: boolean; late_cancellation_fee: number; }
export interface ScheduleNotificationSetting { id: string; send_confirmation_email: boolean; send_confirmation_whatsapp: boolean; send_reminder_24h: boolean; send_reminder_2h: boolean; send_cancellation_notice: boolean; custom_confirmation_message?: string; custom_reminder_message?: string; }
export interface ScheduleBlockedTime { id: string; therapist_id?: string; title: string; reason?: string; start_date: string; end_date: string; start_time?: string; end_time?: string; is_all_day: boolean; is_recurring: boolean; recurring_days: number[]; created_by: string; created_at?: string; }
export interface TelemedicineRoomRecord {
  id: string;
  organization_id: string;
  patient_id: string;
  therapist_id: string;
  appointment_id?: string | null;
  room_code: string;
  status: 'aguardando' | 'ativo' | 'encerrado';
  scheduled_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  duration_minutes?: number | null;
  recording_url?: string | null;
  meeting_provider?: string | null;
  meeting_url?: string | null;
  notas?: string | null;
  created_at: string;
  updated_at?: string;
  patients?: { name?: string | null; email?: string | null; phone?: string | null } | null;
  profiles?: { full_name?: string | null } | null;
}

const sched = (path: string, opts?: RequestInit) => request<any>(`/api/scheduling${path}`, opts);
export const schedulingApi = {
  recurringSeries: { list: (p?:{patientId?:string;isActive?:boolean}) => sched(`/recurring-series?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`), create:(d:Partial<RecurringSeries>)=>sched('/recurring-series',{method:'POST',body:JSON.stringify(d)}), update:(id:string,d:Partial<RecurringSeries>)=>sched(`/recurring-series/${id}`,{method:'PUT',body:JSON.stringify(d)}), delete:(id:string)=>sched(`/recurring-series/${id}`,{method:'DELETE'}), occurrences:(id:string)=>sched(`/recurring-series/${id}/occurrences`) },
  waitlist: { list: (p?:{status?:string;priority?:string}) => sched(`/waitlist?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`), create:(d:Partial<WaitlistEntry>)=>sched('/waitlist',{method:'POST',body:JSON.stringify(d)}), update:(id:string,d:Partial<WaitlistEntry>)=>sched(`/waitlist/${id}`,{method:'PUT',body:JSON.stringify(d)}), delete:(id:string)=>sched(`/waitlist/${id}`,{method:'DELETE'}) },
  waitlistOffers: { list: (waitlistId?:string)=>sched(`/waitlist-offers${waitlistId?`?waitlistId=${waitlistId}`:''}`), create:(d:unknown)=>sched('/waitlist-offers',{method:'POST',body:JSON.stringify(d)}), respond:(id:string,response:string)=>sched(`/waitlist-offers/${id}`,{method:'PUT',body:JSON.stringify({response})}) },
  capacity: {
    list: () => sched('/capacity-config'),
    create: (data: Partial<ScheduleCapacityConfig> | Partial<ScheduleCapacityConfig>[]) =>
      sched('/capacity-config', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ScheduleCapacityConfig>) =>
      sched(`/capacity-config/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => sched(`/capacity-config/${id}`, { method: 'DELETE' }),
  },
  settings: {
    businessHours: {
      list: () => sched('/settings/business-hours'),
      upsert: (hours: Partial<ScheduleBusinessHour>[]) =>
        sched('/settings/business-hours', { method: 'PUT', body: JSON.stringify(hours) }),
    },
    cancellationRules: {
      get: () => sched('/settings/cancellation-rules'),
      upsert: (rules: Partial<ScheduleCancellationRule>) =>
        sched('/settings/cancellation-rules', { method: 'PUT', body: JSON.stringify(rules) }),
    },
    notificationSettings: {
      get: () => sched('/settings/notification-settings'),
      upsert: (settings: Partial<ScheduleNotificationSetting>) =>
        sched('/settings/notification-settings', { method: 'PUT', body: JSON.stringify(settings) }),
    },
    blockedTimes: {
      list: () => sched('/settings/blocked-times'),
      create: (blocked: Partial<ScheduleBlockedTime>) =>
        sched('/settings/blocked-times', { method: 'POST', body: JSON.stringify(blocked) }),
      delete: (id: string) => sched(`/settings/blocked-times/${id}`, { method: 'DELETE' }),
    },
  },
  blockedTimes: {
    list: () => sched('/settings/blocked-times'),
    create: (data: Partial<ScheduleBlockedTime>) =>
      sched('/settings/blocked-times', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => sched(`/settings/blocked-times/${id}`, { method: 'DELETE' }),
  },
};

export const telemedicineApi = {
  rooms: {
    list: () => request<{ data: TelemedicineRoomRecord[] }>('/api/telemedicine/rooms'),
    get: (id: string) =>
      request<{ data: TelemedicineRoomRecord }>(`/api/telemedicine/rooms/${id}`),
    create: (data: Partial<TelemedicineRoomRecord>) =>
      request<{ data: TelemedicineRoomRecord }>('/api/telemedicine/rooms', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    start: (id: string) =>
      request<{ data: TelemedicineRoomRecord }>(`/api/telemedicine/rooms/${id}/start`, {
        method: 'POST',
      }),
    update: (id: string, data: Partial<TelemedicineRoomRecord>) =>
      request<{ data: TelemedicineRoomRecord }>(`/api/telemedicine/rooms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
};

export interface AutomationLogEntry {
  id: string;
  automation_id: string;
  automation_name: string;
  status: 'success' | 'failed' | 'skipped';
  started_at: string;
  completed_at: string | null;
  duration_ms: number;
  error?: string | null;
}

export const automationApi = {
  logs: (params?: { limit?: number }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return request<{ data: AutomationLogEntry[] }>(`/api/automation/logs${qs ? `?${qs}` : ''}`);
  },
};

export interface PushSubscription {
  id: string;
  user_id: string;
  organization_id?: string | null;
  endpoint: string;
  p256dh?: string | null;
  auth?: string | null;
  device_info?: Record<string, unknown> | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const pushSubscriptionsApi = {
  list: (params?: { userId?: string; activeOnly?: boolean }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return request<{ data: PushSubscription[] }>(`/api/push-subscriptions${qs ? `?${qs}` : ''}`);
  },
  upsert: (data: {
    endpoint: string;
    userId?: string;
    organizationId?: string;
    p256dh?: string;
    auth?: string;
    deviceInfo?: Record<string, unknown>;
    active?: boolean;
  }) =>
    request<{ data: PushSubscription }>('/api/push-subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        device_info: data.deviceInfo,
        organization_id: data.organizationId,
        active: data.active ?? true,
        user_id: data.userId,
      }),
    }),
  deactivate: (endpoint: string, userId?: string) =>
    request<{ data: PushSubscription | null }>('/api/push-subscriptions/deactivate', {
      method: 'PUT',
      body: JSON.stringify({ endpoint, userId }),
    }),
};

export interface WhatsAppMessage {
  id: string;
  appointment_id?: string | null;
  patient_id?: string | null;
  message_type?: string | null;
  message_content?: string;
  status?: string;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  response_received_at?: string | null;
  response_content?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PendingConfirmation {
  appointment_id: string;
  appointment_date: string | null;
  appointment_time: string | null;
  confirmation_status: 'pending';
  patient: { id: string; name?: string | null; phone?: string | null } | null;
  therapist_id?: string | null;
}

export interface WhatsAppTemplateRecord {
  id: string;
  name: string;
  template_key: string;
  content: string;
  variables?: string[];
  category?: string;
  status: string;
  updated_at?: string;
}

export interface WhatsAppWebhookLog {
  id: string;
  event_type: string;
  phone_number?: string | null;
  message_content?: string | null;
  processed: boolean;
  payload?: Record<string, unknown>;
  created_at?: string | null;
  patient_id?: string | null;
}

export const whatsappApi = {
  listMessages: (params?: {
    appointmentId?: string;
    patientId?: string;
    limit?: number;
  }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k === 'appointmentId' ? 'appointmentId' : k, String(v)]),
    ).toString();
    return request<{ data: WhatsAppMessage[] }>(`/api/whatsapp/messages${qs ? `?${qs}` : ''}`);
  },
  createMessage: (data: {
    appointment_id?: string;
    patient_id?: string;
    message_type?: string;
    message_content: string;
    from_phone?: string;
    to_phone?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  }) =>
    request<{ data: WhatsAppMessage }>('/api/whatsapp/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  pendingConfirmations: (params?: { limit?: number }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return request<{ data: PendingConfirmation[] }>(
      `/api/whatsapp/pending-confirmations${qs ? `?${qs}` : ''}`,
    );
  },
  getConfig: () => request<{ data: Record<string, unknown> }>('/api/whatsapp/config'),
  listTemplates: () => request<{ data: WhatsAppTemplateRecord[] }>('/api/whatsapp/templates'),
  updateTemplate: (id: string, data: { content?: string; status?: string }) =>
    request<{ data: WhatsAppTemplateRecord }>(`/api/whatsapp/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  listWebhookLogs: (params?: { limit?: number }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return request<{ data: WhatsAppWebhookLog[] }>(
      `/api/whatsapp/webhook-logs${qs ? `?${qs}` : ''}`,
    );
  },
};

// ===== API CRM =====
export interface Lead { id: string; organization_id: string; nome: string; telefone?: string; email?: string; origem?: string; estagio: string; responsavel_id?: string; data_primeiro_contato?: string; data_ultimo_contato?: string; interesse?: string; observacoes?: string; motivo_nao_efetivacao?: string; created_at: string; updated_at: string; }
export interface LeadHistorico { id: string; lead_id: string; tipo_contato?: string; descricao?: string; resultado?: string; proximo_contato?: string; created_by?: string; created_at: string; }
export interface CrmTarefa { id: string; organization_id: string; titulo: string; descricao?: string; status: string; responsavel_id?: string; lead_id?: string; due_date?: string; created_at: string; updated_at: string; }

const crm = (path: string, opts?: RequestInit) => request<any>(`/api/crm${path}`, opts);
export const crmApi = {
  leads: { list: (p?:{estagio?:string})=>crm(`/leads?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`), get:(id:string)=>crm(`/leads/${id}`), create:(d:Partial<Lead>)=>crm('/leads',{method:'POST',body:JSON.stringify(d)}), update:(id:string,d:Partial<Lead>)=>crm(`/leads/${id}`,{method:'PUT',body:JSON.stringify(d)}), delete:(id:string)=>crm(`/leads/${id}`,{method:'DELETE'}), historico:(id:string)=>crm(`/leads/${id}/historico`), addHistorico:(id:string,d:Partial<LeadHistorico>)=>crm(`/leads/${id}/historico`,{method:'POST',body:JSON.stringify(d)}) },
  tarefas: { list:(p?:{status?:string;leadId?:string})=>crm(`/tarefas?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`), create:(d:Partial<CrmTarefa>)=>crm('/tarefas',{method:'POST',body:JSON.stringify(d)}), update:(id:string,d:Partial<CrmTarefa>)=>crm(`/tarefas/${id}`,{method:'PUT',body:JSON.stringify(d)}), delete:(id:string)=>crm(`/tarefas/${id}`,{method:'DELETE'}) },
};

// ===== API CLINICAL =====
export interface PainMap { id: string; organization_id?: string; patient_id?: string; evolution_id?: string; body_region?: string; pain_level?: number; color_code?: string; notes?: string; points?: PainMapPoint[]; created_at: string; updated_at: string; }
export interface PainMapPoint { id: string; pain_map_id: string; x_coordinate?: number; y_coordinate?: number; intensity?: number; region?: string; created_at: string; }
export interface EvolutionTemplate { id: string; organization_id: string; name: string; description?: string; blocks: unknown[]; tags?: string[]; ativo: boolean; created_by?: string; created_at: string; updated_at: string; }
export interface ExercisePrescription { id: string; organization_id?: string; patient_id?: string; therapist_id?: string; qr_code?: string; title: string; exercises: unknown[]; notes?: string; validity_days?: number; valid_until?: string; status: string; view_count?: number; last_viewed_at?: string; completed_exercises?: unknown[]; created_at: string; updated_at: string; }
export interface PrescribedExercise {
  id: string;
  patient_id: string;
  exercise_id: string;
  frequency?: string;
  sets: number;
  reps: number;
  duration_seconds?: number;
  notes?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  exercise?: {
    id?: string;
    name?: string;
    image_url?: string;
    video_url?: string;
  };
}

const clin = (path: string, opts?: RequestInit) => request<any>(`/api/clinical${path}`, opts);
const clinPublic = (path: string, opts?: RequestInit) =>
  requestPublic<any>(`/api/clinical${path}`, opts);
export const clinicalApi = {
  painMaps: { list:(p?:{patientId?:string;evolutionId?:string})=>clin(`/pain-maps?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`), get:(id:string)=>clin(`/pain-maps/${id}`), create:(d:Partial<PainMap>)=>clin('/pain-maps',{method:'POST',body:JSON.stringify(d)}), update:(id:string,d:Partial<PainMap>)=>clin(`/pain-maps/${id}`,{method:'PUT',body:JSON.stringify(d)}), delete:(id:string)=>clin(`/pain-maps/${id}`,{method:'DELETE'}), addPoint:(mapId:string,pt:Partial<PainMapPoint>)=>clin(`/pain-maps/${mapId}/points`,{method:'POST',body:JSON.stringify(pt)}), deletePoint:(mapId:string,ptId:string)=>clin(`/pain-maps/${mapId}/points/${ptId}`,{method:'DELETE'}) },
  evolutionTemplates: { list:(p?:{ativo?:boolean})=>clin(`/evolution-templates${p?.ativo!=null?`?ativo=${p.ativo}`:''}`), get:(id:string)=>clin(`/evolution-templates/${id}`), create:(d:Partial<EvolutionTemplate>)=>clin('/evolution-templates',{method:'POST',body:JSON.stringify(d)}), update:(id:string,d:Partial<EvolutionTemplate>)=>clin(`/evolution-templates/${id}`,{method:'PUT',body:JSON.stringify(d)}), delete:(id:string)=>clin(`/evolution-templates/${id}`,{method:'DELETE'}) },
  prescriptions: { list:(p?:{patientId?:string;status?:string})=>clin(`/prescriptions?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`), get:(id:string)=>clin(`/prescriptions/${id}`), getByQr:(qr:string)=>clin(`/prescriptions/qr/${qr}`), create:(d:Partial<ExercisePrescription>)=>clin('/prescriptions',{method:'POST',body:JSON.stringify(d)}), update:(id:string,d:Partial<ExercisePrescription>)=>clin(`/prescriptions/${id}`,{method:'PUT',body:JSON.stringify(d)}), delete:(id:string)=>clin(`/prescriptions/${id}`,{method:'DELETE'}) },
  prescribedExercises: {
    list: (params?: { patientId?: string; active?: boolean }) =>
      clin(`/prescribed-exercises?${new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      )}`),
    create: (data: Partial<PrescribedExercise>) =>
      clin('/prescribed-exercises', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<PrescribedExercise>) =>
      clin(`/prescribed-exercises/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      clin(`/prescribed-exercises/${id}`, { method: 'DELETE' }),
  },
};

export const clinicalPublicApi = {
  prescriptions: {
    getByQr: (qr: string) => clinPublic(`/prescriptions/qr/${qr}`),
    updateByQr: (qr: string, data: Partial<ExercisePrescription>) =>
      clinPublic(`/prescriptions/qr/${qr}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
};

// ===== API EVALUATION FORMS =====
export interface EvaluationFormRow {
  id: string;
  organization_id?: string | null;
  created_by?: string | null;
  nome: string;
  descricao?: string | null;
  referencias?: string | null;
  tipo: string;
  ativo: boolean;
  is_favorite?: boolean;
  usage_count?: number;
  last_used_at?: string | null;
  cover_image?: string | null;
  estimated_time?: number | null;
  created_at: string;
  updated_at: string;
}

export interface EvaluationFormFieldRow {
  id: string;
  form_id: string;
  tipo_campo: string;
  label: string;
  placeholder?: string | null;
  opcoes?: unknown[] | null;
  ordem: number;
  obrigatorio: boolean;
  grupo?: string | null;
  descricao?: string | null;
  minimo?: number | null;
  maximo?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface EvaluationFormWithFieldsRow extends EvaluationFormRow {
  fields: EvaluationFormFieldRow[];
}

const evalForms = (path: string, opts?: RequestInit) => request<any>(`/api/evaluation-forms${path}`, opts);
export const evaluationFormsApi = {
  list: (p?: { tipo?: string; ativo?: boolean; favorite?: boolean }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(p ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return evalForms(qs ? `?${qs}` : '');
  },
  get: (id: string) => evalForms(`/${id}`),
  create: (d: Partial<EvaluationFormRow>) =>
    evalForms('', { method: 'POST', body: JSON.stringify(d) }),
  update: (id: string, d: Partial<EvaluationFormRow>) =>
    evalForms(`/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  delete: (id: string) =>
    evalForms(`/${id}`, { method: 'DELETE' }),
  duplicate: (id: string) =>
    evalForms(`/${id}/duplicate`, { method: 'POST' }),
  addField: (formId: string, d: Partial<EvaluationFormFieldRow>) =>
    evalForms(`/${formId}/fields`, { method: 'POST', body: JSON.stringify(d) }),
  updateField: (fieldId: string, d: Partial<EvaluationFormFieldRow>) =>
    evalForms(`/fields/${fieldId}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteField: (fieldId: string) =>
    evalForms(`/fields/${fieldId}`, { method: 'DELETE' }),
};

export interface FeriadoRow {
  id: string;
  organization_id?: string | null;
  nome: string;
  data: string;
  tipo: 'nacional' | 'estadual' | 'municipal' | 'ponto_facultativo';
  recorrente: boolean;
  bloqueia_agenda: boolean;
  created_at: string;
  updated_at: string;
}

export const feriadosApi = {
  list: (params?: { year?: number }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return request<{ data: FeriadoRow[] }>(`/api/feriados${qs ? `?${qs}` : ''}`);
  },
  create: (data: Partial<FeriadoRow>) =>
    request<{ data: FeriadoRow }>('/api/feriados', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<FeriadoRow>) =>
    request<{ data: FeriadoRow }>(`/api/feriados/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/feriados/${id}`, {
      method: 'DELETE',
    }),
};

// ===== API NOTIFICATIONS =====
export interface Notification { id: string; organization_id?: string; user_id: string; type: string; title: string; message?: string; link?: string; is_read: boolean; metadata?: Record<string,unknown>; created_at: string; }
export const notificationsApi = {
  list: (p?:{unreadOnly?:boolean;limit?:number}) => request<{data:Notification[]}>(`/api/notifications?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`),
  create: (d:Partial<Notification>) => request<{data:Notification}>('/api/notifications',{method:'POST',body:JSON.stringify(d)}),
  markRead: (id:string) => request<{ok:boolean}>(`/api/notifications/${id}/read`,{method:'PUT'}),
  markAllRead: () => request<{ok:boolean}>('/api/notifications/read-all',{method:'PUT'}),
  delete: (id:string) => request<{ok:boolean}>(`/api/notifications/${id}`,{method:'DELETE'}),
};

export interface GamificationNotification {
  id: string;
  patient_id: string;
  type: string;
  title: string;
  message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  expires_at?: string;
  read_at?: string | null;
}

export const gamificationNotificationsApi = {
  list: (params: { patientId: string; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, value]) => value != null)
        .map(([key, value]) => [key === 'patientId' ? 'patientId' : key, String(value)]),
    ).toString();
    return request<{ data: GamificationNotification[] }>(`/api/gamification-notifications?${qs}`);
  },
  markRead: (id: string) =>
    request<{ ok: boolean }>(`/api/gamification-notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: (patientId: string) =>
    request<{ ok: boolean }>('/api/gamification-notifications/read-all', {
      method: 'PUT',
      body: JSON.stringify({ patientId }),
    }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/gamification-notifications/${id}`, { method: 'DELETE' }),
};

export interface NotificationPreferences {
  user_id: string;
  organization_id: string;
  appointment_reminders: boolean;
  exercise_reminders: boolean;
  progress_updates: boolean;
  system_alerts: boolean;
  therapist_messages: boolean;
  payment_reminders: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  weekend_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export const notificationPreferencesApi = {
  get: () => request<{ data: NotificationPreferences | null }>('/api/notification-preferences'),
  update: (data: Partial<NotificationPreferences>) =>
    request<{ data: NotificationPreferences }>('/api/notification-preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ===== API EVENTOS/SALAS/SERVICOS =====
export interface Evento { id: string; organization_id: string; nome: string; descricao?: string; categoria?: string; local?: string; data_inicio?: string; data_fim?: string; hora_inicio?: string; hora_fim?: string; gratuito?: boolean; link_whatsapp?: string; valor_padrao_prestador?: number; status: string; created_at: string; updated_at: string; }
export interface Sala { id: string; organization_id: string; nome: string; capacidade?: number; descricao?: string; cor?: string; ativo: boolean; created_at: string; updated_at: string; }
export interface Servico { id: string; organization_id: string; nome: string; descricao?: string; duracao?: number; valor?: number; cor?: string; ativo: boolean; created_at: string; updated_at: string; }
export interface Contratado { id: string; organization_id?: string; nome: string; contato?: string | null; cpf_cnpj?: string | null; especialidade?: string | null; observacoes?: string | null; created_at?: string; updated_at?: string; }
export interface EventoContratado { id: string; evento_id: string; contratado_id: string; funcao?: string | null; valor_acordado?: number | null; horario_inicio?: string | null; horario_fim?: string | null; status_pagamento?: 'PENDENTE' | 'PAGO'; created_at?: string; updated_at?: string; }
export interface Participante { id: string; evento_id: string; nome: string; contato?: string | null; instagram?: string | null; segue_perfil?: boolean; observacoes?: string | null; created_at?: string; updated_at?: string; }
export interface ChecklistItem {
  id: string;
  organization_id?: string;
  evento_id: string;
  titulo: string;
  tipo: 'levar' | 'alugar' | 'comprar';
  quantidade: number;
  custo_unitario: number;
  status: 'ABERTO' | 'OK';
  created_at: string;
  updated_at?: string;
}
export const eventosApi = {
  list: (p?:{status?:string;categoria?:string;limit?:number;offset?:number}) => request<{data:Evento[]}>(`/api/eventos?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`),
  get: (id:string) => request<{data:Evento}>(`/api/eventos/${id}`),
  create: (d:Partial<Evento>) => request<{data:Evento}>('/api/eventos',{method:'POST',body:JSON.stringify(d)}),
  update: (id:string,d:Partial<Evento>) => request<{data:Evento}>(`/api/eventos/${id}`,{method:'PUT',body:JSON.stringify(d)}),
  delete: (id:string) => request<{ok:boolean}>(`/api/eventos/${id}`,{method:'DELETE'}),
};
export const checklistApi = {
  list: (eventoId: string) => request<{ data: ChecklistItem[] }>(`/api/checklist?eventoId=${encodeURIComponent(eventoId)}`),
  create: (d: Partial<ChecklistItem>) => request<{ data: ChecklistItem }>('/api/checklist', { method: 'POST', body: JSON.stringify(d) }),
  update: (id: string, d: Partial<ChecklistItem>) => request<{ data: ChecklistItem }>(`/api/checklist/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  delete: (id: string) => request<{ ok: boolean }>(`/api/checklist/${id}`, { method: 'DELETE' }),
};
export const salasApi = {
  list: () => request<{data:Sala[]}>('/api/salas'),
  create: (d:Partial<Sala>) => request<{data:Sala}>('/api/salas',{method:'POST',body:JSON.stringify(d)}),
  update: (id:string,d:Partial<Sala>) => request<{data:Sala}>(`/api/salas/${id}`,{method:'PUT',body:JSON.stringify(d)}),
  delete: (id:string) => request<{ok:boolean}>(`/api/salas/${id}`,{method:'DELETE'}),
};
export const servicosApi = {
  list: () => request<{data:Servico[]}>('/api/servicos'),
  create: (d:Partial<Servico>) => request<{data:Servico}>('/api/servicos',{method:'POST',body:JSON.stringify(d)}),
  update: (id:string,d:Partial<Servico>) => request<{data:Servico}>(`/api/servicos/${id}`,{method:'PUT',body:JSON.stringify(d)}),
  delete: (id:string) => request<{ok:boolean}>(`/api/servicos/${id}`,{method:'DELETE'}),
};
export const contratadosApi = {
  list: () => request<{data:Contratado[]}>('/api/contratados'),
  create: (d:Partial<Contratado>) => request<{data:Contratado}>('/api/contratados',{method:'POST',body:JSON.stringify(d)}),
  update: (id:string,d:Partial<Contratado>) => request<{data:Contratado}>(`/api/contratados/${id}`,{method:'PUT',body:JSON.stringify(d)}),
  delete: (id:string) => request<{ok:boolean}>(`/api/contratados/${id}`,{method:'DELETE'}),
};
export const eventoContratadosApi = {
  list: (p?:{eventoId?:string;contratadoId?:string}) => request<{data:EventoContratado[]}>(`/api/evento-contratados?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`),
  create: (d:Partial<EventoContratado>) => request<{data:EventoContratado}>('/api/evento-contratados',{method:'POST',body:JSON.stringify(d)}),
  update: (id:string,d:Partial<EventoContratado>) => request<{data:EventoContratado}>(`/api/evento-contratados/${id}`,{method:'PUT',body:JSON.stringify(d)}),
  delete: (id:string) => request<{ok:boolean}>(`/api/evento-contratados/${id}`,{method:'DELETE'}),
};
export const participantesApi = {
  list: (p?:{eventoId?:string;limit?:number;offset?:number}) => request<{data:Participante[]}>(`/api/participantes?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`),
  create: (d:Partial<Participante>) => request<{data:Participante}>('/api/participantes',{method:'POST',body:JSON.stringify(d)}),
  update: (id:string,d:Partial<Participante>) => request<{data:Participante}>(`/api/participantes/${id}`,{method:'PUT',body:JSON.stringify(d)}),
  delete: (id:string) => request<{ok:boolean}>(`/api/participantes/${id}`,{method:'DELETE'}),
};

export interface Prestador {
  id: string;
  evento_id: string;
  nome: string;
  contato?: string | null;
  cpf_cnpj?: string | null;
  valor_acordado: number;
  status_pagamento: 'PENDENTE' | 'PAGO';
  created_at: string;
  updated_at: string;
}

export interface PrestadoresMetrics {
  count: number;
  last_updated_at: string | null;
}

const PRESTADORES_BASE = '/api/prestadores';

export const prestadoresApi = {
  list: (params: { eventoId: string }) =>
    request<{ data: Prestador[] }>(`${PRESTADORES_BASE}?eventoId=${encodeURIComponent(params.eventoId)}`),
  metrics: (eventoId: string) =>
    request<{ data: PrestadoresMetrics }>(`${PRESTADORES_BASE}/metrics?eventoId=${encodeURIComponent(eventoId)}`),
  create: (data: Partial<Prestador> & { evento_id: string }) =>
    request<{ data: Prestador }>(PRESTADORES_BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Prestador>) =>
    request<{ data: Prestador }>(`${PRESTADORES_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`${PRESTADORES_BASE}/${id}`, {
      method: 'DELETE',
    }),
  toggleStatus: (id: string, status?: 'PENDENTE' | 'PAGO') =>
    request<{ data: Prestador }>(`${PRESTADORES_BASE}/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};

// ===== API AUDIT LOGS =====
export interface AuditLog { id: string; organization_id?: string; action: string; entity_type?: string; entity_id?: string; user_id?: string; changes?: unknown; ip_address?: string; created_at: string; }
export const auditApi = {
  list: (p?:{entityType?:string;entityId?:string;limit?:number}) => request<{data:AuditLog[]}>(`/api/audit-logs?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`),
  create: (d:Partial<AuditLog>) => request<{data:AuditLog}>('/api/audit-logs',{method:'POST',body:JSON.stringify(d)}),
};

export interface PrecadastroToken {
  id: string;
  organization_id: string;
  nome: string;
  descricao: string | null;
  token: string;
  ativo: boolean;
  max_usos: number | null;
  usos_atuais: number;
  expires_at: string | null;
  campos_obrigatorios: string[];
  campos_opcionais: string[];
  created_at: string;
  updated_at?: string;
}

export interface Precadastro {
  id: string;
  token_id: string;
  organization_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  observacoes: string | null;
  status: string;
  converted_at: string | null;
  patient_id: string | null;
  dados_adicionais: Record<string, unknown> | null;
  cpf?: string;
  convenio?: string;
  queixa_principal?: string;
  token_nome?: string;
  created_at: string;
  updated_at: string;
}

export const precadastroApi = {
  public: {
    getToken: (token: string) =>
      requestPublic<{ data: PrecadastroToken }>(`/api/precadastro/public/${encodeURIComponent(token)}`),
    submit: (
      token: string,
      data: {
        nome: string;
        email?: string;
        telefone?: string;
        data_nascimento?: string;
        endereco?: string;
        cpf?: string;
        convenio?: string;
        queixa_principal?: string;
        observacoes?: string;
      },
    ) =>
      requestPublic<{ data: Precadastro }>(
        `/api/precadastro/public/${encodeURIComponent(token)}/submissions`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      ),
  },
  tokens: {
    list: () => request<{ data: PrecadastroToken[] }>('/api/precadastro/tokens'),
    create: (data: Partial<PrecadastroToken>) =>
      request<{ data: PrecadastroToken }>('/api/precadastro/tokens', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<PrecadastroToken>) =>
      request<{ data: PrecadastroToken }>(`/api/precadastro/tokens/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  submissions: {
    list: () => request<{ data: Precadastro[] }>('/api/precadastro/submissions'),
    update: (id: string, data: Partial<Precadastro>) =>
      request<{ data: Precadastro }>(`/api/precadastro/submissions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
};

// ===== HEALTH CHECK =====
export const healthApi = {
  check: () =>
    request<{ status: string; environment: string; timestamp: string; version: string }>(
      '/api/health',
    ),
};
