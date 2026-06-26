/**
 * useAutomations - CRUD de automações (list/create/update/delete/toggle) + stats
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  automationApi,
  type AutomationRecord,
  type AutomationStats,
} from "@/api/v2";

const KEY = "automations";
const STATS_KEY = "automation-stats";

export function useAutomations() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async (): Promise<AutomationRecord[]> => {
      const res = await automationApi.list();
      return res?.data ?? [];
    },
    staleTime: 1000 * 30,
  });
}

export function useAutomationStats() {
  return useQuery({
    queryKey: [STATS_KEY],
    queryFn: async (): Promise<AutomationStats | null> => {
      const res = await automationApi.stats();
      return res?.data ?? null;
    },
    staleTime: 1000 * 60,
  });
}

type AutomationWrite = {
  name: string;
  description?: string;
  triggerEvent?: string;
  enabled?: boolean;
  definition: unknown;
};

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AutomationWrite) => automationApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [STATS_KEY] });
    },
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: AutomationWrite & { id: string }) =>
      automationApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [STATS_KEY] });
    },
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => automationApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [STATS_KEY] });
    },
  });
}

/**
 * Cria o esqueleto mínimo de definição (nó trigger) para uma automação nova.
 * O builder preenche o restante ao editar o fluxo.
 */
export function emptyDefinition(triggerEvent?: string) {
  return {
    nodes: [{ id: "trigger-1", type: "trigger" as const, ...(triggerEvent ? { event: triggerEvent } : {}) }],
    edges: [],
  };
}
