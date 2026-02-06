/**
 * useAnalytics - Migrated to Firebase
 */

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query as firestoreQuery, where, orderBy, limit, db } from '@/integrations/firebase/app';

export interface PatientActivitySummary {
  id: string;
  name: string;
  organization_id: string;
  created_at: string;
  status: string;
  last_appointment_date: string | null;
  total_completed_sessions: number;
  sessions_available: number;
  activity_status: "active" | "inactive" | "dormant";
}

export interface FinancialSummary {
  month: string;
  organization_id: string;
  total_appointments: number;
  paid_appointments: number;
  total_revenue: number;
  pending_revenue: number;
  unique_patients: number;
}

export interface NewPatientsByPeriod {
  week_start: string;
  organization_id: string;
  new_patients: number;
}

export interface DailyMetrics {
  id: string;
  metric_date: string;
  total_patients: number;
  active_patients: number;
  inactive_patients: number;
  new_patients: number;
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  no_show_appointments: number;
  total_revenue: number;
  paid_amount: number;
  pending_amount: number;
  sessions_available: number;
  sessions_used: number;
}

// Helper function to convert Firestore doc to type
const convertDoc = <T>(doc: { id: string; data: () => Record<string, unknown> }): T => {
  return { id: doc.id, ...doc.data() } as T;
};

export function usePatientActivitySummary() {
  return useQuery({
    queryKey: ["patient-activity-summary"],
    queryFn: async () => {
      const q = firestoreQuery(collection(db, "patient_activity_summary"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => convertDoc<PatientActivitySummary>(doc));
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useFinancialSummary() {
  return useQuery({
    queryKey: ["financial-summary"],
    queryFn: async () => {
      const q = firestoreQuery(collection(db, "financial_summary"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => convertDoc<FinancialSummary>(doc));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useNewPatientsByPeriod() {
  return useQuery({
    queryKey: ["new-patients-by-period"],
    queryFn: async () => {
      const q = firestoreQuery(collection(db, "new_patients_by_period"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => convertDoc<NewPatientsByPeriod>(doc));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDailyMetrics(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["daily-metrics", startDate, endDate],
    queryFn: async () => {
      const q = firestoreQuery(collection(db, "daily_metrics"));

      // Note: Firestore requires composite indexes for multiple range queries
      // For now, we'll fetch all and filter on the client side
      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(doc => convertDoc<DailyMetrics>(doc));

      // Filter by date range if provided
      if (startDate) {
        data = data.filter((m: DailyMetrics) => m.metric_date >= startDate);
      }
      if (endDate) {
        data = data.filter((m: DailyMetrics) => m.metric_date <= endDate);
      }

      // Sort by date descending
      data.sort((a: DailyMetrics, b: DailyMetrics) =>
        b.metric_date.localeCompare(a.metric_date)
      );

      return data as DailyMetrics[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Métricas agregadas calculadas no frontend
export function useAnalyticsSummary() {
  const { data: patientActivity, isLoading: loadingPatients } = usePatientActivitySummary();
  const { data: financialData, isLoading: loadingFinancial } = useFinancialSummary();
  const { data: newPatients, isLoading: loadingNewPatients } = useNewPatientsByPeriod();

  const summary = {
    // Pacientes
    totalPatients: patientActivity?.length ?? 0,
    activePatients: patientActivity?.filter((p) => p.activity_status === "active").length ?? 0,
    inactivePatients: patientActivity?.filter((p) => p.activity_status === "inactive").length ?? 0,
    dormantPatients: patientActivity?.filter((p) => p.activity_status === "dormant").length ?? 0,
    patientsWithSessions: patientActivity?.filter((p) => p.sessions_available > 0).length ?? 0,
    totalSessionsAvailable: patientActivity?.reduce((acc, p) => acc + p.sessions_available, 0) ?? 0,

    // Financeiro (último mês)
    currentMonthRevenue: financialData?.[0]?.total_revenue ?? 0,
    currentMonthPending: financialData?.[0]?.pending_revenue ?? 0,
    currentMonthAppointments: financialData?.[0]?.total_appointments ?? 0,

    // Novos pacientes (última semana)
    newPatientsThisWeek: newPatients?.[0]?.new_patients ?? 0,
    newPatientsThisMonth: newPatients?.slice(0, 4).reduce((acc, p) => acc + p.new_patients, 0) ?? 0,

    // Dados brutos para gráficos
    patientActivityData: patientActivity ?? [],
    financialTrend: financialData ?? [],
    newPatientsTrend: newPatients ?? [],
  };

  return {
    summary,
    isLoading: loadingPatients || loadingFinancial || loadingNewPatients,
  };
}
