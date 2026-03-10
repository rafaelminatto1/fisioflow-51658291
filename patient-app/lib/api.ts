import { authClient } from './neonAuth';
import { log } from './logger';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api-paciente.moocafisio.com.br';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * REST API Client for FisioFlow
 */
export const api = {
  /**
   * Realiza uma requisição HTTP autenticada
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    try {
      const session = await authClient.getSession();
      const token = (session?.data as any)?.token || '';

      const url = new URL(`${API_BASE_URL}${endpoint}`);
      if (options.params) {
        Object.keys(options.params).forEach(key => 
          url.searchParams.append(key, options.params![key])
        );
      }

      const response = await fetch(url.toString(), {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      log.error('API_REQUEST', `Error in ${endpoint}`, error);
      throw error;
    }
  },

  get<T>(endpoint: string, params?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', params });
  },

  post<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },

  patch<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  },

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  },
};

/**
 * Endpoints específicos para o Patient App
 */
export const patientApi = {
  getProfile: () => api.get<any>('/api/patient/profile'),
  updateProfile: (data: any) => api.patch<any>('/api/patient/profile', data),
  
  getAppointments: (upcoming?: boolean) => 
    api.get<any[]>('/api/patient/appointments', upcoming ? { upcoming: 'true' } : {}),
  
  confirmAppointment: (id: string) => api.post<any>(`/api/patient/appointments/${id}/confirm`, {}),
  cancelAppointment: (id: string) => api.post<any>(`/api/patient/appointments/${id}/cancel`, {}),
  
  getExercises: () => api.get<any[]>('/api/patient/exercises'),
  completeExercise: (assignmentId: string, data: any) => 
    api.post<any>(`/api/patient/exercises/${assignmentId}/complete`, data),
    
  getNotifications: () => api.get<any[]>('/api/patient/notifications'),
  markNotificationRead: (id: string) => api.post<any>(`/api/patient/notifications/${id}/read`, {}),
};
