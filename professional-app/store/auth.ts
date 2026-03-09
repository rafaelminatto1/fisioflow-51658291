import { create } from 'zustand';
import { authApi, AuthResponse } from '@/lib/auth-api';
import { auditLogger } from '@/lib/services/auditLogger';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'professional' | 'admin' | 'fisioterapeuta';
  clinicId?: string;
  organizationId?: string;
  avatarUrl?: string;
  specialty?: string;
  crefito?: string;
  phone?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  isLocked: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  initialize: () => void;
  updateUserData: (data: Partial<User>) => void;
  lockSession: () => void;
  unlockSession: () => Promise<void>;
  clearSession: () => void;
}

export const unlockSessionWithPIN = async (pin: string) => {
  // Global helper or state action
  return true;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  isLocked: false,

  signIn: async (email: string, password: string) => {
    console.log('[Auth] Tentando fazer login com:', email);
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(email, password);
      console.log('[Auth] Login bem-sucedido. UID:', response.user.id);

      const userRole = response.user.role;
      if (userRole !== 'professional' && userRole !== 'fisioterapeuta' && userRole !== 'admin') {
        await authApi.logout();
        throw new Error('Acesso restrito a profissionais');
      }

      const user: User = {
        id: response.user.id,
        email: response.user.email || '',
        name: response.user.name || 'Profissional',
        role: userRole as any,
        clinicId: response.user.clinicId,
        organizationId: response.user.organizationId || 'org-default',
        avatarUrl: response.user.avatarUrl,
        specialty: response.user.specialty,
        crefito: response.user.crefito,
      };

      console.log('[Auth] Login completo. Usuario:', user);
      
      // Log audit event
      await auditLogger.logLogin(user.id);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('[Auth] Erro no login:', error);
      set({ error: error.message || 'Erro ao fazer login', isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    const currentUser = get().user;
    set({ isLoading: true });
    try {
      if (currentUser) {
        await auditLogger.logLogout(currentUser.id);
      }
      await authApi.logout();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  updateUserData: (data: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      set({
        user: {
          ...currentUser,
          ...data,
        },
      });
    }
  },

  lockSession: () => set({ isLocked: true }),
  unlockSession: async () => set({ isLocked: false }),
  clearSession: () => set({ isLocked: false, isAuthenticated: false, user: null }),

  initialize: async () => {
    set({ isLoading: true });
    try {
      const userData = await authApi.getMe();
      
      const userRole = userData.role;
      if (userRole !== 'professional' && userRole !== 'fisioterapeuta' && userRole !== 'admin') {
        await authApi.logout();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      const user: User = {
        id: userData.id,
        email: userData.email || '',
        name: userData.name || 'Profissional',
        role: userRole as any,
        clinicId: userData.clinicId,
        organizationId: userData.organizationId || 'org-default',
        avatarUrl: userData.avatarUrl,
        specialty: userData.specialty,
        crefito: userData.crefito,
      };

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      // Falha ao recuperar sessão, limpa tudo
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
