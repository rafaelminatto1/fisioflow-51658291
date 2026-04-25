import { useQuery } from "@tanstack/react-query";
import { ExerciseSession } from "../types/pose";
import { fetchApi } from "@/lib/api";

/**
 * Hook para buscar o histórico de exercícios analisados por IA
 */
export function useAIExerciseHistory(patientId: string) {
  return useQuery({
    queryKey: ["ai-exercise-history", patientId],
    queryFn: async () => {
      if (!patientId) return [];

      const response = await fetchApi<any>(`/api/clinical/patients/${patientId}/ai-sessions`);
      return response.data as ExerciseSession[];
    },
    enabled: !!patientId,
  });
}
