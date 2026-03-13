import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// List plans for a patient
app.get('/', requireAuth, async (c) => {
  const { patientId } = c.req.query();
  const db = await createPool(c.env);

  let sql = `SELECT p.*, json_agg(i.* ORDER BY i.order_index) FILTER (WHERE i.id IS NOT NULL) AS items
             FROM exercise_plans p
             LEFT JOIN exercise_plan_items i ON i.plan_id = p.id`;
  const params: unknown[] = [];
  if (patientId) { sql += ` WHERE p.patient_id = $1`; params.push(patientId); }
  sql += ` GROUP BY p.id ORDER BY p.created_at DESC`;

  const result = await db.query(sql, params);
  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

// Create plan
app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const db = await createPool(c.env);

  const planResult = await db.query(
    `INSERT INTO exercise_plans (patient_id, created_by, name, description, status, start_date, end_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      body.patient_id, body.created_by ?? user.uid, body.name,
      body.description ?? null, body.status ?? 'ativo',
      body.start_date ?? null, body.end_date ?? null,
    ]
  );
  const plan = planResult.rows[0];

  // Insert items if provided
  const items: Array<{ exercise_id?: string; order_index?: number; sets?: number; repetitions?: number; duration?: number; notes?: string }> = body.items ?? [];
  let insertedItems: unknown[] = [];
  if (items.length > 0) {
    const itemResults = await Promise.all(items.map((item, idx) =>
      db.query(
        `INSERT INTO exercise_plan_items (plan_id, exercise_id, order_index, sets, repetitions, duration, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [plan.id, item.exercise_id ?? null, item.order_index ?? idx, item.sets ?? null, item.repetitions ?? null, item.duration ?? null, item.notes ?? null]
      )
    ));
    insertedItems = itemResults.map(r => r.rows[0]);
  }

  return c.json({ data: { ...plan, items: insertedItems } }, 201);
});

// Update plan
app.patch('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = await createPool(c.env);

  const allowed = ['name', 'description', 'status', 'start_date', 'end_date'];
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  for (const key of allowed) {
    if (key in body) { sets.push(`${key} = $${idx++}`); params.push(body[key]); }
  }
  if (!sets.length) return c.json({ error: 'No fields to update' }, 400);
  sets.push(`updated_at = NOW()`);
  params.push(id);

  const result = await db.query(
    `UPDATE exercise_plans SET ${sets.join(', ')} WHERE id = $${idx++} RETURNING *`,
    params
  );
  if (!result.rowCount) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: result.rows[0] });
});

// Delete plan (cascades to items)
app.delete('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  const db = await createPool(c.env);
  await db.query(`DELETE FROM exercise_plans WHERE id = $1`, [id]);
  return c.json({ ok: true });
});

// Add item to plan
app.post('/:id/items', requireAuth, async (c) => {
  const planId = c.req.param('id');
  const body = await c.req.json();
  const db = await createPool(c.env);

  const result = await db.query(
    `INSERT INTO exercise_plan_items (plan_id, exercise_id, order_index, sets, repetitions, duration, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [planId, body.exercise_id ?? null, body.order_index ?? 0, body.sets ?? null, body.repetitions ?? null, body.duration ?? null, body.notes ?? null]
  );
  return c.json({ data: result.rows[0] }, 201);
});

export { app as exercisePlansRoutes };
