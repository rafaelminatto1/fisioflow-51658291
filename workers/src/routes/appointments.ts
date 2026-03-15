import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';
import { triggerInngestEvent } from '../lib/inngest-client';
import { broadcastToOrg } from '../lib/realtime';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createPool(c.env);
  try {
    const { dateFrom, dateTo, therapistId, patientId, status, limit = '100' } = c.req.query();
    const params: any[] = [user.organizationId];
    let idx = 2;
    let where = `WHERE a.organization_id = $1`;

    if (dateFrom) { params.push(dateFrom); where += ` AND a.date >= $${idx++}`; }
    if (dateTo)   { params.push(dateTo);   where += ` AND a.date <= $${idx++}`; }
    if (therapistId) { params.push(therapistId); where += ` AND a.therapist_id = $${idx++}`; }
    if (patientId)   { params.push(patientId);   where += ` AND a.patient_id = $${idx++}`; }
    if (status)      { params.push(status);      where += ` AND a.status = $${idx++}`; }

    const limitNum = Math.min(1000, Math.max(1, parseInt(limit) || 100));
    params.push(limitNum);

    const result = await db.query(
      `SELECT 
        a.id, a.patient_id, a.therapist_id, a.date, a.start_time, a.end_time, 
        a.status, a.type, a.notes, a.payment_status, a.payment_amount,
        p.full_name AS patient_name, p.phone AS patient_phone
       FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id
       ${where} ORDER BY a.date DESC, a.start_time DESC LIMIT $${idx}`,
      params,
    );
    
    const rows = (result.rows || result) as any[];
    
    // Real-time Sanitization: Ensure consistent time data
    const sanitizedRows = rows.map(row => {
      const startTime = row.start_time && row.start_time !== '' && row.start_time !== 'null' 
        ? row.start_time.substring(0, 5) 
        : '08:00';
      
      const duration = parseInt(row.duration_minutes) || 60;
      
      // Calculate end_time if missing or invalid
      let endTime = row.end_time && row.end_time !== '' && row.end_time !== 'null'
        ? row.end_time.substring(0, 5)
        : calculateEndTime(startTime, duration);

      return {
        ...row,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: duration
      };
    });

    // Aggressive Caching: 60s public, 5 minutes stale-while-revalidate
    c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    c.header('X-Performance-Level', 'High');
    
    return c.json({ data: sanitizedRows });
  } catch (error: any) {
    console.error('[Appointments/List] Error:', error.message);
    return c.json({ data: [] });
  }
});

const STATUS_MAP: Record<string, string> = {
  agendado: 'scheduled',
  confirmado: 'confirmed',
  em_andamento: 'in_progress',
  concluido: 'completed',
  cancelado: 'cancelled',
  avaliacao: 'scheduled',
  atendido: 'completed',
  falta: 'no_show',
  faltou: 'no_show',
  remarcado: 'rescheduled',
  reagendado: 'rescheduled',
  aguardando_confirmacao: 'scheduled',
};

const VALID_STATUSES = new Set([
  'scheduled', 
  'confirmed', 
  'in_progress', 
  'completed', 
  'cancelled', 
  'no_show', 
  'rescheduled'
]);

function normalizeStatus(raw: string | undefined): string {
  if (!raw) return 'scheduled';
  const normalized = raw.toLowerCase().trim();
  if (VALID_STATUSES.has(normalized)) return normalized;
  return STATUS_MAP[normalized] ?? 'scheduled';
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = (hours * 60) + minutes + durationMinutes;
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const endHours = Math.floor(normalizedMinutes / 60);
  const endMinutes = normalizedMinutes % 60;

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

function countsTowardCapacity(status: string): boolean {
  return !['cancelled', 'no_show', 'rescheduled'].includes(status);
}

async function getIntervalCapacity(
  db: ReturnType<typeof createPool>,
  organizationId: string,
  date: string,
  startTime: string,
  endTime: string,
): Promise<number> {
  try {
    const result = await db.query(
      `SELECT MIN(max_patients)::int AS capacity
       FROM schedule_capacity
       WHERE organization_id = $1
         AND day_of_week = EXTRACT(DOW FROM $2::date)
         AND start_time < $4::time
         AND end_time > $3::time`,
      [organizationId, date, startTime, endTime],
    );

    const capacity = Number(result.rows?.[0]?.capacity ?? (result as any)?.[0]?.capacity ?? 1);
    return Number.isFinite(capacity) && capacity > 0 ? capacity : 1;
  } catch (error: any) {
    if (error?.code === '42P01') {
      return 1;
    }
    throw error;
  }
}

async function getOverlappingAppointments(
  db: ReturnType<typeof createPool>,
  organizationId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string,
): Promise<Array<{ id: string; patient_id: string; start_time: string; date: string }>> {
  const params: any[] = [organizationId, date, startTime, endTime];
  let sql = `SELECT id, patient_id, start_time, date
             FROM appointments
             WHERE organization_id = $1
               AND date = $2
               AND status NOT IN ('cancelled', 'no_show', 'rescheduled')
               AND start_time < $4::time
               AND end_time > $3::time`;

  if (excludeAppointmentId) {
    params.push(excludeAppointmentId);
    sql += ` AND id <> $5`;
  }

  sql += ` ORDER BY start_time ASC, created_at ASC`;

  const result = await db.query(sql, params);
  return (result.rows || result || []) as Array<{ id: string; patient_id: string; start_time: string; date: string }>;
}

async function enforceCapacity(
  db: ReturnType<typeof createPool>,
  organizationId: string,
  payload: {
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    ignoreCapacity?: boolean;
    excludeAppointmentId?: string;
  },
) {
  if (payload.ignoreCapacity || !countsTowardCapacity(payload.status)) {
    return null;
  }

  const capacity = await getIntervalCapacity(db, organizationId, payload.date, payload.startTime, payload.endTime);
  const conflicts = await getOverlappingAppointments(
    db,
    organizationId,
    payload.date,
    payload.startTime,
    payload.endTime,
    payload.excludeAppointmentId,
  );

  if (conflicts.length < capacity) {
    return null;
  }

  return {
    error: 'Capacidade do horário excedida para este intervalo.',
    capacity,
    total: conflicts.length + 1,
    conflicts,
  };
}

const isConflictError = (err: any) => 
  err.code === '23P01' || // exclusion_violation
  err.code === '23505' || // unique_violation
  (err.message && (
    err.message.includes('no_overlapping_therapist_appointments') ||
    err.message.includes('duplicate key value violates unique constraint')
  ));

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createPool(c.env);
  try {
    const body = await c.req.json();
    // Accept both camelCase and snake_case
    const patientId   = body.patientId   || body.patient_id;
    const date        = body.date        || body.appointment_date;
    const startTime   = body.startTime   || body.start_time;
    const endTime     = body.endTime     || body.end_time;
    const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
    const rawTherapist = body.therapistId || body.therapist_id || user.uid;
    const therapistId = isUuid(rawTherapist) ? rawTherapist : null;
    const notes       = body.notes ?? null;
    const status      = normalizeStatus(body.status);
    const ignoreCapacity = body.ignoreCapacity === true;

    if (!patientId)    return c.json({ error: 'patient_id é obrigatório' }, 400);
    if (!date)         return c.json({ error: 'date é obrigatório' }, 400);
    if (!startTime)    return c.json({ error: 'start_time é obrigatório' }, 400);
    if (!endTime)      return c.json({ error: 'end_time é obrigatório' }, 400);
    if (!therapistId)  return c.json({ error: 'therapist_id inválido — user.uid não é UUID' }, 400);

    const capacityError = await enforceCapacity(db, user.organizationId, {
      date,
      startTime,
      endTime,
      status,
      ignoreCapacity,
    });
    if (capacityError) {
      return c.json(capacityError, 409);
    }

    const result = await db.query(
      `INSERT INTO appointments (patient_id, therapist_id, date, start_time, end_time, organization_id, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
      [patientId, therapistId, date, startTime, endTime, user.organizationId, status, notes],
    );
    const row = (result.rows?.[0] || (result as any)[0]) as any;
    
    // Real-time Broadcast
    await broadcastToOrg(c.env, user.organizationId, {
      type: 'APPOINTMENT_UPDATED',
      payload: { id: row.id, action: 'created', timestamp: new Date().toISOString() }
    });
    
    // Busca dados do paciente para o lembrete
    const patientResult = await db.query('SELECT full_name, phone FROM patients WHERE id = $1', [patientId]);
    const patient = (patientResult.rows?.[0] || (patientResult as any)[0]) as any;

    try {
      triggerInngestEvent(c.env, c.executionCtx, 'appointment.created', {
        appointmentId: row.id,
        patientId: row.patient_id,
        name: patient?.full_name,
        phone: patient?.phone,
        date: row.date,
        startTime: row.start_time,
        status: row.status,
      }, { id: user.uid });
    } catch (eventError: any) {
      console.error('[Appointments/Create] Failed to trigger event:', eventError?.message ?? eventError);
    }

    return c.json({ data: row }, 201);
  } catch (error: any) {
    if (isConflictError(error)) {
      return c.json({ error: 'Conflito de horário: o terapeuta já possui um agendamento neste período.' }, 409);
    }
    console.error('[Appointments/Create] Error:', error.message);
    return c.json({ error: 'Erro ao criar agendamento', details: error.message }, 500);
  }
});

app.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const result = await db.query(
      `SELECT a.*, p.full_name AS patient_name FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id
       WHERE a.id = $1 AND a.organization_id = $2 LIMIT 1`,
      [id, user.organizationId],
    );
    const row = result.rows?.[0] || (result as any)[0];
    if (!row) return c.json({ error: 'Agendamento não encontrado' }, 404);
    return c.json({ data: row });
  } catch (error: any) {
    return c.json({ error: 'Erro ao buscar agendamento', details: error.message }, 500);
  }
});

const updateAppointmentHandler = async (c: any) => {
  const user = c.get('user');
  const db = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const body = (await c.req.json()) as any;
    const currentResult = await db.query(
      `SELECT id, date, start_time, end_time, duration_minutes, status
       FROM appointments
       WHERE id = $1 AND organization_id = $2
       LIMIT 1`,
      [id, user.organizationId],
    );
    const current = (currentResult.rows?.[0] || (currentResult as any)[0]) as any;
    if (!current) return c.json({ error: 'Agendamento não encontrado' }, 404);

    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const date = body.date ?? body.appointment_date;
    const startTime = body.startTime ?? body.start_time ?? body.appointment_time;
    const explicitEndTime = body.endTime ?? body.end_time;
    const status = body.status;
    const notes = body.notes;
    const therapistId = body.therapist_id ?? body.therapistId;
    const rawDuration = body.duration ?? body.duration_minutes;
    const type = body.type;
    const room = body.room ?? body.room_id;
    const paymentStatus = body.payment_status ?? body.paymentStatus;
    const paymentAmount = body.payment_amount ?? body.paymentAmount;
    const ignoreCapacity = body.ignoreCapacity === true;

    const isUuid = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
    const parsedDuration = rawDuration !== undefined ? parseInt(String(rawDuration), 10) : undefined;
    const normalizedStatus = status !== undefined ? normalizeStatus(status) : String(current.status ?? 'scheduled');

    if (parsedDuration !== undefined && (!Number.isFinite(parsedDuration) || parsedDuration <= 0)) {
      return c.json({ error: 'duration inválida' }, 400);
    }

    const effectiveDate = date ?? current.date;
    const effectiveStartTime = startTime ?? current.start_time;
    const effectiveDuration = parsedDuration ?? Number(current.duration_minutes ?? 60);
    const endTime = explicitEndTime ?? (
      (startTime !== undefined || parsedDuration !== undefined)
        ? calculateEndTime(effectiveStartTime, effectiveDuration)
        : undefined
    );

    const effectiveEndTime = endTime ?? current.end_time;
    const shouldRecheckCapacity =
      !ignoreCapacity &&
      (
        date !== undefined ||
        startTime !== undefined ||
        parsedDuration !== undefined ||
        explicitEndTime !== undefined ||
        (status !== undefined && countsTowardCapacity(normalizedStatus))
      );

    if (shouldRecheckCapacity) {
      const capacityError = await enforceCapacity(db, user.organizationId, {
        date: effectiveDate,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        status: normalizedStatus,
        ignoreCapacity,
        excludeAppointmentId: id,
      });
      if (capacityError) {
        return c.json(capacityError, 409);
      }
    }

    if (date !== undefined)        { fields.push(`date = $${idx++}`);       params.push(date); }
    if (startTime !== undefined)   { fields.push(`start_time = $${idx++}`); params.push(startTime); }
    if (endTime !== undefined)     { fields.push(`end_time = $${idx++}`);   params.push(endTime); }
    if (status !== undefined)      { fields.push(`status = $${idx++}`);     params.push(normalizedStatus); }
    if (notes !== undefined)       { fields.push(`notes = $${idx++}`);      params.push(notes); }
    
    if (therapistId !== undefined) { 
      if (therapistId && !isUuid(therapistId)) {
        return c.json({ error: 'therapist_id inválido' }, 400);
      }
      fields.push(`therapist_id = $${idx++}`); 
      params.push(therapistId || null); 
    }
    
    if (parsedDuration !== undefined) { fields.push(`duration_minutes = $${idx++}`); params.push(parsedDuration); }
    if (type !== undefined)        { fields.push(`type = $${idx++}`);       params.push(type); }
    if (room !== undefined)        { fields.push(`room_id = $${idx++}`);    params.push(isUuid(room) ? room : null); }
    if (paymentStatus !== undefined) { fields.push(`payment_status = $${idx++}`); params.push(paymentStatus); }
    if (paymentAmount !== undefined) { fields.push(`payment_amount = $${idx++}`); params.push(paymentAmount); }

    if (!fields.length) return c.json({ error: 'Nenhum campo para atualizar' }, 400);
    fields.push(`updated_at = NOW()`);
    params.push(id, user.organizationId);
    
    const result = await db.query(
      `UPDATE appointments SET ${fields.join(', ')} WHERE id = $${idx++} AND organization_id = $${idx++} RETURNING *`,
      params,
    );
    const row = (result.rows?.[0] || (result as any)[0]) as any;
    if (!row) return c.json({ error: 'Agendamento não encontrado' }, 404);

    // Real-time Broadcast
    await broadcastToOrg(c.env, user.organizationId, {
      type: 'APPOINTMENT_UPDATED',
      payload: { id: row.id, action: 'updated', timestamp: new Date().toISOString() }
    });

    // Eventos Inngest baseados em mudança de status
    try {
      if (row.status === 'completed') {
        // Busca dados do paciente para o feedback
        const pRes = await db.query('SELECT full_name, phone FROM patients WHERE id = $1', [row.patient_id]);
        const p = (pRes.rows?.[0] || (pRes as any)[0]) as any;

        triggerInngestEvent(c.env, c.executionCtx, 'appointment.completed', {
          appointmentId: row.id,
          patientId: row.patient_id,
          name: p?.full_name,
          phone: p?.phone
        }, { id: user.uid });
      } else {
        triggerInngestEvent(c.env, c.executionCtx, 'appointment.updated', {
          appointmentId: row.id,
          patientId: row.patient_id,
          date: row.date,
          startTime: row.start_time,
          status: row.status,
        }, { id: user.uid });
      }
    } catch (eventError: any) {
      console.error('[Appointments/Update] Failed to trigger event:', eventError?.message ?? eventError);
    }

    return c.json({ data: row });
  } catch (error: any) {
    console.error('[Appointments/Update] Critical Error:', error.message, error.stack);
    if (isConflictError(error)) {
      return c.json({ error: 'Conflito de horário: o terapeuta já possui um agendamento neste período.' }, 409);
    }
    return c.json({ error: 'Erro ao atualizar agendamento', details: error.message }, 500);
  }
};

app.patch('/:id', requireAuth, updateAppointmentHandler as any);
app.put('/:id', requireAuth, updateAppointmentHandler as any);

app.post('/:id/cancel', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await db.query(
      `UPDATE appointments SET status = 'cancelled', cancellation_reason = $1, cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND organization_id = $3 RETURNING id`,
      [body.reason ?? null, id, user.organizationId],
    );
    const row = result.rows?.[0] || (result as any)[0];
    if (!row) return c.json({ error: 'Agendamento não encontrado' }, 404);

    // Real-time Broadcast
    await broadcastToOrg(c.env, user.organizationId, {
      type: 'APPOINTMENT_UPDATED',
      payload: { id, action: 'cancelled', timestamp: new Date().toISOString() }
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Erro ao cancelar agendamento', details: error.message }, 500);
  }
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const result = await db.query(
      `DELETE FROM appointments WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [id, user.organizationId],
    );
    const row = result.rows?.[0] || (result as any)[0];
    if (!row) return c.json({ error: 'Agendamento não encontrado' }, 404);

    // Real-time Broadcast
    await broadcastToOrg(c.env, user.organizationId, {
      type: 'APPOINTMENT_UPDATED',
      payload: { id, action: 'deleted', timestamp: new Date().toISOString() }
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Erro ao excluir agendamento', details: error.message }, 500);
  }
});

export { app as appointmentsRoutes };
