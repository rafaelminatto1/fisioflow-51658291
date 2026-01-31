/**
 * Hook para gerenciar sincronização com Google Calendar
 * @module hooks/useGoogleCalendarSync
 *
 * Migration from Supabase to Firebase Firestore:
 * - user_google_tokens -> Firestore collection 'user_google_tokens' (docId = userId)
 */

import { useState, useCallback } from 'react';
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from '@/integrations/firebase/app';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Appointment } from '@/types/appointment';
import { fisioLogger as logger } from '@/lib/errors/logger';
import {
  GoogleCalendarSync,
  GoogleOAuthToken,
  createGoogleAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  SyncResult,
} from '@/lib/calendar/google-sync';
import { db } from '@/integrations/firebase/app';



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
  const { user } = useAuth();

  return useQuery({
    queryKey: GOOGLE_SYNC_KEYS.token(),
    queryFn: async (): Promise<{ connected: boolean; email?: string }> => {
      if (!user) {
        return { connected: false };
      }

      // Buscar token salvo (Firestore)
      const docRef = doc(db, 'user_google_tokens', user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return { connected: false };
      }

      const data = docSnap.data();
      return {
        connected: true,
        email: data.email,
      };
    },
    enabled: !!user,
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
      // Usar função existente (client-side ou server-side helper)
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (code: string): Promise<{ success: boolean; email?: string }> => {
      try {
        if (!user) {
          throw new Error('Usuário não autenticado');
        }

        // Trocar código por token
        const token = await exchangeCodeForToken(code);

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

        // Salvar token no banco (Firestore) - Usar setDoc com merge ou overwrite? 
        // Como o ID é o uid, podemos usar setDoc para criar ou atualizar.
        const docRef = doc(db, 'user_google_tokens', user.uid);
        await setDoc(docRef, {
          user_id: user.uid,
          access_token: token.access_token,
          refresh_token: token.refresh_token,
          expiry_date: token.expiry_date?.toISOString(),
          email: token.email,
          scope: token.scope?.join(','),
          updated_at: new Date().toISOString(),
        });

        queryClient.invalidateQueries({ queryKey: GOOGLE_SYNC_KEYS.token() });

        toast({
          title: '✅ Google Calendar conectado',
          description: 'Seus agendamentos serão sincronizados automaticamente.',
        });

        return { success: true, email: token.email };
      } catch (error) {
        logger.error('Erro ao conectar Google Calendar', error, 'useGoogleCalendarSync');

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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (appointment: Appointment): Promise<SyncResult> => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar token
      const docRef = doc(db, 'user_google_tokens', user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Google Calendar não conectado');
      }

      const tokenData = docSnap.data();

      // Verificar se token expirou e renovar se necessário
      let token: GoogleOAuthToken = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: tokenData.expiry_date ? new Date(tokenData.expiry_date) : undefined,
        scope: tokenData.scope ? tokenData.scope.split(',') : [],
        email: tokenData.email
      };

      if (token.expiry_date && token.expiry_date < new Date()) {
        if (token.refresh_token) {
          try {
            const refreshed = await refreshAccessToken(token.refresh_token);
            token = refreshed;

            // Atualizar token no banco
            await updateDoc(docRef, {
              access_token: token.access_token,
              expiry_date: token.expiry_date?.toISOString(),
              updated_at: new Date().toISOString()
            });
          } catch (e) {
            throw new Error('Token expirado. Por favor, reconecte sua conta.');
          }
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
      logger.error('Erro ao sincronizar', error, 'useGoogleCalendarSync');
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Deletar token no Firestore
      const docRef = doc(db, 'user_google_tokens', user.uid);
      await deleteDoc(docRef);

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
