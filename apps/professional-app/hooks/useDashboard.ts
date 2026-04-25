import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { getDashboardStats } from "@/lib/api";

export interface DashboardStats {
  activePatients: number;
  todayAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
}

const EMPTY_STATS: DashboardStats = {
  activePatients: 0,
  todayAppointments: 0,
  pendingAppointments: 0,
  completedAppointments: 0,
};

export function useDashboardStats() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["dashboardStats", user?.organizationId],
    queryFn: () => getDashboardStats(user?.organizationId),
    enabled: !!user?.organizationId,
    staleTime: 1000 * 60 * 5,
    placeholderData: EMPTY_STATS,
  });
}
