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

      const payload = {
        ...session,
        startTime:
          session.startTime instanceof Date
            ? session.startTime.toISOString()
            : new Date().toISOString(),
        endTime:
          session.endTime instanceof Date
            ? session.endTime.toISOString()
            : new Date().toISOString(),
      };

      const response = await fetchApi<any>(
        `/api/clinical/patients/${session.patientId}/ai-sessions`,
        {
          method: "POST",
          data: payload,
        },
      );
      return response.data?.id;
    } catch (error) {
      logger.error("Erro ao salvar sessão de IA", error, "AIPersistence");
      throw error;
    }
  };

  return { saveSession };
}
