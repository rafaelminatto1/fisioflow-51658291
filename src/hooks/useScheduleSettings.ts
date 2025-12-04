import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

// Types
export interface BusinessHour {
  id: string;
  organization_id?: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start?: string;
  break_end?: string;
}

export interface CancellationRule {
  id: string;
  organization_id?: string;
  min_hours_before: number;
  allow_patient_cancellation: boolean;
  max_cancellations_month: number;
  charge_late_cancellation: boolean;
  late_cancellation_fee: number;
}

export interface NotificationSettings {
  id: string;
  organization_id?: string;
  send_confirmation_email: boolean;
  send_confirmation_whatsapp: boolean;
  send_reminder_24h: boolean;
  send_reminder_2h: boolean;
  send_cancellation_notice: boolean;
  custom_confirmation_message?: string;
  custom_reminder_message?: string;
}

export interface BlockedTime {
  id: string;
  organization_id?: string;
  therapist_id?: string;
  title: string;
  reason?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  is_all_day: boolean;
  is_recurring: boolean;
  recurring_days: number[];
  created_by: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

export function useScheduleSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get organization ID
  const { data: orgMember } = useQuery({
    queryKey: ['org-member', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const organizationId = orgMember?.organization_id;

  // Business Hours
  const { data: businessHours, isLoading: isLoadingHours } = useQuery({
    queryKey: ['business-hours', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_business_hours')
        .select('*')
        .eq('organization_id', organizationId)
        .order('day_of_week');
      if (error) throw error;
      return data as BusinessHour[];
    },
    enabled: !!organizationId,
  });

  const upsertBusinessHours = useMutation({
    mutationFn: async (hours: Partial<BusinessHour>[]) => {
      const validHours = hours.filter(h => h.day_of_week !== undefined).map(h => ({
        day_of_week: h.day_of_week as number,
        is_open: h.is_open ?? true,
        open_time: h.open_time ?? '07:00',
        close_time: h.close_time ?? '21:00',
        break_start: h.break_start || null,
        break_end: h.break_end || null,
        organization_id: organizationId,
      }));
      
      const { error } = await supabase
        .from('schedule_business_hours')
        .upsert(validHours, { onConflict: 'organization_id,day_of_week' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hours'] });
      toast({ title: 'Horários salvos', description: 'Horários de funcionamento atualizados.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Cancellation Rules
  const { data: cancellationRules, isLoading: isLoadingRules } = useQuery({
    queryKey: ['cancellation-rules', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_cancellation_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as CancellationRule | null;
    },
    enabled: !!organizationId,
  });

  const upsertCancellationRules = useMutation({
    mutationFn: async (rules: Partial<CancellationRule>) => {
      const { error } = await supabase
        .from('schedule_cancellation_rules')
        .upsert({ ...rules, organization_id: organizationId }, { onConflict: 'organization_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cancellation-rules'] });
      toast({ title: 'Regras salvas', description: 'Regras de cancelamento atualizadas.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Notification Settings
  const { data: notificationSettings, isLoading: isLoadingNotifications } = useQuery({
    queryKey: ['notification-settings', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_notification_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as NotificationSettings | null;
    },
    enabled: !!organizationId,
  });

  const upsertNotificationSettings = useMutation({
    mutationFn: async (settings: Partial<NotificationSettings>) => {
      const { error } = await supabase
        .from('schedule_notification_settings')
        .upsert({ ...settings, organization_id: organizationId }, { onConflict: 'organization_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast({ title: 'Configurações salvas', description: 'Notificações atualizadas.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Blocked Times
  const { data: blockedTimes, isLoading: isLoadingBlocked } = useQuery({
    queryKey: ['blocked-times', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_blocked_times')
        .select('*')
        .eq('organization_id', organizationId)
        .order('start_date');
      if (error) throw error;
      return data as BlockedTime[];
    },
    enabled: !!organizationId,
  });

  const createBlockedTime = useMutation({
    mutationFn: async (blocked: Omit<BlockedTime, 'id' | 'created_by'>) => {
      const { error } = await supabase
        .from('schedule_blocked_times')
        .insert({ ...blocked, organization_id: organizationId, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-times'] });
      toast({ title: 'Bloqueio criado', description: 'Horário bloqueado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteBlockedTime = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('schedule_blocked_times').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-times'] });
      toast({ title: 'Bloqueio removido', description: 'O bloqueio foi removido.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  return {
    // Data
    businessHours: businessHours || [],
    cancellationRules,
    notificationSettings,
    blockedTimes: blockedTimes || [],
    daysOfWeek: DAYS_OF_WEEK,
    organizationId,
    
    // Loading states
    isLoadingHours,
    isLoadingRules,
    isLoadingNotifications,
    isLoadingBlocked,
    
    // Mutations
    upsertBusinessHours: upsertBusinessHours.mutate,
    upsertCancellationRules: upsertCancellationRules.mutate,
    upsertNotificationSettings: upsertNotificationSettings.mutate,
    createBlockedTime: createBlockedTime.mutate,
    deleteBlockedTime: deleteBlockedTime.mutate,
    
    // Pending states
    isSavingHours: upsertBusinessHours.isPending,
    isSavingRules: upsertCancellationRules.isPending,
    isSavingNotifications: upsertNotificationSettings.isPending,
  };
}