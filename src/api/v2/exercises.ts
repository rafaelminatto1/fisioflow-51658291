import { request } from "./base";
import { getNeonAccessToken } from "@/lib/auth/neon-token";
import type {
  Exercise,
  ExerciseImageAnalysisResult,
  ExerciseCategory,
  PaginatedResponse,
  ExerciseTemplateRecord,
  Protocol,
  ExerciseTemplate,
  ExerciseTemplateItem,
} from "@/types/workers";

export const exercisesApi = {
  categories: () => request<{ data: ExerciseCategory[] }>("/api/exercises/categories"),

  list: (params?: {
    q?: string;
    category?: string;
    difficulty?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return request<PaginatedResponse<Exercise>>(`/api/exercises${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => request<{ data: Exercise }>(`/api/exercises/${id}`),

  searchSemantic: (q: string, limit: number = 10) =>
    request<{ data: (Exercise & { similarity: number })[] }>(
      `/api/exercises/search/semantic?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),

  favorite: (id: string) =>
    request<{ ok: boolean }>(`/api/exercises/${id}/favorite`, {
      method: "POST",
    }),

  unfavorite: (id: string) =>
    request<{ ok: boolean }>(`/api/exercises/${id}/favorite`, {
      method: "DELETE",
    }),

  myFavorites: () => request<{ data: Exercise[] }>("/api/exercises/favorites/me"),

  create: (data: Omit<Exercise, "id" | "slug">) =>
    request<{ data: Exercise }>("/api/exercises", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Exercise>) =>
    request<{ data: Exercise }>(`/api/exercises/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/exercises/${id}`, {
      method: "DELETE",
    }),

  analyzeImage: async (imageUrl: string) => {
    const token = await getNeonAccessToken();
    const apiBase = (import.meta.env.VITE_EXERCISE_ANALYSIS_API_URL ?? "").replace(/\/$/, "");
    if (!apiBase) {
      throw new Error("VITE_EXERCISE_ANALYSIS_API_URL não configurada");
    }
    const response = await fetch(`${apiBase}/api/exercises/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      throw new Error("Failed to analyze exercise");
    }

    return response.json() as Promise<ExerciseImageAnalysisResult>;
  },
};

export const exerciseTemplatesApi = {
  list: (params?: { q?: string; category?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, value]) => value != null)
          .map(([key, value]) => [key, String(value)]),
      ),
    ).toString();
    return request<{
      data: ExerciseTemplateRecord[];
      meta?: { page: number; limit: number; total: number; pages: number };
    }>(`/api/templates${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) =>
    request<{ data: ExerciseTemplateRecord }>(`/api/templates/${encodeURIComponent(id)}`),
  create: (data: Partial<ExerciseTemplateRecord>) =>
    request<{ data: ExerciseTemplateRecord }>("/api/templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ExerciseTemplateRecord>) =>
    request<{ data: ExerciseTemplateRecord }>(`/api/templates/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/templates/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};

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
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return request<PaginatedResponse<Protocol>>(`/api/protocols${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) =>
    request<{ data: Protocol & { protocolExercises: unknown[] } }>(`/api/protocols/${id}`),

  create: (data: Omit<Protocol, "id"> & Record<string, unknown>) =>
    request<{ data: Protocol }>("/api/protocols", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Protocol> & Record<string, unknown>) =>
    request<{ data: Protocol }>(`/api/protocols/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/api/protocols/${id}`, {
      method: "DELETE",
    }),
};

export const exercisePlansApi = {
  list: (params: { patientId: string }) =>
    request<{ data: Array<Record<string, unknown>> }>(
      `/api/exercise-plans?patientId=${encodeURIComponent(params.patientId)}`,
    ),
  create: (data: {
    patient_id: string;
    template_id?: string;
    name: string;
    notes?: string;
    items: Array<Record<string, unknown>>;
  }) =>
    request<{ data: Record<string, unknown> }>("/api/exercise-plans", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/exercise-plans/${id}`, {
      method: "DELETE",
    }),
};

export const templatesApi = {
  list: (params?: {
    q?: string;
    category?: string;
    patientProfile?: string;
    templateType?: "system" | "custom";
    isDraft?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return request<PaginatedResponse<ExerciseTemplate>>(`/api/templates${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) =>
    request<{ data: ExerciseTemplate & { items: ExerciseTemplateItem[] } }>(`/api/templates/${id}`),

  create: (
    data: Omit<ExerciseTemplate, "id"> & {
      items: Array<Record<string, unknown>>;
    },
  ) =>
    request<{ data: ExerciseTemplate & { items: ExerciseTemplateItem[] } }>("/api/templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: Partial<ExerciseTemplate> & {
      items?: Array<Record<string, unknown>>;
    },
  ) =>
    request<{ data: ExerciseTemplate & { items: ExerciseTemplateItem[] } }>(
      `/api/templates/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    ),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/templates/${id}`, {
      method: "DELETE",
    }),

  categories: () =>
    request<{
      data: Array<{ id: string; label: string; icon: string | null; orderIndex: number }>;
    }>("/api/templates/categories"),

  apply: (
    id: string,
    data: {
      patientId: string;
      startDate: string;
      surgeryId?: string;
      notes?: string;
    },
  ) =>
    request<{ data: { planId: string; patientId: string; exerciseCount: number } }>(
      `/api/templates/${encodeURIComponent(id)}/apply`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  customize: (id: string, data?: { name?: string }) =>
    request<{ data: ExerciseTemplate }>(`/api/templates/${encodeURIComponent(id)}/customize`, {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    }),
};
