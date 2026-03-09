import { useQuery } from '@tanstack/react-query';
import { TreatmentProtocol } from '@/types';
import { config } from '@/lib/config';
import { authApi } from '@/lib/auth-api';

export function useProtocol(id: string | null) {
  const { data: protocol, isLoading, error, refetch } = useQuery({
    queryKey: ['protocol', id],
    queryFn: async () => {
      if (!id) return null;

      const token = await authApi.getToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${config.apiUrl}/api/protocols/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch protocol');
      }

      const response = await res.json();
      return response.data as TreatmentProtocol;
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
