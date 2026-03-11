import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/auth-api';
import { config } from '@/lib/config';

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

const API_URL = config.apiUrl;

async function fetchApi(endpoint: string, method: string = 'GET', body?: any) {
  const token = await authApi.getToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API Error: ${res.status}`);
  }
  return res.json();
}

/**
 * Hook to fetch user notifications
 */
export function useNotifications(options?: { unreadOnly?: boolean; limit?: number }) {
  const params = new URLSearchParams();
  if (options?.unreadOnly) params.set('unread', 'true');
  if (options?.limit) params.set('limit', String(options.limit));

  const queryString = params.toString();
  const endpoint = `/api/notifications${queryString ? `?${queryString}` : ''}`;

  return useQuery<NotificationsResponse>({
    queryKey: ['notifications', options],
    queryFn: () => fetchApi(endpoint),
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
      fetchApi(`/api/notifications/${notificationId}/read`, 'PUT'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: () => fetchApi('/api/notifications/read-all', 'PUT'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: (notificationId: string) => 
      fetchApi(`/api/notifications/${notificationId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const createNotification = useMutation({
    mutationFn: (data: Partial<Notification>) => 
      fetchApi('/api/notifications', 'POST', data),
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
    await fetchApi('/api/push-tokens', 'POST', {
      expo_push_token: token,
      device_name: deviceName,
      device_type: deviceType,
    });
    console.log('Push token registered successfully');
  } catch (error) {
    console.error('Failed to register push token:', error);
  }
}