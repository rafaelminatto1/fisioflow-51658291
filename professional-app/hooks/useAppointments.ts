import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment } from '@/lib/firestore';
import { useAuthStore } from '@/store/auth';
import type { Appointment } from '@/types';

export interface UseAppointmentsOptions {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  limit?: number;
}

export function useAppointments(options?: UseAppointmentsOptions) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const appointments = useQuery({
    queryKey: ['appointments', user?.id, options],
    queryFn: () => user?.id ? getAppointments(user.id, options) : Promise.resolve([]),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) =>
      createAppointment({ ...data, professionalId: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Appointment> }) =>
      updateAppointment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  return {
    data: appointments.data || [],
    isLoading: appointments.isLoading,
    error: appointments.error,
    refetch: appointments.refetch,
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
