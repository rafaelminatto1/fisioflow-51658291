import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2";

export interface RevenueForecast {
  upcoming_appointments: number;
  avg_ticket: number;
  realized_revenue_mtd: number;
  forecast_remaining: number;
  total_month_estimate: number;
  by_day: Array<{ day: string; count_by_day: number }>;
}

export function useRevenueForecast() {
  return useQuery<RevenueForecast>({
    queryKey: ["revenue-forecast"],
    queryFn: async () => {
      const res = await request<{ data: RevenueForecast }>("/api/clinic-metrics/revenue-forecast");
      return (res as { data: RevenueForecast }).data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
