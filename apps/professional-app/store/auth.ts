import { create } from "zustand";
import { authApi } from "@/lib/auth-api";
import { auditLogger } from "@/lib/services/auditLogger";
import { biometricAuthService } from "@/lib/services/biometricAuthService";
import { User, UserRole } from "@/types/auth";
import { fetchApi } from "@/lib/api";
import { registerForPushNotificationsAsync } from "@/lib/notifications";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
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

const AUTHORIZED_ROLES: UserRole[] = [
  "professional",
  "fisioterapeuta",
  "admin",
  "recepcionista",
  "estagiario",
];

export const isAuthorized = (role: string): boolean => {
  return AUTHORIZED_ROLES.includes(role as UserRole);
};

import AsyncStorage from "@react-native-async-storage/async-storage";

// ... existing code ...

const USER_CACHE_KEY = "FISIOFLOW_USER_CACHE";

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
        throw new Error("Acesso restrito a profissionais");
      }

      const user: User = {
        id: response.user.id,
        email: response.user.email || "",
        name: response.user.name || "Profissional",
        role: response.user.role as UserRole,
        clinicId: response.user.clinicId,
        organizationId: response.user.organizationId || "org-default",
        avatarUrl: response.user.avatarUrl,
        specialty: response.user.specialty,
        crefito: response.user.crefito,
      };

      await auditLogger.logLogin(user.id);
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      registerForPushNotificationsAsync()
        .then((token) => {
          if (token) {
            fetchApi("/api/fcm-tokens", {
              method: "POST",
              data: { token, deviceInfo: { platform: Platform.OS } },
              skipOfflineQueue: true,
            }).catch(console.error);
          }
        })
        .catch(console.error);
    } catch (error: any) {
      set({ error: error.message || "Erro ao fazer login", isLoading: false });
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

      try {
        const projectId =
          process.env.EXPO_PUBLIC_EXPO_PROJECT_ID || process.env.EXPO_PUBLIC_PROJECT_ID;
        if (projectId) {
          const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
          if (pushToken) {
            await fetchApi(`/api/fcm-tokens/${encodeURIComponent(pushToken)}`, {
              method: "DELETE",
              skipOfflineQueue: true,
            }).catch(console.error);
          }
        }
      } catch (e) {
        console.error("Failed to unregister push token", e);
      }

      await authApi.logout();
      await AsyncStorage.removeItem(USER_CACHE_KEY);
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
      const updatedUser = { ...currentUser, ...data };
      AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(updatedUser)).catch(console.error);
      set({ user: updatedUser });
    }
  },

  lockSession: () => set({ isLocked: true }),
  unlockSession: async () => set({ isLocked: false }),
  clearSession: () => set({ isLocked: false, isAuthenticated: false, user: null }),

  initialize: async () => {
    set({ isLoading: true });
    try {
      // 1. Tenta carregar o cache primeiro para liberar a UI rápida
      const cachedUser = await AsyncStorage.getItem(USER_CACHE_KEY);
      if (cachedUser) {
        const parsedUser = JSON.parse(cachedUser);
        set({ user: parsedUser, isAuthenticated: true, isLoading: false });
      }

      // 2. Valida com a API
      const userData = await authApi.getMe();

      if (!isAuthorized(userData.role)) {
        await authApi.logout();
        await AsyncStorage.removeItem(USER_CACHE_KEY);
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      const user: User = {
        id: userData.id,
        email: userData.email || "",
        name: userData.name || "Profissional",
        role: userData.role as UserRole,
        clinicId: userData.clinicId,
        organizationId: userData.organizationId || "org-default",
        avatarUrl: userData.avatarUrl,
        specialty: userData.specialty,
        crefito: userData.crefito,
      };

      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      registerForPushNotificationsAsync()
        .then((token) => {
          if (token) {
            fetchApi("/api/fcm-tokens", {
              method: "POST",
              data: { token, deviceInfo: { platform: Platform.OS } },
              skipOfflineQueue: true,
            }).catch(console.error);
          }
        })
        .catch(console.error);
    } catch (e: any) {
      // Se deu erro de rede (não 401), e já temos um cache, mantém a sessão ativa.
      const isAuthError = e.message === "Falha ao validar sessão";
      if (isAuthError) {
        await AsyncStorage.removeItem(USER_CACHE_KEY);
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      } else {
        // Erro genérico/offline - mantém o cache se existir
        set({ isLoading: false });
      }
    }
  },
}));

export async function unlockSessionWithPIN(pin: string): Promise<boolean> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return false;

  const ok = await biometricAuthService.verifyPin(userId, pin);
  if (ok) {
    await useAuthStore.getState().unlockSession();
  }

  return ok;
}
