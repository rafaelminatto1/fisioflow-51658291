import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPatients, createPatient, updatePatient, deletePatient } from '@/lib/firestore';
import { useAuthStore } from '@/store/auth';
import type { Patient } from '@/types';

export interface UsePatientsOptions {
  status?: 'active' | 'inactive';
  limit?: number;
}

export function usePatients(options?: UsePatientsOptions) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const patients = useQuery({
    queryKey: ['patients', user?.id, options],
    queryFn: () => user?.id ? getPatients(user?.id, options) : Promise.resolve([]),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'clinicId'>) =>
      createPatient(user!.id, {
        ...data,
        userId: user!.id,
        clinicId: user?.clinicId || 'default',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Patient> }) =>
      updatePatient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  return {
    data: patients.data || [],
    isLoading: patients.isLoading,
    error: patients.error,
    refetch: patients.refetch,
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
