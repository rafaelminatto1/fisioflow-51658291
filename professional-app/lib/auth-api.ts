import { config } from './config';
import * as SecureStore from 'expo-secure-store';

export interface AuthResponse {
  user: any;
  token: string;
}

const TOKEN_KEY = 'FISIOFLOW_AUTH_TOKEN';

// Helper for fetch with timeout
async function fetchWithTimeout(resource: string, options: any = {}) {
  const { timeout = 10000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Tempo de conexão esgotado (timeout)');
    }
    throw error;
  }
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetchWithTimeout(`${config.apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      let errorMessage = 'Erro ao fazer login';
      try {
        const data = await response.json();
        errorMessage = data.message || data.error || errorMessage;
      } catch (e) {
        // Silently fail if JSON parsing fails
      }
      throw new Error(errorMessage);
    }

    const data: AuthResponse = await response.json();
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    return data;
  },

  async logout(): Promise<void> {
    try {
      const token = await this.getToken();
      if (token) {
        // Rota de logout opcional - backend pode não implementar
        await fetchWithTimeout(`${config.apiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 5000
        }).catch(() => {});
      }
    } finally {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error reading token:', error);
      return null;
    }
  },

  async getMe(): Promise<AuthResponse['user']> {
    const token = await this.getToken();
    if (!token) throw new Error('No token found');

    const response = await fetchWithTimeout(`${config.apiUrl}/api/profile/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 8000
    });

    if (!response.ok) {
      if (response.status === 401) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
      throw new Error('Falha ao validar sessão');
    }

    const data = await response.json();
    return data.user || data;
  },

  async resetPassword(email: string): Promise<void> {
    const response = await fetch(`${config.apiUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error('Erro ao enviar email de recuperação');
    }
  },

  async updatePassword(newPassword: string): Promise<void> {
    const token = await this.getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${config.apiUrl}/api/auth/update-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ newPassword }),
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar senha');
    }
  }
};
