/**
 * useFornecedores - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { financialApi, type Fornecedor } from "@/lib/api/workers-client";

export type { Fornecedor };
export type FornecedorFormData = Omit<
	Fornecedor,
	"id" | "created_at" | "updated_at"
>;

export function useFornecedores() {
	return useQuery({
		queryKey: ["fornecedores"],
		queryFn: async () => {
			const res = await financialApi.fornecedores.list();
			return (res?.data ?? []) as Fornecedor[];
		},
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 20,
	});
}

export function useCreateFornecedor() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (fornecedor: FornecedorFormData) => {
			const res = await financialApi.fornecedores.create(fornecedor);
			return (res?.data ?? res) as Fornecedor;
		},
		onMutate: async (newFornecedor) => {
			await queryClient.cancelQueries({ queryKey: ["fornecedores"] });
			const previousFornecedores = queryClient.getQueryData<Fornecedor[]>([
				"fornecedores",
			]);

			const optimisticFornecedor: Fornecedor = {
				...newFornecedor,
				id: `temp-${Date.now()}`,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			queryClient.setQueryData<Fornecedor[]>(["fornecedores"], (old) => {
				const newData = [...(old ?? []), optimisticFornecedor];
				return newData.sort((a, b) =>
					a.razao_social.localeCompare(b.razao_social),
				);
			});

			return { previousFornecedores };
		},
		onError: (err, _variables, context) => {
			queryClient.setQueryData(["fornecedores"], context?.previousFornecedores);
			toast({
				title: "Erro ao criar fornecedor",
				description: err instanceof Error ? err.message : "Erro desconhecido",
				variant: "destructive",
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
			toast({ title: "Fornecedor criado com sucesso" });
		},
	});
}

export function useUpdateFornecedor() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...updates
		}: Partial<Fornecedor> & { id: string }) => {
			const res = await financialApi.fornecedores.update(id, updates);
			return (res?.data ?? res) as Fornecedor;
		},
		onMutate: async ({ id, ...updates }) => {
			await queryClient.cancelQueries({ queryKey: ["fornecedores"] });
			const previousFornecedores = queryClient.getQueryData<Fornecedor[]>([
				"fornecedores",
			]);

			queryClient.setQueryData<Fornecedor[]>(["fornecedores"], (old) =>
				(old ?? []).map((f) =>
					f.id === id
						? { ...f, ...updates, updated_at: new Date().toISOString() }
						: f,
				),
			);

			return { previousFornecedores };
		},
		onError: (err, _variables, context) => {
			queryClient.setQueryData(["fornecedores"], context?.previousFornecedores);
			toast({
				title: "Erro ao atualizar fornecedor",
				description: err instanceof Error ? err.message : "Erro desconhecido",
				variant: "destructive",
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
			toast({ title: "Fornecedor atualizado com sucesso" });
		},
	});
}

export function useDeleteFornecedor() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			await financialApi.fornecedores.delete(id);
		},
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: ["fornecedores"] });
			const previousFornecedores = queryClient.getQueryData<Fornecedor[]>([
				"fornecedores",
			]);

			queryClient.setQueryData<Fornecedor[]>(["fornecedores"], (old) =>
				(old ?? []).filter((f) => f.id !== id),
			);

			return { previousFornecedores };
		},
		onError: (err, _id, context) => {
			queryClient.setQueryData(["fornecedores"], context?.previousFornecedores);
			toast({
				title: "Erro ao remover fornecedor",
				description: err instanceof Error ? err.message : "Erro desconhecido",
				variant: "destructive",
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
			toast({ title: "Fornecedor removido com sucesso" });
		},
	});
}
