/**
 * usePagamentos - Rewritten to use Workers API (financialApi.pagamentos)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financialApi, Pagamento } from "@/lib/api/workers-client";
import { toast } from "sonner";

export type { Pagamento };

export function usePagamentos(eventoId?: string) {
	return useQuery({
		queryKey: ["pagamentos", eventoId],
		queryFn: async () => {
			const res = await financialApi.pagamentos.list(eventoId);
			return (res?.data ?? res ?? []) as Pagamento[];
		},
		enabled: eventoId !== undefined ? !!eventoId : true,
	});
}

export function useCreatePagamento() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			pagamento: Partial<Pagamento> & { pago_em?: Date | string },
		) => {
			const data: Partial<Pagamento> = {
				...pagamento,
				pago_em:
					pagamento.pago_em instanceof Date
						? pagamento.pago_em.toISOString().split("T")[0]
						: pagamento.pago_em,
			};
			const res = await financialApi.pagamentos.create(data);
			return (res?.data ?? res) as Pagamento;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: ["pagamentos", data?.evento_id],
			});
			queryClient.invalidateQueries({ queryKey: ["pagamentos"] });
			toast.success("Pagamento adicionado!");
		},
		onError: (error: unknown) => {
			toast.error(
				"Erro ao adicionar pagamento: " +
					(error instanceof Error ? error.message : "Erro desconhecido"),
			);
		},
	});
}

export function useUpdatePagamento() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			data,
			eventoId,
		}: {
			id: string;
			data: Partial<Pagamento> & { pago_em?: Date | string };
			eventoId: string;
		}) => {
			const updateData: Partial<Pagamento> = {
				...data,
				pago_em:
					data.pago_em instanceof Date
						? data.pago_em.toISOString().split("T")[0]
						: data.pago_em,
			};
			const res = await financialApi.pagamentos.update(id, updateData);
			return { ...(res?.data ?? res), evento_id: eventoId } as Pagamento & {
				evento_id: string;
			};
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: ["pagamentos", data?.evento_id],
			});
			queryClient.invalidateQueries({ queryKey: ["pagamentos"] });
			toast.success("Pagamento atualizado!");
		},
		onError: (error: unknown) => {
			toast.error(
				"Erro ao atualizar pagamento: " +
					(error instanceof Error ? error.message : "Erro desconhecido"),
			);
		},
	});
}

export function useDeletePagamento() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
			await financialApi.pagamentos.delete(id);
			return eventoId;
		},
		onSuccess: (eventoId) => {
			queryClient.invalidateQueries({ queryKey: ["pagamentos", eventoId] });
			queryClient.invalidateQueries({ queryKey: ["pagamentos"] });
			toast.success("Pagamento removido!");
		},
		onError: (error: unknown) => {
			toast.error(
				"Erro ao remover pagamento: " +
					(error instanceof Error ? error.message : "Erro desconhecido"),
			);
		},
	});
}
