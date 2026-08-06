import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { getDashboardStats } from "@/lib/api";

export interface DashboardStats {
  activePatients: number;
  todayAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
}

export function useDashboardStats() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["dashboardStats", user?.organizationId],
    queryFn: () => getDashboardStats(),
    enabled: !!user?.organizationId,
    staleTime: 1000 * 60 * 5,
  });
}
