import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "@/api/v2/base";

/**
 * Alta fisioterapêutica (`/api/clinical/discharge`).
 *
 * A taxonomia e os rótulos vêm do servidor de propósito: a UI não deve inventar
 * os seus, senão relatório e formulário divergem. `abandono` não existe na lista
 * porque é sempre inferido por inatividade, nunca declarado.
 */

export type DischargeReason =
  | "alta_objetivo_atingido"
  | "alta_maximo_funcional"
  | "alta_transicao_autonomia"
  | "alta_medica"
  | "encaminhado"
  | "interrompido_paciente";

export type DischargeOrigin = "profissional" | "texto" | "retroativo";

export interface DischargeReasonOption {
  value: DischargeReason;
  label: string;
}

export interface DischargeSuggestion {
  baselineSummary: string | null;
  painInitial: number | null;
  painFinal: number | null;
  sessionsCount: number;
  firstSessionAt: string | null;
  lastSessionAt: string | null;
}

/**
 * Linha de `discharge_events`.
 *
 * As colunas vêm em snake_case: a query de listagem não aliasa os campos. Manter
 * o shape real evita um mapeamento silencioso que quebraria quando o backend
 * acrescentar colunas.
 */
export interface DischargeEvent {
  id: string;
  discharged_at: string | null;
  reason: DischargeReason;
  scope: string | null;
  baseline_summary: string | null;
  final_summary: string | null;
  pain_initial: number | null;
  pain_final: number | null;
  maintenance_plan: string | null;
  return_criteria: string | null;
  review_date: string | null;
  origin: DischargeOrigin;
  confirmed_by: string | null;
  notes: string | null;
}

/** Resposta do POST: apenas as colunas do `RETURNING`. */
export interface DischargeRecorded {
  id: string;
  patient_id: string;
  discharged_at: string | null;
  reason: DischargeReason;
  scope: string | null;
  origin: DischargeOrigin;
}

export interface RecordDischargeInput {
  patientId: string;
  reason: DischargeReason;
  sessionId?: string | null;
  /** `YYYY-MM-DD`. Omitido = o backend grava sem data explícita. */
  dischargedAt?: string | null;
  /** Preenchido = alta parcial: o tratamento continua para outras regiões. */
  scope?: string | null;
  baselineSummary?: string | null;
  finalSummary?: string | null;
  painInitial?: number | null;
  painFinal?: number | null;
  maintenancePlan?: string | null;
  returnCriteria?: string | null;
  reviewDate?: string | null;
  notes?: string | null;
}

export const dischargeKeys = {
  all: () => ["clinical", "discharge"] as const,
  reasons: () => ["clinical", "discharge", "reasons"] as const,
  suggestion: (patientId: string) => ["clinical", "discharge", "suggestion", patientId] as const,
  list: (patientId: string) => ["clinical", "discharge", "list", patientId] as const,
  outcomes: (inactiveDays: number | null) =>
    ["clinical", "discharge", "outcomes", inactiveDays] as const,
};

/** Taxonomia com rótulos PT-BR. Praticamente imutável — cache longo. */
export function useDischargeReasons() {
  return useQuery({
    queryKey: dischargeKeys.reasons(),
    queryFn: async () => {
      const res = await request<{ data: DischargeReasonOption[] }>(
        "/api/clinical/discharge/reasons",
      );
      return res.data;
    },
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });
}

/** Pré-preenchimento do bloco de alta com linha de base e EVA já extraídas. */
export function useDischargeSuggestion(patientId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: dischargeKeys.suggestion(patientId ?? ""),
    queryFn: async () => {
      const res = await request<{ data: DischargeSuggestion }>(
        `/api/clinical/discharge/suggestion?patientId=${encodeURIComponent(patientId!)}`,
      );
      return res.data;
    },
    enabled: Boolean(patientId) && enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  });
}

/** Altas já registradas do paciente. */
export function usePatientDischarges(patientId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: dischargeKeys.list(patientId ?? ""),
    queryFn: async () => {
      const res = await request<{ data: DischargeEvent[] }>(
        `/api/clinical/discharge?patientId=${encodeURIComponent(patientId!)}`,
      );
      return res.data;
    },
    enabled: Boolean(patientId) && enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  });
}

export function useRecordDischarge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordDischargeInput) => {
      const res = await request<{ data: DischargeRecorded }>("/api/clinical/discharge", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: dischargeKeys.list(variables.patientId) });
      // Registrar alta muda a fila de candidatos e a decomposição de desfecho.
      void queryClient.invalidateQueries({ queryKey: ["clinical", "discharge", "candidates"] });
      void queryClient.invalidateQueries({ queryKey: ["clinical", "discharge", "outcomes"] });
    },
  });
}

export interface DischargeOutcomes {
  total: number;
  comDesfechoDeclarado: number;
  altaAConfirmar: number;
  emTratamento: number;
  abandonoInferido: number;
  semRetornoRecente: number;
  inactiveDays: number;
}

/**
 * Decomposição de desfecho. O `aviso` do backend precisa ser exibido junto: a
 * taxa de alta começa baixa por construção e sem o aviso é lida como piora.
 */
export function useDischargeOutcomes(inactiveDays?: number) {
  return useQuery({
    queryKey: dischargeKeys.outcomes(inactiveDays ?? null),
    queryFn: async () => {
      const qs = inactiveDays != null ? `?inactiveDays=${inactiveDays}` : "";
      return request<{ data: DischargeOutcomes; meta: { aviso: string } }>(
        `/api/clinical/discharge/outcomes${qs}`,
      );
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60 * 24,
  });
}
