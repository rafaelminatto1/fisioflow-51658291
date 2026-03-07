import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

function normalizeStatus(value: unknown): AppointmentStatus {
  const raw = String(value ?? 'scheduled').toLowerCase();
  const map: Record<string, AppointmentStatus> = {
    agendado: 'scheduled',
    confirmado: 'confirmed',
    em_atendimento: 'in_progress',
    concluido: 'completed',
    cancelado: 'cancelled',
    paciente_faltou: 'no_show',
    falta: 'no_show',
    faltou: 'no_show',
    realizado: 'completed',
    atendido: 'completed',
    scheduled: 'scheduled',
    confirmed: 'confirmed',
    in_progress: 'in_progress',
    completed: 'completed',
    cancelled: 'cancelled',
    no_show: 'no_show',
    rescheduled: 'rescheduled',
  };
  return map[raw] ?? 'scheduled';
}

function normalizeType(value: unknown): 'evaluation' | 'session' | 'reassessment' | 'group' | 'return' {
  const raw = String(value ?? 'session').toLowerCase();
  const map: Record<string, 'evaluation' | 'session' | 'reassessment' | 'group' | 'return'> = {
    individual: 'session',
    dupla: 'session',
    grupo: 'group',
    group: 'group',
    avaliacao: 'evaluation',
    evaluation: 'evaluation',
    reassessment: 'reassessment',
    return: 'return',
    session: 'session',
  };
  return map[raw] ?? 'session';
}

function normalizeDateForDb(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const raw = String(value ?? '').trim();
  if (!raw) return raw;
  if (raw.includes('T')) return raw.slice(0, 10);
  return raw;
}

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const {
    dateFrom,
    dateTo,
    therapistId,
    status,
    patientId,
    limit = '100',
    offset = '0',
  } = c.req.query();

  const limitNum = Math.min(3000, Math.max(1, Number.parseInt(limit, 10) || 100));
  const offsetNum = Math.max(0, Number.parseInt(offset, 10) || 0);
  const params: Array<string | number> = [user.organizationId];
  let where = 'WHERE a.organization_id = $1';

  if (dateFrom) {
    params.push(dateFrom);
    where += ` AND a.date >= $${params.length}`;
  }
  if (dateTo) {
    params.push(dateTo);
    where += ` AND a.date <= $${params.length}`;
  }
  if (therapistId) {
    params.push(therapistId);
    where += ` AND a.therapist_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    where += ` AND a.status = $${params.length}`;
  }
  if (patientId) {
    params.push(patientId);
    where += ` AND a.patient_id = $${params.length}`;
  }

  params.push(limitNum, offsetNum);
  const result = await pool.query(
    `
      SELECT
        a.*,
        a.type AS session_type,
        p.full_name AS patient_name,
        p.phone AS patient_phone
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      ${where}
      ORDER BY a.date, a.start_time
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `,
    params,
  );

  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return c.json({ data: result.rows });
});

app.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    `
      SELECT
        a.*,
        a.type AS session_type,
        to_jsonb(p.*) AS patient
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      WHERE a.id = $1 AND a.organization_id = $2
      LIMIT 1
    `,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Agendamento não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.post('/check-conflict', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const therapistId = String(body.therapistId ?? '').trim();
  const date = String(body.date ?? '').trim();
  const startTime = String(body.startTime ?? '').trim();
  const endTime = String(body.endTime ?? '').trim();
  const excludeId = body.excludeAppointmentId ? String(body.excludeAppointmentId) : null;

  if (!therapistId || !date || !startTime || !endTime) {
    return c.json({ error: 'terapeuta, data, horário início e fim são obrigatórios' }, 400);
  }

  const params: Array<string | null> = [user.organizationId, therapistId, date, endTime, startTime];
  let extra = '';
  if (excludeId) {
    params.push(excludeId);
    extra = ` AND id <> $${params.length}`;
  }

  const result = await pool.query(
    `
      SELECT id
      FROM appointments
      WHERE organization_id = $1
        AND therapist_id = $2
        AND date = $3
        AND status NOT IN ('cancelled', 'no_show')
        AND NOT (end_time <= $5 OR start_time >= $4)
        ${extra}
      LIMIT 1
    `,
    params,
  );

  return c.json({ hasConflict: result.rows.length > 0, conflictingAppointments: [] });
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const patientId = String(body.patientId ?? '').trim();
  const date = String(body.date ?? '').trim();
  const startTime = String(body.startTime ?? '').trim();
  const endTime = String(body.endTime ?? '').trim();
  const therapistId = String(body.therapistId ?? user.uid).trim();

  if (!patientId || !date || !startTime || !endTime) {
    return c.json({ error: 'Campos obrigatórios: patientId, date, startTime, endTime' }, 400);
  }

  const result = await pool.query(
    `
      INSERT INTO appointments (
        patient_id,
        therapist_id,
        date,
        start_time,
        end_time,
        type,
        notes,
        status,
        organization_id,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW()
      )
      RETURNING *
    `,
    [
      patientId,
      therapistId,
      date,
      startTime,
      endTime,
      normalizeType(body.type ?? body.session_type),
      body.notes ? String(body.notes) : null,
      normalizeStatus(body.status),
      user.organizationId,
      user.uid,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const current = await pool.query(
    'SELECT * FROM appointments WHERE id = $1 AND organization_id = $2 LIMIT 1',
    [id, user.organizationId],
  );
  if (!current.rows.length) return c.json({ error: 'Agendamento não encontrado' }, 404);
  const a = current.rows[0];

  const nextDate = body.date ?? body.appointment_date ?? a.date;
  const nextStart = body.startTime ?? body.start_time ?? body.appointment_time ?? a.start_time;
  const nextEnd = body.endTime ?? body.end_time ?? a.end_time;
  const nextTherapist = body.therapistId ?? body.therapist_id ?? a.therapist_id ?? user.uid;
  const nextType = normalizeType(body.type ?? body.session_type ?? body.appointment_type ?? a.type);
  const nextStatus = normalizeStatus(body.status ?? a.status);
  const nextNotes = body.notes !== undefined ? body.notes : a.notes;
  const nextReason = body.cancellationReason ?? body.reason ?? a.cancellation_reason ?? null;
  const nextConfirmedAt = body.confirmed_at ?? body.confirmedAt ?? a.confirmed_at ?? null;
  const nextConfirmedVia = body.confirmed_via ?? body.confirmedVia ?? a.confirmed_via ?? null;

  const result = await pool.query(
    `
      UPDATE appointments
      SET
        therapist_id = $1,
        date = $2,
        start_time = $3,
        end_time = $4,
        type = $5,
        status = $6,
        notes = $7,
        cancellation_reason = $8,
        confirmed_at = $9,
        confirmed_via = $10,
        updated_at = NOW()
      WHERE id = $11 AND organization_id = $12
      RETURNING *
    `,
    [
      String(nextTherapist),
      normalizeDateForDb(nextDate),
      String(nextStart),
      String(nextEnd),
      nextType,
      nextStatus,
      nextNotes ? String(nextNotes) : null,
      nextReason ? String(nextReason) : null,
      nextConfirmedAt ? String(nextConfirmedAt) : null,
      nextConfirmedVia ? String(nextConfirmedVia) : null,
      id,
      user.organizationId,
    ],
  );

  return c.json({ data: result.rows[0] });
});

app.post('/:id/cancel', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const reason = body.reason ? String(body.reason) : null;

  const result = await pool.query(
    `
      UPDATE appointments
      SET
        status = 'cancelled',
        cancellation_reason = $1,
        cancelled_at = NOW(),
        cancelled_by = $2,
        updated_at = NOW()
      WHERE id = $3 AND organization_id = $4
      RETURNING id
    `,
    [reason, user.uid, id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Agendamento não encontrado' }, 404);
  return c.json({ success: true });
});

app.get('/last-updated', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const result = await pool.query(
    'SELECT MAX(updated_at)::text AS last_updated_at FROM appointments WHERE organization_id = $1',
    [user.organizationId],
  );
  return c.json({ data: { last_updated_at: result.rows[0]?.last_updated_at ?? null } });
});

export { app as appointmentsRoutes };
