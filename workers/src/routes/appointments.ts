import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  try {
    const { dateFrom } = c.req.query();
    let query = `SELECT a.*, p.full_name AS patient_name
                 FROM appointments a
                 LEFT JOIN patients p ON p.id = a.patient_id
                 WHERE a.organization_id = $1`;
    const params: any[] = [user.organizationId];
    if (dateFrom) { params.push(dateFrom); query += ` AND a.date >= $2`; }
    query += ` ORDER BY a.date, a.start_time LIMIT 100`;
    const result = await db.query(query, params);
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
    const result = await db.query(
      `INSERT INTO appointments (patient_id, date, start_time, end_time, organization_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
      [body.patientId, body.date, body.startTime, body.endTime, user.organizationId],
    );
    const row = result.rows?.[0] || result[0];
    return c.json({ data: row }, 201);
  } catch (error: any) {
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
