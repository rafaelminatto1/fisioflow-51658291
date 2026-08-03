/**
 * Detecção de platô terapêutico.
 *
 * Why: a literatura de alta em fisioterapia (Physiother Can, estudo qualitativo
 * de prática ambulatorial) identifica o platô como o principal gatilho objetivo
 * para reavaliar o caso, e distingue dois tipos com condutas opostas:
 *
 *   - platô de MÁXIMO FUNCIONAL  → o paciente chegou ao teto da terapia → alta
 *   - platô TEMPORÁRIO           → o plano é que se esgotou → ajustar ou encaminhar
 *
 * O terceiro desfecho — "continuar igual" — é o default quando ninguém percebe o
 * platô, e é justamente o que este alerta existe para evitar. O módulo NÃO decide
 * qual dos dois tipos é: ele levanta a pergunta para o fisioterapeuta.
 *
 * Não usa IA. Opera sobre `clinical_extractions`, que é determinístico e auditável.
 */

import type { Env } from "../../types/env";
import { getRawSql } from "../db";

/**
 * Sessões consecutivas com conduta idêntica para caracterizar platô.
 *
 * Limiar derivado do NOSSO corpus, não importado: em 8.876 sequências de conduta
 * repetida, a mediana é 1 sessão, p90 = 2 e p95 = 3. Ou seja, a clínica varia a
 * conduta quase toda sessão. Repetir 4 vezes seguidas está acima do p95 e ocorre
 * em ~2% das sequências — o alerta é raro por construção, não por calibragem.
 */
export const PLATEAU_MIN_SESSIONS = 4;

/**
 * Mudança mínima clinicamente importante na dor (NRS/EVA 0–10).
 *
 * Segundo o PubMed: Salaffi et al. 2004 estabeleceram, em 825 pacientes com dor
 * musculoesquelética crônica, MCID de 1 ponto (ou 15%) para "levemente melhor" e
 * 2 pontos (ou 33%) para "muito melhor" (doi:10.1016/j.ejpain.2003.09.004).
 * Fleagle et al. 2024 encontraram 1,1 ponto (IC 0,9–1,6) para dor ao movimento
 * (doi:10.1016/j.jpain.2024.03.003).
 *
 * Usamos 1 ponto como piso: variação abaixo disso não é distinguível de ruído de
 * medição, então a dor conta como estável.
 */
export const PAIN_MCID_POINTS = 1;

/**
 * Eixos independentes exigidos para considerar platô.
 *
 * Medido em produção: repetição de conduta sozinha gera 175 sinais em 127
 * pacientes — mas em 89 deles (51%) a CARGA PROGREDIU no período. Ou seja, o
 * fisioterapeuta estava evoluindo o paciente dentro da mesma conduta, que é o
 * comportamento correto, não platô. Alertar nesses casos treinaria a equipe a
 * ignorar o alerta.
 *
 * Com 2 eixos, sobram ~32 sinais — volume acionável para uma clínica com ~92
 * pacientes ativos por mês.
 */
export const PLATEAU_MIN_AXES = 2;

export type PlateauStatus =
  /** Repetição de conduta confirmada por carga e/ou dor estagnadas. */
  | "confirmado"
  /** Conduta repetida, mas a carga progrediu — o paciente está evoluindo. */
  | "progredindo"
  /** Conduta repetida e sem carga nem dor registradas: não dá para afirmar. */
  | "sem_dados";

export interface PlateauSignal {
  patientId: string;
  patientName: string;
  /** Conduta+região repetida, como lista de códigos. */
  signature: string[];
  consecutiveSessions: number;
  firstDate: string;
  lastDate: string;
  /** Carga em kg estagnada no período, quando houver registro. */
  loadStalled: boolean | null;
  /** Dor sem variação clinicamente relevante, quando houver ≥2 leituras. */
  painStalled: boolean | null;
  /** Quantos eixos independentes confirmam o platô (1 a 3). */
  confirmingAxes: number;
  status: PlateauStatus;
}

export interface PlateauReport {
  signals: PlateauSignal[];
  counts: Record<PlateauStatus, number>;
}

/**
 * Levanta pacientes em platô.
 *
 * Exige que a repetição de conduta seja confirmada por pelo menos mais um eixo
 * (carga ou dor) quando houver dado para isso — um alerta que dispara só por
 * repetição de conduta viraria ruído numa clínica que trata condições crônicas.
 */
export async function detectPlateaus(
  env: Env,
  params: {
    organizationId: string;
    minSessions?: number;
    limit?: number;
    /** Padrão: só confirmados. `sem_dados` e `progredindo` ficam de fora. */
    minAxes?: number;
  },
): Promise<PlateauReport> {
  const minSessions = Math.max(params.minSessions ?? PLATEAU_MIN_SESSIONS, 2);
  const limit = Math.min(params.limit ?? 50, 200);
  const sql = getRawSql(env, "read");

  const result = await sql`
    WITH assinatura AS (
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
      GROUP BY s.id, s.patient_id, s.date
    ),
    -- Ilhas de conduta idêntica: a diferença entre as duas numerações é constante
    -- enquanto a assinatura não muda.
    ilhas AS (
      SELECT patient_id, date, sig, id,
             row_number() OVER (PARTITION BY patient_id ORDER BY date)
           - row_number() OVER (PARTITION BY patient_id, sig ORDER BY date) AS grp
      FROM assinatura
    ),
    sequencias AS (
      SELECT patient_id, sig, grp,
             count(*) AS sessoes,
             min(date) AS de, max(date) AS ate,
             array_agg(id) AS session_ids
      FROM ilhas
      GROUP BY patient_id, sig, grp
      HAVING count(*) >= ${minSessions}
    ),
    metricas AS (
      SELECT q.*,
        (SELECT count(DISTINCT ce.value_numeric)
           FROM clinical_extractions ce
          WHERE ce.source_id = ANY(q.session_ids)
            AND ce.category = 'carga'
            AND ce.source_table = 'sessions'
            AND ce.rejected = false) AS cargas_distintas,
        (SELECT count(*)
           FROM clinical_extractions ce
          WHERE ce.source_id = ANY(q.session_ids)
            AND ce.category = 'carga'
            AND ce.source_table = 'sessions'
            AND ce.rejected = false) AS cargas_total,
        (SELECT max(ce.value_numeric) - min(ce.value_numeric)
           FROM clinical_extractions ce
          WHERE ce.source_id = ANY(q.session_ids)
            AND ce.category = 'eva'
            AND ce.source_table = 'sessions'
            AND ce.rejected = false) AS amplitude_dor,
        (SELECT count(*)
           FROM clinical_extractions ce
          WHERE ce.source_id = ANY(q.session_ids)
            AND ce.category = 'eva'
            AND ce.source_table = 'sessions'
            AND ce.rejected = false) AS leituras_dor
      FROM sequencias q
    )
    SELECT m.patient_id AS "patientId",
           p.full_name  AS "patientName",
           m.sig, m.sessoes, m.de, m.ate,
           CASE WHEN m.cargas_total >= 2 THEN (m.cargas_distintas <= 1) END AS "loadStalled",
           CASE WHEN m.leituras_dor >= 2 THEN (m.amplitude_dor < ${PAIN_MCID_POINTS}) END AS "painStalled"
    FROM metricas m
    JOIN patients p ON p.id = m.patient_id
    ORDER BY m.sessoes DESC, m.ate DESC
    LIMIT ${limit}
  `;

  const minAxes = Math.max(params.minAxes ?? PLATEAU_MIN_AXES, 1);

  const all: PlateauSignal[] = (result.rows ?? []).map((r: any) => {
    const loadStalled = r.loadStalled ?? null;
    const painStalled = r.painStalled ?? null;
    const confirmingAxes = 1 + (loadStalled === true ? 1 : 0) + (painStalled === true ? 1 : 0);

    // "Progredindo" tem precedência sobre "sem dados": se a carga subiu, sabemos
    // que não é platô, mesmo sem medida de dor.
    const status: PlateauStatus =
      confirmingAxes >= 2
        ? "confirmado"
        : loadStalled === false || painStalled === false
          ? "progredindo"
          : "sem_dados";

    return {
      patientId: r.patientId,
      patientName: r.patientName,
      signature: String(r.sig ?? "").split(",").filter(Boolean),
      consecutiveSessions: Number(r.sessoes),
      firstDate: r.de,
      lastDate: r.ate,
      loadStalled,
      painStalled,
      confirmingAxes,
      status,
    };
  });

  const counts = { confirmado: 0, progredindo: 0, sem_dados: 0 } as Record<PlateauStatus, number>;
  for (const s of all) counts[s.status]++;

  return { signals: all.filter((s) => s.confirmingAxes >= minAxes), counts };
}
