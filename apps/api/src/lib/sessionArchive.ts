import { getRawSql } from "./db";
import type { Env } from "../types/env";

const ARCHIVE_AFTER_DAYS = 90;
const BATCH_SIZE = 500;
const MAX_BATCHES_PER_RUN = 20;

type ArchiveTrigger = "cron" | "manual" | "backfill";

interface ArchiveResult {
  runId: number;
  rowsEligible: number;
  rowsSent: number;
  rowsMarked: number;
  status: "success" | "partial" | "failed";
  errorMessage?: string;
}

interface SessionEvent {
  event_type: "session_archive";
  session_id: string;
  organization_id: string;
  patient_id: string | null;
  therapist_id: string | null;
  appointment_id: string | null;
  date: string | null;
  duration: number | null;
  status: string | null;
  observacao: string | null;
  pain_scale: number | null;
  procedures: unknown;
  exercises: unknown;
  measurements: unknown;
  home_exercises: unknown;
  finalized_at: string | null;
  finalized_by: string | null;
  created_at: string;
  updated_at: string | null;
  archived_at: string;
}

/**
 * S6.2 Fase 3 — varre sessions com `created_at < now - 90d` ainda nao
 * arquivadas, manda em batches ao Pipeline R2 (EVENTS_PIPELINE → sink
 * Iceberg `fisioflow_archive.sessions_archive`) e marca `archived_at`.
 *
 * Idempotente: WHERE archived_at IS NULL impede re-arquivamento.
 * Auditavel: session_archive_runs registra cada execucao.
 */
export async function runSessionArchive(
  env: Env,
  trigger: ArchiveTrigger = "cron",
): Promise<ArchiveResult> {
  const sql = getRawSql(env, "write");
  const windowEnd = new Date(Date.now() - ARCHIVE_AFTER_DAYS * 86_400_000);
  const windowStart = new Date(0);

  const runInsert = await sql<{ id: number }>`
    INSERT INTO public.session_archive_runs (trigger, window_start, window_end, status)
    VALUES (${trigger}, ${windowStart}, ${windowEnd}, 'running')
    RETURNING id
  `;
  const runId = runInsert.rows[0]!.id;

  if (!env.EVENTS_PIPELINE) {
    await sql`
      UPDATE public.session_archive_runs
      SET status = 'failed', error_message = 'EVENTS_PIPELINE binding ausente', finished_at = now()
      WHERE id = ${runId}
    `;
    return {
      runId,
      rowsEligible: 0,
      rowsSent: 0,
      rowsMarked: 0,
      status: "failed",
      errorMessage: "EVENTS_PIPELINE binding ausente",
    };
  }

  let rowsEligible = 0;
  let rowsSent = 0;
  let rowsMarked = 0;
  let status: "success" | "partial" | "failed" = "success";
  let errorMessage: string | undefined;

  try {
    for (let batchIndex = 0; batchIndex < MAX_BATCHES_PER_RUN; batchIndex++) {
      const batch = await sql<{
        id: string;
        organization_id: string;
        patient_id: string | null;
        therapist_id: string | null;
        appointment_id: string | null;
        date: Date | null;
        duration: number | null;
        status: string | null;
        observacao: string | null;
        pain_scale: number | null;
        procedures: unknown;
        exercises: unknown;
        measurements: unknown;
        home_exercises: unknown;
        finalized_at: Date | null;
        finalized_by: string | null;
        created_at: Date;
        updated_at: Date | null;
      }>`
        SELECT id, organization_id, patient_id, therapist_id, appointment_id,
               date, duration, status, observacao, pain_scale,
               procedures, exercises, measurements, home_exercises,
               finalized_at, finalized_by, created_at, updated_at
        FROM public.sessions
        WHERE archived_at IS NULL
          AND deleted_at IS NULL
          AND created_at < ${windowEnd}
        ORDER BY created_at ASC
        LIMIT ${BATCH_SIZE}
      `;

      if (batch.rows.length === 0) break;

      rowsEligible += batch.rows.length;
      const archiveTs = new Date().toISOString();
      const events: SessionEvent[] = batch.rows.map((r) => ({
        event_type: "session_archive",
        session_id: r.id,
        organization_id: r.organization_id,
        patient_id: r.patient_id,
        therapist_id: r.therapist_id,
        appointment_id: r.appointment_id,
        date: r.date ? r.date.toISOString() : null,
        duration: r.duration,
        status: r.status,
        observacao: r.observacao,
        pain_scale: r.pain_scale,
        procedures: r.procedures,
        exercises: r.exercises,
        measurements: r.measurements,
        home_exercises: r.home_exercises,
        finalized_at: r.finalized_at ? r.finalized_at.toISOString() : null,
        finalized_by: r.finalized_by,
        created_at: r.created_at.toISOString(),
        updated_at: r.updated_at ? r.updated_at.toISOString() : null,
        archived_at: archiveTs,
      }));

      // Stream fisioflow_events_stream exige schema { value: json }; wrappa cada evento.
      const wrapped = events.map((e) => ({ value: e }));
      await env.EVENTS_PIPELINE.send(wrapped as unknown as Array<Record<string, unknown>>);
      rowsSent += events.length;

      const ids = batch.rows.map((r) => r.id);
      const updated = await sql<{ id: string }>`
        UPDATE public.sessions
        SET archived_at = ${archiveTs}
        WHERE id = ANY(${ids}::uuid[]) AND archived_at IS NULL
        RETURNING id
      `;
      rowsMarked += updated.rows.length;

      if (rowsSent !== rowsMarked) status = "partial";

      if (batch.rows.length < BATCH_SIZE) break;
    }
  } catch (err) {
    status = "failed";
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[sessionArchive] run failed", err);
  }

  await sql`
    UPDATE public.session_archive_runs
    SET rows_eligible = ${rowsEligible},
        rows_sent = ${rowsSent},
        rows_marked = ${rowsMarked},
        status = ${status},
        error_message = ${errorMessage ?? null},
        finished_at = now()
    WHERE id = ${runId}
  `;

  return { runId, rowsEligible, rowsSent, rowsMarked, status, errorMessage };
}
