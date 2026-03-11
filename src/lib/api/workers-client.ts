/**
 * Cliente HTTP para a API Cloudflare Workers (Hono + Neon)
 *
 * URL base: VITE_WORKERS_API_URL (prod: https://api.moocafisio.com.br)
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
import type { MedicalReturn } from '@/types/evolution';
import type { GamificationStats, AtRiskPatient, PopularAchievement } from '@/types/gamification';

import { getWorkersApiUrl } from './config';

const BASE_URL = getWorkersApiUrl();

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

export interface ExerciseImageAnalysisResult {
  success: boolean;
  analysis?: {
    labels?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
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
  wikiPageId?: string | null;
  milestones?: any[];
  restrictions?: any[];
  phases?: any[];
  progressionCriteria?: any[];
  references?: any[];
  clinicalTests?: string[];
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

  analyzeImage: async (imageUrl: string) => {
    const token = await getNeonAccessToken();
    const apiBase = (import.meta.env.VITE_EXERCISE_ANALYSIS_API_URL ?? '').replace(/\/$/, '');
    if (!apiBase) {
      throw new Error('VITE_EXERCISE_ANALYSIS_API_URL não configurada');
    }
    const response = await fetch(`${apiBase}/api/exercises/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze exercise');
    }

    return response.json() as Promise<ExerciseImageAnalysisResult>;
  },
};

export interface ExerciseTemplateRecord {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  conditionName?: string | null;
  templateVariant?: string | null;
  evidenceLevel?: string | null;
  items?: Array<{
    id: string;
    exerciseId: string;
    orderIndex?: number | null;
    sets?: number | null;
    repetitions?: number | null;
    duration?: number | null;
    notes?: string | null;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export const exerciseTemplatesApi = {
  list: (params?: { q?: string; category?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, value]) => value != null)
          .map(([key, value]) => [key, String(value)]),
      ),
    ).toString();
    return request<{ data: ExerciseTemplateRecord[]; meta?: { page: number; limit: number; total: number; pages: number } }>(
      `/api/templates${qs ? `?${qs}` : ''}`,
    );
  },
  get: (id: string) =>
    request<{ data: ExerciseTemplateRecord }>(`/api/templates/${encodeURIComponent(id)}`),
  create: (data: Partial<ExerciseTemplateRecord>) =>
    request<{ data: ExerciseTemplateRecord }>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ExerciseTemplateRecord>) =>
    request<{ data: ExerciseTemplateRecord }>(`/api/templates/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/templates/${encodeURIComponent(id)}`, {
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

  listOrg: (params?: { q?: string; category?: string }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])),
    ).toString();
    return request<{ data: WikiPage[] }>(`/api/wiki/org/list${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) =>
    request<{ data: WikiPageFull }>(`/api/wiki/by-id/${encodeURIComponent(id)}`),

  updateTriage: (updates: Array<{ id: string; triage_order?: number; tags?: string[]; category?: string }>) =>
    request<{ ok: boolean }>('/api/wiki/triage', {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    }),

  listCategories: () =>
    request<{ data: unknown[] }>('/api/wiki/categories'),

  createCategory: (data: { name: string; slug?: string; description?: string; icon?: string; color?: string; parent_id?: string; order_index?: number }) =>
    request<{ data: unknown }>('/api/wiki/categories', { method: 'POST', body: JSON.stringify(data) }),

  deleteCategory: (id: string) =>
    request<{ ok: boolean }>(`/api/wiki/categories/${id}`, { method: 'DELETE' }),

  listComments: (pageId: string) =>
    request<{ data: unknown[] }>(`/api/wiki/${pageId}/comments`),

  addComment: (pageId: string, data: { content: string; parent_comment_id?: string; block_id?: string; selection_text?: string; selection_start?: number; selection_end?: number }) =>
    request<{ data: unknown }>(`/api/wiki/${pageId}/comments`, { method: 'POST', body: JSON.stringify(data) }),

  resolveComment: (commentId: string) =>
    request<{ ok: boolean }>(`/api/wiki/comments/${commentId}/resolve`, { method: 'PATCH' }),
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

export interface AtestadoTemplateRecord {
  id: string;
  organization_id: string | null;
  nome: string;
  descricao: string | null;
  conteudo: string;
  variaveis_disponiveis: string[];
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContratoTemplateRecord {
  id: string;
  organization_id: string | null;
  nome: string;
  descricao: string | null;
  tipo: string;
  conteudo: string;
  variaveis_disponiveis: string[];
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationPatientRecord {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface CommunicationLogRecord {
  id: string;
  organization_id: string;
  patient_id?: string | null;
  appointment_id?: string | null;
  type: 'email' | 'whatsapp' | 'sms' | 'push';
  recipient: string;
  subject?: string | null;
  body: string;
  status: 'pendente' | 'enviado' | 'entregue' | 'lido' | 'falha';
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  patient?: CommunicationPatientRecord | null;
}

export interface CommunicationStatsRecord {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  byChannel: {
    email: number;
    whatsapp: number;
    sms: number;
  };
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

export const documentTemplatesApi = {
  atestados: {
    list: () => request<{ data: AtestadoTemplateRecord[] }>('/api/documents/atestado-templates'),
    create: (data: Partial<AtestadoTemplateRecord>) =>
      request<{ data: AtestadoTemplateRecord }>('/api/documents/atestado-templates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<AtestadoTemplateRecord>) =>
      request<{ data: AtestadoTemplateRecord }>(`/api/documents/atestado-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/documents/atestado-templates/${id}`, { method: 'DELETE' }),
  },
  contratos: {
    list: () => request<{ data: ContratoTemplateRecord[] }>('/api/documents/contrato-templates'),
    create: (data: Partial<ContratoTemplateRecord>) =>
      request<{ data: ContratoTemplateRecord }>('/api/documents/contrato-templates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<ContratoTemplateRecord>) =>
      request<{ data: ContratoTemplateRecord }>(`/api/documents/contrato-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/documents/contrato-templates/${id}`, { method: 'DELETE' }),
  },
};

export interface KnowledgeProfileSummary {
  full_name?: string;
  avatar_url?: string;
}

export interface KnowledgeSemanticResultRow {
  article_id: string;
  score: number;
}

export interface KnowledgeArticleRow {
  id: string;
  title: string;
  group: string;
  subgroup: string;
  focus: string[];
  evidence: string;
  year?: number;
  source?: string;
  url?: string;
  status: string;
  tags: string[];
  highlights: string[];
  observations: string[];
  keyQuestions: string[];
}

export interface KnowledgeAnnotationRow {
  id: string;
  article_id: string;
  organization_id: string;
  scope: 'organization' | 'user';
  user_id?: string;
  highlights: string[];
  observations: string[];
  status?: string;
  evidence?: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeCurationRow {
  id: string;
  article_id: string;
  organization_id: string;
  status: string;
  notes?: string;
  assigned_to?: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeAuditRow {
  id: string;
  article_id: string;
  organization_id: string;
  actor_id: string;
  action: 'create_annotation' | 'update_annotation' | 'update_curation';
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  created_at: string;
  context?: Record<string, unknown>;
}

export const knowledgeApi = {
  listArticles: () => request<{ data: KnowledgeArticleRow[] }>('/api/knowledge/articles'),
  createArticle: (data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>('/api/knowledge/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateArticle: (articleId: string, data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>(`/api/knowledge/articles/${encodeURIComponent(articleId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  syncArticles: (articles: KnowledgeArticleRow[]) =>
    request<{ indexed: number }>('/api/knowledge/articles/sync', {
      method: 'POST',
      body: JSON.stringify({ articles }),
    }),
  indexArticles: () =>
    request<{ indexed: number }>('/api/knowledge/articles/index', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  semanticSearch: (params: { query: string; limit?: number }) =>
    request<{ data: KnowledgeSemanticResultRow[] }>('/api/knowledge/semantic-search', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  listAnnotations: () => request<{ data: KnowledgeAnnotationRow[] }>('/api/knowledge/annotations'),
  upsertAnnotation: (
    articleId: string,
    data: {
      scope: 'organization' | 'user';
      highlights: string[];
      observations: string[];
      status?: string;
      evidence?: string;
    },
  ) =>
    request<{ data: KnowledgeAnnotationRow }>(`/api/knowledge/annotations/${encodeURIComponent(articleId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  listCuration: () => request<{ data: KnowledgeCurationRow[] }>('/api/knowledge/curation'),
  updateCuration: (
    articleId: string,
    data: { status: string; notes?: string; assigned_to?: string },
  ) =>
    request<{ data: KnowledgeCurationRow }>(`/api/knowledge/curation/${encodeURIComponent(articleId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  listAudit: () => request<{ data: KnowledgeAuditRow[] }>('/api/knowledge/audit'),
  addAuditEntry: (
    data: Omit<KnowledgeAuditRow, 'id' | 'organization_id' | 'created_at'>,
  ) =>
    request<{ data: KnowledgeAuditRow }>('/api/knowledge/audit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getProfiles: (ids: string[]) => {
    const qs = new URLSearchParams();
    if (ids.length) qs.set('ids', ids.join(','));
    return request<{ data: Record<string, KnowledgeProfileSummary> }>(`/api/knowledge/profiles${qs.toString() ? `?${qs}` : ''}`);
  },
  listNotes: (articleId: string) =>
    request<{ data: Array<Record<string, unknown>> }>(`/api/knowledge/articles/${encodeURIComponent(articleId)}/notes`),
  addNote: (articleId: string, data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>(`/api/knowledge/articles/${encodeURIComponent(articleId)}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  askArticle: (articleId: string, query: string) =>
    request<{ data: { answer: string; contextUsed?: string } }>(`/api/knowledge/articles/${encodeURIComponent(articleId)}/ask`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
  processArticle: (articleId: string, textContent?: string) =>
    request<{ data: { success: boolean } }>(`/api/knowledge/articles/${encodeURIComponent(articleId)}/process`, {
      method: 'POST',
      body: JSON.stringify({ textContent }),
    }),
};

export const communicationsApi = {
  list: (params?: { channel?: string; status?: string; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return request<{ data: CommunicationLogRecord[] }>(`/api/communications${qs ? `?${qs}` : ''}`);
  },
  stats: () => request<{ data: CommunicationStatsRecord }>('/api/communications/stats'),
  create: (data: Partial<CommunicationLogRecord> & { type: string; recipient: string; body: string }) =>
    request<{ data: CommunicationLogRecord }>('/api/communications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/communications/${id}`, {
      method: 'DELETE',
    }),
  resend: (id: string) =>
    request<{ data: CommunicationLogRecord }>(`/api/communications/${id}/resend`, {
      method: 'POST',
    }),
  testEmail: (data: { to: string; subject?: string; type?: string; body?: string; data?: Record<string, unknown> }) =>
    request<{ data: CommunicationLogRecord }>('/api/communications/test-email', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
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

  create: (data: {
    patient_id: string;
    description?: string;
    goal_title?: string;
    goal_description?: string;
    category?: string;
    target_date?: string;
    target_value?: string;
    current_value?: string;
    current_progress?: number;
    priority?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  }) =>
    request<{ data: PatientGoal }>('/api/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: {
    status?: string;
    description?: string;
    goal_title?: string;
    goal_description?: string;
    category?: string;
    priority?: string;
    target_date?: string;
    target_value?: string;
    current_value?: string;
    current_progress?: number;
    achieved_at?: string;
    completed_at?: string;
    metadata?: Record<string, unknown>;
  }) =>
    request<{ data: PatientGoal }>(`/api/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/goals/${id}`, { method: 'DELETE' }),
};

// ===== API GAMIFICATION =====
export interface GamificationProfileRow {
  id: string;
  patient_id: string;
  current_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  total_points: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyQuestRow { id: string; patient_id: string; date: string; quests_data: Array<{ id: string; title: string; description?: string; xp: number; completed: boolean; icon: string }>; completed_count: number; created_at: string; updated_at: string; }
export interface AchievementRow { id: string; code: string; title: string; description: string; xp_reward: number; icon?: string; category: string; requirements: unknown; created_at: string; }
export interface AchievementLogRow { id: string; patient_id: string; achievement_id: string; achievement_title: string; xp_reward: number; unlocked_at: string; }
export interface XpTransactionRow { id: string; patient_id: string; amount: number; reason: string; description?: string; created_at: string; }
export interface GamificationSettingRow { id?: string; key: string; value: unknown; description?: string; updated_at?: string; }
export interface QuestDefinitionRow { id: string; code?: string | null; title: string; description?: string | null; category: string; xp_reward: number; points_reward?: number; requirements?: unknown; icon?: string | null; difficulty?: string; is_active: boolean; repeat_interval?: string; created_at?: string; updated_at?: string; }
export interface PatientChallengeRow { id?: string; patient_id: string; challenge_id: string; progress: number; completed: boolean; completed_at?: string | null; }
export interface WeeklyChallengeRow { id: string; title: string; description?: string | null; xp_reward: number; point_reward: number; start_date: string; end_date: string; target: { type: string; count?: number }; icon?: string | null; is_active?: boolean; created_at?: string; updated_at?: string; patient_progress?: PatientChallengeRow | null; }
export interface ShopItemRow { id: string; code: string; name: string; description: string; cost: number; type: string; icon?: string; metadata: Record<string, unknown>; is_active: boolean; }
export interface UserInventoryRow { id: string; user_id: string; item_id: string; item_code: string; quantity: number; is_equipped: boolean; created_at: string; updated_at: string; item_name?: string; item_description?: string; item_cost?: number; item_type?: string; item_icon?: string; }
export interface GamificationLeaderboardRow { rank: number; patient_id: string; patient_name: string; email?: string | null; current_level: number; total_xp: number; current_streak: number; longest_streak?: number; last_activity_date?: string | null; isCurrentUser?: boolean; }

export const gamificationApi = {
  getProfile: (patientId: string) =>
    request<{ data: GamificationProfileRow }>(`/api/gamification/profile/${encodeURIComponent(patientId)}`),

  awardXp: (data: { patientId: string; amount: number; reason: string; description?: string }) =>
    request<{ data: GamificationProfileRow; leveledUp: boolean; newLevel: number; streakExtended: boolean }>('/api/gamification/award-xp', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getQuests: (patientId: string) =>
    request<{ data: DailyQuestRow }>(`/api/gamification/quests/${encodeURIComponent(patientId)}`),

  completeQuest: (patientId: string, questId: string) =>
    request<{ data: DailyQuestRow; xpAwarded: number }>(`/api/gamification/quests/${encodeURIComponent(patientId)}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ questId }),
    }),

  getAchievements: (patientId: string) =>
    request<{ data: { all: AchievementRow[]; unlocked: AchievementLogRow[] } }>(`/api/gamification/achievements/${encodeURIComponent(patientId)}`),

  getTransactions: (patientId: string) =>
    request<{ data: XpTransactionRow[] }>(`/api/gamification/transactions/${encodeURIComponent(patientId)}`),
  listTransactions: (params?: { days?: number; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, value]) => value != null)
          .map(([key, value]) => [key, String(value)]),
      ),
    ).toString();
    return request<{ data: XpTransactionRow[] }>(`/api/gamification/transactions${qs ? `?${qs}` : ''}`);
  },

  getLeaderboard: (params?: { period?: 'weekly' | 'monthly' | 'all'; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, value]) => value != null)
          .map(([key, value]) => [key, String(value)]),
      ),
    ).toString();
    return request<{ data: GamificationLeaderboardRow[] }>(`/api/gamification/leaderboard${qs ? `?${qs}` : ''}`);
  },

  getShopItems: () =>
    request<{ data: ShopItemRow[] }>('/api/gamification/shop'),

  getAllShopItems: () =>
    request<{ data: ShopItemRow[] }>('/api/gamification/shop-items'),

  getInventory: (patientId: string) =>
    request<{ data: UserInventoryRow[] }>(`/api/gamification/inventory/${encodeURIComponent(patientId)}`),

  buyItem: (patientId: string, itemId: string) =>
    request<{ data: GamificationProfileRow }>('/api/gamification/buy', {
      method: 'POST',
      body: JSON.stringify({ patientId, itemId }),
    }),

  getSettings: () =>
    request<{ data: GamificationSettingRow[] }>('/api/gamification/settings'),

  updateSettings: (settings: Record<string, unknown>) =>
    request<{ data: GamificationSettingRow[] }>('/api/gamification/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    }),

  getAdminStats: (days = 30) =>
    request<{ data: GamificationStats }>(`/api/gamification/admin/stats?days=${encodeURIComponent(String(days))}`),

  getAtRiskPatients: (params?: { days?: number; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, value]) => value != null)
          .map(([key, value]) => [key, String(value)]),
      ),
    ).toString();
    return request<{ data: AtRiskPatient[] }>(`/api/gamification/admin/at-risk${qs ? `?${qs}` : ''}`);
  },

  getPopularAchievements: (limit = 10) =>
    request<{ data: PopularAchievement[] }>(
      `/api/gamification/admin/popular-achievements?limit=${encodeURIComponent(String(limit))}`,
    ),

  adjustXp: (payload: { patientId: string; amount: number; reason: string }) =>
    request<{ data: GamificationProfileRow }>('/api/gamification/admin/adjust-xp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resetStreak: (patientId: string) =>
    request<{ data: GamificationProfileRow | null }>('/api/gamification/admin/reset-streak', {
      method: 'POST',
      body: JSON.stringify({ patientId }),
    }),

  achievementDefinitions: {
    list: () =>
      request<{ data: AchievementRow[] }>('/api/gamification/achievement-definitions'),
    create: (data: Partial<AchievementRow>) =>
      request<{ data: AchievementRow }>('/api/gamification/achievement-definitions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<AchievementRow>) =>
      request<{ data: AchievementRow }>(`/api/gamification/achievement-definitions/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/gamification/achievement-definitions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  questDefinitions: {
    list: () =>
      request<{ data: QuestDefinitionRow[] }>('/api/gamification/quest-definitions'),
    create: (data: Partial<QuestDefinitionRow>) =>
      request<{ data: QuestDefinitionRow }>('/api/gamification/quest-definitions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<QuestDefinitionRow>) =>
      request<{ data: QuestDefinitionRow }>(`/api/gamification/quest-definitions/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    setActive: (id: string, is_active: boolean) =>
      request<{ data: QuestDefinitionRow }>(`/api/gamification/quest-definitions/${encodeURIComponent(id)}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/gamification/quest-definitions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  weeklyChallenges: {
    list: (params?: { active?: boolean; patientId?: string }) => {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, value]) => value != null)
            .map(([key, value]) => [key, String(value)]),
        ),
      ).toString();
      return request<{ data: WeeklyChallengeRow[] }>(`/api/gamification/weekly-challenges${qs ? `?${qs}` : ''}`);
    },
    create: (data: Partial<WeeklyChallengeRow>) =>
      request<{ data: WeeklyChallengeRow }>('/api/gamification/weekly-challenges', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<WeeklyChallengeRow>) =>
      request<{ data: WeeklyChallengeRow }>(`/api/gamification/weekly-challenges/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    setActive: (id: string, is_active: boolean) =>
      request<{ data: WeeklyChallengeRow }>(`/api/gamification/weekly-challenges/${encodeURIComponent(id)}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/gamification/weekly-challenges/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  getPatientChallenges: (patientId: string) =>
    request<{ data: PatientChallengeRow[] }>(`/api/gamification/patient-challenges/${encodeURIComponent(patientId)}`),

  shopAdmin: {
    create: (data: Partial<ShopItemRow>) =>
      request<{ data: ShopItemRow }>('/api/gamification/shop-items', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<ShopItemRow>) =>
      request<{ data: ShopItemRow }>(`/api/gamification/shop-items/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/gamification/shop-items/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },
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
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  emergency_contact?: string | null;
  emergency_phone?: string | null;
  emergency_contact_relationship?: string | null;
  health_insurance?: string | null;
  insurance_number?: string | null;
  profession?: string | null;
  observations?: string | null;
  status?: string;
  progress?: number;
  session_value?: number | null;
  incomplete_registration?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PatientSurgery {
  id: string;
  patient_id?: string;
  name: string;
  surgery_date?: string | null;
  surgeon?: string | null;
  hospital?: string | null;
  post_op_protocol?: string | null;
  affected_side?: 'direito' | 'esquerdo' | 'bilateral' | 'nao_aplicavel' | null;
  complications?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface PatientPathology {
  id: string;
  patient_id?: string;
  name: string;
  icd_code?: string | null;
  status?: string | null;
  diagnosed_at?: string | null;
  treated_at?: string | null;
  severity?: 'leve' | 'moderada' | 'grave' | null;
  affected_region?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface PatientMedicalRecord {
  id: string;
  patient_id: string;
  chief_complaint?: string | null;
  medical_history?: string | null;
  current_medications?: string | null;
  allergies?: string | null;
  previous_surgeries?: string | null;
  family_history?: string | null;
  lifestyle_habits?: string | null;
  record_date: string;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PatientPhysicalExamination {
  id: string;
  patient_id: string;
  record_date: string;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  vital_signs?: Record<string, unknown>;
  general_appearance?: string | null;
  heent?: string | null;
  cardiovascular?: string | null;
  respiratory?: string | null;
  gastrointestinal?: string | null;
  musculoskeletal?: string | null;
  neurological?: string | null;
  integumentary?: string | null;
  psychological?: string | null;
}

export interface PatientTreatmentPlan {
  id: string;
  patient_id: string;
  record_date: string;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  diagnosis?: unknown[];
  objectives?: unknown[];
  procedures?: unknown[];
  exercises?: unknown[];
  recommendations?: unknown[];
  follow_up_date?: string | null;
}

export interface PatientMedicalAttachment {
  id: string;
  patient_id: string;
  record_id?: string | null;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size?: number | null;
  uploaded_at?: string | null;
  uploaded_by?: string | null;
  category?: string | null;
  description?: string | null;
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
  getByProfile: (profileId: string) =>
    request<{ data: PatientRow | null }>(`/api/patients/by-profile/${encodeURIComponent(profileId)}`),
  get: (id: string) => request<{ data: PatientRow }>(`/api/patients/${id}`),
  create: (data: Partial<PatientRow>) =>
    request<{ data: PatientRow }>('/api/patients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<PatientRow>) =>
    request<{ data: PatientRow }>(`/api/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<{ success: boolean }>(`/api/patients/${id}`, { method: 'DELETE' }),
  stats: (id: string) => request<{ data: PatientStats }>(`/api/patients/${id}/stats`),
  lastUpdated: () => request<{ data: { last_updated_at: string | null } }>('/api/patients/last-updated'),
  medicalRecords: (patientId: string) =>
    request<{ data: PatientMedicalRecord[] }>(
      `/api/patients/${encodeURIComponent(patientId)}/medical-records`,
    ),
  createMedicalRecord: (
    patientId: string,
    data: Omit<PatientMedicalRecord, 'id' | 'patient_id' | 'created_at' | 'updated_at'>,
  ) =>
    request<{ data: PatientMedicalRecord }>(
      `/api/patients/${encodeURIComponent(patientId)}/medical-records`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),
  updateMedicalRecord: (
    patientId: string,
    recordId: string,
    data: Partial<Omit<PatientMedicalRecord, 'id' | 'patient_id' | 'created_at' | 'updated_at'>>,
  ) =>
    request<{ data: PatientMedicalRecord }>(
      `/api/patients/${encodeURIComponent(patientId)}/medical-records/${encodeURIComponent(recordId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    ),
  deleteMedicalRecord: (patientId: string, recordId: string) =>
    request<{ ok: boolean }>(
      `/api/patients/${encodeURIComponent(patientId)}/medical-records/${encodeURIComponent(recordId)}`,
      {
        method: 'DELETE',
      },
    ),
  physicalExaminations: (patientId: string) =>
    request<{ data: PatientPhysicalExamination[] }>(
      `/api/patients/${encodeURIComponent(patientId)}/physical-examinations`,
    ),
  createPhysicalExamination: (
    patientId: string,
    data: Omit<PatientPhysicalExamination, 'id' | 'patient_id' | 'created_at' | 'updated_at'>,
  ) =>
    request<{ data: PatientPhysicalExamination }>(
      `/api/patients/${encodeURIComponent(patientId)}/physical-examinations`,
      { method: 'POST', body: JSON.stringify(data) },
    ),
  updatePhysicalExamination: (
    patientId: string,
    examId: string,
    data: Partial<Omit<PatientPhysicalExamination, 'id' | 'patient_id' | 'created_at' | 'updated_at'>>,
  ) =>
    request<{ data: PatientPhysicalExamination }>(
      `/api/patients/${encodeURIComponent(patientId)}/physical-examinations/${encodeURIComponent(examId)}`,
      { method: 'PUT', body: JSON.stringify(data) },
    ),
  deletePhysicalExamination: (patientId: string, examId: string) =>
    request<{ ok: boolean }>(
      `/api/patients/${encodeURIComponent(patientId)}/physical-examinations/${encodeURIComponent(examId)}`,
      { method: 'DELETE' },
    ),
  treatmentPlans: (patientId: string) =>
    request<{ data: PatientTreatmentPlan[] }>(
      `/api/patients/${encodeURIComponent(patientId)}/treatment-plans`,
    ),
  createTreatmentPlan: (
    patientId: string,
    data: Omit<PatientTreatmentPlan, 'id' | 'patient_id' | 'created_at' | 'updated_at'>,
  ) =>
    request<{ data: PatientTreatmentPlan }>(
      `/api/patients/${encodeURIComponent(patientId)}/treatment-plans`,
      { method: 'POST', body: JSON.stringify(data) },
    ),
  updateTreatmentPlan: (
    patientId: string,
    planId: string,
    data: Partial<Omit<PatientTreatmentPlan, 'id' | 'patient_id' | 'created_at' | 'updated_at'>>,
  ) =>
    request<{ data: PatientTreatmentPlan }>(
      `/api/patients/${encodeURIComponent(patientId)}/treatment-plans/${encodeURIComponent(planId)}`,
      { method: 'PUT', body: JSON.stringify(data) },
    ),
  deleteTreatmentPlan: (patientId: string, planId: string) =>
    request<{ ok: boolean }>(
      `/api/patients/${encodeURIComponent(patientId)}/treatment-plans/${encodeURIComponent(planId)}`,
      { method: 'DELETE' },
    ),
  medicalAttachments: (patientId: string, params?: { recordId?: string }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return request<{ data: PatientMedicalAttachment[] }>(
      `/api/patients/${encodeURIComponent(patientId)}/attachments${qs ? `?${qs}` : ''}`,
    );
  },
  createMedicalAttachment: (
    patientId: string,
    data: Omit<PatientMedicalAttachment, 'id' | 'patient_id' | 'uploaded_at'>,
  ) =>
    request<{ data: PatientMedicalAttachment }>(
      `/api/patients/${encodeURIComponent(patientId)}/attachments`,
      { method: 'POST', body: JSON.stringify(data) },
    ),
  deleteMedicalAttachment: (patientId: string, attachmentId: string) =>
    request<{ ok: boolean }>(
      `/api/patients/${encodeURIComponent(patientId)}/attachments/${encodeURIComponent(attachmentId)}`,
      { method: 'DELETE' },
    ),
  surgeries: (patientId: string) =>
    request<{ data: PatientSurgery[] }>(
      `/api/patients/${encodeURIComponent(patientId)}/surgeries`,
    ),
  createSurgery: (
    patientId: string,
    data: {
      surgery_name: string;
      surgery_date?: string | null;
      surgeon_name?: string | null;
      hospital?: string | null;
      surgery_type?: string | null;
      affected_side?: 'direito' | 'esquerdo' | 'bilateral' | 'nao_aplicavel' | null;
      complications?: string | null;
      notes?: string | null;
    },
  ) =>
    request<{ data: PatientSurgery }>(`/api/patients/${encodeURIComponent(patientId)}/surgeries`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSurgery: (
    patientId: string,
    surgeryId: string,
    data: {
      surgery_name?: string;
      surgery_date?: string | null;
      surgeon_name?: string | null;
      hospital?: string | null;
      surgery_type?: string | null;
      affected_side?: 'direito' | 'esquerdo' | 'bilateral' | 'nao_aplicavel' | null;
      complications?: string | null;
      notes?: string | null;
    },
  ) =>
    request<{ data: PatientSurgery }>(
      `/api/patients/${encodeURIComponent(patientId)}/surgeries/${encodeURIComponent(surgeryId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    ),
  deleteSurgery: (patientId: string, surgeryId: string) =>
    request<{ ok: boolean }>(
      `/api/patients/${encodeURIComponent(patientId)}/surgeries/${encodeURIComponent(surgeryId)}`,
      {
        method: 'DELETE',
      },
    ),
  pathologies: (patientId: string) =>
    request<{ data: PatientPathology[] }>(
      `/api/patients/${encodeURIComponent(patientId)}/pathologies`,
    ),
  createPathology: (
    patientId: string,
    data: {
      pathology_name: string;
      cid_code?: string | null;
      diagnosis_date?: string | null;
      severity?: 'leve' | 'moderada' | 'grave' | null;
      affected_region?: string | null;
      status?: string | null;
      notes?: string | null;
    },
  ) =>
    request<{ data: PatientPathology }>(`/api/patients/${encodeURIComponent(patientId)}/pathologies`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePathology: (
    patientId: string,
    pathologyId: string,
    data: {
      pathology_name?: string;
      cid_code?: string | null;
      diagnosis_date?: string | null;
      severity?: 'leve' | 'moderada' | 'grave' | null;
      affected_region?: string | null;
      status?: string | null;
      notes?: string | null;
      treated_at?: string | null;
    },
  ) =>
    request<{ data: PatientPathology }>(
      `/api/patients/${encodeURIComponent(patientId)}/pathologies/${encodeURIComponent(pathologyId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    ),
  deletePathology: (patientId: string, pathologyId: string) =>
    request<{ ok: boolean }>(
      `/api/patients/${encodeURIComponent(patientId)}/pathologies/${encodeURIComponent(pathologyId)}`,
      {
        method: 'DELETE',
      },
    ),
  medicalReturns: (patientId: string) =>
    request<{ data: MedicalReturn[] }>(`/api/patients/${encodeURIComponent(patientId)}/medical-returns`),
  createMedicalReturn: (
    patientId: string,
    data: {
      doctor_name: string;
      doctor_phone?: string | null;
      return_date?: string | null;
      return_period?: string | null;
      notes?: string | null;
      report_done?: boolean;
      report_sent?: boolean;
    },
  ) =>
    request<{ data: MedicalReturn }>(
      `/api/patients/${encodeURIComponent(patientId)}/medical-returns`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),
  updateMedicalReturn: (
    patientId: string,
    medicalReturnId: string,
    data: {
      doctor_name?: string;
      doctor_phone?: string | null;
      return_date?: string | null;
      return_period?: string | null;
      notes?: string | null;
      report_done?: boolean;
      report_sent?: boolean;
    },
  ) =>
    request<{ data: MedicalReturn }>(
      `/api/patients/${encodeURIComponent(patientId)}/medical-returns/${encodeURIComponent(medicalReturnId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    ),
  deleteMedicalReturn: (patientId: string, medicalReturnId: string) =>
    request<{ ok: boolean }>(
      `/api/patients/${encodeURIComponent(patientId)}/medical-returns/${encodeURIComponent(medicalReturnId)}`,
      {
        method: 'DELETE',
      },
    ),
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

export interface DoctorRecord {
  id: string;
  organization_id?: string | null;
  nome: string;
  especialidade?: string | null;
  telefone?: string | null;
  email?: string | null;
  crm?: string | null;
  observacoes?: string | null;
  clinica_nome?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const doctorsApi = {
  list: (params?: { searchTerm?: string; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v != null && String(v) !== '')
        .map(([k, v]) => [k === 'searchTerm' ? 'search' : k, String(v)]),
    ).toString();
    return request<{ data: DoctorRecord[]; total?: number }>(`/api/doctors${qs ? `?${qs}` : ''}`);
  },
  search: (params: { searchTerm: string; limit?: number }) => doctorsApi.list(params),
  get: (id: string) => request<{ data: DoctorRecord }>(`/api/doctors/${encodeURIComponent(id)}`),
  create: (data: Record<string, unknown>) =>
    request<{ data: DoctorRecord }>('/api/doctors', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    request<{ data: DoctorRecord }>(`/api/doctors/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/doctors/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

export const profileApi = {
  me: () => request<{ data: { organization_id?: string; organizationId?: string } }>('/api/profile/me'),
  listTherapists: () =>
    request<{ data: TherapistSummary[] }>('/api/profile/therapists'),
  updateMe: (data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>('/api/profile/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export interface GoogleIntegrationRecord {
  id: string;
  organization_id?: string | null;
  user_id: string;
  provider: string;
  external_email?: string | null;
  status: string;
  scopes?: string[];
  settings?: Record<string, unknown>;
  tokens?: Record<string, unknown>;
  last_synced_at?: string | null;
  events_synced_count: number;
  created_at: string;
  updated_at: string;
}

export interface GoogleSyncLogRecord {
  id: string;
  integration_id: string;
  action: string;
  status: string;
  event_type?: string | null;
  event_id?: string | null;
  external_event_id?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface GoogleDriveItemRecord {
  id: string;
  organization_id?: string | null;
  user_id: string;
  integration_id?: string | null;
  provider_item_id: string;
  name: string;
  mime_type?: string | null;
  item_kind: string;
  parent_provider_item_id?: string | null;
  web_view_link?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface MFASettingsRecord {
  id: string;
  user_id: string;
  organization_id?: string | null;
  mfa_enabled: boolean;
  mfa_method?: string | null;
  backup_codes: string[];
  pending_otp_expires_at?: string | null;
  last_used_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MFAFactorRecord {
  id: string;
  factor_id: string;
  type: string;
  friendly_name?: string | null;
  verified: boolean;
  created_at: string;
  verified_at?: string | null;
}

export interface GooglePlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

export interface GoogleBusinessReviewRecord {
  author: string;
  rating: number;
  comment: string;
  date: string;
  time?: number;
}

export interface MarketingConsentRecord {
  patient_id: string;
  organization_id: string;
  social_media: boolean;
  educational_material: boolean;
  website: boolean;
  signed_at: string;
  signed_by: string;
  signature_ip?: string | null;
  expires_at?: string | null;
  is_active: boolean;
  revoked_at?: string | null;
}

export interface MarketingExportRecord {
  id: string;
  patient_id: string;
  organization_id: string;
  export_type: string;
  file_path: string;
  file_url: string;
  is_anonymized: boolean;
  metrics_overlay: string[];
  asset_a_id?: string | null;
  asset_b_id?: string | null;
  created_at: string;
  patient_name?: string | null;
}

export interface ReviewAutomationConfigRecord {
  organization_id: string;
  enabled: boolean;
  trigger_status: string[];
  message_template: string;
  delay_hours: number;
  google_place_id?: string | null;
}

export interface BirthdayAutomationConfigRecord {
  organization_id: string;
  enabled: boolean;
  message_template: string;
  send_whatsapp: boolean;
  send_email: boolean;
}

export interface RecallCampaignRecord {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  days_without_visit: number;
  message_template: string;
  enabled: boolean;
  created_at: string;
}

export interface ReferralCodeRecord {
  id: string;
  patient_id: string;
  organization_id: string;
  code: string;
  reward_type: 'discount' | 'session' | 'product';
  reward_value: number;
  referrer_reward?: {
    type: 'discount' | 'session';
    value: number;
  } | null;
  uses: number;
  max_uses?: number | null;
  expires_at?: string | null;
  created_at: string;
}

export interface FisioLinkConfigRecord {
  organization_id: string;
  slug: string;
  whatsapp_number?: string | null;
  google_maps_url?: string | null;
  phone?: string | null;
  show_before_after: boolean;
  show_reviews: boolean;
  custom_message?: string | null;
  theme: 'light' | 'dark' | 'clinical';
  primary_color: string;
}

export interface ContentCalendarRecord {
  id: string;
  title: string;
  description: string;
  type: 'post' | 'story' | 'reel' | 'carousel' | 'live';
  status: 'idea' | 'scheduled' | 'posted' | 'cancelled';
  date: string | null;
  hashtags?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ActivityLabClinicRecord {
  id: string;
  clinic_name: string;
  professional_name: string;
  registration_number: string;
  updated_at: string;
  source: 'activity_lab';
}

export interface ActivityLabSessionRecord {
  id: string;
  patient_id: string;
  protocol_name: string;
  body_part: string;
  side: 'LEFT' | 'RIGHT';
  test_type: 'isometric';
  created_at: string;
  updated_at: string;
  peak_force: number;
  avg_force: number;
  duration: number;
  rfd: number;
  sensitivity: number;
  raw_force_data: Array<{ value: number; timestamp: number }>;
  sample_rate: number;
  device_model: string;
  device_firmware: string;
  device_battery: number;
  measurement_mode: 'isometric';
  is_simulated: boolean;
  notes: string;
  organization_id: string;
  source: 'activity_lab';
}

export const integrationsApi = {
  searchPlaces: (query: string) =>
    request<{ data: GooglePlacePrediction[] }>(
      `/api/integrations/google/places/search?query=${encodeURIComponent(query)}`,
    ),
  google: {
    authUrl: (state?: string) =>
      request<{ data: { url: string } }>(`/api/integrations/google/auth-url${state ? `?state=${encodeURIComponent(state)}` : ''}`),
    status: () =>
      request<{ data: GoogleIntegrationRecord | null }>('/api/integrations/google/status'),
    business: {
      reviews: () =>
        request<{ data: GoogleBusinessReviewRecord[] }>('/api/integrations/google/business/reviews'),
    },
    connect: (data?: { code?: string; email?: string }) =>
      request<{ data: GoogleIntegrationRecord }>('/api/integrations/google/connect', {
        method: 'POST',
        body: JSON.stringify(data ?? {}),
      }),
    disconnect: () =>
      request<{ data: GoogleIntegrationRecord | null }>('/api/integrations/google/disconnect', {
        method: 'POST',
      }),
    calendar: {
      get: () =>
        request<{ data: GoogleIntegrationRecord | null }>('/api/integrations/google/calendar'),
      update: (data: Record<string, unknown>) =>
        request<{ data: GoogleIntegrationRecord }>('/api/integrations/google/calendar', {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      sync: () =>
        request<{ data: { synced_at: string; integration: GoogleIntegrationRecord } }>(
          '/api/integrations/google/calendar/sync',
          { method: 'POST' },
        ),
      logs: () =>
        request<{ data: GoogleSyncLogRecord[] }>('/api/integrations/google/calendar/logs'),
      importPreview: (data: { startDate: string; endDate: string }) =>
        request<{ data: { success: boolean; events: Array<{ id: string; summary: string; start: string | null; end: string | null }> } }>(
          '/api/integrations/google/calendar/import-preview',
          {
            method: 'POST',
            body: JSON.stringify(data),
          },
        ),
      syncAppointment: (data: Record<string, unknown>) =>
        request<{ data: { success: boolean; externalEventId: string } }>(
          '/api/integrations/google/calendar/sync-appointment',
          {
            method: 'POST',
            body: JSON.stringify(data),
          },
        ),
    },
    docs: {
      listTemplates: (folderId?: string) =>
        request<{ data: GoogleDriveItemRecord[] }>(`/api/integrations/google/docs/templates${folderId ? `?folderId=${encodeURIComponent(folderId)}` : ''}`),
      generateReport: (data: {
        templateId: string;
        patientName: string;
        data: Record<string, string>;
        folderId?: string;
      }) =>
        request<{ data: { success: boolean; fileId: string; webViewLink: string } }>(
          '/api/integrations/google/docs/generate-report',
          {
            method: 'POST',
            body: JSON.stringify(data),
          },
        ),
    },
    drive: {
      listFiles: (folderId?: string) =>
        request<{ data: GoogleDriveItemRecord[] }>(`/api/integrations/google/drive/files${folderId ? `?folderId=${encodeURIComponent(folderId)}` : ''}`),
      createFolder: (data: { name: string; parentId?: string }) =>
        request<{ data: { folderId: string; webViewLink: string } }>(
          '/api/integrations/google/drive/folders',
          {
            method: 'POST',
            body: JSON.stringify(data),
          },
        ),
    },
  },
};

export const marketingApi = {
  consents: {
    get: (patientId: string) =>
      request<{ data: MarketingConsentRecord | null }>(`/api/marketing/consents/${patientId}`),
    upsert: (patientId: string, data: Partial<MarketingConsentRecord>) =>
      request<{ data: MarketingConsentRecord }>(`/api/marketing/consents/${patientId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    revoke: (patientId: string) =>
      request<{ data: MarketingConsentRecord }>(`/api/marketing/consents/${patientId}/revoke`, {
        method: 'POST',
      }),
  },
  reviewConfig: {
    get: () =>
      request<{ data: ReviewAutomationConfigRecord }>('/api/marketing/review-config'),
    update: (data: Partial<ReviewAutomationConfigRecord>) =>
      request<{ data: ReviewAutomationConfigRecord }>('/api/marketing/review-config', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  birthdayConfig: {
    get: () =>
      request<{ data: BirthdayAutomationConfigRecord }>('/api/marketing/birthday-config'),
    update: (data: Partial<BirthdayAutomationConfigRecord>) =>
      request<{ data: BirthdayAutomationConfigRecord }>('/api/marketing/birthday-config', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  recallCampaigns: {
    list: () =>
      request<{ data: RecallCampaignRecord[] }>('/api/marketing/recall-campaigns'),
    create: (data: Partial<RecallCampaignRecord>) =>
      request<{ data: RecallCampaignRecord }>('/api/marketing/recall-campaigns', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<RecallCampaignRecord>) =>
      request<{ data: RecallCampaignRecord }>(`/api/marketing/recall-campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/marketing/recall-campaigns/${id}`, {
        method: 'DELETE',
      }),
  },
  referrals: {
    stats: () =>
      request<{ data: { totalCodes: number; activeCodes: number; totalRedemptions: number; pendingRewards: number; topReferrers: Array<{ patient_id: string; patient_name: string; redemptions: number }> } }>('/api/marketing/referrals/stats'),
    create: (data: Partial<ReferralCodeRecord> & { patient_id: string; code: string }) =>
      request<{ data: ReferralCodeRecord }>('/api/marketing/referrals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getByCode: (code: string) =>
      request<{ data: ReferralCodeRecord | null }>(`/api/marketing/referrals/code/${encodeURIComponent(code)}`),
    getByPatient: (patientId: string) =>
      request<{ data: ReferralCodeRecord | null }>(`/api/marketing/referrals/patient/${patientId}`),
    redeem: (data: { code: string; new_patient_id: string }) =>
      request<{ data: { success: boolean; reward?: string; error?: string } }>('/api/marketing/referrals/redeem', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  fisiolink: {
    getMine: () =>
      request<{ data: FisioLinkConfigRecord | null }>('/api/marketing/fisiolink'),
    update: (data: Partial<FisioLinkConfigRecord>) =>
      request<{ data: FisioLinkConfigRecord }>('/api/marketing/fisiolink', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    analytics: (slug: string) =>
      request<{ data: { totalClicks: number; clicksByButton: Record<string, number> } }>(`/api/marketing/fisiolink/${encodeURIComponent(slug)}/analytics`),
    publicGet: (slug: string) =>
      requestPublic<{ data: FisioLinkConfigRecord | null }>(`/api/marketing/public/fisiolink/${encodeURIComponent(slug)}`),
    trackClick: (slug: string, button: string) =>
      requestPublic<{ ok: boolean }>(`/api/marketing/public/fisiolink/${encodeURIComponent(slug)}/click`, {
        method: 'POST',
        body: JSON.stringify({ button }),
      }),
  },
  exports: {
    list: (params?: { patientId?: string }) => {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])),
      ).toString();
      return request<{ data: MarketingExportRecord[] }>(`/api/marketing/exports${qs ? `?${qs}` : ''}`);
    },
    create: (data: Partial<MarketingExportRecord> & { patient_id: string; file_path: string; file_url: string }) =>
      request<{ data: MarketingExportRecord }>('/api/marketing/exports', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ data: { id: string; file_path: string } }>(`/api/marketing/exports/${id}`, {
        method: 'DELETE',
      }),
  },
  contentCalendar: {
    list: () =>
      request<{ data: ContentCalendarRecord[] }>('/api/marketing/content-calendar'),
    create: (data: Omit<ContentCalendarRecord, 'id' | 'created_at' | 'updated_at'>) =>
      request<{ data: ContentCalendarRecord }>('/api/marketing/content-calendar', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<ContentCalendarRecord>) =>
      request<{ data: ContentCalendarRecord }>(`/api/marketing/content-calendar/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/marketing/content-calendar/${id}`, {
        method: 'DELETE',
      }),
  },
  roi: (data: { startDate: string; endDate: string }) =>
    request<{ data: { totalLeads: number; convertedLeads: number } }>(
      `/api/marketing/roi?startDate=${encodeURIComponent(data.startDate)}&endDate=${encodeURIComponent(data.endDate)}`,
    ),
};

export const activityLabApi = {
  patients: {
    list: (params?: { search?: string; limit?: number }) => {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, value]) => value != null && String(value).trim() !== '')
            .map(([key, value]) => [key, String(value)]),
        ),
      ).toString();

      return request<{ data: PatientRow[] }>(`/api/activity-lab/patients${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) =>
      request<{ data: PatientRow | null }>(`/api/activity-lab/patients/${id}`),
  },
  sessions: {
    listByPatient: (patientId: string) =>
      request<{ data: ActivityLabSessionRecord[] }>(
        `/api/activity-lab/patients/${patientId}/sessions`,
      ),
    get: (id: string) =>
      request<{ data: ActivityLabSessionRecord | null }>(`/api/activity-lab/sessions/${id}`),
  },
  clinic: {
    get: () =>
      request<{ data: ActivityLabClinicRecord | null }>('/api/activity-lab/clinic/profile'),
  },
};

export const securityApi = {
  lgpd: {
    list: () =>
      request<{ data: LGPDConsentRecord[] }>('/api/security/lgpd-consents'),
    update: (consentType: string, data: { granted: boolean; version?: string }) =>
      request<{ data: LGPDConsentRecord | null }>(`/api/security/lgpd-consents/${encodeURIComponent(consentType)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  mfa: {
    getSettings: () =>
      request<{ data: MFASettingsRecord | null }>('/api/security/mfa/settings'),
    enable: (method: string) =>
      request<{ data: MFASettingsRecord; backupCodes: string[] }>('/api/security/mfa/enable', {
        method: 'POST',
        body: JSON.stringify({ method }),
      }),
    disable: () =>
      request<{ data: MFASettingsRecord | null }>('/api/security/mfa/disable', {
        method: 'POST',
      }),
    sendOtp: () =>
      request<{ data: { success: boolean; expiresAt: string; debugCode?: string } }>(
        '/api/security/mfa/send-otp',
        { method: 'POST' },
      ),
    verifyOtp: (code: string) =>
      request<{ data: { verified: boolean } }>('/api/security/mfa/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    enroll: (friendlyName?: string) =>
      request<{ data: { qrCode: string; secret: string; factorId: string } }>(
        '/api/security/mfa/enroll',
        {
          method: 'POST',
          body: JSON.stringify({ friendlyName }),
        },
      ),
    verifyEnrollment: (factorId: string, code: string) =>
      request<{ data: { verified: boolean } }>('/api/security/mfa/enroll/verify', {
        method: 'POST',
        body: JSON.stringify({ factorId, code }),
      }),
    listFactors: () =>
      request<{ data: MFAFactorRecord[] }>('/api/security/mfa/factors'),
    deleteFactor: (factorId: string) =>
      request<{ data: { success: boolean } }>(`/api/security/mfa/factors/${encodeURIComponent(factorId)}`, {
        method: 'DELETE',
      }),
  },
};

export interface LGPDConsentRecord {
  id: string;
  user_id: string;
  organization_id: string;
  consent_type: string;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  version: string;
  created_at: string;
  updated_at: string;
}

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

export interface ProjectRecord {
  id: string;
  title: string;
  description?: string | null;
  status: 'active' | 'completed' | 'archived' | 'on_hold';
  start_date?: string | null;
  end_date?: string | null;
  organization_id: string;
  created_by: string;
  manager_id?: string | null;
  created_at: string;
  updated_at: string;
  manager?: {
    full_name: string;
    avatar_url?: string | null;
  } | null;
}

export const projectsApi = {
  list: () => request<{ data: ProjectRecord[] }>('/api/projects'),
  get: (id: string) => request<{ data: ProjectRecord }>(`/api/projects/${id}`),
  create: (data: Partial<ProjectRecord>) =>
    request<{ data: ProjectRecord }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ProjectRecord>) =>
    request<{ data: ProjectRecord }>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) => request<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),
};

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
    return request<DashboardResponse>(`/api/insights/dashboard${qs ? `?${qs}` : ''}`);
  },
  financial: (params: { startDate: string; endDate: string }) =>
    request<FinancialReportResponse>(`/api/insights/financial?startDate=${encodeURIComponent(
      params.startDate,
    )}&endDate=${encodeURIComponent(params.endDate)}`),
  topExercises: (limit?: number) =>
    request<{ data: AnalyticsExerciseUsage[] }>(
      `/api/insights/top-exercises${limit ? `?limit=${encodeURIComponent(String(limit))}` : ''}`,
    ),
  painMap: (limit?: number) =>
    request<{ data: AnalyticsPainRegion[] }>(
      `/api/insights/pain-map${limit ? `?limit=${encodeURIComponent(String(limit))}` : ''}`,
    ),
  intelligentReports: {
    list: (patientId: string) =>
      request<{ data: IntelligentReportRecord[] }>(`/api/insights/intelligent-reports/${patientId}`),
    generate: (payload: {
      patientId: string;
      reportType: string;
      dateRange: { start: string; end: string };
    }) =>
      request<{ data: IntelligentReportResponse }>('/api/insights/intelligent-reports', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  patientEvolution: (patientId: string) =>
    request<{ data: PatientEvolutionPoint[] }>(`/api/insights/patient-evolution/${patientId}`),
  patientProgress: (patientId: string) =>
    request<{ data: PatientProgressSummary }>(`/api/insights/patient-progress/${patientId}`),
  patientLifecycleEvents: {
    list: (patientId: string) =>
      request<{ data: PatientLifecycleEvent[] }>(`/api/insights/patient-lifecycle-events/${patientId}`),
    create: (data: {
      patient_id: string;
      event_type: string;
      event_date?: string;
      notes?: string;
    }) =>
      request<{ data: PatientLifecycleEvent }>('/api/insights/patient-lifecycle-events', {
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
        `/api/insights/patient-outcome-measures/${patientId}${qs ? `?${qs}` : ''}`,
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
      request<{ data: PatientOutcomeMeasure }>('/api/insights/patient-outcome-measures', {
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
        `/api/insights/patient-session-metrics/${patientId}${qs ? `?${qs}` : ''}`,
      );
    },
    create: (data: Partial<PatientSessionMetricsType & { patient_id: string }>) =>
      request<{ data: PatientSessionMetrics }>('/api/insights/patient-session-metrics', {
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
        `/api/insights/patient-predictions/${patientId}${qs ? `?${qs}` : ''}`,
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
      request<{ data: PatientPrediction[] }>('/api/insights/patient-predictions/upsert', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  patientRisk: (patientId: string) =>
    request<{ data: PatientRiskScore | null }>(`/api/insights/patient-risk/${patientId}`),
  patientInsights: {
    list: (patientId: string, params?: { includeAcknowledged?: boolean }) => {
      const qs = new URLSearchParams(
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString();
      return request<{ data: PatientInsight[] }>(
        `/api/insights/patient-insights/${patientId}${qs ? `?${qs}` : ''}`,
      );
    },
    acknowledge: (insightId: string) =>
      request<{ data: PatientInsight }>(`/api/insights/patient-insights/${insightId}/acknowledge`, {
        method: 'PATCH',
      }),
  },
  patientGoals: {
    list: (patientId: string) =>
      request<{ data: PatientGoalTracking[] }>(`/api/insights/patient-goals/${patientId}`),
    create: (data: Partial<PatientGoalTracking & { patient_id: string }>) =>
      request<{ data: PatientGoalTracking }>('/api/insights/patient-goals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<PatientGoalTracking>) =>
      request<{ data: PatientGoalTracking }>(`/api/insights/patient-goals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    complete: (id: string) =>
      request<{ data: PatientGoalTracking }>(`/api/insights/patient-goals/${id}/complete`, {
        method: 'PATCH',
      }),
  },
  clinicalBenchmarks: {
    list: (category?: string) => {
      const qs = category ? `?category=${encodeURIComponent(category)}` : '';
      return request<{ data: ClinicalBenchmark[] }>(`/api/insights/clinical-benchmarks${qs}`);
    },
  },
  mlTrainingData: {
    collect: (patientId: string) =>
      request<{ data: MLTrainingData }>(`/api/insights/ml-training-data/patient/${patientId}`),
    upsert: (data: Partial<MLTrainingData>) =>
      request<{ data: MLTrainingData }>('/api/insights/ml-training-data', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    stats: () => request<{ data: MlTrainingStats }>('/api/insights/ml-training-data/stats'),
    patients: (params?: { limit?: number }) => {
      const qs = params?.limit ? `?limit=${encodeURIComponent(String(params.limit))}` : '';
      return request<{ data: MlTrainingPatientRecord[] }>(`/api/insights/ml-training-data/patients${qs}`);
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
        `/api/insights/ml-training-data/similar${qs ? `?${qs}` : ''}`,
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
        `/api/insights/population-health?${qs}`,
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

export interface ClinicalTestTemplateRecord {
  id: string;
  organization_id?: string | null;
  created_by?: string | null;
  name: string;
  name_en?: string | null;
  category: string;
  target_joint: string;
  purpose?: string | null;
  execution?: string | null;
  positive_sign?: string | null;
  reference?: string | null;
  sensitivity_specificity?: string | null;
  tags?: string[];
  type?: string | null;
  fields_definition?: unknown[];
  regularity_sessions?: number | null;
  layout_type?: 'single' | 'multi_field' | 'y_balance' | 'radial' | null;
  image_url?: string | null;
  media_urls?: string[];
  is_custom?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ConductLibraryRecord {
  id: string;
  organization_id?: string | null;
  created_by?: string | null;
  title: string;
  description?: string | null;
  conduct_text: string;
  category: string;
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
  exercises_performed?: unknown[] | null;
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
      return request<{ data: any[] }>(
        `/api/evolution/required-measurements${query.toString() ? `?${query.toString()}` : ''}`,
      );
    },
  },
  treatmentSessions: {
    list: (patientId: string, params?: { limit?: number }) => {
      const query = new URLSearchParams(
        Object.entries({
          patientId,
          limit: params?.limit ? String(params.limit) : undefined,
        }).filter(([, value]) => value != null) as [string, string][],
      ).toString();

      return request<{ data: TreatmentSessionRecord[] }>(
        `/api/evolution/treatment-sessions${query ? `?${query}` : ''}`,
      );
    },
    upsert: (data: {
      patient_id: string;
      appointment_id: string;
      therapist_id?: string;
      subjective?: string;
      objective?: Record<string, unknown> | string;
      assessment?: string;
      plan?: string;
      observations?: string;
      exercises_performed?: unknown[];
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

export const clinicalTestsApi = {
  list: (params?: { ids?: string[] }) => {
    const query = new URLSearchParams();
    if (params?.ids && params.ids.length > 0) {
      query.set('ids', params.ids.join(','));
    }
    return request<{ data: ClinicalTestTemplateRecord[] }>(
      `/api/clinical/test-templates${query.toString() ? `?${query.toString()}` : ''}`,
    );
  },
  get: (id: string) =>
    request<{ data: ClinicalTestTemplateRecord }>(`/api/clinical/test-templates/${id}`),
  create: (data: Partial<ClinicalTestTemplateRecord>) =>
    request<{ data: ClinicalTestTemplateRecord }>('/api/clinical/test-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ClinicalTestTemplateRecord>) =>
    request<{ data: ClinicalTestTemplateRecord }>(`/api/clinical/test-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/clinical/test-templates/${id}`, { method: 'DELETE' }),
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
  get: (id: string) => request<{ data: AppointmentRow & { patient?: PatientRow | null } }>(`/api/appointments/${id}`),
  checkConflict: (data: {
    therapistId: string;
    date: string;
    startTime: string;
    endTime: string;
    excludeAppointmentId?: string;
  }) =>
    request<{ hasConflict: boolean; conflictingAppointments: unknown[] }>('/api/appointments/check-conflict', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  create: (data: Record<string, unknown>) =>
    request<{ data: AppointmentRow }>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<AppointmentRow> & Record<string, unknown>) =>
    request<{ data: AppointmentRow }>(`/api/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  cancel: (id: string, reason?: string) =>
    request<{ success: boolean }>(`/api/appointments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    }),
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
  package_template_id?: string | null;
  name: string;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  price?: number | null;
  payment_method?: string | null;
  status?: string | null;
  purchased_at?: string | null;
  expires_at?: string | null;
  last_used_at?: string | null;
  created_at: string;
  patient_name?: string | null;
  patient_phone?: string | null;
}

export interface InventoryItemRow {
  id: string;
  organization_id: string | null;
  item_name: string;
  category: string | null;
  current_quantity: number;
  minimum_quantity: number;
  unit: string;
  cost_per_unit: number | null;
  supplier: string | null;
  last_restock_date: string | null;
  expiration_date: string | null;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovementRow {
  id: string;
  inventory_id: string;
  movement_type: 'entrada' | 'saida' | 'ajuste' | 'perda';
  quantity: number;
  reason: string | null;
  related_appointment_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface StaffPerformanceRow {
  id: string;
  therapist_id: string;
  metric_date: string;
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  no_show_appointments: number;
  average_session_duration: number | null;
  patient_satisfaction_avg: number | null;
  revenue_generated: number;
  new_patients: number;
  returning_patients: number;
  created_at: string;
}

export interface RevenueForecastRow {
  id: string;
  organization_id: string | null;
  forecast_date: string;
  predicted_revenue: number;
  actual_revenue: number | null;
  predicted_appointments: number;
  actual_appointments: number | null;
  confidence_interval_low: number;
  confidence_interval_high: number;
  factors: Record<string, unknown>;
  model_version: string;
  created_at: string;
}

export interface WhatsAppExerciseQueueRow {
  id: string;
  patient_id: string;
  exercise_plan_id: string | null;
  phone_number: string;
  exercises: Record<string, unknown>[];
  scheduled_for: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'failed';
  error_message: string | null;
  created_at: string;
}

export interface PatientSelfAssessmentRow {
  id: string;
  patient_id: string;
  assessment_type: 'pain_level' | 'mood' | 'exercise_completion' | 'nps';
  question: string;
  response: string | null;
  numeric_value: number | null;
  received_via: string;
  sent_at: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface SessionPackageTemplateRow {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  sessions_count: number;
  price: number;
  validity_days: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface VoucherRecord {
  id: string;
  organization_id: string;
  nome: string;
  descricao: string | null;
  tipo: 'pacote' | 'mensal' | 'trimestral' | 'semestral';
  sessoes: number | null;
  validade_dias: number;
  preco: number;
  ativo: boolean;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserVoucherRecord {
  id: string;
  organization_id: string;
  user_id: string;
  voucher_id: string;
  sessoes_restantes: number;
  sessoes_totais: number;
  data_compra: string;
  data_expiracao: string;
  ativo: boolean;
  valor_pago: number;
  created_at: string;
  updated_at: string;
  voucher?: VoucherRecord;
}

export interface NFSeRecord {
  id: string;
  organization_id?: string;
  numero: string;
  serie: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  data_emissao: string;
  data_prestacao: string;
  destinatario: Record<string, unknown>;
  prestador: Record<string, unknown>;
  servico: Record<string, unknown>;
  status: 'rascunho' | 'emitida' | 'cancelada' | 'erro';
  chave_acesso?: string | null;
  protocolo?: string | null;
  verificacao?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface NFSeConfigRecord {
  organization_id?: string;
  ambiente: 'homologacao' | 'producao';
  municipio_codigo?: string | null;
  cnpj_prestador?: string | null;
  inscricao_municipal?: string | null;
  aliquota_iss: number;
  auto_emissao: boolean;
  created_at?: string;
  updated_at?: string;
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
    create: (data: {
      patient_id: string;
      package_id?: string;
      name?: string;
      custom_sessions?: number;
      custom_price?: number;
      payment_method?: string;
      validity_days?: number;
    }) => fin('/patient-packages', { method: 'POST', body: JSON.stringify(data) }),
    consume: (id: string, data?: { appointmentId?: string }) =>
      fin(`/patient-packages/${id}/consume`, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  },
  packageTemplates: {
    list: () => fin('/package-templates'),
    create: (d: Partial<SessionPackageTemplateRow>) =>
      fin('/package-templates', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<SessionPackageTemplateRow>) =>
      fin(`/package-templates/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string) => fin(`/package-templates/${id}`, { method: 'DELETE' }),
  },
  vouchers: {
    list: (params?: { all?: boolean; ativo?: boolean }) => {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      );
      return fin(`/vouchers${query.toString() ? `?${query.toString()}` : ''}`);
    },
    create: (data: Partial<VoucherRecord>) =>
      fin('/vouchers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<VoucherRecord>) =>
      fin(`/vouchers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fin(`/vouchers/${id}`, { method: 'DELETE' }),
    checkout: (id: string) =>
      fin(`/vouchers/${id}/checkout`, { method: 'POST' }),
    verifyCheckout: (sessionId: string) =>
      fin('/vouchers/checkout/verify', { method: 'POST', body: JSON.stringify({ sessionId }) }),
  },
  userVouchers: {
    list: () => fin('/user-vouchers'),
    consume: (id: string) => fin(`/user-vouchers/${id}/consume`, { method: 'POST' }),
  },
  nfse: {
    list: () => fin('/nfse'),
    create: (data: Partial<NFSeRecord>) =>
      fin('/nfse', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<NFSeRecord>) =>
      fin(`/nfse/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fin(`/nfse/${id}`, { method: 'DELETE' }),
  },
  nfseConfig: {
    get: () => fin('/nfse-config'),
    upsert: (data: Partial<NFSeConfigRecord>) =>
      fin('/nfse-config', { method: 'PUT', body: JSON.stringify(data) }),
  },
};

const innovations = (path: string, opts?: RequestInit) => request<any>(`/api/innovations${path}`, opts);
export const innovationsApi = {
  inventory: {
    list: (params?: { activeOnly?: boolean }) => {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      );
      return innovations(`/inventory${query.toString() ? `?${query.toString()}` : ''}`);
    },
    create: (data: Partial<InventoryItemRow>) =>
      innovations('/inventory', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<InventoryItemRow>) =>
      innovations(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  inventoryMovements: {
    list: (params?: { inventoryId?: string; limit?: number }) => {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      );
      return innovations(`/inventory-movements${query.toString() ? `?${query.toString()}` : ''}`);
    },
    create: (data: Partial<InventoryMovementRow>) =>
      innovations('/inventory-movements', { method: 'POST', body: JSON.stringify(data) }),
  },
  staffPerformance: {
    list: (params?: { therapistId?: string; startDate?: string; endDate?: string }) => {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      );
      return innovations(`/staff-performance${query.toString() ? `?${query.toString()}` : ''}`);
    },
  },
  appointmentPredictions: {
    list: (params?: { limit?: number }) => {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      );
      return innovations(`/appointment-predictions${query.toString() ? `?${query.toString()}` : ''}`);
    },
  },
  revenueForecasts: {
    list: (params?: { limit?: number }) => {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      );
      return innovations(`/revenue-forecasts${query.toString() ? `?${query.toString()}` : ''}`);
    },
  },
  whatsappExerciseQueue: {
    list: (params?: { limit?: number }) => {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      );
      return innovations(`/whatsapp-exercise-queue${query.toString() ? `?${query.toString()}` : ''}`);
    },
    create: (data: Partial<WhatsAppExerciseQueueRow>) =>
      innovations('/whatsapp-exercise-queue', { method: 'POST', body: JSON.stringify(data) }),
  },
  patientSelfAssessments: {
    list: (params?: { patientId?: string; limit?: number }) => {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      );
      return innovations(`/patient-self-assessments${query.toString() ? `?${query.toString()}` : ''}`);
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
export interface CrmCampanha { id: string; organization_id: string; created_by?: string; nome: string; tipo: string; conteudo?: string; status: string; total_destinatarios: number; total_enviados: number; agendada_em?: string | null; concluida_em?: string | null; created_at: string; updated_at: string; }

const crm = (path: string, opts?: RequestInit) => request<any>(`/api/crm${path}`, opts);
export const crmApi = {
  leads: { list: (p?:{estagio?:string})=>crm(`/leads?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`), get:(id:string)=>crm(`/leads/${id}`), create:(d:Partial<Lead>)=>crm('/leads',{method:'POST',body:JSON.stringify(d)}), update:(id:string,d:Partial<Lead>)=>crm(`/leads/${id}`,{method:'PUT',body:JSON.stringify(d)}), delete:(id:string)=>crm(`/leads/${id}`,{method:'DELETE'}), historico:(id:string)=>crm(`/leads/${id}/historico`), addHistorico:(id:string,d:Partial<LeadHistorico>)=>crm(`/leads/${id}/historico`,{method:'POST',body:JSON.stringify(d)}) },
  tarefas: { list:(p?:{status?:string;leadId?:string})=>crm(`/tarefas?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`), create:(d:Partial<CrmTarefa>)=>crm('/tarefas',{method:'POST',body:JSON.stringify(d)}), update:(id:string,d:Partial<CrmTarefa>)=>crm(`/tarefas/${id}`,{method:'PUT',body:JSON.stringify(d)}), delete:(id:string)=>crm(`/tarefas/${id}`,{method:'DELETE'}) },
  campanhas: {
    list: (p?: { status?: string; tipo?: string; limit?: number; offset?: number }) =>
      crm(`/campanhas?${new URLSearchParams(Object.fromEntries(Object.entries(p ?? {}).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])))}`),
    create: (d: Partial<CrmCampanha> & { patient_ids?: string[] }) =>
      crm('/campanhas', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<CrmCampanha>) =>
      crm(`/campanhas/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string) =>
      crm(`/campanhas/${id}`, { method: 'DELETE' }),
  },
};

// ===== API CLINICAL =====
export interface PainMap { id: string; organization_id?: string; patient_id?: string; evolution_id?: string; body_region?: string; pain_level?: number; color_code?: string; notes?: string; points?: PainMapPoint[]; created_at: string; updated_at: string; }
export interface PainMapPoint { id: string; pain_map_id: string; x_coordinate?: number; y_coordinate?: number; intensity?: number; region?: string; created_at: string; }
export interface EvolutionTemplate { id: string; organization_id: string; name: string; description?: string; blocks: unknown[]; tags?: string[]; ativo: boolean; created_by?: string; created_at: string; updated_at: string; }
export interface ExercisePrescription { id: string; organization_id?: string; patient_id?: string; therapist_id?: string; qr_code?: string; title: string; exercises: unknown[]; notes?: string; validity_days?: number; valid_until?: string; status: string; view_count?: number; last_viewed_at?: string; completed_exercises?: unknown[]; created_at: string; updated_at: string; }
export interface StandardizedTestResultRow {
  id: string;
  organization_id: string;
  patient_id: string;
  test_type: 'oswestry' | 'lysholm' | 'dash';
  test_name: string;
  score: number;
  max_score: number;
  interpretation: string | null;
  answers: Record<string, number>;
  created_by: string;
  created_at: string;
  updated_at: string;
}
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
  conductLibrary: {
    list: (p?: { category?: string }) => {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(p ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      ).toString();
      return clin(`/conduct-library${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => clin(`/conduct-library/${id}`),
    create: (d: Partial<ConductLibraryRecord>) =>
      clin('/conduct-library', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<ConductLibraryRecord>) =>
      clin(`/conduct-library/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string) => clin(`/conduct-library/${id}`, { method: 'DELETE' }),
  },
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
  patientObjectives: {
    list: () => clin('/patient-objectives'),
    create: (data: Record<string, unknown>) =>
      clin('/patient-objectives', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      clin(`/patient-objectives/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      clin(`/patient-objectives/${id}`, { method: 'DELETE' }),
  },
  patientObjectiveAssignments: {
    list: (patientId: string) =>
      clin(`/patient-objective-assignments?patientId=${encodeURIComponent(patientId)}`),
    create: (data: Record<string, unknown>) =>
      clin('/patient-objective-assignments', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      clin(`/patient-objective-assignments/${id}`, { method: 'DELETE' }),
  },
  standardizedTests: {
    list: (patientId: string) =>
      clin(`/standardized-tests?patientId=${encodeURIComponent(patientId)}`),
    create: (data: Partial<StandardizedTestResultRow>) =>
      clin('/standardized-tests', { method: 'POST', body: JSON.stringify(data) }),
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

export interface PatientEvaluationResponseRow {
  id: string;
  organization_id?: string | null;
  patient_id: string;
  form_id: string;
  appointment_id?: string | null;
  responses: Record<string, unknown>;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
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
  responses: {
    list: (formId: string, params?: { patientId?: string }) => {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      ).toString();
      return evalForms(`/${formId}/responses${qs ? `?${qs}` : ''}`);
    },
    create: (
      formId: string,
      d: {
        patient_id: string;
        appointment_id?: string | null;
        responses: Record<string, unknown>;
      },
    ) =>
      evalForms(`/${formId}/responses`, { method: 'POST', body: JSON.stringify(d) }),
  },
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

export interface AssetAnnotationVersionRecord {
  id: string;
  asset_id: string;
  version: number;
  data: Record<string, unknown>[];
  created_at: string;
  author_id?: string;
}

export const mediaApi = {
  getUploadUrl: (data: { filename: string; contentType: string; folder?: string }) =>
    request<{ data: { uploadUrl: string; publicUrl: string; key: string; expiresIn: number } }>(
      '/api/media/upload-url',
      { method: 'POST', body: JSON.stringify(data) },
    ),
  annotations: {
    list: (assetId: string) =>
      request<{ data: AssetAnnotationVersionRecord[] }>(
        `/api/media/annotations?assetId=${encodeURIComponent(assetId)}`,
      ),
    create: (data: {
      asset_id: string;
      version: number;
      data: Record<string, unknown>[];
    }) =>
      request<{ data: AssetAnnotationVersionRecord }>('/api/media/annotations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
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
export interface EventoTemplateRow {
  id: string;
  organization_id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  gratuito: boolean;
  valor_padrao_prestador: number | null;
  checklist_padrao: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}
export const eventosApi = {
  list: (p?:{status?:string;categoria?:string;limit?:number;offset?:number}) => request<{data:Evento[]}>(`/api/activities?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`),
  get: (id:string) => request<{data:Evento}>(`/api/activities/${id}`),
  create: (d:Partial<Evento>) => request<{data:Evento}>('/api/activities',{method:'POST',body:JSON.stringify(d)}),
  update: (id:string,d:Partial<Evento>) => request<{data:Evento}>(`/api/activities/${id}`,{method:'PUT',body:JSON.stringify(d)}),
  delete: (id:string) => request<{ok:boolean}>(`/api/activities/${id}`,{method:'DELETE'}),
};
export const eventoTemplatesApi = {
  list: () => request<{ data: EventoTemplateRow[] }>('/api/activity-templates'),
  get: (id: string) => request<{ data: EventoTemplateRow }>(`/api/activity-templates/${id}`),
  create: (data: Partial<EventoTemplateRow>) =>
    request<{ data: EventoTemplateRow }>('/api/activity-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/activity-templates/${id}`, { method: 'DELETE' }),
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
  list: (p?:{eventoId?:string;contratadoId?:string}) => request<{data:EventoContratado[]}>(`/api/activity-contractors?${new URLSearchParams(Object.fromEntries(Object.entries(p??{}).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)])))}`),
  create: (d:Partial<EventoContratado>) => request<{data:EventoContratado}>('/api/activity-contractors',{method:'POST',body:JSON.stringify(d)}),
  update: (id:string,d:Partial<EventoContratado>) => request<{data:EventoContratado}>(`/api/activity-contractors/${id}`,{method:'PUT',body:JSON.stringify(d)}),
  delete: (id:string) => request<{ok:boolean}>(`/api/activity-contractors/${id}`,{method:'DELETE'}),
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

export interface MedicalReportTemplateRecord {
  id: string;
  nome: string;
  descricao: string;
  tipo_relatorio: string;
  campos: string[];
  organization_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicalReportRecord {
  id: string;
  patientId?: string;
  tipo_relatorio: string;
  paciente: Record<string, unknown>;
  profissional_emissor: Record<string, unknown>;
  profissional_destino?: Record<string, unknown>;
  clinica: Record<string, unknown>;
  historico_clinico?: Record<string, unknown>;
  avaliacao?: Record<string, unknown>;
  plano_tratamento?: Record<string, unknown>;
  evolucoes?: unknown[];
  resumo_tratamento?: string;
  conduta_sugerida?: string;
  recomendacoes?: string;
  data_emissao: string;
  urgencia?: string;
  relatorio_feito?: boolean;
  relatorio_enviado?: boolean;
}

export interface ConvenioReportRecord {
  id: string;
  patientId?: string;
  paciente: Record<string, unknown>;
  profissional: Record<string, unknown>;
  convenio: Record<string, unknown>;
  clinica: Record<string, unknown>;
  atendimentos: unknown[];
  observacoes?: string;
  evolucao?: string;
  prognostico?: string;
  conduta?: string;
  data_emissao: string;
}

export interface PublicBookingProfile {
  id: string;
  user_id: string;
  full_name: string;
  specialty?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  slug: string;
  organization_id?: string | null;
}

export interface PublicBookingRequestResult {
  id: string;
  status: string;
  created_at: string;
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

export const reportsApi = {
  medicalTemplates: {
    list: () => request<{ data: MedicalReportTemplateRecord[] }>('/api/reports/medical-templates'),
    create: (data: Partial<MedicalReportTemplateRecord>) =>
      request<{ data: MedicalReportTemplateRecord }>('/api/reports/medical-templates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<MedicalReportTemplateRecord>) =>
      request<{ data: MedicalReportTemplateRecord }>(`/api/reports/medical-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/reports/medical-templates/${id}`, { method: 'DELETE' }),
  },
  medical: {
    list: () => request<{ data: MedicalReportRecord[] }>('/api/reports/medical'),
    create: (data: Partial<MedicalReportRecord> & Record<string, unknown>) =>
      request<{ data: MedicalReportRecord }>('/api/reports/medical', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<MedicalReportRecord> & Record<string, unknown>) =>
      request<{ data: MedicalReportRecord }>(`/api/reports/medical/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/reports/medical/${id}`, { method: 'DELETE' }),
  },
  convenio: {
    list: () => request<{ data: ConvenioReportRecord[] }>('/api/reports/convenio'),
    create: (data: Partial<ConvenioReportRecord> & Record<string, unknown>) =>
      request<{ data: ConvenioReportRecord }>('/api/reports/convenio', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<ConvenioReportRecord> & Record<string, unknown>) =>
      request<{ data: ConvenioReportRecord }>(`/api/reports/convenio/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/reports/convenio/${id}`, { method: 'DELETE' }),
  },
};

export const publicBookingApi = {
  getProfile: (slug: string) =>
    requestPublic<{ data: PublicBookingProfile }>(`/api/public/booking/${encodeURIComponent(slug)}`),
  create: (data: {
    slug: string;
    date: string;
    time: string;
    patient: {
      name: string;
      email?: string;
      phone: string;
      notes?: string;
    };
  }) =>
    requestPublic<{ data: PublicBookingRequestResult; success: boolean }>('/api/public/booking', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ===== API EXERCISE VIDEOS =====
export const exerciseVideosApi = {
  list: (params?: { category?: string; difficulty?: string; bodyPart?: string; equipment?: string; search?: string }) => {
    const qs = params ? new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v != null) as [string, string][])).toString() : '';
    return request<{ data: import('@/services/exerciseVideos').ExerciseVideo[] }>(`/api/exercise-videos${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) =>
    request<{ data: import('@/services/exerciseVideos').ExerciseVideo }>(`/api/exercise-videos/${id}`),
  byExercise: (exerciseId: string) =>
    request<{ data: import('@/services/exerciseVideos').ExerciseVideo[] }>(`/api/exercise-videos/by-exercise/${encodeURIComponent(exerciseId)}`),
  create: (data: Record<string, unknown>) =>
    request<{ data: import('@/services/exerciseVideos').ExerciseVideo }>('/api/exercise-videos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    request<{ data: import('@/services/exerciseVideos').ExerciseVideo }>(`/api/exercise-videos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ data: import('@/services/exerciseVideos').ExerciseVideo }>(`/api/exercise-videos/${id}`, {
      method: 'DELETE',
    }),
};

// ===== TIME ENTRIES =====
export const timeEntriesApi = {
  list: (params: { userId?: string; startDate?: string; endDate?: string; patientId?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params.userId) qs.set('userId', params.userId);
    if (params.startDate) qs.set('startDate', params.startDate);
    if (params.endDate) qs.set('endDate', params.endDate);
    if (params.patientId) qs.set('patientId', params.patientId);
    if (params.limit) qs.set('limit', String(params.limit));
    return request<{ data: import('@/types/timetracking').TimeEntry[] }>(`/api/time-entries?${qs}`);
  },
  create: (data: Record<string, unknown>) =>
    request<{ data: import('@/types/timetracking').TimeEntry }>('/api/time-entries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    request<{ data: import('@/types/timetracking').TimeEntry }>(`/api/time-entries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/time-entries/${id}`, { method: 'DELETE' }),
  stats: (params: { userId?: string; startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams();
    if (params.userId) qs.set('userId', params.userId);
    if (params.startDate) qs.set('startDate', params.startDate);
    if (params.endDate) qs.set('endDate', params.endDate);
    return request<{ data: { total_seconds: string; billable_seconds: string; non_billable_seconds: string; entries_count: string; total_value: string } }>(`/api/time-entries/stats?${qs}`);
  },
  getTimerDraft: (userId: string) =>
    request<{ data: import('@/types/timetracking').ActiveTimer | null }>(`/api/time-entries/timer-draft/${encodeURIComponent(userId)}`),
  saveTimerDraft: (userId: string, timer: import('@/types/timetracking').ActiveTimer) =>
    request<{ ok: boolean }>(`/api/time-entries/timer-draft/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify({ timer }),
    }),
  clearTimerDraft: (userId: string) =>
    request<{ ok: boolean }>(`/api/time-entries/timer-draft/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
};

// ===== EXERCISE SESSIONS =====
export interface ExerciseSessionRow {
  id: string;
  patient_id?: string;
  exercise_id?: string;
  exercise_type?: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  repetitions: number;
  completed: boolean;
  metrics: Record<string, number>;
  posture_issues_summary: Record<string, number>;
  created_at: string;
}

export interface ExerciseSessionStats {
  total_sessions: string;
  total_reps: string;
  avg_score: string;
  last_session?: string;
}

export interface AIClinicalReport {
  summary: string;
  technical_analysis: string;
  patient_summary: string;
  confidence_overall_0_100: number;
  key_findings: Array<{ text: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW' }>;
  metrics_table_markdown: string;
  improvements: string[];
  still_to_improve: string[];
  suggested_exercises: Array<{
    name: string;
    sets: string;
    reps: string;
    goal: string;
    progression: string;
    regression: string;
  }>;
  limitations: string[];
  red_flags_generic: string[];
  disclaimer: string;
}

export interface AITreatmentAssistantResult {
  suggestion?: string;
}

export interface AISessionTranscriptionResult {
  soapData: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

export interface AIDocumentAnalysisResult {
  extractedData: Record<string, unknown>;
  classification?: Record<string, unknown> | null;
  summary?: Record<string, unknown> | null;
  comparison?: Record<string, unknown> | null;
  translation?: Record<string, unknown> | null;
  tags?: Array<Record<string, unknown>>;
}

export interface DicomStudyRecord {
  [tag: string]: unknown;
}

export const exerciseSessionsApi = {
  list: (params: { patientId?: string; exerciseId?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params.patientId) qs.set('patientId', params.patientId);
    if (params.exerciseId) qs.set('exerciseId', params.exerciseId);
    if (params.limit) qs.set('limit', String(params.limit));
    return request<{ data: ExerciseSessionRow[] }>(`/api/exercise-sessions?${qs}`);
  },
  create: (data: Omit<ExerciseSessionRow, 'id' | 'created_at'>) =>
    request<{ data: ExerciseSessionRow }>('/api/exercise-sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  stats: (patientId: string) =>
    request<{ data: ExerciseSessionStats }>(`/api/exercise-sessions/stats/${encodeURIComponent(patientId)}`),
};

// ===== AI =====
export const aiApi = {
  service: <TInput extends Record<string, unknown>, TOutput>(action: string, data: TInput) =>
    request<{ data: TOutput }>('/api/ai/service', {
      method: 'POST',
      body: JSON.stringify({ action, data }),
    }),

  fastProcessing: (data: { text: string; mode?: string }) =>
    request<{ data: { result: string } }>('/api/ai/fast-processing', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  transcribeAudio: (data: { audioData?: string; audio?: string; mimeType?: string; languageCode?: string; context?: string }) =>
    request<{ data: { transcription: string; confidence?: number } }>('/api/ai/transcribe-audio', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  transcribeSession: (data: { audioData?: string; patientId?: string; hintText?: string }) =>
    request<{ data: AISessionTranscriptionResult }>('/api/ai/transcribe-session', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  treatmentAssistant: (data: { patientId: string; action: string; context?: string }) =>
    request<{ data: AITreatmentAssistantResult }>('/api/ai/treatment-assistant', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  clinicalReport: (data: { metrics: Record<string, unknown>; history?: Record<string, unknown> }) =>
    request<{ data: AIClinicalReport }>('/api/ai/analysis', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  formSuggestions: (data: { context: string }) =>
    request<{ data: { suggestions: string[] } }>('/api/ai/form-suggestions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  documentAnalyze: (data: Record<string, unknown>) =>
    request<{ data: AIDocumentAnalysisResult }>('/api/ai/document/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  documentClassify: (data: { text: string; fileUrl?: string }) =>
    request<{ data: Record<string, unknown> }>('/api/ai/document/classify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  documentSummarize: (data: { text: string; documentType?: string }) =>
    request<{ data: Record<string, unknown> }>('/api/ai/document/summarize', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  documentTranslate: (data: { text: string; targetLanguage: string }) =>
    request<{ data: Record<string, unknown> }>('/api/ai/document/translate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  documentCompare: (data: { currentText: string; patientId: string; documentType?: string }) =>
    request<{ data: Record<string, unknown> }>('/api/ai/document/compare', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  documentPdf: (data: Record<string, unknown>) =>
    request<{ data: { url: string | null; generated: boolean } }>('/api/ai/document/pdf', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  executiveSummary: (data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>('/api/ai/executive-summary', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  movementVideo: (data: { videoUrl: string; exerciseName?: string }) =>
    request<{ data: { analysis: { reps: number; score: number; errors: string[]; feedback: string; isValidExercise: boolean } } }>('/api/ai/movement-video', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ===== DICOM =====
export const dicomApi = {
  studies: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(Object.entries(params ?? {})).toString();
    return request<{ data: DicomStudyRecord[] }>(`/api/dicom/studies${qs ? `?${qs}` : ''}`);
  },
  series: (studyUid: string) =>
    request<{ data: DicomStudyRecord[] }>(`/api/dicom/studies/${encodeURIComponent(studyUid)}/series`),
  instances: (studyUid: string, seriesUid: string) =>
    request<{ data: DicomStudyRecord[] }>(`/api/dicom/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/instances`),
  uploadInstances: (files: Array<{ body: string; fileName: string }>) =>
    Promise.all(
      files.map((file) =>
        request<{ data: unknown }>('/api/dicom/instances', {
          method: 'POST',
          body: JSON.stringify(file),
        }),
      ),
    ),
  getWadoUrl: () => `${BASE_URL}/api/dicom/wado`,
};

// ===== HEALTH CHECK =====
export const healthApi = {
  check: () =>
    request<{ status: string; environment: string; timestamp: string; version: string }>(
      '/api/health',
    ),
};

// ===== TAREFAS =====
export interface TarefaRow {
  id: string; organization_id: string; created_by: string; responsavel_id: string | null;
  project_id: string | null; parent_id: string | null; titulo: string; descricao: string | null;
  status: string; prioridade: string; tipo: string; data_vencimento: string | null;
  start_date: string | null; completed_at: string | null; order_index: number;
  tags: string[]; checklists: unknown[]; attachments: unknown[]; references: unknown[];
  dependencies: unknown[]; created_at: string; updated_at: string;
}
export const tarefasApi = {
  list: (params?: { projectId?: string }) => {
    const qs = params?.projectId ? `?projectId=${encodeURIComponent(params.projectId)}` : '';
    return request<{ data: TarefaRow[] }>(`/api/tarefas${qs}`);
  },
  create: (data: Record<string, unknown>) =>
    request<{ data: TarefaRow }>('/api/tarefas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    request<{ data: TarefaRow }>(`/api/tarefas/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/tarefas/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  bulk: (updates: Array<{ id: string; status?: string; order_index?: number }>) =>
    request<{ ok: boolean }>('/api/tarefas/bulk', { method: 'POST', body: JSON.stringify({ updates }) }),
};

// ===== INVITATIONS =====
export interface InvitationRow {
  id: string; organization_id: string; email: string; role: string; token: string;
  invited_by: string; expires_at: string; used_at: string | null; created_at: string;
}
export const invitationsApi = {
  list: () => request<{ data: InvitationRow[] }>('/api/invitations'),
  create: (data: { email: string; role: string }) =>
    request<{ data: InvitationRow }>('/api/invitations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { email?: string; role?: string; expires_at?: string }) =>
    request<{ data: InvitationRow }>(`/api/invitations/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/invitations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  validate: (token: string) =>
    request<{ data: InvitationRow }>(`/api/invitations/validate/${encodeURIComponent(token)}`),
  use: (token: string) =>
    request<{ data: InvitationRow }>(`/api/invitations/use/${encodeURIComponent(token)}`, { method: 'POST' }),
};

// ===== SATISFACTION SURVEYS =====
export interface SatisfactionSurveyRow {
  id: string; organization_id: string; patient_id: string; appointment_id: string | null;
  therapist_id: string | null; nps_score: number | null; q_care_quality: number | null;
  q_professionalism: number | null; q_facility_cleanliness: number | null;
  q_scheduling_ease: number | null; q_communication: number | null;
  comments: string | null; suggestions: string | null; sent_at: string;
  responded_at: string | null; response_time_hours: number | null;
  created_at: string; updated_at: string;
}
export interface SurveyStatsRow {
  total: number; responded_count: number; response_rate: number; nps: number;
  promotores: number; neutros: number; detratores: number;
  avg_nps: number; avg_care_quality: number; avg_professionalism: number; avg_communication: number;
}
export const satisfactionSurveysApi = {
  list: (params?: { patientId?: string; therapistId?: string; startDate?: string; endDate?: string; responded?: boolean }) => {
    const qs = new URLSearchParams(Object.entries(params ?? {}).filter(([,v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
    return request<{ data: SatisfactionSurveyRow[] }>(`/api/satisfaction-surveys${qs ? `?${qs}` : ''}`);
  },
  stats: () => request<{ data: SurveyStatsRow }>('/api/satisfaction-surveys/stats'),
  create: (data: Record<string, unknown>) =>
    request<{ data: SatisfactionSurveyRow }>('/api/satisfaction-surveys', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    request<{ data: SatisfactionSurveyRow }>(`/api/satisfaction-surveys/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/satisfaction-surveys/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

// ===== WEARABLES =====
export interface WearableDataRow {
  id: string; organization_id: string; patient_id: string; source: string;
  data_type: string; value: number; unit: string | null; timestamp: string; created_at: string;
}
export const wearablesApi = {
  list: (params?: { patientId?: string; dataType?: string; source?: string; limit?: number }) => {
    const qs = new URLSearchParams(Object.entries(params ?? {}).filter(([,v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
    return request<{ data: WearableDataRow[] }>(`/api/wearables${qs ? `?${qs}` : ''}`);
  },
  create: (data: Record<string, unknown>) =>
    request<{ data: WearableDataRow }>('/api/wearables', { method: 'POST', body: JSON.stringify(data) }),
  bulk: (entries: Record<string, unknown>[]) =>
    request<{ data: WearableDataRow[] }>('/api/wearables/bulk', { method: 'POST', body: JSON.stringify({ entries }) }),
};

// ===== DOCUMENT SIGNATURES =====
export interface DocumentSignatureRow {
  id: string; document_id: string; document_type: string; document_title: string;
  signer_name: string; signer_id: string | null; signature_hash: string;
  ip_address: string | null; user_agent: string | null; signed_at: string; created_at: string;
}
export const documentSignaturesApi = {
  list: (documentId?: string) => {
    const qs = documentId ? `?documentId=${encodeURIComponent(documentId)}` : '';
    return request<{ data: DocumentSignatureRow[] }>(`/api/document-signatures${qs}`);
  },
  create: (data: { document_id: string; document_type: string; document_title: string; signer_name: string; signer_id?: string; signature_image: string; signature_hash: string }) =>
    request<{ data: DocumentSignatureRow }>('/api/document-signatures', { method: 'POST', body: JSON.stringify(data) }),
  verify: (documentId: string, hash: string) =>
    request<{ data: { valid: boolean; signature: DocumentSignatureRow | null } }>(
      `/api/document-signatures/verify?documentId=${encodeURIComponent(documentId)}&hash=${encodeURIComponent(hash)}`
    ),
};

// ===== TREATMENT CYCLES =====
export interface TreatmentCycleRow {
  id: string; patient_id: string; therapist_id: string | null; title: string;
  description: string | null; status: string; start_date: string | null; end_date: string | null;
  goals: unknown[]; metadata: Record<string, unknown>; created_at: string; updated_at: string;
}
export const treatmentCyclesApi = {
  list: (patientId?: string) => {
    const qs = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
    return request<{ data: TreatmentCycleRow[] }>(`/api/treatment-cycles${qs}`);
  },
  create: (data: Record<string, unknown>) =>
    request<{ data: TreatmentCycleRow }>('/api/treatment-cycles', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    request<{ data: TreatmentCycleRow }>(`/api/treatment-cycles/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/treatment-cycles/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

// ===== EVOLUTION VERSIONS =====
export interface EvolutionVersionRow {
  id: string; soap_record_id: string; saved_by: string; change_type: string;
  content: Record<string, unknown>; saved_at: string;
}
export const evolutionVersionsApi = {
  list: (soapRecordId: string) =>
    request<{ data: EvolutionVersionRow[] }>(`/api/evolution-versions?soapRecordId=${encodeURIComponent(soapRecordId)}`),
  create: (data: { soap_record_id: string; change_type?: string; content: Record<string, unknown> }) =>
    request<{ data: EvolutionVersionRow }>('/api/evolution-versions', { method: 'POST', body: JSON.stringify(data) }),
};

// ===== EXERCISE PLANS =====
export interface ExercisePlanRow {
  id: string; patient_id: string; created_by: string; name: string; description: string | null;
  status: string; start_date: string | null; end_date: string | null;
  created_at: string; updated_at: string; items?: ExercisePlanItemRow[];
}
export interface ExercisePlanItemRow {
  id: string; plan_id: string; exercise_id: string | null; order_index: number;
  sets: number | null; repetitions: number | null; duration: number | null; notes: string | null;
  created_at: string; updated_at: string;
}
export const exercisePlansApi = {
  list: (patientId?: string) => {
    const qs = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
    return request<{ data: ExercisePlanRow[] }>(`/api/exercise-plans${qs}`);
  },
  create: (data: Record<string, unknown>) =>
    request<{ data: ExercisePlanRow }>('/api/exercise-plans', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    request<{ data: ExercisePlanRow }>(`/api/exercise-plans/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/exercise-plans/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  addItem: (planId: string, item: Record<string, unknown>) =>
    request<{ data: ExercisePlanItemRow }>(`/api/exercise-plans/${encodeURIComponent(planId)}/items`, { method: 'POST', body: JSON.stringify(item) }),
};
