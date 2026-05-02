import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";
import {
  emptyData,
  emptyObject,
  mapBusinessHourRow,
  normalizeBusinessHourPayload,
  mapCancellationRuleRow,
  normalizeCancellationRulePayload,
  mapNotificationSettingsRow,
  normalizeNotificationSettingsPayload,
  mapBlockedTimeRow,
  normalizeBlockedTimePayload,
  mapCapacityRow,
  normalizeCapacityPayload,
  DEFAULT_APPOINTMENT_STATUSES,
  mapAppointmentStatusSettingRow,
  normalizeAppointmentStatusSettingPayload,
  mapBookingWindowRow,
  mapSlotConfigRow,
} from "./scheduling-helpers";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function ensureDefaultAppointmentStatuses(pool: any, organizationId: string) {
  for (const status of DEFAULT_APPOINTMENT_STATUSES) {
    await pool.query(
      `INSERT INTO appointment_status_settings (
        organization_id, key, label, color, bg_color, border_color,
        is_default, is_active, sort_order, allowed_actions, counts_toward_capacity
      )
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, $7, $8::jsonb, $9)
      ON CONFLICT (organization_id, key)
      DO UPDATE SET
        is_default = TRUE,
        updated_at = NOW()`,
      [
        organizationId,
        status.key,
        status.label,
        status.color,
        status.bg_color,
        status.border_color,
        status.sort_order,
        JSON.stringify(status.allowed_actions),
        status.counts_toward_capacity,
      ],
    );
  }
}

async function handleUpsertBusinessHours(c: any) {
  const user = c.get("user");
  const pool = await createPool(c.env);

  try {
    const body = (await c.req.json()) as Record<string, any>[] | Record<string, any>;
    const items = Array.isArray(body) ? body : [body];
    const normalizedItems = items.map((item) => normalizeBusinessHourPayload(item));

    const queries = [
      {
        text: "DELETE FROM business_hours WHERE organization_id = $1",
        values: [user.organizationId],
      },
    ];

    for (const normalized of normalizedItems) {
      queries.push({
        text: `INSERT INTO business_hours (
          organization_id, day_of_week, open_time, close_time, is_open,
          break_start, break_end, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        values: [
          user.organizationId,
          normalized.dayOfWeek,
          normalized.openTime,
          normalized.closeTime,
          normalized.isOpen,
          normalized.breakStart,
          normalized.breakEnd,
        ],
      });
    }

    await pool.transaction(queries);

    const res = await pool.query(
      "SELECT * FROM business_hours WHERE organization_id = $1 ORDER BY day_of_week ASC",
      [user.organizationId],
    );
    const results = res.rows.map(mapBusinessHourRow);

    const d1 = c.env.EDGE_CACHE || c.env.DB;
    if (d1) {
      const cacheKey = `business-hours:${user.organizationId}`;
      await d1
        .prepare("DELETE FROM query_cache WHERE id = ?")
        .bind(cacheKey)
        .run()
        .catch(() => {});
    }

    return c.json({ data: results });
  } catch (error: any) {
    console.error("[Business Hours Error]:", error);
    return c.json({ error: error.message || "Erro ao salvar horários de atendimento" }, 500);
  }
}

async function handleUpsertCancellationRules(c: any) {
  const user = c.get("user");
  const pool = await createPool(c.env);

  try {
    const body = await c.req.json();
    const normalized = normalizeCancellationRulePayload(body);
    const params = [
      normalized.minHoursBefore,
      normalized.allowPatientCancellation,
      normalized.maxCancellationsMonth,
      normalized.chargeLateCancellation,
      normalized.lateCancellationFee,
      user.organizationId,
    ];

    const res = await pool.query(
      `INSERT INTO cancellation_rules (
        min_hours_notice, allow_reschedule, cancellation_fee,
        min_hours_before, allow_patient_cancellation, max_cancellations_month,
        charge_late_cancellation, late_cancellation_fee, organization_id, updated_at
      )
      VALUES ($1, $2, $5, $1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (organization_id)
      DO UPDATE SET
        min_hours_notice = EXCLUDED.min_hours_notice,
        allow_reschedule = EXCLUDED.allow_reschedule,
        cancellation_fee = EXCLUDED.cancellation_fee,
        min_hours_before = EXCLUDED.min_hours_before,
        allow_patient_cancellation = EXCLUDED.allow_patient_cancellation,
        max_cancellations_month = EXCLUDED.max_cancellations_month,
        charge_late_cancellation = EXCLUDED.charge_late_cancellation,
        late_cancellation_fee = EXCLUDED.late_cancellation_fee,
        updated_at = EXCLUDED.updated_at
      RETURNING *`,
      params,
    );

    return c.json({ data: mapCancellationRuleRow(res.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

async function handleUpsertNotificationSettings(c: any) {
  const user = c.get("user");
  const pool = await createPool(c.env);

  try {
    const body = await c.req.json();
    const normalized = normalizeNotificationSettingsPayload(body);
    const params = [
      normalized.enableReminders,
      normalized.reminderHoursBefore,
      normalized.enableConfirmation,
      normalized.sendConfirmationEmail,
      normalized.sendConfirmationWhatsApp,
      normalized.sendReminder24h,
      normalized.sendReminder2h,
      normalized.sendCancellationNotice,
      normalized.customConfirmationMessage,
      normalized.customReminderMessage,
      user.organizationId,
    ];

    const res = await pool.query(
      `INSERT INTO scheduling_notification_settings (
        enable_reminders, reminder_hours_before, enable_confirmation,
        send_confirmation_email, send_confirmation_whatsapp, send_reminder_24h,
        send_reminder_2h, send_cancellation_notice, custom_confirmation_message,
        custom_reminder_message, organization_id, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (organization_id)
      DO UPDATE SET
        enable_reminders = EXCLUDED.enable_reminders,
        reminder_hours_before = EXCLUDED.reminder_hours_before,
        enable_confirmation = EXCLUDED.enable_confirmation,
        send_confirmation_email = EXCLUDED.send_confirmation_email,
        send_confirmation_whatsapp = EXCLUDED.send_confirmation_whatsapp,
        send_reminder_24h = EXCLUDED.send_reminder_24h,
        send_reminder_2h = EXCLUDED.send_reminder_2h,
        send_cancellation_notice = EXCLUDED.send_cancellation_notice,
        custom_confirmation_message = EXCLUDED.custom_confirmation_message,
        custom_reminder_message = EXCLUDED.custom_reminder_message,
        updated_at = EXCLUDED.updated_at
      RETURNING *`,
      params,
    );

    return c.json({ data: mapNotificationSettingsRow(res.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

const handleUpsertBookingWindow = async (c: any) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const body = await c.req.json();
    const minAdvance = Number(body.min_advance_days ?? 0);
    const maxAdvance = Number(body.max_advance_days ?? 60);
    const sameDay = body.same_day_booking !== false;
    const online = body.online_booking !== false;

    const result = await pool.query(
      `INSERT INTO schedule_booking_window (organization_id, min_advance_days, max_advance_days, same_day_booking, online_booking)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (organization_id) DO UPDATE
       SET min_advance_days = $2, max_advance_days = $3, same_day_booking = $4, online_booking = $5, updated_at = NOW()
       RETURNING *`,
      [user.organizationId, minAdvance, maxAdvance, sameDay, online],
    );
    return c.json({ data: mapBookingWindowRow(result.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

const handleUpsertSlotConfig = async (c: any) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const body = await c.req.json();
    const interval = Number(body.slot_interval_minutes ?? 30);
    const alignment = String(body.alignment_type ?? "fixed");

    if (![15, 30, 60].includes(interval)) {
      return c.json({ error: "slot_interval_minutes deve ser 15, 30 ou 60" }, 400);
    }

    const result = await pool.query(
      `INSERT INTO schedule_slot_config (organization_id, slot_interval_minutes, alignment_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (organization_id) DO UPDATE
       SET slot_interval_minutes = $2, alignment_type = $3, updated_at = NOW()
       RETURNING *`,
      [user.organizationId, interval, alignment],
    );
    return c.json({ data: mapSlotConfigRow(result.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// Business Hours
app.get("/settings/business-hours", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const result = await pool.query(
      "SELECT * FROM business_hours WHERE organization_id = $1 ORDER BY day_of_week ASC",
      [user.organizationId],
    );
    return c.json({ data: result.rows.map(mapBusinessHourRow) });
  } catch {
    return c.json(emptyData());
  }
});

app.post("/settings/business-hours", requireAuth, handleUpsertBusinessHours);
app.put("/settings/business-hours", requireAuth, handleUpsertBusinessHours);

// Blocked Times
app.get("/settings/blocked-times", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const result = await pool.query(
      "SELECT * FROM blocked_times WHERE organization_id = $1 ORDER BY start_date ASC, start_time ASC NULLS FIRST",
      [user.organizationId],
    );
    return c.json({ data: result.rows.map(mapBlockedTimeRow) });
  } catch {
    return c.json(emptyData());
  }
});

app.post("/settings/blocked-times", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const body = await c.req.json();
    const normalized = normalizeBlockedTimePayload(body);
    const result = await pool.query(
      `INSERT INTO blocked_times (
        organization_id, therapist_id, title, reason, start_date, end_date,
        start_time, end_time, is_all_day, is_recurring, recurring_days, created_by, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, NOW())
       RETURNING *`,
      [
        user.organizationId,
        normalized.therapistId,
        normalized.title,
        normalized.reason,
        normalized.startDate,
        normalized.endDate,
        normalized.startTime,
        normalized.endTime,
        normalized.isAllDay,
        normalized.isRecurring,
        normalized.recurringDays,
        user.uid,
      ],
    );
    return c.json({ data: mapBlockedTimeRow(result.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/settings/blocked-times/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await pool.query("DELETE FROM blocked_times WHERE id = $1 AND organization_id = $2", [
      id,
      user.organizationId,
    ]);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Cancellation Rules
app.get("/settings/cancellation-rules", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const result = await pool.query(
      "SELECT * FROM cancellation_rules WHERE organization_id = $1 LIMIT 1",
      [user.organizationId],
    );
    return c.json({ data: result.rows[0] ? mapCancellationRuleRow(result.rows[0]) : null });
  } catch {
    return c.json(emptyObject());
  }
});

app.post("/settings/cancellation-rules", requireAuth, handleUpsertCancellationRules);
app.put("/settings/cancellation-rules", requireAuth, handleUpsertCancellationRules);

// Notification Settings
app.get("/settings/notification-settings", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const result = await pool.query(
      "SELECT * FROM scheduling_notification_settings WHERE organization_id = $1 LIMIT 1",
      [user.organizationId],
    );
    return c.json({ data: result.rows[0] ? mapNotificationSettingsRow(result.rows[0]) : null });
  } catch {
    return c.json(emptyObject());
  }
});

app.post("/settings/notification-settings", requireAuth, handleUpsertNotificationSettings);
app.put("/settings/notification-settings", requireAuth, handleUpsertNotificationSettings);

// Capacity Config
app.get("/capacity-config", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const result = await pool.query(
      "SELECT * FROM schedule_capacity WHERE organization_id = $1 ORDER BY day_of_week ASC, start_time ASC",
      [user.organizationId],
    );
    return c.json({ data: result.rows.map(mapCapacityRow) });
  } catch {
    return c.json(emptyData());
  }
});

app.post("/capacity-config", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const body = await c.req.json();
    const configs = Array.isArray(body) ? body : [body];
    const results = [];

    for (const config of configs) {
      const normalized = normalizeCapacityPayload(config);
      const res = await pool.query(
        `INSERT INTO schedule_capacity (organization_id, day_of_week, start_time, end_time, max_patients)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          user.organizationId,
          normalized.dayOfWeek,
          normalized.startTime,
          normalized.endTime,
          normalized.maxPatients,
        ],
      );
      results.push(mapCapacityRow(res.rows[0]));
    }

    return c.json({ data: results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put("/capacity-config/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const body = await c.req.json();
    const current = await pool.query(
      "SELECT * FROM schedule_capacity WHERE id = $1 AND organization_id = $2 LIMIT 1",
      [id, user.organizationId],
    );

    if (!current.rows[0]) {
      return c.json({ error: "Configuração de capacidade não encontrada" }, 404);
    }

    const merged = {
      day_of_week: body.day_of_week ?? current.rows[0].day_of_week,
      start_time: body.start_time ?? current.rows[0].start_time,
      end_time: body.end_time ?? current.rows[0].end_time,
      max_patients: body.max_patients ?? current.rows[0].max_patients,
    };
    const normalized = normalizeCapacityPayload(merged);

    const res = await pool.query(
      `UPDATE schedule_capacity
       SET day_of_week = $1, start_time = $2, end_time = $3, max_patients = $4, updated_at = NOW()
       WHERE id = $5 AND organization_id = $6
       RETURNING *`,
      [
        normalized.dayOfWeek,
        normalized.startTime,
        normalized.endTime,
        normalized.maxPatients,
        id,
        user.organizationId,
      ],
    );

    return c.json({ data: mapCapacityRow(res.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/capacity-config/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await pool.query("DELETE FROM schedule_capacity WHERE id = $1 AND organization_id = $2", [
      id,
      user.organizationId,
    ]);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Appointment Status Settings
app.get("/settings/statuses", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    await ensureDefaultAppointmentStatuses(pool, user.organizationId);
    const result = await pool.query(
      `SELECT *
       FROM appointment_status_settings
       WHERE organization_id = $1
       ORDER BY sort_order ASC, label ASC`,
      [user.organizationId],
    );
    return c.json({ data: result.rows.map(mapAppointmentStatusSettingRow) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/settings/statuses", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const body = await c.req.json();
    const normalized = normalizeAppointmentStatusSettingPayload(body);
    const result = await pool.query(
      `INSERT INTO appointment_status_settings (
        organization_id, key, label, color, bg_color, border_color,
        is_default, is_active, sort_order, allowed_actions, counts_toward_capacity
      )
      VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, $8, $9::jsonb, $10)
      RETURNING *`,
      [
        user.organizationId,
        normalized.key,
        normalized.label,
        normalized.color,
        normalized.bgColor,
        normalized.borderColor,
        normalized.isActive,
        normalized.sortOrder,
        normalized.allowedActions,
        normalized.countsTowardCapacity,
      ],
    );
    return c.json({ data: mapAppointmentStatusSettingRow(result.rows[0]) }, 201);
  } catch (error: any) {
    const status = error?.code === "23505" ? 409 : 500;
    return c.json({ error: error.message }, status);
  }
});

app.put("/settings/statuses/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const current = await pool.query(
      "SELECT * FROM appointment_status_settings WHERE id = $1 AND organization_id = $2 LIMIT 1",
      [id, user.organizationId],
    );
    if (!current.rows[0]) return c.json({ error: "Status não encontrado" }, 404);

    const body = await c.req.json();
    const merged = {
      ...current.rows[0],
      ...body,
      key: current.rows[0].is_default ? current.rows[0].key : body.key ?? current.rows[0].key,
    };
    const normalized = normalizeAppointmentStatusSettingPayload(merged);
    const result = await pool.query(
      `UPDATE appointment_status_settings
       SET key = $1,
           label = $2,
           color = $3,
           bg_color = $4,
           border_color = $5,
           is_active = $6,
           sort_order = $7,
           allowed_actions = $8::jsonb,
           counts_toward_capacity = $9,
           updated_at = NOW()
       WHERE id = $10 AND organization_id = $11
       RETURNING *`,
      [
        normalized.key,
        normalized.label,
        normalized.color,
        normalized.bgColor,
        normalized.borderColor,
        normalized.isActive,
        normalized.sortOrder,
        normalized.allowedActions,
        normalized.countsTowardCapacity,
        id,
        user.organizationId,
      ],
    );
    return c.json({ data: mapAppointmentStatusSettingRow(result.rows[0]) });
  } catch (error: any) {
    const status = error?.code === "23505" ? 409 : 500;
    return c.json({ error: error.message }, status);
  }
});

app.delete("/settings/statuses/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const current = await pool.query(
      "SELECT * FROM appointment_status_settings WHERE id = $1 AND organization_id = $2 LIMIT 1",
      [id, user.organizationId],
    );
    if (!current.rows[0]) return c.json({ error: "Status não encontrado" }, 404);
    if (current.rows[0].is_default) {
      return c.json({ error: "Status padrão não pode ser excluído." }, 400);
    }

    const usage = await pool.query(
      "SELECT COUNT(*)::int AS total FROM appointments WHERE organization_id = $1 AND status = $2",
      [user.organizationId, current.rows[0].key],
    );
    if (Number(usage.rows[0]?.total ?? 0) > 0) {
      const result = await pool.query(
        `UPDATE appointment_status_settings
         SET is_active = FALSE, updated_at = NOW()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [id, user.organizationId],
      );
      return c.json({ data: mapAppointmentStatusSettingRow(result.rows[0]), deactivated: true });
    }

    await pool.query("DELETE FROM appointment_status_settings WHERE id = $1 AND organization_id = $2", [
      id,
      user.organizationId,
    ]);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Booking Window
app.get("/settings/booking-window", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const result = await pool.query(
      "SELECT * FROM schedule_booking_window WHERE organization_id = $1 LIMIT 1",
      [user.organizationId],
    );
    return c.json({ data: result.rows[0] ? mapBookingWindowRow(result.rows[0]) : null });
  } catch {
    return c.json(emptyObject());
  }
});

app.post("/settings/booking-window", requireAuth, handleUpsertBookingWindow);
app.put("/settings/booking-window", requireAuth, handleUpsertBookingWindow);

// Slot Config
app.get("/settings/slot-config", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const result = await pool.query(
      "SELECT * FROM schedule_slot_config WHERE organization_id = $1 LIMIT 1",
      [user.organizationId],
    );
    return c.json({ data: result.rows[0] ? mapSlotConfigRow(result.rows[0]) : null });
  } catch {
    return c.json(emptyObject());
  }
});

app.post("/settings/slot-config", requireAuth, handleUpsertSlotConfig);
app.put("/settings/slot-config", requireAuth, handleUpsertSlotConfig);

export { app as settingsRoutes };
