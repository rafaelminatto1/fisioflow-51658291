import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export function usePatientActivitySummary() {
  return useQuery({
    queryKey: ["patient-activity-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_activity_summary")
        .select("*");

      if (error) throw error;
      return data as PatientActivitySummary[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useFinancialSummary() {
  return useQuery({
    queryKey: ["financial-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_summary")
        .select("*");

      if (error) throw error;
      return data as FinancialSummary[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useNewPatientsByPeriod() {
  return useQuery({
    queryKey: ["new-patients-by-period"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("new_patients_by_period")
        .select("*");

      if (error) throw error;
      return data as NewPatientsByPeriod[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDailyMetrics(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["daily-metrics", startDate, endDate],
    queryFn: async () => {
      let query = supabase.from("daily_metrics").select("*");

      if (startDate) {
        query = query.gte("metric_date", startDate);
      }
      if (endDate) {
        query = query.lte("metric_date", endDate);
      }

      const { data, error } = await query.order("metric_date", { ascending: false });

      if (error) throw error;
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
