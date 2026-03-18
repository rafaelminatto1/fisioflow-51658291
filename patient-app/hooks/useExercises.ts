import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi } from '@/lib/api';
import { ExerciseAssignment } from '@/types/api';

export interface UseExercisesOptions {
  includeCompleted?: boolean;
  includeExpired?: boolean;
  limit?: number;
}

export function useExercises(options: UseExercisesOptions = {}) {
  const {
    includeCompleted = true,
    includeExpired = false,
    limit,
  } = options;

  return useQuery({
    queryKey: ['exercises', options],
    queryFn: async () => {
      let exercises = await patientApi.getExercises();

      if (!includeCompleted) {
        exercises = exercises.filter((exercise) => !exercise.completed);
      }

      if (!includeExpired) {
        const now = new Date();
        exercises = exercises.filter((exercise) => {
          if (!exercise.completedAt) return true;
          const completedDate = new Date(exercise.completedAt);
          const daysSinceCompletion = (now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceCompletion <= 30;
        });
      }

      return limit ? exercises.slice(0, limit) : exercises;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useCompleteExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string, data: Record<string, unknown> }) => 
      patientApi.completeExercise(assignmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useExerciseStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => patientApi.getStats(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}
