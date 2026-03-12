import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';
import { triggerInngestEvent } from '../lib/inngest-client';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
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
      `SELECT a.*, p.full_name AS patient_name
       FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id
       ${where} ORDER BY a.date, a.start_time LIMIT $${idx}`,
      params,
    );
    
    // Cloudflare Edge Caching - cache list for 60 seconds
    c.header('Cache-Control', 'public, max-age=60');
    
    return c.json({ data: result.rows || result });
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

const isConflictError = (err: any) => 
  err.code === '23P01' || // exclusion_violation
  err.code === '23505' || // unique_violation
  (err.message && (
    err.message.includes('no_overlapping_therapist_appointments') ||
    err.message.includes('duplicate key value violates unique constraint')
  ));

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
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

    if (!patientId)    return c.json({ error: 'patient_id é obrigatório' }, 400);
    if (!date)         return c.json({ error: 'date é obrigatório' }, 400);
    if (!startTime)    return c.json({ error: 'start_time é obrigatório' }, 400);
    if (!endTime)      return c.json({ error: 'end_time é obrigatório' }, 400);
    if (!therapistId)  return c.json({ error: 'therapist_id inválido — user.uid não é UUID' }, 400);

    const result = await db.query(
      `INSERT INTO appointments (patient_id, therapist_id, date, start_time, end_time, organization_id, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
      [patientId, therapistId, date, startTime, endTime, user.organizationId, status, notes],
    );
    const row = (result.rows?.[0] || (result as any)[0]) as any;
    
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
  const db = createPool(c.env);
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
  const db = createPool(c.env);
  const { id } = c.req.param();
  try {
    const body = (await c.req.json()) as any;
    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const date = body.date ?? body.appointment_date;
    const startTime = body.startTime ?? body.start_time ?? body.appointment_time;
    const endTime = body.endTime ?? body.end_time;
    const status = body.status;
    const notes = body.notes;
    const therapistId = body.therapist_id ?? body.therapistId;
    const duration = body.duration ?? body.duration_minutes;
    const type = body.type;
    const room = body.room ?? body.room_id;
    const paymentStatus = body.payment_status ?? body.paymentStatus;
    const paymentAmount = body.payment_amount ?? body.paymentAmount;

    const isUuid = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

    if (date !== undefined)        { fields.push(`date = $${idx++}`);       params.push(date); }
    if (startTime !== undefined)   { fields.push(`start_time = $${idx++}`); params.push(startTime); }
    if (endTime !== undefined)     { fields.push(`end_time = $${idx++}`);   params.push(endTime); }
    if (status !== undefined)      { fields.push(`status = $${idx++}`);     params.push(normalizeStatus(status)); }
    if (notes !== undefined)       { fields.push(`notes = $${idx++}`);      params.push(notes); }
    
    if (therapistId !== undefined) { 
      if (therapistId && !isUuid(therapistId)) {
        return c.json({ error: 'therapist_id inválido' }, 400);
      }
      fields.push(`therapist_id = $${idx++}`); 
      params.push(therapistId || null); 
    }
    
    if (duration !== undefined)    { fields.push(`duration_minutes = $${idx++}`); params.push(parseInt(String(duration)) || 60); }
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

    try {
      triggerInngestEvent(c.env, c.executionCtx, 'appointment.updated', {
        appointmentId: row.id,
        patientId: row.patient_id,
        date: row.date,
        startTime: row.start_time,
        status: row.status,
      }, { id: user.uid });
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
  const db = createPool(c.env);
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
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Erro ao cancelar agendamento', details: error.message }, 500);
  }
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  try {
    const result = await db.query(
      `DELETE FROM appointments WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [id, user.organizationId],
    );
    const row = result.rows?.[0] || (result as any)[0];
    if (!row) return c.json({ error: 'Agendamento não encontrado' }, 404);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Erro ao excluir agendamento', details: error.message }, 500);
  }
});

export { app as appointmentsRoutes };
