import type { QueryClient } from "@tanstack/react-query";
import { soapKeys } from "./types";
import { APPOINTMENT_PENDENCIES_KEY } from "@/hooks/clinical/useAppointmentPendencies";

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

  // O badge "sem evolução" na agenda deriva de haver observação escrita. Sem esta
  // invalidação ele só sumiria no próximo staleTime (5 min) — e badge que continua
  // aceso depois do trabalho feito ensina a equipe a desconfiar do indicador.
  // Invalidado por prefixo porque a agenda mantém uma entrada por janela de datas.
  await queryClient.invalidateQueries({ queryKey: APPOINTMENT_PENDENCIES_KEY });
};
