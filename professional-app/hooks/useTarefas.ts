import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import {
  getTarefas,
  createTarefa,
  updateTarefa,
  deleteTarefa,
  bulkUpdateTarefas,
  type ApiTarefa,
  type TarefaStatus,
} from '@/lib/api';

export function useTarefas(filterStatus?: TarefaStatus) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const tarefas = useQuery({
    queryKey: ['tarefas', user?.id],
    queryFn: () => {
      if (!user?.id) return [];
      return getTarefas({ limit: 200 });
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<ApiTarefa>) => createTarefa(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ApiTarefa> }) =>
      updateTarefa(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTarefa(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (updates: { id: string; data: Partial<ApiTarefa> }[]) =>
      bulkUpdateTarefas(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
    },
  });

  const allData = tarefas.data || [];
  const filteredData = filterStatus
    ? allData.filter((t) => t.status === filterStatus)
    : allData;

  return {
    data: filteredData,
    allData,
    isLoading: tarefas.isLoading,
    error: tarefas.error,
    refetch: tarefas.refetch,
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    bulkUpdate: bulkUpdateMutation.mutate,
    bulkUpdateAsync: bulkUpdateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
