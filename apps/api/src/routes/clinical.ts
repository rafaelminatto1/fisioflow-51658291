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
import { createDb } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { withTenant } from "../lib/db-utils";
import type { Env } from "../types/env";
import { registerClinicalResourceRoutes } from "./clinical/resources";
import { patientGoals, patientPathologies } from "@fisioflow/db";
import { eq, sql, desc } from "drizzle-orm";

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

registerClinicalResourceRoutes(app);

export { app as clinicalRoutes };
