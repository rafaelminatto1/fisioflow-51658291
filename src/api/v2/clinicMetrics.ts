import { request } from "./base";

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
  cac: number;
  payback: number;
  new_patients: number;
  marketing_spend: number;
  ltv_cac_ratio: number;
  avg_sessions_per_patient_6m: number;
}

export const clinicMetricsApi = {
  getKPIs: (params?: { month?: string }) => {
    const qs = params?.month ? `?month=${encodeURIComponent(params.month)}` : "";
    return request<{ data: ClinicKPIs }>(`/api/clinic-metrics/kpis${qs}`);
  },
  getOverduePayments: () =>
    request<{
      data: Array<{
        patient_id: string;
        full_name: string;
        phone: string;
        whatsapp: string;
        last_session_date: string;
        total_unpaid: number;
        unpaid_count: number;
      }>;
    }>("/api/clinic-metrics/overdue-payments"),
};
