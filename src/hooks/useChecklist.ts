/**
 * useChecklist - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checklistApi, type ChecklistItem } from "@/api/v2";
import { useToast } from "@/hooks/use-toast";
import { ChecklistItemCreate, ChecklistItemUpdate } from "@/lib/validations/checklist";

export function useChecklist(eventoId: string) {
  return useQuery({
    queryKey: ["checklist", eventoId],
    queryFn: async () => {
      const res = await checklistApi.list(eventoId);
      return (res?.data ?? []) as ChecklistItem[];
    },
    enabled: !!eventoId,
  });
}

export function useCreateChecklistItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: ChecklistItemCreate) => {
      const res = await checklistApi.create(item);
      return (res?.data ?? res) as ChecklistItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["checklist", data.evento_id],
      });
      toast({
        title: "Item adicionado!",
        description: "Item do checklist criado com sucesso.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erro ao adicionar item",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      data,
      eventoId,
    }: {
      id: string;
      data: ChecklistItemUpdate;
      eventoId: string;
    }) => {
      const res = await checklistApi.update(id, data);
      return { ...((res?.data ?? res) as ChecklistItem), eventoId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["checklist", data.evento_id],
      });
      toast({
        title: "Item atualizado!",
        description: "Alterações salvas com sucesso.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erro ao atualizar item",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
}

export function useToggleChecklistItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      eventoId,
      status,
    }: {
      id: string;
      eventoId: string;
      status: "ABERTO" | "OK";
    }) => {
      const novoStatus = status === "OK" ? "ABERTO" : "OK";
      const res = await checklistApi.update(id, { status: novoStatus });
      return { ...((res?.data ?? res) as ChecklistItem), eventoId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["checklist", data.evento_id],
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erro ao atualizar item",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      await checklistApi.delete(id);
      return eventoId;
    },
    onSuccess: (eventoId) => {
      queryClient.invalidateQueries({ queryKey: ["checklist", eventoId] });
      toast({
        title: "Item removido!",
        description: "Item excluído com sucesso.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erro ao remover item",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
}
