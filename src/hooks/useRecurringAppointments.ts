/**
 * useRecurringAppointments - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('recurring_appointment_series') → Firestore collection 'recurring_appointment_series'
 * - supabase.from('recurring_appointment_occurrences') → Firestore collection 'recurring_appointment_occurrences'
 * - supabase.auth.getUser() → Firebase Auth context
 * - Joins replaced with separate queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fisioLogger as logger } from '@/lib/errors/logger';
import {
  RecurringAppointmentSeries,
  RecurringAppointmentOccurrence,
  RecurringAppointmentFormData,
  OccurrencePreview,
  CreateSeriesResult,
} from '@/types/recurring-appointment';
import { addDays, addWeeks, addMonths, addYears, startOfDay, isSameDay } from 'date-fns';
import { db } from '@/integrations/firebase/app';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';


interface FirestoreSeriesData {
  id: string;
  patient_id?: string;
  therapist_id?: string;
  [key: string]: unknown;
}

interface PatientBasicInfo {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
}

interface TherapistBasicInfo {
  id: string;
  full_name: string;
}

// =====================================================================
// QUERY KEYS
// =====================================================================

export const RECURRING_QUERY_KEYS = {
  all: ['recurring'] as const,
  series: () => [...RECURRING_QUERY_KEYS.all, 'series'] as const,
  seriesById: (id: string) => [...RECURRING_QUERY_KEYS.series(), id] as const,
  occurrences: (seriesId: string) => [...RECURRING_QUERY_KEYS.all, 'occurrences', seriesId] as const,
  active: () => [...RECURRING_QUERY_KEYS.all, 'active'] as const,
};

// =====================================================================
// FETCH FUNCTIONS
// =====================================================================

/**
 * Busca todas as séries recorrentes
 */
async function fetchRecurringSeries(params?: {
  organization_id?: string;
  patient_id?: string;
  is_active?: boolean;
}): Promise<RecurringAppointmentSeries[]> {
  const constraints: Array<typeof collection | typeof where | typeof orderBy> = [
    collection(db, 'recurring_appointment_series'),
    orderBy('created_at', 'desc')
  ];

  if (params?.organization_id) {
    constraints.push(where('organization_id', '==', params.organization_id));
  }

  if (params?.patient_id) {
    constraints.push(where('patient_id', '==', params.patient_id));
  }

  if (params?.is_active !== undefined) {
    constraints.push(where('is_active', '==', params.is_active));
  }

  const q = query(...constraints);
  const snapshot = await getDocs(q);

  const series = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Fetch patient data for each series
  const patientIds = series.map((s: FirestoreSeriesData) => s.patient_id).filter((id): id is string => id !== null);
  const patientMap = new Map<string, PatientBasicInfo>();

  await Promise.all([...new Set(patientIds)].map(async (patientId) => {
    const patientDoc = await getDoc(doc(db, 'patients', patientId));
    if (patientDoc.exists()) {
      patientMap.set(patientId, {
        id: patientDoc.id,
        full_name: patientDoc.data().full_name,
        email: patientDoc.data().email,
        phone: patientDoc.data().phone,
      });
    }
  }));

  // Fetch therapist data for each series
  const therapistIds = series.map((s: FirestoreSeriesData) => s.therapist_id).filter((id): id is string => id !== null);
  const therapistMap = new Map<string, TherapistBasicInfo>();

  await Promise.all([...new Set(therapistIds)].map(async (therapistId) => {
    const profileDoc = await getDoc(doc(db, 'profiles', therapistId));
    if (profileDoc.exists()) {
      therapistMap.set(therapistId, {
        id: profileDoc.id,
        full_name: profileDoc.data().full_name,
      });
    }
  }));

  return series.map((s: FirestoreSeriesData) => ({
    ...s,
    patient: patientMap.get(s.patient_id),
    therapist: therapistMap.get(s.therapist_id),
  })) as RecurringAppointmentSeries[];
}

/**
 * Busca uma série específica com estatísticas
 */
async function fetchRecurringSeriesById(
  id: string
): Promise<RecurringAppointmentSeries | null> {
  const docRef = doc(db, 'recurring_appointment_series', id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const seriesData = { id: docSnap.id, ...docSnap.data() };

  // Fetch patient
  if (seriesData.patient_id) {
    const patientDoc = await getDoc(doc(db, 'patients', seriesData.patient_id));
    if (patientDoc.exists()) {
      seriesData.patient = {
        id: patientDoc.id,
        full_name: patientDoc.data().full_name,
        email: patientDoc.data().email,
        phone: patientDoc.data().phone,
      };
    }
  }

  // Fetch therapist
  if (seriesData.therapist_id) {
    const profileDoc = await getDoc(doc(db, 'profiles', seriesData.therapist_id));
    if (profileDoc.exists()) {
      seriesData.therapist = {
        id: profileDoc.id,
        full_name: profileDoc.data().full_name,
      };
    }
  }

  return seriesData as RecurringAppointmentSeries;
}

/**
 * Busca ocorrências de uma série
 */
async function fetchSeriesOccurrences(
  seriesId: string
): Promise<RecurringAppointmentOccurrence[]> {
  const q = query(
    collection(db, 'recurring_appointment_occurrences'),
    where('series_id', '==', seriesId),
    orderBy('occurrence_date', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
}

// =====================================================================
// GENERATE OCCURRENCES
// =====================================================================

/**
 * Gera previews de ocorrências para uma série recorrente
 */
export function generateOccurrencesPreview(
  formData: RecurringAppointmentFormData
): OccurrencePreview[] {
  const occurrences: OccurrencePreview[] = [];
  const { recurrence, firstDate, time } = formData;

  const { type, interval, endType, endDate, maxOccurrences } = recurrence;

  let currentDate = startOfDay(firstDate);
  let index = 0;
  const maxIterations = 1000; // Prevenir loop infinito

  while (index < maxIterations) {
    // Verificar condição de parada por data
    if (endType === 'date' && endDate && currentDate > endDate) {
      break;
    }

    // Verificar condição de parada por ocorrências
    if (endType === 'occurrences' && maxOccurrences && index >= maxOccurrences) {
      break;
    }

    // Verificar se a data atende aos critérios de recorrência
    if (shouldIncludeDate(currentDate, recurrence)) {
      occurrences.push({
        date: currentDate,
        time,
        index,
        seriesId: formData.id || '',
      });
    }

    // Avançar para próxima data
    switch (type) {
      case 'daily':
        currentDate = addDays(currentDate, interval);
        break;
      case 'weekly':
        currentDate = addWeeks(currentDate, interval);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, interval);
        break;
      case 'yearly':
        currentDate = addYears(currentDate, interval);
        break;
    }

    index++;
  }

  return occurrences;
}

/**
 * Verifica se uma data deve ser incluída na recorrência
 */
function shouldIncludeDate(date: Date, recurrence: RecurringAppointmentFormData['recurrence']): boolean {
  // Para recorrência semanal, verificar dia da semana
  if (recurrence.type === 'weekly' && recurrence.daysOfWeek) {
    return recurrence.daysOfWeek.includes(date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6);
  }

  // Para recorrência mensal por dia do mês
  if (recurrence.type === 'monthly' && recurrence.dayOfMonth) {
    return date.getDate() === recurrence.dayOfMonth;
  }

  return true;
}

// =====================================================================
// HOOKS
// =====================================================================

/**
 * Hook para buscar séries recorrentes
 */
export function useRecurringSeries(params?: {
  organization_id?: string;
  patient_id?: string;
  is_active?: boolean;
}) {
  return useQuery({
    queryKey: [...RECURRING_QUERY_KEYS.series(), params],
    queryFn: () => fetchRecurringSeries(params),
  });
}

/**
 * Hook para buscar uma série específica
 */
export function useRecurringSeries(id: string) {
  return useQuery({
    queryKey: RECURRING_QUERY_KEYS.seriesById(id),
    queryFn: () => fetchRecurringSeriesById(id),
    enabled: !!id,
  });
}

/**
 * Hook para buscar ocorrências de uma série
 */
export function useSeriesOccurrences(seriesId: string) {
  return useQuery({
    queryKey: RECURRING_QUERY_KEYS.occurrences(seriesId),
    queryFn: () => fetchSeriesOccurrences(seriesId),
    enabled: !!seriesId,
  });
}

/**
 * Hook para criar uma nova série recorrente
 */
export function useCreateRecurringSeries() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (formData: RecurringAppointmentFormData): Promise<CreateSeriesResult> => {
      if (!user) throw new Error('Usuário não autenticado');

      // Gerar previews de ocorrências
      const previews = generateOccurrencesPreview(formData);

      // Criar a série
      const seriesData = {
        patient_id: formData.patient_id,
        therapist_id: formData.therapist_id,
        service_id: formData.service_id,
        room_id: formData.room_id,

        // Configuração de recorrência
        recurrence_type: formData.recurrence.type,
        recurrence_interval: formData.recurrence.interval,
        recurrence_days_of_week: formData.recurrence.daysOfWeek,
        recurrence_day_of_month: formData.recurrence.dayOfMonth,
        recurrence_week_of_month: formData.recurrence.weekOfMonth,

        // Condição de fim
        recurrence_end_type: formData.recurrence.endType,
        recurrence_end_date: formData.recurrence.endDate?.toISOString().split('T')[0],
        recurrence_max_occurrences: formData.recurrence.maxOccurrences,

        // Configuração do appointment
        appointment_date: formData.firstDate.toISOString().split('T')[0],
        appointment_time: formData.time,
        duration: formData.duration,
        appointment_type: formData.type,
        notes: formData.notes,

        // Opções
        auto_confirm: formData.auto_confirm,

        // Metadados
        created_by: user.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
      };

      const seriesRef = await addDoc(collection(db, 'recurring_appointment_series'), seriesData);
      const series = { id: seriesRef.id, ...seriesData };

      // Criar ocorrências
      const occurrences = previews.map((preview) => ({
        series_id: series.id,
        occurrence_date: preview.date.toISOString().split('T')[0],
        occurrence_time: preview.time,
        status: 'scheduled' as const,
        created_at: new Date().toISOString(),
      }));

      const createdOccurrences = await Promise.all(
        occurrences.map(occ => addDoc(collection(db, 'recurring_appointment_occurrences'), occ))
      );

      return {
        series,
        occurrences: createdOccurrences.map(ref => ({ id: ref.id, ...occ })),
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: RECURRING_QUERY_KEYS.series() });

      toast({
        title: '✅ Série recorrente criada',
        description: `${data.occurrences.length} agendamentos criados com sucesso.`,
      });
    },
    onError: (error) => {
      logger.error('Erro ao criar série recorrente', error, 'useRecurringAppointments');
      toast({
        title: '❌ Erro ao criar série',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook para atualizar uma série recorrente
 */
export function useUpdateRecurringSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RecurringAppointmentFormData> }) => {
      const docRef = doc(db, 'recurring_appointment_series', id);
      const updateData = {
        patient_id: updates.patient_id,
        therapist_id: updates.therapist_id,
        service_id: updates.service_id,
        room_id: updates.room_id,
        notes: updates.notes,
        auto_confirm: updates.auto_confirm,
        updated_at: new Date().toISOString(),
      };

      await updateDoc(docRef, updateData);

      const docSnap = await getDoc(docRef);
      return { id, ...docSnap.data() };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: RECURRING_QUERY_KEYS.series() });
      queryClient.invalidateQueries({ queryKey: RECURRING_QUERY_KEYS.seriesById(data.id) });

      toast({
        title: '✅ Série atualizada',
        description: 'As configurações foram atualizadas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: '❌ Erro ao atualizar série',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook para cancelar uma série recorrente
 */
export function useCancelRecurringSeries() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const docRef = doc(db, 'recurring_appointment_series', id);
      await updateDoc(docRef, {
        is_active: false,
        canceled_at: new Date().toISOString(),
        canceled_by: user.uid,
        cancel_reason: reason,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return { id, ...docSnap.data() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_QUERY_KEYS.series() });
      queryClient.invalidateQueries({ queryKey: RECURRING_QUERY_KEYS.active() });

      toast({
        title: '✅ Série cancelada',
        description: 'A série recorrente foi cancelada. Agendamentos futuros não serão criados.',
      });
    },
    onError: (error) => {
      toast({
        title: '❌ Erro ao cancelar série',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook para cancelar uma ocorrência específica
 */
export function useCancelOccurrence() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ occurrenceId, reason }: { occurrenceId: string; reason?: string }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const docRef = doc(db, 'recurring_appointment_occurrences', occurrenceId);
      await updateDoc(docRef, {
        status: 'cancelled',
        canceled_at: new Date().toISOString(),
        canceled_by: user.uid,
      });

      const docSnap = await getDoc(docRef);
      const occurrenceData = { id: occurrenceId, ...docSnap.data() };

      // Se existe appointment vinculado, cancelar também
      if (occurrenceData.appointment_id) {
        const appointmentRef = doc(db, 'appointments', occurrenceData.appointment_id);
        await updateDoc(appointmentRef, {
          status: 'cancelado',
          cancel_reason: reason || 'Cancelado via recorrência',
        });
      }

      return occurrenceData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_QUERY_KEYS.occurrences() });

      toast({
        title: '✅ Ocorrência cancelada',
        description: 'O agendamento foi cancelado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: '❌ Erro ao cancelar ocorrência',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook para modificar uma ocorrência individual
 */
export function useModifyOccurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ occurrenceId, modifications }: {
      occurrenceId: string;
      modifications: {
        duration?: number;
        notes?: string;
        time?: string;
        room_id?: string;
      };
    }) => {
      const docRef = doc(db, 'recurring_appointment_occurrences', occurrenceId);
      const updateData = {
        ...modifications,
        updated_at: new Date().toISOString(),
      };

      await updateDoc(docRef, updateData);

      const docSnap = await getDoc(docRef);
      const data = { id: occurrenceId, ...docSnap.data() };

      // Se existe appointment vinculado, atualizar também
      if (data.appointment_id) {
        const appointmentRef = doc(db, 'appointments', data.appointment_id);
        await updateDoc(appointmentRef, {
          ...modifications,
          time: modifications.time || data.occurrence_time,
          duration: modifications.duration || data.modified_duration || 60,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_QUERY_KEYS.occurrences() });

      toast({
        title: '✅ Ocorrência modificada',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: '❌ Erro ao modificar ocorrência',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// =====================================================================
// EXPORTS
// =====================================================================

export default {
  useRecurringSeries,
  useRecurringSeries,
  useSeriesOccurrences,
  useCreateRecurringSeries,
  useUpdateRecurringSeries,
  useCancelRecurringSeries,
  useCancelOccurrence,
  useModifyOccurrence,
  generateOccurrencesPreview,
};
