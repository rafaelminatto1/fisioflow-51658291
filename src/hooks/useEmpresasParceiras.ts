/**
 * useEmpresasParceiras - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { financialApi, type EmpresaParceira } from "@/lib/api/workers-client";

export type { EmpresaParceira };

export function useEmpresasParceiras() {
	return useQuery({
		queryKey: ["empresas-parceiras"],
		queryFn: async () => {
			const res = await financialApi.empresasParceiras.list();
			return (res?.data ?? []) as EmpresaParceira[];
		},
	});
}

export function useCreateEmpresaParceira() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			empresa: Omit<EmpresaParceira, "id" | "created_at" | "updated_at">,
		) => {
			const res = await financialApi.empresasParceiras.create(empresa);
			return (res?.data ?? res) as EmpresaParceira;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["empresas-parceiras"] });
			toast.success("Empresa parceira criada!");
		},
		onError: (error: Error) => {
			toast.error("Erro ao criar empresa: " + error.message);
		},
	});
}

export function useUpdateEmpresaParceira() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: Partial<EmpresaParceira>;
		}) => {
			const res = await financialApi.empresasParceiras.update(id, data);
			return (res?.data ?? res) as EmpresaParceira;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["empresas-parceiras"] });
			toast.success("Empresa atualizada!");
		},
		onError: (error: Error) => {
			toast.error("Erro ao atualizar empresa: " + error.message);
		},
	});
}

export function useDeleteEmpresaParceira() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			await financialApi.empresasParceiras.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["empresas-parceiras"] });
			toast.success("Empresa removida!");
		},
		onError: (error: Error) => {
			toast.error("Erro ao remover empresa: " + error.message);
		},
	});
}
