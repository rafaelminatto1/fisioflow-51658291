import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2";

export interface TherapistKPI {
  therapist_id: string;
  therapist_name: string;
  avatar_url: string | null;
  completed: number;
  no_show: number;
  cancelled: number;
  total_slots: number;
  occupancy_rate: number;
  no_show_rate: number;
  revenue: number;
  avg_ticket: number;
  unique_patients: number;
}

export interface TeamPerformanceKPIs {
  period: { start: string; end: string };
  therapists: TherapistKPI[];
}

export function useTeamPerformanceKPIs(month?: string) {
  const params = month ? `?month=${month}` : "";
  return useQuery<TeamPerformanceKPIs>({
    queryKey: ["team-performance-kpis", month ?? "current"],
    queryFn: async () => {
      const res = await request<{ data: TeamPerformanceKPIs }>(
        `/api/clinic-metrics/team-performance${params}`,
      );
      return (res as { data: TeamPerformanceKPIs }).data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
