import { create } from 'zustand';
import { authApi } from '@/lib/auth-api';
import { auditLogger } from '@/lib/services/auditLogger';
import { User, UserRole } from '@/types/auth';

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

const AUTHORIZED_ROLES: UserRole[] = ['professional', 'fisioterapeuta', 'admin'];

const isAuthorized = (role: string): boolean => {
  return AUTHORIZED_ROLES.includes(role as UserRole);
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  isLocked: false,

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(email, password);

      if (!isAuthorized(response.user.role)) {
        await authApi.logout();
        throw new Error('Acesso restrito a profissionais');
      }

      const user: User = {
        id: response.user.id,
        email: response.user.email || '',
        name: response.user.name || 'Profissional',
        role: response.user.role as UserRole,
        clinicId: response.user.clinicId,
        organizationId: response.user.organizationId || 'org-default',
        avatarUrl: response.user.avatarUrl,
        specialty: response.user.specialty,
        crefito: response.user.crefito,
      };
      
      await auditLogger.logLogin(user.id);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
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
      
      if (!isAuthorized(userData.role)) {
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
        role: userData.role as UserRole,
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
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
