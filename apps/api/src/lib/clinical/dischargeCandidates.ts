/**
 * Fila de candidatos a alta retroativa.
 *
 * Why: 612 pacientes estão sem sessão há mais de 90 dias e sem retorno marcado.
 * Hoje todos são tratados como iguais, e não são: parte recebeu alta e parte
 * abandonou. Sem separar, qualquer campanha de reativação incomoda quem já foi
 * liberado, e o indicador de desfecho fica sem sentido.
 *
 * O que este módulo é: uma FILA DE TRABALHO para a recepção confirmar por
 * telefone, ordenada por força de evidência.
 *
 * O que este módulo NÃO é: inferência de alta. Nenhum candidato vira alta sozinho.
 * Inferir desfecho por inatividade é o mesmo viés de seleção que já foi testado e
 * descartado na atribuição de autoria — quem some não é igual a quem é liberado,
 * e o resíduo concentra justamente os casos ruins.
 */

import type { Env } from "../../types/env";
import { getRawSql } from "../db";

/**
 * Pesos dos sinais. Deliberadamente pequenos e explicáveis: a recepção precisa
 * entender por que um paciente está no topo da fila, senão a fila não é usada.
 */
export const CANDIDATE_SIGNALS = {
  /** Menção de alta já extraída do texto pelo parser. É o sinal mais forte. */
  altaNoTexto: 50,
  /** "está indo para a academia" — transição para autonomia, o desfecho real mais comum. */
  academia: 20,
  /** Última evolução registra ausência de dor/desconforto. */
  semDor: 15,
  /** Última evolução traz orientação domiciliar — autogestão, critério de alta. */
  orientacaoDomiciliar: 10,
  /** Tratamento longo: quem fez muitas sessões e parou tem mais chance de ter concluído. */
  tratamentoLongo: 10,
} as const;

export interface DischargeCandidate {
  patientId: string;
  patientName: string;
  lastSessionAt: string;
  daysInactive: number;
  sessionsCount: number;
  score: number;
  /** Sinais que somaram pontos, para a recepção ver o porquê. */
  signals: string[];
  /** Trecho da última evolução, para a ligação ter contexto. */
  lastEvolutionExcerpt: string | null;
  hasPhone: boolean;
}

export async function listDischargeCandidates(
  env: Env,
  params: { organizationId: string; minInactiveDays?: number; limit?: number; offset?: number },
): Promise<{ candidates: DischargeCandidate[]; total: number; semTelefone: number }> {
  const minInactiveDays = Math.max(params.minInactiveDays ?? 90, 30);
  const limit = Math.min(params.limit ?? 50, 200);
  const offset = Math.max(params.offset ?? 0, 0);
  const sql = getRawSql(env, "read");

  const result = await sql`
    WITH ult AS (
      SELECT patient_id, max(date) AS ultima, count(*)::int AS sessoes
      FROM sessions
      WHERE organization_id = ${params.organizationId}::uuid AND deleted_at IS NULL
      GROUP BY patient_id
    ),
    futuro AS (
      SELECT DISTINCT patient_id FROM appointments
      WHERE organization_id = ${params.organizationId}::uuid
        AND date > CURRENT_DATE
        AND status IN ('agendado', 'presenca_confirmada')
    ),
    ja_registrado AS (
      SELECT DISTINCT patient_id FROM discharge_events
      WHERE organization_id = ${params.organizationId}::uuid
    ),
    ultima_evo AS (
      SELECT DISTINCT ON (patient_id) patient_id, observacao, id AS session_id
      FROM sessions
      WHERE organization_id = ${params.organizationId}::uuid AND deleted_at IS NULL
      ORDER BY patient_id, date DESC
    ),
    alta_texto AS (
      SELECT DISTINCT patient_id FROM clinical_extractions
      WHERE organization_id = ${params.organizationId}::uuid
        AND category = 'alta' AND rejected = false
    ),
    base AS (
      SELECT
        u.patient_id, u.ultima, u.sessoes,
        (CURRENT_DATE - u.ultima::date)::int AS dias_inativo,
        e.observacao,
        (a.patient_id IS NOT NULL)                                  AS tem_alta_texto,
        (e.observacao ~* '\\yacademia\\y')                            AS tem_academia,
        (e.observacao ~* 'sem dor|sem desconforto|aus[êe]ncia de dor') AS tem_sem_dor,
        (e.observacao ~* 'orienta[çc][õo]es? (para|domiciliar|de casa)|orienta[çc][ãa]o domiciliar') AS tem_orientacao
      FROM ult u
      LEFT JOIN futuro f        ON f.patient_id = u.patient_id
      LEFT JOIN ja_registrado r ON r.patient_id = u.patient_id
      LEFT JOIN ultima_evo e    ON e.patient_id = u.patient_id
      LEFT JOIN alta_texto a    ON a.patient_id = u.patient_id
      WHERE f.patient_id IS NULL
        AND r.patient_id IS NULL
        AND u.ultima < CURRENT_DATE - ${minInactiveDays}::int
    ),
    pontuado AS (
      SELECT b.*,
        (CASE WHEN b.tem_alta_texto  THEN ${CANDIDATE_SIGNALS.altaNoTexto}          ELSE 0 END
       + CASE WHEN b.tem_academia    THEN ${CANDIDATE_SIGNALS.academia}             ELSE 0 END
       + CASE WHEN b.tem_sem_dor     THEN ${CANDIDATE_SIGNALS.semDor}               ELSE 0 END
       + CASE WHEN b.tem_orientacao  THEN ${CANDIDATE_SIGNALS.orientacaoDomiciliar} ELSE 0 END
       + CASE WHEN b.sessoes >= 10   THEN ${CANDIDATE_SIGNALS.tratamentoLongo}      ELSE 0 END
        ) AS score
      FROM base b
    )
    SELECT
      p.patient_id AS "patientId",
      pa.full_name AS "patientName",
      p.ultima     AS "lastSessionAt",
      p.dias_inativo AS "daysInactive",
      p.sessoes    AS "sessionsCount",
      p.score,
      p.tem_alta_texto AS "temAltaTexto",
      p.tem_academia   AS "temAcademia",
      p.tem_sem_dor    AS "temSemDor",
      p.tem_orientacao AS "temOrientacao",
      left(regexp_replace(coalesce(p.observacao, ''), '\\s+', ' ', 'g'), 220) AS "lastEvolutionExcerpt",
      (pa.phone IS NOT NULL AND pa.phone <> '') AS "hasPhone",
      count(*) OVER () AS "total",
      count(*) FILTER (WHERE pa.phone IS NULL OR pa.phone = '') OVER () AS "semTelefone"
    FROM pontuado p
    JOIN patients pa ON pa.id = p.patient_id
    -- Score primeiro; entre empatados, o mais recente, porque a memória do
    -- paciente sobre o próprio tratamento é melhor.
    ORDER BY p.score DESC, p.ultima DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const rows = result.rows ?? [];

  const candidates: DischargeCandidate[] = rows.map((r: any) => {
    const signals: string[] = [];
    if (r.temAltaTexto) signals.push("alta mencionada no prontuário");
    if (r.temAcademia) signals.push("última evolução menciona academia");
    if (r.temSemDor) signals.push("última evolução registra ausência de dor");
    if (r.temOrientacao) signals.push("recebeu orientação domiciliar");
    if (Number(r.sessionsCount) >= 10) signals.push(`tratamento longo (${r.sessionsCount} sessões)`);

    return {
      patientId: r.patientId,
      patientName: r.patientName,
      lastSessionAt: r.lastSessionAt,
      daysInactive: Number(r.daysInactive),
      sessionsCount: Number(r.sessionsCount),
      score: Number(r.score),
      signals,
      lastEvolutionExcerpt: r.lastEvolutionExcerpt || null,
      hasPhone: Boolean(r.hasPhone),
    };
  });

  return {
    candidates,
    total: Number(rows[0]?.total ?? 0),
    semTelefone: Number(rows[0]?.semTelefone ?? 0),
  };
}
