import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";
import { broadcastToOrg } from "../lib/realtime";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const mapWaitlistRow = (row: Record<string, any>): Record<string, any> => ({
  ...row,
  target_date: row.target_date,
  target_time: row.target_time ? row.target_time.slice(0, 5) : null,
  created_at: row.created_at,
  updated_at: row.updated_at,
  notified_at: row.notified_at,
});

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const { date, time, status } = c.req.query();
    const params: unknown[] = [user.organizationId];
    let idx = 2;
    let sql = "SELECT * FROM appointment_waitlist WHERE clinic_id = $1";

    if (date) {
      sql += ` AND target_date = $${idx++}`;
      params.push(date);
    }
    if (time) {
      sql += ` AND target_time = $${idx++}`;
      params.push(time);
    }
    if (status) {
      sql += ` AND status = $${idx++}`;
      params.push(status);
    }

    sql += " ORDER BY created_at ASC";

    const result = await pool.query(sql, params);
    return c.json({ data: result.rows.map(mapWaitlistRow) });
  } catch {
    return c.json({ data: [] });
  }
});

app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const body = await c.req.json();
    const { patient_id, patient_phone, patient_name, target_date, target_time, type = "session" } = body;

    if (!patient_phone || !target_date || !target_time) {
      return c.json({ error: "patient_phone, target_date e target_time são obrigatórios" }, 400);
    }

    const result = await pool.query(
      `INSERT INTO appointment_waitlist (
        clinic_id, patient_id, patient_phone, patient_name, target_date, target_time, type, status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'waiting')
       RETURNING *`,
      [
        user.organizationId,
        patient_id || null,
        patient_phone,
        patient_name || null,
        target_date,
        target_time,
        type,
      ],
    );

    const entry = mapWaitlistRow(result.rows[0]);

    const positionResult = await pool.query(
      `SELECT COUNT(*) as position FROM appointment_waitlist
       WHERE clinic_id = $1 AND target_date = $2 AND target_time = $3 AND status = 'waiting'
       AND created_at <= $4`,
      [user.organizationId, target_date, target_time, entry.created_at],
    );

    return c.json({
      data: { ...entry, position: parseInt(positionResult.rows[0].position) },
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const result = await pool.query(
      "SELECT * FROM appointment_waitlist WHERE id = $1 AND clinic_id = $2",
      [id, user.organizationId],
    );

    if (!result.rows[0]) {
      return c.json({ error: "Entrada na fila não encontrada" }, 404);
    }

    return c.json({ data: mapWaitlistRow(result.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const body = await c.req.json();
    const allowed = ["patient_id", "patient_phone", "patient_name", "target_date", "target_time", "type", "status", "notified_at"] as const;
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (!(key in body)) continue;
      sets.push(`${key} = $${idx++}`);
      params.push(body[key]);
    }

    if (!sets.length) {
      return c.json({ error: "Nenhum campo para atualizar" }, 400);
    }

    sets.push("updated_at = NOW()");
    params.push(id, user.organizationId);

    const result = await pool.query(
      `UPDATE appointment_waitlist SET ${sets.join(", ")} WHERE id = $${idx++} AND clinic_id = $${idx++} RETURNING *`,
      params,
    );

    if (!result.rows[0]) {
      return c.json({ error: "Entrada na fila não encontrada" }, 404);
    }

    return c.json({ data: mapWaitlistRow(result.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await pool.query(
      "DELETE FROM appointment_waitlist WHERE id = $1 AND clinic_id = $2",
      [id, user.organizationId],
    );
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/:id/notify", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const result = await pool.query(
      `UPDATE appointment_waitlist
       SET status = 'notified', notified_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND clinic_id = $2 AND status = 'waiting'
       RETURNING *`,
      [id, user.organizationId],
    );

    if (!result.rows[0]) {
      return c.json({ error: "Entrada na fila não encontrada ou já notificada" }, 404);
    }

    const entry = mapWaitlistRow(result.rows[0]);

    await broadcastToOrg(c.env, user.organizationId, {
      type: "WAITLIST_SLOT_AVAILABLE",
      payload: {
        waitlist_id: entry.id,
        patient_id: entry.patient_id,
        patient_name: entry.patient_name,
        patient_phone: entry.patient_phone,
        target_date: entry.target_date,
        target_time: entry.target_time,
      },
    });

    return c.json({ data: entry });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/:id/fulfill", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const result = await pool.query(
      `UPDATE appointment_waitlist
       SET status = 'fulfilled', updated_at = NOW()
       WHERE id = $1 AND clinic_id = $2
       RETURNING *`,
      [id, user.organizationId],
    );

    if (!result.rows[0]) {
      return c.json({ error: "Entrada na fila não encontrada" }, 404);
    }

    return c.json({ data: mapWaitlistRow(result.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/:id/decline", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const result = await pool.query(
      `UPDATE appointment_waitlist
       SET status = 'declined', updated_at = NOW()
       WHERE id = $1 AND clinic_id = $2
       RETURNING *`,
      [id, user.organizationId],
    );

    if (!result.rows[0]) {
      return c.json({ error: "Entrada na fila não encontrada" }, 404);
    }

    return c.json({ data: mapWaitlistRow(result.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export { app as appointmentWaitlistRoutes };