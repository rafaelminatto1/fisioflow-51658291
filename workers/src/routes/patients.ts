import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

function normalizePatientRow(row: any) {
  return {
    ...row,
    id: String(row.id),
    name: row.full_name || row.name,
    fullName: row.full_name,
    organizationId: row.organization_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  try {
    const { search, limit = '100' } = c.req.query();
    const limitNum = Number.parseInt(limit, 10) || 100;
    const params: any[] = [user.organizationId, limitNum];
    let query = `SELECT id, full_name, email, phone, status, progress, created_at, organization_id, is_active
      FROM patients WHERE organization_id = $1::uuid AND is_active = true`;
    if (search) {
      params.splice(1, 0, `%${search}%`);
      query += ` AND full_name ILIKE $2`;
      params[params.length - 1] = limitNum;
    }
    query += ` ORDER BY full_name ASC LIMIT $${params.length}`;
    const result = await db.query(query, params);
    const rows = result.rows || result;
    return c.json({ data: rows.map(normalizePatientRow), total: rows.length, page: 1, perPage: limitNum });
  } catch (error: any) {
    console.error('[Patients/List] Error:', error.message);
    return c.json({ data: [], error: error.message });
  }
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  try {
    const body = (await c.req.json()) as any;
    const name = (body.full_name || body.name || '').trim();
    if (!name) return c.json({ error: 'Nome é obrigatório' }, 400);
    const result = await db.query(
      `INSERT INTO patients (organization_id, full_name, email, phone, status, is_active, created_at, updated_at, progress)
       VALUES ($1::uuid, $2, $3, $4, $5, true, NOW(), NOW(), 0) RETURNING *`,
      [user.organizationId, name, body.email || null, body.phone || null, body.status || 'Inicial'],
    );
    const row = result.rows?.[0] || (result as any)[0];
    return c.json({ data: normalizePatientRow(row) }, 201);
  } catch (error: any) {
    console.error('[Patients/Create] Error:', error.message);
    return c.json({ error: 'Erro ao criar paciente', details: error.message }, 500);
  }
});

app.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  try {
    const result = await db.query(
      `SELECT * FROM patients WHERE id = $1::uuid AND organization_id = $2::uuid LIMIT 1`,
      [id, user.organizationId],
    );
    const row = result.rows?.[0] || (result as any)[0];
    if (!row) return c.json({ error: 'Paciente não encontrado' }, 404);
    return c.json({ data: normalizePatientRow(row) });
  } catch (error: any) {
    return c.json({ error: 'Erro ao buscar paciente', details: error.message }, 500);
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
    if (body.full_name !== undefined || body.name !== undefined) {
      fields.push(`full_name = $${idx++}`); params.push(body.full_name || body.name);
    }
    if (body.email !== undefined)  { fields.push(`email = $${idx++}`);  params.push(body.email); }
    if (body.phone !== undefined)  { fields.push(`phone = $${idx++}`);  params.push(body.phone); }
    if (body.status !== undefined) { fields.push(`status = $${idx++}`); params.push(body.status); }
    if (!fields.length) return c.json({ error: 'Nenhum campo para atualizar' }, 400);
    fields.push(`updated_at = NOW()`);
    params.push(id, user.organizationId);
    const result = await db.query(
      `UPDATE patients SET ${fields.join(', ')} WHERE id = $${idx++}::uuid AND organization_id = $${idx++}::uuid RETURNING *`,
      params,
    );
    const row = result.rows?.[0] || (result as any)[0];
    if (!row) return c.json({ error: 'Paciente não encontrado' }, 404);
    return c.json({ data: normalizePatientRow(row) });
  } catch (error: any) {
    return c.json({ error: 'Erro ao atualizar paciente', details: error.message }, 500);
  }
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  try {
    const result = await db.query(
      `UPDATE patients SET is_active = false, updated_at = NOW() WHERE id = $1::uuid AND organization_id = $2::uuid RETURNING id`,
      [id, user.organizationId],
    );
    const row = result.rows?.[0] || (result as any)[0];
    if (!row) return c.json({ error: 'Paciente não encontrado' }, 404);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Erro ao excluir paciente', details: error.message }, 500);
  }
});

// ===== PATHOLOGIES =====
app.get('/:id/pathologies', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  try {
    const result = await db.query(
      `SELECT * FROM patient_pathologies WHERE patient_id = $1::uuid AND organization_id = $2::uuid ORDER BY created_at DESC`,
      [id, user.organizationId],
    );
    return c.json({ data: result.rows || [] });
  } catch (error: any) {
    return c.json({ data: [], error: error.message });
  }
});

app.post('/:id/pathologies', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  try {
    const body = (await c.req.json()) as any;
    const result = await db.query(
      `INSERT INTO patient_pathologies (patient_id, organization_id, pathology_name, cid_code, diagnosis_date, severity, affected_region, status, notes, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING *`,
      [id, user.organizationId, body.pathology_name, body.cid_code || null, body.diagnosis_date || null, body.severity || null, body.affected_region || null, body.status || 'ativo', body.notes || null],
    );
    return c.json({ data: result.rows?.[0] }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ===== SURGERIES =====
app.get('/:id/surgeries', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  try {
    const result = await db.query(
      `SELECT * FROM patient_surgeries WHERE patient_id = $1::uuid AND organization_id = $2::uuid ORDER BY surgery_date DESC`,
      [id, user.organizationId],
    );
    return c.json({ data: result.rows || [] });
  } catch (error: any) {
    return c.json({ data: [], error: error.message });
  }
});

app.post('/:id/surgeries', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  try {
    const body = (await c.req.json()) as any;
    const result = await db.query(
      `INSERT INTO patient_surgeries (patient_id, organization_id, surgery_name, surgery_date, surgeon_name, hospital, surgery_type, affected_side, complications, notes, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING *`,
      [id, user.organizationId, body.surgery_name, body.surgery_date || null, body.surgeon_name || null, body.hospital || null, body.surgery_type || null, body.affected_side || null, body.complications || null, body.notes || null],
    );
    return c.json({ data: result.rows?.[0] }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ===== MEDICAL RETURNS =====
app.get('/:id/medical-returns', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  try {
    const result = await db.query(
      `SELECT * FROM patient_medical_returns WHERE patient_id = $1::uuid AND organization_id = $2::uuid ORDER BY return_date DESC`,
      [id, user.organizationId],
    );
    return c.json({ data: result.rows || [] });
  } catch (error: any) {
    return c.json({ data: [], error: error.message });
  }
});

app.post('/:id/medical-returns', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  try {
    const body = (await c.req.json()) as any;
    const result = await db.query(
      `INSERT INTO patient_medical_returns (patient_id, organization_id, doctor_name, doctor_phone, return_date, return_period, notes, report_done, report_sent, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING *`,
      [id, user.organizationId, body.doctor_name, body.doctor_phone || null, body.return_date || null, body.return_period || null, body.notes || null, body.report_done || false, body.report_sent || false],
    );
    return c.json({ data: result.rows?.[0] }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export { app as patientsRoutes };
