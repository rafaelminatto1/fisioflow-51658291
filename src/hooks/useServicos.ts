/**
 * useServicos - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicosApi, type Servico } from "@/lib/api/workers-client";
import { toast } from "sonner";

export type { Servico };

export type ServicoFormData = Omit<
	Servico,
	"id" | "created_at" | "updated_at" | "organization_id"
>;

export function useServicos() {
	return useQuery({
		queryKey: ["servicos"],
		queryFn: async () => {
			const res = await servicosApi.list();
			return (res?.data ?? []) as Servico[];
		},
		staleTime: 1000 * 60 * 15,
		gcTime: 1000 * 60 * 30,
	});
}

export function useCreateServico() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (servico: ServicoFormData) => {
			const res = await servicosApi.create(servico);
			return (res?.data ?? res) as Servico;
		},
		onMutate: async (newServico) => {
			await queryClient.cancelQueries({ queryKey: ["servicos"] });
			const previousServicos = queryClient.getQueryData<Servico[]>([
				"servicos",
			]);
			const optimistic = {
				...newServico,
				id: `temp-${Date.now()}`,
				organization_id: "",
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			} as Servico;
			queryClient.setQueryData<Servico[]>(["servicos"], (old) =>
				[...(old ?? []), optimistic].sort((a, b) =>
					a.nome.localeCompare(b.nome),
				),
			);
			return { previousServicos };
		},
		onError: (err: Error, _vars, context) => {
			queryClient.setQueryData(["servicos"], context?.previousServicos);
			toast.error("Erro ao criar serviço: " + err.message);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["servicos"] });
			toast.success("Serviço criado com sucesso");
		},
	});
}

export function useUpdateServico() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...updates
		}: Partial<Servico> & { id: string }) => {
			const res = await servicosApi.update(id, updates);
			return (res?.data ?? res) as Servico;
		},
		onMutate: async ({ id, ...updates }) => {
			await queryClient.cancelQueries({ queryKey: ["servicos"] });
			const previousServicos = queryClient.getQueryData<Servico[]>([
				"servicos",
			]);
			queryClient.setQueryData<Servico[]>(["servicos"], (old) =>
				(old ?? []).map((s) =>
					s.id === id
						? { ...s, ...updates, updated_at: new Date().toISOString() }
						: s,
				),
			);
			return { previousServicos };
		},
		onError: (err: Error, _vars, context) => {
			queryClient.setQueryData(["servicos"], context?.previousServicos);
			toast.error("Erro ao atualizar serviço: " + err.message);
		},
		onSuccess: () => toast.success("Serviço atualizado com sucesso"),
	});
}

export function useDeleteServico() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => servicosApi.delete(id),
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: ["servicos"] });
			const previousServicos = queryClient.getQueryData<Servico[]>([
				"servicos",
			]);
			queryClient.setQueryData<Servico[]>(["servicos"], (old) =>
				(old ?? []).filter((s) => s.id !== id),
			);
			return { previousServicos };
		},
		onError: (err: Error, _id, context) => {
			queryClient.setQueryData(["servicos"], context?.previousServicos);
			toast.error("Erro ao remover serviço: " + err.message);
		},
		onSuccess: () => toast.success("Serviço removido com sucesso"),
	});
}
