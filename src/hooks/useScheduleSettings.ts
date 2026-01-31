/**
 * useScheduleSettings - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - schedule_business_hours -> schedule_business_hours (Doc ID: orgId_day)
 * - schedule_cancellation_rules -> schedule_cancellation_rules (Doc ID: orgId)
 * - schedule_notification_settings -> schedule_notification_settings (Doc ID: orgId)
 * - schedule_blocked_times -> schedule_blocked_times (Doc ID: auto, organization_id field)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, query, where, orderBy } from '@/integrations/firebase/app';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';
import { db } from '@/integrations/firebase/app';



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

// Helper to convert doc
const convertDoc = <T>(doc: { id: string; data: () => Record<string, unknown> }): T => ({ id: doc.id, ...doc.data() } as T);

export function useScheduleSettings() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const organizationId = profile?.organization_id;

  // Business Hours
  const { data: businessHours, isLoading: isLoadingHours } = useQuery({
    queryKey: ['business-hours', organizationId],
    queryFn: async () => {
      const q = query(
        collection(db, 'schedule_business_hours'),
        where('organization_id', '==', organizationId)
      );
      const snapshot = await getDocs(q);
      const hours = snapshot.docs.map(convertDoc) as BusinessHour[];
      // Sort in JS because we query by organization_id
      return hours.sort((a, b) => a.day_of_week - b.day_of_week);
    },
    enabled: !!organizationId,
  });

  const upsertBusinessHours = useMutation({
    mutationFn: async (hours: Partial<BusinessHour>[]) => {
      const validHours = hours.filter(h => h.day_of_week !== undefined);

      const promises = validHours.map(async (h) => {
        const docId = `${organizationId}_${h.day_of_week}`;
        const docRef = doc(db, 'schedule_business_hours', docId);

        const hourData = {
          day_of_week: h.day_of_week,
          is_open: h.is_open ?? true,
          open_time: h.open_time ?? '07:00',
          close_time: h.close_time ?? '21:00',
          break_start: h.break_start || null,
          break_end: h.break_end || null,
          organization_id: organizationId,
        };

        await setDoc(docRef, hourData, { merge: true });
      });

      await Promise.all(promises);
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
      const docRef = doc(db, 'schedule_cancellation_rules', organizationId!);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return convertDoc(snapshot) as CancellationRule;
    },
    enabled: !!organizationId,
  });

  const upsertCancellationRules = useMutation({
    mutationFn: async (rules: Partial<CancellationRule>) => {
      const docRef = doc(db, 'schedule_cancellation_rules', organizationId!);
      await setDoc(docRef, { ...rules, organization_id: organizationId }, { merge: true });
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
      const docRef = doc(db, 'schedule_notification_settings', organizationId!);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return convertDoc(snapshot) as NotificationSettings;
    },
    enabled: !!organizationId,
  });

  const upsertNotificationSettings = useMutation({
    mutationFn: async (settings: Partial<NotificationSettings>) => {
      const docRef = doc(db, 'schedule_notification_settings', organizationId!);
      await setDoc(docRef, { ...settings, organization_id: organizationId }, { merge: true });
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
      const q = query(
        collection(db, 'schedule_blocked_times'),
        where('organization_id', '==', organizationId),
        orderBy('start_date', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc) as BlockedTime[];
    },
    enabled: !!organizationId,
  });

  const createBlockedTime = useMutation({
    mutationFn: async (blocked: Omit<BlockedTime, 'id' | 'created_by'>) => {
      await addDoc(collection(db, 'schedule_blocked_times'), {
        ...blocked,
        organization_id: organizationId,
        created_by: user?.uid,
        created_at: new Date().toISOString()
      });
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
      await deleteDoc(doc(db, 'schedule_blocked_times', id));
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