import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPatientEvolutions, createEvolution, updateEvolution, deleteEvolution, Evolution } from '@/lib/firestore';
import { useAuthStore } from '@/store/auth';

export function useEvolutions(patientId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const query = useQuery({
    queryKey: ['patientEvolutions', patientId],
    queryFn: () => getPatientEvolutions(patientId),
    enabled: !!patientId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Evolution, 'id' | 'professionalId' | 'createdAt'>) =>
      createEvolution(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientEvolutions', patientId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Evolution> }) =>
      updateEvolution(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientEvolutions', patientId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvolution(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientEvolutions', patientId] });
    },
  });

  return {
    evolutions: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
