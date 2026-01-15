/**
 * Hook para gerenciar sincronização com Google Calendar
 * @module hooks/useGoogleCalendarSync
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Appointment } from '@/types/appointment';
import {
  GoogleCalendarSync,
  GoogleOAuthToken,
  createGoogleAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  SyncResult,
} from '@/lib/calendar/google-sync';

// =====================================================================
// QUERY KEYS
// =====================================================================

const GOOGLE_SYNC_KEYS = {
  all: ['google-calendar'] as const,
  token: () => [...GOOGLE_SYNC_KEYS.all, 'token'] as const,
  authUrl: (state?: string) => [...GOOGLE_SYNC_KEYS.all, 'auth-url', state] as const,
};

// =====================================================================
// HOOK TO CHECK CONNECTION STATUS
// =====================================================================

/**
 * Hook para verificar se há conexão ativa com Google Calendar
 */
export function useGoogleCalendarConnection() {
  return useQuery({
    queryKey: GOOGLE_SYNC_KEYS.token(),
    queryFn: async (): Promise<{ connected: boolean; email?: string }> => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar token salvo
      const { data: tokenData, error } = await supabase
        .from('user_google_tokens')
        .select('access_token, refresh_token, email')
        .eq('user_id', user.id)
        .single();

      if (error || !tokenData) {
        return { connected: false };
      }

      return {
        connected: true,
        email: tokenData.email,
      };
    },
  });
}

// =====================================================================
// HOOK TO GET AUTH URL
// =====================================================================

/**
 * Hook para obter URL de autenticação OAuth
 */
export function useGoogleCalendarAuthUrl() {
  return useMutation({
    mutationFn: async (state?: string): Promise<string> => {
      return createGoogleAuthUrl(state);
    },
  });
}

// =====================================================================
// HOOK TO HANDLE OAUTH CALLBACK
// =====================================================================

/**
 * Hook para processar callback do OAuth
 */
export function useGoogleCalendarOAuth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string): Promise<{ success: boolean; email?: string }> => {
      try {
        // Trocar código por token
        const token = await exchangeCodeForToken(code);

        // Obter informações do usuário
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Usuário não autenticado');
        }

        // Buscar email do Google Calendar
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
          },
        });

        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          token.email = userInfo.email;
        }

        // Salvar token no banco
        const { error: insertError } = await supabase
          .from('user_google_tokens')
          .upsert({
            user_id: user.id,
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            expiry_date: token.expiry_date?.toISOString(),
            email: token.email,
            scope: token.scope?.join(','),
            updated_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;

        queryClient.invalidateQueries({ queryKey: GOOGLE_SYNC_KEYS.token() });

        toast({
          title: '✅ Google Calendar conectado',
          description: 'Seus agendamentos serão sincronizados automaticamente.',
        });

        return { success: true, email: token.email };
      } catch (error) {
        console.error('Erro ao conectar Google Calendar:', error);

        toast({
          title: '❌ Erro ao conectar',
          description: error instanceof Error ? error.message : 'Tente novamente',
          variant: 'destructive',
        });

        return { success: false };
      }
    },
  });
}

// =====================================================================
// HOOK TO SYNC SINGLE APPOINTMENT
// =====================================================================

/**
 * Hook para sincronizar um appointment para o Google Calendar
 */
export function useSyncToGoogle() {
  return useMutation({
    mutationFn: async (appointment: Appointment): Promise<SyncResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar token
      const { data: tokenData, error } = await supabase
        .from('user_google_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !tokenData) {
        throw new Error('Google Calendar não conectado');
      }

      // Verificar se token expirou e renovar se necessário
      let token = tokenData as GoogleOAuthToken;
      if (token.expiry_date && new Date(token.expiry_date) < new Date()) {
        if (token.refresh_token) {
          token = await refreshAccessToken(token.refresh_token);
          // Atualizar token no banco
          await supabase
            .from('user_google_tokens')
            .update({
              access_token: token.access_token,
              expiry_date: token.expiry_date?.toISOString(),
            })
            .eq('user_id', user.id);
        } else {
          throw new Error('Token expirado. Por favor, reconecte sua conta.');
        }
      }

      // Criar serviço de sincronização
      const sync = new GoogleCalendarSync({
        getAccessToken: async () => token,
      });

      return sync.syncToGoogle(appointment);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: '✅ Sincronizado',
          description: 'Agendamento adicionado ao Google Calendar',
        });
      } else {
        toast({
          title: '⚠️ Erro ao sincronizar',
          description: result.error || 'Tente novamente',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Erro ao sincronizar:', error);
      toast({
        title: '❌ Erro de sincronização',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    },
  });
}

// =====================================================================
// HOOK TO DISCONNECT GOOGLE CALENDAR
// =====================================================================

/**
 * Hook para desconectar Google Calendar
 */
export function useDisconnectGoogleCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Deletar token
      const { error } = await supabase
        .from('user_google_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: GOOGLE_SYNC_KEYS.token() });

      toast({
        title: '✅ Desconectado',
        description: 'A sincronização com Google Calendar foi desativada.',
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

/**
 * Hook principal para gerenciar sincronização com Google Calendar
 */
export function useGoogleCalendarSync(options: UseGoogleCalendarSyncOptions = {}) {
  const { autoSync = false } = options;

  const { data: connection, isLoading: checkingConnection } = useGoogleCalendarConnection();
  const { mutate: getAuthUrl, isPending: gettingAuthUrl } = useGoogleCalendarAuthUrl();
  const { mutate: handleOAuth, isPending: handlingOAuth } = useGoogleCalendarOAuth();
  const { mutate: syncToGoogle, isPending: syncing } = useSyncToGoogle();
  const { mutate: disconnect, isPending: disconnecting } = useDisconnectGoogleCalendar();

  /**
   * Conectar ao Google Calendar
   */
  const connect = useCallback(async () => {
    const authUrl = await getAuthUrl('connect-calendar');
    // Redirecionar para OAuth
    window.location.href = authUrl;
  }, [getAuthUrl]);

  /**
   * Sincronizar um appointment
   */
  const syncAppointment = useCallback(async (appointment: Appointment) => {
    if (!connection?.connected) {
      toast({
        title: 'Google Calendar não conectado',
        description: 'Conecte sua conta do Google para sincronizar.',
        variant: 'destructive',
      });
      return;
    }

    await syncToGoogle(appointment);
  }, [connection?.connected, syncToGoogle]);

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
