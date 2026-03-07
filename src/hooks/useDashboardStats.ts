import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api/workers-client';

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  monthlyRevenue: number;
  activeTherapists: number;
  remainingAppointments: number;
  newPatients: number;
}

const DEFAULT_STATS: DashboardStats = {
  totalPatients: 0,
  todayAppointments: 0,
  monthlyRevenue: 0,
  activeTherapists: 0,
  remainingAppointments: 0,
  newPatients: 0,
};

export const useDashboardStats = () => {
  const query = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await analyticsApi.dashboard();
      const data = response?.data ?? {};

      return {
        totalPatients: data.activePatients ?? 0,
        todayAppointments: data.appointmentsToday ?? 0,
        monthlyRevenue: data.monthlyRevenue ?? 0,
        activeTherapists: data.activePatients ?? 0,
        remainingAppointments: 0,
        newPatients: 0,
      } as DashboardStats;
    },
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 15,
  });

  return {
    stats: query.data ?? DEFAULT_STATS,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
