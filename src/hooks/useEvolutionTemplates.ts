/**
 * useEvolutionTemplates - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clinicalApi, type EvolutionTemplate } from "@/api/v2";
import { toast } from "sonner";

export type { EvolutionTemplate };

export type EvolutionTemplateFormData = Omit<
  EvolutionTemplate,
  "id" | "created_at" | "updated_at" | "created_by" | "organization_id"
>;

export function useEvolutionTemplates(tipo?: string) {
  return useQuery({
    queryKey: ["evolution-templates", tipo],
    queryFn: async () => {
      const res = await clinicalApi.evolutionTemplates.list({ ativo: true });
      let data = (res?.data ?? []) as EvolutionTemplate[];
      if (tipo) {
        data = data.filter((t) => (t as any).tipo === tipo);
      }
      return data;
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
}

export function useCreateEvolutionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: EvolutionTemplateFormData) => {
      const res = await clinicalApi.evolutionTemplates.create(template);
      return (res?.data ?? res) as EvolutionTemplate;
    },
    onMutate: async (newTemplate) => {
      await queryClient.cancelQueries({ queryKey: ["evolution-templates"] });
      const previousTemplates = queryClient.getQueryData<EvolutionTemplate[]>([
        "evolution-templates",
      ]);
      const optimistic = {
        ...newTemplate,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as EvolutionTemplate;
      queryClient.setQueryData<EvolutionTemplate[]>(["evolution-templates"], (old) => [
        ...(old ?? []),
        optimistic,
      ]);
      return { previousTemplates };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["evolution-templates"], context?.previousTemplates);
      toast.error("Erro ao criar template de evolução.");
    },
    onSuccess: (data) => {
      queryClient.setQueryData<EvolutionTemplate[]>(
        ["evolution-templates"],
        (old) => old?.map((t) => (t.id.startsWith("temp-") ? data : t)) ?? [data],
      );
      toast.success("Template de evolução criado com sucesso.");
    },
  });
}

export function useUpdateEvolutionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...template }: Partial<EvolutionTemplate> & { id: string }) => {
      const res = await clinicalApi.evolutionTemplates.update(id, template);
      return (res?.data ?? res) as EvolutionTemplate;
    },
    onMutate: async ({ id, ...template }) => {
      await queryClient.cancelQueries({ queryKey: ["evolution-templates"] });
      const previousTemplates = queryClient.getQueryData<EvolutionTemplate[]>([
        "evolution-templates",
      ]);
      queryClient.setQueryData<EvolutionTemplate[]>(
        ["evolution-templates"],
        (old) =>
          old?.map((t) =>
            t.id === id ? { ...t, ...template, updated_at: new Date().toISOString() } : t,
          ) ?? [],
      );
      return { previousTemplates };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["evolution-templates"], context?.previousTemplates);
      toast.error("Erro ao atualizar template de evolução.");
    },
    onSuccess: () => toast.success("Template de evolução atualizado com sucesso."),
  });
}

export function useDeleteEvolutionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clinicalApi.evolutionTemplates.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["evolution-templates"] });
      const previousTemplates = queryClient.getQueryData<EvolutionTemplate[]>([
        "evolution-templates",
      ]);
      queryClient.setQueryData<EvolutionTemplate[]>(["evolution-templates"], (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );
      return { previousTemplates };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(["evolution-templates"], context?.previousTemplates);
      toast.error("Erro ao excluir template de evolução.");
    },
    onSuccess: () => toast.success("Template de evolução excluído com sucesso."),
  });
}
