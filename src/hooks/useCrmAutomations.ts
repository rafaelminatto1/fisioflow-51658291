/**
 * Hooks para regras de automação CRM (lê /api/crm-automations).
 * Separado de useCRM.ts (que mantém os stubs antigos por compat).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { crmAutomationsApi, type CrmAutomationRule } from "@/api/v2/crmAutomations";

const KEY = ["crm-automations"] as const;

export function useCrmAutomationsList() {
  return useQuery({
    queryKey: [...KEY, "list"],
    queryFn: () => crmAutomationsApi.list().then((r) => r.data),
  });
}

export function useCrmAutomationTemplates() {
  return useQuery({
    queryKey: [...KEY, "templates"],
    queryFn: () => crmAutomationsApi.templates().then((r) => r.data),
  });
}

export function useCreateCrmAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CrmAutomationRule>) =>
      crmAutomationsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Regra criada.");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao criar regra."),
  });
}

export function useUpdateCrmAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CrmAutomationRule> & { id: string }) =>
      crmAutomationsApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao atualizar regra."),
  });
}

export function useToggleCrmAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      crmAutomationsApi.update(id, { ativo }).then((r) => r.data),
    // Optimistic update — flip imediato no UI
    onMutate: async ({ id, ativo }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<CrmAutomationRule[]>([...KEY, "list"]);
      qc.setQueryData<CrmAutomationRule[]>([...KEY, "list"], (old) =>
        (old ?? []).map((r) => (r.id === id ? { ...r, ativo } : r)),
      );
      return { prev };
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData([...KEY, "list"], ctx.prev);
      toast.error(e.message || "Erro ao alternar regra.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteCrmAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crmAutomationsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Regra removida.");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao remover regra."),
  });
}

export function useCrmAutomationExecutions(id: string | null) {
  return useQuery({
    queryKey: [...KEY, "executions", id],
    queryFn: () => (id ? crmAutomationsApi.executions(id).then((r) => r.data) : Promise.resolve([])),
    enabled: !!id,
  });
}

export function useScanCrmAutomations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => crmAutomationsApi.scan().then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(`Scan executado: ${data.executed} ações ok, ${data.failed} falhas.`);
    },
    onError: (e: Error) => toast.error(e.message || "Erro no scan."),
  });
}

/**
 * Clona um template global para a organização atual (cria nova regra
 * org-scoped a partir do template), opcionalmente já ativando.
 */
export function useCloneCrmAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ template, ativo = true }: { template: CrmAutomationRule; ativo?: boolean }) =>
      crmAutomationsApi
        .create({
          nome: template.nome,
          descricao: template.descricao,
          gatilho_tipo: template.gatilho_tipo,
          gatilho_config: template.gatilho_config,
          condicoes: template.condicoes,
          acoes: template.acoes,
          prioridade: template.prioridade,
          cooldown_minutes: template.cooldown_minutes,
          ativo,
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Template clonado para a clínica.");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao clonar template."),
  });
}
