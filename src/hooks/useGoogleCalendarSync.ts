/**
 * Hook para gerenciar sincronização com Google Calendar
 * @module hooks/useGoogleCalendarSync
 *
 */

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Appointment } from "@/types/appointment";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { integrationsApi } from "@/api/v2";

type SyncResult = {
  success: boolean;
  googleEventId?: string;
  error?: string;
};

function buildLocalGoogleAuthUrl(state?: string): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("Google OAuth não configurado");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state: state || "fisioflow-calendar-sync",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// =====================================================================
// QUERY KEYS
// =====================================================================

const GOOGLE_SYNC_KEYS = {
  all: ["google-calendar"] as const,
  token: () => [...GOOGLE_SYNC_KEYS.all, "token"] as const,
  authUrl: (state?: string) => [...GOOGLE_SYNC_KEYS.all, "auth-url", state] as const,
};

// =====================================================================
// HOOK TO CHECK CONNECTION STATUS
// =====================================================================

export function useGoogleCalendarConnection() {
  const { user } = useAuth();

  return useQuery({
    queryKey: GOOGLE_SYNC_KEYS.token(),
    queryFn: async (): Promise<{ connected: boolean; email?: string }> => {
      if (!user) {
        return { connected: false };
      }
      const data = (await integrationsApi.google.status()).data;
      if (!data || data.status !== "connected") return { connected: false };
      return {
        connected: true,
        email: data.external_email ?? undefined,
      };
    },
    enabled: !!user,
  });
}

// =====================================================================
// HOOK TO GET AUTH URL
// =====================================================================

export function useGoogleCalendarAuthUrl() {
  return useMutation({
    mutationFn: async (state?: string): Promise<string> => {
      try {
        const result = await integrationsApi.google.authUrl(state);
        if (result.data?.url) return result.data.url;
      } catch {
        // fallback local
      }
      return buildLocalGoogleAuthUrl(state);
    },
  });
}

// =====================================================================
// HOOK TO HANDLE OAUTH CALLBACK
// =====================================================================

export function useGoogleCalendarOAuth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string): Promise<{ success: boolean; email?: string }> => {
      try {
        const result = await integrationsApi.google.connect({ code });

        queryClient.invalidateQueries({ queryKey: GOOGLE_SYNC_KEYS.token() });

        toast({
          title: "✅ Google Calendar conectado",
          description: "Seus agendamentos serão sincronizados automaticamente.",
        });

        return {
          success: true,
          email: result.data?.external_email ?? undefined,
        };
      } catch (error) {
        logger.error("Erro ao conectar Google Calendar", error, "useGoogleCalendarSync");

        toast({
          title: "❌ Erro ao conectar",
          description: error instanceof Error ? error.message : "Tente novamente",
          variant: "destructive",
        });

        return { success: false };
      }
    },
  });
}

// =====================================================================
// HOOK TO SYNC SINGLE APPOINTMENT
// =====================================================================

export function useSyncToGoogle() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (appointment: Appointment): Promise<SyncResult> => {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }
      const result = await integrationsApi.google.calendar.syncAppointment(
        appointment as unknown as Record<string, unknown>,
      );
      return {
        success: Boolean(result.data?.success),
        googleEventId: result.data?.externalEventId,
      };
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "✅ Sincronizado",
          description: "Agendamento adicionado ao Google Calendar",
        });
      } else {
        toast({
          title: "⚠️ Erro ao sincronizar",
          description: result.error || "Tente novamente",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      logger.error("Erro ao sincronizar", error, "useGoogleCalendarSync");
      toast({
        title: "❌ Erro de sincronização",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    },
  });
}

// =====================================================================
// HOOK TO DISCONNECT GOOGLE CALENDAR
// =====================================================================

export function useDisconnectGoogleCalendar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }
      await integrationsApi.google.disconnect();

      queryClient.invalidateQueries({ queryKey: GOOGLE_SYNC_KEYS.token() });

      toast({
        title: "✅ Desconectado",
        description: "A sincronização com Google Calendar foi desativada.",
      });
    },
  });
}

// =====================================================================
// CUSTOM HOOK FOR SYNC MANAGEMENT
// =====================================================================

interface UseGoogleCalendarSyncOptions {
  /** Sincronizar automaticamente após criar/editar */
  autoSync?: boolean;
}

export function useGoogleCalendarSync(options: UseGoogleCalendarSyncOptions = {}) {
  const { autoSync = false } = options;

  const { data: connection, isLoading: checkingConnection } = useGoogleCalendarConnection();
  const { mutateAsync: getAuthUrl, isPending: gettingAuthUrl } = useGoogleCalendarAuthUrl();
  const { mutateAsync: handleOAuth, isPending: handlingOAuth } = useGoogleCalendarOAuth();
  const { mutateAsync: syncToGoogle, isPending: syncing } = useSyncToGoogle();
  const { mutateAsync: disconnect, isPending: disconnecting } = useDisconnectGoogleCalendar();

  const connect = useCallback(async () => {
    const authUrl = await getAuthUrl("connect-calendar");
    // Redirecionar para OAuth
    window.location.href = authUrl;
  }, [getAuthUrl]);

  /**
   * Sincronizar um appointment
   */
  const syncAppointment = useCallback(
    async (appointment: Appointment) => {
      if (!connection?.connected) {
        toast({
          title: "Google Calendar não conectado",
          description: "Conecte sua conta do Google para sincronizar.",
          variant: "destructive",
        });
        return;
      }

      await syncToGoogle(appointment);
    },
    [connection?.connected, syncToGoogle],
  );

  return {
    // Estado
    isConnected: connection?.connected || false,
    email: connection?.email,
    isLoading: checkingConnection || gettingAuthUrl || handlingOAuth || syncing || disconnecting,

    // Ações
    connect,
    handleOAuth,
    disconnect,
    syncAppointment,

    // Config
    autoSync,
  };
}

// =====================================================================
// EXPORTS
// =====================================================================

export default useGoogleCalendarSync;
