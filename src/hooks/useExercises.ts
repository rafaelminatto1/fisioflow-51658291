

// Re-export specific hook type

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exerciseService, type ExerciseFilters } from '@/services/exercises';
import { exercisesApi, type Exercise as WorkersExercise } from '@/lib/api/workers-client';
import type { Exercise } from '@/types';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';

export type { Exercise };

/**
 * Mapeia o formato do Worker para o formato legado do App
 */
const mapWorkerToAppExercise = (ex: WorkersExercise): Exercise => ({
  id: ex.id,
  name: ex.name,
  category: ex.categoryId, // Idealmente aqui buscaríamos o nome da categoria se necessário
  difficulty: ex.difficulty,
  video_url: ex.videoUrl || undefined,
  image_url: ex.imageUrl || undefined,
  thumbnail_url: ex.imageUrl || undefined,
  description: ex.description || undefined,
  targetMuscles: ex.musclesPrimary,
  equipment: ex.equipment,
  body_parts: ex.bodyParts,
  duration: ex.durationSeconds || undefined,
});

export const useWorkersExercises = (filters?: {
  q?: string;
  category?: string;
  difficulty?: string;
  page?: number;
  limit?: number;
}) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['workers-exercises', filters],
    queryFn: () => exercisesApi.list(filters),
    staleTime: 1000 * 60 * 5,
  });

  const exercises = (data?.data ?? []).map(mapWorkerToAppExercise);

  return {
    exercises,
    meta: data?.meta,
    loading: isLoading,
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

  const { exercises, loading, error } = useWorkersExercises(workersFilters);

  const createMutation = useMutation({
    mutationFn: (data: Omit<Exercise, 'id'>) => exercisesApi.create(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-exercises'] });
      toast.success('Exercício criado com sucesso');
    },
    onError: (error: Error) => {
      logger.error('Erro na criação de exercício', error, 'useExercises');
      toast.error('Erro ao criar exercício: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Exercise> & { id: string }) =>
      exercisesApi.update(id, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-exercises'] });
      toast.success('Exercício atualizado com sucesso');
    },
    onError: (error: Error) => {
      logger.error('Erro na atualização de exercício', error, 'useExercises');
      toast.error('Erro ao atualizar exercício: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: exercisesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-exercises'] });
      toast.success('Exercício excluído com sucesso');
    },
    onError: (error: Error) => {
      logger.error('Erro na exclusão de exercício', error, 'useExercises');
      toast.error('Erro ao excluir exercício: ' + error.message);
    },
  });

  const mergeMutation = useMutation({
    mutationFn: ({ keepId, mergeIds }: { keepId: string; mergeIds: string[] }) =>
      exerciseService.mergeExercises(keepId, mergeIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success(`${data.deletedCount} exercício(s) unido(s) com sucesso`);
    },
    onError: (error: Error) => {
      logger.error('Erro ao unir exercícios', error, 'useExercises');
      toast.error('Erro ao unir exercícios: ' + error.message);
    },
  });

  return {
    exercises,
    loading,
    error,
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
