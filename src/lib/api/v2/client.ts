import { getAuth } from 'firebase/auth';

/**
 * Cliente HTTP genérico para consumir Cloud Functions V2
 * Gerencia automaticamente o token de autenticação do Firebase
 */

interface RequestOptions extends RequestInit {
  data?: any;
  token?: string;
}

class ApiClient {
  /**
   * Realiza uma requisição autenticada
   */
  async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Obter token atualizado
    const token = await user.getIdToken();

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');

    const config: RequestInit = {
      ...options,
      headers,
    };

    if (options.data) {
      config.body = JSON.stringify(options.data);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Erro na requisição: ${response.status}`);
      }

      // Se for 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`[ApiClient] Erro ao chamar ${url}:`, error);
      throw error;
    }
  }

  get<T>(url: string, options?: RequestOptions) {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  post<T>(url: string, data: any, options?: RequestOptions) {
    return this.request<T>(url, { ...options, method: 'POST', data });
  }

  put<T>(url: string, data: any, options?: RequestOptions) {
    return this.request<T>(url, { ...options, method: 'PUT', data });
  }

  delete<T>(url: string, data?: any, options?: RequestOptions) {
    return this.request<T>(url, { ...options, method: 'DELETE', data });
  }
}

export const apiClient = new ApiClient();
