import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";
import { notifyHEPMilestone } from "../lib/push";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// GET /api/exercise-sessions?patientId=&exerciseId=&limit=20
app.get("/", requireAuth, async (c) => {
  const { patientId, exerciseId, limit: lim } = c.req.query();
  const db = await createPool(c.env);

  let sql = "SELECT * FROM exercise_sessions WHERE 1=1";
  const params: unknown[] = [];
  let idx = 1;

  if (patientId) {
    sql += ` AND patient_id = $${idx++}`;
    params.push(patientId);
  }
  if (exerciseId) {
    sql += ` AND exercise_id = $${idx++}`;
    params.push(exerciseId);
  }
  sql += ` ORDER BY created_at DESC LIMIT $${idx++}`;
  params.push(Math.min(Number(lim) || 20, 100));

  const result = await db.query(sql, params);
  try {
    return c.json({ data: result.rows || result });
  } catch {
    return c.json({ data: [] });
  }
});

// POST /api/exercise-sessions
app.post("/", requireAuth, async (c) => {
  const body = await c.req.json();
  const db = await createPool(c.env);

  const {
    patient_id,
    exercise_id,
    exercise_type,
    start_time,
    end_time,
    duration,
    repetitions,
    completed,
    metrics,
    posture_issues_summary,
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
    ],
  );

  const session = result.rows[0];

  // Fire push milestone when patient completes an exercise (non-fatal)
  if (completed && patient_id) {
    const db2 = db; // reuse pool
    Promise.resolve().then(async () => {
      try {
        // Count consecutive days with at least one completed session
        const streakResult = await db2.query(
          `WITH daily AS (
             SELECT DATE(created_at) AS d
             FROM exercise_sessions
             WHERE patient_id = $1 AND completed = true
             GROUP BY DATE(created_at)
             ORDER BY d DESC
           ),
           numbered AS (
             SELECT d, ROW_NUMBER() OVER (ORDER BY d DESC) AS rn
             FROM daily
           )
           SELECT COUNT(*) AS streak_days
           FROM numbered
           WHERE d = CURRENT_DATE - CAST((rn - 1) AS integer)`,
          [patient_id],
        );
        const streakDays = parseInt(streakResult.rows[0]?.streak_days ?? "0");
        // Notify on milestones: 1st, 3rd, 7th, 14th, 30th day streak
        const milestones = [1, 3, 7, 14, 30];
        if (milestones.includes(streakDays)) {
          const exerciseName = session.exercise_type ?? "exercício";
          await notifyHEPMilestone(c.env, db2, patient_id, { exerciseName, streakDays });
        }
      } catch (_err) {
        // non-critical
      }
    });
  }

  return c.json({ data: session }, 201);
});

// GET /api/exercise-sessions/stats/:patientId
app.get("/stats/:patientId", requireAuth, async (c) => {
  const patientId = c.req.param("patientId");
  const db = await createPool(c.env);

  const result = await db.query(
    `SELECT
       COUNT(*) AS total_sessions,
       COALESCE(SUM(repetitions), 0) AS total_reps,
       COALESCE(AVG((metrics->>'formScore')::numeric), 0) AS avg_score,
       MAX(created_at) AS last_session
     FROM exercise_sessions
     WHERE patient_id = $1`,
    [patientId],
  );

  return c.json({ data: result.rows[0] ?? null });
});

export { app as exerciseSessionsRoutes };
