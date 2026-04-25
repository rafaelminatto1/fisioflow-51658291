import type { QueryClient } from "@tanstack/react-query";
import { soapKeys } from "./types";

/**
 * Soap Cache Invalidation Logic
 *
 * Centraliza a lógica de invalidação de cache para o módulo SOAP.
 */
export const invalidateSoapCache = async (
  queryClient: QueryClient,
  patientId?: string,
  recordId?: string,
) => {
  // Invalida listas globais
  await queryClient.invalidateQueries({
    queryKey: soapKeys.lists(),
  });

  // Invalida lista específica do paciente
  if (patientId) {
    await queryClient.invalidateQueries({
      queryKey: soapKeys.list(patientId),
    });
    await queryClient.invalidateQueries({
      queryKey: soapKeys.drafts(patientId),
    });
    // Invalida chave V2 para compatibilidade
    await queryClient.invalidateQueries({
      queryKey: ["soap-records-v2", patientId],
    });
  }

  // Invalida detalhe específico do registro
  if (recordId) {
    await queryClient.invalidateQueries({
      queryKey: soapKeys.detail(recordId),
    });
  }
};
