import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { dischargeKeys, type DischargeRecorded, type DischargeReason } from "./useDischarge";

/**
 * Fila de candidatos a alta retroativa (`/api/clinical/discharge/candidates`).
 *
 * NÃO é inferência de alta: é lista de trabalho para a recepção confirmar por
 * telefone. O `meta.aviso` do backend precisa chegar à tela — sem ele a fila é
 * lida como "estes pacientes receberam alta", que é exatamente o erro que o
 * endpoint evita.
 */

export interface DischargeCandidate {
  patientId: string;
  patientName: string;
  lastSessionAt: string;
  daysInactive: number;
  sessionsCount: number;
  score: number;
  /** Sinais que somaram pontos, em texto pronto para exibir. */
  signals: string[];
  lastEvolutionExcerpt: string | null;
  hasPhone: boolean;
}

export interface DischargeCandidatesResponse {
  data: DischargeCandidate[];
  meta: {
    total: number;
    /** Quantos candidatos não têm telefone — não dá para confirmar por ligação. */
    semTelefone: number;
    aviso: string;
  };
}

export interface UseDischargeCandidatesOptions {
  minInactiveDays?: number;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export const dischargeCandidatesKeys = {
  all: () => ["clinical", "discharge", "candidates"] as const,
  list: (params: { minInactiveDays: number | null; limit: number | null; offset: number | null }) =>
    ["clinical", "discharge", "candidates", params] as const,
};

export function useDischargeCandidates(options: UseDischargeCandidatesOptions = {}) {
  const { minInactiveDays, limit, offset, enabled = true } = options;

  return useQuery({
    queryKey: dischargeCandidatesKeys.list({
      minInactiveDays: minInactiveDays ?? null,
      limit: limit ?? null,
      offset: offset ?? null,
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (minInactiveDays != null) params.set("minInactiveDays", String(minInactiveDays));
      if (limit != null) params.set("limit", String(limit));
      if (offset != null) params.set("offset", String(offset));
      const qs = params.toString();
      return request<DischargeCandidatesResponse>(
        `/api/clinical/discharge/candidates${qs ? `?${qs}` : ""}`,
      );
    },
    enabled,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
  });
}

export interface ConfirmDischargeCandidateInput {
  patientId: string;
  reason: DischargeReason;
  /** `YYYY-MM-DD` — normalmente a data da última sessão. */
  dischargedAt?: string | null;
  notes?: string | null;
}

/** Só aqui o candidato vira alta: alguém confirmou com o paciente. */
export function useConfirmDischargeCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, ...body }: ConfirmDischargeCandidateInput) => {
      const res = await request<{ data: DischargeRecorded }>(
        `/api/clinical/discharge/candidates/${encodeURIComponent(patientId)}/confirm`,
        { method: "POST", body: JSON.stringify(body) },
      );
      return res.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: dischargeCandidatesKeys.all() });
      void queryClient.invalidateQueries({ queryKey: dischargeKeys.list(variables.patientId) });
      void queryClient.invalidateQueries({ queryKey: ["clinical", "discharge", "outcomes"] });
    },
  });
}
