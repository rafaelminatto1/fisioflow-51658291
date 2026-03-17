import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { boardsApi } from '@/lib/api/workers-client';
import type { Board } from '@/types/boards';

export const BOARDS_QUERY_KEY = ['boards'] as const;

export function useBoards() {
  return useQuery({
    queryKey: BOARDS_QUERY_KEY,
    queryFn: async () => {
      const result = await boardsApi.list(false);
      return (result.data ?? []) as unknown as Board[];
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

export function useBoard(id: string | undefined) {
  return useQuery({
    queryKey: ['boards', id],
    queryFn: async () => {
      const result = await boardsApi.get(id!);
      return result.data as unknown as Board;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

export function useCreateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; background_color?: string; icon?: string }) => {
      const result = await boardsApi.create(data);
      return result.data as unknown as Board;
    },
    onSuccess: (board) => {
      queryClient.setQueryData(BOARDS_QUERY_KEY, (old: Board[] | undefined) =>
        old ? [board, ...old] : [board]
      );
      toast.success('Board criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar board: ' + error.message);
    },
  });
}

export function useUpdateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const result = await boardsApi.update(id, data);
      return result.data as unknown as Board;
    },
    onSuccess: (board) => {
      queryClient.setQueryData(BOARDS_QUERY_KEY, (old: Board[] | undefined) =>
        old ? old.map(b => b.id === board.id ? { ...b, ...board } : b) : old
      );
      queryClient.setQueryData(['boards', board.id], (old: Board | undefined) =>
        old ? { ...old, ...board } : board
      );
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar board: ' + error.message);
    },
  });
}

export function useDeleteBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await boardsApi.delete(id);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData(BOARDS_QUERY_KEY, (old: Board[] | undefined) =>
        old ? old.filter(b => b.id !== id) : old
      );
      toast.success('Board arquivado.');
    },
    onError: (error: Error) => {
      toast.error('Erro ao arquivar board: ' + error.message);
    },
  });
}
