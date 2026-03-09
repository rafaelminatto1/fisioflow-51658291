/**
 * useCalendarIntegration - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { integrationsApi, type GoogleIntegrationRecord, type GoogleSyncLogRecord } from '@/lib/api/workers-client';

function buildLocalGoogleAuthUrl(state?: string): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error('Google OAuth não configurado');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: state || 'calendar-integration',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: string;
  calendar_email: string | null;
  default_calendar_id: string | null;
  auto_sync_enabled: boolean;
  auto_send_events: boolean;
  last_synced_at: string | null;
  events_synced_count: number;
  is_connected: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  integration_id: string;
  action: string;
  status: string;
  event_type: string | null;
  event_id: string | null;
  external_event_id: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CalendarSettings {
  autoSyncEnabled: boolean;
  autoSendEvents: boolean;
  defaultCalendarId: string | null;
}

function mapIntegration(row: GoogleIntegrationRecord | null): CalendarIntegration | null {
  if (!row) return null;
  const settings = (row.settings ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    user_id: row.user_id,
    provider: row.provider,
    calendar_email: row.external_email ?? null,
    default_calendar_id: typeof settings.default_calendar_id === 'string' ? settings.default_calendar_id : null,
    auto_sync_enabled: Boolean(settings.auto_sync_enabled),
    auto_send_events: Boolean(settings.auto_send_events),
    last_synced_at: row.last_synced_at ?? null,
    events_synced_count: row.events_synced_count ?? 0,
    is_connected: row.status === 'connected',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapSyncLog(row: GoogleSyncLogRecord): SyncLog {
  return {
    id: row.id,
    integration_id: row.integration_id,
    action: row.action,
    status: row.status,
    event_type: row.event_type ?? null,
    event_id: row.event_id ?? null,
    external_event_id: row.external_event_id ?? null,
    message: row.message ?? null,
    metadata: (row.metadata ?? null) as Record<string, unknown> | null,
    created_at: row.created_at,
  };
}

export function useCalendarIntegration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = (user as { uid?: string; id?: string } | null)?.uid ?? (user as { uid?: string; id?: string } | null)?.id;

  const { data: integration, isLoading: isLoadingIntegration } = useQuery({
    queryKey: ['calendar-integration', userId],
    queryFn: async () => mapIntegration((await integrationsApi.google.calendar.get()).data),
    enabled: !!userId,
  });

  const { data: syncLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['calendar-sync-logs', integration?.id],
    queryFn: async () => ((await integrationsApi.google.calendar.logs()).data ?? []).map(mapSyncLog),
    enabled: !!userId,
  });

  const connectGoogle = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Usuário não autenticado');
      try {
        const authUrl = await integrationsApi.google.authUrl('calendar-integration');
        if (authUrl.data?.url) {
          window.location.href = authUrl.data.url;
          return authUrl.data;
        }
      } catch {
        const url = buildLocalGoogleAuthUrl('calendar-integration');
        if (url) {
          window.location.href = url;
          return { url };
        }
      }
      const result = await integrationsApi.google.connect({ email: user?.email ?? undefined });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-integration'] });
      toast.success('Google Calendar conectado com sucesso');
    },
    onError: (error) => {
      logger.error('Erro ao conectar Google Calendar', error, 'useCalendarIntegration');
      toast.error('Erro ao conectar com Google Calendar');
    },
  });

  const disconnectGoogle = useMutation({
    mutationFn: async () => {
      await integrationsApi.google.disconnect();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-integration'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-sync-logs'] });
      toast.success('Google Calendar desconectado com sucesso');
    },
    onError: (error) => {
      logger.error('Erro ao desconectar Google Calendar', error, 'useCalendarIntegration');
      toast.error('Erro ao desconectar Google Calendar');
    },
  });

  const syncCalendar = useMutation({
    mutationFn: async () => {
      const result = await integrationsApi.google.calendar.sync();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-integration'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-sync-logs'] });
      toast.success('Calendário sincronizado com sucesso');
    },
    onError: (error) => {
      logger.error('Erro ao sincronizar calendário', error, 'useCalendarIntegration');
      toast.error('Erro ao sincronizar calendário');
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<CalendarSettings>) => {
      const result = await integrationsApi.google.calendar.update({
        autoSyncEnabled: settings.autoSyncEnabled,
        autoSendEvents: settings.autoSendEvents,
        defaultCalendarId: settings.defaultCalendarId,
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-integration'] });
      toast.success('Configurações atualizadas');
    },
    onError: (error) => {
      logger.error('Erro ao atualizar configurações do calendário', error, 'useCalendarIntegration');
      toast.error('Erro ao atualizar configurações');
    },
  });

  const syncStats = {
    total: syncLogs?.length || 0,
    success: syncLogs?.filter((log) => log.status === 'success').length || 0,
    error: syncLogs?.filter((log) => log.status === 'error').length || 0,
  };

  return {
    integration,
    syncLogs,
    syncStats,
    isLoading: isLoadingIntegration,
    isLoadingLogs,
    isConnected: integration?.is_connected ?? false,
    connectGoogle: connectGoogle.mutate,
    disconnectGoogle: disconnectGoogle.mutate,
    syncCalendar: syncCalendar.mutateAsync,
    updateSettings: updateSettings.mutate,
    isConnecting: connectGoogle.isPending,
    isDisconnecting: disconnectGoogle.isPending,
    isSyncing: syncCalendar.isPending,
    isUpdating: updateSettings.isPending,
  };
}
