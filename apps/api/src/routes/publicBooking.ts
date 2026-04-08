import { Hono } from 'hono';
import { createPool } from '../lib/db';
import type { Env } from '../types/env';
import { turnstileVerify } from '../middleware/turnstile';

const app = new Hono<{ Bindings: Env }>();

// Proteção anti-bot em todas as rotas de agendamento público
app.use('*', turnstileVerify);

async function hasTable(pool: ReturnType<typeof createPool>, tableName: string): Promise<boolean> {
  const result = await pool.query(`SELECT to_regclass($1)::text AS table_name`, [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
}

async function hasColumn(
  pool: ReturnType<typeof createPool>,
  table: string,
  column: string,
): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `,
    [table, column],
  );
  return result.rows.length > 0;
}

app.get('/booking/:slug', async (c) => {
  const pool = await createPool(c.env);
  const { slug } = c.req.param();
  if (!(await hasTable(pool, 'profiles'))) return c.json({ error: 'Perfis públicos indisponíveis' }, 404);

  const hasSpecialty = await hasColumn(pool, 'profiles', 'specialty');
  const hasAvatarUrl = await hasColumn(pool, 'profiles', 'avatar_url');
  const hasBio = await hasColumn(pool, 'profiles', 'bio');
  const hasIsActive = await hasColumn(pool, 'profiles', 'is_active');

  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        full_name,
        slug,
        organization_id,
        ${hasSpecialty ? 'specialty,' : 'NULL::text AS specialty,'}
        ${hasAvatarUrl ? 'avatar_url,' : 'NULL::text AS avatar_url,'}
        ${hasBio ? 'bio' : 'NULL::text AS bio'}
      FROM profiles
      WHERE slug = $1
      ${hasIsActive ? 'AND is_active = true' : ''}
      LIMIT 1
    `,
    [slug],
  );

  if (!result.rows.length) return c.json({ error: 'Perfil não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.post('/booking', async (c) => {
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;
  const slug = String(body.slug ?? '').trim();
  const requestedDate = String(body.date ?? '').slice(0, 10);
  const requestedTime = String(body.time ?? '').trim();
  const patient = (body.patient && typeof body.patient === 'object' ? body.patient : {}) as Record<string, unknown>;

  if (!slug || !requestedDate || !requestedTime) {
    return c.json({ error: 'slug, date e time são obrigatórios' }, 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || isNaN(Date.parse(requestedDate))) {
    return c.json({ error: 'date deve estar no formato YYYY-MM-DD' }, 400);
  }
  if (!/^\d{2}:\d{2}$/.test(requestedTime)) {
    return c.json({ error: 'time deve estar no formato HH:MM' }, 400);
  }
  if (!patient.name || !String(patient.name).trim() || !patient.phone || !String(patient.phone).trim()) {
    return c.json({ error: 'Nome e telefone são obrigatórios' }, 400);
  }

  if (!(await hasTable(pool, 'profiles'))) return c.json({ error: 'Perfis públicos indisponíveis' }, 404);
  if (!(await hasTable(pool, 'public_booking_requests'))) {
    return c.json({ error: 'Agendamento público indisponível' }, 501);
  }

  const profileResult = await pool.query(
    `
      SELECT id, user_id, organization_id, full_name, slug
      FROM profiles
      WHERE slug = $1
      LIMIT 1
    `,
    [slug],
  );

  if (!profileResult.rows.length) return c.json({ error: 'Perfil não encontrado' }, 404);
  const profile = profileResult.rows[0] as Record<string, unknown>;

  const insert = await pool.query(
    `
      INSERT INTO public_booking_requests (
        organization_id,
        profile_id,
        profile_user_id,
        slug,
        professional_name,
        requested_date,
        requested_time,
        patient_name,
        patient_phone,
        patient_email,
        notes,
        status,
        created_at,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',NOW(),NOW())
      RETURNING id, status, created_at
    `,
    [
      profile.organization_id ?? null,
      profile.id ?? null,
      profile.user_id ?? null,
      slug,
      profile.full_name ?? null,
      requestedDate,
      requestedTime,
      String(patient.name),
      String(patient.phone),
      patient.email ? String(patient.email) : null,
      patient.notes ? String(patient.notes) : null,
    ],
  );

  return c.json({ data: insert.rows[0], success: true }, 201);
});

export { app as publicBookingRoutes };
