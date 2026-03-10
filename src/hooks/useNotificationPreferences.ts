/**
 * useNotificationPreferences - Migrated to Neon/Cloudflare
 *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationPreferencesApi, type NotificationPreferences } from '@/lib/api/workers-client';

const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'user_id' | 'organization_id' | 'created_at' | 'updated_at'> =
  {
    appointment_reminders: true,
    exercise_reminders: true,
    progress_updates: true,
    system_alerts: true,
    therapist_messages: true,
    payment_reminders: true,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    weekend_notifications: false,
  };

export type UpdateNotificationPreferencesInput =
  Partial<Omit<NotificationPreferences, 'user_id' | 'organization_id' | 'created_at' | 'updated_at'>>;

export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const res = await notificationPreferencesApi.get();
      return res?.data ?? null;
    },
  });

  const updatePreferences = useMutation({
    mutationFn: (input: UpdateNotificationPreferencesInput) => notificationPreferencesApi.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  return {
    preferences: preferences ?? null,
    isLoading,
    error,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
}
