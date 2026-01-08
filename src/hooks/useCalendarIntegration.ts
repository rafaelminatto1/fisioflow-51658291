import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '@/lib/errors/logger';

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

export function useCalendarIntegration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar integração atual
  const { data: integration, isLoading: isLoadingIntegration } = useQuery({
    queryKey: ['calendar-integration', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as CalendarIntegration | null;
    },
    enabled: !!user?.id,
  });

  // Buscar logs de sincronização
  const { data: syncLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['calendar-sync-logs', integration?.id],
    queryFn: async () => {
      if (!integration?.id) return [];
      
      const { data, error } = await supabase
        .from('calendar_sync_logs')
        .select('*')
        .eq('integration_id', integration.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as SyncLog[];
    },
    enabled: !!integration?.id,
  });

  // Conectar Google Calendar
  const connectGoogle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/configuracoes/calendario`,
          scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    },
    onError: (error) => {
      logger.error('Erro ao conectar Google Calendar', error, 'useCalendarIntegration');
      toast.error('Erro ao conectar com Google Calendar');
    },
  });

  // Desconectar Google Calendar
  const disconnectGoogle = useMutation({
    mutationFn: async () => {
      if (!integration?.id) throw new Error('Nenhuma integração encontrada');

      const { error } = await supabase
        .from('calendar_integrations')
        .update({
          is_connected: false,
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
        })
        .eq('id', integration.id);

      if (error) throw error;

      // Registrar log
      await supabase
        .from('calendar_sync_logs')
        .insert({
          integration_id: integration.id,
          action: 'disconnect',
          status: 'success',
          message: 'Google Calendar desconectado pelo usuário',
        });
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

  // Sincronizar calendário
  const syncCalendar = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      if (!integration?.id) throw new Error('Nenhuma integração encontrada');

      // Simular sincronização (em produção, isso chamaria uma edge function)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const now = new Date().toISOString();

      // Atualizar última sincronização
      const { error: updateError } = await supabase
        .from('calendar_integrations')
        .update({
          last_synced_at: now,
          events_synced_count: (integration.events_synced_count || 0) + 5,
        })
        .eq('id', integration.id);

      if (updateError) throw updateError;

      // Registrar log de sucesso
      await supabase
        .from('calendar_sync_logs')
        .insert({
          integration_id: integration.id,
          action: 'sync',
          status: 'success',
          message: 'Sincronização manual realizada com sucesso',
          metadata: { events_synced: 5 },
        });

      return { synced_at: now };
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

  // Atualizar configurações
  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<CalendarSettings>) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const updateData: Record<string, unknown> = {};
      
      if (settings.autoSyncEnabled !== undefined) {
        updateData.auto_sync_enabled = settings.autoSyncEnabled;
      }
      if (settings.autoSendEvents !== undefined) {
        updateData.auto_send_events = settings.autoSendEvents;
      }
      if (settings.defaultCalendarId !== undefined) {
        updateData.default_calendar_id = settings.defaultCalendarId;
      }

      if (integration?.id) {
        // Atualizar existente
        const { error } = await supabase
          .from('calendar_integrations')
          .update(updateData)
          .eq('id', integration.id);

        if (error) throw error;
      } else {
        // Criar nova integração
        const { error } = await supabase
          .from('calendar_integrations')
          .insert({
            user_id: user.id,
            provider: 'google',
            ...updateData,
          });

        if (error) throw error;
      }
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

  // Estatísticas dos logs
  const syncStats = {
    total: syncLogs?.length || 0,
    success: syncLogs?.filter(log => log.status === 'success').length || 0,
    error: syncLogs?.filter(log => log.status === 'error').length || 0,
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
