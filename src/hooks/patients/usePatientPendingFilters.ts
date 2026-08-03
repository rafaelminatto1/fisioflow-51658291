import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";

/**
 * Contagem das pendências que filtram a lista de pacientes
 * (`GET /api/patients/pending-counts`).
 *
 * O número que aparece no tile é o mesmo que a listagem devolve quando o filtro
 * é aplicado — o backend usa literalmente o mesmo predicado SQL nos dois
 * caminhos (ver `apps/api/src/lib/clinical/patientPendingFilters.ts`). Não
 * recalcule nada aqui: derivar a contagem no cliente reintroduz exatamente a
 * divergência que o endpoint existe para eliminar.
 */

export type PatientPendingFilterKey =
  | "semTelefone"
  | "semAvaliacaoEmReabilitacao"
  | "atendimentoSemEvolucao"
  | "ativoSemProximaSessao"
  | "candidatoAlta"
  | "platoConfirmado";

export interface PatientPendingFilterCount {
  key: PatientPendingFilterKey;
  label: string;
  /** Critério em texto, vindo do backend. Exibir é parte do contrato. */
  criterio: string;
  count: number;
}

export interface PatientPendingCountsResponse {
  data: PatientPendingFilterCount[];
  meta: { total: number; contrato: string };
}

export const patientPendingKeys = {
  counts: () => ["patients", "pending-counts"] as const,
};

export function isPatientPendingFilterKey(value: unknown): value is PatientPendingFilterKey {
  return (
    typeof value === "string" &&
    [
      "semTelefone",
      "semAvaliacaoEmReabilitacao",
      "atendimentoSemEvolucao",
      "ativoSemProximaSessao",
      "candidatoAlta",
      "platoConfirmado",
    ].includes(value)
  );
}

export function usePatientPendingFilters() {
  return useQuery({
    queryKey: patientPendingKeys.counts(),
    queryFn: () => request<PatientPendingCountsResponse>("/api/patients/pending-counts"),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
  });
}
