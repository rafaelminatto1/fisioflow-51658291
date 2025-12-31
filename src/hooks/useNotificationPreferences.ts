import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  appointment_reminders: boolean;
  exercise_reminders: boolean;
  progress_updates: boolean;
  system_alerts: boolean;
  therapist_messages: boolean;
  payment_reminders: boolean;
  quiet_hours_start: string; // HH:MM format
  quiet_hours_end: string; // HH:MM format
  weekend_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateNotificationPreferencesInput {
  appointment_reminders?: boolean;
  exercise_reminders?: boolean;
  progress_updates?: boolean;
  system_alerts?: boolean;
  therapist_messages?: boolean;
  payment_reminders?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  weekend_notifications?: boolean;
}

export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  // Buscar preferências do usuário atual
  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async (): Promise<NotificationPreferences | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Não existe, criar padrão
          const { data: newPrefs, error: createError } = await supabase
            .from('notification_preferences')
            .insert({
              user_id: user.id,
            })
            .select()
            .single();

          if (createError) throw createError;
          return newPrefs;
        }
        throw error;
      }

      return data;
    },
  });

  // Atualizar preferências
  const updatePreferences = useMutation({
    mutationFn: async (input: UpdateNotificationPreferencesInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('notification_preferences')
        .update(input)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  return {
    preferences,
    isLoading,
    error,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
}

