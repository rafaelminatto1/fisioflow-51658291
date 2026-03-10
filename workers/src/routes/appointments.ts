import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

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
    return c.json({ data: result.rows || result });
  } catch (error: any) {
    console.error('[Appointments/List] Error:', error.message);
    return c.json({ data: [] });
  }
});

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
    const status      = body.status ?? 'scheduled';

    if (!patientId) return c.json({ error: 'patient_id é obrigatório' }, 400);
    if (!date)      return c.json({ error: 'date é obrigatório' }, 400);
    if (!startTime) return c.json({ error: 'start_time é obrigatório' }, 400);
    if (!endTime)   return c.json({ error: 'end_time é obrigatório' }, 400);

    const result = await db.query(
      `INSERT INTO appointments (patient_id, therapist_id, date, start_time, end_time, organization_id, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
      [patientId, therapistId, date, startTime, endTime, user.organizationId, status, notes],
    );
    const row = result.rows?.[0] || result[0];
    return c.json({ data: row }, 201);
  } catch (error: any) {
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
    const row = result.rows?.[0] || result[0];
    if (!row) return c.json({ error: 'Agendamento não encontrado' }, 404);
    return c.json({ data: row });
  } catch (error: any) {
    return c.json({ error: 'Erro ao buscar agendamento', details: error.message }, 500);
  }
});

app.patch('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  try {
    const body = (await c.req.json()) as any;
    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (body.date !== undefined)      { fields.push(`date = $${idx++}`);       params.push(body.date); }
    if (body.startTime !== undefined) { fields.push(`start_time = $${idx++}`); params.push(body.startTime); }
    if (body.endTime !== undefined)   { fields.push(`end_time = $${idx++}`);   params.push(body.endTime); }
    if (body.status !== undefined)    { fields.push(`status = $${idx++}`);     params.push(body.status); }
    if (body.notes !== undefined)     { fields.push(`notes = $${idx++}`);      params.push(body.notes); }
    if (!fields.length) return c.json({ error: 'Nenhum campo para atualizar' }, 400);
    fields.push(`updated_at = NOW()`);
    params.push(id, user.organizationId);
    const result = await db.query(
      `UPDATE appointments SET ${fields.join(', ')} WHERE id = $${idx++} AND organization_id = $${idx++} RETURNING *`,
      params,
    );
    const row = result.rows?.[0] || result[0];
    if (!row) return c.json({ error: 'Agendamento não encontrado' }, 404);
    return c.json({ data: row });
  } catch (error: any) {
    return c.json({ error: 'Erro ao atualizar agendamento', details: error.message }, 500);
  }
});

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
    const row = result.rows?.[0] || result[0];
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
    const row = result.rows?.[0] || result[0];
    if (!row) return c.json({ error: 'Agendamento não encontrado' }, 404);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Erro ao excluir agendamento', details: error.message }, 500);
  }
});

export { app as appointmentsRoutes };
