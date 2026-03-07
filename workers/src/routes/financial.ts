/**
 * Rotas: Domínio Financeiro
 *
 * GET/POST/PUT/DELETE /api/financial/transacoes
 * GET/POST/PUT/DELETE /api/financial/contas
 * GET/POST/PUT/DELETE /api/financial/centros-custo
 * GET/POST/PUT/DELETE /api/financial/convenios
 * GET/POST/PUT/DELETE /api/financial/pagamentos
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
  const result = await pool.query(`SELECT to_regclass($1)::text AS table_name`, [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
}

// ===== TRANSACOES =====

app.get('/transacoes', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { tipo, status, dateFrom, dateTo, limit = '50', offset = '0' } = c.req.query();

  const conditions: string[] = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (tipo) { params.push(tipo); conditions.push(`tipo = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (dateFrom) { params.push(dateFrom); conditions.push(`created_at >= $${params.length}`); }
  if (dateTo) { params.push(dateTo); conditions.push(`created_at <= $${params.length}`); }

  params.push(Number(limit), Number(offset));
  const result = await pool.query(
    `SELECT * FROM transacoes WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/transacoes', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.tipo) return c.json({ error: 'tipo é obrigatório' }, 400);
  if (body.valor == null) return c.json({ error: 'valor é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO transacoes
       (organization_id, user_id, tipo, valor, descricao, status, categoria,
        stripe_payment_intent_id, stripe_refund_id, metadata, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      body.user_id ?? user.uid,
      String(body.tipo),
      Number(body.valor),
      body.descricao ?? null,
      body.status ?? 'pendente',
      body.categoria ?? null,
      body.stripe_payment_intent_id ?? null,
      body.stripe_refund_id ?? null,
      body.metadata ? JSON.stringify(body.metadata) : '{}',
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/transacoes/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.tipo !== undefined) { params.push(body.tipo); sets.push(`tipo = $${params.length}`); }
  if (body.valor !== undefined) { params.push(Number(body.valor)); sets.push(`valor = $${params.length}`); }
  if (body.descricao !== undefined) { params.push(body.descricao); sets.push(`descricao = $${params.length}`); }
  if (body.status !== undefined) { params.push(body.status); sets.push(`status = $${params.length}`); }
  if (body.categoria !== undefined) { params.push(body.categoria); sets.push(`categoria = $${params.length}`); }
  if (body.metadata !== undefined) { params.push(JSON.stringify(body.metadata)); sets.push(`metadata = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE transacoes SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Transação não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/transacoes/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM transacoes WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Transação não encontrada' }, 404);

  await pool.query('DELETE FROM transacoes WHERE id = $1', [id]);
  return c.json({ ok: true });
});

// ===== CONTAS FINANCEIRAS =====

app.get('/contas', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { tipo, status, dateFrom, dateTo, limit = '50', offset = '0' } = c.req.query();

  const conditions: string[] = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (tipo) { params.push(tipo); conditions.push(`tipo = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (dateFrom) { params.push(dateFrom); conditions.push(`COALESCE(data_vencimento, created_at::date) >= $${params.length}`); }
  if (dateTo) { params.push(dateTo); conditions.push(`COALESCE(data_vencimento, created_at::date) <= $${params.length}`); }

  params.push(Number(limit), Number(offset));
  const result = await pool.query(
    `SELECT * FROM contas_financeiras WHERE ${conditions.join(' AND ')}
     ORDER BY data_vencimento ASC NULLS LAST, created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/contas', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.tipo) return c.json({ error: 'tipo é obrigatório' }, 400);
  if (body.valor == null) return c.json({ error: 'valor é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO contas_financeiras
       (organization_id, tipo, valor, status, descricao, data_vencimento,
        pago_em, patient_id, appointment_id, observacoes, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      String(body.tipo),
      Number(body.valor),
      body.status ?? 'pendente',
      body.descricao ?? null,
      body.data_vencimento ?? null,
      body.pago_em ?? null,
      body.patient_id ?? null,
      body.appointment_id ?? null,
      body.observacoes ?? null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/contas/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.status !== undefined) { params.push(body.status); sets.push(`status = $${params.length}`); }
  if (body.valor !== undefined) { params.push(Number(body.valor)); sets.push(`valor = $${params.length}`); }
  if (body.descricao !== undefined) { params.push(body.descricao); sets.push(`descricao = $${params.length}`); }
  if (body.data_vencimento !== undefined) { params.push(body.data_vencimento); sets.push(`data_vencimento = $${params.length}`); }
  if (body.pago_em !== undefined) { params.push(body.pago_em); sets.push(`pago_em = $${params.length}`); }
  if (body.observacoes !== undefined) { params.push(body.observacoes); sets.push(`observacoes = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE contas_financeiras SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Conta não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/contas/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM contas_financeiras WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Conta não encontrada' }, 404);

  await pool.query('DELETE FROM contas_financeiras WHERE id = $1', [id]);
  return c.json({ ok: true });
});

// ===== CENTROS DE CUSTO =====

app.get('/centros-custo', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { ativo } = c.req.query();

  const conditions: string[] = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (ativo !== undefined) { params.push(ativo === 'true'); conditions.push(`ativo = $${params.length}`); }

  const result = await pool.query(
    `SELECT * FROM centros_custo WHERE ${conditions.join(' AND ')} ORDER BY nome ASC`,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/centros-custo', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO centros_custo
       (organization_id, nome, descricao, codigo, ativo, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      String(body.nome),
      body.descricao ?? null,
      body.codigo ?? null,
      body.ativo !== false,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/centros-custo/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.nome !== undefined) { params.push(body.nome); sets.push(`nome = $${params.length}`); }
  if (body.descricao !== undefined) { params.push(body.descricao); sets.push(`descricao = $${params.length}`); }
  if (body.codigo !== undefined) { params.push(body.codigo); sets.push(`codigo = $${params.length}`); }
  if (body.ativo !== undefined) { params.push(body.ativo); sets.push(`ativo = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE centros_custo SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Centro de custo não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/centros-custo/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM centros_custo WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Centro de custo não encontrado' }, 404);

  await pool.query('DELETE FROM centros_custo WHERE id = $1', [id]);
  return c.json({ ok: true });
});

// ===== EMPRESAS PARCEIRAS =====

app.get('/empresas-parceiras', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);

  if (!(await hasTable(pool, 'empresas_parceiras'))) {
    return c.json({ data: [] });
  }

  const result = await pool.query(
    `SELECT * FROM empresas_parceiras WHERE organization_id = $1 ORDER BY nome ASC`,
    [user.organizationId],
  );
  return c.json({ data: result.rows });
});

app.post('/empresas-parceiras', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO empresas_parceiras
      (organization_id, nome, contato, email, telefone, contrapartidas, observacoes, ativo, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      String(body.nome),
      body.contato ?? null,
      body.email ?? null,
      body.telefone ?? null,
      body.contrapartidas ?? null,
      body.observacoes ?? null,
      body.ativo !== false,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/empresas-parceiras/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.nome !== undefined) { params.push(body.nome); sets.push(`nome = $${params.length}`); }
  if (body.contato !== undefined) { params.push(body.contato); sets.push(`contato = $${params.length}`); }
  if (body.email !== undefined) { params.push(body.email); sets.push(`email = $${params.length}`); }
  if (body.telefone !== undefined) { params.push(body.telefone); sets.push(`telefone = $${params.length}`); }
  if (body.contrapartidas !== undefined) { params.push(body.contrapartidas); sets.push(`contrapartidas = $${params.length}`); }
  if (body.observacoes !== undefined) { params.push(body.observacoes); sets.push(`observacoes = $${params.length}`); }
  if (body.ativo !== undefined) { params.push(body.ativo); sets.push(`ativo = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE empresas_parceiras SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Empresa parceira não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/empresas-parceiras/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    `DELETE FROM empresas_parceiras WHERE id = $1 AND organization_id = $2 RETURNING id`,
    [id, user.organizationId],
  );
  if (!result.rows.length) return c.json({ error: 'Empresa parceira não encontrada' }, 404);
  return c.json({ ok: true });
});

// ===== FORNECEDORES =====

app.get('/fornecedores', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);

  if (!(await hasTable(pool, 'fornecedores'))) {
    return c.json({ data: [] });
  }

  const result = await pool.query(
    `SELECT * FROM fornecedores WHERE organization_id = $1 ORDER BY razao_social ASC`,
    [user.organizationId],
  );
  return c.json({ data: result.rows });
});

app.post('/fornecedores', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.razao_social) return c.json({ error: 'razao_social é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO fornecedores
      (organization_id, tipo_pessoa, razao_social, nome_fantasia, cpf_cnpj, inscricao_estadual, email,
       telefone, celular, endereco, cidade, estado, cep, observacoes, categoria, ativo, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      body.tipo_pessoa ?? 'pj',
      body.razao_social,
      body.nome_fantasia ?? null,
      body.cpf_cnpj ?? null,
      body.inscricao_estadual ?? null,
      body.email ?? null,
      body.telefone ?? null,
      body.celular ?? null,
      body.endereco ?? null,
      body.cidade ?? null,
      body.estado ?? null,
      body.cep ?? null,
      body.observacoes ?? null,
      body.categoria ?? null,
      body.ativo !== false,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/fornecedores/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.tipo_pessoa !== undefined) { params.push(body.tipo_pessoa); sets.push(`tipo_pessoa = $${params.length}`); }
  if (body.razao_social !== undefined) { params.push(body.razao_social); sets.push(`razao_social = $${params.length}`); }
  if (body.nome_fantasia !== undefined) { params.push(body.nome_fantasia); sets.push(`nome_fantasia = $${params.length}`); }
  if (body.cpf_cnpj !== undefined) { params.push(body.cpf_cnpj); sets.push(`cpf_cnpj = $${params.length}`); }
  if (body.inscricao_estadual !== undefined) { params.push(body.inscricao_estadual); sets.push(`inscricao_estadual = $${params.length}`); }
  if (body.email !== undefined) { params.push(body.email); sets.push(`email = $${params.length}`); }
  if (body.telefone !== undefined) { params.push(body.telefone); sets.push(`telefone = $${params.length}`); }
  if (body.celular !== undefined) { params.push(body.celular); sets.push(`celular = $${params.length}`); }
  if (body.endereco !== undefined) { params.push(body.endereco); sets.push(`endereco = $${params.length}`); }
  if (body.cidade !== undefined) { params.push(body.cidade); sets.push(`cidade = $${params.length}`); }
  if (body.estado !== undefined) { params.push(body.estado); sets.push(`estado = $${params.length}`); }
  if (body.cep !== undefined) { params.push(body.cep); sets.push(`cep = $${params.length}`); }
  if (body.observacoes !== undefined) { params.push(body.observacoes); sets.push(`observacoes = $${params.length}`); }
  if (body.categoria !== undefined) { params.push(body.categoria); sets.push(`categoria = $${params.length}`); }
  if (body.ativo !== undefined) { params.push(body.ativo); sets.push(`ativo = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE fornecedores SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Fornecedor não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/fornecedores/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    `DELETE FROM fornecedores WHERE id = $1 AND organization_id = $2 RETURNING id`,
    [id, user.organizationId],
  );
  if (!result.rows.length) return c.json({ error: 'Fornecedor não encontrado' }, 404);
  return c.json({ ok: true });
});

// ===== FORMAS DE PAGAMENTO =====

app.get('/formas-pagamento', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);

  if (!(await hasTable(pool, 'formas_pagamento'))) {
    return c.json({ data: [] });
  }

  const result = await pool.query(
    `SELECT * FROM formas_pagamento WHERE organization_id = $1 ORDER BY nome ASC`,
    [user.organizationId],
  );
  return c.json({ data: result.rows });
});

app.post('/formas-pagamento', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO formas_pagamento
      (organization_id, nome, tipo, taxa_percentual, dias_recebimento, ativo, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      body.nome,
      body.tipo ?? 'geral',
      body.taxa_percentual != null ? Number(body.taxa_percentual) : 0,
      body.dias_recebimento != null ? Number(body.dias_recebimento) : 0,
      body.ativo !== false,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/formas-pagamento/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.nome !== undefined) { params.push(body.nome); sets.push(`nome = $${params.length}`); }
  if (body.tipo !== undefined) { params.push(body.tipo); sets.push(`tipo = $${params.length}`); }
  if (body.taxa_percentual !== undefined) { params.push(Number(body.taxa_percentual)); sets.push(`taxa_percentual = $${params.length}`); }
  if (body.dias_recebimento !== undefined) { params.push(Number(body.dias_recebimento)); sets.push(`dias_recebimento = $${params.length}`); }
  if (body.ativo !== undefined) { params.push(body.ativo); sets.push(`ativo = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE formas_pagamento SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Forma de pagamento não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/formas-pagamento/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    `DELETE FROM formas_pagamento WHERE id = $1 AND organization_id = $2 RETURNING id`,
    [id, user.organizationId],
  );
  if (!result.rows.length) return c.json({ error: 'Forma de pagamento não encontrada' }, 404);
  return c.json({ ok: true });
});

// ===== CONVENIOS =====

app.get('/convenios', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { ativo } = c.req.query();

  const conditions: string[] = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (ativo !== undefined) { params.push(ativo === 'true'); conditions.push(`ativo = $${params.length}`); }

  const result = await pool.query(
    `SELECT * FROM convenios WHERE ${conditions.join(' AND ')} ORDER BY nome ASC`,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/convenios', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO convenios
       (organization_id, nome, cnpj, telefone, email, contato_responsavel,
        valor_repasse, prazo_pagamento_dias, observacoes, ativo, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      String(body.nome),
      body.cnpj ?? null,
      body.telefone ?? null,
      body.email ?? null,
      body.contato_responsavel ?? null,
      body.valor_repasse != null ? Number(body.valor_repasse) : null,
      body.prazo_pagamento_dias != null ? Number(body.prazo_pagamento_dias) : null,
      body.observacoes ?? null,
      body.ativo !== false,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/convenios/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.nome !== undefined) { params.push(body.nome); sets.push(`nome = $${params.length}`); }
  if (body.cnpj !== undefined) { params.push(body.cnpj); sets.push(`cnpj = $${params.length}`); }
  if (body.telefone !== undefined) { params.push(body.telefone); sets.push(`telefone = $${params.length}`); }
  if (body.email !== undefined) { params.push(body.email); sets.push(`email = $${params.length}`); }
  if (body.contato_responsavel !== undefined) { params.push(body.contato_responsavel); sets.push(`contato_responsavel = $${params.length}`); }
  if (body.valor_repasse !== undefined) { params.push(Number(body.valor_repasse)); sets.push(`valor_repasse = $${params.length}`); }
  if (body.prazo_pagamento_dias !== undefined) { params.push(Number(body.prazo_pagamento_dias)); sets.push(`prazo_pagamento_dias = $${params.length}`); }
  if (body.observacoes !== undefined) { params.push(body.observacoes); sets.push(`observacoes = $${params.length}`); }
  if (body.ativo !== undefined) { params.push(body.ativo); sets.push(`ativo = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE convenios SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Convênio não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/convenios/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM convenios WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Convênio não encontrado' }, 404);

  await pool.query('DELETE FROM convenios WHERE id = $1', [id]);
  return c.json({ ok: true });
});

// ===== PAGAMENTOS =====

app.get('/pagamentos', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { eventoId, patientId, appointmentId, dateFrom, dateTo, limit = '50', offset = '0' } = c.req.query();

  const conditions: string[] = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (eventoId) { params.push(eventoId); conditions.push(`evento_id = $${params.length}`); }
  if (patientId) { params.push(patientId); conditions.push(`patient_id = $${params.length}`); }
  if (appointmentId) { params.push(appointmentId); conditions.push(`appointment_id = $${params.length}`); }
  if (dateFrom) { params.push(dateFrom); conditions.push(`COALESCE(pago_em, created_at::date) >= $${params.length}`); }
  if (dateTo) { params.push(dateTo); conditions.push(`COALESCE(pago_em, created_at::date) <= $${params.length}`); }

  params.push(Number(limit), Number(offset));
  const result = await pool.query(
    `SELECT * FROM pagamentos WHERE ${conditions.join(' AND ')}
     ORDER BY pago_em DESC NULLS LAST, created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/pagamentos', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (body.valor == null) return c.json({ error: 'valor é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO pagamentos
       (organization_id, evento_id, appointment_id, valor, forma_pagamento,
        pago_em, observacoes, patient_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      body.evento_id ?? null,
      body.appointment_id ?? null,
      Number(body.valor),
      body.forma_pagamento ?? null,
      body.pago_em ?? null,
      body.observacoes ?? null,
      body.patient_id ?? null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/pagamentos/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.valor !== undefined) { params.push(Number(body.valor)); sets.push(`valor = $${params.length}`); }
  if (body.forma_pagamento !== undefined) { params.push(body.forma_pagamento); sets.push(`forma_pagamento = $${params.length}`); }
  if (body.pago_em !== undefined) { params.push(body.pago_em); sets.push(`pago_em = $${params.length}`); }
  if (body.observacoes !== undefined) { params.push(body.observacoes); sets.push(`observacoes = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE pagamentos SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Pagamento não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/pagamentos/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM pagamentos WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Pagamento não encontrado' }, 404);

  await pool.query('DELETE FROM pagamentos WHERE id = $1', [id]);
  return c.json({ ok: true });
});

// ===== PACOTES DE PACIENTES =====

app.get('/patient-packages', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { patientId, status, limit = '100', offset = '0' } = c.req.query();

  const conditions: string[] = ['p.organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (patientId) {
    params.push(patientId);
    conditions.push(`pp.patient_id = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`pp.status = $${params.length}`);
  }

  params.push(Number(limit), Number(offset));
  const result = await pool.query(
    `SELECT
        pp.id,
        pp.patient_id,
        pp.name,
        pp.total_sessions,
        pp.used_sessions,
        pp.remaining_sessions,
        pp.price,
        pp.status,
        pp.purchased_at,
        pp.expires_at,
        pp.created_at,
        p.full_name AS patient_name,
        p.phone AS patient_phone
     FROM patient_packages pp
     INNER JOIN patients p ON p.id = pp.patient_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY pp.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return c.json({ data: result.rows });
});

export { app as financialRoutes };
