import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";

/**
 * Sinais de platô terapêutico (`GET /api/clinical/plateau`).
 *
 * O backend não classifica o platô — devolve os eixos e deixa a decisão com o
 * fisioterapeuta. A camada de dados preserva isso: nada aqui colapsa
 * `null` (não medido) em `false` (progrediu).
 */

export type PlateauStatus = "confirmado" | "progredindo" | "sem_dados";

export interface PlateauSignal {
  patientId: string;
  patientName: string;
  /** Conduta+região repetida, como lista de códigos. */
  signature: string[];
  consecutiveSessions: number;
  firstDate: string;
  lastDate: string;
  /**
   * `true` = carga estagnada; `false` = carga progrediu; `null` = sem registro
   * suficiente (menos de 2 leituras). Os três casos são clinicamente distintos.
   */
  loadStalled: boolean | null;
  /** Mesma semântica tripla de {@link PlateauSignal.loadStalled}, para a EVA. */
  painStalled: boolean | null;
  /** Quantos eixos independentes confirmam o platô (1 a 3). */
  confirmingAxes: number;
  status: PlateauStatus;
}

/** Justificativa dos limiares — a UI precisa exibir, senão o alerta é ignorado. */
export interface PlateauCriterios {
  conduta: string;
  dor: string;
  carga: string;
  eixos: string;
}

export interface PlateauMeta {
  /** Denominador do alerta: quantos sinais caíram em cada status antes do filtro. */
  counts: Record<PlateauStatus, number>;
  minSessions: number;
  minAxes: number;
  painMcidPoints: number;
  criterios: PlateauCriterios;
}

export interface PlateauResponse {
  data: PlateauSignal[];
  meta: PlateauMeta;
}

export interface UsePlateauSignalsOptions {
  /** `1` mostra também `progredindo` e `sem_dados` — útil para auditar o alerta. */
  minAxes?: number;
  limit?: number;
  enabled?: boolean;
}

export function usePlateauSignals(options: UsePlateauSignalsOptions = {}) {
  const { minAxes, limit, enabled = true } = options;

  return useQuery({
    queryKey: ["clinical", "plateau", { minAxes: minAxes ?? null, limit: limit ?? null }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (minAxes != null) params.set("minAxes", String(minAxes));
      if (limit != null) params.set("limit", String(limit));
      const qs = params.toString();
      return request<PlateauResponse>(`/api/clinical/plateau${qs ? `?${qs}` : ""}`);
    },
    enabled,
    staleTime: 1000 * 60 * 10,
    // Precisa sobreviver a reload: gcTime menor que o maxAge do persister faz o
    // cache ser descartado no login.
    gcTime: 1000 * 60 * 60 * 24,
  });
}
