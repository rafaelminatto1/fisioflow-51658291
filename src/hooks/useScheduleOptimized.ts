/**
 * useScheduleOptimized - Hook otimizado para carregar dados de agenda
 *
 * OTIMIZAÇÕES:
 * 1. Cache estratégico por período (dia, semana, mês)
 * 2. Prefetch de dias adjacentes
 * 3. Memoização de filtros e ordenação
 * 4. Virtualização para listas longas
 *
 * @version 2.0.0 - Performance Optimization
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback, useRef, useEffect } from 'react';
import { collection, query as firestoreQuery, where, orderBy, getDocs, limit } from '@/integrations/firebase/app';
import { startOfDay, endOfDay, addDays, subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos
export type ScheduleView = 'day' | 'week' | 'month' | 'list';
export type AppointmentStatus = 'agendado' | 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado' | 'nao_compareceu';

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name?: string;
  therapist_id?: string;
  appointment_date: string;
  appointment_time?: string;
  status: AppointmentStatus;
  type?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface ScheduleFilterOptions {
  therapistId?: string;
  status?: AppointmentStatus[];
  type?: string[];
  searchQuery?: string;
}

// Cache configuration
export const SCHEDULE_CACHE_CONFIG = {
  // Dados do dia atual - mudam frequentemente
  TODAY: {
    staleTime: 1000 * 60 * 1,      // 1 minuto
    gcTime: 1000 * 60 * 5,         // 5 minutos
  },
  // Dados de outros dias - mudam menos
  DAY: {
    staleTime: 1000 * 60 * 5,      // 5 minutos
    gcTime: 1000 * 60 * 15,        // 15 minutos
  },
  // Dados da semana
  WEEK: {
    staleTime: 1000 * 60 * 10,     // 10 minutos
    gcTime: 1000 * 60 * 30,        // 30 minutos
  },
  // Dados do mês
  MONTH: {
    staleTime: 1000 * 60 * 15,     // 15 minutos
    gcTime: 1000 * 60 * 45,        // 45 minutos
  },
  // Lista completa
  LIST: {
    staleTime: 1000 * 60 * 2,      // 2 minutos
    gcTime: 1000 * 60 * 10,        // 10 minutos
  },
} as const;

// Query keys factory
export const scheduleKeys = {
  all: ['schedule'] as const,
  lists: () => [...scheduleKeys.all, 'list'] as const,
  list: (filters: ScheduleFilterOptions & { view: ScheduleView; date?: string }) =>
    [...scheduleKeys.lists(), filters] as const,
  day: (date: string) => [...scheduleKeys.all, 'day', date] as const,
  week: (startDate: string, endDate: string) =>
    [...scheduleKeys.all, 'week', startDate, endDate] as const,
  month: (month: string) => [...scheduleKeys.all, 'month', month] as const,
  appointment: (id: string) => [...scheduleKeys.all, 'appointment', id] as const,
} as const;

/**
 * Hook para buscar agendamentos de um dia específico
 */
function useDayAppointments(date: Date, options?: ScheduleFilterOptions) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: scheduleKeys.day(dateStr),
    queryFn: async () => {
      let q = firestoreQuery(
        collection(window.db || collection(getDocs, 'appointments')._query.collection, 'appointments'),
        where('appointment_date', '==', dateStr),
        orderBy('appointment_time', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Appointment[];
    },
    staleTime: isToday ? SCHEDULE_CACHE_CONFIG.TODAY.staleTime : SCHEDULE_CACHE_CONFIG.DAY.staleTime,
    gcTime: isToday ? SCHEDULE_CACHE_CONFIG.TODAY.gcTime : SCHEDULE_CACHE_CONFIG.DAY.gcTime,
  });
}

/**
 * Hook para buscar agendamentos de uma semana
 */
function useWeekAppointments(startDate: Date, endDate: Date) {
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  return useQuery({
    queryKey: scheduleKeys.week(startStr, endStr),
    queryFn: async () => {
      // Para simplificar, buscar dia a dia (Firestore não tem between para datas)
      const dates = [];
      let current = startDate;
      while (current <= endDate) {
        dates.push(format(current, 'yyyy-MM-dd'));
        current = addDays(current, 1);
      }

      // Buscar em paralelo
      const results = await Promise.all(
        dates.map(dateStr =>
          getDocs(firestoreQuery(
            collection(window.db || collection(getDocs, 'appointments')._query.collection, 'appointments'),
            where('appointment_date', '==', dateStr),
            orderBy('appointment_time', 'asc')
          ))
        )
      );

      return results.flatMap(snapshot =>
        snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Appointment[]
      );
    },
    staleTime: SCHEDULE_CACHE_CONFIG.WEEK.staleTime,
    gcTime: SCHEDULE_CACHE_CONFIG.WEEK.gcTime,
  });
}

/**
 * Hook para buscar agendamentos de um mês
 */
function useMonthAppointments(month: string) {
  return useQuery({
    queryKey: scheduleKeys.month(month),
    queryFn: async () => {
      const q = firestoreQuery(
        collection(window.db || collection(getDocs, 'appointments')._query.collection, 'appointments'),
        where('appointment_date', '>=', `${month}-01`),
        where('appointment_date', '<=', `${month}-31`),
        orderBy('appointment_date', 'asc'),
        orderBy('appointment_time', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Appointment[];
    },
    staleTime: SCHEDULE_CACHE_CONFIG.MONTH.staleTime,
    gcTime: SCHEDULE_CACHE_CONFIG.MONTH.gcTime,
  });
}

/**
 * Hook principal para agenda otimizada
 */
export function useScheduleOptimized(options: {
  view: ScheduleView;
  date: Date;
  filters?: ScheduleFilterOptions;
  prefetchAdjacent?: boolean;
}) {
  const { view, date, filters, prefetchAdjacent = true } = options;
  const queryClient = useQueryClient();
  const prefetchedDatesRef = useRef<Set<string>>(new Set());

  // Buscar dados baseado na view
  const dayQuery = useDayAppointments(date, filters);
  const weekQuery = useWeekAppointments(
    startOfDay(date),
    endOfDay(addDays(date, 6))
  );
  const monthQuery = useMonthAppointments(format(date, 'yyyy-MM'));

  // Selecionar query ativa baseado na view
  const activeQuery = useMemo(() => {
    switch (view) {
      case 'day':
        return dayQuery;
      case 'week':
        return weekQuery;
      case 'month':
        return monthQuery;
      default:
        return dayQuery;
    }
  }, [view, dayQuery, weekQuery, monthQuery]);

  // Prefetch de dias adjacentes (background)
  useEffect(() => {
    if (!prefetchAdjacent || view !== 'day') return;

    const previousDay = format(subDays(date, 1), 'yyyy-MM-dd');
    const nextDay = format(addDays(date, 1), 'yyyy-MM-dd');

    const datesToPrefetch = [previousDay, nextDay].filter(
      d => !prefetchedDatesRef.current.has(d)
    );

    if (datesToPrefetch.length === 0) return;

    datesToPrefetch.forEach(d => prefetchedDatesRef.current.add(d));

    // Prefetch em background
    queryClient.prefetchQuery({
      queryKey: scheduleKeys.day(d),
      staleTime: SCHEDULE_CACHE_CONFIG.DAY.staleTime,
    });
  }, [date, view, prefetchAdjacent, queryClient]);

  // Aplicar filtros localmente (otimizado com useMemo)
  const filteredAppointments = useMemo(() => {
    let appointments = activeQuery.data || [];

    if (filters?.therapistId) {
      appointments = appointments.filter(a => a.therapist_id === filters.therapistId);
    }

    if (filters?.status && filters.status.length > 0) {
      appointments = appointments.filter(a => filters.status!.includes(a.status));
    }

    if (filters?.type && filters.type.length > 0) {
      appointments = appointments.filter(a => filters.type!.includes(a.type));
    }

    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      appointments = appointments.filter(a =>
        a.patient_name?.toLowerCase().includes(query) ||
        a.notes?.toLowerCase().includes(query)
      );
    }

    return appointments;
  }, [activeQuery.data, filters]);

  // Estatísticas do dia (memoizadas)
  const stats = useMemo(() => {
    const appointments = activeQuery.data || [];
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayAppointments = appointments.filter(a => a.appointment_date === today);

    return {
      total: appointments.length,
      today: todayAppointments.length,
      confirmed: todayAppointments.filter(a => a.status === 'confirmado').length,
      pending: todayAppointments.filter(a => a.status === 'agendado').length,
      completed: todayAppointments.filter(a => a.status === 'concluido').length,
      cancelled: todayAppointments.filter(a => a.status === 'cancelado').length,
    };
  }, [activeQuery.data]);

  // Callbacks estáveis
  const refetch = useCallback(() => {
    activeQuery.refetch();
  }, [activeQuery]);

  const prefetchDate = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    queryClient.prefetchQuery({
      queryKey: scheduleKeys.day(dateStr),
      staleTime: SCHEDULE_CACHE_CONFIG.DAY.staleTime,
    });
  }, [queryClient]);

  return {
    appointments: filteredAppointments,
    allAppointments: activeQuery.data || [],
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    stats,
    refetch,
    prefetchDate,
    queryKeys: scheduleKeys,
  };
}

/**
 * Hook para virtualização de lista longa de agendamentos
 */
export function useVirtualizedSchedule(options: {
  date: Date;
  limit?: number;
}) {
  const { date, limit = 50 } = options;

  const query = useQuery({
    queryKey: ['schedule', 'virtualized', format(date, 'yyyy-MM-dd'), limit],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(window.db || collection(getDocs, 'appointments')._query.collection, 'appointments'),
        where('appointment_date', '>=', format(date, 'yyyy-MM-dd')),
        orderBy('appointment_date', 'asc'),
        orderBy('appointment_time', 'asc'),
        limit(limit)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Appointment[];
    },
    staleTime: SCHEDULE_CACHE_CONFIG.LIST.staleTime,
    gcTime: SCHEDULE_CACHE_CONFIG.LIST.gcTime,
  });

  return {
    appointments: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    hasMore: (query.data?.length || 0) >= limit,
    refetch: query.refetch,
  };
}
