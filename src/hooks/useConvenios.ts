/**
 * useConvenios - Rewritten to use Workers API (financialApi.convenios)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financialApi, Convenio } from "@/lib/api/workers-client";
import { toast } from "sonner";

export type { Convenio };

export type ConvenioFormData = Pick<
	Convenio,
	| "nome"
	| "cnpj"
	| "telefone"
	| "email"
	| "contato_responsavel"
	| "valor_repasse"
	| "prazo_pagamento_dias"
	| "observacoes"
	| "ativo"
>;

export function useConvenios() {
	return useQuery({
		queryKey: ["convenios"],
		queryFn: async () => {
			const res = await financialApi.convenios.list();
			return (res?.data ?? res ?? []) as Convenio[];
		},
	});
}

export function useCreateConvenio() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (convenio: ConvenioFormData) => {
			const res = await financialApi.convenios.create(convenio);
			return (res?.data ?? res) as Convenio;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["convenios"] });
			toast.success("Convênio criado com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao criar convênio: " + error.message);
		},
	});
}

export function useUpdateConvenio() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...updates
		}: Partial<Convenio> & { id: string }) => {
			const res = await financialApi.convenios.update(id, updates);
			return (res?.data ?? res) as Convenio;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["convenios"] });
			toast.success("Convênio atualizado");
		},
		onError: (error: Error) => {
			toast.error("Erro ao atualizar: " + error.message);
		},
	});
}

export function useDeleteConvenio() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			await financialApi.convenios.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["convenios"] });
			toast.success("Convênio removido");
		},
		onError: (error: Error) => {
			toast.error("Erro ao remover: " + error.message);
		},
	});
}
