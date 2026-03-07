/**
 * Rotas: Formulários de Avaliação
 *
 * GET    /api/evaluation-forms
 * GET    /api/evaluation-forms/:id
 * POST   /api/evaluation-forms
 * PUT    /api/evaluation-forms/:id
 * DELETE /api/evaluation-forms/:id
 * POST   /api/evaluation-forms/:id/duplicate
 * POST   /api/evaluation-forms/:id/fields
 * PUT    /api/evaluation-forms/fields/:fieldId
 * DELETE /api/evaluation-forms/fields/:fieldId
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function hasTable(
  pool: ReturnType<typeof createPool>,
  tableName: string,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT to_regclass($1)::text AS table_name`,
    [`public.${tableName}`],
  );
  return Boolean(result.rows[0]?.table_name);
}

function normalizeOptions(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { tipo, ativo, favorite } = c.req.query();

  if (!(await hasTable(pool, 'evaluation_forms'))) {
    return c.json({ data: [] });
  }

  const conditions: string[] = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (tipo) {
    params.push(tipo);
    conditions.push(`tipo = $${params.length}`);
  }
  if (ativo !== undefined) {
    params.push(ativo === 'true');
    conditions.push(`ativo = $${params.length}`);
  }
  if (favorite !== undefined) {
    params.push(favorite === 'true');
    conditions.push(`is_favorite = $${params.length}`);
  }

  const result = await pool.query(
    `SELECT * FROM evaluation_forms
     WHERE ${conditions.join(' AND ')}
     ORDER BY nome ASC`,
    params,
  );
  return c.json({ data: result.rows });
});

app.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  if (!(await hasTable(pool, 'evaluation_forms'))) {
    return c.json({ error: 'Formulários de avaliação não disponíveis' }, 404);
  }

  const formResult = await pool.query(
    `SELECT * FROM evaluation_forms
     WHERE id = $1 AND organization_id = $2
     LIMIT 1`,
    [id, user.organizationId],
  );
  if (!formResult.rows.length) {
    return c.json({ error: 'Ficha não encontrada' }, 404);
  }

  let fields: unknown[] = [];
  if (await hasTable(pool, 'evaluation_form_fields')) {
    const fieldsResult = await pool.query(
      `SELECT * FROM evaluation_form_fields
       WHERE form_id = $1
       ORDER BY ordem ASC`,
      [id],
    );
    fields = fieldsResult.rows;
  }

  return c.json({ data: { ...formResult.rows[0], fields } });
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!(await hasTable(pool, 'evaluation_forms'))) {
    return c.json({ error: 'Formulários de avaliação não disponíveis' }, 501);
  }

  if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO evaluation_forms
       (organization_id, created_by, nome, descricao, referencias, tipo, ativo,
        is_favorite, usage_count, last_used_at, cover_image, estimated_time, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      user.uid,
      String(body.nome),
      body.descricao ?? null,
      body.referencias ?? null,
      body.tipo ?? 'anamnese',
      body.ativo !== false,
      body.is_favorite === true,
      body.usage_count != null ? Number(body.usage_count) : 0,
      body.last_used_at ?? null,
      body.cover_image ?? null,
      body.estimated_time != null ? Number(body.estimated_time) : null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!(await hasTable(pool, 'evaluation_forms'))) {
    return c.json({ error: 'Formulários de avaliação não disponíveis' }, 501);
  }

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.nome !== undefined) {
    params.push(body.nome);
    sets.push(`nome = $${params.length}`);
  }
  if (body.descricao !== undefined) {
    params.push(body.descricao);
    sets.push(`descricao = $${params.length}`);
  }
  if (body.referencias !== undefined) {
    params.push(body.referencias);
    sets.push(`referencias = $${params.length}`);
  }
  if (body.tipo !== undefined) {
    params.push(body.tipo);
    sets.push(`tipo = $${params.length}`);
  }
  if (body.ativo !== undefined) {
    params.push(body.ativo);
    sets.push(`ativo = $${params.length}`);
  }
  if (body.is_favorite !== undefined) {
    params.push(body.is_favorite);
    sets.push(`is_favorite = $${params.length}`);
  }
  if (body.usage_count !== undefined) {
    params.push(Number(body.usage_count));
    sets.push(`usage_count = $${params.length}`);
  }
  if (body.last_used_at !== undefined) {
    params.push(body.last_used_at);
    sets.push(`last_used_at = $${params.length}`);
  }
  if (body.cover_image !== undefined) {
    params.push(body.cover_image);
    sets.push(`cover_image = $${params.length}`);
  }
  if (body.estimated_time !== undefined) {
    params.push(body.estimated_time != null ? Number(body.estimated_time) : null);
    sets.push(`estimated_time = $${params.length}`);
  }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE evaluation_forms SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Ficha não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  if (!(await hasTable(pool, 'evaluation_forms'))) {
    return c.json({ error: 'Formulários de avaliação não disponíveis' }, 501);
  }

  const result = await pool.query(
    `UPDATE evaluation_forms
     SET ativo = false, updated_at = NOW()
     WHERE id = $1 AND organization_id = $2
     RETURNING id`,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Ficha não encontrada' }, 404);
  return c.json({ ok: true });
});

app.post('/:id/duplicate', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  if (!(await hasTable(pool, 'evaluation_forms'))) {
    return c.json({ error: 'Formulários de avaliação não disponíveis' }, 501);
  }

  const originalFormResult = await pool.query(
    `SELECT * FROM evaluation_forms
     WHERE id = $1 AND organization_id = $2
     LIMIT 1`,
    [id, user.organizationId],
  );
  if (!originalFormResult.rows.length) return c.json({ error: 'Ficha não encontrada' }, 404);

  const original = originalFormResult.rows[0] as Record<string, unknown>;

  const copiedResult = await pool.query(
    `INSERT INTO evaluation_forms
       (organization_id, created_by, nome, descricao, referencias, tipo, ativo,
        is_favorite, usage_count, last_used_at, cover_image, estimated_time, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9,$10,$11,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      user.uid,
      `${String(original.nome ?? 'Ficha')} (Cópia)`,
      original.descricao ?? null,
      original.referencias ?? null,
      original.tipo ?? 'anamnese',
      false,
      0,
      null,
      original.cover_image ?? null,
      original.estimated_time ?? null,
    ],
  );
  const duplicated = copiedResult.rows[0] as { id: string };

  if (await hasTable(pool, 'evaluation_form_fields')) {
    const fieldsResult = await pool.query(
      `SELECT * FROM evaluation_form_fields WHERE form_id = $1 ORDER BY ordem ASC`,
      [id],
    );

    for (const field of fieldsResult.rows as Record<string, unknown>[]) {
      await pool.query(
        `INSERT INTO evaluation_form_fields
           (form_id, tipo_campo, label, placeholder, opcoes, ordem, obrigatorio,
            grupo, descricao, minimo, maximo, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
        [
          duplicated.id,
          field.tipo_campo ?? 'texto_curto',
          field.label ?? '',
          field.placeholder ?? null,
          JSON.stringify(normalizeOptions(field.opcoes) ?? []),
          field.ordem ?? 0,
          field.obrigatorio ?? false,
          field.grupo ?? null,
          field.descricao ?? null,
          field.minimo ?? null,
          field.maximo ?? null,
        ],
      );
    }
  }

  return c.json({ data: duplicated }, 201);
});

app.post('/:id/fields', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!(await hasTable(pool, 'evaluation_forms')) || !(await hasTable(pool, 'evaluation_form_fields'))) {
    return c.json({ error: 'Campos de formulário não disponíveis' }, 501);
  }

  const formCheck = await pool.query(
    `SELECT id FROM evaluation_forms WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, user.organizationId],
  );
  if (!formCheck.rows.length) return c.json({ error: 'Ficha não encontrada' }, 404);

  const result = await pool.query(
    `INSERT INTO evaluation_form_fields
       (form_id, tipo_campo, label, placeholder, opcoes, ordem, obrigatorio,
        grupo, descricao, minimo, maximo, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,NOW(),NOW())
     RETURNING *`,
    [
      id,
      body.tipo_campo ?? 'texto_curto',
      body.label ?? '',
      body.placeholder ?? null,
      JSON.stringify(normalizeOptions(body.opcoes) ?? []),
      body.ordem ?? 0,
      body.obrigatorio ?? false,
      body.grupo ?? null,
      body.descricao ?? null,
      body.minimo ?? null,
      body.maximo ?? null,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/fields/:fieldId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { fieldId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!(await hasTable(pool, 'evaluation_forms')) || !(await hasTable(pool, 'evaluation_form_fields'))) {
    return c.json({ error: 'Campos de formulário não disponíveis' }, 501);
  }

  const ownership = await pool.query(
    `
      SELECT f.id
      FROM evaluation_form_fields f
      JOIN evaluation_forms ef ON ef.id = f.form_id
      WHERE f.id = $1 AND ef.organization_id = $2
      LIMIT 1
    `,
    [fieldId, user.organizationId],
  );
  if (!ownership.rows.length) return c.json({ error: 'Campo não encontrado' }, 404);

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.tipo_campo !== undefined) {
    params.push(body.tipo_campo);
    sets.push(`tipo_campo = $${params.length}`);
  }
  if (body.label !== undefined) {
    params.push(body.label);
    sets.push(`label = $${params.length}`);
  }
  if (body.placeholder !== undefined) {
    params.push(body.placeholder);
    sets.push(`placeholder = $${params.length}`);
  }
  if (body.opcoes !== undefined) {
    params.push(JSON.stringify(normalizeOptions(body.opcoes) ?? []));
    sets.push(`opcoes = $${params.length}::jsonb`);
  }
  if (body.ordem !== undefined) {
    params.push(Number(body.ordem));
    sets.push(`ordem = $${params.length}`);
  }
  if (body.obrigatorio !== undefined) {
    params.push(Boolean(body.obrigatorio));
    sets.push(`obrigatorio = $${params.length}`);
  }
  if (body.grupo !== undefined) {
    params.push(body.grupo);
    sets.push(`grupo = $${params.length}`);
  }
  if (body.descricao !== undefined) {
    params.push(body.descricao);
    sets.push(`descricao = $${params.length}`);
  }
  if (body.minimo !== undefined) {
    params.push(body.minimo != null ? Number(body.minimo) : null);
    sets.push(`minimo = $${params.length}`);
  }
  if (body.maximo !== undefined) {
    params.push(body.maximo != null ? Number(body.maximo) : null);
    sets.push(`maximo = $${params.length}`);
  }

  params.push(fieldId);
  const result = await pool.query(
    `UPDATE evaluation_form_fields
     SET ${sets.join(', ')}
     WHERE id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Campo não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/fields/:fieldId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { fieldId } = c.req.param();

  if (!(await hasTable(pool, 'evaluation_forms')) || !(await hasTable(pool, 'evaluation_form_fields'))) {
    return c.json({ error: 'Campos de formulário não disponíveis' }, 501);
  }

  const result = await pool.query(
    `
      DELETE FROM evaluation_form_fields f
      USING evaluation_forms ef
      WHERE f.id = $1
        AND ef.id = f.form_id
        AND ef.organization_id = $2
      RETURNING f.id
    `,
    [fieldId, user.organizationId],
  );
  if (!result.rows.length) return c.json({ error: 'Campo não encontrado' }, 404);
  return c.json({ ok: true });
});

export { app as evaluationFormsRoutes };
