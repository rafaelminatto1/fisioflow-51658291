/**
 * Rotas: Domínio de Agendamento Recorrente e Lista de Espera
 *
 * GET/POST/PUT/DELETE /api/scheduling/recurring-series
 * GET/POST            /api/scheduling/recurring-series/:id/occurrences
 * GET/POST/PUT/DELETE /api/scheduling/waitlist
 * GET/POST/PUT        /api/scheduling/waitlist-offers
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function loadOrganizationSettings(
  pool: ReturnType<typeof createPool>,
  organizationId: string,
): Promise<Record<string, unknown>> {
  try {
    const hasSettings = await pool.query(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'settings'
      LIMIT 1
      `,
    );
    if (!hasSettings.rows.length) return {};

    const result = await pool.query(
      `SELECT settings FROM organizations WHERE id = $1 LIMIT 1`,
      [organizationId],
    );
    const raw = result.rows[0]?.settings;
    if (!raw || typeof raw !== 'object') return {};
    return raw as Record<string, unknown>;
  } catch (error) {
    console.error('[scheduling] loadOrganizationSettings fallback:', error);
    return {};
  }
}

async function saveOrganizationSettings(
  pool: ReturnType<typeof createPool>,
  organizationId: string,
  settings: Record<string, unknown>,
): Promise<boolean> {
  try {
    const hasSettings = await pool.query(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'settings'
      LIMIT 1
      `,
    );
    if (!hasSettings.rows.length) return false;

    const result = await pool.query(
      `UPDATE organizations
       SET settings = $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(settings), organizationId],
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('[scheduling] saveOrganizationSettings fallback:', error);
    return false;
  }
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

// ===== RECURRING SERIES =====

app.get('/recurring-series', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { patientId, therapistId, isActive } = c.req.query();

  const conditions: string[] = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (patientId) { params.push(patientId); conditions.push(`patient_id = $${params.length}`); }
  if (therapistId) { params.push(therapistId); conditions.push(`therapist_id = $${params.length}`); }
  if (isActive !== undefined) { params.push(isActive === 'true'); conditions.push(`is_active = $${params.length}`); }

  const result = await pool.query(
    `SELECT * FROM recurring_appointment_series WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC`,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/recurring-series', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.recurrence_type) return c.json({ error: 'recurrence_type é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO recurring_appointment_series
       (organization_id, patient_id, therapist_id, service_id, room_id,
        recurrence_type, recurrence_interval, recurrence_days_of_week,
        appointment_date, appointment_time, duration, appointment_type,
        notes, auto_confirm, is_active, created_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      body.patient_id ?? null,
      body.therapist_id ?? null,
      body.service_id ?? null,
      body.room_id ?? null,
      String(body.recurrence_type),
      body.recurrence_interval != null ? Number(body.recurrence_interval) : 1,
      body.recurrence_days_of_week ?? [],
      body.appointment_date ?? null,
      body.appointment_time ?? null,
      body.duration != null ? Number(body.duration) : 60,
      body.appointment_type ?? null,
      body.notes ?? null,
      body.auto_confirm === true,
      body.is_active !== false,
      user.uid,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/recurring-series/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.patient_id !== undefined) { params.push(body.patient_id); sets.push(`patient_id = $${params.length}`); }
  if (body.therapist_id !== undefined) { params.push(body.therapist_id); sets.push(`therapist_id = $${params.length}`); }
  if (body.recurrence_type !== undefined) { params.push(body.recurrence_type); sets.push(`recurrence_type = $${params.length}`); }
  if (body.recurrence_interval !== undefined) { params.push(Number(body.recurrence_interval)); sets.push(`recurrence_interval = $${params.length}`); }
  if (body.recurrence_days_of_week !== undefined) { params.push(body.recurrence_days_of_week); sets.push(`recurrence_days_of_week = $${params.length}`); }
  if (body.appointment_date !== undefined) { params.push(body.appointment_date); sets.push(`appointment_date = $${params.length}`); }
  if (body.appointment_time !== undefined) { params.push(body.appointment_time); sets.push(`appointment_time = $${params.length}`); }
  if (body.duration !== undefined) { params.push(Number(body.duration)); sets.push(`duration = $${params.length}`); }
  if (body.notes !== undefined) { params.push(body.notes); sets.push(`notes = $${params.length}`); }
  if (body.auto_confirm !== undefined) { params.push(body.auto_confirm); sets.push(`auto_confirm = $${params.length}`); }
  if (body.is_active !== undefined) { params.push(body.is_active); sets.push(`is_active = $${params.length}`); }
  if (body.canceled_at !== undefined) { params.push(body.canceled_at); sets.push(`canceled_at = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE recurring_appointment_series SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Série não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/recurring-series/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM recurring_appointment_series WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Série não encontrada' }, 404);

  await pool.query('DELETE FROM recurring_appointment_series WHERE id = $1', [id]);
  return c.json({ ok: true });
});

// ===== OCCURRENCES (sub-resource) =====

app.get('/recurring-series/:id/occurrences', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const { status } = c.req.query();

  const seriesCheck = await pool.query(
    'SELECT id FROM recurring_appointment_series WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!seriesCheck.rows.length) return c.json({ error: 'Série não encontrada' }, 404);

  const conditions: string[] = ['series_id = $1'];
  const params: unknown[] = [id];

  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }

  const result = await pool.query(
    `SELECT * FROM recurring_appointment_occurrences WHERE ${conditions.join(' AND ')}
     ORDER BY occurrence_date ASC`,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/recurring-series/:id/occurrences', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: seriesId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.occurrence_date) return c.json({ error: 'occurrence_date é obrigatório' }, 400);

  const seriesCheck = await pool.query(
    'SELECT id FROM recurring_appointment_series WHERE id = $1 AND organization_id = $2',
    [seriesId, user.organizationId],
  );
  if (!seriesCheck.rows.length) return c.json({ error: 'Série não encontrada' }, 404);

  const result = await pool.query(
    `INSERT INTO recurring_appointment_occurrences
       (organization_id, series_id, occurrence_date, occurrence_time, status,
        appointment_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      seriesId,
      String(body.occurrence_date),
      body.occurrence_time ?? null,
      body.status ?? 'scheduled',
      body.appointment_id ?? null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

// ===== WAITLIST =====

app.get('/waitlist', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { status, priority } = c.req.query();

  const conditions: string[] = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (priority) { params.push(priority); conditions.push(`priority = $${params.length}`); }

  const result = await pool.query(
    `SELECT * FROM waitlist WHERE ${conditions.join(' AND ')}
     ORDER BY created_at ASC`,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/waitlist', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const result = await pool.query(
    `INSERT INTO waitlist
       (organization_id, patient_id, preferred_days, preferred_periods,
        preferred_therapist_id, priority, status, notes, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      body.patient_id ?? null,
      body.preferred_days ?? [],
      body.preferred_periods ?? [],
      body.preferred_therapist_id ?? null,
      body.priority ?? 'normal',
      body.status ?? 'waiting',
      body.notes ?? null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/waitlist/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.status !== undefined) { params.push(body.status); sets.push(`status = $${params.length}`); }
  if (body.priority !== undefined) { params.push(body.priority); sets.push(`priority = $${params.length}`); }
  if (body.preferred_days !== undefined) { params.push(body.preferred_days); sets.push(`preferred_days = $${params.length}`); }
  if (body.preferred_periods !== undefined) { params.push(body.preferred_periods); sets.push(`preferred_periods = $${params.length}`); }
  if (body.preferred_therapist_id !== undefined) { params.push(body.preferred_therapist_id); sets.push(`preferred_therapist_id = $${params.length}`); }
  if (body.notes !== undefined) { params.push(body.notes); sets.push(`notes = $${params.length}`); }
  if (body.offered_slot !== undefined) { params.push(JSON.stringify(body.offered_slot)); sets.push(`offered_slot = $${params.length}`); }
  if (body.offered_at !== undefined) { params.push(body.offered_at); sets.push(`offered_at = $${params.length}`); }
  if (body.offer_expires_at !== undefined) { params.push(body.offer_expires_at); sets.push(`offer_expires_at = $${params.length}`); }
  if (body.refusal_count !== undefined) { params.push(Number(body.refusal_count)); sets.push(`refusal_count = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE waitlist SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Entrada na lista de espera não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/waitlist/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM waitlist WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Entrada na lista de espera não encontrada' }, 404);

  await pool.query('DELETE FROM waitlist WHERE id = $1', [id]);
  return c.json({ ok: true });
});

// ===== WAITLIST OFFERS =====

app.get('/waitlist-offers', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { waitlistId, status } = c.req.query();

  const conditions: string[] = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (waitlistId) { params.push(waitlistId); conditions.push(`waitlist_id = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }

  const result = await pool.query(
    `SELECT * FROM waitlist_offers WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/waitlist-offers', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.waitlist_id) return c.json({ error: 'waitlist_id é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO waitlist_offers
       (organization_id, patient_id, waitlist_id, offered_slot, response, status,
        expiration_time, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      body.patient_id ?? null,
      String(body.waitlist_id),
      body.offered_slot ? JSON.stringify(body.offered_slot) : null,
      body.response ?? 'pending',
      body.status ?? 'pending',
      body.expiration_time ?? null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/waitlist-offers/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.response !== undefined) { params.push(body.response); sets.push(`response = $${params.length}`); }
  if (body.status !== undefined) { params.push(body.status); sets.push(`status = $${params.length}`); }
  if (body.responded_at !== undefined) { params.push(body.responded_at); sets.push(`responded_at = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE waitlist_offers SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Oferta não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

// ===== SCHEDULE CAPACITY CONFIG (stored in organizations.settings JSON) =====

app.get('/capacity-config', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const settings = await loadOrganizationSettings(pool, user.organizationId);
  const data = asArray<Record<string, unknown>>(settings.schedule_capacity_config);
  return c.json({ data });
});

app.post('/capacity-config', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown> | Record<string, unknown>[];

  const incoming = Array.isArray(body) ? body : [body];
  const settings = await loadOrganizationSettings(pool, user.organizationId);
  const current = asArray<Record<string, unknown>>(settings.schedule_capacity_config);

  const now = new Date().toISOString();
  const created = incoming.map((item) => ({
    id: String(item.id ?? crypto.randomUUID()),
    day_of_week: Number(item.day_of_week ?? 0),
    start_time: String(item.start_time ?? '07:00'),
    end_time: String(item.end_time ?? '19:00'),
    max_patients: Math.max(1, Number(item.max_patients ?? 1)),
    created_at: now,
    updated_at: now,
  }));

  settings.schedule_capacity_config = [...current, ...created];
  await saveOrganizationSettings(pool, user.organizationId, settings);

  return c.json({ data: created }, 201);
});

app.put('/capacity-config/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const settings = await loadOrganizationSettings(pool, user.organizationId);
  const current = asArray<Record<string, unknown>>(settings.schedule_capacity_config);
  const now = new Date().toISOString();

  let found = false;
  const updated = current.map((item) => {
    if (String(item.id) !== id) return item;
    found = true;
    return {
      ...item,
      ...(body.day_of_week !== undefined ? { day_of_week: Number(body.day_of_week) } : {}),
      ...(body.start_time !== undefined ? { start_time: String(body.start_time) } : {}),
      ...(body.end_time !== undefined ? { end_time: String(body.end_time) } : {}),
      ...(body.max_patients !== undefined ? { max_patients: Math.max(1, Number(body.max_patients)) } : {}),
      updated_at: now,
    };
  });

  if (!found) return c.json({ error: 'Configuração não encontrada' }, 404);

  settings.schedule_capacity_config = updated;
  await saveOrganizationSettings(pool, user.organizationId, settings);

  const row = updated.find((item) => String(item.id) === id) ?? null;
  return c.json({ data: row });
});

app.delete('/capacity-config/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const settings = await loadOrganizationSettings(pool, user.organizationId);
  const current = asArray<Record<string, unknown>>(settings.schedule_capacity_config);
  const next = current.filter((item) => String(item.id) !== id);

  if (next.length === current.length) return c.json({ error: 'Configuração não encontrada' }, 404);

  settings.schedule_capacity_config = next;
  await saveOrganizationSettings(pool, user.organizationId, settings);

  return c.json({ ok: true });
});

// ===== SCHEDULE SETTINGS (stored in organizations.settings JSON) =====

app.get('/settings/business-hours', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const settings = await loadOrganizationSettings(pool, user.organizationId);
  const data = asArray<Record<string, unknown>>(settings.schedule_business_hours);
  return c.json({ data });
});

app.put('/settings/business-hours', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>[];
  const incoming = Array.isArray(body) ? body : [];

  const normalized = incoming.map((item) => ({
    id: String(item.id ?? `${user.organizationId}_${Number(item.day_of_week ?? 0)}`),
    day_of_week: Number(item.day_of_week ?? 0),
    is_open: item.is_open !== false,
    open_time: String(item.open_time ?? '07:00'),
    close_time: String(item.close_time ?? '21:00'),
    break_start: item.break_start ?? null,
    break_end: item.break_end ?? null,
  }));

  const settings = await loadOrganizationSettings(pool, user.organizationId);
  settings.schedule_business_hours = normalized;
  await saveOrganizationSettings(pool, user.organizationId, settings);

  return c.json({ data: normalized });
});

app.get('/settings/cancellation-rules', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const settings = await loadOrganizationSettings(pool, user.organizationId);
  const data = (settings.schedule_cancellation_rules ?? null) as Record<string, unknown> | null;
  return c.json({ data });
});

app.put('/settings/cancellation-rules', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const normalized = {
    id: String(body.id ?? user.organizationId),
    min_hours_before: Number(body.min_hours_before ?? 24),
    allow_patient_cancellation: body.allow_patient_cancellation !== false,
    max_cancellations_month: Number(body.max_cancellations_month ?? 3),
    charge_late_cancellation: body.charge_late_cancellation === true,
    late_cancellation_fee: Number(body.late_cancellation_fee ?? 0),
  };

  const settings = await loadOrganizationSettings(pool, user.organizationId);
  settings.schedule_cancellation_rules = normalized;
  await saveOrganizationSettings(pool, user.organizationId, settings);

  return c.json({ data: normalized });
});

app.get('/settings/notification-settings', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const settings = await loadOrganizationSettings(pool, user.organizationId);
  const data = (settings.schedule_notification_settings ?? null) as Record<string, unknown> | null;
  return c.json({ data });
});

app.put('/settings/notification-settings', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const normalized = {
    id: String(body.id ?? user.organizationId),
    send_confirmation_email: body.send_confirmation_email !== false,
    send_confirmation_whatsapp: body.send_confirmation_whatsapp !== false,
    send_reminder_24h: body.send_reminder_24h !== false,
    send_reminder_2h: body.send_reminder_2h !== false,
    send_cancellation_notice: body.send_cancellation_notice !== false,
    custom_confirmation_message:
      body.custom_confirmation_message != null ? String(body.custom_confirmation_message) : '',
    custom_reminder_message:
      body.custom_reminder_message != null ? String(body.custom_reminder_message) : '',
  };

  const settings = await loadOrganizationSettings(pool, user.organizationId);
  settings.schedule_notification_settings = normalized;
  await saveOrganizationSettings(pool, user.organizationId, settings);

  return c.json({ data: normalized });
});

app.get('/settings/blocked-times', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const settings = await loadOrganizationSettings(pool, user.organizationId);
  const data = asArray<Record<string, unknown>>(settings.schedule_blocked_times).sort((a, b) =>
    String(a.start_date ?? '').localeCompare(String(b.start_date ?? '')),
  );
  return c.json({ data });
});

app.post('/settings/blocked-times', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const settings = await loadOrganizationSettings(pool, user.organizationId);
  const current = asArray<Record<string, unknown>>(settings.schedule_blocked_times);
  const now = new Date().toISOString();

  const blocked = {
    id: String(body.id ?? crypto.randomUUID()),
    title: String(body.title ?? 'Bloqueio'),
    reason: body.reason != null ? String(body.reason) : '',
    therapist_id: body.therapist_id ?? null,
    start_date: String(body.start_date ?? now.slice(0, 10)),
    end_date: String(body.end_date ?? now.slice(0, 10)),
    start_time: body.start_time ?? null,
    end_time: body.end_time ?? null,
    is_all_day: body.is_all_day !== false,
    is_recurring: body.is_recurring === true,
    recurring_days: Array.isArray(body.recurring_days) ? body.recurring_days : [],
    created_by: user.uid,
    created_at: now,
  };

  settings.schedule_blocked_times = [...current, blocked];
  await saveOrganizationSettings(pool, user.organizationId, settings);

  return c.json({ data: blocked }, 201);
});

app.delete('/settings/blocked-times/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const settings = await loadOrganizationSettings(pool, user.organizationId);
  const current = asArray<Record<string, unknown>>(settings.schedule_blocked_times);
  const next = current.filter((item) => String(item.id) !== id);

  if (next.length === current.length) return c.json({ error: 'Bloqueio não encontrado' }, 404);

  settings.schedule_blocked_times = next;
  await saveOrganizationSettings(pool, user.organizationId, settings);

  return c.json({ ok: true });
});

export { app as schedulingRoutes };
