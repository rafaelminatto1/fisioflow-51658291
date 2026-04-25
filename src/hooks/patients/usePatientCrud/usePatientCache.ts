import type { QueryClient } from "@tanstack/react-query";
import { patientKeys } from "@/hooks/queryKeys";

/**
 * Patient Cache Invalidation Logic
 *
 * Centraliza a lógica de invalidação de cache para o módulo de Pacientes.
 */
export const invalidatePatientCache = async (queryClient: QueryClient, patientId?: string) => {
  // Invalida listas globais de pacientes
  await queryClient.invalidateQueries({
    queryKey: ["patients"],
  });

  // Invalida paciente específico
  if (patientId) {
    await queryClient.invalidateQueries({
      queryKey: ["patients", patientId],
    });

    // Também invalida chaves específicas se usarem o padrão centralizado
    await queryClient.invalidateQueries({
      queryKey: ["patient", patientId],
    });
  }
};
