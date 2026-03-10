import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { getRawSql } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const sql = getRawSql(c.env);
  
  try {
    const { dateFrom } = c.req.query();
    
    let query = `SELECT a.*, p.full_name AS patient_name 
                 FROM appointments a 
                 LEFT JOIN patients p ON p.id = a.patient_id 
                 WHERE a.organization_id = $1`;
    const params: any[] = [user.organizationId];

    if (dateFrom) {
      params.push(dateFrom);
      query += ` AND a.date >= $2`;
    }

    query += ` ORDER BY a.date, a.start_time LIMIT 100`;

    const result = await sql(query, params);
    return c.json({ data: result });
  } catch (error: any) {
    console.error('[Appointments/List] Error:', error.message);
    return c.json({ data: [] });
  }
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const sql = getRawSql(c.env);
  try {
    const body = await c.req.json();
    const result = await sql(
      `INSERT INTO appointments (patient_id, date, start_time, end_time, organization_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
      [body.patientId, body.date, body.startTime, body.endTime, user.organizationId]
    );
    return c.json({ data: result[0] }, 201);
  } catch (error: any) {
    return c.json({ error: 'Erro ao criar agendamento', details: error.message }, 500);
  }
});

export { app as appointmentsRoutes };
