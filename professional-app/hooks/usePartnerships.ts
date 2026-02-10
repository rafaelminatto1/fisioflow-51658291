/**
 * Hook for managing partnerships
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import {
  getPartnerships,
  getPartnershipById,
  createPartnership,
  updatePartnership,
  deletePartnership,
  ApiPartnership,
} from '@/lib/api';

export function usePartnerships(options?: { activeOnly?: boolean }) {
  return useQuery({
    queryKey: ['partnerships', options?.activeOnly],
    queryFn: () => getPartnerships(options),
  }) as UseQueryResult<ApiPartnership[], Error>;
}

export function usePartnership(partnershipId: string) {
  return useQuery({
    queryKey: ['partnership', partnershipId],
    queryFn: () => getPartnershipById(partnershipId),
    enabled: !!partnershipId,
  }) as UseQueryResult<ApiPartnership | null, Error>;
}

export function useCreatePartnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createPartnership>[0]) => createPartnership(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
    },
  });
}

export function useUpdatePartnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ApiPartnership> }) =>
      updatePartnership(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
      queryClient.invalidateQueries({ queryKey: ['partnership'] });
    },
  });
}

export function useDeletePartnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePartnership(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
    },
  });
}
