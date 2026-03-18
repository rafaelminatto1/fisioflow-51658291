import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { isUuid } from '../lib/validators';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// GET /api/standardized-tests?patientId=xxx&scale=DASH&limit=50
app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { patientId, scale, limit: lim } = c.req.query();

  const conditions = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (patientId && isUuid(patientId)) {
    params.push(patientId);
    conditions.push(`patient_id = $${params.length}`);
  }
  if (scale) {
    params.push(scale.toUpperCase());
    conditions.push(`scale_name = $${params.length}`);
  }

  params.push(Math.min(Number(lim) || 50, 200));

  const result = await pool.query(
    `SELECT * FROM standardized_test_results
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params,
  );

  return c.json({ data: result.rows || [] });
});

// GET /api/standardized-tests/:id
app.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT * FROM standardized_test_results WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Registro não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
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

  const result = await pool.query(
    `INSERT INTO standardized_test_results
      (organization_id, patient_id, scale_name, score, interpretation, responses,
       applied_at, applied_by, session_id, notes, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      body.patient_id,
      body.scale_name.toUpperCase(),
      body.score,
      body.interpretation ?? null,
      JSON.stringify(body.responses ?? {}),
      body.applied_at ?? new Date().toISOString(),
      body.applied_by ?? user.uid,
      body.session_id && isUuid(body.session_id) ? body.session_id : null,
      body.notes ?? null,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

// DELETE /api/standardized-tests/:id
app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  const pool = createPool(c.env);
  const result = await pool.query(
    `DELETE FROM standardized_test_results WHERE id = $1 AND organization_id = $2 RETURNING id`,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Registro não encontrado' }, 404);
  return c.json({ success: true });
});

export { app as standardizedTestsRoutes };
