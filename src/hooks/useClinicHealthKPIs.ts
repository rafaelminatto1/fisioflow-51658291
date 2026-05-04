import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2";

export interface ClinicKPIs {
  period: { start: string; end: string };
  appointments: {
    total: number;
    completed: number;
    no_show: number;
    cancelled: number;
    upcoming: number;
  };
  occupancy_rate: number;
  no_show_rate: number;
  cancellation_rate: number;
  avg_ticket: number;
  total_revenue: number;
  active_patients: number;
  at_risk_patients: number;
  ltv_estimate: number;
  avg_sessions_per_patient_6m: number;
}

export function useClinicHealthKPIs(month?: string) {
  const params = month ? `?month=${month}` : "";
  return useQuery<ClinicKPIs>({
    queryKey: ["clinic-health-kpis", month ?? "current"],
    queryFn: async () => {
      const res = await request<{ data: ClinicKPIs }>(`/api/clinic-metrics/kpis${params}`);
      return (res as { data: ClinicKPIs }).data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
