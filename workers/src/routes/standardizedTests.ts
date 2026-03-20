import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { isUuid } from '../lib/validators';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function hasTable(
  pool: ReturnType<typeof createPool>,
  tableName: string,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT to_regclass($1)::text AS table_name`,
    [`public.${tableName}`],
  );
  return Boolean(result.rows[0]?.table_name);
}

function normalizeStandardizedTestRow(row: Record<string, unknown>) {
  const scaleName = String(
    row.scale_name ?? row.test_type ?? row.test_name ?? 'CUSTOM',
  ).toUpperCase();
  const responsesSource = row.responses ?? row.answers ?? {};
  const responses =
    responsesSource && typeof responsesSource === 'object' && !Array.isArray(responsesSource)
      ? responsesSource
      : {};

  return {
    ...row,
    scale_name: scaleName,
    test_name: String(row.test_name ?? row.scale_name ?? 'Teste padronizado'),
    test_type: String(row.test_type ?? scaleName).toLowerCase(),
    responses,
    answers: responses,
    applied_at: String(row.applied_at ?? row.created_at ?? new Date().toISOString()),
    applied_by: row.applied_by ?? row.created_by ?? null,
    notes: row.notes ?? null,
  };
}

// GET /api/standardized-tests?patientId=xxx&scale=DASH&limit=50
app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { patientId, scale, limit: lim } = c.req.query();

  if (!(await hasTable(pool, 'standardized_test_results'))) {
    return c.json({ data: [] });
  }

  const conditions = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (patientId && isUuid(patientId)) {
    params.push(patientId);
    conditions.push(`patient_id = $${params.length}`);
  }
  if (scale) {
    params.push(scale.toUpperCase());
    conditions.push(`COALESCE(scale_name, UPPER(test_type), UPPER(test_name)) = $${params.length}`);
  }

  params.push(Math.min(Number(lim) || 50, 200));

  const result = await pool.query(
    `SELECT
       id,
       organization_id,
       patient_id,
       test_type,
       test_name,
       scale_name,
       score,
       max_score,
       interpretation,
       COALESCE(responses, answers, '{}'::jsonb) AS responses,
       COALESCE(answers, responses, '{}'::jsonb) AS answers,
       COALESCE(applied_at, created_at) AS applied_at,
       COALESCE(applied_by, created_by) AS applied_by,
       session_id,
       notes,
       created_by,
       created_at,
       updated_at
     FROM standardized_test_results
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params,
  );

  return c.json({ data: (result.rows || []).map((row) => normalizeStandardizedTestRow(row as Record<string, unknown>)) });
});

// GET /api/standardized-tests/:id
app.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  const pool = createPool(c.env);
  if (!(await hasTable(pool, 'standardized_test_results'))) {
    return c.json({ error: 'Registro não encontrado' }, 404);
  }
  const result = await pool.query(
    `SELECT
       id,
       organization_id,
       patient_id,
       test_type,
       test_name,
       scale_name,
       score,
       max_score,
       interpretation,
       COALESCE(responses, answers, '{}'::jsonb) AS responses,
       COALESCE(answers, responses, '{}'::jsonb) AS answers,
       COALESCE(applied_at, created_at) AS applied_at,
       COALESCE(applied_by, created_by) AS applied_by,
       session_id,
       notes,
       created_by,
       created_at,
       updated_at
     FROM standardized_test_results
     WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Registro não encontrado' }, 404);
  return c.json({ data: normalizeStandardizedTestRow(result.rows[0] as Record<string, unknown>) });
});

// POST /api/standardized-tests
app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = (await c.req.json()) as {
    patient_id: string;
    scale_name: string;
    score: number;
    interpretation?: string;
    responses?: Record<string, unknown>;
    applied_at?: string;
    applied_by?: string;
    session_id?: string;
    notes?: string;
  };

  if (!body.patient_id || !isUuid(body.patient_id)) return c.json({ error: 'patient_id inválido' }, 400);
  if (!body.scale_name) return c.json({ error: 'scale_name é obrigatório' }, 400);
  if (body.score == null) return c.json({ error: 'score é obrigatório' }, 400);

  const pool = createPool(c.env);
  if (!(await hasTable(pool, 'standardized_test_results'))) {
    return c.json({ error: 'Schema de avaliações padronizadas indisponível' }, 501);
  }

  const result = await pool.query(
    `INSERT INTO standardized_test_results
      (organization_id, patient_id, test_type, test_name, scale_name, score, max_score,
       interpretation, answers, responses, applied_at, applied_by, session_id, notes,
       created_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      body.patient_id,
      body.scale_name.toLowerCase(),
      body.scale_name.toUpperCase(),
      body.scale_name.toUpperCase(),
      body.score,
      body.score,
      body.interpretation ?? null,
      JSON.stringify(body.responses ?? {}),
      JSON.stringify(body.responses ?? {}),
      body.applied_at ?? new Date().toISOString(),
      body.applied_by ?? user.uid,
      body.session_id && isUuid(body.session_id) ? body.session_id : null,
      body.notes ?? null,
      user.uid,
    ],
  );

  return c.json({ data: normalizeStandardizedTestRow(result.rows[0] as Record<string, unknown>) }, 201);
});

// DELETE /api/standardized-tests/:id
app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  const pool = createPool(c.env);
  if (!(await hasTable(pool, 'standardized_test_results'))) {
    return c.json({ error: 'Registro não encontrado' }, 404);
  }
  const result = await pool.query(
    `DELETE FROM standardized_test_results WHERE id = $1 AND organization_id = $2 RETURNING id`,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Registro não encontrado' }, 404);
  return c.json({ success: true });
});

export { app as standardizedTestsRoutes };
