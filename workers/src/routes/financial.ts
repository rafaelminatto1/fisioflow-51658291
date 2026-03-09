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

app.get('/package-templates', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);

  const result = await pool.query(
    `
      SELECT *
      FROM session_package_templates
      WHERE organization_id = $1
      ORDER BY sessions_count ASC, created_at DESC
    `,
    [user.organizationId],
  );

  return c.json({ data: result.rows });
});

app.post('/package-templates', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.name || !body.sessions_count || !body.price) {
    return c.json({ error: 'name, sessions_count e price são obrigatórios' }, 400);
  }

  const result = await pool.query(
    `
      INSERT INTO session_package_templates (
        organization_id, name, description, sessions_count, price, validity_days, is_active, created_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      String(body.name),
      body.description ? String(body.description) : null,
      Number(body.sessions_count),
      Number(body.price),
      Number(body.validity_days ?? 365),
      body.is_active !== undefined ? Boolean(body.is_active) : true,
      user.uid,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/package-templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.name !== undefined) { params.push(String(body.name)); sets.push(`name = $${params.length}`); }
  if (body.description !== undefined) { params.push(body.description ? String(body.description) : null); sets.push(`description = $${params.length}`); }
  if (body.sessions_count !== undefined) { params.push(Number(body.sessions_count)); sets.push(`sessions_count = $${params.length}`); }
  if (body.price !== undefined) { params.push(Number(body.price)); sets.push(`price = $${params.length}`); }
  if (body.validity_days !== undefined) { params.push(Number(body.validity_days)); sets.push(`validity_days = $${params.length}`); }
  if (body.is_active !== undefined) { params.push(Boolean(body.is_active)); sets.push(`is_active = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE session_package_templates SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );

  if (!result.rows.length) return c.json({ error: 'Pacote não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/package-templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  await pool.query(
    'DELETE FROM session_package_templates WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  return c.json({ ok: true });
});

app.get('/patient-packages', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { patientId, status, limit = '100', offset = '0' } = c.req.query();

  const conditions: string[] = ['pp.organization_id = $1'];
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
        pp.package_template_id,
        pp.name,
        pp.total_sessions,
        pp.used_sessions,
        pp.remaining_sessions,
        pp.price,
        pp.payment_method,
        pp.status,
        pp.purchased_at,
        pp.expires_at,
        pp.last_used_at,
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

app.post('/patient-packages', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const patientId = String(body.patient_id ?? '').trim();
  const packageTemplateId = body.package_id ? String(body.package_id) : null;
  if (!patientId) return c.json({ error: 'patient_id é obrigatório' }, 400);

  let template: Record<string, unknown> | null = null;
  if (packageTemplateId) {
    const templateResult = await pool.query(
      'SELECT * FROM session_package_templates WHERE id = $1 AND organization_id = $2',
      [packageTemplateId, user.organizationId],
    );
    template = (templateResult.rows[0] as Record<string, unknown> | undefined) ?? null;
    if (!template) return c.json({ error: 'Template de pacote não encontrado' }, 404);
  }

  const totalSessions = Number(body.custom_sessions ?? template?.sessions_count ?? 0);
  const price = Number(body.custom_price ?? template?.price ?? 0);
  const validityDays = Number(template?.validity_days ?? body.validity_days ?? 365);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validityDays);

  const result = await pool.query(
    `
      INSERT INTO patient_packages (
        organization_id, patient_id, package_template_id, name, total_sessions, used_sessions,
        remaining_sessions, price, payment_method, status, purchased_at, expires_at, created_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,0,$5,$6,$7,'active',NOW(),$8,$9,NOW(),NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      patientId,
      packageTemplateId,
      String(template?.name ?? body.name ?? 'Pacote Avulso'),
      totalSessions,
      price,
      body.payment_method ? String(body.payment_method) : null,
      expiresAt.toISOString(),
      user.uid,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.post('/patient-packages/:id/consume', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const currentResult = await pool.query(
    'SELECT * FROM patient_packages WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );

  const current = currentResult.rows[0] as Record<string, unknown> | undefined;
  if (!current) return c.json({ error: 'Pacote não encontrado' }, 404);
  if (String(current.status ?? 'active') !== 'active') return c.json({ error: 'Pacote não está ativo' }, 400);
  if (current.expires_at && new Date(String(current.expires_at)) < new Date()) {
    return c.json({ error: 'Pacote expirado' }, 400);
  }
  if (Number(current.remaining_sessions ?? 0) <= 0) {
    return c.json({ error: 'Sem sessões disponíveis neste pacote' }, 400);
  }

  const updated = await pool.query(
    `
      UPDATE patient_packages
      SET
        used_sessions = used_sessions + 1,
        remaining_sessions = remaining_sessions - 1,
        last_used_at = NOW(),
        status = CASE WHEN remaining_sessions - 1 <= 0 THEN 'depleted' ELSE status END,
        updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `,
    [id, user.organizationId],
  );

  await pool.query(
    `
      INSERT INTO package_usage (
        organization_id, patient_package_id, patient_id, appointment_id, used_at, created_by
      ) VALUES ($1,$2,$3,$4,NOW(),$5)
    `,
    [
      user.organizationId,
      id,
      String(current.patient_id),
      body.appointmentId ? String(body.appointmentId) : null,
      user.uid,
    ],
  );

  return c.json({ data: updated.rows[0] });
});

// ===== VOUCHERS =====

app.get('/vouchers', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { all, ativo } = c.req.query();
  const conditions: string[] = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (all !== 'true') {
    params.push(ativo === undefined ? true : ativo === 'true');
    conditions.push(`ativo = $${params.length}`);
  } else if (ativo !== undefined) {
    params.push(ativo === 'true');
    conditions.push(`ativo = $${params.length}`);
  }

  const result = await pool.query(
    `
      SELECT *
      FROM vouchers
      WHERE ${conditions.join(' AND ')}
      ORDER BY preco ASC, created_at DESC
    `,
    params,
  );

  return c.json({ data: result.rows });
});

app.post('/vouchers', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);
  if (!body.tipo) return c.json({ error: 'tipo é obrigatório' }, 400);
  if (body.preco == null) return c.json({ error: 'preco é obrigatório' }, 400);

  const result = await pool.query(
    `
      INSERT INTO vouchers (
        organization_id, nome, descricao, tipo, sessoes, validade_dias, preco, ativo, stripe_price_id, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      String(body.nome),
      body.descricao ? String(body.descricao) : null,
      String(body.tipo),
      body.sessoes != null ? Number(body.sessoes) : null,
      Number(body.validade_dias ?? 30),
      Number(body.preco),
      body.ativo !== undefined ? Boolean(body.ativo) : true,
      body.stripe_price_id ? String(body.stripe_price_id) : null,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/vouchers/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.nome !== undefined) { params.push(String(body.nome)); sets.push(`nome = $${params.length}`); }
  if (body.descricao !== undefined) { params.push(body.descricao ? String(body.descricao) : null); sets.push(`descricao = $${params.length}`); }
  if (body.tipo !== undefined) { params.push(String(body.tipo)); sets.push(`tipo = $${params.length}`); }
  if (body.sessoes !== undefined) { params.push(body.sessoes != null ? Number(body.sessoes) : null); sets.push(`sessoes = $${params.length}`); }
  if (body.validade_dias !== undefined) { params.push(Number(body.validade_dias)); sets.push(`validade_dias = $${params.length}`); }
  if (body.preco !== undefined) { params.push(Number(body.preco)); sets.push(`preco = $${params.length}`); }
  if (body.ativo !== undefined) { params.push(Boolean(body.ativo)); sets.push(`ativo = $${params.length}`); }
  if (body.stripe_price_id !== undefined) { params.push(body.stripe_price_id ? String(body.stripe_price_id) : null); sets.push(`stripe_price_id = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `
      UPDATE vouchers
      SET ${sets.join(', ')}
      WHERE id = $${params.length - 1} AND organization_id = $${params.length}
      RETURNING *
    `,
    params,
  );

  if (!result.rows.length) return c.json({ error: 'Voucher não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/vouchers/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  await pool.query('DELETE FROM vouchers WHERE id = $1 AND organization_id = $2', [id, user.organizationId]);
  return c.json({ ok: true });
});

app.get('/user-vouchers', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const result = await pool.query(
    `
      SELECT
        uv.*,
        row_to_json(v) AS voucher
      FROM user_vouchers uv
      INNER JOIN vouchers v ON v.id = uv.voucher_id
      WHERE uv.user_id = $1 AND uv.organization_id = $2
      ORDER BY uv.data_compra DESC
    `,
    [user.uid, user.organizationId],
  );

  return c.json({ data: result.rows });
});

app.post('/user-vouchers/:id/consume', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const currentResult = await pool.query(
    `
      SELECT *
      FROM user_vouchers
      WHERE id = $1 AND user_id = $2 AND organization_id = $3
      LIMIT 1
    `,
    [id, user.uid, user.organizationId],
  );

  const current = currentResult.rows[0] as Record<string, unknown> | undefined;
  if (!current) return c.json({ error: 'Voucher não encontrado' }, 404);
  if (!Boolean(current.ativo)) return c.json({ error: 'Voucher inativo' }, 400);
  if (new Date(String(current.data_expiracao)) < new Date()) return c.json({ error: 'Voucher expirado' }, 400);
  if (Number(current.sessoes_restantes ?? 0) <= 0) return c.json({ error: 'Voucher sem sessões disponíveis' }, 400);

  const updated = await pool.query(
    `
      UPDATE user_vouchers
      SET
        sessoes_restantes = sessoes_restantes - 1,
        ativo = CASE WHEN sessoes_restantes - 1 <= 0 THEN false ELSE ativo END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [id],
  );

  return c.json({ data: updated.rows[0] });
});

app.post('/vouchers/:id/checkout', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const voucherResult = await pool.query(
    `
      SELECT *
      FROM vouchers
      WHERE id = $1 AND organization_id = $2 AND ativo = true
      LIMIT 1
    `,
    [id, user.organizationId],
  );

  const voucher = voucherResult.rows[0] as Record<string, unknown> | undefined;
  if (!voucher) return c.json({ error: 'Voucher não encontrado' }, 404);

  const checkoutResult = await pool.query(
    `
      INSERT INTO voucher_checkout_sessions (
        organization_id, user_id, voucher_id, amount, status, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,'pending',NOW(),NOW())
      RETURNING *
    `,
    [user.organizationId, user.uid, id, Number(voucher.preco ?? 0)],
  );

  const checkout = checkoutResult.rows[0];
  return c.json({
    data: {
      sessionId: checkout.id,
      url: `/vouchers?session_id=${checkout.id}`,
    },
  });
});

app.post('/vouchers/checkout/verify', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const sessionId = String(body.sessionId ?? '').trim();

  if (!sessionId) return c.json({ error: 'sessionId é obrigatório' }, 400);

  const checkoutResult = await pool.query(
    `
      SELECT vcs.*, v.sessoes, v.validade_dias
      FROM voucher_checkout_sessions vcs
      INNER JOIN vouchers v ON v.id = vcs.voucher_id
      WHERE vcs.id = $1 AND vcs.user_id = $2 AND vcs.organization_id = $3
      LIMIT 1
    `,
    [sessionId, user.uid, user.organizationId],
  );

  const checkout = checkoutResult.rows[0] as Record<string, unknown> | undefined;
  if (!checkout) return c.json({ error: 'Sessão de checkout não encontrada' }, 404);

  if (checkout.status === 'paid' && checkout.user_voucher_id) {
    return c.json({ data: { success: true, userVoucherId: checkout.user_voucher_id } });
  }

  const expiration = new Date();
  expiration.setDate(expiration.getDate() + Number(checkout.validade_dias ?? 30));

  const userVoucherResult = await pool.query(
    `
      INSERT INTO user_vouchers (
        organization_id, user_id, voucher_id, sessoes_restantes, sessoes_totais,
        data_compra, data_expiracao, ativo, valor_pago, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$4,NOW(),$5,true,$6,NOW(),NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      user.uid,
      checkout.voucher_id,
      Number(checkout.sessoes ?? 0),
      expiration.toISOString(),
      Number(checkout.amount ?? 0),
    ],
  );

  const userVoucher = userVoucherResult.rows[0];

  await pool.query(
    `
      UPDATE voucher_checkout_sessions
      SET status = 'paid', user_voucher_id = $2, updated_at = NOW()
      WHERE id = $1
    `,
    [sessionId, userVoucher.id],
  );

  return c.json({ data: { success: true, userVoucherId: userVoucher.id } });
});

app.get('/nfse', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);

  const result = await pool.query(
    `
      SELECT *
      FROM nfse
      WHERE organization_id = $1
      ORDER BY data_emissao DESC, created_at DESC
    `,
    [user.organizationId],
  );

  return c.json({ data: result.rows });
});

app.post('/nfse', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.numero) return c.json({ error: 'numero é obrigatório' }, 400);
  if (body.valor == null) return c.json({ error: 'valor é obrigatório' }, 400);

  const result = await pool.query(
    `
      INSERT INTO nfse (
        organization_id, numero, serie, tipo, valor, data_emissao, data_prestacao,
        destinatario, prestador, servico, status, chave_acesso, protocolo, verificacao,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW()
      )
      RETURNING *
    `,
    [
      user.organizationId,
      String(body.numero),
      body.serie ?? '1',
      body.tipo ?? 'saida',
      Number(body.valor),
      body.data_emissao ?? new Date().toISOString(),
      body.data_prestacao,
      JSON.stringify(body.destinatario ?? {}),
      JSON.stringify(body.prestador ?? {}),
      JSON.stringify(body.servico ?? {}),
      body.status ?? 'rascunho',
      body.chave_acesso ?? null,
      body.protocolo ?? null,
      body.verificacao ?? null,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/nfse/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (body.numero !== undefined) assign('numero', body.numero);
  if (body.serie !== undefined) assign('serie', body.serie);
  if (body.tipo !== undefined) assign('tipo', body.tipo);
  if (body.valor !== undefined) assign('valor', Number(body.valor));
  if (body.data_emissao !== undefined) assign('data_emissao', body.data_emissao);
  if (body.data_prestacao !== undefined) assign('data_prestacao', body.data_prestacao);
  if (body.destinatario !== undefined) assign('destinatario', JSON.stringify(body.destinatario ?? {}));
  if (body.prestador !== undefined) assign('prestador', JSON.stringify(body.prestador ?? {}));
  if (body.servico !== undefined) assign('servico', JSON.stringify(body.servico ?? {}));
  if (body.status !== undefined) assign('status', body.status);
  if (body.chave_acesso !== undefined) assign('chave_acesso', body.chave_acesso ?? null);
  if (body.protocolo !== undefined) assign('protocolo', body.protocolo ?? null);
  if (body.verificacao !== undefined) assign('verificacao', body.verificacao ?? null);

  params.push(id, user.organizationId);
  const result = await pool.query(
    `
      UPDATE nfse
      SET ${sets.join(', ')}
      WHERE id = $${params.length - 1} AND organization_id = $${params.length}
      RETURNING *
    `,
    params,
  );

  if (!result.rows.length) return c.json({ error: 'NFSe não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/nfse/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    'DELETE FROM nfse WHERE id = $1 AND organization_id = $2 RETURNING id',
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'NFSe não encontrada' }, 404);
  return c.json({ ok: true });
});

app.get('/nfse-config', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);

  const result = await pool.query(
    'SELECT * FROM nfse_config WHERE organization_id = $1 LIMIT 1',
    [user.organizationId],
  );

  return c.json({ data: result.rows[0] ?? null });
});

app.put('/nfse-config', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const result = await pool.query(
    `
      INSERT INTO nfse_config (
        organization_id, ambiente, municipio_codigo, cnpj_prestador, inscricao_municipal,
        aliquota_iss, auto_emissao, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
      ON CONFLICT (organization_id) DO UPDATE SET
        ambiente = EXCLUDED.ambiente,
        municipio_codigo = EXCLUDED.municipio_codigo,
        cnpj_prestador = EXCLUDED.cnpj_prestador,
        inscricao_municipal = EXCLUDED.inscricao_municipal,
        aliquota_iss = EXCLUDED.aliquota_iss,
        auto_emissao = EXCLUDED.auto_emissao,
        updated_at = NOW()
      RETURNING *
    `,
    [
      user.organizationId,
      body.ambiente ?? 'homologacao',
      body.municipio_codigo ?? null,
      body.cnpj_prestador ?? null,
      body.inscricao_municipal ?? null,
      body.aliquota_iss ?? 5,
      body.auto_emissao ?? false,
    ],
  );

  return c.json({ data: result.rows[0] });
});

export { app as financialRoutes };
