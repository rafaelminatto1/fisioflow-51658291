/**
 * usePrefetchWeeklyPatientData — pré-carrega dados clínicos dos pacientes
 * agendados na próxima semana, para que estejam disponíveis offline.
 *
 * Roda quando online + sob demanda (callback). Não bloqueia UI.
 *
 * Dados pré-carregados por paciente:
 *  - Lista de evoluções recentes (useSoapRecords / sessionsApi.list)
 *  - Cirurgias, retornos médicos, patologias (perfil clínico)
 *
 * Os dados vão para o QueryClient — que persiste em IDB (7 dias) — então as
 * páginas de evolução/histórico funcionam offline mesmo se nunca foram abertas.
 */
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { appointmentsApi, patientsApi, sessionsApi } from "@/api/v2";
import { evolutionKeys } from "@/hooks/soap/types";
import { fisioLogger as logger } from "@/lib/errors/logger";

/** Limite de pacientes processados por execução (controle de custo) */
const MAX_PATIENTS = 100;
/** Concorrência por lote para não saturar a rede */
const BATCH_SIZE = 8;
/** Cooldown entre execuções — evita pre-fetch repetido em reconnects rápidos */
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos

// Estado module-level para dedup (mesmo entre re-mounts do hook)
let lastRunAt = 0;
let runningPromise: Promise<{ skipped: boolean; patientCount: number; error?: unknown }> | null =
  null;

export function usePrefetchWeeklyPatientData() {
  const queryClient = useQueryClient();

  const prefetchNow = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { skipped: true, patientCount: 0 };
    }

    // Dedupe — se já está rodando, retorna a mesma promise
    if (runningPromise) return runningPromise;

    // Cooldown — não re-roda se foi feito recentemente
    if (Date.now() - lastRunAt < COOLDOWN_MS) {
      return { skipped: true, patientCount: 0 };
    }

    runningPromise = (async () => {
      try {
        // 1) Buscar agendamentos da próxima semana
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const horizon = new Date(today);
        horizon.setDate(horizon.getDate() + 7);
        const todayStr = today.toISOString().split("T")[0];
        const horizonStr = horizon.toISOString().split("T")[0];

        const res = await appointmentsApi.list({
          dateFrom: todayStr,
          dateTo: horizonStr,
          limit: 500,
        });
        const appointments = res.data ?? [];

        // 2) Distinct patient_ids
        const patientIds = Array.from(
          new Set(
            appointments
              .map((a) => (a as { patient_id?: string }).patient_id)
              .filter((v): v is string => typeof v === "string" && v.length > 0),
          ),
        ).slice(0, MAX_PATIENTS);

        if (patientIds.length === 0) {
          return { skipped: false, patientCount: 0 };
        }

        // 3) Prefetch em lotes — 4 queries por paciente
        const prefetchForPatient = async (patientId: string) => {
          await Promise.allSettled([
            queryClient.prefetchQuery({
              queryKey: evolutionKeys.list(patientId, { limit: 10 }),
              queryFn: async () => {
                const r = await sessionsApi.list({ patientId, limit: 10 });
                return r.data ?? [];
              },
              staleTime: 1000 * 60 * 10,
            }),
            queryClient.prefetchQuery({
              queryKey: ["patient-surgeries", patientId],
              queryFn: async () => {
                const r = await patientsApi.surgeries(patientId);
                return r.data ?? [];
              },
              staleTime: 1000 * 60 * 30,
            }),
            queryClient.prefetchQuery({
              queryKey: ["patient-medical-returns", patientId],
              queryFn: async () => {
                const r = await patientsApi.medicalReturns(patientId);
                return r.data ?? [];
              },
              staleTime: 1000 * 60 * 30,
            }),
            queryClient.prefetchQuery({
              queryKey: ["patient-pathologies", patientId],
              queryFn: async () => {
                const r = await patientsApi.pathologies(patientId);
                return r.data ?? [];
              },
              staleTime: 1000 * 60 * 30,
            }),
          ]);
        };

        for (let i = 0; i < patientIds.length; i += BATCH_SIZE) {
          const batch = patientIds.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(prefetchForPatient));
        }

        logger.info(
          `[PrefetchWeekly] Pré-carregadas ${patientIds.length} fichas (evolução + histórico) para uso offline`,
          { patientCount: patientIds.length },
          "usePrefetchWeeklyPatientData",
        );

        return { skipped: false, patientCount: patientIds.length };
      } catch (error) {
        logger.warn(
          "[PrefetchWeekly] Falha no prefetch",
          { error: (error as Error).message },
          "usePrefetchWeeklyPatientData",
        );
        return { skipped: false, patientCount: 0, error };
      } finally {
        lastRunAt = Date.now();
        runningPromise = null;
      }
    })();

    return runningPromise;
  }, [queryClient]);

  return { prefetchNow };
}
