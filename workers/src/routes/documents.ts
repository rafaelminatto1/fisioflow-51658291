/**
 * Rotas: Documentos do Paciente
 *
 * GET    /api/documents?patientId=
 * POST   /api/documents
 * DELETE /api/documents/:id
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeTemplateRow(row: Record<string, unknown>) {
  return {
    ...row,
    variaveis_disponiveis: asArray(row.variaveis_disponiveis).map(String),
  };
}

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { patientId } = c.req.query();
  if (!patientId) return c.json({ error: 'patientId é obrigatório' }, 400);

  const result = await pool.query(
    `SELECT * FROM patient_documents
     WHERE patient_id = $1 AND organization_id = $2
     ORDER BY created_at DESC`,
    [patientId, user.organizationId],
  );
  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const patientId = String(body.patient_id ?? '').trim();
  if (!patientId) return c.json({ error: 'patient_id é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO patient_documents
       (patient_id, organization_id, file_name, file_path, file_type, file_size,
        category, description, storage_url, uploaded_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
     RETURNING *`,
    [
      patientId, user.organizationId,
      String(body.file_name ?? ''),
      String(body.file_path ?? ''),
      body.file_type ?? null,
      body.file_size != null ? Number(body.file_size) : null,
      body.category ?? 'outro',
      body.description ?? null,
      body.storage_url ?? null,
      user.uid,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT file_path FROM patient_documents WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Documento não encontrado' }, 404);

  await pool.query('DELETE FROM patient_documents WHERE id = $1', [id]);
  return c.json({ ok: true, file_path: check.rows[0].file_path });
});

app.get('/atestado-templates', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const result = await pool.query(
    `
      SELECT *
      FROM atestado_templates
      WHERE organization_id = $1 OR organization_id IS NULL
      ORDER BY nome ASC
    `,
    [user.organizationId],
  );

  return c.json({ data: result.rows.map((row) => normalizeTemplateRow(row as Record<string, unknown>)) });
});

app.post('/atestado-templates', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.nome || !body.conteudo) {
    return c.json({ error: 'nome e conteudo são obrigatórios' }, 400);
  }

  const result = await pool.query(
    `
      INSERT INTO atestado_templates (
        organization_id, nome, descricao, conteudo, variaveis_disponiveis, ativo, created_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      String(body.nome),
      body.descricao ? String(body.descricao) : null,
      String(body.conteudo),
      JSON.stringify(asArray(body.variaveis_disponiveis).map(String)),
      body.ativo !== undefined ? Boolean(body.ativo) : true,
      user.uid,
    ],
  );

  return c.json({ data: normalizeTemplateRow(result.rows[0] as Record<string, unknown>) }, 201);
});

app.put('/atestado-templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const result = await pool.query(
    `
      UPDATE atestado_templates
      SET
        nome = COALESCE($3, nome),
        descricao = COALESCE($4, descricao),
        conteudo = COALESCE($5, conteudo),
        variaveis_disponiveis = COALESCE($6, variaveis_disponiveis),
        ativo = COALESCE($7, ativo),
        updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `,
    [
      id,
      user.organizationId,
      body.nome ? String(body.nome) : null,
      body.descricao !== undefined ? body.descricao : null,
      body.conteudo ? String(body.conteudo) : null,
      body.variaveis_disponiveis !== undefined
        ? JSON.stringify(asArray(body.variaveis_disponiveis).map(String))
        : null,
      body.ativo !== undefined ? Boolean(body.ativo) : null,
    ],
  );

  if (!result.rows.length) return c.json({ error: 'Template não encontrado' }, 404);
  return c.json({ data: normalizeTemplateRow(result.rows[0] as Record<string, unknown>) });
});

app.delete('/atestado-templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();

  await pool.query('DELETE FROM atestado_templates WHERE id = $1 AND organization_id = $2', [
    id,
    user.organizationId,
  ]);
  return c.json({ ok: true });
});

app.get('/contrato-templates', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const result = await pool.query(
    `
      SELECT *
      FROM contrato_templates
      WHERE organization_id = $1 OR organization_id IS NULL
      ORDER BY nome ASC
    `,
    [user.organizationId],
  );

  return c.json({ data: result.rows.map((row) => normalizeTemplateRow(row as Record<string, unknown>)) });
});

app.post('/contrato-templates', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.nome || !body.conteudo) {
    return c.json({ error: 'nome e conteudo são obrigatórios' }, 400);
  }

  const result = await pool.query(
    `
      INSERT INTO contrato_templates (
        organization_id, nome, descricao, tipo, conteudo, variaveis_disponiveis, ativo, created_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      String(body.nome),
      body.descricao ? String(body.descricao) : null,
      String(body.tipo ?? 'outro'),
      String(body.conteudo),
      JSON.stringify(asArray(body.variaveis_disponiveis).map(String)),
      body.ativo !== undefined ? Boolean(body.ativo) : true,
      user.uid,
    ],
  );

  return c.json({ data: normalizeTemplateRow(result.rows[0] as Record<string, unknown>) }, 201);
});

app.put('/contrato-templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const result = await pool.query(
    `
      UPDATE contrato_templates
      SET
        nome = COALESCE($3, nome),
        descricao = COALESCE($4, descricao),
        tipo = COALESCE($5, tipo),
        conteudo = COALESCE($6, conteudo),
        variaveis_disponiveis = COALESCE($7, variaveis_disponiveis),
        ativo = COALESCE($8, ativo),
        updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `,
    [
      id,
      user.organizationId,
      body.nome ? String(body.nome) : null,
      body.descricao !== undefined ? body.descricao : null,
      body.tipo ? String(body.tipo) : null,
      body.conteudo ? String(body.conteudo) : null,
      body.variaveis_disponiveis !== undefined
        ? JSON.stringify(asArray(body.variaveis_disponiveis).map(String))
        : null,
      body.ativo !== undefined ? Boolean(body.ativo) : null,
    ],
  );

  if (!result.rows.length) return c.json({ error: 'Template não encontrado' }, 404);
  return c.json({ data: normalizeTemplateRow(result.rows[0] as Record<string, unknown>) });
});

app.delete('/contrato-templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();

  await pool.query('DELETE FROM contrato_templates WHERE id = $1 AND organization_id = $2', [
    id,
    user.organizationId,
  ]);
  return c.json({ ok: true });
});

export { app as documentsRoutes };
