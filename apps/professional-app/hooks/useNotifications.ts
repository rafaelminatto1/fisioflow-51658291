import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';

export interface Notification {
  id: string;
  user_id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'appointment' | 'payment' | 'whatsapp' | 'waitlist';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

/**
 * Hook to fetch user notifications
 */
export function useNotifications(options?: { unreadOnly?: boolean; limit?: number }) {
  return useQuery<NotificationsResponse>({
    queryKey: ['notifications', options],
    queryFn: () => fetchApi('/api/notifications', {
        params: {
            unread: options?.unreadOnly ? 'true' : undefined,
            limit: options?.limit ? String(options.limit) : undefined,
        }
    }),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

/**
 * Hook to get unread notifications count
 */
export function useUnreadCount() {
  const { data } = useNotifications({ unreadOnly: true, limit: 0 });
  return data?.unreadCount ?? 0;
}

/**
 * Hook for notification mutations (mark as read, delete, etc)
 */
export function useNotificationMutations() {
  const queryClient = useQueryClient();

  const markAsRead = useMutation({
    mutationFn: (notificationId: string) => 
      fetchApi(`/api/notifications/${notificationId}/read`, { method: 'PUT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: () => fetchApi('/api/notifications/read-all', { method: 'PUT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: (notificationId: string) => 
      fetchApi(`/api/notifications/${notificationId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const createNotification = useMutation({
    mutationFn: (data: Partial<Notification>) => 
      fetchApi('/api/notifications', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
  };
}

/**
 * Register Expo Push Token for the current user
 */
export async function registerPushToken(token: string, deviceName?: string, deviceType?: string) {
  try {
    await fetchApi('/api/push-tokens', {
      method: 'POST',
      data: {
        expo_push_token: token,
        device_name: deviceName,
        device_type: deviceType,
      },
    });
    console.log('Push token registered successfully');
  } catch (error) {
    console.error('Failed to register push token:', error);
  }
}
