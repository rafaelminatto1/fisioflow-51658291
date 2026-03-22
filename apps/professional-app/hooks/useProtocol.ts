import { useQuery } from '@tanstack/react-query';
import { TreatmentProtocol } from '@/types';
import { fetchApi } from '@/lib/api';

export function useProtocol(id: string | null) {
  const { data: protocol, isLoading, error, refetch } = useQuery({
    queryKey: ['protocol', id],
    queryFn: async () => {
      if (!id) return null;

      try {
        const response = await fetchApi<any>(`/api/protocols/${id}`);
        return response.data as TreatmentProtocol;
      } catch (err: any) {
        if (err.status === 404) return null;
        throw err;
      }
    },
    enabled: !!id,
  });

  return {
    protocol,
    isLoading,
    error,
    refetch,
  };
}
