/**
 * Lead Scoring — calcula score 0-100 e temperatura (cold/warm/hot) para
 * contatos em estágio lead/mql/sql/opportunity.
 *
 * Modelo híbrido:
 *   - Heurística determinística (rules-v1) gera baseline.
 *   - Se `env.LEAD_SCORING_AI=true`, refina via callAIStructured com Haiku,
 *     usando o AI Gateway. Cache D1 24h por features hash.
 *
 * Persiste:
 *   - contact_scores: histórico (1 row por execução por contato)
 *   - contacts.score, score_temperature, scored_at: estado corrente
 *
 * Idempotência: não re-scoreia contatos já scoreados nas últimas 12h
 * (configurável via `minHoursBetweenScores`).
 */
import { z } from "zod";
import { callAIStructured } from "../lib/ai/callAI";
import type { Env } from "../types/env";
import type { DbPool } from "../lib/db";

const SCORE_SCHEMA = z.object({
  score: z.number().min(0).max(100),
  rationale: z.string().max(280).optional(),
});

interface ContactFeatures {
  contactId: string;
  organizationId: string;
  nome: string;
  origem: string | null;
  estagio: string | null;
  daysSinceCreated: number;
  daysSinceLastContact: number | null;
  daysSinceLastActivity: number | null;
  activitiesCount: number;
  whatsappActivities: number;
  campaignActivities: number;
  hasAvaliacaoAgendada: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
}

function temperatureFromScore(score: number): "cold" | "warm" | "hot" {
  if (score >= 71) return "hot";
  if (score >= 31) return "warm";
  return "cold";
}

/**
 * Heurística baseline — funciona sem IA. Origens "quentes" + recência + nº
 * de interações pesam mais.
 */
function ruleBasedScore(f: ContactFeatures): number {
  let s = 30; // baseline

  // Origem
  const hotOrigins = ["indicacao", "indicação", "referral", "convenio", "convênio"];
  const warmOrigins = ["instagram", "google", "site", "whatsapp"];
  if (f.origem && hotOrigins.some((o) => f.origem!.toLowerCase().includes(o))) s += 25;
  else if (f.origem && warmOrigins.some((o) => f.origem!.toLowerCase().includes(o))) s += 12;

  // Estágio
  if (f.estagio === "avaliacao_realizada") s += 25;
  else if (f.estagio === "avaliacao_agendada") s += 18;
  else if (f.estagio === "em_contato") s += 8;

  // Engajamento
  if (f.activitiesCount >= 5) s += 10;
  else if (f.activitiesCount >= 2) s += 5;
  if (f.whatsappActivities >= 2) s += 5;
  if (f.campaignActivities >= 1) s += 3;

  // Recência
  if (f.daysSinceLastActivity != null) {
    if (f.daysSinceLastActivity <= 1) s += 10;
    else if (f.daysSinceLastActivity <= 7) s += 5;
    else if (f.daysSinceLastActivity > 30) s -= 15;
  }
  if (f.daysSinceCreated > 60 && f.activitiesCount === 0) s -= 20;

  // Completude
  if (!f.hasPhone) s -= 8;
  if (!f.hasEmail) s -= 3;

  return Math.max(0, Math.min(100, Math.round(s)));
}

async function loadFeaturesBatch(
  pool: DbPool,
  limit: number,
  minHoursBetweenScores: number,
): Promise<ContactFeatures[]> {
  const res = await pool.query(
    `WITH agg AS (
       SELECT contact_id,
              COUNT(*)::int                                                       AS activities_count,
              SUM(CASE WHEN tipo = 'whatsapp' THEN 1 ELSE 0 END)::int             AS whatsapp_count,
              SUM(CASE WHEN tipo = 'campaign' THEN 1 ELSE 0 END)::int             AS campaign_count,
              MAX(created_at)                                                     AS last_activity_at
         FROM contact_activities
        GROUP BY contact_id
     ),
     latest_lead AS (
       -- Quando um contato tem múltiplos leads, pega o mais recente
       SELECT DISTINCT ON (contact_id)
              contact_id, estagio, data_ultimo_contato
         FROM leads
        WHERE contact_id IS NOT NULL
        ORDER BY contact_id, updated_at DESC
     )
     SELECT c.id, c.organization_id, c.nome, c.telefone, c.email,
            c.origem_first_touch       AS origem,
            ll.estagio,
            EXTRACT(EPOCH FROM (NOW() - c.created_at))/86400         AS days_since_created,
            EXTRACT(EPOCH FROM (NOW() - ll.data_ultimo_contato))/86400 AS days_since_last_contact,
            EXTRACT(EPOCH FROM (NOW() - agg.last_activity_at))/86400  AS days_since_last_activity,
            COALESCE(agg.activities_count, 0) AS activities_count,
            COALESCE(agg.whatsapp_count, 0)   AS whatsapp_count,
            COALESCE(agg.campaign_count, 0)   AS campaign_count,
            (ll.estagio = 'avaliacao_agendada') AS has_avaliacao_agendada
       FROM contacts c
       LEFT JOIN latest_lead ll ON ll.contact_id = c.id
       LEFT JOIN agg          ON agg.contact_id = c.id
      WHERE c.deleted_at IS NULL
        AND c.lifecycle_stage IN ('lead','mql','sql','opportunity')
        AND (c.scored_at IS NULL OR c.scored_at < NOW() - ($1 || ' hours')::interval)
      ORDER BY c.updated_at DESC
      LIMIT $2`,
    [String(minHoursBetweenScores), limit],
  );

  return res.rows.map((r: any) => ({
    contactId: r.id,
    organizationId: r.organization_id,
    nome: r.nome,
    origem: r.origem ?? null,
    estagio: r.estagio ?? null,
    daysSinceCreated: Number(r.days_since_created ?? 0),
    daysSinceLastContact: r.days_since_last_contact == null ? null : Number(r.days_since_last_contact),
    daysSinceLastActivity:
      r.days_since_last_activity == null ? null : Number(r.days_since_last_activity),
    activitiesCount: Number(r.activities_count ?? 0),
    whatsappActivities: Number(r.whatsapp_count ?? 0),
    campaignActivities: Number(r.campaign_count ?? 0),
    hasAvaliacaoAgendada: !!r.has_avaliacao_agendada,
    hasPhone: !!r.telefone,
    hasEmail: !!r.email,
  }));
}

async function aiRefine(
  env: Env,
  features: ContactFeatures,
  baseline: number,
): Promise<{ score: number; rationale?: string } | null> {
  try {
    const result = await callAIStructured(env, {
      task: "fast-processing",
      schema: SCORE_SCHEMA,
      systemInstruction:
        "Você é um analista de CRM de clínica de fisioterapia. " +
        "Atribua um score 0-100 representando a probabilidade do lead se tornar paciente. " +
        "100 = altíssima conversão; 0 = lead frio/perdido. Justifique em 1 frase.",
      prompt: JSON.stringify({ baseline, features }),
      temperature: 0.2,
      maxTokens: 200,
      cacheKey: `lead-score:${features.contactId}:${features.estagio}:${features.activitiesCount}`,
      cacheTtl: 86400,
    });
    return { score: Math.round(result.data.score), rationale: result.data.rationale };
  } catch (err) {
    console.warn("[leadScoring] aiRefine failed:", err);
    return null;
  }
}

export async function scoreContacts(
  env: Env,
  pool: DbPool,
  opts: { batchSize?: number; useAI?: boolean; minHoursBetweenScores?: number } = {},
): Promise<{ scored: number; failed: number }> {
  const batchSize = opts.batchSize ?? 50;
  const useAI = opts.useAI ?? env.LEAD_SCORING_AI === "true";
  const minHours = opts.minHoursBetweenScores ?? 12;

  const features = await loadFeaturesBatch(pool, batchSize, minHours);
  let scored = 0;
  let failed = 0;

  for (const f of features) {
    try {
      const baseline = ruleBasedScore(f);
      const ai = useAI ? await aiRefine(env, f, baseline) : null;
      const finalScore = ai?.score ?? baseline;
      const temperature = temperatureFromScore(finalScore);
      const model = ai ? "ai-hybrid-v1" : "rules-v1";

      await pool.query(
        `INSERT INTO contact_scores
           (organization_id, contact_id, score, temperature, features, model)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
        [
          f.organizationId,
          f.contactId,
          finalScore,
          temperature,
          JSON.stringify({ ...f, baseline, ai_rationale: ai?.rationale ?? null }),
          model,
        ],
      );

      await pool.query(
        `UPDATE contacts
            SET score = $1, score_temperature = $2, scored_at = NOW(), updated_at = NOW()
          WHERE id = $3`,
        [finalScore, temperature, f.contactId],
      );

      scored++;
    } catch (err) {
      failed++;
      console.warn(`[leadScoring] failed for ${f.contactId}:`, err);
    }
  }

  return { scored, failed };
}

/**
 * Re-scoreia um único contato (manual override do `minHoursBetweenScores`).
 */
export async function rescoreContact(
  env: Env,
  pool: DbPool,
  organizationId: string,
  contactId: string,
): Promise<{ score: number; temperature: "cold" | "warm" | "hot" } | null> {
  const [feature] = await loadFeaturesBatch(pool, 1, 0).then((rows) =>
    rows.filter((r) => r.contactId === contactId && r.organizationId === organizationId),
  );
  // Fallback: força carregar mesmo se já scoreado recentemente
  if (!feature) {
    const direct = await pool.query(
      `SELECT id, organization_id, nome, telefone, email,
              origem_first_touch AS origem
         FROM contacts WHERE id = $1 AND organization_id = $2`,
      [contactId, organizationId],
    );
    if (!direct.rows[0]) return null;
    const r = direct.rows[0];
    const f: ContactFeatures = {
      contactId: r.id,
      organizationId: r.organization_id,
      nome: r.nome,
      origem: r.origem,
      estagio: null,
      daysSinceCreated: 0,
      daysSinceLastContact: null,
      daysSinceLastActivity: null,
      activitiesCount: 0,
      whatsappActivities: 0,
      campaignActivities: 0,
      hasAvaliacaoAgendada: false,
      hasPhone: !!r.telefone,
      hasEmail: !!r.email,
    };
    const baseline = ruleBasedScore(f);
    const temperature = temperatureFromScore(baseline);
    await pool.query(
      `UPDATE contacts SET score = $1, score_temperature = $2, scored_at = NOW(), updated_at = NOW() WHERE id = $3`,
      [baseline, temperature, contactId],
    );
    return { score: baseline, temperature };
  }

  const baseline = ruleBasedScore(feature);
  const useAI = env.LEAD_SCORING_AI === "true";
  const ai = useAI ? await aiRefine(env, feature, baseline) : null;
  const finalScore = ai?.score ?? baseline;
  const temperature = temperatureFromScore(finalScore);

  await pool.query(
    `INSERT INTO contact_scores (organization_id, contact_id, score, temperature, features, model)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
    [
      organizationId,
      contactId,
      finalScore,
      temperature,
      JSON.stringify({ ...feature, baseline, ai_rationale: ai?.rationale ?? null, manual: true }),
      ai ? "ai-hybrid-v1" : "rules-v1",
    ],
  );
  await pool.query(
    `UPDATE contacts SET score = $1, score_temperature = $2, scored_at = NOW(), updated_at = NOW() WHERE id = $3`,
    [finalScore, temperature, contactId],
  );

  return { score: finalScore, temperature };
}
