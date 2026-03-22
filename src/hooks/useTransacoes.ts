/**
 * useTransacoes - Rewritten to use Workers API (financialApi.transacoes)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financialApi, Transacao } from "@/api/v2";
import { toast } from "sonner";

export type { Transacao };

export function useTransacoes(params?: {
	tipo?: string;
	status?: string;
	limit?: number;
}) {
	return useQuery({
		queryKey: ["transacoes", params],
		queryFn: async () => {
			const res = await financialApi.transacoes.list(params);
			return (res?.data ?? res ?? []) as Transacao[];
		},
	});
}

export function useCreateTransacao() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (transacao: Partial<Transacao>) => {
			const res = await financialApi.transacoes.create(transacao);
			return (res?.data ?? res) as Transacao;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["transacoes"] });
			toast.success("Transação criada com sucesso");
		},
		onError: (error: unknown) => {
			toast.error(
				"Erro ao criar transação: " +
					(error instanceof Error ? error.message : "Erro desconhecido"),
			);
		},
	});
}

export function useUpdateTransacao() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: Partial<Transacao>;
		}) => {
			const res = await financialApi.transacoes.update(id, data);
			return (res?.data ?? res) as Transacao;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["transacoes"] });
			toast.success("Transação atualizada com sucesso");
		},
		onError: (error: unknown) => {
			toast.error(
				"Erro ao atualizar transação: " +
					(error instanceof Error ? error.message : "Erro desconhecido"),
			);
		},
	});
}

export function useDeleteTransacao() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			await financialApi.transacoes.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["transacoes"] });
			toast.success("Transação excluída com sucesso");
		},
		onError: (error: unknown) => {
			toast.error(
				"Erro ao excluir transação: " +
					(error instanceof Error ? error.message : "Erro desconhecido"),
			);
		},
	});
}
