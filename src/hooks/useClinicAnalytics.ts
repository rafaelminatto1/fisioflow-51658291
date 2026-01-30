/**
 * Hooks para analytics e métricas da clínica - Migrated to Firebase
 * @module hooks/useClinicAnalytics
 *
 * Migration from Supabase to Firebase Firestore:
 * - appointments -> appointments collection
 * - patients -> patients collection
 * - payments -> payments collection
 * - profiles -> profiles collection (already on Firestore)
 * - Auth through useAuth() from AuthContext
 */

import { useQuery } from '@tanstack/react-query';
import { subDays, subMonths, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { db } from '@/integrations/firebase/app';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
} from 'firebase/firestore';
import {
  generateDashboardMetrics,
  generateTrendData,
  ClinicDashboardMetrics,
  TrendData,
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

// ============================================================================
// TYPES
// ============================================================================

interface FirestoreDoc {
  id: string;
  [key: string]: unknown;
}

interface Appointment {
  id: string;
  patient_id?: string;
  therapist_id?: string;
  date: string;
  time?: string;
  status: string;
  [key: string]: unknown;
}

interface Patient {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  created_at?: string;
  last_appointment?: string;
  [key: string]: unknown;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  status: string;
  [key: string]: unknown;
}

interface Profile {
  id: string;
  full_name?: string;
  email?: string;
  [key: string]: unknown;
}

interface LastAppointmentInfo {
  patientId: string;
  lastAppointment: string | null;
}

// Helper to convert doc with generic type
const convertDoc = <T extends Record<string, unknown>>(doc: { id: string; data: () => T }): T & { id: string } => ({
  id: doc.id,
  ...doc.data()
});

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
      const [appointmentsSnap, patientsSnap, profilesSnap, paymentsSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'appointments'),
          where('date', '>=', start.toISOString()),
          where('date', '<=', end.toISOString())
        )),
        getDocs(query(collection(db, 'patients'), orderBy('created_at', 'desc'))),
        getDocs(collection(db, 'profiles')),
        getDocs(query(
          collection(db, 'payments'),
          where('date', '>=', start.toISOString()),
          where('date', '<=', end.toISOString())
        )),
      ]);

      const appointments = appointmentsSnap.docs.map(convertDoc);
      const patients = patientsSnap.docs.map(convertDoc);
      const profiles = profilesSnap.docs.map(convertDoc);
      const payments = paymentsSnap.docs.map(convertDoc);

      // Get last appointment date for each patient
      const patientIds = (patients as Patient[]).map((p) => p.id);
      const lastAppointments = await Promise.all(
        patientIds.map(async (patientId: string) => {
          const aptSnap = await getDocs(query(
            collection(db, 'appointments'),
            where('patient_id', '==', patientId),
            where('status', '==', 'atendido'),
            orderBy('date', 'desc'),
            // Note: Firebase doesn't have limit(1) with getDocs, so we take first from results
          ));

          return {
            patientId,
            lastAppointment: aptSnap.docs[0]?.data()?.date || null,
          };
        })
      );

      const patientsWithLastAppointment = (patients as Patient[]).map((p) => ({
        ...p,
        last_appointment: lastAppointments.find((la) => la.patientId === p.id)?.lastAppointment || undefined,
      }));

      return generateDashboardMetrics(
        appointments || [],
        patientsWithLastAppointment || [],
        profiles || [],
        payments || [],
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

      const snap = await getDocs(query(
        collection(db, 'appointments'),
        where('date', '>=', start.toISOString()),
        where('date', '<=', end.toISOString())
      ));

      const appointments = snap.docs.map(convertDoc) || [];
      const completedAppointments = appointments
        .filter((a) => a.status === 'completed')
        .map((a) => ({ date: a.date, value: 1 }));

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

      const snap = await getDocs(query(
        collection(db, 'payments'),
        where('date', '>=', start.toISOString()),
        where('date', '<=', end.toISOString()),
        where('status', '==', 'paid')
      ));

      const payments = snap.docs.map(convertDoc) || [];
      const paymentData = payments.map((p) => ({ date: p.date, value: p.amount }));

      return generateTrendData(paymentData, start, end, groupBy);
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

      const snap = await getDocs(query(
        collection(db, 'patients'),
        where('created_at', '>=', start.toISOString()),
        where('created_at', '<=', end.toISOString())
      ));

      const newPatients = snap.docs.map(doc => ({
        date: doc.data().created_at || '',
        value: 1
      }));

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
      const [currentSnap, previousSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'appointments'),
          where('date', '>=', currentStart.toISOString()),
          where('date', '<=', end.toISOString())
        )),
        getDocs(query(
          collection(db, 'appointments'),
          where('date', '>=', previousStart.toISOString()),
          where('date', '<=', previousEnd.toISOString())
        )),
      ]);

      const currentTotal = currentSnap.size;
      const previousTotal = previousSnap.size;

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
        const snap = await getDocs(query(
          collection(db, 'appointments'),
          where('date', '>=', start.toISOString()),
          where('date', '<=', end.toISOString()),
          where('status', '==', 'completed')
        ));

        const appointments = snap.docs.map(convertDoc);

        // Fetch profile names from Firestore
        const therapistIds = [...new Set(appointments.map((apt) => apt.therapist_id as string | undefined).filter((id): id is string => id !== undefined))];
        const profileNames = new Map<string, string>();

        await Promise.all(therapistIds.map(async (id) => {
          const profSnap = await getDoc(doc(db, 'profiles', id));
          if (profSnap.exists()) {
            profileNames.set(id, profSnap.data().full_name as string);
          }
        }));

        const counts = new Map<string, { name: string; count: number }>();
        appointments.forEach((apt) => {
          const therapistId = apt.therapist_id as string | undefined;
          if (!therapistId) return;

          const name = profileNames.get(therapistId) || 'Unknown';
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
        // Revenue by therapist - requires payment appointments to have therapist_id
        const snap = await getDocs(query(
          collection(db, 'payments'),
          where('date', '>=', start.toISOString()),
          where('date', '<=', end.toISOString()),
          where('status', '==', 'paid')
        ));

        const payments = snap.docs.map(convertDoc);

        // Note: Need to join with appointments to get therapist_id
        // This is simplified - in production you'd structure this differently
        return [];
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// =====================================================================
// EXPORTS
// =====================================================================

export default useDashboardMetrics;
