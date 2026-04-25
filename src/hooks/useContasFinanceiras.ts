/**
 * useContasFinanceiras - Rewritten to use Workers API (financialApi.contas)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financialApi, ContaFinanceira } from "@/api/v2";
import { toast } from "sonner";

export type { ContaFinanceira };

export function useContasFinanceiras(tipo?: "receber" | "pagar", status?: string) {
  return useQuery({
    queryKey: ["contas-financeiras", tipo, status],
    queryFn: async () => {
      const res = await financialApi.contas.list({ tipo, status });
      return (res?.data ?? res ?? []) as ContaFinanceira[];
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });
}

export function useCreateContaFinanceira() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conta: Partial<ContaFinanceira>) => {
      const res = await financialApi.contas.create(conta);
      return (res?.data ?? res) as ContaFinanceira;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["resumo-financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["financial-command-center"] });
      toast.success("Conta criada com sucesso.");
    },
    onError: () => {
      toast.error("Erro ao criar conta.");
    },
  });
}

export function useUpdateContaFinanceira() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...conta }: Partial<ContaFinanceira> & { id: string }) => {
      const res = await financialApi.contas.update(id, conta);
      return (res?.data ?? res) as ContaFinanceira;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["resumo-financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["financial-command-center"] });
      toast.success("Conta atualizada.");
    },
    onError: () => {
      toast.error("Erro ao atualizar conta.");
    },
  });
}

export function useDeleteContaFinanceira() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await financialApi.contas.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["resumo-financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["financial-command-center"] });
      toast.success("Conta excluída.");
    },
    onError: () => {
      toast.error("Erro ao excluir conta.");
    },
  });
}

export function useResumoFinanceiro() {
  return useQuery({
    queryKey: ["resumo-financeiro"],
    queryFn: async () => {
      const res = await financialApi.contas.list();
      const contas = (res?.data ?? res ?? []) as ContaFinanceira[];

      const hoje = new Date().toISOString().split("T")[0];

      const receber = contas.filter((c) => c.tipo === "receber");
      const pagar = contas.filter((c) => c.tipo === "pagar");

      return {
        totalReceber: receber
          .filter((c) => c.status === "pendente")
          .reduce((acc, c) => acc + Number(c.valor), 0),
        totalPagar: pagar
          .filter((c) => c.status === "pendente")
          .reduce((acc, c) => acc + Number(c.valor), 0),
        receberAtrasado: receber.filter(
          (c) => c.status === "pendente" && (c.data_vencimento ?? "") < hoje,
        ).length,
        pagarAtrasado: pagar.filter(
          (c) => c.status === "pendente" && (c.data_vencimento ?? "") < hoje,
        ).length,
        receberHoje: receber.filter((c) => c.data_vencimento === hoje && c.status === "pendente")
          .length,
        pagarHoje: pagar.filter((c) => c.data_vencimento === hoje && c.status === "pendente")
          .length,
      };
    },
    staleTime: 1000 * 60 * 1,
    gcTime: 1000 * 60 * 3,
  });
}
