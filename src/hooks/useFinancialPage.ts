/**
 * useFinancialPage - Hook para dados da página Financeira (Library Mode)
 *
 * Substitui o loader/action do Framework Mode por React Query.
 *
 * @version 1.0.0 - Library Mode Migration
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { financialApi } from "@/api/v2/financial";
import { useAuth } from "@/hooks/useAuth";
import type { Transaction } from "@/hooks/useFinancial";
import { fisioLogger as logger } from "@/lib/errors/logger";

export type PeriodType = "daily" | "weekly" | "monthly" | "all";

export interface FinancialStats {
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
  monthlyGrowth: number;
  pendingPayments: number;
  paidCount: number;
  totalCount: number;
  averageTicket: number;
}

export interface FinancialPageData {
  transactions: Transaction[];
  stats: FinancialStats;
  period: PeriodType;
}

export function useFinancialPageData(period: PeriodType = "monthly") {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  const {
    data: rawTransactions = [],
    isLoading: isLoadingTransactions,
    error: transactionsError,
  } = useQuery({
    queryKey: ["financial-transactions", organizationId, period],
    queryFn: async () => {
      try {
        const res = await financialApi.transacoes.list({ limit: 300 });
        return (res?.data ?? res ?? []) as Transaction[];
      } catch (error) {
        logger.error("Error loading transactions", { error }, "useFinancialPage");
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });

  const transactions = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) return [];

    if (period === "all") return rawTransactions;

    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (period === "weekly") start.setDate(now.getDate() - 7);
    else if (period === "monthly") start.setDate(now.getDate() - 30);

    return rawTransactions.filter(
      (t: Transaction) => t.created_at && new Date(t.created_at) >= start,
    );
  }, [rawTransactions, period]);

  const stats = useMemo<FinancialStats>(() => {
    const revenue = transactions
      .filter((t: Transaction) => t.tipo === "receita")
      .reduce((sum, t) => sum + (t.valor || 0), 0);

    const expenses = transactions
      .filter((t: Transaction) => t.tipo === "despesa")
      .reduce((sum, t) => sum + (t.valor || 0), 0);

    const pendingPayments = transactions
      .filter((t: Transaction) => t.status === "pendente")
      .reduce((sum, t) => sum + (t.valor || 0), 0);

    const paidCount = transactions.filter(
      (t: Transaction) => t.status === "pago" || t.status === "concluido",
    ).length;

    const revenueCount = transactions.filter((t: Transaction) => t.tipo === "receita").length;

    return {
      totalRevenue: revenue,
      totalExpenses: expenses,
      balance: revenue - expenses,
      monthlyGrowth: 0,
      pendingPayments,
      paidCount,
      totalCount: transactions.length,
      averageTicket: revenueCount > 0 ? revenue / revenueCount : 0,
    };
  }, [transactions]);

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Transaction, "id" | "created_at" | "updated_at">) => {
      const res = await financialApi.transacoes.create(data);
      return res?.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["financial-transactions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["financial-command-center"],
      });
      toast.success("Transação criada com sucesso");
    },
    onError: (error) => {
      logger.error("Error creating transaction", { error }, "useFinancialPage");
      toast.error("Erro ao criar transação");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; transaction: Partial<Transaction> }) => {
      const res = await financialApi.transacoes.update(data.id, data.transaction);
      return res?.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["financial-transactions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["financial-command-center"],
      });
      toast.success("Transação atualizada com sucesso");
    },
    onError: (error) => {
      logger.error("Error updating transaction", { error }, "useFinancialPage");
      toast.error("Erro ao atualizar transação");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await financialApi.transacoes.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["financial-transactions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["financial-command-center"],
      });
      toast.success("Transação excluída com sucesso");
    },
    onError: (error) => {
      logger.error("Error deleting transaction", { error }, "useFinancialPage");
      toast.error("Erro ao excluir transação");
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      await financialApi.transacoes.update(id, { status: "pago" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["financial-transactions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["financial-command-center"],
      });
      toast.success("Pagamento registrado com sucesso");
    },
    onError: (error) => {
      logger.error("Error marking as paid", { error }, "useFinancialPage");
      toast.error("Erro ao registrar pagamento");
    },
  });

  return {
    data: {
      transactions,
      stats,
      period,
    } as FinancialPageData,
    mutations: {
      create: createMutation.mutateAsync,
      update: updateMutation.mutateAsync,
      delete: deleteMutation.mutateAsync,
      markAsPaid: markAsPaidMutation.mutateAsync,
    },
    isLoading: isLoadingTransactions,
    error: transactionsError,
    refetch: () => {
      queryClient.invalidateQueries({
        queryKey: ["financial-transactions"],
      });
    },
  };
}
