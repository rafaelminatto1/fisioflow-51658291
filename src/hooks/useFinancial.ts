/**
 * useFinancial - Rewritten to use Workers API (financialApi.transacoes)
 *
 * Simplified: uses financialApi.transacoes for all financial operations.
 * The legacy onSnapshot listener has been removed.
 */

import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { financialApi } from "@/api/v2/financial";
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
	const [period, setPeriod] = React.useState<
		"daily" | "weekly" | "monthly" | "all"
	>("monthly");

	const {
		data: rawTransactions = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["transactions"],
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
			queryClient.invalidateQueries({ queryKey: ["transactions"] });
			toast.success("Transação criada com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao criar transação: " + error.message);
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({
			id,
			...data
		}: Partial<Transacao> & { id: string }) => {
			const res = await financialApi.transacoes.update(id, data);
			return res?.data ?? res;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["transactions"] });
			toast.success("Transação atualizada com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao atualizar transação: " + error.message);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			await financialApi.transacoes.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["transactions"] });
			toast.success("Transação excluída com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao excluir transação: " + error.message);
		},
	});

	const markAsPaidMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await financialApi.transacoes.update(id, { status: "pago" });
			return res?.data ?? res;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["transactions"] });
			toast.success("Transação marcada como paga");
		},
		onError: (error: Error) => {
			toast.error("Erro ao marcar como paga: " + error.message);
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
