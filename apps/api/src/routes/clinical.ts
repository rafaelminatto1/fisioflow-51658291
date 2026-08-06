/**
 * Rotas: Domínio Clínico (Mapas de Dor, Templates de Evolução, Prescrições)
 *
 * GET/POST/PUT/DELETE /api/clinical/pain-maps
 * GET/POST/PUT/DELETE /api/clinical/evolution-templates
 * GET/POST/PUT/DELETE /api/clinical/prescriptions
 * GET/POST/PUT/DELETE /api/clinical/test-templates
 * GET/POST/PUT/DELETE /api/clinical/conduct-library
 * GET/POST /api/clinical/standardized-tests
 */
import { Hono } from "hono";
import { createDb, createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { withTenant } from "../lib/db-utils";
import type { Env } from "../types/env";
import { registerClinicalResourceRoutes } from "./clinical/resources";
import { homeExerciseRoutes } from "./clinical/home-exercises";
import { autoPrescribeRoutes } from "./clinical/auto-prescribe";
import { patientGoals, patientPathologies } from "@fisioflow/db";
import { sql, desc } from "drizzle-orm";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/pathologies/options", async (c) => {
  if (c.env.FISIOFLOW_CONFIG) {
    const cached = await c.env.FISIOFLOW_CONFIG.get("CLINICAL_PATHOLOGY_OPTIONS", "json");
    if (cached) {
      return c.json({ data: cached, fromCache: true });
    }
  }

  return c.json({ data: [], error: "Cache not found" });
});

app.get("/insights", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env);

  // 1. Goals Insights
  const goalsData = await db
    .select({
      status: sql<string>`COALESCE(${patientGoals.status}, 'sem_status')`,
      count: sql<string>`COUNT(*)::text`,
      avg_days_to_achieve: sql<number | null>`ROUND(
        AVG(
          CASE
            WHEN ${patientGoals.achievedAt} IS NOT NULL AND ${patientGoals.createdAt} IS NOT NULL
              THEN EXTRACT(EPOCH FROM (${patientGoals.achievedAt} - ${patientGoals.createdAt})) / 86400.0
            ELSE NULL
          END
        )::numeric,
        1
      )`,
    })
    .from(patientGoals)
    .where(withTenant(patientGoals, user.organizationId))
    .groupBy(sql`1`)
    .orderBy(desc(sql`COUNT(*)`));

  // 2. Pathologies Insights
  const pathologiesData = await db
    .select({
      name: patientPathologies.name,
      patient_count: sql<string>`COUNT(*)::text`,
    })
    .from(patientPathologies)
    .where(withTenant(patientPathologies, user.organizationId))
    .groupBy(patientPathologies.name)
    .orderBy(desc(sql`COUNT(*)`), patientPathologies.name)
    .limit(10);

  // 3. Pain Trend Insights
  const painTrendData = await db.execute(sql`
    WITH ranked_pathologies AS (
      SELECT
        patient_id,
        name AS pathology,
        ROW_NUMBER() OVER (
          PARTITION BY patient_id
          ORDER BY
            CASE WHEN status = 'ativo' THEN 0 ELSE 1 END,
            created_at DESC
        ) AS row_rank
      FROM patient_pathologies
      WHERE organization_id = ${user.organizationId}
    )
    SELECT
      COALESCE(ranked_pathologies.pathology, 'Sem classificacao') AS pathology,
      ROUND(AVG(psm.pain_level_after)::numeric, 1) AS avg_pain_level,
      COUNT(*)::text AS record_count
    FROM patient_session_metrics psm
    LEFT JOIN ranked_pathologies
      ON ranked_pathologies.patient_id = psm.patient_id
     AND ranked_pathologies.row_rank = 1
    WHERE psm.organization_id = ${user.organizationId}
      AND psm.pain_level_after IS NOT NULL
    GROUP BY 1
    ORDER BY AVG(psm.pain_level_after) DESC NULLS LAST, COUNT(*) DESC
    LIMIT 8
  `);

  return c.json({
    data: {
      goals: goalsData.map((row) => ({
        status: String(row.status),
        count: String(row.count),
        avg_days_to_achieve: row.avg_days_to_achieve ? Number(row.avg_days_to_achieve) : null,
      })),
      pathologies: pathologiesData.map((row) => ({
        name: String(row.name ?? "Sem classificacao"),
        patient_count: String(row.patient_count),
      })),
      painTrend: (painTrendData.rows as Record<string, unknown>[]).map((row) => ({
        pathology: String(row.pathology ?? "Sem classificacao"),
        avg_pain_level: Number(row.avg_pain_level ?? 0),
        record_count: String(row.record_count ?? "0"),
      })),
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET/POST /api/clinical/generated-reports
 *
 * Registro de laudo/relatório emitido para o paciente. A tabela
 * `generated_reports` já existia e era escrita só pelo gerador em
 * `analytics/patient.ts`; o app profissional tentava registrar o compartilhamento
 * por WhatsApp aqui e recebia 404, então essa emissão não ficava em lugar nenhum.
 */
app.post("/generated-reports", requireAuth, async (c) => {
  const user = c.get("user");
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const patientId = (body.patient_id ?? body.patientId) as string | undefined;
  const reportType = (body.report_type ?? body.reportType ?? "evolution") as string;
  const content = (body.content ?? body.report_content) as string | undefined;

  if (!patientId) return c.json({ error: "patient_id é obrigatório" }, 400);
  if (!content) return c.json({ error: "content é obrigatório" }, 400);

  const pool = createPool(c.env);

  try {
    // O filtro por organização vai no SELECT do paciente, não no INSERT: assim um
    // patient_id de outra org não cria linha órfã.
    const result = await pool.query(
      `INSERT INTO generated_reports
         (organization_id, patient_id, report_type, report_content, created_by, created_at)
       SELECT $1, p.id, $3, $4, $5, NOW()
         FROM patients p
        WHERE p.id = $2 AND p.organization_id = $1
       RETURNING id, patient_id, report_type, created_at`,
      [user.organizationId, patientId, reportType, content, user.uid],
    );

    if (result.rows.length === 0) {
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    return c.json({ data: result.rows[0] }, 201);
  } catch (error) {
    console.error("[Clinical/GeneratedReports] Insert error:", error);
    return c.json({ error: "Erro ao registrar relatório" }, 500);
  }
});

app.get("/generated-reports", requireAuth, async (c) => {
  const user = c.get("user");
  const patientId = c.req.query("patient_id");
  const pool = createPool(c.env);

  try {
    const result = await pool.query(
      `SELECT id, patient_id, report_type, report_content, created_by, created_at
         FROM generated_reports
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND ($2::uuid IS NULL OR patient_id = $2::uuid)
        ORDER BY created_at DESC
        LIMIT 100`,
      [user.organizationId, patientId ?? null],
    );

    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Clinical/GeneratedReports] List error:", error);
    return c.json({ error: "Erro ao listar relatórios" }, 500);
  }
});

app.route("/home-exercises", homeExerciseRoutes);
app.route("/prescriptions", autoPrescribeRoutes);
registerClinicalResourceRoutes(app);

export { app as clinicalRoutes };
