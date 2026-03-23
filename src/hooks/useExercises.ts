// Re-export specific hook type

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { exerciseService, type ExerciseFilters } from "@/services/exercises";
import { exercisesApi } from "@/api/v2/exercises";
import { useAuth } from "@/contexts/AuthContext";
import { normalizePublicStorageUrl } from "@/lib/storage/public-url";
import type { Exercise as WorkersExercise } from "@/types/workers";
import type { Exercise } from "@/types";
import { toast } from "sonner";
import { fisioLogger as logger } from "@/lib/errors/logger";

export type { Exercise };

const makeMapper =
	(categoryMap: Map<string, string>) =>
	(ex: WorkersExercise): Exercise => ({
		id: ex.id,
		name: ex.name,
		category: categoryMap.get(ex.categoryId ?? "") ?? ex.categoryId ?? undefined,
		difficulty: ex.difficulty,
		video_url: ex.videoUrl || undefined,
		image_url: normalizePublicStorageUrl(ex.imageUrl) || undefined,
		thumbnail_url:
			normalizePublicStorageUrl(ex.thumbnailUrl || ex.imageUrl) || undefined,
		description: ex.description || undefined,
		targetMuscles: ex.musclesPrimary,
		equipment: ex.equipment,
		body_parts: ex.bodyParts,
		duration: ex.durationSeconds || undefined,
	});

export const useExerciseCategories = () => {
	const { initialized, loading: authLoading, user } = useAuth();
	const authReady = initialized && !authLoading && !!user;
	const { data, isLoading } = useQuery({
		queryKey: ["exercise-categories"],
		queryFn: () => exercisesApi.categories(),
		staleTime: 1000 * 60 * 30,
		enabled: authReady,
	});
	const categories = data?.data ?? [];
	const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
	return { categories, categoryMap, isLoading };
};

export const useWorkersExercises = (filters?: {
	q?: string;
	category?: string;
	difficulty?: string;
	page?: number;
	limit?: number;
}) => {
	const { initialized, loading: authLoading, user } = useAuth();
	const authReady = initialized && !authLoading && !!user;

	const { categoryMap } = useExerciseCategories();

	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ["workers-exercises", filters],
		queryFn: () => exercisesApi.list(filters),
		staleTime: 1000 * 60 * 5,
		enabled: authReady,
	});

	const exercises = (data?.data ?? []).map(makeMapper(categoryMap));

	useEffect(() => {
		if (!authReady) return;

		if (error) {
			logger.warn(
				"Falha ao carregar biblioteca de exercícios",
				{
					filters,
					error: error instanceof Error ? error.message : String(error),
				},
				"useWorkersExercises",
			);
			return;
		}

		if (!isLoading && data && exercises.length === 0) {
			logger.warn(
				"Biblioteca de exercícios retornou vazia",
				{
					filters,
					meta: data.meta,
				},
				"useWorkersExercises",
			);
		}
	}, [authReady, data, error, exercises.length, filters, isLoading]);

	return {
		exercises,
		meta: data?.meta,
		loading: !authReady || isLoading,
		error,
		refetch,
	};
};

export const useExercises = (filters?: ExerciseFilters) => {
	const queryClient = useQueryClient();

	// Mapeia filtros legados para os novos se necessário
	const workersFilters = {
		q: filters?.searchTerm,
		category: filters?.category,
		difficulty: filters?.difficulty,
		limit: 500,
	};

	const { exercises, meta, loading, error, refetch } =
		useWorkersExercises(workersFilters);

	const createMutation = useMutation({
		mutationFn: (data: Omit<Exercise, "id">) =>
			exercisesApi.create(data as any),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["workers-exercises"] });
			toast.success("Exercício criado com sucesso");
		},
		onError: (error: Error) => {
			logger.error("Erro na criação de exercício", error, "useExercises");
			toast.error("Erro ao criar exercício: " + error.message);
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, ...data }: Partial<Exercise> & { id: string }) =>
			exercisesApi.update(id, data as any),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["workers-exercises"] });
			toast.success("Exercício atualizado com sucesso");
		},
		onError: (error: Error) => {
			logger.error("Erro na atualização de exercício", error, "useExercises");
			toast.error("Erro ao atualizar exercício: " + error.message);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: exercisesApi.delete,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["workers-exercises"] });
			toast.success("Exercício excluído com sucesso");
		},
		onError: (error: Error) => {
			logger.error("Erro na exclusão de exercício", error, "useExercises");
			toast.error("Erro ao excluir exercício: " + error.message);
		},
	});

	const mergeMutation = useMutation({
		mutationFn: ({
			keepId,
			mergeIds,
		}: {
			keepId: string;
			mergeIds: string[];
		}) => exerciseService.mergeExercises(keepId, mergeIds),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["workers-exercises"] });
			toast.success(`${data.deletedCount} exercício(s) unido(s) com sucesso`);
		},
		onError: (error: Error) => {
			logger.error("Erro ao unir exercícios", error, "useExercises");
			toast.error("Erro ao unir exercícios: " + error.message);
		},
	});

	return {
		exercises,
		meta,
		loading,
		error,
		refetch,
		createExercise: createMutation.mutate,
		updateExercise: updateMutation.mutate,
		deleteExercise: deleteMutation.mutate,
		mergeExercises: (keepId: string, mergeIds: string[]) =>
			mergeMutation.mutateAsync({ keepId, mergeIds }),
		isCreating: createMutation.isPending,
		isUpdating: updateMutation.isPending,
		isDeleting: deleteMutation.isPending,
		isMerging: mergeMutation.isPending,
	};
};
