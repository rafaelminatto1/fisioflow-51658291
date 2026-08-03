/**
 * Pendências clínicas por agendamento, em lote.
 *
 * Why: a agenda é a única tela que a equipe olha todo dia. Um indicador que só
 * existe num relatório separado não muda conduta. Mas badge que aparece em quase
 * todo card vira ruído e a equipe aprende a ignorar — por isso o conjunto aqui é
 * deliberadamente pequeno e cada sinal foi medido em produção antes de entrar.
 *
 * Medições sobre 1.063 agendamentos (janela de 60 dias, produção, 03/ago/2026):
 *
 *   - `sem_evolucao`  → 3–15% dos cards por semana (duas semanas de junho batem
 *                       69–84%, mas são uma falha pontual de registro, não a
 *                       linha de base). Fica.
 *   - `plato`         → 2,0% dos cards (4 pacientes). Raro por construção. Fica.
 *   - sem avaliação inicial → 25,2% dos cards, e é um flag de PACIENTE que nunca
 *                       se resolve para a base importada (534 de 1.022 pacientes
 *                       jamais terão resposta de avaliação). Cortado: ficaria
 *                       aceso para sempre em um quarto da agenda.
 *   - candidato a alta → cortado por erro de categoria, não por volume: a fila de
 *                       alta exige "sem agendamento futuro", então um paciente
 *                       que aparece na agenda não é candidato. Os 15 cards que
 *                       casariam só casam porque a evolução não foi escrita — o
 *                       que `sem_evolucao` já sinaliza melhor.
 *
 * Uma única consulta para toda a janela: a agenda carrega uma semana inteira e
 * N+1 por card derrubaria a tela.
 */

import type { Env } from "../../types/env";
import { getRawSql } from "../db";
import { PAIN_MCID_POINTS, PLATEAU_MIN_SESSIONS } from "./plateauDetection";

/**
 * Status que implicam que o atendimento aconteceu. Falta e cancelamento ficam de
 * fora de propósito: não existe evolução a escrever para quem não veio.
 */
export const ATTENDED_STATUSES = ["atendido", "presenca_confirmada", "avaliacao"] as const;

/**
 * Janela em que um platô ainda é acionável. Sem este corte o alerta sobe de 2,0%
 * para 8,2% dos cards e passa a apontar sequências encerradas há meses, sobre as
 * quais não há mais o que decidir.
 */
export const PLATEAU_RECENT_DAYS = 90;

/**
 * Teto de dias por consulta. A agenda pede uma semana; o mês é o pior caso
 * legítimo. Acima disso é varredura, não agenda.
 */
export const MAX_RANGE_DAYS = 62;

export type PendencyFlag = "sem_evolucao" | "plato";

export interface AppointmentPendency {
  appointmentId: string;
  patientId: string;
  flags: PendencyFlag[];
  /** Sessões consecutivas com a mesma conduta, quando o platô estiver aceso. */
  plateauSessions: number | null;
  /** Última data da sequência em platô, para a UI datar o sinal. */
  plateauLastDate: string | null;
}

export interface PendencyReport {
  /** Indexado por `appointmentId` — a agenda casa por card, não por paciente. */
  byAppointment: Record<string, AppointmentPendency>;
  /** Denominador: quantos cards a janela tem. Alerta sem denominador não é auditável. */
  totalAppointments: number;
  counts: Record<PendencyFlag, number>;
}

/** Rótulos e critérios exibidos no tooltip — número sem critério não é acionável. */
export const PENDENCY_LABELS: Record<PendencyFlag, { label: string; criterio: string }> = {
  sem_evolucao: {
    label: "Sem evolução",
    criterio: "Atendimento já realizado e nenhuma evolução escrita para esta data",
  },
  plato: {
    label: "Platô",
    criterio: `${PLATEAU_MIN_SESSIONS} sessões seguidas com a mesma conduta e sem ganho de carga ou de dor (variação menor que ${PAIN_MCID_POINTS} ponto na EVA) nos últimos ${PLATEAU_RECENT_DAYS} dias`,
  },
};

function isYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function assertRange(from: string, to: string): void {
  if (!isYmd(from) || !isYmd(to)) {
    throw new Error("from e to devem estar no formato YYYY-MM-DD");
  }
  if (from > to) {
    throw new Error("from não pode ser posterior a to");
  }
  const days = Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000,
  );
  if (days > MAX_RANGE_DAYS) {
    throw new Error(`intervalo máximo é de ${MAX_RANGE_DAYS} dias`);
  }
}

export async function listAppointmentPendencies(
  env: Env,
  params: { organizationId: string; from: string; to: string },
): Promise<PendencyReport> {
  assertRange(params.from, params.to);
  const sql = getRawSql(env, "read");

  const result = await sql`
    WITH janela AS (
      SELECT a.id, a.patient_id, a.date, a.status
      FROM appointments a
      WHERE a.organization_id = ${params.organizationId}::uuid
        AND a.deleted_at IS NULL
        AND a.date BETWEEN ${params.from}::date AND ${params.to}::date
    ),
    -- Evolução pode estar amarrada ao agendamento ou só à data (base importada
    -- não tem appointment_id). Observação em branco conta como não escrita.
    sem_evolucao AS (
      SELECT j.id
      FROM janela j
      WHERE j.date < CURRENT_DATE
        AND j.status = ANY(${[...ATTENDED_STATUSES]}::text[])
        AND NOT EXISTS (
          SELECT 1 FROM sessions s
          WHERE s.organization_id = ${params.organizationId}::uuid
            AND s.deleted_at IS NULL
            AND (s.appointment_id = j.id
                 OR (s.patient_id = j.patient_id AND s.date::date = j.date))
            AND coalesce(btrim(s.observacao), '') <> ''
        )
    ),
    -- Platô: mesma definição de plateauDetection.ts, restrita aos pacientes da
    -- janela para não varrer clinical_extractions inteira a cada carga da agenda.
    assinatura AS (
      SELECT s.id, s.patient_id, s.date,
             string_agg(DISTINCT ce.code, ',' ORDER BY ce.code) AS sig
      FROM sessions s
      JOIN clinical_extractions ce
        ON ce.source_id = s.id
       AND ce.source_table = 'sessions'
       AND ce.category IN ('conduta', 'regiao')
       AND ce.rejected = false
      WHERE s.organization_id = ${params.organizationId}::uuid
        AND s.deleted_at IS NULL
        AND s.patient_id IN (SELECT patient_id FROM janela)
      GROUP BY s.id, s.patient_id, s.date
    ),
    ilhas AS (
      SELECT patient_id, date, sig, id,
             row_number() OVER (PARTITION BY patient_id ORDER BY date)
           - row_number() OVER (PARTITION BY patient_id, sig ORDER BY date) AS grp
      FROM assinatura
    ),
    sequencias AS (
      SELECT patient_id, sig, grp,
             count(*)::int AS sessoes,
             max(date) AS ate,
             array_agg(id) AS session_ids
      FROM ilhas
      GROUP BY patient_id, sig, grp
      HAVING count(*) >= ${PLATEAU_MIN_SESSIONS}
         AND max(date) >= CURRENT_DATE - ${PLATEAU_RECENT_DAYS}::int
    ),
    metricas AS (
      SELECT q.*,
        (SELECT count(DISTINCT ce.value_numeric) FROM clinical_extractions ce
          WHERE ce.source_id = ANY(q.session_ids) AND ce.category = 'carga'
            AND ce.source_table = 'sessions'
            AND ce.rejected = false) AS cargas_distintas,
        (SELECT count(*) FROM clinical_extractions ce
          WHERE ce.source_id = ANY(q.session_ids) AND ce.category = 'carga'
            AND ce.source_table = 'sessions'
            AND ce.rejected = false) AS cargas_total,
        (SELECT max(ce.value_numeric) - min(ce.value_numeric) FROM clinical_extractions ce
          WHERE ce.source_id = ANY(q.session_ids) AND ce.category = 'eva'
            AND ce.source_table = 'sessions'
            AND ce.rejected = false) AS amplitude_dor,
        (SELECT count(*) FROM clinical_extractions ce
          WHERE ce.source_id = ANY(q.session_ids) AND ce.category = 'eva'
            AND ce.source_table = 'sessions'
            AND ce.rejected = false) AS leituras_dor
      FROM sequencias q
    ),
    -- Só o platô CONFIRMADO (2 eixos) vira badge: repetição de conduta sozinha
    -- deu 51% de falso positivo em produção.
    plato AS (
      SELECT patient_id, max(sessoes) AS sessoes, max(ate) AS ate
      FROM metricas
      WHERE (CASE WHEN cargas_total >= 2 AND cargas_distintas <= 1 THEN 1 ELSE 0 END)
          + (CASE WHEN leituras_dor >= 2 AND amplitude_dor < ${PAIN_MCID_POINTS} THEN 1 ELSE 0 END) >= 1
      GROUP BY patient_id
    )
    SELECT
      j.id::text          AS "appointmentId",
      j.patient_id::text  AS "patientId",
      (e.id IS NOT NULL)  AS "semEvolucao",
      (p.patient_id IS NOT NULL) AS "plato",
      p.sessoes           AS "plateauSessions",
      p.ate               AS "plateauLastDate",
      count(*) OVER ()::int AS "totalAppointments"
    FROM janela j
    LEFT JOIN sem_evolucao e ON e.id = j.id
    LEFT JOIN plato p        ON p.patient_id = j.patient_id
  `;

  const rows = (result.rows ?? []) as Array<Record<string, unknown>>;
  const byAppointment: Record<string, AppointmentPendency> = {};
  const counts: Record<PendencyFlag, number> = { sem_evolucao: 0, plato: 0 };

  for (const row of rows) {
    const flags: PendencyFlag[] = [];
    if (row.semEvolucao === true) flags.push("sem_evolucao");
    if (row.plato === true) flags.push("plato");
    if (flags.length === 0) continue;

    for (const flag of flags) counts[flag]++;

    const lastDate = row.plateauLastDate;
    byAppointment[String(row.appointmentId)] = {
      appointmentId: String(row.appointmentId),
      patientId: String(row.patientId),
      flags,
      plateauSessions: row.plateauSessions == null ? null : Number(row.plateauSessions),
      plateauLastDate:
        lastDate == null
          ? null
          : lastDate instanceof Date
            ? lastDate.toISOString().slice(0, 10)
            : String(lastDate).slice(0, 10),
    };
  }

  return {
    byAppointment,
    totalAppointments: Number(rows[0]?.totalAppointments ?? 0),
    counts,
  };
}
