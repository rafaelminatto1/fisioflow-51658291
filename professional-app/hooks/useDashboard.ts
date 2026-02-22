import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { getDashboardStats } from '@/lib/api';

export function useDashboardStats() {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: ['dashboardStats', user?.organizationId],
    queryFn: () => getDashboardStats(user?.organizationId),
    enabled: !!user?.organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
