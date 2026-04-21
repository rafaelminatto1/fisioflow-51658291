/**
 * Rotas: Documentos do Paciente
 *
 * GET    /api/documents?patientId=
 * POST   /api/documents
 * DELETE /api/documents/:id
 */
import { Hono } from 'hono';
import { createPool, createPoolForOrg } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { DEFAULT_TIMEOUTS } from '../lib/dbWrapper';
import type { Env } from '../types/env';
import { generatePdfFromHtml } from '../lib/pdf';

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
  const pool = await createPoolForOrg(c.env, user.organizationId, DEFAULT_TIMEOUTS.query);
  const { patientId } = c.req.query();
  if (!patientId) return c.json({ error: 'patientId é obrigatório' }, 400);

  const result = await pool.query(
    `SELECT * FROM patient_documents
     WHERE patient_id = $1 AND organization_id = $2
     ORDER BY created_at DESC`,
    [patientId, user.organizationId],
  );
  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPoolForOrg(c.env, user.organizationId, DEFAULT_TIMEOUTS.mutation);
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
  const pool = await createPoolForOrg(c.env, user.organizationId, DEFAULT_TIMEOUTS.mutation);
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

  return c.json({ data: result.rows.map((row: Record<string, unknown>) => normalizeTemplateRow(row)) });
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

  return c.json({ data: result.rows.map((row: Record<string, unknown>) => normalizeTemplateRow(row)) });
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

/**
 * Endpoint de Impressão (Geração de PDF)
 * Gera um PDF a partir de HTML enviado ou do ID de um documento/template.
 */
app.post('/print', requireAuth, async (c) => {
  const user = c.get('user');
  try {
    const body = (await c.req.json()) as { html: string; filename?: string; title?: string };
    const html = body.html;
    const filename = body.filename;
    const title = body.title;

    if (!html) return c.json({ error: 'HTML é obrigatório' }, 400);

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${title || 'FisioFlow Document'}</title>
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1a1a1a; line-height: 1.5; padding: 20px; }
            .header { border-bottom: 2px solid #3b82f6; margin-bottom: 30px; padding-bottom: 10px; }
            .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #eee; padding-top: 5px; }
            h2 { color: #1e3a8a; margin: 0; }
            .meta { font-size: 12px; color: #4b5563; }
            .content { margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>FisioFlow - Clínica de Fisioterapia</h2>
            <div class="meta">Data: ${new Date().toLocaleDateString('pt-BR')} | Profissional ID: ${user.uid}</div>
          </div>
          <div class="content">${html}</div>
          <div class="footer">Gerado via FisioFlow Cloud System</div>
        </body>
      </html>
    `;

    const pdf = await generatePdfFromHtml(c.env, fullHtml);

    return new Response(pdf as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || 'documento'}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('[Documents/Print] Error:', error);
    return c.json({ error: 'Erro ao gerar PDF', details: error.message }, 500);
  }
});

export { app as documentsRoutes };
