import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const { patientId } = c.req.query();
  const db = createPool(c.env);

  let sql = `SELECT * FROM treatment_cycles WHERE therapist_id = $1`;
  const params: unknown[] = [user.uid];
  let idx = 2;

  if (patientId) { sql += ` AND patient_id = $${idx++}`; params.push(patientId); }
  sql += ' ORDER BY created_at DESC';

  const result = await db.query(sql, params);
  return c.json({ data: result.rows });
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const db = createPool(c.env);

  const result = await db.query(
    `INSERT INTO treatment_cycles
       (patient_id, therapist_id, title, description, status, start_date, end_date, goals, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      body.patient_id ?? body.patientId, body.therapistId ?? user.uid,
      body.title, body.description ?? null,
      body.status ?? 'active',
      body.start_date ?? body.startDate ?? null, body.end_date ?? body.endDate ?? null,
      JSON.stringify(body.goals ?? []), JSON.stringify(body.metadata ?? {}),
    ]
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.patch('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = createPool(c.env);

  const allowed = ['title', 'description', 'status', 'start_date', 'end_date', 'goals', 'metadata'];
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const key of allowed) {
    const bodyKey = key === 'start_date' ? (key in body ? key : 'startDate') : key === 'end_date' ? (key in body ? key : 'endDate') : key;
    const val = body[key] ?? body[bodyKey];
    if (val !== undefined) {
      const dbVal = ['goals', 'metadata'].includes(key) ? JSON.stringify(val) : val;
      sets.push(`${key} = $${idx++}`);
      params.push(dbVal);
    }
  }
  if (!sets.length) return c.json({ error: 'No fields to update' }, 400);
  sets.push(`updated_at = NOW()`);
  params.push(id);

  const result = await db.query(
    `UPDATE treatment_cycles SET ${sets.join(', ')} WHERE id = $${idx++} RETURNING *`,
    params
  );
  if (!result.rowCount) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  const db = createPool(c.env);
  await db.query(`DELETE FROM treatment_cycles WHERE id = $1`, [id]);
  return c.json({ ok: true });
});

export { app as treatmentCyclesRoutes };
