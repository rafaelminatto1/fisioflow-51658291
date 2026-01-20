/**
 * Hooks para analytics e métricas da clínica
 * @module hooks/useClinicAnalytics
 */

import { useQuery } from '@tanstack/react-query';
import { subDays, subMonths, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  generateDashboardMetrics,
  generateTrendData,
  ClinicDashboardMetrics,
  TrendData,
  AppointmentMetrics,
  RevenueMetrics,
  PatientMetrics,
} from '@/lib/analytics/clinic-metrics';

// =====================================================================
// CONFIG
// =====================================================================

const BUSINESS_HOURS = {
  start: 7,
  end: 21,
  slotDuration: 30,
} as const;

const QUERY_KEYS = {
  all: ['analytics'] as const,
  dashboard: (period: string) => [...QUERY_KEYS.all, 'dashboard', period] as const,
  trends: (period: string, metric: string) => [...QUERY_KEYS.all, 'trends', period, metric] as const,
};

// =====================================================================
// HOOK: DASHBOARD METRICS
// =====================================================================

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface DashboardMetricsOptions {
  period?: PeriodType;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Hook para obter métricas do dashboard
 */
export function useDashboardMetrics(options: DashboardMetricsOptions = {}) {
  const { period = 'month', startDate, endDate } = options;

  return useQuery({
    queryKey: QUERY_KEYS.dashboard(period),
    queryFn: async (): Promise<ClinicDashboardMetrics> => {
      // Calculate date range
      let start: Date;
      let end: Date;

      if (startDate && endDate) {
        start = startOfDay(startDate);
        end = endOfDay(endDate);
      } else {
        end = new Date();
        switch (period) {
          case 'today':
            start = startOfDay(end);
            break;
          case 'week':
            start = startOfWeek(end, { weekStartsOn: 1 });
            break;
          case 'month':
            start = startOfMonth(end);
            break;
          case 'quarter':
            start = subMonths(end, 3);
            break;
          case 'year':
            start = subMonths(end, 12);
            break;
          default:
            start = startOfMonth(end);
        }
      }

      // Fetch all data in parallel
      const [appointmentsResult, patientsResult, therapistsResult, paymentsResult] = await Promise.all([
        supabase
          .from('appointments')
          .select('date, time, status, duration, therapist_id, amount')
          .gte('date', start.toISOString())
          .lte('date', end.toISOString()),
        supabase
          .from('patients')
          .select('id, created_at, full_name, status')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, full_name, status')
          .not('status', 'is', null),
        supabase
          .from('payments')
          .select('id, date, amount, status, appointment_id')
          .gte('date', start.toISOString())
          .lte('date', end.toISOString()),
      ]);

      if (appointmentsResult.error) throw appointmentsResult.error;
      if (patientsResult.error) throw patientsResult.error;
      if (therapistsResult.error) throw therapistsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      // Get last appointment date for each patient
      const patientIds = patientsResult.data?.map(p => p.id) || [];
      const lastAppointments = await Promise.all(
        patientIds.map(async (patientId) => {
          const { data } = await supabase
            .from('appointments')
            .select('date')
            .eq('patient_id', patientId)
            .eq('status', 'atendido')
            .order('date', { ascending: false })
            .limit(1)
            .single();

          return {
            patientId,
            lastAppointment: data?.date || null,
          };
        })
      );

      const patientsWithLastAppointment = patientsResult.data?.map(p => ({
        ...p,
        last_appointment: lastAppointments.find(la => la.patientId === p.id)?.lastAppointment || undefined,
      })) || [];

      return generateDashboardMetrics(
        appointmentsResult.data || [],
        patientsWithLastAppointment,
        therapistsResult.data || [],
        paymentsResult.data || [],
        start,
        end,
        BUSINESS_HOURS
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

// =====================================================================
// HOOK: APPOINTMENT TRENDS
// =====================================================================

interface TrendsOptions {
  period?: PeriodType;
  groupBy?: 'day' | 'week' | 'month';
}

/**
 * Hook para obter tendências de agendamentos
 */
export function useAppointmentTrends(options: TrendsOptions = {}) {
  const { period = 'month', groupBy = 'day' } = options;

  return useQuery({
    queryKey: QUERY_KEYS.trends(period, 'appointments'),
    queryFn: async (): Promise<TrendData[]> => {
      const end = new Date();
      let start: Date;

      switch (period) {
        case 'today':
          start = startOfDay(end);
          break;
        case 'week':
          start = startOfWeek(end, { weekStartsOn: 1 });
          break;
        case 'month':
          start = startOfMonth(end);
          break;
        case 'quarter':
          start = subMonths(end, 3);
          break;
        case 'year':
          start = subMonths(end, 12);
          break;
        default:
          start = startOfMonth(end);
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('date, status')
        .gte('date', start.toISOString())
        .lte('date', end.toISOString());

      if (error) throw error;

      const completedAppointments = (data || [])
        .filter(a => a.status === 'completed')
        .map(a => ({ date: a.date, value: 1 }));

      return generateTrendData(completedAppointments, start, end, groupBy);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// =====================================================================
// HOOK: REVENUE TRENDS
// =====================================================================

/**
 * Hook para obter tendências de receita
 */
export function useRevenueTrends(options: TrendsOptions = {}) {
  const { period = 'month', groupBy = 'day' } = options;

  return useQuery({
    queryKey: QUERY_KEYS.trends(period, 'revenue'),
    queryFn: async (): Promise<TrendData[]> => {
      const end = new Date();
      let start: Date;

      switch (period) {
        case 'today':
          start = startOfDay(end);
          break;
        case 'week':
          start = startOfWeek(end, { weekStartsOn: 1 });
          break;
        case 'month':
          start = startOfMonth(end);
          break;
        case 'quarter':
          start = subMonths(end, 3);
          break;
        case 'year':
          start = subMonths(end, 12);
          break;
        default:
          start = startOfMonth(end);
      }

      const { data, error } = await supabase
        .from('payments')
        .select('date, amount, status')
        .gte('date', start.toISOString())
        .lte('date', end.toISOString())
        .eq('status', 'paid');

      if (error) throw error;

      const payments = (data || []).map(p => ({ date: p.date, value: p.amount }));

      return generateTrendData(payments, start, end, groupBy);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// =====================================================================
// HOOK: PATIENT TRENDS
// =====================================================================

/**
 * Hook para obter tendências de pacientes
 */
export function usePatientTrends(options: TrendsOptions = {}) {
  const { period = 'month', groupBy = 'day' } = options;

  return useQuery({
    queryKey: QUERY_KEYS.trends(period, 'patients'),
    queryFn: async (): Promise<TrendData[]> => {
      const end = new Date();
      let start: Date;

      switch (period) {
        case 'today':
          start = startOfDay(end);
          break;
        case 'week':
          start = startOfWeek(end, { weekStartsOn: 1 });
          break;
        case 'month':
          start = startOfMonth(end);
          break;
        case 'quarter':
          start = subMonths(end, 3);
          break;
        case 'year':
          start = subMonths(end, 12);
          break;
        default:
          start = startOfMonth(end);
      }

      const { data, error } = await supabase
        .from('patients')
        .select('created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const newPatients = (data || []).map(p => ({ date: p.created_at, value: 1 }));

      return generateTrendData(newPatients, start, end, groupBy);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// =====================================================================
// HOOK: COMPARISON METRICS
// =====================================================================

interface ComparisonMetricsOptions {
  currentPeriod: PeriodType;
}

/**
 * Hook para comparar métricas entre períodos
 */
export function useComparisonMetrics(options: ComparisonMetricsOptions) {
  const { currentPeriod = 'month' } = options;

  return useQuery({
    queryKey: ['analytics', 'comparison', currentPeriod],
    queryFn: async () => {
      const end = new Date();
      let currentStart: Date;
      let previousEnd: Date;
      let previousStart: Date;

      switch (currentPeriod) {
        case 'today':
          currentStart = startOfDay(end);
          previousEnd = subDays(currentStart, 1);
          previousStart = startOfDay(previousEnd);
          break;
        case 'week':
          currentStart = startOfWeek(end, { weekStartsOn: 1 });
          previousEnd = subDays(currentStart, 1);
          previousStart = startOfWeek(previousEnd, { weekStartsOn: 1 });
          break;
        case 'month':
          currentStart = startOfMonth(end);
          previousEnd = subDays(currentStart, 1);
          previousStart = startOfMonth(previousEnd);
          break;
        case 'quarter':
          currentStart = subMonths(end, 3);
          previousEnd = subDays(currentStart, 1);
          previousStart = subMonths(previousEnd, 3);
          break;
        case 'year':
          currentStart = subMonths(end, 12);
          previousEnd = subDays(currentStart, 1);
          previousStart = subMonths(previousEnd, 12);
          break;
        default:
          currentStart = startOfMonth(end);
          previousEnd = subDays(currentStart, 1);
          previousStart = startOfMonth(previousEnd);
      }

      // Fetch current period data
      const [currentResult, previousResult] = await Promise.all([
        supabase
          .from('appointments')
          .select('date, status')
          .gte('date', currentStart.toISOString())
          .lte('date', end.toISOString()),
        supabase
          .from('appointments')
          .select('date, status')
          .gte('date', previousStart.toISOString())
          .lte('date', previousEnd.toISOString()),
      ]);

      if (currentResult.error) throw currentResult.error;
      if (previousResult.error) throw previousResult.error;

      // Count appointments in each period
      const currentTotal = (currentResult.data || []).length;
      const previousTotal = (previousResult.data || []).length;

      const change = currentTotal - previousTotal;
      const changePercent = previousTotal > 0
        ? ((change / previousTotal) * 100)
        : 0;

      let trend: 'up' | 'down' | 'neutral' = 'neutral';
      if (changePercent > 5) trend = 'up';
      if (changePercent < -5) trend = 'down';

      return {
        current: currentTotal,
        previous: previousTotal,
        change,
        changePercent: Math.round(changePercent * 10) / 10,
        trend,
      };
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// =====================================================================
// HOOK: TOP PERFORMERS
// =====================================================================

interface TopPerformer {
  id: string;
  name: string;
  value: number;
  label: string;
}

/**
 * Hook para obter top performers
 */
export function useTopPerformers(metric: 'appointments' | 'revenue' = 'appointments') {
  return useQuery({
    queryKey: ['analytics', 'top-performers', metric],
    queryFn: async (): Promise<TopPerformer[]> => {
      const start = startOfMonth(new Date());
      const end = new Date();

      if (metric === 'appointments') {
        const { data, error } = await supabase
          .from('appointments')
          .select('therapist_id, profiles!appointments_therapist_id_fkey(full_name)')
          .gte('date', start.toISOString())
          .lte('date', end.toISOString())
          .eq('status', 'completed');

        if (error) throw error;

        const counts = new Map<string, { name: string; count: number }>();
        (data || []).forEach(apt => {
          const therapistId = apt.therapist_id;
          const name = (apt as any)['profiles!appointments_therapist_id_fkey']?.full_name || 'Unknown';
          const current = counts.get(therapistId) || { name, count: 0 };
          counts.set(therapistId, { ...current, count: current.count + 1 });
        });

        return Array.from(counts.entries())
          .map(([id, { name, count }]) => ({
            id,
            name,
            value: count,
            label: `${count} agendamentos`,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
      } else {
        // Revenue by therapist
        const { data, error } = await supabase
          .from('payments')
          .select('amount, appointment_id, appointments(therapist_id, profiles!appointments_therapist_id_fkey(full_name))')
          .gte('date', start.toISOString())
          .lte('date', end.toISOString())
          .eq('status', 'paid');

        if (error) throw error;

        const totals = new Map<string, { name: string; total: number }>();
        (data || []).forEach(payment => {
          const therapistId = payment.appointments?.therapist_id;
          const name = (payment.appointments as any)?.['profiles!appointments_therapist_id_fkey']?.full_name || 'Unknown';
          if (!therapistId) return;

          const current = totals.get(therapistId) || { name, total: 0 };
          totals.set(therapistId, {
            ...current,
            total: current.total + payment.amount,
          });
        });

        return Array.from(totals.entries())
          .map(([id, { name, total }]) => ({
            id,
            name,
            value: Math.round(total * 100) / 100,
            label: `R$ ${total.toFixed(2)}`,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// =====================================================================
// EXPORTS
// =====================================================================

export default useDashboardMetrics;
