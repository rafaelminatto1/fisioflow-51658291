
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exerciseService, type ExerciseFilters } from '@/services/exercises';
import type { Exercise } from '@/types';
import { toast } from 'sonner';

// Re-export specific hook type to match import in other files if necessary
export type { Exercise };

export const useExercises = (filters?: ExerciseFilters) => {
  const queryClient = useQueryClient();

  const { data: exercises = [], isLoading, error } = useQuery({
    queryKey: ['exercises', filters],
    queryFn: () => exerciseService.getExercises(filters),
  });

  const createMutation = useMutation({
    mutationFn: exerciseService.createExercise,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Exercício criado com sucesso');
    },
    onError: (error: Error) => {
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
      toast.error('Erro ao excluir exercício: ' + error.message);
    },
  });

  return {
    exercises,
    loading: isLoading,
    error,
    createExercise: createMutation.mutate,
    updateExercise: updateMutation.mutate,
    deleteExercise: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
