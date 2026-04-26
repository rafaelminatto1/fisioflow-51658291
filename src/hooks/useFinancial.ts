/**
 * useFinancial - Rewritten to use Workers API (financialApi.transacoes)
 *
 * Simplified: uses financialApi.transacoes for all financial operations.
 * The legacy onSnapshot listener has been removed.
 *
 * @example
 * ```tsx
 * const { transactions, stats, createTransaction } = useFinancial();
 * ```
 */

import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { financialApi } from "@/api/v2/financial";
import { QueryKeys } from "@/hooks/queryKeys";
import { AppError } from "@/lib/errors/AppError";
import type { Transacao } from "@/types/workers";

export type Transaction = Transacao;

export interface FinancialStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingAmount: number;
  monthlyGrowth: number;
}

function calculateStats(transactions: Transaction[]): FinancialStats {
  const revenue = transactions
    .filter((t) => t.tipo === "receita")
    .reduce((s, t) => s + Number(t.valor), 0);
  const expenses = transactions
    .filter((t) => t.tipo === "despesa")
    .reduce((s, t) => s + Number(t.valor), 0);
  const pending = transactions
    .filter((t) => t.status === "pendente")
    .reduce((s, t) => s + Number(t.valor), 0);
  return {
    totalRevenue: revenue,
    totalExpenses: expenses,
    netProfit: revenue - expenses,
    pendingAmount: pending,
    monthlyGrowth: 0,
  };
}

export const useFinancial = () => {
  const queryClient = useQueryClient();
  const [period, setPeriod] = React.useState<"daily" | "weekly" | "monthly" | "all">("monthly");

  const {
    data: rawTransactions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: QueryKeys.financial.lists(),
    queryFn: async () => {
      const res = await financialApi.transacoes.list({ limit: 300 });
      return (res?.data ?? res ?? []) as Transaction[];
    },
  });

  const transactions = useMemo(() => {
    const all = rawTransactions as Transaction[];
    if (period === "all") return all;

    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (period === "weekly") start.setDate(now.getDate() - 7);
    else if (period === "monthly") start.setDate(now.getDate() - 30);

    return all.filter((t) => {
      if (!t.created_at) return false;
      return new Date(t.created_at) >= start;
    });
  }, [rawTransactions, period]);

  const stats = useMemo(() => calculateStats(transactions), [transactions]);

  const createMutation = useMutation({
    mutationFn: async (transacao: Partial<Transacao>) => {
      const res = await financialApi.transacoes.create(transacao);
      return res?.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.financial.all() });
      toast.success("Transação criada com sucesso");
    },
    onError: (err: Error) => {
      const appErr = AppError.from(err);
      const msg = appErr.isOperational
        ? `Erro de validação: ${appErr.message}`
        : "Erro ao criar transação. Tente novamente.";
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Transacao> & { id: string }) => {
      const res = await financialApi.transacoes.update(id, data);
      return res?.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.financial.all() });
      toast.success("Transação atualizada com sucesso");
    },
    onError: (err: Error) => {
      const appErr = AppError.from(err);
      const msg = appErr.isOperational
        ? `Erro de validação: ${appErr.message}`
        : "Erro ao atualizar transação. Tente novamente.";
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await financialApi.transacoes.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.financial.all() });
      toast.success("Transação excluída com sucesso");
    },
    onError: (err: Error) => {
      const appErr = AppError.from(err);
      const msg = appErr.isOperational
        ? `Erro de validação: ${appErr.message}`
        : "Erro ao excluir transação. Tente novamente.";
      toast.error(msg);
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await financialApi.transacoes.update(id, { status: "pago" });
      return res?.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.financial.all() });
      toast.success("Transação marcada como paga");
    },
    onError: (err: Error) => {
      const appErr = AppError.from(err);
      const msg = appErr.isOperational
        ? `Erro de validação: ${appErr.message}`
        : "Erro ao marcar como paga. Tente novamente.";
      toast.error(msg);
    },
  });

  const unbilledSessions = useMemo(() => {
    return [];
  }, []);

  return {
    transactions,
    allTransactions: rawTransactions,
    stats,
    period,
    setPeriod,
    loading: isLoading,
    error,
    createTransaction: createMutation.mutate,
    updateTransaction: updateMutation.mutate,
    deleteTransaction: deleteMutation.mutate,
    markAsPaid: markAsPaidMutation.mutate,
    unbilledSessions,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
