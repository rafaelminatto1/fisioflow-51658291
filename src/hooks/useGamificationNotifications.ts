import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

export type NotificationType = 'achievement' | 'level_up' | 'quest_complete' | 'streak_milestone' | 'reward_unlocked';

export interface GamificationNotification {
  id: string;
  patient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  read_at: string | null;
  created_at: string;
  expires_at: string;
}

export interface UseGamificationNotificationsResult {
  notifications: GamificationNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refetch: () => void;
}

// Variantes de notificação para UI
const getNotificationVariant = (type: NotificationType): 'default' | 'destructive' => {
  const variants: Record<NotificationType, 'default' | 'destructive'> = {
    level_up: 'default',
    achievement: 'default',
    quest_complete: 'default',
    streak_milestone: 'default',
    reward_unlocked: 'default',
  };
  return variants[type] || 'default';
};

const NOTIFICATION_ICONS = {
  achievement: '🏆',
  level_up: '⬆️',
  streak_milestone: '🔥',
  quest_complete: '✅',
  reward_unlocked: '🎁',
};

export const useGamificationNotifications = (patientId?: string): UseGamificationNotificationsResult => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Buscar notificações
  const { data: notifications = [], isLoading, error, refetch } = useQuery({
    queryKey: ['gamification-notifications', patientId],
    queryFn: async () => {
      if (!patientId) return [];

      try {
        const { data, error } = await supabase
          .from('gamification_notifications')
          .select('*')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        return data as GamificationNotification[];
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
        toast({
          title: "Erro ao carregar notificações",
          description: "Tente novamente mais tarde",
          variant: "destructive"
        });
        throw err;
      }
    },
    enabled: !!patientId,
    staleTime: 1000 * 30, // 30 segundos
    retry: 1,
  });

  // Contagem de não lidas
  const unreadCount = notifications.filter(n => !n.read_at).length;

  // Marcar como lido
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('gamification_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['gamification-notifications', patientId] });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível marcar a notificação como lida",
        variant: "destructive"
      });
      throw err;
    }
  }, [patientId, queryClient, toast]);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    if (!patientId) return;

    try {
      const { error } = await supabase
        .from('gamification_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('patient_id', patientId)
        .is('read_at', null);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['gamification-notifications', patientId] });

      toast({
        title: "Sucesso",
        description: "Todas as notificações foram marcadas como lidas",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível marcar todas as notificações como lidas",
        variant: "destructive"
      });
      throw err;
    }
  }, [patientId, queryClient, toast]);

  // Deletar notificação
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('gamification_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['gamification-notifications', patientId] });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível deletar a notificação",
        variant: "destructive"
      });
      throw err;
    }
  }, [patientId, queryClient, toast]);

  // Realtime subscription para novas notificações
  useEffect(() => {
    if (!patientId) return;

    // Cleanup canal anterior
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Criar novo canal
    const channel = supabase
      .channel(`gamification-notifications-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gamification_notifications',
          filter: `patient_id=eq.${patientId}`
        },
        (payload) => {
          const newNotification = payload.new as GamificationNotification;
          const icon = NOTIFICATION_ICONS[newNotification.type];

          // Mostrar toast imediatamente para novas notificações
          toast({
            title: `${icon} ${newNotification.title}`,
            description: newNotification.message,
            variant: getNotificationVariant(newNotification.type),
          });

          // Invalidar query para atualizar lista
          queryClient.invalidateQueries({ queryKey: ['gamification-notifications', patientId] });

          // Tocar som de notificação (se disponível)
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/favicon.ico',
              tag: newNotification.id
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIPTION_ERROR') {
          console.error('Realtime subscription error');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [patientId, queryClient, toast]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch,
  };
};
