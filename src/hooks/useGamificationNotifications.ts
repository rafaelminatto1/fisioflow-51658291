/**
 * useGamificationNotifications - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  gamificationNotificationsApi,
  type GamificationNotification,
} from '@/lib/api/workers-client';

export interface UseGamificationNotificationsResult {
  notifications: GamificationNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  refetch: () => void;
  isMarkingAsRead: boolean;
  isMarkingAllAsRead: boolean;
  isDeleting: boolean;
}

const NOTIFICATION_LIMIT = 50;

export const useGamificationNotifications = (
  patientId?: string,
): UseGamificationNotificationsResult => {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, error, refetch } = useQuery({
    queryKey: ['gamification-notifications', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const response = await gamificationNotificationsApi.list({ patientId, limit: NOTIFICATION_LIMIT });
      return response.data ?? [];
    },
    enabled: !!patientId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => gamificationNotificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['gamification-notifications', patientId]);
    },
    onError: () => {
      toast.error('Não foi possível marcar a notificação como lida');
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!patientId) throw new Error('patientId is required');
      await gamificationNotificationsApi.markAllRead(patientId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['gamification-notifications', patientId]);
      toast.success('Todas as notificações foram marcadas como lidas');
    },
    onError: () => {
      toast.error('Não foi possível marcar todas as notificações como lidas');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => gamificationNotificationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['gamification-notifications', patientId]);
    },
    onError: () => {
      toast.error('Não foi possível remover a notificação');
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    error: error as Error | null,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteMutation.mutate,
    refetch,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
