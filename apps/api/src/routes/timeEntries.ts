import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';
import { isUuid } from '../lib/validators';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// GET /api/time-entries?userId=&startDate=&endDate=&patientId=&limit=100
app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const { userId, startDate, endDate, patientId, limit: lim } = c.req.query();
  const db = await createPool(c.env);

  let sql = `SELECT * FROM time_entries WHERE organization_id = $1 AND deleted_at IS NULL`;
  const params: unknown[] = [user.organizationId];
  let idx = 2;

  if (userId) { sql += ` AND user_id = $${idx++}`; params.push(userId); }
  if (startDate) { sql += ` AND start_time >= $${idx++}`; params.push(startDate); }
  if (endDate) { sql += ` AND start_time <= $${idx++}`; params.push(endDate); }
  if (patientId) { sql += ` AND patient_id = $${idx++}`; params.push(patientId); }
  sql += ` ORDER BY start_time DESC LIMIT $${idx++}`;
  params.push(Math.min(Number(lim) || 100, 500));

  const result = await db.query(sql, params);
  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

// POST /api/time-entries
app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const db = await createPool(c.env);

  const {
    description, start_time, end_time, duration_seconds,
    is_billable, hourly_rate, total_value, tags,
    task_id, patient_id, project_id, appointment_id,
  } = body;

  const result = await db.query(
    `INSERT INTO time_entries
      (user_id, organization_id, description, start_time, end_time,
       duration_seconds, is_billable, hourly_rate, total_value, tags,
       task_id, patient_id, project_id, appointment_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      user.uid,
      user.organizationId,
      description ?? '',
      start_time,
      end_time ?? null,
      duration_seconds ?? 0,
      is_billable ?? true,
      hourly_rate ?? null,
      total_value ?? null,
      tags ?? [],
      task_id ?? null,
      patient_id ?? null,
      project_id ?? null,
      appointment_id ?? null,
    ]
  );
  return c.json({ data: result.rows[0] }, 201);
});

// PATCH /api/time-entries/:id
app.patch('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
  const body = await c.req.json();
  const db = await createPool(c.env);

  const allowed = ['description', 'start_time', 'end_time', 'duration_seconds',
    'is_billable', 'hourly_rate', 'total_value', 'tags',
    'task_id', 'patient_id', 'project_id', 'appointment_id'];
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const key of allowed) {
    if (key in body) {
      sets.push(`${key} = $${idx++}`);
      params.push(body[key]);
    }
  }
  if (sets.length === 0) return c.json({ error: 'No fields to update' }, 400);

  sets.push(`updated_at = NOW()`);
  params.push(id, user.organizationId);

  const result = await db.query(
    `UPDATE time_entries SET ${sets.join(', ')} WHERE id = $${idx++} AND organization_id = $${idx++} RETURNING *`,
    params
  );
  if (result.rowCount === 0) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: result.rows[0] });
});

// DELETE /api/time-entries/:id (soft delete)
app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
  const db = await createPool(c.env);

  await db.query(
    `UPDATE time_entries SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2`,
    [id, user.organizationId]
  );
  return c.json({ ok: true });
});

// GET /api/time-entries/stats?userId=&startDate=&endDate=
app.get('/stats', requireAuth, async (c) => {
  const user = c.get('user');
  const { userId, startDate, endDate } = c.req.query();
  const db = await createPool(c.env);

  let sql = `SELECT
    COALESCE(SUM(duration_seconds), 0) AS total_seconds,
    COALESCE(SUM(CASE WHEN is_billable THEN duration_seconds ELSE 0 END), 0) AS billable_seconds,
    COALESCE(SUM(CASE WHEN NOT is_billable THEN duration_seconds ELSE 0 END), 0) AS non_billable_seconds,
    COUNT(*) AS entries_count,
    COALESCE(SUM(total_value), 0) AS total_value
  FROM time_entries
  WHERE organization_id = $1 AND deleted_at IS NULL`;
  const params: unknown[] = [user.organizationId];
  let idx = 2;

  if (userId) { sql += ` AND user_id = $${idx++}`; params.push(userId); }
  if (startDate) { sql += ` AND start_time >= $${idx++}`; params.push(startDate); }
  if (endDate) { sql += ` AND start_time <= $${idx++}`; params.push(endDate); }

  const result = await db.query(sql, params);
  return c.json({ data: result.rows[0] });
});

// GET /api/time-entries/timer-draft/:userId
app.get('/timer-draft/:userId', requireAuth, async (c) => {
  const userId = c.req.param('userId');
  const db = await createPool(c.env);

  const result = await db.query(
    `SELECT timer, updated_at FROM timer_drafts WHERE user_id = $1`,
    [userId]
  );
  if (result.rowCount === 0) return c.json({ data: null });

  const row = result.rows[0];
  // Discard drafts older than 24h
  const ageHours = (Date.now() - new Date(row.updated_at).getTime()) / 3_600_000;
  if (ageHours > 24) {
    await db.query(`DELETE FROM timer_drafts WHERE user_id = $1`, [userId]);
    return c.json({ data: null });
  }
  return c.json({ data: row.timer });
});

// PUT /api/time-entries/timer-draft/:userId
app.put('/timer-draft/:userId', requireAuth, async (c) => {
  const userId = c.req.param('userId');
  const body = await c.req.json();
  const db = await createPool(c.env);

  await db.query(
    `INSERT INTO timer_drafts (user_id, timer, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET timer = EXCLUDED.timer, updated_at = NOW()`,
    [userId, JSON.stringify(body.timer)]
  );
  return c.json({ ok: true });
});

// DELETE /api/time-entries/timer-draft/:userId
app.delete('/timer-draft/:userId', requireAuth, async (c) => {
  const userId = c.req.param('userId');
  const db = await createPool(c.env);
  await db.query(`DELETE FROM timer_drafts WHERE user_id = $1`, [userId]);
  return c.json({ ok: true });
});

export { app as timeEntriesRoutes };
