import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";
import {
  emptyData,
  mapRecurringSeriesRow,
  normalizeRecurringSeriesPayload,
  generateRecurringOccurrences,
  mapAppointmentTypeRow,
  normalizeAppointmentTypePayload,
  parseRecurringDays,
} from "./scheduling-helpers";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Recurring Series
app.get("/recurring-series", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const { patientId, isActive } = c.req.query();
    const params: unknown[] = [user.organizationId];
    let idx = 2;
    let sql = "SELECT * FROM recurring_series WHERE organization_id = $1";

    if (patientId) {
      sql += ` AND patient_id = $${idx++}`;
      params.push(patientId);
    }
    if (isActive !== undefined) {
      sql += ` AND is_active = $${idx++}`;
      params.push(isActive === "true");
    }

    sql += " ORDER BY created_at DESC";

    const result = await pool.query(sql, params);
    return c.json({ data: result.rows.map(mapRecurringSeriesRow) });
  } catch {
    return c.json(emptyData());
  }
});

app.post("/recurring-series", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const body = await c.req.json();
    const normalized = normalizeRecurringSeriesPayload(body);
    const result = await pool.query(
      `INSERT INTO recurring_series (
        organization_id, patient_id, therapist_id, recurrence_type,
        recurrence_interval, recurrence_days_of_week, appointment_date,
        appointment_time, duration, appointment_type, notes, auto_confirm,
        is_active, canceled_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
       RETURNING *`,
      [
        user.organizationId,
        normalized.patientId,
        normalized.therapistId,
        normalized.recurrenceType,
        normalized.recurrenceInterval,
        normalized.recurrenceDaysOfWeek,
        normalized.appointmentDate,
        normalized.appointmentTime,
        normalized.duration,
        normalized.appointmentType,
        normalized.notes,
        normalized.autoConfirm,
        normalized.isActive,
        normalized.canceledAt,
      ],
    );

    return c.json({ data: mapRecurringSeriesRow(result.rows[0]) }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put("/recurring-series/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const body = await c.req.json();
    const allowed = [
      "patient_id",
      "therapist_id",
      "recurrence_type",
      "recurrence_interval",
      "recurrence_days_of_week",
      "appointment_date",
      "appointment_time",
      "duration",
      "appointment_type",
      "notes",
      "auto_confirm",
      "is_active",
      "canceled_at",
    ] as const;
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (!(key in body)) continue;

      let value = body[key];
      if (key === "recurrence_days_of_week") {
        value = JSON.stringify(parseRecurringDays(value));
        sets.push(`${key} = $${idx++}::jsonb`);
      } else {
        sets.push(`${key} = $${idx++}`);
      }
      params.push(value);
    }

    if (!sets.length) {
      return c.json({ error: "Nenhum campo para atualizar" }, 400);
    }

    sets.push("updated_at = NOW()");
    params.push(id, user.organizationId);

    const result = await pool.query(
      `UPDATE recurring_series
       SET ${sets.join(", ")}
       WHERE id = $${idx++} AND organization_id = $${idx++}
       RETURNING *`,
      params,
    );

    if (!result.rows[0]) {
      return c.json({ error: "Série recorrente não encontrada" }, 404);
    }

    return c.json({ data: mapRecurringSeriesRow(result.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/recurring-series/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await pool.query("DELETE FROM recurring_series WHERE id = $1 AND organization_id = $2", [
      id,
      user.organizationId,
    ]);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/recurring-series/:id/occurrences", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const result = await pool.query(
      "SELECT * FROM recurring_series WHERE id = $1 AND organization_id = $2 LIMIT 1",
      [id, user.organizationId],
    );

    if (!result.rows[0]) {
      return c.json({ data: [] });
    }

    return c.json({ data: generateRecurringOccurrences(result.rows[0]) });
  } catch {
    return c.json(emptyData());
  }
});

// Appointment Types
app.get("/appointment-types", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const result = await pool.query(
      "SELECT * FROM appointment_types WHERE organization_id = $1 ORDER BY sort_order ASC, name ASC",
      [user.organizationId],
    );
    return c.json({ data: result.rows.map(mapAppointmentTypeRow) });
  } catch {
    return c.json(emptyData());
  }
});

app.post("/appointment-types", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const body = await c.req.json();
    const n = normalizeAppointmentTypePayload(body);
    const result = await pool.query(
      `INSERT INTO appointment_types (organization_id, name, duration_minutes, buffer_before_minutes, buffer_after_minutes, color, max_per_day, is_active, is_default, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        user.organizationId,
        n.name,
        n.durationMinutes,
        n.bufferBefore,
        n.bufferAfter,
        n.color,
        n.maxPerDay,
        n.isActive,
        n.isDefault,
        n.sortOrder,
      ],
    );
    return c.json({ data: mapAppointmentTypeRow(result.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put("/appointment-types/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const body = await c.req.json();
    const current = await pool.query(
      "SELECT * FROM appointment_types WHERE id = $1 AND organization_id = $2 LIMIT 1",
      [id, user.organizationId],
    );
    if (!current.rows[0]) {
      return c.json({ error: "Tipo de atendimento não encontrado" }, 404);
    }

    const merged = {
      name: body.name ?? current.rows[0].name,
      duration_minutes: body.duration_minutes ?? current.rows[0].duration_minutes,
      buffer_before_minutes: body.buffer_before_minutes ?? current.rows[0].buffer_before_minutes,
      buffer_after_minutes: body.buffer_after_minutes ?? current.rows[0].buffer_after_minutes,
      color: body.color ?? current.rows[0].color,
      max_per_day: body.max_per_day !== undefined ? body.max_per_day : current.rows[0].max_per_day,
      is_active: body.is_active !== undefined ? body.is_active : current.rows[0].is_active,
      is_default: body.is_default !== undefined ? body.is_default : current.rows[0].is_default,
      sort_order: body.sort_order ?? current.rows[0].sort_order,
    };

    const result = await pool.query(
      `UPDATE appointment_types
       SET name = $1, duration_minutes = $2, buffer_before_minutes = $3, buffer_after_minutes = $4,
           color = $5, max_per_day = $6, is_active = $7, is_default = $8, sort_order = $9, updated_at = NOW()
       WHERE id = $10 AND organization_id = $11
       RETURNING *`,
      [
        merged.name,
        merged.duration_minutes,
        merged.buffer_before_minutes,
        merged.buffer_after_minutes,
        merged.color,
        merged.max_per_day,
        merged.is_active,
        merged.is_default,
        merged.sort_order,
        id,
        user.organizationId,
      ],
    );
    return c.json({ data: mapAppointmentTypeRow(result.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/appointment-types/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await pool.query("DELETE FROM appointment_types WHERE id = $1 AND organization_id = $2", [
      id,
      user.organizationId,
    ]);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export { app as recurringRoutes };
