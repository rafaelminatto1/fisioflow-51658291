import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@/lib/api';

export function useProgress() {
  return useQuery({
    queryKey: ['progress'],
    queryFn: () => patientApi.getProgress(),
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}
