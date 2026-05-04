import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { isUuid } from "../lib/validators";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ─── Classes (Turmas) ─────────────────────────────────────────────────────────

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const { active } = c.req.query();

  const result = await pool.query(
    `SELECT
       gc.*,
       COUNT(DISTINCT ge.patient_id) FILTER (WHERE ge.unenrolled_at IS NULL)::int AS enrolled_count,
       COUNT(DISTINCT gw.patient_id) FILTER (WHERE gw.status = 'waiting')::int AS waitlist_count,
       COALESCE(
         json_agg(
           json_build_object('weekday', gs.weekday, 'start_time', gs.start_time::text)
           ORDER BY gs.weekday, gs.start_time
         ) FILTER (WHERE gs.id IS NOT NULL AND (gs.effective_until IS NULL OR gs.effective_until >= CURRENT_DATE)),
         '[]'
       ) AS schedules
     FROM group_classes gc
     LEFT JOIN group_enrollments ge ON ge.class_id = gc.id
     LEFT JOIN group_waitlist gw ON gw.class_id = gc.id
     LEFT JOIN group_class_schedules gs ON gs.class_id = gc.id
     WHERE gc.organization_id = $1
       AND gc.deleted_at IS NULL
       AND ($2::boolean IS NULL OR gc.is_active = $2)
     GROUP BY gc.id
     ORDER BY gc.is_active DESC, gc.name ASC`,
    [user.organizationId, active !== undefined ? active === "true" : null],
  );

  return c.json({ data: result.rows });
});

app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const body = await c.req.json<{
    name: string;
    description?: string;
    modality?: string;
    therapist_id?: string;
    location?: string;
    max_capacity: number;
    duration_minutes?: number;
    color?: string;
    schedules?: Array<{ weekday: number; start_time: string }>;
  }>();

  if (!body.name || !body.max_capacity || body.max_capacity < 1) {
    return c.json({ error: "name e max_capacity são obrigatórios" }, 400);
  }

  const classResult = await pool.query(
    `INSERT INTO group_classes (organization_id, name, description, modality, therapist_id, location, max_capacity, duration_minutes, color)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      user.organizationId,
      body.name,
      body.description ?? null,
      body.modality ?? "pilates",
      body.therapist_id ?? null,
      body.location ?? null,
      body.max_capacity,
      body.duration_minutes ?? 60,
      body.color ?? "#6366f1",
    ],
  );

  const newClass = classResult.rows[0];

  if (body.schedules?.length) {
    for (const sched of body.schedules) {
      await pool.query(
        `INSERT INTO group_class_schedules (class_id, organization_id, weekday, start_time)
         VALUES ($1, $2, $3, $4::time)`,
        [newClass.id, user.organizationId, sched.weekday, sched.start_time],
      );
    }
  }

  return c.json({ data: newClass }, 201);
});

app.put("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  const body = await c.req.json<Record<string, unknown>>();

  const allowed = ["name", "description", "modality", "therapist_id", "location", "max_capacity", "duration_minutes", "color", "is_active"];
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      values.push(body[key]);
      fields.push(`${key} = $${values.length}`);
    }
  }
  if (fields.length === 0) return c.json({ error: "Nenhum campo para atualizar" }, 400);

  values.push(user.organizationId, id);
  const result = await pool.query(
    `UPDATE group_classes SET ${fields.join(", ")}, updated_at = NOW()
     WHERE organization_id = $${values.length - 1} AND id = $${values.length} AND deleted_at IS NULL
     RETURNING *`,
    values,
  );

  if (result.rows.length === 0) return c.json({ error: "Turma não encontrada" }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  await pool.query(
    `UPDATE group_classes SET deleted_at = NOW(), updated_at = NOW()
     WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [user.organizationId, id],
  );
  return c.json({ success: true });
});

// ─── Sessions (Aulas/Ocorrências) ────────────────────────────────────────────

app.get("/:classId/sessions", requireAuth, async (c) => {
  const user = c.get("user");
  const { classId } = c.req.param();
  if (!isUuid(classId)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  const { from, to } = c.req.query();

  const result = await pool.query(
    `SELECT
       gs.*,
       COUNT(gc.id)::int AS checkin_count
     FROM group_sessions gs
     LEFT JOIN group_checkins gc ON gc.session_id = gs.id
     WHERE gs.class_id = $1
       AND gs.organization_id = $2
       AND gs.deleted_at IS NULL
       AND ($3::date IS NULL OR gs.date >= $3::date)
       AND ($4::date IS NULL OR gs.date <= $4::date)
     GROUP BY gs.id
     ORDER BY gs.date DESC, gs.start_time DESC
     LIMIT 60`,
    [classId, user.organizationId, from ?? null, to ?? null],
  );

  return c.json({ data: result.rows });
});

app.post("/:classId/sessions", requireAuth, async (c) => {
  const user = c.get("user");
  const { classId } = c.req.param();
  if (!isUuid(classId)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  const body = await c.req.json<{
    date: string;
    start_time: string;
    end_time?: string;
    therapist_id?: string;
    location?: string;
    notes?: string;
  }>();

  if (!body.date || !body.start_time) {
    return c.json({ error: "date e start_time são obrigatórios" }, 400);
  }

  const result = await pool.query(
    `INSERT INTO group_sessions (class_id, organization_id, date, start_time, end_time, therapist_id, location, notes)
     VALUES ($1, $2, $3::date, $4::time, $5::time, $6, $7, $8)
     RETURNING *`,
    [
      classId,
      user.organizationId,
      body.date,
      body.start_time,
      body.end_time ?? null,
      body.therapist_id ?? null,
      body.location ?? null,
      body.notes ?? null,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

// Generate upcoming sessions from class schedule (next N weeks)
app.post("/:classId/sessions/generate", requireAuth, async (c) => {
  const user = c.get("user");
  const { classId } = c.req.param();
  if (!isUuid(classId)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  const body = await c.req.json<{ weeks?: number }>().catch(() => ({ weeks: 4 }));
  const weeks = Math.min(Number(body.weeks ?? 4), 12);

  const cls = await pool.query(
    `SELECT gc.*, json_agg(json_build_object('weekday', gcs.weekday, 'start_time', gcs.start_time::text) ORDER BY gcs.weekday) AS schedules
     FROM group_classes gc
     LEFT JOIN group_class_schedules gcs ON gcs.class_id = gc.id
       AND (gcs.effective_until IS NULL OR gcs.effective_until >= CURRENT_DATE)
     WHERE gc.id = $1 AND gc.organization_id = $2 AND gc.deleted_at IS NULL
     GROUP BY gc.id`,
    [classId, user.organizationId],
  );

  if (cls.rows.length === 0) return c.json({ error: "Turma não encontrada" }, 404);

  const schedules: Array<{ weekday: number; start_time: string }> = cls.rows[0].schedules ?? [];
  if (schedules.length === 0) return c.json({ error: "Turma sem horários configurados" }, 422);

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + weeks * 7);

  let created = 0;
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);

  while (cur <= endDate) {
    const dow = cur.getDay(); // 0=Sun
    const matching = schedules.filter((s) => s.weekday === dow);
    for (const sched of matching) {
      const dateStr = cur.toISOString().split("T")[0];
      await pool.query(
        `INSERT INTO group_sessions (class_id, organization_id, date, start_time, therapist_id, location)
         SELECT $1, $2, $3::date, $4::time, therapist_id, location
         FROM group_classes WHERE id = $1
         ON CONFLICT DO NOTHING`,
        [classId, user.organizationId, dateStr, sched.start_time],
      );
      created++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return c.json({ data: { created } });
});

// ─── Enrollments ─────────────────────────────────────────────────────────────

app.get("/:classId/enrollments", requireAuth, async (c) => {
  const user = c.get("user");
  const { classId } = c.req.param();
  if (!isUuid(classId)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT ge.*, p.full_name, p.phone, p.whatsapp, p.birth_date
     FROM group_enrollments ge
     INNER JOIN patients p ON p.id = ge.patient_id
     WHERE ge.class_id = $1 AND ge.organization_id = $2 AND ge.unenrolled_at IS NULL
     ORDER BY p.full_name ASC`,
    [classId, user.organizationId],
  );

  return c.json({ data: result.rows });
});

app.post("/:classId/enroll", requireAuth, async (c) => {
  const user = c.get("user");
  const { classId } = c.req.param();
  if (!isUuid(classId)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  const { patient_id, notes } = await c.req.json<{ patient_id: string; notes?: string }>();
  if (!isUuid(patient_id)) return c.json({ error: "patient_id inválido" }, 400);

  // Check capacity
  const cls = await pool.query(
    `SELECT gc.max_capacity, COUNT(ge.id)::int AS enrolled
     FROM group_classes gc
     LEFT JOIN group_enrollments ge ON ge.class_id = gc.id AND ge.unenrolled_at IS NULL
     WHERE gc.id = $1 AND gc.organization_id = $2 AND gc.deleted_at IS NULL
     GROUP BY gc.max_capacity`,
    [classId, user.organizationId],
  );

  if (cls.rows.length === 0) return c.json({ error: "Turma não encontrada" }, 404);

  const { max_capacity, enrolled } = cls.rows[0];

  if (enrolled >= max_capacity) {
    // Add to waitlist instead
    const position = await pool.query(
      `SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM group_waitlist WHERE class_id = $1 AND status = 'waiting'`,
      [classId],
    );
    await pool.query(
      `INSERT INTO group_waitlist (class_id, patient_id, organization_id, position)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (class_id, patient_id) DO UPDATE SET status = 'waiting', position = EXCLUDED.position`,
      [classId, patient_id, user.organizationId, position.rows[0].next_pos],
    );
    return c.json({ data: { status: "waitlisted", position: position.rows[0].next_pos } }, 202);
  }

  await pool.query(
    `INSERT INTO group_enrollments (class_id, patient_id, organization_id, notes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (class_id, patient_id) DO UPDATE SET unenrolled_at = NULL, notes = EXCLUDED.notes`,
    [classId, patient_id, user.organizationId, notes ?? null],
  );

  return c.json({ data: { status: "enrolled" } }, 201);
});

app.post("/:classId/unenroll", requireAuth, async (c) => {
  const user = c.get("user");
  const { classId } = c.req.param();
  if (!isUuid(classId)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  const { patient_id } = await c.req.json<{ patient_id: string }>();
  if (!isUuid(patient_id)) return c.json({ error: "patient_id inválido" }, 400);

  await pool.query(
    `UPDATE group_enrollments SET unenrolled_at = NOW()
     WHERE class_id = $1 AND patient_id = $2 AND organization_id = $3 AND unenrolled_at IS NULL`,
    [classId, patient_id, user.organizationId],
  );

  // Promote next person on waitlist
  const next = await pool.query(
    `SELECT patient_id FROM group_waitlist
     WHERE class_id = $1 AND status = 'waiting'
     ORDER BY position ASC LIMIT 1`,
    [classId],
  );

  if (next.rows.length > 0) {
    await pool.query(
      `UPDATE group_waitlist SET status = 'offered', notified_at = NOW()
       WHERE class_id = $1 AND patient_id = $2`,
      [classId, next.rows[0].patient_id],
    );
  }

  return c.json({ success: true });
});

// ─── Check-ins ────────────────────────────────────────────────────────────────

app.get("/sessions/:sessionId/checkins", requireAuth, async (c) => {
  const user = c.get("user");
  const { sessionId } = c.req.param();
  if (!isUuid(sessionId)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT gc.*, p.full_name, p.phone
     FROM group_checkins gc
     INNER JOIN patients p ON p.id = gc.patient_id
     WHERE gc.session_id = $1 AND gc.organization_id = $2
     ORDER BY gc.checked_in_at ASC`,
    [sessionId, user.organizationId],
  );

  // Also fetch enrolled patients not yet checked in
  const enrolled = await pool.query(
    `SELECT ge.patient_id, p.full_name, p.phone,
       EXISTS(SELECT 1 FROM group_checkins WHERE session_id = $1 AND patient_id = ge.patient_id) AS checked_in
     FROM group_sessions gs
     JOIN group_enrollments ge ON ge.class_id = gs.class_id AND ge.unenrolled_at IS NULL
     JOIN patients p ON p.id = ge.patient_id
     WHERE gs.id = $1 AND gs.organization_id = $2
     ORDER BY p.full_name ASC`,
    [sessionId, user.organizationId],
  );

  return c.json({ data: { checkins: result.rows, enrolled: enrolled.rows } });
});

app.post("/sessions/:sessionId/checkins", requireAuth, async (c) => {
  const user = c.get("user");
  const { sessionId } = c.req.param();
  if (!isUuid(sessionId)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  const body = await c.req.json<{ patient_id: string; method?: string; notes?: string }>();
  if (!isUuid(body.patient_id)) return c.json({ error: "patient_id inválido" }, 400);

  const result = await pool.query(
    `INSERT INTO group_checkins (session_id, patient_id, organization_id, method, notes)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (session_id, patient_id) DO NOTHING
     RETURNING *`,
    [sessionId, body.patient_id, user.organizationId, body.method ?? "manual", body.notes ?? null],
  );

  return c.json({ data: result.rows[0] ?? null }, 201);
});

app.delete("/sessions/:sessionId/checkins/:patientId", requireAuth, async (c) => {
  const user = c.get("user");
  const { sessionId, patientId } = c.req.param();
  if (!isUuid(sessionId) || !isUuid(patientId)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  await pool.query(
    `DELETE FROM group_checkins WHERE session_id = $1 AND patient_id = $2 AND organization_id = $3`,
    [sessionId, patientId, user.organizationId],
  );
  return c.json({ success: true });
});

// ─── Waitlist ────────────────────────────────────────────────────────────────

app.get("/:classId/waitlist", requireAuth, async (c) => {
  const user = c.get("user");
  const { classId } = c.req.param();
  if (!isUuid(classId)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT gw.*, p.full_name, p.phone, p.whatsapp
     FROM group_waitlist gw
     INNER JOIN patients p ON p.id = gw.patient_id
     WHERE gw.class_id = $1 AND gw.organization_id = $2
     ORDER BY gw.position ASC`,
    [classId, user.organizationId],
  );

  return c.json({ data: result.rows });
});

export { app as groupsRoutes };
