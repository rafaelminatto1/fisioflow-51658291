import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExercisesLibrary, assignExerciseToPatient, getPatientExerciseAssignments } from '@/lib/firestore';
import type { Exercise, ExerciseAssignment } from '@/types';

export interface UseExercisesLibraryOptions {
  category?: string;
  difficulty?: string;
  limit?: number;
}

export function useExercisesLibrary(options?: UseExercisesLibraryOptions) {
  const exercises = useQuery({
    queryKey: ['exercises', 'library', options],
    queryFn: () => getExercisesLibrary(options),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  return {
    data: exercises.data || [],
    isLoading: exercises.isLoading,
    error: exercises.error,
    refetch: exercises.refetch,
  };
}

export function usePatientExerciseAssignments() {
  const queryClient = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: ({
      patientId,
      assignment,
    }: {
      patientId: string;
      assignment: Omit<ExerciseAssignment, 'id'>;
    }) => assignExerciseToPatient('current-professional', patientId, assignment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientExercises'] });
    },
  });

  return {
    assignExercise: assignMutation.mutate,
    isAssigning: assignMutation.isPending,
  };
}

export function usePatientExercises(patientId: string) {
  const exercises = useQuery({
    queryKey: ['patientExercises', patientId],
    queryFn: () => getPatientExerciseAssignments(patientId),
    enabled: !!patientId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    data: exercises.data || [],
    isLoading: exercises.isLoading,
    error: exercises.error,
    refetch: exercises.refetch,
  };
}
