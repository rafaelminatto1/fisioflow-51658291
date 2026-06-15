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
    onMutate: async (newConta) => {
      await queryClient.cancelQueries({ queryKey: ["contas-financeiras"] });
      const previousContas = queryClient.getQueryData<ContaFinanceira[]>(["contas-financeiras"]);

      if (previousContas) {
        queryClient.setQueryData<ContaFinanceira[]>(["contas-financeiras"], [
          { ...newConta, id: `temp-${Date.now()}` } as ContaFinanceira,
          ...previousContas,
        ]);
      }

      return { previousContas };
    },
    onError: (err, newConta, context) => {
      if (context?.previousContas) {
        queryClient.setQueryData(["contas-financeiras"], context.previousContas);
      }
      toast.error("Erro ao criar conta.");
    },
    onSuccess: () => {
      toast.success("Conta criada com sucesso.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["resumo-financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["financial-command-center"] });
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
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ["contas-financeiras"] });
      const previousContas = queryClient.getQueryData<ContaFinanceira[]>(["contas-financeiras"]);

      if (previousContas) {
        queryClient.setQueryData<ContaFinanceira[]>(
          ["contas-financeiras"],
          previousContas.map((c) => (c.id === id ? ({ ...c, ...updates } as ContaFinanceira) : c)),
        );
      }

      return { previousContas };
    },
    onError: (err, variables, context) => {
      if (context?.previousContas) {
        queryClient.setQueryData(["contas-financeiras"], context.previousContas);
      }
      toast.error("Erro ao atualizar conta.");
    },
    onSuccess: () => {
      toast.success("Conta atualizada.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["resumo-financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["financial-command-center"] });
    },
  });
}

export function useDeleteContaFinanceira() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await financialApi.contas.delete(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["contas-financeiras"] });
      const previousContas = queryClient.getQueryData<ContaFinanceira[]>(["contas-financeiras"]);

      if (previousContas) {
        queryClient.setQueryData<ContaFinanceira[]>(
          ["contas-financeiras"],
          previousContas.filter((c) => c.id !== id),
        );
      }

      return { previousContas };
    },
    onError: (err, id, context) => {
      if (context?.previousContas) {
        queryClient.setQueryData(["contas-financeiras"], context.previousContas);
      }
      toast.error("Erro ao excluir conta.");
    },
    onSuccess: () => {
      toast.success("Conta excluída.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["resumo-financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["financial-command-center"] });
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
