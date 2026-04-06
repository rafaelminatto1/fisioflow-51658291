import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function hasDoctorsTable(env: Env): Promise<boolean> {
  const pool = createPool(env);
  try {
    const result = await pool.query("SELECT to_regclass('public.doctors')::text AS table_name");
    return Boolean(result.rows[0]?.table_name);
  } finally {
    await pool.end();
  }
}

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const { search, q, limit = '50', offset = '0' } = c.req.query();
  const searchTerm = (search ?? q ?? '').trim();
  const limitNum = Math.min(1000, Math.max(1, Number.parseInt(limit, 10) || 50));
  const offsetNum = Math.max(0, Number.parseInt(offset, 10) || 0);

  await ensureDoctorsTable(c.env);

  const pool = await createPool(c.env);
  try {
    const params: Array<string | number> = [user.organizationId];
    let where = 'WHERE organization_id = $1 AND is_active = true';

    if (searchTerm) {
      params.push(`%${searchTerm}%`);
      where += ` AND (name ILIKE $${params.length} OR specialty ILIKE $${params.length} OR crm ILIKE $${params.length})`;
    }

    const dataParams = [...params, limitNum, offsetNum];
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `
        SELECT
          id,
          name,
          specialty,
          crm,
          crm_state,
          phone,
          email,
          clinic_name,
          clinic_address,
          clinic_phone,
          notes,
          is_active,
          created_at,
          updated_at
        FROM doctors
        ${where}
        ORDER BY name ASC
        LIMIT $${dataParams.length - 1}
        OFFSET $${dataParams.length}
        `,
        dataParams,
      ),
      pool.query(`SELECT COUNT(*)::int AS total FROM doctors ${where}`, params),
    ]);

    return c.json({
      data: dataRes.rows,
      total: countRes.rows[0]?.total ?? 0,
      page: Math.floor(offsetNum / limitNum) + 1,
      perPage: limitNum,
    });
  } finally {
    await pool.end();
  }
});

app.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  await ensureDoctorsTable(c.env);

  const pool = await createPool(c.env);
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        specialty,
        crm,
        crm_state,
        phone,
        email,
        clinic_name,
        clinic_address,
        clinic_phone,
        notes,
        is_active,
        created_at,
        updated_at
      FROM doctors
      WHERE id = $1 AND organization_id = $2
      LIMIT 1
      `,
      [id, user.organizationId],
    );
    if (!result.rows.length) return c.json({ error: 'Médico não encontrado' }, 404);
    return c.json({ data: result.rows[0] });
  } finally {
    await pool.end();
  }
});

async function ensureDoctorsTable(env: Env): Promise<void> {
  const pool = await createPool(env);
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        name TEXT NOT NULL,
        specialty TEXT,
        crm TEXT,
        crm_state TEXT,
        phone TEXT,
        email TEXT,
        clinic_name TEXT,
        clinic_address TEXT,
        clinic_phone TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
  } finally {
    await pool.end();
  }
}

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = (await c.req.json()) as Record<string, unknown>;
  const name = String(body.name ?? '').trim();

  if (!name) return c.json({ error: 'Nome é obrigatório' }, 400);
  
  await ensureDoctorsTable(c.env);

  const pool = await createPool(c.env);
  try {
    const result = await pool.query(
      `
      INSERT INTO doctors (
        organization_id,
        name,
        specialty,
        crm,
        crm_state,
        phone,
        email,
        clinic_name,
        clinic_address,
        clinic_phone,
        notes,
        is_active,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,$12,NOW(),NOW()
      )
      RETURNING
        id,
        name,
        specialty,
        crm,
        crm_state,
        phone,
        email,
        clinic_name,
        clinic_address,
        clinic_phone,
        notes,
        is_active,
        created_by,
        created_at,
        updated_at
      `,
      [
        user.organizationId,
        name,
        body.specialty ? String(body.specialty) : null,
        body.crm ? String(body.crm) : null,
        body.crm_state ? String(body.crm_state) : null,
        body.phone ? String(body.phone) : null,
        body.email ? String(body.email) : null,
        body.clinic_name ? String(body.clinic_name) : null,
        body.clinic_address ? String(body.clinic_address) : null,
        body.clinic_phone ? String(body.clinic_phone) : null,
        body.notes ? String(body.notes) : null,
        user.uid,
      ],
    );
    return c.json({ data: result.rows[0] }, 201);
  } finally {
    await pool.end();
  }
});

app.put('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  await ensureDoctorsTable(c.env);

  const pool = await createPool(c.env);
  try {
    const current = await pool.query(
      'SELECT * FROM doctors WHERE id = $1 AND organization_id = $2 LIMIT 1',
      [id, user.organizationId],
    );
    if (!current.rows.length) return c.json({ error: 'Médico não encontrado' }, 404);
    const d = current.rows[0];

    const result = await pool.query(
      `
      UPDATE doctors
      SET
        name = $1,
        specialty = $2,
        crm = $3,
        crm_state = $4,
        phone = $5,
        email = $6,
        clinic_name = $7,
        clinic_address = $8,
        clinic_phone = $9,
        notes = $10,
        is_active = $11,
        updated_at = NOW()
      WHERE id = $12 AND organization_id = $13
      RETURNING
        id,
        name,
        specialty,
        crm,
        crm_state,
        phone,
        email,
        clinic_name,
        clinic_address,
        clinic_phone,
        notes,
        is_active,
        created_at,
        updated_at
      `,
      [
        body.name !== undefined ? String(body.name) : d.name,
        body.specialty !== undefined ? (body.specialty ? String(body.specialty) : null) : d.specialty,
        body.crm !== undefined ? (body.crm ? String(body.crm) : null) : d.crm,
        body.crm_state !== undefined ? (body.crm_state ? String(body.crm_state) : null) : d.crm_state,
        body.phone !== undefined ? (body.phone ? String(body.phone) : null) : d.phone,
        body.email !== undefined ? (body.email ? String(body.email) : null) : d.email,
        body.clinic_name !== undefined ? (body.clinic_name ? String(body.clinic_name) : null) : d.clinic_name,
        body.clinic_address !== undefined ? (body.clinic_address ? String(body.clinic_address) : null) : d.clinic_address,
        body.clinic_phone !== undefined ? (body.clinic_phone ? String(body.clinic_phone) : null) : d.clinic_phone,
        body.notes !== undefined ? (body.notes ? String(body.notes) : null) : d.notes,
        body.is_active !== undefined ? Boolean(body.is_active) : d.is_active,
        id,
        user.organizationId,
      ],
    );

    return c.json({ data: result.rows[0] });
  } finally {
    await pool.end();
  }
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  await ensureDoctorsTable(c.env);

  const pool = await createPool(c.env);
  try {
    const result = await pool.query(
      `
      UPDATE doctors
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING id
      `,
      [id, user.organizationId],
    );
    if (!result.rows.length) return c.json({ error: 'Médico não encontrado' }, 404);
    return c.json({ success: true });
  } finally {
    await pool.end();
  }
});

export { app as doctorsRoutes };
