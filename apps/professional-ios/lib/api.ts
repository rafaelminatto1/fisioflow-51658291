import { authClient } from './neonAuth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api-profissional.moocafisio.com.br';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * REST API Client for FisioFlow Professional
 */
export const api = {
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    try {
      const session = await authClient.getSession();
      const token = session?.data?.token || '';

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
      console.error(`[API] Error in ${endpoint}:`, error);
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
 * Endpoints específicos para o App Profissional
 */
export const profApi = {
  // Pacientes
  getPatients: () => api.get<any[]>('/api/prof/patients'),
  getPatient: (id: string) => api.get<any>(`/api/prof/patients/${id}`),
  createPatient: (data: any) => api.post<any>('/api/prof/patients', data),
  updatePatient: (id: string, data: any) => api.patch<any>(`/api/prof/patients/${id}`, data),

  // Agenda
  getAppointments: (start: string, end: string) => 
    api.get<any[]>('/api/prof/appointments', { start, end }),
  getAppointment: (id: string) => api.get<any>(`/api/prof/appointments/${id}`),
  createAppointment: (data: any) => api.post<any>('/api/prof/appointments', data),
  updateAppointment: (id: string, data: any) => api.patch<any>(`/api/prof/appointments/${id}`, data),

  // Evoluções (SOAP)
  getEvolutions: (patientId: string) => api.get<any[]>(`/api/prof/patients/${patientId}/evolutions`),
  createEvolution: (data: any) => api.post<any>('/api/prof/evolutions', data),

  // Exercícios e Protocolos
  getExercises: () => api.get<any[]>('/api/prof/exercises'),
  getTemplates: () => api.get<any[]>('/api/prof/templates'),
};
