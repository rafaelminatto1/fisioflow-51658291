import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// GET /api/exercise-sessions?patientId=&exerciseId=&limit=20
app.get('/', requireAuth, async (c) => {
  const { patientId, exerciseId, limit: lim } = c.req.query();
  const db = await createPool(c.env);

  let sql = 'SELECT * FROM exercise_sessions WHERE 1=1';
  const params: unknown[] = [];
  let idx = 1;

  if (patientId) { sql += ` AND patient_id = $${idx++}`; params.push(patientId); }
  if (exerciseId) { sql += ` AND exercise_id = $${idx++}`; params.push(exerciseId); }
  sql += ` ORDER BY created_at DESC LIMIT $${idx++}`;
  params.push(Math.min(Number(lim) || 20, 100));

  const result = await db.query(sql, params);
  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

// POST /api/exercise-sessions
app.post('/', requireAuth, async (c) => {
  const body = await c.req.json();
  const db = await createPool(c.env);

  const {
    patient_id, exercise_id, exercise_type,
    start_time, end_time, duration, repetitions,
    completed, metrics, posture_issues_summary
  } = body;

  const result = await db.query(
    `INSERT INTO exercise_sessions
      (patient_id, exercise_id, exercise_type, start_time, end_time,
       duration, repetitions, completed, metrics, posture_issues_summary)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      patient_id ?? null,
      exercise_id ?? null,
      exercise_type ?? null,
      start_time ?? new Date().toISOString(),
      end_time ?? null,
      duration ?? null,
      repetitions ?? 0,
      completed ?? false,
      JSON.stringify(metrics ?? {}),
      JSON.stringify(posture_issues_summary ?? {}),
    ]
  );

  return c.json({ data: result.rows[0] }, 201);
});

// GET /api/exercise-sessions/stats/:patientId
app.get('/stats/:patientId', requireAuth, async (c) => {
  const patientId = c.req.param('patientId');
  const db = await createPool(c.env);

  const result = await db.query(
    `SELECT
       COUNT(*) AS total_sessions,
       COALESCE(SUM(repetitions), 0) AS total_reps,
       COALESCE(AVG((metrics->>'formScore')::numeric), 0) AS avg_score,
       MAX(created_at) AS last_session
     FROM exercise_sessions
     WHERE patient_id = $1`,
    [patientId]
  );

  return c.json({ data: result.rows[0] ?? null });
});

export { app as exerciseSessionsRoutes };
