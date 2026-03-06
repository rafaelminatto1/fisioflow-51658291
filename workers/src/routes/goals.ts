/**
 * Rotas: Metas do Paciente (patient_goals)
 *
 * GET    /api/goals?patientId=
 * POST   /api/goals
 * PUT    /api/goals/:id
 * DELETE /api/goals/:id
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { patientId } = c.req.query();
  if (!patientId) return c.json({ error: 'patientId é obrigatório' }, 400);

  const result = await pool.query(
    `SELECT * FROM patient_goals
     WHERE patient_id = $1 AND organization_id = $2
     ORDER BY created_at DESC`,
    [patientId, user.organizationId],
  );
  return c.json({ data: result.rows });
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const patientId = String(body.patient_id ?? '').trim();
  if (!patientId) return c.json({ error: 'patient_id é obrigatório' }, 400);

  const description = String(body.goal_title ?? body.description ?? '').trim();
  if (!description) return c.json({ error: 'description é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO patient_goals
       (patient_id, organization_id, description, target_date, status, priority, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [
      patientId,
      user.organizationId,
      description,
      body.target_date ?? null,
      body.status ?? 'active',
      body.priority ?? 'medium',
      body.metadata ? JSON.stringify(body.metadata) : null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.status !== undefined) { params.push(body.status); sets.push(`status = $${params.length}`); }
  if (body.description !== undefined) { params.push(body.description); sets.push(`description = $${params.length}`); }
  if (body.priority !== undefined) { params.push(body.priority); sets.push(`priority = $${params.length}`); }
  if (body.target_date !== undefined) { params.push(body.target_date); sets.push(`target_date = $${params.length}`); }
  if (body.achieved_at !== undefined) { params.push(body.achieved_at); sets.push(`achieved_at = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE patient_goals SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Meta não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM patient_goals WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Meta não encontrada' }, 404);

  await pool.query('DELETE FROM patient_goals WHERE id = $1', [id]);
  return c.json({ ok: true });
});

export { app as goalsRoutes };
