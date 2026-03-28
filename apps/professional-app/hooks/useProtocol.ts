import { useQuery } from '@tanstack/react-query';
import { TreatmentProtocol } from '@/types';
import { fetchApi } from '@/lib/api';

function mapProtocolDetail(raw: any): TreatmentProtocol {
  const exercisesSource = raw.protocolExercises ?? raw.exercises ?? [];
  const exercises = Array.isArray(exercisesSource)
    ? exercisesSource.map((exercise: any, index: number) => ({
        exerciseId: String(exercise.exerciseId ?? exercise.exercise_id ?? exercise.id ?? `exercise-${index}`),
        exercise: exercise.exercise,
        sets: Number(exercise.sets ?? 3),
        reps: Number(exercise.reps ?? 10),
        duration: exercise.duration ? Number(exercise.duration) : undefined,
        frequency: String(exercise.frequency ?? `${exercise.phaseWeekStart ?? 1}-${exercise.phaseWeekEnd ?? exercise.phaseWeekStart ?? 1} semanas`),
        notes: exercise.notes ?? undefined,
        order: Number(exercise.order ?? exercise.orderIndex ?? index + 1),
      }))
    : [];

  return {
    id: String(raw.id),
    name: raw.name || 'Protocolo',
    description: raw.description || '',
    category: raw.protocolType || raw.category || 'geral',
    condition: raw.conditionName || raw.condition || '',
    exercises,
    professionalId: raw.createdBy || raw.professionalId || '',
    isTemplate: raw.isTemplate ?? raw.isPublic ?? true,
    isActive: raw.isActive ?? true,
    createdAt: raw.createdAt || raw.created_at || new Date(),
    updatedAt: raw.updatedAt || raw.updated_at || new Date(),
  };
}

export function useProtocol(id: string | null) {
  const { data: protocol, isLoading, error, refetch } = useQuery({
    queryKey: ['protocol', id],
    queryFn: async () => {
      if (!id) return null;

      try {
        const response = await fetchApi<any>(`/api/protocols/${id}`);
        if (!response?.data) return null;
        return mapProtocolDetail(response.data);
      } catch (err: any) {
        if (err.status === 404) return null;
        throw err;
      }
    },
    enabled: !!id,
  });

  return {
    protocol,
    isLoading,
    error,
    refetch,
  };
}
