/**
 * Hook customizado para gerenciar agendamentos recorrentes
 * @module hooks/useRecurringAppointments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  RecurringAppointmentSeries,
  RecurringAppointmentOccurrence,
  RecurringAppointmentFormData,
  OccurrencePreview,
  CreateSeriesResult,
} from '@/types/recurring-appointment';
import { addDays, addWeeks, addMonths, addYears, startOfDay, isSameDay } from 'date-fns';

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
  let query = supabase
    .from('recurring_appointment_series')
    .select(`
      *,
      patient:patients(id, full_name, email, phone),
      therapist:profiles!inner(id, full_name)
    `);

  if (params?.organization_id) {
    query = query.eq('organization_id', params.organization_id);
  }

  if (params?.patient_id) {
    query = query.eq('patient_id', params.patient_id);
  }

  if (params?.is_active !== undefined) {
    query = query.eq('is_active', params.is_active);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Busca uma série específica com estatísticas
 */
async function fetchRecurringSeriesById(
  id: string
): Promise<RecurringAppointmentSeries | null> {
  const { data, error } = await supabase
    .from('recurring_appointment_series')
    .select(`
      *,
      patient:patients(id, full_name, email, phone),
      therapist:profiles(id, full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

/**
 * Busca ocorrências de uma série
 */
async function fetchSeriesOccurrences(
  seriesId: string
): Promise<RecurringAppointmentOccurrence[]> {
  const { data, error } = await supabase
    .from('recurring_appointment_occurrences')
    .select('*')
    .eq('series_id', seriesId)
    .order('occurrence_date', { ascending: true });

  if (error) throw error;
  return data || [];
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
    return recurrence.daysOfWeek.includes(date.getDay() as any);
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

  return useMutation({
    mutationFn: async (formData: RecurringAppointmentFormData): Promise<CreateSeriesResult> => {
      // Gerar previews de ocorrências
      const previews = generateOccurrencesPreview(formData);

      // Criar a série
      const { data: series, error: seriesError } = await supabase
        .from('recurring_appointment_series')
        .insert({
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
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (seriesError) throw seriesError;

      // Criar ocorrências
      const occurrences = previews.map((preview) => ({
        series_id: series.id,
        occurrence_date: preview.date.toISOString().split('T')[0],
        occurrence_time: preview.time,
        status: 'scheduled' as const,
      }));

      const { data: createdOccurrences, error: occurrencesError } = await supabase
        .from('recurring_appointment_occurrences')
        .insert(occurrences)
        .select();

      if (occurrencesError) throw occurrencesError;

      return {
        series,
        occurrences: createdOccurrences || [],
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
      console.error('Erro ao criar série recorrente:', error);
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
      const { data, error } = await supabase
        .from('recurring_appointment_series')
        .update({
          patient_id: updates.patient_id,
          therapist_id: updates.therapist_id,
          service_id: updates.service_id,
          room_id: updates.room_id,
          notes: updates.notes,
          auto_confirm: updates.auto_confirm,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
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

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error } = await supabase
        .from('recurring_appointment_series')
        .update({
          is_active: false,
          canceled_at: new Date().toISOString(),
          canceled_by: userId,
          cancel_reason: reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
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

  return useMutation({
    mutationFn: async ({ occurrenceId, reason }: { occurrenceId: string; reason?: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Cancelar ocorrência
      const { data, error } = await supabase
        .from('recurring_appointment_occurrences')
        .update({
          status: 'cancelled',
          canceled_at: new Date().toISOString(),
          canceled_by: userId,
        })
        .eq('id', occurrenceId)
        .select(`
          *,
          appointment:appointments(id, patient_id, date, time)
        `)
        .single();

      if (error) throw error;

      // Se existe appointment vinculado, cancelar também
      if (data.appointment_id) {
        await supabase
          .from('appointments')
          .update({
            status: 'cancelado',
            cancel_reason: reason || 'Cancelado via recorrência',
          })
          .eq('id', data.appointment_id);
      }

      return data;
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
      const { data, error } = await supabase
        .from('recurring_appointment_occurrences')
        .update({
          ...modifications,
          updated_at: new Date().toISOString(),
        })
        .eq('id', occurrenceId)
        .select()
        .single();

      if (error) throw error;

      // Se existe appointment vinculado, atualizar também
      if (data.appointment_id) {
        await supabase
          .from('appointments')
          .update({
            ...modifications,
            time: modifications.time || data.occurrence_time,
            duration: modifications.duration || data.modified_duration || 60,
          })
          .eq('id', data.appointment_id);
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
