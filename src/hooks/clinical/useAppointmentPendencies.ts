import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";

/**
 * Pendências clínicas dos cards da agenda (`GET /api/clinical/appointments/pendencias`).
 *
 * Uma chamada por janela, nunca por card: a agenda carrega uma semana inteira.
 *
 * O conjunto de sinais é pequeno de propósito — badge que acende em quase todo
 * card vira ruído. Medido em produção sobre uma semana real (109 cards):
 * 12 sem evolução, 3 em platô, 15 cards com badge (13,8%).
 */

export type PendencyFlag = "sem_evolucao" | "plato";

export interface AppointmentPendency {
  appointmentId: string;
  patientId: string;
  flags: PendencyFlag[];
  plateauSessions: number | null;
  plateauLastDate: string | null;
}

export interface AppointmentPendenciesMeta {
  from: string;
  to: string;
  /** Denominador da janela — sem ele o número de pendências não é interpretável. */
  totalAppointments: number;
  counts: Record<PendencyFlag, number>;
  criterios: { semEvolucao: string; plato: string };
  plateauRecentDays: number;
}

export interface AppointmentPendenciesResponse {
  data: Record<string, AppointmentPendency>;
  meta: AppointmentPendenciesMeta;
}

export interface UseAppointmentPendenciesOptions {
  /** YYYY-MM-DD */
  from?: string | null;
  /** YYYY-MM-DD */
  to?: string | null;
  enabled?: boolean;
}

/**
 * Raiz da chave de cache. Exportada para quem grava evolução poder invalidar
 * todas as janelas sem repetir a string literal.
 */
export const APPOINTMENT_PENDENCIES_KEY = ["clinical", "appointment-pendencies"] as const;

export function useAppointmentPendencies(options: UseAppointmentPendenciesOptions = {}) {
  const { from, to, enabled = true } = options;
  const hasRange = Boolean(from && to);

  return useQuery({
    queryKey: [...APPOINTMENT_PENDENCIES_KEY, from ?? null, to ?? null],
    queryFn: async () => {
      const params = new URLSearchParams({ from: String(from), to: String(to) });
      return request<AppointmentPendenciesResponse>(
        `/api/clinical/appointments/pendencias?${params.toString()}`,
      );
    },
    enabled: enabled && hasRange,
    staleTime: 1000 * 60 * 5,
    // gcTime menor que o maxAge do persister faz o cache ser descartado no login.
    gcTime: 1000 * 60 * 60 * 24,
  });
}

/** Rótulo curto do badge. */
export const PENDENCY_LABEL: Record<PendencyFlag, string> = {
  sem_evolucao: "Sem evolução",
  plato: "Platô",
};

/**
 * Texto do tooltip. Sempre inclui o critério: um badge sem critério não é
 * acionável — a fisioterapeuta precisa saber por que ele acendeu.
 */
export function describePendency(
  pendency: AppointmentPendency,
  meta?: AppointmentPendenciesMeta,
): string {
  return pendency.flags
    .map((flag) => {
      if (flag === "sem_evolucao") {
        return `${PENDENCY_LABEL.sem_evolucao}: ${
          meta?.criterios.semEvolucao ??
          "atendimento já realizado e nenhuma evolução escrita para esta data"
        }`;
      }
      const detalhe =
        pendency.plateauSessions != null
          ? ` (${pendency.plateauSessions} sessões seguidas${
              pendency.plateauLastDate ? `, até ${pendency.plateauLastDate}` : ""
            })`
          : "";
      return `${PENDENCY_LABEL.plato}${detalhe}: ${
        meta?.criterios.plato ??
        "mesma conduta repetida sem ganho de carga nem de dor"
      }`;
    })
    .join("\n");
}
