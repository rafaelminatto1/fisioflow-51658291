import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function hasTable(pool: ReturnType<typeof createPool>, tableName: string): Promise<boolean> {
  const result = await pool.query(`SELECT to_regclass($1)::text AS table_name`, [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
}

function normalizeFields(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

type NormalizedToken = {
  id: string;
  organization_id: string;
  nome: string;
  descricao: string | null;
  token?: string;
  ativo: boolean;
  max_usos: number | null;
  usos_atuais: number;
  expires_at: string | null;
  campos_obrigatorios: string[];
  campos_opcionais: string[];
  ui_style: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

function normalizeToken(row: Record<string, unknown>): NormalizedToken {
  return {
    id: String(row.id ?? ''),
    organization_id: String(row.organization_id ?? ''),
    nome: String(row.nome ?? ''),
    descricao: row.descricao == null ? null : String(row.descricao),
    token: row.token == null ? undefined : String(row.token),
    ativo: row.ativo !== false,
    max_usos: row.max_usos == null ? null : Number(row.max_usos),
    usos_atuais: Number(row.usos_atuais ?? 0),
    expires_at: row.expires_at == null ? null : String(row.expires_at),
    campos_obrigatorios: normalizeFields(row.campos_obrigatorios, ['nome', 'email']),
    campos_opcionais: normalizeFields(row.campos_opcionais, ['telefone']),
    ui_style: (typeof row.ui_style === 'string' ? JSON.parse(row.ui_style) : row.ui_style) || {},
    created_at: row.created_at == null ? undefined : String(row.created_at),
    updated_at: row.updated_at == null ? undefined : String(row.updated_at),
  };
}

function normalizePrecadastro(row: Record<string, unknown>) {
  const adicionais =
    row.dados_adicionais && typeof row.dados_adicionais === 'string'
      ? JSON.parse(String(row.dados_adicionais))
      : row.dados_adicionais;

  const typed = (adicionais && typeof adicionais === 'object' ? adicionais : {}) as Record<string, unknown>;

  return {
    ...row,
    dados_adicionais: typed,
    cpf: typeof typed.cpf === 'string' ? typed.cpf : undefined,
    convenio: typeof typed.convenio === 'string' ? typed.convenio : undefined,
    queixa_principal:
      typeof typed.queixa_principal === 'string' ? typed.queixa_principal : undefined,
  };
}

app.get('/public/:token', async (c) => {
  const pool = await createPool(c.env);
  const { token } = c.req.param();

  if (!(await hasTable(pool, 'precadastro_tokens'))) {
    return c.json({ error: 'Pré-cadastro não disponível' }, 501);
  }

  const result = await pool.query(
    `
      SELECT id, organization_id, nome, descricao, ativo, max_usos, usos_atuais, expires_at,
             campos_obrigatorios, campos_opcionais, created_at, updated_at
      FROM precadastro_tokens
      WHERE token = $1 AND ativo = true
      LIMIT 1
    `,
    [token],
  );

  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return c.json({ error: 'Link expirado ou inválido' }, 404);

  const normalized = normalizeToken(row);
  if (
    normalized.max_usos != null &&
    normalized.usos_atuais >= normalized.max_usos
  ) {
    return c.json({ error: 'Este link atingiu o limite máximo de usos' }, 400);
  }

  if (normalized.expires_at && new Date(String(normalized.expires_at)) < new Date()) {
    return c.json({ error: 'Este link expirou' }, 400);
  }

  return c.json({ data: normalized });
});

app.post('/public/:token/submissions', async (c) => {
  const pool = await createPool(c.env);
  const { token } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!(await hasTable(pool, 'precadastro_tokens')) || !(await hasTable(pool, 'precadastros'))) {
    return c.json({ error: 'Pré-cadastro não disponível' }, 501);
  }

  const tokenResult = await pool.query(
    `
      SELECT id, organization_id, nome, descricao, ativo, max_usos, usos_atuais, expires_at,
             campos_obrigatorios, campos_opcionais, created_at, updated_at
      FROM precadastro_tokens
      WHERE token = $1 AND ativo = true
      LIMIT 1
    `,
    [token],
  );

  const tokenRow = tokenResult.rows[0] as Record<string, unknown> | undefined;
  if (!tokenRow) return c.json({ error: 'Link expirado ou inválido' }, 404);

  const normalizedToken = normalizeToken(tokenRow);
  if (
    normalizedToken.max_usos != null &&
    normalizedToken.usos_atuais >= normalizedToken.max_usos
  ) {
    return c.json({ error: 'Este link atingiu o limite máximo de usos' }, 400);
  }

  if (normalizedToken.expires_at && new Date(String(normalizedToken.expires_at)) < new Date()) {
    return c.json({ error: 'Este link expirou' }, 400);
  }

  const requiredFields = normalizedToken.campos_obrigatorios ?? ['nome', 'email'];
  for (const field of requiredFields) {
    const value = body[field];
    if (value == null || String(value).trim() === '') {
      return c.json({ error: `O campo ${field} é obrigatório` }, 400);
    }
  }

  const dadosAdicionais: Record<string, unknown> = {};
  if (body.cpf) dadosAdicionais.cpf = body.cpf;
  if (body.convenio) dadosAdicionais.convenio = body.convenio;
  if (body.queixa_principal) dadosAdicionais.queixa_principal = body.queixa_principal;

  await pool.query('BEGIN');
  try {
    const insertResult = await pool.query(
      `
        INSERT INTO precadastros (
          token_id, organization_id, nome, email, telefone, data_nascimento, endereco,
          observacoes, status, dados_adicionais, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pendente',$9,NOW(),NOW())
        RETURNING *
      `,
      [
        normalizedToken.id,
        normalizedToken.organization_id,
        String(body.nome ?? ''),
        body.email ? String(body.email) : null,
        body.telefone ? String(body.telefone) : null,
        body.data_nascimento ? String(body.data_nascimento) : null,
        body.endereco ? String(body.endereco) : null,
        body.observacoes ? String(body.observacoes) : null,
        Object.keys(dadosAdicionais).length > 0 ? JSON.stringify(dadosAdicionais) : null,
      ],
    );

    await pool.query(
      `
        UPDATE precadastro_tokens
        SET usos_atuais = usos_atuais + 1, updated_at = NOW()
        WHERE id = $1
      `,
      [normalizedToken.id],
    );

    await pool.query('COMMIT');
    return c.json({ data: normalizePrecadastro(insertResult.rows[0] as Record<string, unknown>) }, 201);
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
});

app.get('/tokens', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);

  if (!(await hasTable(pool, 'precadastro_tokens'))) {
    return c.json({ data: [] });
  }

  const result = await pool.query(
    `
      SELECT *
      FROM precadastro_tokens
      WHERE organization_id = $1
      ORDER BY created_at DESC
    `,
    [user.organizationId],
  );

  return c.json({ data: result.rows.map((row) => normalizeToken(row as Record<string, unknown>)) });
});

app.post('/tokens', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!(await hasTable(pool, 'precadastro_tokens'))) {
    return c.json({ error: 'Pré-cadastro não disponível' }, 501);
  }

  const nome = String(body.nome ?? '').trim() || 'Link de Pré-cadastro';
  const token = String(body.token ?? crypto.randomUUID().replace(/-/g, '').slice(0, 12));
  const camposObrigatorios = normalizeFields(body.campos_obrigatorios, ['nome', 'email', 'telefone']);
  const camposOpcionais = normalizeFields(body.campos_opcionais, []);
  const maxUsos = body.max_usos == null || body.max_usos === '' ? null : Number(body.max_usos);

  const result = await pool.query(
    `
      INSERT INTO precadastro_tokens (
        organization_id, nome, descricao, token, ativo, max_usos, usos_atuais,
        expires_at, campos_obrigatorios, campos_opcionais, ui_style, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8::text[],$9::text[],$10,NOW(),NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      nome,
      body.descricao ? String(body.descricao) : null,
      token,
      body.ativo !== false,
      Number.isFinite(maxUsos) ? maxUsos : null,
      body.expires_at ? String(body.expires_at) : null,
      camposObrigatorios,
      camposOpcionais,
      body.ui_style ? (typeof body.ui_style === 'object' ? JSON.stringify(body.ui_style) : String(body.ui_style)) : '{}',
    ],
  );

  return c.json({ data: normalizeToken(result.rows[0] as Record<string, unknown>) }, 201);
});

app.put('/tokens/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!(await hasTable(pool, 'precadastro_tokens'))) {
    return c.json({ error: 'Pré-cadastro não disponível' }, 501);
  }

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.nome !== undefined) {
    params.push(String(body.nome));
    sets.push(`nome = $${params.length}`);
  }
  if (body.descricao !== undefined) {
    params.push(body.descricao ? String(body.descricao) : null);
    sets.push(`descricao = $${params.length}`);
  }
  if (body.ativo !== undefined) {
    params.push(Boolean(body.ativo));
    sets.push(`ativo = $${params.length}`);
  }
  if (body.max_usos !== undefined) {
    params.push(body.max_usos == null || body.max_usos === '' ? null : Number(body.max_usos));
    sets.push(`max_usos = $${params.length}`);
  }
  if (body.expires_at !== undefined) {
    params.push(body.expires_at ? String(body.expires_at) : null);
    sets.push(`expires_at = $${params.length}`);
  }
  if (body.campos_obrigatorios !== undefined) {
    params.push(normalizeFields(body.campos_obrigatorios, ['nome', 'email']));
    sets.push(`campos_obrigatorios = $${params.length}::text[]`);
  }
  if (body.campos_opcionais !== undefined) {
    params.push(normalizeFields(body.campos_opcionais, []));
    sets.push(`campos_opcionais = $${params.length}::text[]`);
  }
  if (body.ui_style !== undefined) {
    params.push(body.ui_style ? (typeof body.ui_style === 'object' ? JSON.stringify(body.ui_style) : String(body.ui_style)) : '{}');
    sets.push(`ui_style = $${params.length}`);
  }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `
      UPDATE precadastro_tokens
      SET ${sets.join(', ')}
      WHERE id = $${params.length - 1} AND organization_id = $${params.length}
      RETURNING *
    `,
    params,
  );

  if (!result.rows.length) return c.json({ error: 'Link não encontrado' }, 404);
  return c.json({ data: normalizeToken(result.rows[0] as Record<string, unknown>) });
});

app.get('/submissions', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);

  if (!(await hasTable(pool, 'precadastros'))) {
    return c.json({ data: [] });
  }

  const result = await pool.query(
    `
      SELECT
        p.*,
        t.nome AS token_nome
      FROM precadastros p
      LEFT JOIN precadastro_tokens t ON t.id = p.token_id
      WHERE p.organization_id = $1
      ORDER BY p.created_at DESC
    `,
    [user.organizationId],
  );

  return c.json({
    data: result.rows.map((row) => normalizePrecadastro(row as Record<string, unknown>)),
  });
});

app.put('/submissions/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!(await hasTable(pool, 'precadastros'))) {
    return c.json({ error: 'Pré-cadastro não disponível' }, 501);
  }

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.status !== undefined) {
    params.push(String(body.status));
    sets.push(`status = $${params.length}`);
  }
  if (body.converted_at !== undefined) {
    params.push(body.converted_at ? String(body.converted_at) : null);
    sets.push(`converted_at = $${params.length}`);
  }
  if (body.patient_id !== undefined) {
    params.push(body.patient_id ? String(body.patient_id) : null);
    sets.push(`patient_id = $${params.length}`);
  }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `
      UPDATE precadastros
      SET ${sets.join(', ')}
      WHERE id = $${params.length - 1} AND organization_id = $${params.length}
      RETURNING *
    `,
    params,
  );

  if (!result.rows.length) return c.json({ error: 'Pré-cadastro não encontrado' }, 404);
  return c.json({ data: normalizePrecadastro(result.rows[0] as Record<string, unknown>) });
});

export const precadastroRoutes = app;
