import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";

/**
 * Qualidade do prontuário (`GET /api/analytics/record-quality`).
 *
 * Cada número vem com a lista dos registros afetados porque "902" não é uma
 * tarefa e "estes 50 atendimentos" é. Nenhum indicador é atribuído a
 * profissional — ver `meta.naoDisponivel`.
 */

export interface AgendamentoSemSessaoRow {
  appointmentId: string;
  date: string;
  startTime: string | null;
  patientId: string | null;
  patientName: string | null;
}

export interface PacienteSemAvaliacaoRow {
  patientId: string;
  patientName: string;
  phone: string | null;
  sessoes: number;
  primeiraSessao: string | null;
  ultimaSessao: string | null;
}

export interface PacienteSemTelefoneRow {
  patientId: string;
  patientName: string;
  email: string | null;
  /** Admissão real: `patients.created_at` é a data da migração para todos. */
  primeiraSessao: string | null;
}

export interface SessaoObservacaoCurtaRow {
  sessionId: string;
  date: string;
  patientId: string | null;
  patientName: string | null;
  caracteres: number;
}

export interface RecordQualityIndicators {
  agendamentosSemSessao: {
    valor: number;
    /** Recorte recuperável de memória pela equipe; o total dimensiona a dívida. */
    recentes: number;
    lista?: AgendamentoSemSessaoRow[];
  };
  pacientesSemAvaliacao: { valor: number; lista?: PacienteSemAvaliacaoRow[] };
  pacientesSemTelefone: { valor: number; lista?: PacienteSemTelefoneRow[] };
  sessoesObservacaoCurta: { valor: number; lista?: SessaoObservacaoCurtaRow[] };
}

export interface RecordQualityMeta {
  paginacao: { limit: number; offset: number; includeList: boolean };
  criterios: Record<string, string>;
  naoDisponivel: Record<string, string>;
}

export interface RecordQualityResponse {
  data: RecordQualityIndicators;
  meta: RecordQualityMeta;
}

export type RecordQualityIndicatorKey =
  | "agendamentosSemSessao"
  | "pacientesSemAvaliacao"
  | "pacientesSemTelefone"
  | "sessoesObservacaoCurta";

export interface UseRecordQualityOptions {
  includeList?: boolean;
  indicador?: RecordQualityIndicatorKey | null;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export const recordQualityKeys = {
  all: () => ["analytics", "record-quality"] as const,
  query: (params: Record<string, unknown>) => ["analytics", "record-quality", params] as const,
};

export function useRecordQuality(options: UseRecordQualityOptions = {}) {
  const { includeList = false, indicador = null, limit, offset, enabled = true } = options;

  return useQuery({
    queryKey: recordQualityKeys.query({
      includeList,
      indicador,
      limit: limit ?? null,
      offset: offset ?? null,
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (includeList) params.set("includeList", "true");
      if (indicador) params.set("indicador", indicador);
      if (limit != null) params.set("limit", String(limit));
      if (offset != null) params.set("offset", String(offset));
      const qs = params.toString();
      return request<RecordQualityResponse>(`/api/analytics/record-quality${qs ? `?${qs}` : ""}`);
    },
    enabled,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
  });
}
