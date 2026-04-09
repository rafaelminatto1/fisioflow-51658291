import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { isUuid } from '../lib/validators';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ─── Catálogo de Pacotes ──────────────────────────────────────────────────────

// GET /api/packages — listar pacotes da org
app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { is_active } = c.req.query();

  const result = await pool.query(
    `SELECT id, name, description, total_sessions, price, price_per_session, valid_days, is_active, created_at
     FROM session_packages
     WHERE organization_id = $1
       AND ($2::boolean IS NULL OR is_active = $2)
     ORDER BY is_active DESC, total_sessions ASC`,
    [user.organizationId, is_active !== undefined ? is_active === 'true' : null],
  );

  return c.json({ data: result.rows });
});

// POST /api/packages — criar pacote
app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = await c.req.json<{
    name: string;
    description?: string;
    total_sessions: number;
    price: number;
    valid_days?: number;
  }>();

  if (!body.name || !body.total_sessions || body.total_sessions <= 0 || !body.price || body.price <= 0) {
    return c.json({ error: 'name, total_sessions e price são obrigatórios e devem ser positivos' }, 400);
  }

  const result = await pool.query(
    `INSERT INTO session_packages (organization_id, name, description, total_sessions, price, valid_days)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [user.organizationId, body.name, body.description ?? null, body.total_sessions, body.price, body.valid_days ?? 365],
  );

  return c.json({ data: result.rows[0] }, 201);
});

// PATCH /api/packages/:id — editar pacote
app.patch('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  const pool = createPool(c.env);
  const body = await c.req.json<Partial<{
    name: string; description: string; total_sessions: number;
    price: number; valid_days: number; is_active: boolean;
  }>>();

  const fields: string[] = [];
  const values: unknown[] = [id, user.organizationId];

  if (body.name !== undefined) { values.push(body.name); fields.push(`name = $${values.length}`); }
  if (body.description !== undefined) { values.push(body.description); fields.push(`description = $${values.length}`); }
  if (body.total_sessions !== undefined) { values.push(body.total_sessions); fields.push(`total_sessions = $${values.length}`); }
  if (body.price !== undefined) { values.push(body.price); fields.push(`price = $${values.length}`); }
  if (body.valid_days !== undefined) { values.push(body.valid_days); fields.push(`valid_days = $${values.length}`); }
  if (body.is_active !== undefined) { values.push(body.is_active); fields.push(`is_active = $${values.length}`); }

  if (fields.length === 0) return c.json({ error: 'Nenhum campo para atualizar' }, 400);

  fields.push(`updated_at = NOW()`);

  const result = await pool.query(
    `UPDATE session_packages SET ${fields.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *`,
    values,
  );
  if (!result.rows.length) return c.json({ error: 'Pacote não encontrado' }, 404);

  return c.json({ data: result.rows[0] });
});

// DELETE /api/packages/:id — desativar pacote (soft delete)
app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  const pool = createPool(c.env);
  await pool.query(
    `UPDATE session_packages SET is_active = false, updated_at = NOW() WHERE id = $1 AND organization_id = $2`,
    [id, user.organizationId],
  );

  return c.json({ success: true });
});

// ─── Pacotes de Pacientes ─────────────────────────────────────────────────────

// GET /api/packages/patient/:patientId — pacotes comprados por um paciente
app.get('/patient/:patientId', requireAuth, async (c) => {
  const user = c.get('user');
  const { patientId } = c.req.param();
  if (!isUuid(patientId)) return c.json({ error: 'ID inválido' }, 400);

  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT pp.*, sp.name AS package_name, sp.total_sessions AS package_total_sessions
     FROM patient_packages pp
     JOIN session_packages sp ON sp.id = pp.package_id
     WHERE pp.patient_id = $1 AND pp.organization_id = $2
     ORDER BY pp.purchase_date DESC`,
    [patientId, user.organizationId],
  );

  return c.json({ data: result.rows });
});

// POST /api/packages/sell — vender pacote para paciente
app.post('/sell', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = await c.req.json<{
    patient_id: string;
    package_id: string;
    amount_paid: number;
    payment_method?: string;
    notes?: string;
    financial_record_id?: string;
  }>();

  if (!isUuid(body.patient_id) || !isUuid(body.package_id)) {
    return c.json({ error: 'patient_id e package_id devem ser UUIDs válidos' }, 400);
  }
  if (body.amount_paid <= 0) return c.json({ error: 'amount_paid deve ser positivo' }, 400);

  // Buscar info do pacote
  const pkgResult = await pool.query(
    `SELECT total_sessions, valid_days FROM session_packages WHERE id = $1 AND organization_id = $2 AND is_active = true`,
    [body.package_id, user.organizationId],
  );
  if (!pkgResult.rows.length) return c.json({ error: 'Pacote não encontrado ou inativo' }, 404);

  const { total_sessions, valid_days } = pkgResult.rows[0];
  const expiryDate = valid_days
    ? new Date(Date.now() + valid_days * 86400000).toISOString().split('T')[0]
    : null;

  const result = await pool.query(
    `INSERT INTO patient_packages (organization_id, patient_id, package_id, total_sessions, amount_paid, payment_method, expiry_date, notes, financial_record_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      user.organizationId, body.patient_id, body.package_id, total_sessions,
      body.amount_paid, body.payment_method ?? null,
      expiryDate, body.notes ?? null, body.financial_record_id ?? null,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

// POST /api/packages/patient-package/:id/use — debitar 1 sessão
app.post('/patient-package/:id/use', requireAuth, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  const pool = createPool(c.env);
  const body = await c.req.json<{
    appointment_id?: string;
    notes?: string;
  }>().catch(() => ({} as { appointment_id?: string; notes?: string; }));

  // Verificar pacote
  const pkgResult = await pool.query(
    `SELECT id, remaining_sessions, status, expiry_date FROM patient_packages WHERE id = $1 AND organization_id = $2`,
    [id, user.organizationId],
  );
  if (!pkgResult.rows.length) return c.json({ error: 'Pacote não encontrado' }, 404);

  const pkg = pkgResult.rows[0];
  if (pkg.status !== 'ativo') return c.json({ error: `Pacote está ${pkg.status}` }, 400);
  if (pkg.remaining_sessions <= 0) return c.json({ error: 'Pacote sem sessões restantes' }, 400);
  if (pkg.expiry_date && new Date(pkg.expiry_date) < new Date()) {
    await pool.query(`UPDATE patient_packages SET status = 'expirado', updated_at = NOW() WHERE id = $1`, [id]);
    return c.json({ error: 'Pacote expirado' }, 400);
  }

  // Registrar uso e incrementar sessões usadas
  await pool.query(
    `INSERT INTO package_session_log (patient_package_id, appointment_id, notes, created_by)
     VALUES ($1, $2, $3, $4)`,
    [id, body.appointment_id ?? null, body.notes ?? null, user.uid],
  );

  const updateResult = await pool.query(
    `UPDATE patient_packages
     SET used_sessions = used_sessions + 1,
         status = CASE WHEN (total_sessions - used_sessions - 1) = 0 THEN 'esgotado' ELSE 'ativo' END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id],
  );

  return c.json({ data: updateResult.rows[0] });
});

// GET /api/packages/stats — resumo geral da org
app.get('/stats', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);

  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'ativo') AS active_packages,
       COUNT(*) FILTER (WHERE status = 'esgotado') AS exhausted_packages,
       COALESCE(SUM(remaining_sessions) FILTER (WHERE status = 'ativo'), 0) AS total_remaining_sessions,
       COALESCE(SUM(amount_paid), 0) AS total_revenue,
       COUNT(DISTINCT patient_id) AS patients_with_packages
     FROM patient_packages
     WHERE organization_id = $1`,
    [user.organizationId],
  );

  return c.json({ data: result.rows[0] });
});

export { app as packagesRoutes };
