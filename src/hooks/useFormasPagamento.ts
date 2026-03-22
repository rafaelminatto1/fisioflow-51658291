/**
 * useFormasPagamento - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { financialApi, type FormaPagamento } from "@/api/v2";

export type { FormaPagamento };
export type FormaPagamentoFormData = Pick<
	FormaPagamento,
	"nome" | "tipo" | "taxa_percentual" | "dias_recebimento" | "ativo"
>;

export function useFormasPagamento() {
	return useQuery({
		queryKey: ["formas_pagamento"],
		queryFn: async () => {
			const res = await financialApi.formasPagamento.list();
			return (res?.data ?? []) as FormaPagamento[];
		},
	});
}

export function useCreateFormaPagamento() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (forma: FormaPagamentoFormData) => {
			const res = await financialApi.formasPagamento.create(forma);
			return (res?.data ?? res) as FormaPagamento;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["formas_pagamento"] });
			toast({ title: "Forma de pagamento criada" });
		},
		onError: (error: Error) => {
			toast({
				title: "Erro ao criar",
				description: error.message,
				variant: "destructive",
			});
		},
	});
}

export function useUpdateFormaPagamento() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...updates
		}: Partial<FormaPagamento> & { id: string }) => {
			const res = await financialApi.formasPagamento.update(id, updates);
			return (res?.data ?? res) as FormaPagamento;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["formas_pagamento"] });
			toast({ title: "Forma de pagamento atualizada" });
		},
		onError: (error: Error) => {
			toast({
				title: "Erro ao atualizar",
				description: error.message,
				variant: "destructive",
			});
		},
	});
}

export function useDeleteFormaPagamento() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			await financialApi.formasPagamento.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["formas_pagamento"] });
			toast({ title: "Forma de pagamento removida" });
		},
		onError: (error: Error) => {
			toast({
				title: "Erro ao remover",
				description: error.message,
				variant: "destructive",
			});
		},
	});
}
