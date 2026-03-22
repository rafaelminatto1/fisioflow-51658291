/**
 * useFeriados - Migrated to Neon/Workers
 *
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { feriadosApi, type FeriadoRow } from "@/api/v2";

export type Feriado = FeriadoRow;
export type FeriadoFormData = Omit<Feriado, "id" | "created_at" | "updated_at">;

export function useFeriados(year?: number) {
	return useQuery({
		queryKey: ["feriados", year],
		queryFn: async () => {
			const res = await feriadosApi.list(year ? { year } : undefined);
			return (res?.data ?? []) as Feriado[];
		},
	});
}

export function useCreateFeriado() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (feriado: FeriadoFormData) => {
			const res = await feriadosApi.create(feriado);
			return (res?.data ?? res) as Feriado;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["feriados"] });
			toast.success("Feriado criado com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao criar feriado: " + error.message);
		},
	});
}

export function useUpdateFeriado() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...updates
		}: Partial<Feriado> & { id: string }) => {
			const res = await feriadosApi.update(id, updates);
			return (res?.data ?? res) as Feriado;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["feriados"] });
			toast.success("Feriado atualizado com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao atualizar feriado: " + error.message);
		},
	});
}

export function useDeleteFeriado() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			await feriadosApi.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["feriados"] });
			toast.success("Feriado removido com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao remover feriado: " + error.message);
		},
	});
}
