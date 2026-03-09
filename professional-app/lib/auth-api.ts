import { config } from './config';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'FISIOFLOW_AUTH_TOKEN';

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    clinicId?: string;
    organizationId?: string;
    avatarUrl?: string;
    specialty?: string;
    crefito?: string;
  };
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${config.apiUrl}/auth/login`, {
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
      } catch (e) {}
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
        // Opccionalmente notificar o backend para invalidar o token
        await fetch(`${config.apiUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
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

    const response = await fetch(`${config.apiUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
      throw new Error('Falha ao validar sessão');
    }

    return response.json();
  }
};
