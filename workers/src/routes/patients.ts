import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

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

function normalizeGender(value: unknown): 'M' | 'F' | 'O' | null {
  if (value == null) return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'm' || raw === 'masculino' || raw === 'male') return 'M';
  if (raw === 'f' || raw === 'feminino' || raw === 'female') return 'F';
  if (raw === 'o' || raw === 'outro' || raw === 'other' || raw === 'nao_informado') return 'O';
  return null;
}

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);

  const {
    status,
    search,
    createdFrom,
    createdTo,
    incompleteRegistration,
    sortBy,
    limit = '50',
    offset = '0',
  } = c.req.query();
  const limitNum = Math.min(1000, Math.max(1, Number.parseInt(limit, 10) || 50));
  const offsetNum = Math.max(0, Number.parseInt(offset, 10) || 0);

  const hasIncompleteRegistration = await hasColumn(pool, 'patients', 'incomplete_registration');

  const params: Array<string | number | boolean> = [user.organizationId];
  let where = 'WHERE organization_id = $1 AND is_active = true';

  if (status) {
    params.push(status);
    where += ` AND status = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (full_name ILIKE $${params.length} OR cpf ILIKE $${params.length} OR email ILIKE $${params.length})`;
  }

  if (createdFrom) {
    params.push(createdFrom);
    where += ` AND created_at >= $${params.length}`;
  }

  if (createdTo) {
    params.push(createdTo);
    where += ` AND created_at <= $${params.length}`;
  }

  if (incompleteRegistration !== undefined) {
    const shouldBeIncomplete = incompleteRegistration === 'true' || incompleteRegistration === '1';
    if (hasIncompleteRegistration) {
      params.push(shouldBeIncomplete);
      where += ` AND incomplete_registration = $${params.length}`;
    } else if (shouldBeIncomplete) {
      where += ' AND 1 = 0';
    }
  }

  const orderByClause =
    sortBy === 'created_at_desc'
      ? 'created_at DESC'
      : sortBy === 'created_at_asc'
        ? 'created_at ASC'
        : 'full_name ASC';

  const incompleteSelect = hasIncompleteRegistration
    ? 'COALESCE(incomplete_registration, false) AS incomplete_registration'
    : 'false AS incomplete_registration';

  const dataParams = [...params, limitNum, offsetNum];
  const dataQuery = `
    SELECT
      id,
      full_name AS name,
      full_name,
      cpf,
      email,
      phone,
      birth_date,
      gender,
      main_condition,
      status,
      progress,
      ${incompleteSelect},
      is_active,
      created_at,
      updated_at
    FROM patients
    ${where}
    ORDER BY ${orderByClause}
    LIMIT $${dataParams.length - 1}
    OFFSET $${dataParams.length}
  `;

  const countQuery = `SELECT COUNT(*)::int AS total FROM patients ${where}`;
  const [dataRes, countRes] = await Promise.all([
    pool.query(dataQuery, dataParams),
    pool.query(countQuery, params),
  ]);

  return c.json({
    data: dataRes.rows,
    total: countRes.rows[0]?.total ?? 0,
    page: Math.floor(offsetNum / limitNum) + 1,
    perPage: limitNum,
  });
});

app.get('/:id/surgeries', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();

  const result = await pool.query(
    `
      SELECT
        s.id,
        s.name,
        s.surgery_date,
        s.surgeon,
        s.hospital,
        s.post_op_protocol,
        s.notes,
        s.created_at
        , p.id AS patient_id
      FROM surgeries s
      JOIN medical_records mr ON mr.id = s.medical_record_id
      JOIN patients p ON p.id = mr.patient_id
      WHERE p.id = $1 AND p.organization_id = $2
      ORDER BY s.surgery_date DESC NULLS LAST, s.created_at DESC
    `,
    [patientId, user.organizationId],
  );

  return c.json({ data: result.rows });
});

app.get('/:id/pathologies', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();

  const result = await pool.query(
    `
      SELECT
        pth.id,
        pth.name,
        pth.icd_code,
        pth.status,
        pth.diagnosed_at,
        pth.treated_at,
        pth.notes,
        pth.created_at
        , p.id AS patient_id
      FROM pathologies pth
      JOIN medical_records mr ON mr.id = pth.medical_record_id
      JOIN patients p ON p.id = mr.patient_id
      WHERE p.id = $1 AND p.organization_id = $2
      ORDER BY pth.created_at DESC
    `,
    [patientId, user.organizationId],
  );

  return c.json({ data: result.rows });
});

app.get('/:id/medical-returns', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();

  const result = await pool.query(
    `
      SELECT
        id,
        patient_id,
        doctor_name,
        doctor_phone,
        return_date,
        return_period,
        notes,
        report_done,
        report_sent,
        created_at,
        updated_at
      FROM patient_medical_returns
      WHERE patient_id = $1 AND organization_id = $2
      ORDER BY return_date DESC NULLS LAST, created_at DESC
    `,
    [patientId, user.organizationId],
  );

  return c.json({ data: result.rows });
});

app.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    `
      SELECT
        id,
        full_name AS name,
        cpf,
        email,
        phone,
        birth_date,
        gender,
        main_condition,
        status,
        progress,
        is_active,
        created_at,
        updated_at
      FROM patients
      WHERE id = $1 AND organization_id = $2
      LIMIT 1
    `,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Paciente não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.get('/:id/stats', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const [patientRes, statsRes] = await Promise.all([
    pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2 LIMIT 1', [id, user.organizationId]),
    pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed')::int AS total_sessions,
        COUNT(*) FILTER (WHERE date >= CURRENT_DATE AND status IN ('scheduled', 'confirmed'))::int AS upcoming_appointments,
        MAX(date)::text AS last_visit
      FROM appointments
      WHERE patient_id = $1 AND organization_id = $2
      `,
      [id, user.organizationId],
    ),
  ]);

  if (!patientRes.rows.length) return c.json({ error: 'Paciente não encontrado' }, 404);
  const row = statsRes.rows[0] ?? {};
  return c.json({
    data: {
      totalSessions: row.total_sessions ?? 0,
      upcomingAppointments: row.upcoming_appointments ?? 0,
      lastVisit: row.last_visit ?? undefined,
    },
  });
});

app.get('/last-updated', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const result = await pool.query(
    'SELECT MAX(updated_at)::text AS last_updated_at FROM patients WHERE organization_id = $1',
    [user.organizationId],
  );
  return c.json({ data: { last_updated_at: result.rows[0]?.last_updated_at ?? null } });
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const name = String(body.name ?? body.full_name ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  if (!name) return c.json({ error: 'Nome é obrigatório' }, 400);

  const result = await pool.query(
    `
      INSERT INTO patients (
        organization_id,
        full_name,
        cpf,
        email,
        phone,
        birth_date,
        gender,
        main_condition,
        status,
        progress,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,NOW(),NOW()
      )
      RETURNING
        id,
        full_name AS name,
        cpf,
        email,
        phone,
        birth_date,
        gender,
        main_condition,
        status,
        progress,
        is_active,
        created_at,
        updated_at
    `,
    [
      user.organizationId,
      name,
      body.cpf ? String(body.cpf) : null,
      body.email ? String(body.email) : null,
      phone ? phone : null,
      body.birth_date ? String(body.birth_date) : null,
      normalizeGender(body.gender),
      body.main_condition ? String(body.main_condition) : null,
      body.status ? String(body.status) : 'Inicial',
      Number.isFinite(Number(body.progress)) ? Number(body.progress) : 0,
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
    'SELECT id, full_name, cpf, email, phone, birth_date, gender, main_condition, status, progress, is_active FROM patients WHERE id = $1 AND organization_id = $2 LIMIT 1',
    [id, user.organizationId],
  );
  if (!current.rows.length) return c.json({ error: 'Paciente não encontrado' }, 404);
  const p = current.rows[0];

  const nameRaw = body.name ?? body.full_name;
  const name = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : p.full_name;

  const result = await pool.query(
    `
      UPDATE patients
      SET
        full_name = $1,
        cpf = $2,
        email = $3,
        phone = $4,
        birth_date = $5,
        gender = $6,
        main_condition = $7,
        status = $8,
        progress = $9,
        is_active = $10,
        updated_at = NOW()
      WHERE id = $11 AND organization_id = $12
      RETURNING
        id,
        full_name AS name,
        cpf,
        email,
        phone,
        birth_date,
        gender,
        main_condition,
        status,
        progress,
        is_active,
        created_at,
        updated_at
    `,
    [
      name,
      body.cpf !== undefined ? (body.cpf ? String(body.cpf) : null) : p.cpf,
      body.email !== undefined ? (body.email ? String(body.email) : null) : p.email,
      body.phone !== undefined ? (body.phone ? String(body.phone) : null) : p.phone,
      body.birth_date !== undefined ? (body.birth_date ? String(body.birth_date) : null) : p.birth_date,
      body.gender !== undefined ? normalizeGender(body.gender) : p.gender,
      body.main_condition !== undefined ? (body.main_condition ? String(body.main_condition) : null) : p.main_condition,
      body.status !== undefined ? String(body.status) : p.status,
      body.progress !== undefined ? Number(body.progress) : p.progress,
      body.is_active !== undefined ? Boolean(body.is_active) : p.is_active,
      id,
      user.organizationId,
    ],
  );

  return c.json({ data: result.rows[0] });
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    `
      UPDATE patients
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING id
    `,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Paciente não encontrado' }, 404);
  return c.json({ success: true });
});

export { app as patientsRoutes };
