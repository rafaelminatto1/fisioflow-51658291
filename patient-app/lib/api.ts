import { authClient } from './neonAuth';
import { log } from './logger';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_WORKERS_API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'https://api-paciente.moocafisio.com.br';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function extractPayload<T>(payload: unknown): T {
  if (isPlainObject(payload) && 'data' in payload) {
    return payload.data as T;
  }
  return payload as T;
}

async function getNeonAccessToken(): Promise<string> {
  try {
    const session = await authClient.getSession();
    const token =
      (session as any)?.data?.session?.token ||
      (session as any)?.data?.token;

    if (typeof token === 'string' && token.trim()) {
      return token;
    }
  } catch {
    // fallback below
  }

  const token = await new Promise<string | null>((resolve) => {
    authClient.getSession({
      fetchOptions: {
        onSuccess: (ctx: any) => {
          const jwt = ctx.response?.headers?.get?.('set-auth-jwt');
          resolve(typeof jwt === 'string' && jwt.trim() ? jwt : null);
        },
        onError: () => resolve(null),
      },
    }).catch(() => resolve(null));
  });

  if (!token) {
    throw new Error('Token JWT do Neon Auth indisponível.');
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
          if (value === undefined || value === null || value === '') return;
          url.searchParams.append(key, String(value));
        });
      }

      const headers = new Headers(options.headers ?? {});
      headers.set('Authorization', `Bearer ${token}`);

      if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(url.toString(), {
        ...options,
        headers,
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          (isPlainObject(json) && typeof json.error === 'string' && json.error) ||
          (isPlainObject(json) && typeof json.message === 'string' && json.message) ||
          `API Error: ${response.status}`;
        throw new Error(message);
      }

      return extractPayload<T>(json);
    } catch (error) {
      log.error('API_REQUEST', `Error in ${endpoint}`, error);
      throw error;
    }
  },

  get<T>(endpoint: string, params?: RequestOptions['params']) {
    return this.request<T>(endpoint, { method: 'GET', params });
  },

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  },
};

export const patientApi = {
  bootstrapProfile: (data: Record<string, unknown>) =>
    api.post<any>('/api/patient/bootstrap', data),
  getProfile: () => api.get<any>('/api/patient/profile'),
  updateProfile: (data: Record<string, unknown>) =>
    api.patch<any>('/api/patient/profile', data),
  getTherapists: (search?: string) =>
    api.get<any[]>('/api/patient/therapists', search ? { search } : undefined),
  linkProfessional: (professionalId: string) =>
    api.post<any>('/api/patient/link-professional', { professional_id: professionalId }),
  getAppointments: (upcoming?: boolean) =>
    api.get<any[]>('/api/patient/appointments', upcoming ? { upcoming: true } : undefined),
  confirmAppointment: (id: string) =>
    api.post<{ success: boolean }>(`/api/patient/appointments/${id}/confirm`, {}),
  cancelAppointment: (id: string, reason?: string) =>
    api.post<{ success: boolean }>(`/api/patient/appointments/${id}/cancel`, { reason }),
  getExercises: () => api.get<any[]>('/api/patient/exercises'),
  completeExercise: (assignmentId: string, data: Record<string, unknown>) =>
    api.post<{ success: boolean }>(`/api/patient/exercises/${assignmentId}/complete`, data),
  getNotifications: () => api.get<any[]>('/api/patient/notifications'),
  markNotificationRead: (id: string) =>
    api.post<{ success: boolean }>(`/api/patient/notifications/${id}/read`, {}),
  markAllNotificationsRead: () =>
    api.post<{ success: boolean }>('/api/patient/notifications/read-all', {}),
  getProgress: () =>
    api.get<{ evolutions: any[]; reports: any[] }>('/api/patient/progress'),
  getStats: () =>
    api.get<{ totalAppointments: number; totalExercises: number; totalMonths: number }>('/api/patient/stats'),
};

export const gamificationApi = {
  getProfile: () => api.get<any>('/api/gamification/profile'),
  awardXp: (payload: { patientId: string; amount: number; reason: string; description?: string }) =>
    api.post<any>('/api/gamification/award-xp', payload),
};

export const notificationsApi = {
  registerFcmToken: (payload: {
    token: string;
    userId: string;
    tenantId?: string;
    deviceInfo?: Record<string, unknown>;
    active?: boolean;
  }) => api.post<any>('/api/fcm-tokens', payload),
  deactivateFcmToken: (token: string) => api.delete<any>(`/api/fcm-tokens/${encodeURIComponent(token)}`),
};

export const mediaApi = {
  getUploadUrl: (payload: { filename: string; contentType: string; folder?: string }) =>
    api.post<{ uploadUrl: string; publicUrl: string; key: string; expiresIn: number }>('/api/media/upload-url', payload),
};

export const messagingApi = {
  getConversations: () => api.get<any[]>('/api/messaging/conversations'),
  getMessages: (participantId: string, limit?: number) =>
    api.get<any[]>(`/api/messaging/conversations/${participantId}/messages`, { limit }),
  sendMessage: (payload: {
    recipientId: string;
    content: string;
    type?: string;
    attachmentUrl?: string;
    attachmentName?: string;
  }) => api.post<any>('/api/messaging/messages', payload),
  markConversationRead: (participantId: string) =>
    api.post<{ success: boolean }>(`/api/messaging/conversations/${participantId}/read`, {}),
};

export function getApiBaseUrl() {
  return API_BASE_URL;
}
