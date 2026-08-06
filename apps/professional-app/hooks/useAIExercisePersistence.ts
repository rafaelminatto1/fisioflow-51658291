/**
 * useAIExercisePersistence - Hook para salvar resultados de exercícios com IA
 */
import { ExerciseSession } from "../types/pose";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { fetchApi } from "@/lib/api";

export function useAIExercisePersistence() {
  /**
   * Salva uma sessão completa de exercício
   */
  const saveSession = async (session: ExerciseSession) => {
    try {
      logger.info(
        "[AIPersistence] Salvando sessão de exercício...",
        { id: session.exerciseId },
        "AIPersistence",
      );

      // Path: `/api/exercise-sessions`. Até 08/2026 isto gravava em
      // `/api/clinical/patients/:id/ai-sessions`, rota inexistente — nenhuma
      // sessão analisada por IA foi persistida. A tabela `exercise_sessions` já
      // tem as colunas certas (metrics, posture_issues_summary, repetitions).
      const response = await fetchApi<any>("/api/exercise-sessions", {
        method: "POST",
        data: {
          patient_id: session.patientId,
          exercise_id: session.exerciseId,
          exercise_type: session.exerciseType,
          start_time:
            session.startTime instanceof Date
              ? session.startTime.toISOString()
              : new Date().toISOString(),
          end_time:
            session.endTime instanceof Date
              ? session.endTime.toISOString()
              : new Date().toISOString(),
          duration: session.duration,
          repetitions: session.repetitions,
          completed: session.completed,
          metrics: { ...session.metrics, totalScore: session.totalScore },
          posture_issues_summary: { issues: session.postureIssues ?? [] },
        },
      });
      return response.data?.id;
    } catch (error) {
      logger.error("Erro ao salvar sessão de IA", error, "AIPersistence");
      throw error;
    }
  };

  return { saveSession };
}
