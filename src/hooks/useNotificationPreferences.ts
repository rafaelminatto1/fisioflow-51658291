/**
 * useNotificationPreferences - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('notification_preferences') → Firestore collection 'notification_preferences'
 * - supabase.auth.getUser() → getFirebaseAuth().currentUser
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFirebaseAuth, db } from '@/integrations/firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  setDoc
} from 'firebase/firestore';

const auth = getFirebaseAuth();

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

// Default values for notification preferences
const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
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

export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  // Buscar preferências do usuário atual
  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async (): Promise<NotificationPreferences | null> => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return null;

      // Use user_id as document ID
      const prefRef = doc(db, 'notification_preferences', firebaseUser.uid);
      const snap = await getDoc(prefRef);

      if (!snap.exists()) {
        // Não existe, criar padrão
        const now = new Date().toISOString();
        const newPrefs = {
          user_id: firebaseUser.uid,
          ...DEFAULT_PREFERENCES,
          created_at: now,
          updated_at: now,
        };

        await setDoc(prefRef, newPrefs);

        return {
          id: firebaseUser.uid,
          ...newPrefs,
        } as NotificationPreferences;
      }

      return {
        id: snap.id,
        ...snap.data(),
      } as NotificationPreferences;
    },
  });

  // Atualizar preferências
  const updatePreferences = useMutation({
    mutationFn: async (input: UpdateNotificationPreferencesInput) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Usuário não autenticado');

      const prefRef = doc(db, 'notification_preferences', firebaseUser.uid);

      await updateDoc(prefRef, {
        ...input,
        updated_at: new Date().toISOString(),
      });

      const snap = await getDoc(prefRef);
      return {
        id: snap.id,
        ...snap.data(),
      } as NotificationPreferences;
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
