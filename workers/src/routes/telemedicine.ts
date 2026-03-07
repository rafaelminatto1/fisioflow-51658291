import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function hasTable(pool: ReturnType<typeof createPool>, tableName: string): Promise<boolean> {
  const result = await pool.query(`SELECT to_regclass($1)::text AS table_name`, [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
}

app.get('/rooms', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);

  if (!(await hasTable(pool, 'telemedicine_rooms'))) {
    return c.json({ data: [] });
  }

  const result = await pool.query(
    `
      SELECT
        tr.*,
        json_build_object('name', p.full_name, 'email', p.email, 'phone', p.phone) AS patients,
        json_build_object('full_name', prof.full_name) AS profiles
      FROM telemedicine_rooms tr
      LEFT JOIN patients p ON p.id = tr.patient_id
      LEFT JOIN profiles prof ON prof.id = tr.therapist_id
      WHERE tr.organization_id = $1
      ORDER BY tr.created_at DESC
    `,
    [user.organizationId],
  );

  return c.json({ data: result.rows });
});

app.post('/rooms', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.patient_id) return c.json({ error: 'patient_id é obrigatório' }, 400);

  const roomCode = String(body.room_code ?? crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase());

  const result = await pool.query(
    `
      INSERT INTO telemedicine_rooms (
        organization_id, patient_id, therapist_id, appointment_id, room_code, status,
        scheduled_at, started_at, ended_at, duration_minutes, recording_url, notas, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      body.patient_id,
      body.therapist_id ?? user.uid,
      body.appointment_id ?? null,
      roomCode,
      body.status ?? 'aguardando',
      body.scheduled_at ?? null,
      body.started_at ?? null,
      body.ended_at ?? null,
      body.duration_minutes != null ? Number(body.duration_minutes) : null,
      body.recording_url ?? null,
      body.notas ?? null,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/rooms/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.status !== undefined) { params.push(body.status); sets.push(`status = $${params.length}`); }
  if (body.scheduled_at !== undefined) { params.push(body.scheduled_at); sets.push(`scheduled_at = $${params.length}`); }
  if (body.started_at !== undefined) { params.push(body.started_at); sets.push(`started_at = $${params.length}`); }
  if (body.ended_at !== undefined) { params.push(body.ended_at); sets.push(`ended_at = $${params.length}`); }
  if (body.duration_minutes !== undefined) { params.push(body.duration_minutes != null ? Number(body.duration_minutes) : null); sets.push(`duration_minutes = $${params.length}`); }
  if (body.recording_url !== undefined) { params.push(body.recording_url); sets.push(`recording_url = $${params.length}`); }
  if (body.notas !== undefined) { params.push(body.notas); sets.push(`notas = $${params.length}`); }
  if (body.appointment_id !== undefined) { params.push(body.appointment_id); sets.push(`appointment_id = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `
      UPDATE telemedicine_rooms
      SET ${sets.join(', ')}
      WHERE id = $${params.length - 1} AND organization_id = $${params.length}
      RETURNING *
    `,
    params,
  );

  if (!result.rows.length) return c.json({ error: 'Sala não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

export { app as telemedicineRoutes };
