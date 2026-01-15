
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exerciseService, type ExerciseFilters } from '@/services/exercises';
import type { Exercise } from '@/types';
import { toast } from 'sonner';
import { logger } from '@/lib/errors/logger';

// Re-export specific hook type
export type { Exercise };

export const useExercises = (filters?: ExerciseFilters) => {
  const queryClient = useQueryClient();

  // Robust Query with retry and caching
  const { data: exercises = [], isLoading, error } = useQuery({
    queryKey: ['exercises', filters],
    queryFn: async () => {
      try {
        return await exerciseService.getExercises(filters);
      } catch (err) {
        logger.error('Erro ao buscar exercícios', err, 'useExercises');
        throw err;
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour (static data)
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 3,
  });

  const createMutation = useMutation({
    mutationFn: exerciseService.createExercise,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Exercício criado com sucesso');
    },
    onError: (error: Error) => {
      logger.error('Erro na criação de exercício', error, 'useExercises');
      toast.error('Erro ao criar exercício: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Exercise> & { id: string }) =>
      exerciseService.updateExercise(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Exercício atualizado com sucesso');
    },
    onError: (error: Error) => {
      logger.error('Erro na atualização de exercício', error, 'useExercises');
      toast.error('Erro ao atualizar exercício: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: exerciseService.deleteExercise,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
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
    loading: isLoading,
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
