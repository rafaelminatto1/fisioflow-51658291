/**
 * useTarefas - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tarefasApi } from "@/api/v2";

// Re-export types from centralized types file
export type {
  Tarefa,
  TarefaStatus,
  TarefaPrioridade,
  TarefaTipo,
  TeamMember,
  TarefaAttachment,
  TarefaReference,
  TarefaChecklist,
  TarefaChecklistItem,
  TarefaComment,
  TarefaActivity,
  TarefaMention,
} from "@/types/tarefas";

export {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORIDADE_LABELS,
  PRIORIDADE_COLORS,
  TIPO_LABELS,
  TIPO_COLORS,
} from "@/types/tarefas";

import type { Tarefa, TarefaStatus, TarefaTemplate } from "@/types/tarefas";

/** Linha de tarefa_comments (mentions = user_ids). */
export interface TarefaCommentRow {
  id: string;
  tarefa_id: string;
  author_id: string;
  author_name: string | null;
  content: string;
  mentions: string[];
  created_at: string;
}

export const TAREFAS_QUERY_KEY = ["tarefas"] as const;

export async function fetchTarefas(): Promise<Tarefa[]> {
  const result = await tarefasApi.list();
  return (result.data ?? []) as unknown as Tarefa[];
}

export function useTarefas() {
  return useQuery({
    queryKey: TAREFAS_QUERY_KEY,
    queryFn: fetchTarefas,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

export function useProjectTarefas(projectId: string | undefined) {
  return useQuery({
    queryKey: ["tarefas", "project", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const result = await tarefasApi.list({ projectId });
      return (result.data ?? []) as unknown as Tarefa[];
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

export function useCreateTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tarefa: Partial<Tarefa>) => {
      const result = await tarefasApi.create({
        titulo: tarefa.titulo!,
        descricao: tarefa.descricao,
        status: tarefa.status || "A_FAZER",
        prioridade: tarefa.prioridade || "MEDIA",
        tipo: tarefa.tipo || "TAREFA",
        data_vencimento: tarefa.data_vencimento,
        tags: tarefa.tags || [],
        order_index: tarefa.order_index || 0,
        project_id: tarefa.project_id,
        parent_id: tarefa.parent_id,
        board_id: tarefa.board_id,
        column_id: tarefa.column_id,
        checklists: tarefa.checklists || [],
        attachments: tarefa.attachments || [],
        references: tarefa.references || [],
        dependencies: tarefa.dependencies || [],
        start_date: tarefa.start_date,
        responsavel_id: tarefa.responsavel_id,
        requires_acknowledgment: tarefa.requires_acknowledgment ?? false,
        recurrence: tarefa.recurrence ?? null,
        linked_entity_type: tarefa.linked_entity_type,
        linked_entity_id: tarefa.linked_entity_id,
      });
      return result.data as unknown as Tarefa;
    },
    onMutate: async (newTarefa) => {
      await queryClient.cancelQueries({ queryKey: ["tarefas"] });
      const previousTarefas = queryClient.getQueryData(["tarefas"]);
      const tempTarefa: Tarefa = {
        id: `temp-${Date.now()}`,
        titulo: newTarefa.titulo!,
        descricao: newTarefa.descricao,
        status: newTarefa.status || "A_FAZER",
        prioridade: newTarefa.prioridade || "MEDIA",
        tipo: newTarefa.tipo || "TAREFA",
        data_vencimento: newTarefa.data_vencimento,
        start_date: newTarefa.start_date,
        project_id: newTarefa.project_id,
        order_index: newTarefa.order_index || 0,
        tags: newTarefa.tags || [],
        checklists: newTarefa.checklists || [],
        attachments: newTarefa.attachments || [],
        references: newTarefa.references || [],
        dependencies: newTarefa.dependencies || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      queryClient.setQueryData(["tarefas"], (old: Tarefa[] | undefined) =>
        old ? [...old, tempTarefa] : old,
      );
      return { previousTarefas, tempTarefa };
    },
    onSuccess: (data, _variables, context) => {
      queryClient.setQueryData(["tarefas"], (old: Tarefa[] | undefined) =>
        old ? old.map((t) => (t.id === context?.tempTarefa.id ? data : t)) : old,
      );
      toast.success("Tarefa criada com sucesso!");
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousTarefas) {
        queryClient.setQueryData(["tarefas"], context.previousTarefas);
      }
      toast.error("Erro ao criar tarefa: " + error.message);
    },
  });
}

export function useUpdateTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tarefa> & { id: string }) => {
      const result = await tarefasApi.update(id, updates as Record<string, unknown>);
      return result.data as unknown as Tarefa;
    },
    onMutate: async (updatedTarefa) => {
      await queryClient.cancelQueries({ queryKey: ["tarefas"] });
      const previousTarefas = queryClient.getQueryData(["tarefas"]);
      queryClient.setQueryData(["tarefas"], (old: Tarefa[] | undefined) =>
        old ? old.map((t) => (t.id === updatedTarefa.id ? { ...t, ...updatedTarefa } : t)) : old,
      );
      return { previousTarefas };
    },
    onError: (err, _updatedTarefa, context) => {
      if (context?.previousTarefas) {
        queryClient.setQueryData(["tarefas"], context.previousTarefas);
      }
      toast.error("Erro ao atualizar tarefa: " + err.message);
    },
  });
}

export function useDeleteTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await tarefasApi.delete(id);
      return id;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["tarefas"] });
      const previousTarefas = queryClient.getQueryData(["tarefas"]);
      queryClient.setQueryData(["tarefas"], (old: Tarefa[] | undefined) =>
        old ? old.filter((t) => t.id !== deletedId) : old,
      );
      return { previousTarefas };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousTarefas) {
        queryClient.setQueryData(["tarefas"], context.previousTarefas);
      }
      toast.error("Erro ao excluir tarefa: " + error.message);
    },
    onSuccess: () => {
      toast.success("Tarefa excluída com sucesso!");
    },
  });
}

export function useDuplicateTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await tarefasApi.duplicate(id);
      return result.data as unknown as Tarefa;
    },
    onSuccess: (created) => {
      queryClient.setQueryData(["tarefas"], (old: Tarefa[] | undefined) =>
        old ? [...old, created] : old,
      );
      toast.success("Tarefa duplicada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao duplicar tarefa: " + error.message);
    },
  });
}

export function useTarefaComments(tarefaId: string | undefined) {
  return useQuery({
    queryKey: ["tarefas", tarefaId, "comments"],
    queryFn: async () => {
      const result = await tarefasApi.listComments(tarefaId!);
      return (result.data ?? []) as unknown as TarefaCommentRow[];
    },
    enabled: !!tarefaId,
    staleTime: 1000 * 30,
  });
}

export function useCreateTarefaComment(tarefaId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { content: string; mentions?: string[] }) => {
      const result = await tarefasApi.createComment(tarefaId!, data);
      return result.data as unknown as TarefaCommentRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas", tarefaId, "comments"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao comentar: " + error.message);
    },
  });
}

export function useDeleteTarefaComment(tarefaId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      await tarefasApi.deleteComment(tarefaId!, commentId);
      return commentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas", tarefaId, "comments"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir comentário: " + error.message);
    },
  });
}

export function useTarefaTemplates() {
  return useQuery({
    queryKey: ["tarefa-templates"],
    queryFn: async () => {
      const result = await tarefasApi.listTemplates();
      return (result.data ?? []) as unknown as TarefaTemplate[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateTarefaTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<TarefaTemplate> & { name: string; titulo: string }) => {
      const result = await tarefasApi.createTemplate(data as Record<string, unknown>);
      return result.data as unknown as TarefaTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefa-templates"] });
      toast.success("Template salvo!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar template: " + error.message);
    },
  });
}

export function useDeleteTarefaTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      await tarefasApi.deleteTemplate(templateId);
      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefa-templates"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir template: " + error.message);
    },
  });
}

export function useBulkUpdateTarefas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      tarefas: Array<{
        id: string;
        status?: TarefaStatus;
        order_index?: number;
        prioridade?: string;
        responsavel_id?: string | null;
        column_id?: string | null;
      }>,
    ) => {
      await tarefasApi.bulk(tarefas);
      return tarefas;
    },
    onMutate: async (updatedTarefas) => {
      await queryClient.cancelQueries({ queryKey: ["tarefas"] });
      const previousTarefas = queryClient.getQueryData(["tarefas"]);
      queryClient.setQueryData(["tarefas"], (old: Tarefa[] | undefined) => {
        if (!old) return old;
        const updatedMap = new Map(updatedTarefas.map((t) => [t.id, t]));
        return old.map((t) => {
          const updates = updatedMap.get(t.id);
          return updates ? { ...t, ...updates } : t;
        });
      });
      return { previousTarefas };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousTarefas) {
        queryClient.setQueryData(["tarefas"], context.previousTarefas);
      }
      toast.error("Erro ao reordenar tarefas: " + error.message);
    },
  });
}
