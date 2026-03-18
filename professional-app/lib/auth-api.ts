import { fetchApi } from './api';
import * as SecureStore from 'expo-secure-store';
import { getToken, setToken, clearToken } from './token-storage';

export interface AuthResponse {
  user: any;
  token: string;
}

interface LoginResponse {
  user?: any;
  token?: string;
  access_token?: string;
  data?: AuthResponse & { access_token?: string };
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    console.log('[Auth] ================= LOGIN INICIADO =================');
    console.log('[Auth] Email:', email);

    const data = await fetchApi<LoginResponse>('/api/auth/login', {
      method: 'POST',
      data: { email, password },
      skipAuth: true,
    });

    console.log('[Auth] Resposta completa:', JSON.stringify(data, null, 2));
    console.log('[Auth] Tipos:', {
      'data.token': typeof data.token,
      'data.user': typeof data.user,
      'data.data': typeof data.data,
      'data.data?.token': typeof data.data?.token,
    });

    // Verificar todas as possíveis localizações do token
    const possibleTokens = [
      data.token,
      data.data?.token,
      data.user?.token,
      data.access_token,
      data.data?.access_token,
    ];

    console.log('[Auth] Tokens encontrados:', possibleTokens.map(t => t ? `${t.substring(0, 15)}... (len: ${t.length})` : 'null'));

    let token = possibleTokens.find(t => t && t.length > 50); // JWTs são longos
    if (!token) {
      // Fallback: usar o primeiro token não nulo
      token = possibleTokens.find(t => t);
    }

    console.log(`[Auth] Token escolhido: ${token ? token.substring(0, 20) + '...' : 'null'} (length: ${token?.length})`);

    if (!token) {
      console.error('[Auth] Nenhum token encontrado na resposta!');
      throw new Error('Token não recebido do servidor');
    }

    // Verificar se parece um JWT
    if (token && !token.includes('.')) {
      console.warn('[Auth] ALERTA: Token não parece ser um JWT (não tem pontos!)');
    }

    await setToken(token);

    return {
      user: data.user || data.data?.user || {},
      token
    };
  },

  async logout(): Promise<void> {
    try {
      const token = await getToken();
      if (token) {
        // Rota de logout opcional - backend pode não implementar
        await fetchApi('/api/auth/logout', {
          method: 'POST',
          timeout: 5000
        }).catch(() => {});
      }
    } finally {
      await clearToken();
    }
  },

  async getToken(): Promise<string | null> {
    return getToken();
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
        await clearToken();
      }
      throw new Error('Falha ao validar sessão');
    }
  },

  async resetPassword(email: string): Promise<void> {
    await fetchApi('/api/auth/reset-password', {
      method: 'POST',
      data: { email },
      skipAuth: true,
    });
  },

  async updatePassword(newPassword: string): Promise<void> {
    await fetchApi('/api/auth/update-password', {
      method: 'POST',
      data: { newPassword },
    })
  }
};
