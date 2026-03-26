/**
 * Hooks TanStack Query para Exercícios via Cloudflare Workers API
 *
 * Substitui chamadas Firestore por chamadas HTTP ao Worker (Neon PostgreSQL).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { exercisesApi } from "@/api/v2";

const KEYS = {
	categories: ["workers", "exercises", "categories"] as const,
	list: (params?: object) => ["workers", "exercises", "list", params] as const,
	detail: (id: string) => ["workers", "exercises", id] as const,
	favorites: ["workers", "exercises", "favorites"] as const,
};

export function useExerciseCategories() {
	return useQuery({
		queryKey: KEYS.categories,
		queryFn: () => exercisesApi.categories(),
		staleTime: 1000 * 60 * 60, // categorias mudam pouco: 1h
		select: (res) => res.data,
	});
}

export function useWorkerExercises(params?: {
	q?: string;
	category?: string;
	difficulty?: string;
	page?: number;
	limit?: number;
}) {
	return useQuery({
		queryKey: KEYS.list(params),
		queryFn: () => exercisesApi.list(params),
		staleTime: 1000 * 60 * 5,
		select: (res) => res,
	});
}

export function useWorkerExercise(id: string) {
	return useQuery({
		queryKey: KEYS.detail(id),
		queryFn: () => exercisesApi.get(id),
		enabled: !!id,
		staleTime: 1000 * 60 * 10,
		select: (res) => res.data,
	});
}

export function useMyFavoriteExercises() {
	return useQuery({
		queryKey: KEYS.favorites,
		queryFn: () => exercisesApi.myFavorites(),
		staleTime: 1000 * 60 * 2,
		select: (res) => res.data,
	});
}

export function useFavoriteExercise() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
			isFavorite ? exercisesApi.unfavorite(id) : exercisesApi.favorite(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: KEYS.favorites });
		},
	});
}

export function useWorkerSemanticSearch(q: string, limit: number = 10) {
	return useQuery({
		queryKey: ["workers", "exercises", "semantic", q, limit],
		queryFn: () => exercisesApi.searchSemantic(q, limit),
		enabled: !!q && q.length > 2,
		select: (res) => res.data,
	});
}

export function useCreateWorkerExercise() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: exercisesApi.create,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["workers", "exercises"] });
			toast.success("Exercício criado com sucesso");
		},
		onError: (err: Error) => {
			toast.error("Erro ao criar exercício: " + err.message);
		},
	});
}

export function useUpdateWorkerExercise() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...data }: { id: string } & any) =>
			exercisesApi.update(id, data),
		onSuccess: (_, { id }) => {
			qc.invalidateQueries({ queryKey: ["workers", "exercises"] });
			qc.invalidateQueries({ queryKey: KEYS.detail(id) });
			toast.success("Exercício atualizado com sucesso");
		},
		onError: (err: Error) => {
			toast.error("Erro ao atualizar exercício: " + err.message);
		},
	});
}

export function useDeleteWorkerExercise() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: exercisesApi.delete,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["workers", "exercises"] });
			toast.success("Exercício excluído com sucesso");
		},
		onError: (err: Error) => {
			toast.error("Erro ao excluir exercício: " + err.message);
		},
	});
}
