import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/lib/api';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => getDashboardStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
