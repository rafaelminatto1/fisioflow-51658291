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
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';
import { registerClinicalResourceRoutes } from './clinical/resources';
import { getColumns, hasTable } from './clinical/shared';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/pathologies/options', async (c) => {
  if (c.env.FISIOFLOW_CONFIG) {
    const cached = await c.env.FISIOFLOW_CONFIG.get('CLINICAL_PATHOLOGY_OPTIONS', 'json');
    if (cached) {
      return c.json({ data: cached, fromCache: true });
    }
  }
  
  // Fallback para lista básica caso o KV falhe (vazia ou erro)
  return c.json({ data: [], error: 'Cache not found' });
});

app.get('/insights', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);

  const [hasGoals, hasPathologies, hasMetrics] = await Promise.all([
    hasTable(pool, 'patient_goals'),
    hasTable(pool, 'patient_pathologies'),
    hasTable(pool, 'patient_session_metrics'),
  ]);

  const goals = hasGoals
    ? await pool.query(
        `
          SELECT
            COALESCE(status, 'sem_status') AS status,
            COUNT(*)::text AS count,
            ROUND(
              AVG(
                CASE
                  WHEN achieved_at IS NOT NULL AND created_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (achieved_at - created_at)) / 86400.0
                  ELSE NULL
                END
              )::numeric,
              1
            ) AS avg_days_to_achieve
          FROM patient_goals
          WHERE organization_id = $1
          GROUP BY 1
          ORDER BY COUNT(*) DESC
        `,
        [user.organizationId],
      )
    : { rows: [] };

  const pathologyColumns = hasPathologies ? await getColumns(pool, 'patient_pathologies') : new Set<string>();
  const pathologyNameColumn = pathologyColumns.has('pathology_name')
    ? 'pathology_name'
    : pathologyColumns.has('name')
      ? 'name'
      : null;
  const painColumn = hasMetrics
    ? await getColumns(pool, 'patient_session_metrics').then((columns) =>
        columns.has('pain_level_after')
          ? 'pain_level_after'
          : columns.has('pain_level_before')
            ? 'pain_level_before'
            : null,
      )
    : null;

  const pathologies = pathologyNameColumn
    ? await pool.query(
        `
          SELECT
            ${pathologyNameColumn} AS name,
            COUNT(*)::text AS patient_count
          FROM patient_pathologies
          WHERE organization_id = $1
          GROUP BY 1
          ORDER BY COUNT(*) DESC, ${pathologyNameColumn} ASC
          LIMIT 10
        `,
        [user.organizationId],
      )
    : { rows: [] };

  const painTrend = pathologyNameColumn && painColumn
    ? await pool.query(
        `
          WITH ranked_pathologies AS (
            SELECT
              patient_id,
              ${pathologyNameColumn} AS pathology,
              ROW_NUMBER() OVER (
                PARTITION BY patient_id
                ORDER BY
                  CASE WHEN status = 'ativo' THEN 0 ELSE 1 END,
                  created_at DESC
              ) AS row_rank
            FROM patient_pathologies
            WHERE organization_id = $1
          )
          SELECT
            COALESCE(ranked_pathologies.pathology, 'Sem classificacao') AS pathology,
            ROUND(AVG(psm.${painColumn})::numeric, 1) AS avg_pain_level,
            COUNT(*)::text AS record_count
          FROM patient_session_metrics psm
          LEFT JOIN ranked_pathologies
            ON ranked_pathologies.patient_id = psm.patient_id
           AND ranked_pathologies.row_rank = 1
          WHERE psm.organization_id = $1
            AND psm.${painColumn} IS NOT NULL
          GROUP BY 1
          ORDER BY AVG(psm.${painColumn}) DESC NULLS LAST, COUNT(*) DESC
          LIMIT 8
        `,
        [user.organizationId],
      )
    : { rows: [] };

  return c.json({
    data: {
      goals: goals.rows.map((row) => ({
        status: String(row.status ?? 'sem_status'),
        count: String(row.count ?? '0'),
        avg_days_to_achieve:
          row.avg_days_to_achieve !== null && row.avg_days_to_achieve !== undefined
            ? Number(row.avg_days_to_achieve)
            : null,
      })),
      pathologies: pathologies.rows.map((row) => ({
        name: String(row.name ?? 'Sem classificacao'),
        patient_count: String(row.patient_count ?? '0'),
      })),
      painTrend: painTrend.rows.map((row) => ({
        pathology: String(row.pathology ?? 'Sem classificacao'),
        avg_pain_level: Number(row.avg_pain_level ?? 0),
        record_count: String(row.record_count ?? '0'),
      })),
      timestamp: new Date().toISOString(),
    },
  });
});

registerClinicalResourceRoutes(app);

export { app as clinicalRoutes };
