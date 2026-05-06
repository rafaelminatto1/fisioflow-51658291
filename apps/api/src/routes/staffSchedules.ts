import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { isUuid } from "../lib/validators";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const _WEEKDAYS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

// GET /api/staff-schedules — all staff weekly schedules + upcoming blocks
app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  const [schedules, members, blocks] = await Promise.all([
    pool.query(
      `SELECT ss.*, pr.full_name AS therapist_name, pr.avatar_url
       FROM staff_schedules ss
       LEFT JOIN profiles pr ON pr.user_id = ss.therapist_id::uuid
       WHERE ss.organization_id = $1 AND ss.is_active = true
       ORDER BY ss.therapist_id, ss.weekday, ss.start_time`,
      [user.organizationId],
    ),
    pool.query(
      `SELECT user_id::text AS therapist_id, full_name, avatar_url, role
       FROM profiles
       WHERE organization_id = $1 AND role IN ('admin','fisioterapeuta','estagiario')
       ORDER BY full_name`,
      [user.organizationId],
    ),
    pool.query(
      `SELECT sb.*, pr.full_name AS therapist_name
       FROM staff_blocks sb
       LEFT JOIN profiles pr ON pr.user_id = sb.therapist_id::uuid
       WHERE sb.organization_id = $1
         AND sb.block_date >= CURRENT_DATE
         AND sb.block_date <= CURRENT_DATE + INTERVAL '60 days'
       ORDER BY sb.block_date, sb.therapist_id`,
      [user.organizationId],
    ),
  ]);

  return c.json({
    data: {
      members: members.rows,
      schedules: schedules.rows,
      blocks: blocks.rows,
    },
  });
});

// PUT /api/staff-schedules/:therapistId/weekly — replace weekly schedule for a therapist
app.put("/:therapistId/weekly", requireAuth, async (c) => {
  const user = c.get("user");
  const { therapistId } = c.req.param();
  const pool = createPool(c.env);

  const body = await c.req.json<{
    schedules: Array<{ weekday: number; start_time: string; end_time: string }>;
  }>();

  // Replace all active schedules for this therapist
  await pool.query(
    `UPDATE staff_schedules SET is_active = false, updated_at = NOW()
     WHERE organization_id = $1 AND therapist_id = $2`,
    [user.organizationId, therapistId],
  );

  for (const s of body.schedules ?? []) {
    await pool.query(
      `INSERT INTO staff_schedules (organization_id, therapist_id, weekday, start_time, end_time)
       VALUES ($1, $2, $3, $4::time, $5::time)`,
      [user.organizationId, therapistId, s.weekday, s.start_time, s.end_time],
    );
  }

  return c.json({ success: true });
});

// POST /api/staff-schedules/blocks — add a block
app.post("/blocks", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const body = await c.req.json<{
    therapist_id: string;
    block_date: string;
    start_time?: string;
    end_time?: string;
    reason?: string;
    notes?: string;
  }>();

  if (!body.therapist_id || !body.block_date) {
    return c.json({ error: "therapist_id e block_date são obrigatórios" }, 400);
  }

  const result = await pool.query(
    `INSERT INTO staff_blocks (organization_id, therapist_id, block_date, start_time, end_time, reason, notes)
     VALUES ($1, $2, $3::date, $4::time, $5::time, $6, $7)
     RETURNING *`,
    [
      user.organizationId,
      body.therapist_id,
      body.block_date,
      body.start_time ?? null,
      body.end_time ?? null,
      body.reason ?? "folga",
      body.notes ?? null,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

// DELETE /api/staff-schedules/blocks/:id
app.delete("/blocks/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  await pool.query(
    `DELETE FROM staff_blocks WHERE id = $1 AND organization_id = $2`,
    [id, user.organizationId],
  );
  return c.json({ success: true });
});

export { app as staffSchedulesRoutes };
