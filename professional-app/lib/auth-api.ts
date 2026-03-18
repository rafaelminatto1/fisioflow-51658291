import { fetchApi } from './api';
import * as SecureStore from 'expo-secure-store';

export interface AuthResponse {
  user: any;
  token: string;
}

const TOKEN_KEY = 'FISIOFLOW_AUTH_TOKEN';

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await fetchApi<AuthResponse>('/api/auth/login', {
      method: 'POST',
      data: { email, password },
    });

    console.log(`[Auth] Token recebido: ${data.token ? data.token.substring(0, 10) + '...' : 'null/undefined'} (length: ${data.token?.length})`);
    if (!data.token) {
      throw new Error('Token não recebido do servidor');
    }
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    return data;
  },

  async logout(): Promise<void> {
    try {
      const token = await this.getToken();
      if (token) {
        // Rota de logout opcional - backend pode não implementar
        await fetchApi('/api/auth/logout', {
          method: 'POST',
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
    try {
      const data = await fetchApi<any>('/api/profile/me', {
        method: 'GET',
        timeout: 8000
      });
      return data.user || data;
    } catch (err: any) {
      if (err.status === 401) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
      throw new Error('Falha ao validar sessão');
    }
  },

  async resetPassword(email: string): Promise<void> {
    await fetchApi('/api/auth/reset-password', {
      method: 'POST',
      data: { email },
    });
  },

  async updatePassword(newPassword: string): Promise<void> {
    await fetchApi('/api/auth/update-password', {
      method: 'POST',
      data: { newPassword },
    });
  }
};
