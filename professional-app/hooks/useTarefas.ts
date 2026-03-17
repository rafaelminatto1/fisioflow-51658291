import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import {
  getTarefas,
  createTarefa,
  updateTarefa,
  deleteTarefa,
  bulkUpdateTarefas,
  type ApiTarefa,
} from '@/lib/api';

const QUERY_KEY = ['tarefas'] as const;

export function useTarefas() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => {
      if (!user?.id) return [] as ApiTarefa[];
      return getTarefas({ limit: 200 });
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // ── CREATE ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: Partial<ApiTarefa>) => createTarefa(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  // ── UPDATE (com optimistic update) ─────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ApiTarefa> }) =>
      updateTarefa(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<ApiTarefa[]>(QUERY_KEY);
      queryClient.setQueryData<ApiTarefa[]>(QUERY_KEY, (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...data } : t)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(QUERY_KEY, ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  // ── DELETE ──────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTarefa(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<ApiTarefa[]>(QUERY_KEY);
      queryClient.setQueryData<ApiTarefa[]>(QUERY_KEY, (old) =>
        old?.filter((t) => t.id !== id) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(QUERY_KEY, ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  // ── BULK UPDATE ─────────────────────────────────────────────────────────
  const bulkUpdateMutation = useMutation({
    mutationFn: (updates: { id: string; data: Partial<ApiTarefa> }[]) =>
      bulkUpdateTarefas(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,

    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    createError: createMutation.error,
    isCreating: createMutation.isPending,

    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    updateError: updateMutation.error,
    isUpdating: updateMutation.isPending,

    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    deleteError: deleteMutation.error,
    isDeleting: deleteMutation.isPending,

    bulkUpdate: bulkUpdateMutation.mutate,
    bulkUpdateAsync: bulkUpdateMutation.mutateAsync,
    isBulkUpdating: bulkUpdateMutation.isPending,
  };
}
