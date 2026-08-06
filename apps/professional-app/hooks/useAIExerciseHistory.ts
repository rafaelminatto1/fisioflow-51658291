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

      const response = await fetchApi<any>("/api/exercise-sessions", {
        params: { patientId },
      });

      return (response.data ?? []).map((row: any) => ({
        id: row.id,
        exerciseId: row.exercise_id,
        exerciseType: row.exercise_type,
        patientId: row.patient_id,
        startTime: row.start_time,
        endTime: row.end_time,
        duration: row.duration ?? 0,
        repetitions: row.repetitions ?? 0,
        totalScore: Number(row.metrics?.totalScore ?? 0),
        metrics: row.metrics ?? {},
        postureIssues: row.posture_issues_summary?.issues ?? [],
        completed: Boolean(row.completed),
        createdAt: row.created_at,
      })) as ExerciseSession[];
    },
    enabled: !!patientId,
  });
}
