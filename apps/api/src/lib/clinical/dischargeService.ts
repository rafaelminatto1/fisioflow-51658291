/**
 * Alta fisioterapêutica — registro e consulta.
 *
 * Why: hoje a clínica não distingue alta de abandono. 146 pacientes ativos estão
 * sem próxima sessão e não há como saber quais foram liberados. Isso quebra tanto
 * o indicador de desfecho quanto qualquer campanha de reativação, que acabaria
 * incomodando quem já teve alta.
 */

import type { Env } from "../../types/env";
import { getRawSql } from "../db";

export const DISCHARGE_REASONS = [
  "alta_objetivo_atingido",
  "alta_maximo_funcional",
  "alta_transicao_autonomia",
  "alta_medica",
  "encaminhado",
  "interrompido_paciente",
] as const;

export type DischargeReason = (typeof DISCHARGE_REASONS)[number];
export type DischargeOrigin = "profissional" | "texto" | "retroativo";

/** Rótulos em PT-BR — a UI não deve inventar os seus. */
export const DISCHARGE_REASON_LABELS: Record<DischargeReason, string> = {
  alta_objetivo_atingido: "Alta — objetivo atingido",
  alta_maximo_funcional: "Alta — máximo funcional atingido",
  alta_transicao_autonomia: "Alta — transição para autonomia",
  alta_medica: "Alta médica",
  encaminhado: "Encaminhado a outro profissional",
  interrompido_paciente: "Interrompido pelo paciente",
};

export interface DischargeInput {
  organizationId: string;
  patientId: string;
  sessionId?: string | null;
  dischargedAt?: string | null;
  reason: DischargeReason;
  scope?: string | null;
  baselineSummary?: string | null;
  finalSummary?: string | null;
  painInitial?: number | null;
  painFinal?: number | null;
  maintenancePlan?: string | null;
  returnCriteria?: string | null;
  reviewDate?: string | null;
  origin?: DischargeOrigin;
  notes?: string | null;
  createdBy?: string | null;
}

export function isDischargeReason(v: unknown): v is DischargeReason {
  return typeof v === "string" && (DISCHARGE_REASONS as readonly string[]).includes(v);
}

/**
 * Sugere o conteúdo do bloco de alta a partir do que já foi extraído.
 *
 * Why: a barreira ao registro não é falta de vontade, é atrito. O estudo com
 * fisioterapeutas portugueses mostrou 82,7% de não uso de PROMs tendo como
 * barreiras tempo e ausência de plataforma que calcule sozinha — e vimos o mesmo
 * padrão aqui com o EVA (12,9% de preenchimento com o campo disponível).
 * Pré-preencher com `LB:` e EVA já extraídos transforma o registro em confirmação.
 */
export async function suggestDischargeContent(
  env: Env,
  params: { organizationId: string; patientId: string },
): Promise<{
  baselineSummary: string | null;
  painInitial: number | null;
  painFinal: number | null;
  sessionsCount: number;
  firstSessionAt: string | null;
  lastSessionAt: string | null;
}> {
  const sql = getRawSql(env, "read");

  const result = await sql`
    WITH sess AS (
      SELECT id, date FROM sessions
      WHERE patient_id = ${params.patientId}::uuid
        AND organization_id = ${params.organizationId}::uuid
        AND deleted_at IS NULL
    ),
    base AS (
      SELECT ce.source_text, s.date
      FROM clinical_extractions ce
      JOIN sess s ON s.id = ce.source_id
      WHERE ce.category = 'linha_base' AND ce.rejected = false
      ORDER BY s.date ASC
      LIMIT 1
    ),
    dor AS (
      SELECT ce.value_numeric, s.date
      FROM clinical_extractions ce
      JOIN sess s ON s.id = ce.source_id
      WHERE ce.category = 'eva' AND ce.rejected = false
    )
    SELECT
      (SELECT source_text FROM base)                                   AS baseline_summary,
      (SELECT value_numeric FROM dor ORDER BY date ASC  LIMIT 1)       AS pain_initial,
      (SELECT value_numeric FROM dor ORDER BY date DESC LIMIT 1)       AS pain_final,
      (SELECT count(*) FROM sess)                                      AS sessions_count,
      (SELECT min(date) FROM sess)                                     AS first_session_at,
      (SELECT max(date) FROM sess)                                     AS last_session_at
  `;

  const r = result.rows?.[0] ?? {};
  return {
    baselineSummary: r.baseline_summary ?? null,
    painInitial: r.pain_initial != null ? Number(r.pain_initial) : null,
    painFinal: r.pain_final != null ? Number(r.pain_final) : null,
    sessionsCount: Number(r.sessions_count ?? 0),
    firstSessionAt: r.first_session_at ?? null,
    lastSessionAt: r.last_session_at ?? null,
  };
}

export async function recordDischarge(env: Env, input: DischargeInput) {
  const sql = getRawSql(env, "write");

  const result = await sql`
    INSERT INTO discharge_events (
      organization_id, patient_id, session_id, discharged_at, reason, scope,
      baseline_summary, final_summary, pain_initial, pain_final,
      maintenance_plan, return_criteria, review_date, origin, notes, created_by
    ) VALUES (
      ${input.organizationId}::uuid,
      ${input.patientId}::uuid,
      ${input.sessionId ?? null}::uuid,
      ${input.dischargedAt ?? null}::date,
      ${input.reason},
      ${input.scope ?? null},
      ${input.baselineSummary ?? null},
      ${input.finalSummary ?? null},
      ${input.painInitial ?? null},
      ${input.painFinal ?? null},
      ${input.maintenancePlan ?? null},
      ${input.returnCriteria ?? null},
      ${input.reviewDate ?? null}::date,
      ${input.origin ?? "profissional"},
      ${input.notes ?? null},
      ${input.createdBy ?? null}::uuid
    )
    ON CONFLICT (patient_id, discharged_at, COALESCE(scope, '')) DO UPDATE SET
      reason = EXCLUDED.reason,
      final_summary = EXCLUDED.final_summary,
      maintenance_plan = EXCLUDED.maintenance_plan,
      return_criteria = EXCLUDED.return_criteria,
      review_date = EXCLUDED.review_date,
      updated_at = now()
    RETURNING id, patient_id, discharged_at, reason, scope, origin
  `;

  return result.rows?.[0] ?? null;
}

export async function listPatientDischarges(
  env: Env,
  params: { organizationId: string; patientId: string },
) {
  const sql = getRawSql(env, "read");
  const result = await sql`
    SELECT id, discharged_at, reason, scope, baseline_summary, final_summary,
           pain_initial, pain_final, maintenance_plan, return_criteria,
           review_date, origin, confirmed_by, notes
    FROM discharge_events
    WHERE organization_id = ${params.organizationId}::uuid
      AND patient_id = ${params.patientId}::uuid
    ORDER BY discharged_at DESC
  `;
  return result.rows ?? [];
}

/**
 * Decomposição de desfecho.
 *
 * Why não devolver "taxa de alta" sozinha: a literatura mostra que a taxa de alta
 * formal fica em 30–38% mesmo em serviço estruturado, e cai quando os critérios
 * ficam objetivos. Um número solto seria lido como piora. A decomposição mostra
 * para onde os pacientes foram — inclusive quantos são abandono inferido, que é o
 * único desfecho aqui que ninguém declarou.
 */
export async function outcomeBreakdown(
  env: Env,
  params: { organizationId: string; inactiveDays?: number },
) {
  const inactiveDays = params.inactiveDays ?? 90;
  const sql = getRawSql(env, "read");

  const result = await sql`
    WITH atendidos AS (
      SELECT DISTINCT patient_id, max(date) AS ultima
      FROM sessions
      WHERE organization_id = ${params.organizationId}::uuid AND deleted_at IS NULL
      GROUP BY patient_id
    ),
    alta AS (
      SELECT DISTINCT ON (patient_id) patient_id, reason, scope, origin, confirmed_by
      FROM discharge_events
      WHERE organization_id = ${params.organizationId}::uuid
      ORDER BY patient_id, discharged_at DESC
    ),
    futuro AS (
      SELECT DISTINCT patient_id FROM appointments
      WHERE organization_id = ${params.organizationId}::uuid
        AND date > CURRENT_DATE
        AND status IN ('agendado', 'presenca_confirmada')
    )
    SELECT
      count(*) AS total,
      count(*) FILTER (
        WHERE a.reason IS NOT NULL AND a.scope IS NULL
          AND (a.origin <> 'texto' OR a.confirmed_by IS NOT NULL)
      ) AS com_desfecho_declarado,
      count(*) FILTER (WHERE a.origin = 'texto' AND a.confirmed_by IS NULL) AS alta_a_confirmar,
      count(*) FILTER (WHERE f.patient_id IS NOT NULL) AS em_tratamento,
      count(*) FILTER (
        WHERE a.reason IS NULL AND f.patient_id IS NULL
          AND t.ultima < CURRENT_DATE - ${inactiveDays}::int
      ) AS abandono_inferido,
      count(*) FILTER (
        WHERE a.reason IS NULL AND f.patient_id IS NULL
          AND t.ultima >= CURRENT_DATE - ${inactiveDays}::int
      ) AS sem_retorno_recente
    FROM atendidos t
    LEFT JOIN alta a ON a.patient_id = t.patient_id
    LEFT JOIN futuro f ON f.patient_id = t.patient_id
  `;

  const r = result.rows?.[0] ?? {};
  return {
    total: Number(r.total ?? 0),
    comDesfechoDeclarado: Number(r.com_desfecho_declarado ?? 0),
    altaAConfirmar: Number(r.alta_a_confirmar ?? 0),
    emTratamento: Number(r.em_tratamento ?? 0),
    abandonoInferido: Number(r.abandono_inferido ?? 0),
    semRetornoRecente: Number(r.sem_retorno_recente ?? 0),
    inactiveDays,
  };
}
