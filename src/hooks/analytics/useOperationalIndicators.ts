import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";

/**
 * Indicadores operacionais (`GET /api/analytics/operational`).
 *
 * Todo indicador carrega a lista paginada dos afetados sob `?includeList=true`:
 * "146 pacientes ativos sem retorno" não é tarefa, "estes 50 pacientes" é. Por
 * isso o hook expõe o filtro `indicador` — a lista é buscada só do card aberto.
 *
 * Não existe taxa de falta por profissional, e a ausência é deliberada
 * (`meta.naoDisponivel`). Não tente derivá-la no cliente.
 */

export interface IndicadorNumerico {
  valor: number;
}

export interface FaltaRow {
  appointmentId: string;
  date: string;
  status: string;
  patientId: string | null;
  patientName: string | null;
  phone: string | null;
}

export interface PacienteInativoRow {
  patientId: string;
  patientName: string;
  phone: string | null;
  ultimoAtendimento: string;
  diasSemAtendimento: number;
}

export interface ProximaSessaoRow {
  patientId: string;
  patientName: string;
  phone: string | null;
  proximaSessao: string;
}

export interface PacienteAtivoRow {
  patientId: string;
  patientName: string;
  phone: string | null;
  sessoes: number;
  ultimaSessao: string;
}

export interface VolumeProfissionalRow {
  therapistId: string | null;
  therapistName: string;
  atendimentos: number;
}

export interface OperationalIndicators {
  taxaFalta: { valor: number; faltas: number; base: number; lista?: FaltaRow[] };
  pacientesComAtendimento: IndicadorNumerico;
  comProximaSessao: { valor: number; lista?: ProximaSessaoRow[] };
  ativosSemProximaSessao: { valor: number; lista?: PacienteInativoRow[] };
  riscoAbandono: { valor: number; lista?: PacienteInativoRow[] };
  /** `null` quando não há gaps válidos no período — não é zero. */
  intervaloMedioSessoesDias: { valor: number | null };
  pacientesAtivos30d: { valor: number; lista?: PacienteAtivoRow[] };
  sessoes30d: IndicadorNumerico;
  /** Só lista; não há agregado próprio. */
  volumePorProfissional: { lista?: VolumeProfissionalRow[] };
}

export interface OperationalMeta {
  paginacao: { limit: number; offset: number; includeList: boolean };
  criterios: Record<string, string>;
  /** Recortes ausentes de propósito, com o motivo. Exibir é parte do contrato. */
  naoDisponivel: Record<string, string>;
}

export interface OperationalResponse {
  data: OperationalIndicators;
  meta: OperationalMeta;
}

/** Chaves de indicador aceitas em `?indicador=` — as que possuem lista. */
export type OperationalIndicatorKey =
  | "faltas"
  | "ativosSemProximaSessao"
  | "riscoAbandono"
  | "comProximaSessao"
  | "pacientesAtivos30d"
  | "volumePorProfissional";

export interface UseOperationalIndicatorsOptions {
  includeList?: boolean;
  /** Restringe a busca de lista a um indicador. Sem isso, todas são buscadas. */
  indicador?: OperationalIndicatorKey | null;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export const operationalKeys = {
  all: () => ["analytics", "operational"] as const,
  query: (params: Record<string, unknown>) => ["analytics", "operational", params] as const,
};

export function useOperationalIndicators(options: UseOperationalIndicatorsOptions = {}) {
  const { includeList = false, indicador = null, limit, offset, enabled = true } = options;

  return useQuery({
    queryKey: operationalKeys.query({
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
      return request<OperationalResponse>(`/api/analytics/operational${qs ? `?${qs}` : ""}`);
    },
    enabled,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
  });
}
