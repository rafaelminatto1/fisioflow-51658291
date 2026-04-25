/**
 * useSalas - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salasApi, type Sala } from "@/api/v2";
import { toast } from "sonner";

export type { Sala };

export type SalaFormData = Pick<Sala, "nome" | "capacidade" | "descricao" | "cor" | "ativo">;

export function useSalas() {
  return useQuery({
    queryKey: ["salas"],
    queryFn: async () => {
      const res = await salasApi.list();
      return (res?.data ?? []) as Sala[];
    },
  });
}

export function useCreateSala() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sala: SalaFormData) => {
      const res = await salasApi.create(sala);
      return (res?.data ?? res) as Sala;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salas"] });
      toast.success("Sala criada com sucesso");
    },
    onError: (error: Error) => toast.error("Erro ao criar sala: " + error.message),
  });
}

export function useUpdateSala() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sala> & { id: string }) => {
      const res = await salasApi.update(id, updates);
      return (res?.data ?? res) as Sala;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salas"] });
      toast.success("Sala atualizada");
    },
    onError: (error: Error) => toast.error("Erro ao atualizar: " + error.message),
  });
}

export function useDeleteSala() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salas"] });
      toast.success("Sala removida");
    },
    onError: (error: Error) => toast.error("Erro ao remover: " + error.message),
  });
}
