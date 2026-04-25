import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { boardsApi } from "@/api/v2";
import type { Board, BoardColumn } from "@/types/boards";
import type { Tarefa } from "@/types/tarefas";

export function useBoardColumns(boardId: string | undefined) {
  return useQuery({
    queryKey: ["boards", boardId, "columns"],
    queryFn: async () => {
      const result = await boardsApi.listColumns(boardId!);
      return (result.data ?? []) as unknown as BoardColumn[];
    },
    enabled: !!boardId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

export function useCreateBoardColumn(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; color?: string; wip_limit?: number }) => {
      const result = await boardsApi.createColumn(boardId, data);
      return result.data as unknown as BoardColumn;
    },
    onSuccess: (col) => {
      // Update the board cache with the new column
      queryClient.setQueryData(["boards", boardId], (old: Board | undefined) => {
        if (!old) return old;
        return { ...old, columns: [...(old.columns ?? []), col] };
      });
      queryClient.setQueryData(["boards", boardId, "columns"], (old: BoardColumn[] | undefined) =>
        old ? [...old, col] : [col],
      );
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar coluna: " + error.message);
    },
  });
}

export function useUpdateBoardColumn(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const result = await boardsApi.updateColumn(id, data);
      return result.data as unknown as BoardColumn;
    },
    onSuccess: (col) => {
      queryClient.setQueryData(["boards", boardId], (old: Board | undefined) => {
        if (!old) return old;
        return {
          ...old,
          columns: (old.columns ?? []).map((c) => (c.id === col.id ? { ...c, ...col } : c)),
        };
      });
      queryClient.setQueryData(["boards", boardId, "columns"], (old: BoardColumn[] | undefined) =>
        old ? old.map((c) => (c.id === col.id ? { ...c, ...col } : c)) : old,
      );
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar coluna: " + error.message);
    },
  });
}

export function useDeleteBoardColumn(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (colId: string) => {
      await boardsApi.deleteColumn(colId);
      return colId;
    },
    onSuccess: (colId) => {
      queryClient.setQueryData(["boards", boardId], (old: Board | undefined) => {
        if (!old) return old;
        return {
          ...old,
          columns: (old.columns ?? []).filter((c) => c.id !== colId),
        };
      });
      queryClient.setQueryData(["boards", boardId, "columns"], (old: BoardColumn[] | undefined) =>
        old ? old.filter((c) => c.id !== colId) : old,
      );
    },
    onError: (error: Error) => {
      toast.error("Erro ao deletar coluna: " + error.message);
    },
  });
}

export function useReorderBoardColumns(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Array<{ id: string; order_index: number }>) => {
      await boardsApi.reorderColumns(updates);
      return updates;
    },
    onMutate: async (updates) => {
      const previous = queryClient.getQueryData(["boards", boardId]);
      queryClient.setQueryData(["boards", boardId], (old: Board | undefined) => {
        if (!old) return old;
        const orderMap = new Map(updates.map((u) => [u.id, u.order_index]));
        const newCols = [...(old.columns ?? [])]
          .map((c) => ({
            ...c,
            order_index: orderMap.has(c.id) ? orderMap.get(c.id)! : c.order_index,
          }))
          .sort((a, b) => a.order_index - b.order_index);
        return { ...old, columns: newCols };
      });
      return { previous };
    },
    onError: (_err, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["boards", boardId], context.previous);
      }
      toast.error("Erro ao reordenar colunas");
    },
  });
}

export function useBoardTarefas(boardId: string | undefined) {
  return useQuery({
    queryKey: ["boards", boardId, "tarefas"],
    queryFn: async () => {
      const result = await boardsApi.listTarefas(boardId!);
      return (result.data ?? []) as unknown as Tarefa[];
    },
    enabled: !!boardId,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });
}
