import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { getRawSql } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

function normalizePatientRow(row: any) {
  return {
    ...row,
    id: String(row.id),
    // O banco usa full_name, mas o frontend pode esperar name
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
  const sql = getRawSql(c.env);

  try {
    const { search, limit = '100' } = c.req.query();
    const limitNum = Number.parseInt(limit, 10) || 100;

    const query = `
      SELECT id, full_name, email, phone, status, progress, created_at, organization_id, is_active 
      FROM patients 
      WHERE organization_id = $1::uuid AND is_active = true 
      ORDER BY full_name ASC 
      LIMIT $2
    `;

    const result = await sql(query, [user.organizationId, limitNum]);

    return c.json({
      data: result.map(normalizePatientRow),
      total: result.length,
      page: 1,
      perPage: limitNum,
    });
  } catch (error: any) {
    console.error('[Patients/List] Database Error:', error.message);
    return c.json({ data: [], error: error.message });
  }
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const sql = getRawSql(c.env);
  
  try {
    const body = (await c.req.json()) as any;
    const name = (body.full_name || body.name || '').trim();
    
    if (!name) return c.json({ error: 'Nome é obrigatório' }, 400);

    const result = await sql(
      `INSERT INTO patients (
        organization_id, full_name, email, phone, status, is_active, created_at, updated_at, progress
      ) VALUES (
        $1::uuid, $2, $3, $4, $5, true, NOW(), NOW(), 0
      ) RETURNING *`,
      [
        user.organizationId,
        name,
        body.email || null,
        body.phone || null,
        body.status || 'Inicial'
      ],
    );

    return c.json({ data: normalizePatientRow(result[0]) }, 201);
  } catch (error: any) {
    console.error('[Patients/Create] Database Error:', error.message);
    return c.json({ error: 'Erro ao criar paciente', details: error.message }, 500);
  }
});

app.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const sql = getRawSql(c.env);
  const { id } = c.req.param();

  try {
    const result = await sql(
      `SELECT * FROM patients WHERE id = $1::uuid AND organization_id = $2::uuid LIMIT 1`,
      [id, user.organizationId],
    );

    if (!result.length) return c.json({ error: 'Paciente não encontrado' }, 404);
    return c.json({ data: normalizePatientRow(result[0]) });
  } catch (error: any) {
    return c.json({ error: 'Erro ao buscar paciente', details: error.message }, 500);
  }
});

export { app as patientsRoutes };
