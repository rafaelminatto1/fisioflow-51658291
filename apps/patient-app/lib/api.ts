import { authClient } from "./neonAuth";
import { log } from "./logger";
import {
  PatientProfile,
  Therapist,
  Appointment,
  ExerciseAssignment,
  Notification,
  PatientProgress,
  PatientStats,
  GamificationProfile,
  Conversation,
  Message,
  Achievement,
  Quest,
  ShopItem,
  TelemedicineRoom,
} from "@/types/api";
import { Mappers } from "./mappers";

// CANONICAL API DOMAIN (Migração Neon/Cloudflare 2026)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.moocafisio.com.br"; // Novo domínio unificado (Hono/Cloudflare)

const PATIENT_PORTAL_PREFIX = "/api/patient-portal";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

type PatientSessionResponse = {
  data?: {
    session?: {
      token?: string;
    };
    token?: string;
  };
};

type SessionFetchContext = {
  response?: {
    headers?: {
      get?: (name: string) => string | null;
    };
  };
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function extractPayload<T>(payload: unknown): T {
  if (isPlainObject(payload) && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
}

async function getNeonAccessToken(): Promise<string> {
  try {
    const session = await authClient.getSession();
    const sessionData = session as PatientSessionResponse | null | undefined;
    const token = sessionData?.data?.session?.token || sessionData?.data?.token;

    if (typeof token === "string" && token.trim()) {
      return token;
    }
  } catch {
    // fallback below
  }

  const token = await new Promise<string | null>((resolve) => {
    Promise.resolve(
      authClient.getSession({
        fetchOptions: {
          onSuccess: (ctx: SessionFetchContext) => {
            const jwt = ctx.response?.headers?.get?.("set-auth-jwt");
            resolve(typeof jwt === "string" && jwt.trim() ? jwt : null);
          },
          onError: () => resolve(null),
        },
      }),
    ).catch(() => resolve(null));
  });

  if (!token) {
    throw new Error("Token JWT do Neon Auth indisponível.");
  }

  return token;
}

export const api = {
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    try {
      const token = await getNeonAccessToken();
      const url = new URL(`${API_BASE_URL}${endpoint}`);

      if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") return;
          url.searchParams.append(key, String(value));
        });
      }

      const headers = new Headers(options.headers ?? {});
      headers.set("Authorization", `Bearer ${token}`);

      if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(url.toString(), {
        ...options,
        headers,
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          (isPlainObject(json) && typeof json.error === "string" && json.error) ||
          (isPlainObject(json) && typeof json.message === "string" && json.message) ||
          `API Error: ${response.status}`;
        throw new Error(message);
      }

      return extractPayload<T>(json);
    } catch (error) {
      log.error("API_REQUEST", `Error in ${endpoint}`, error);
      throw error;
    }
  },

  get<T>(endpoint: string, params?: RequestOptions["params"]) {
    return this.request<T>(endpoint, { method: "GET", params });
  },

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  },
};

export const patientApi = {
  bootstrapProfile: async (data: Record<string, unknown>): Promise<PatientProfile> => {
    const response = await api.post<any>(`${PATIENT_PORTAL_PREFIX}/bootstrap`, data);
    return Mappers.patientProfile(response);
  },
  getProfile: async (): Promise<PatientProfile> => {
    const response = await api.get<any>(`${PATIENT_PORTAL_PREFIX}/profile`);
    return Mappers.patientProfile(response);
  },
  updateProfile: async (data: Record<string, unknown>): Promise<PatientProfile> => {
    const response = await api.patch<any>(`${PATIENT_PORTAL_PREFIX}/profile`, data);
    return Mappers.patientProfile(response);
  },
  getTherapists: async (search?: string): Promise<Therapist[]> => {
    const response = await api.get<any[]>(
      `${PATIENT_PORTAL_PREFIX}/therapists`,
      search ? { search } : undefined,
    );
    return response.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      avatarUrl: t.avatar_url,
      specialty: t.specialty,
      clinicName: t.clinic_name,
    }));
  },
  linkProfessional: async (professionalId: string): Promise<{ success: boolean }> =>
    api.post<{ success: boolean }>(`${PATIENT_PORTAL_PREFIX}/link-professional`, {
      professional_id: professionalId,
    }),
  getAppointments: async (upcoming?: boolean): Promise<Appointment[]> => {
    const response = await api.get<any[]>(
      `${PATIENT_PORTAL_PREFIX}/appointments`,
      upcoming ? { upcoming: true } : undefined,
    );
    return response.map((a) => Mappers.appointment(a));
  },
  confirmAppointment: (id: string) =>
    api.post<{ success: boolean }>(`${PATIENT_PORTAL_PREFIX}/appointments/${id}/confirm`, {}),
  cancelAppointment: (id: string, reason?: string) =>
    api.post<{ success: boolean }>(`${PATIENT_PORTAL_PREFIX}/appointments/${id}/cancel`, {
      reason,
    }),
  getExercises: async (): Promise<ExerciseAssignment[]> => {
    const response = await api.get<any[]>(`${PATIENT_PORTAL_PREFIX}/exercises`);
    return response.map((e) => Mappers.exerciseAssignment(e));
  },
  completeExercise: (assignmentId: string, data: Record<string, unknown>) =>
    api.post<{ success: boolean }>(
      `${PATIENT_PORTAL_PREFIX}/exercises/${assignmentId}/complete`,
      data,
    ),
  getNotifications: async (): Promise<Notification[]> => {
    const response = await api.get<any[]>(`${PATIENT_PORTAL_PREFIX}/notifications`);
    return response.map((n) => Mappers.notification(n));
  },
  markNotificationRead: (id: string) =>
    api.post<{ success: boolean }>(`${PATIENT_PORTAL_PREFIX}/notifications/${id}/read`, {}),
  markAllNotificationsRead: () =>
    api.post<{ success: boolean }>(`${PATIENT_PORTAL_PREFIX}/notifications/read-all`, {}),
  getProgress: async (): Promise<PatientProgress> => {
    const response = await api.get<{ evolutions: any[]; reports: any[] }>(
      `${PATIENT_PORTAL_PREFIX}/progress`,
    );
    return {
      evolutions: response.evolutions.map((e) => Mappers.evolution(e)),
      reports: response.reports.map((r) => ({
        id: r.id,
        date: r.date,
        title: r.title,
        summary: r.summary,
        fileUrl: r.file_url,
      })),
    };
  },
  getStats: (): Promise<PatientStats> => api.get<PatientStats>(`${PATIENT_PORTAL_PREFIX}/stats`),
};

export const gamificationApi = {
  getProfile: async (): Promise<GamificationProfile> => {
    const response = await api.get<any>("/api/gamification/profile");
    const data = response.data || response;
    return {
      id: data.id,
      patientId: data.patient_id,
      level: data.level,
      xp: data.current_xp,
      nextLevelXp: data.next_level_xp ?? 1000,
      streak: data.current_streak,
      badges: (data.badges || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        imageUrl: b.image_url,
        unlockedAt: b.unlocked_at,
      })),
    };
  },
  getAchievements: async (): Promise<Achievement[]> => {
    const response = await api.get<any>("/api/gamification/achievements");
    return (response.data || []).map((a: any) => ({
      id: a.id,
      code: a.code,
      title: a.title,
      description: a.description,
      xpReward: a.xp_reward,
      icon: a.icon,
      category: a.category,
      unlockedAt: a.unlocked_at,
    }));
  },
  getQuests: async (): Promise<Quest[]> => {
    const response = await api.get<any>("/api/gamification/quests");
    return (response.data || []).map((q: any) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      xpReward: q.xp_reward,
      status: q.status,
    }));
  },
  getShop: async (): Promise<ShopItem[]> => {
    const response = await api.get<any>("/api/gamification/shop");
    return (response.data || []).map((s: any) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description,
      cost: s.cost,
      type: s.type,
      icon: s.icon,
      isUnlocked: s.is_unlocked,
    }));
  },
  buyItem: (itemId: string) => api.post<any>("/api/gamification/buy", { itemId }),
  awardXp: (payload: { patientId: string; amount: number; reason: string; description?: string }) =>
    api.post<any>("/api/gamification/award-xp", payload),
};

export const notificationsApi = {
  registerFcmToken: (payload: {
    token: string;
    userId: string;
    tenantId?: string;
    deviceInfo?: Record<string, unknown>;
    active?: boolean;
  }) => api.post<any>("/api/fcm-tokens", payload),
  deactivateFcmToken: (token: string) =>
    api.delete<any>(`/api/fcm-tokens/${encodeURIComponent(token)}`),
};

export const mediaApi = {
  getUploadUrl: (payload: { filename: string; contentType: string; folder?: string }) =>
    api.post<{ uploadUrl: string; publicUrl: string; key: string; expiresIn: number }>(
      "/api/media/upload-url",
      payload,
    ),
};

export const messagingApi = {
  getConversations: async (): Promise<Conversation[]> => {
    const response = await api.get<any[]>("/api/messaging/conversations");
    return response.map((c) => Mappers.conversation(c));
  },
  getMessages: async (participantId: string, limit?: number): Promise<Message[]> => {
    const response = await api.get<any[]>(
      `/api/messaging/conversations/${participantId}/messages`,
      { limit },
    );
    return response.map((m) => Mappers.message(m));
  },
  sendMessage: (payload: {
    recipientId: string;
    content: string;
    type?: string;
    attachmentUrl?: string;
    attachmentName?: string;
  }) => api.post<any>("/api/messaging/messages", payload),
  markConversationRead: (participantId: string) =>
    api.post<{ success: boolean }>(`/api/messaging/conversations/${participantId}/read`, {}),
};

// ============================================================
// TELEMEDICINE API
// ============================================================

export const telemedicineApi = {
  getRooms: async (): Promise<TelemedicineRoom[]> => {
    const response = await api.get<any[]>("/api/telemedicine/rooms");
    return response.map((r) => ({
      id: r.id,
      room_code: r.room_code,
      status: r.status,
      meeting_url: r.meeting_url,
      started_at: r.started_at,
      ended_at: r.ended_at,
      created_at: r.created_at,
    }));
  },
};

export function getApiBaseUrl() {
  return API_BASE_URL;
}
