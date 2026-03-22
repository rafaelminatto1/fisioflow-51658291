import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { getDashboardStats } from '@/lib/api';

export function useDashboardStats() {
  const { user } = useAuthStore();
  
  console.log('[useDashboardStats] user:', user?.id, 'organizationId:', user?.organizationId);
  
  return useQuery({
    queryKey: ['dashboardStats', user?.organizationId],
    queryFn: async () => {
      console.log('[useDashboardStats] Fetching dashboard stats for org:', user?.organizationId);
      try {
        const result = await getDashboardStats(user?.organizationId);
        console.log('[useDashboardStats] Result:', result);
        return result;
      } catch (error) {
        console.error('[useDashboardStats] Error:', error);
        // Fallback data so the app doesn't crash if the backend fails (e.g. DATABASE_ERROR)
        return {
          activePatients: 0,
          todayAppointments: 0,
          pendingAppointments: 0,
          completedAppointments: 0,
        };
      }
    },
    enabled: !!user?.organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
