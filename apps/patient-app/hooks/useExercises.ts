import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi } from '@/lib/api';

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
        
        exercises = exercises.filter((exercise) => {
          if (!exercise.completedAt && !exercise.id) return true; // fallback
          if (!exercise.completedAt) return true;
          // In a real app we might check a validUntil field if it existed in the API
          return true; 
        });
      }

      // Sort by latest (we can use ID or a date field if available)
      // For now, let's keep the API order or sort if we have dates
      
      return limit ? exercises.slice(0, limit) : exercises;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
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
