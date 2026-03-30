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
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { 
  transacoes, 
  contasFinanceiras, 
  centrosCusto,
  convenios,
  pagamentos,
  empresasParceiras,
  fornecedores,
  formasPagamento,
  sessionPackageTemplates,
  patientPackages,
  packageUsage,
  appointments,
  patients,
} from '@fisioflow/db';
import { createDb, createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';
import { registerFinancialCommerceRoutes } from './financial-commerce';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ===== TRANSACOES =====

app.get('/transacoes', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { tipo, status, dateFrom, dateTo, limit = '50', offset = '0' } = c.req.query();

  try {
    const filters = [eq(transacoes.organizationId, user.organizationId)];

    if (tipo) filters.push(eq(transacoes.tipo, tipo));
    if (status) filters.push(eq(transacoes.status, status));
    if (dateFrom) filters.push(gte(transacoes.createdAt, new Date(dateFrom)));
    if (dateTo) filters.push(lte(transacoes.createdAt, new Date(dateTo)));

    const result = await db.select().from(transacoes)
      .where(and(...filters))
      .orderBy(desc(transacoes.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/Transactions] Drizzle error:', e);
    return c.json({ data: [] });
  }
});

app.post('/transacoes', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const body = (await c.req.json()) as any;

  if (!body.tipo) return c.json({ error: 'tipo é obrigatório' }, 400);
  if (body.valor == null) return c.json({ error: 'valor é obrigatório' }, 400);

  try {
    const [result] = await db.insert(transacoes)
      .values({
        organizationId: user.organizationId,
        userId: body.user_id ?? user.uid,
        tipo: String(body.tipo),
        valor: String(body.valor), // numeric is string in drizzle
        descricao: body.descricao ?? null,
        status: body.status ?? 'pendente',
        categoria: body.categoria ?? null,
        stripePaymentIntentId: body.stripe_payment_intent_id ?? null,
        stripeRefundId: body.stripe_refund_id ?? null,
        metadata: body.metadata ?? {},
      })
      .returning();

    return c.json({ data: result }, 201);
  } catch (e) {
    console.error('[Financial/Transactions] Insert error:', e);
    return c.json({ error: 'Erro ao criar transação' }, 500);
  }
});

app.put('/transacoes/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as any;

  try {
    const [result] = await db.update(transacoes)
      .set({
        tipo: body.tipo !== undefined ? String(body.tipo) : undefined,
        valor: body.valor !== undefined ? String(body.valor) : undefined,
        descricao: body.descricao !== undefined ? body.descricao : undefined,
        status: body.status !== undefined ? body.status : undefined,
        categoria: body.categoria !== undefined ? body.categoria : undefined,
        metadata: body.metadata !== undefined ? body.metadata : undefined,
        updatedAt: new Date(),
      })
      .where(and(
        eq(transacoes.id, id),
        eq(transacoes.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Transação não encontrada' }, 404);
    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/Transactions] Update error:', e);
    return c.json({ error: 'Erro ao atualizar transação' }, 500);
  }
});

app.delete('/transacoes/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();

  try {
    const [result] = await db.delete(transacoes)
      .where(and(
        eq(transacoes.id, id),
        eq(transacoes.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Transação não encontrada' }, 404);
    return c.json({ ok: true });
  } catch (e) {
    console.error('[Financial/Transactions] Delete error:', e);
    return c.json({ error: 'Erro ao deletar transação' }, 500);
  }
});

// ===== CONTAS FINANCEIRAS =====

app.get('/contas', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { tipo, status, dateFrom, dateTo, limit = '50', offset = '0', patientId } = c.req.query();
 
  try {
    const filters = [eq(contasFinanceiras.organizationId, user.organizationId)];
   
    if (tipo) filters.push(eq(contasFinanceiras.tipo, tipo));
    if (status) filters.push(eq(contasFinanceiras.status, status));
    if (dateFrom) filters.push(sql`COALESCE(${contasFinanceiras.dataVencimento}, ${contasFinanceiras.createdAt}::date) >= ${dateFrom}`);
    if (dateTo) filters.push(sql`COALESCE(${contasFinanceiras.dataVencimento}, ${contasFinanceiras.createdAt}::date) <= ${dateTo}`);
    if (patientId) filters.push(eq(contasFinanceiras.patientId, patientId));

    const result = await db.select({
      id: contasFinanceiras.id,
      organizationId: contasFinanceiras.organizationId,
      tipo: contasFinanceiras.tipo,
      valor: contasFinanceiras.valor,
      status: contasFinanceiras.status,
      descricao: contasFinanceiras.descricao,
      data_vencimento: contasFinanceiras.dataVencimento,
      pago_em: contasFinanceiras.pagoEm,
      patient_id: contasFinanceiras.patientId,
      appointment_id: contasFinanceiras.appointmentId,
      categoria: contasFinanceiras.categoria,
      forma_pagamento: contasFinanceiras.formaPagamento,
      observacoes: contasFinanceiras.observacoes,
      created_at: contasFinanceiras.createdAt,
      updated_at: contasFinanceiras.updatedAt,
      patient_name: sql<string | null>`p.full_name`
    })
    .from(contasFinanceiras)
    .leftJoin(sql`patients p`, sql`p.id = ${contasFinanceiras.patientId}`)
    .where(and(...filters))
    .orderBy(sql`${contasFinanceiras.dataVencimento} ASC NULLS LAST`, desc(contasFinanceiras.createdAt))
    .limit(Number(limit))
    .offset(Number(offset));

    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/Contas] Drizzle error:', e);
    return c.json({ data: [] });
  }
});

app.post('/contas', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const body = (await c.req.json()) as any;
 
  if (!body.tipo) return c.json({ error: 'tipo é obrigatório' }, 400);
  if (body.valor == null) return c.json({ error: 'valor é obrigatório' }, 400);
 
  try {
    const [result] = await db.insert(contasFinanceiras)
      .values({
        organizationId: user.organizationId,
        tipo: String(body.tipo),
        valor: String(body.valor),
        status: body.status ?? 'pendente',
        descricao: body.descricao ?? null,
        dataVencimento: body.data_vencimento ?? null,
        pagoEm: body.pago_em ?? null,
        patientId: body.patient_id ?? null,
        appointmentId: body.appointment_id ?? null,
        categoria: body.categoria ?? null,
        formaPagamento: body.forma_pagamento ?? null,
        observacoes: body.observacoes ?? null,
      })
      .returning();

    return c.json({ data: result }, 201);
  } catch (e) {
    console.error('[Financial/Contas] Insert error:', e);
    return c.json({ error: 'Erro ao criar conta' }, 500);
  }
});

app.put('/contas/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as any;
 
  try {
    const [result] = await db.update(contasFinanceiras)
      .set({
        status: body.status !== undefined ? body.status : undefined,
        valor: body.valor !== undefined ? String(body.valor) : undefined,
        descricao: body.descricao !== undefined ? body.descricao : undefined,
        dataVencimento: body.data_vencimento !== undefined ? body.data_vencimento : undefined,
        pagoEm: body.pago_em !== undefined ? body.pago_em : undefined,
        observacoes: body.observacoes !== undefined ? body.observacoes : undefined,
        formaPagamento: body.forma_pagamento !== undefined ? body.forma_pagamento : undefined,
        categoria: body.categoria !== undefined ? body.categoria : undefined,
        updatedAt: new Date(),
      })
      .where(and(
        eq(contasFinanceiras.id, id),
        eq(contasFinanceiras.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Conta não encontrada' }, 404);
    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/Contas] Update error:', e);
    return c.json({ error: 'Erro ao atualizar conta' }, 500);
  }
});

app.delete('/contas/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();

  try {
    const [result] = await db.delete(contasFinanceiras)
      .where(and(
        eq(contasFinanceiras.id, id),
        eq(contasFinanceiras.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Conta não encontrada' }, 404);
    return c.json({ ok: true });
  } catch (e) {
    console.error('[Financial/Contas] Delete error:', e);
    return c.json({ error: 'Erro ao deletar conta' }, 500);
  }
});

// ===== CENTROS DE CUSTO =====

app.get('/centros-custo', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { ativo } = c.req.query();

  try {
    const filters = [eq(centrosCusto.organizationId, user.organizationId)];
    if (ativo !== undefined) filters.push(eq(centrosCusto.ativo, ativo));

    const result = await db.select().from(centrosCusto)
      .where(and(...filters))
      .orderBy(centrosCusto.nome);

    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/CentrosCusto] Drizzle error:', e);
    return c.json({ data: [] });
  }
});

app.post('/centros-custo', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const body = (await c.req.json()) as any;

  if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);

  try {
    const [result] = await db.insert(centrosCusto)
      .values({
        organizationId: user.organizationId,
        nome: String(body.nome),
        descricao: body.descricao ?? null,
        codigo: body.codigo ?? null,
        ativo: body.ativo !== undefined ? String(body.ativo) : 'true',
      })
      .returning();

    return c.json({ data: result }, 201);
  } catch (e) {
    console.error('[Financial/CentrosCusto] Insert error:', e);
    return c.json({ error: 'Erro ao criar centro de custo' }, 500);
  }
});

app.put('/centros-custo/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as any;

  try {
    const [result] = await db.update(centrosCusto)
      .set({
        nome: body.nome !== undefined ? String(body.nome) : undefined,
        descricao: body.descricao !== undefined ? body.descricao : undefined,
        codigo: body.codigo !== undefined ? body.codigo : undefined,
        ativo: body.ativo !== undefined ? String(body.ativo) : undefined,
        updatedAt: new Date(),
      })
      .where(and(
        eq(centrosCusto.id, id),
        eq(centrosCusto.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Centro de custo não encontrado' }, 404);
    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/CentrosCusto] Update error:', e);
    return c.json({ error: 'Erro ao atualizar centro de custo' }, 500);
  }
});

app.delete('/centros-custo/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();

  try {
    const [result] = await db.delete(centrosCusto)
      .where(and(
        eq(centrosCusto.id, id),
        eq(centrosCusto.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Centro de custo não encontrado' }, 404);
    return c.json({ ok: true });
  } catch (e) {
    console.error('[Financial/CentrosCusto] Delete error:', e);
    return c.json({ error: 'Erro ao deletar centro de custo' }, 500);
  }
});

// ===== EMPRESAS PARCEIRAS =====

app.get('/empresas-parceiras', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);

  try {
    const result = await db.select().from(empresasParceiras)
      .where(eq(empresasParceiras.organizationId, user.organizationId))
      .orderBy(empresasParceiras.nome);

    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/EmpresasParceiras] Drizzle error:', e);
    return c.json({ data: [] });
  }
});

app.post('/empresas-parceiras', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const body = (await c.req.json()) as any;

  if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);

  try {
    const [result] = await db.insert(empresasParceiras)
      .values({
        organizationId: user.organizationId,
        nome: String(body.nome),
        contato: body.contato ?? null,
        email: body.email ?? null,
        telefone: body.telefone ?? null,
        contrapartidas: body.contrapartidas ?? null,
        observacoes: body.observacoes ?? null,
        ativo: body.ativo !== undefined ? String(body.ativo) : 'true',
      })
      .returning();

    return c.json({ data: result }, 201);
  } catch (e) {
    console.error('[Financial/EmpresasParceiras] Insert error:', e);
    return c.json({ error: 'Erro ao criar empresa parceira' }, 500);
  }
});

app.put('/empresas-parceiras/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as any;

  try {
    const [result] = await db.update(empresasParceiras)
      .set({
        nome: body.nome !== undefined ? String(body.nome) : undefined,
        contato: body.contato !== undefined ? body.contato : undefined,
        email: body.email !== undefined ? body.email : undefined,
        telefone: body.telefone !== undefined ? body.telefone : undefined,
        contrapartidas: body.contrapartidas !== undefined ? body.contrapartidas : undefined,
        observacoes: body.observacoes !== undefined ? body.observacoes : undefined,
        ativo: body.ativo !== undefined ? String(body.ativo) : undefined,
        updatedAt: new Date(),
      })
      .where(and(
        eq(empresasParceiras.id, id),
        eq(empresasParceiras.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Empresa parceira não encontrada' }, 404);
    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/EmpresasParceiras] Update error:', e);
    return c.json({ error: 'Erro ao atualizar empresa parceira' }, 500);
  }
});

app.delete('/empresas-parceiras/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();

  try {
    const [result] = await db.delete(empresasParceiras)
      .where(and(
        eq(empresasParceiras.id, id),
        eq(empresasParceiras.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Empresa parceira não encontrada' }, 404);
    return c.json({ ok: true });
  } catch (e) {
    console.error('[Financial/EmpresasParceiras] Delete error:', e);
    return c.json({ error: 'Erro ao deletar empresa parceira' }, 500);
  }
});

// ===== FORNECEDORES =====

app.get('/fornecedores', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);

  try {
    const result = await db.select().from(fornecedores)
      .where(eq(fornecedores.organizationId, user.organizationId))
      .orderBy(fornecedores.razaoSocial);

    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/Fornecedores] Drizzle error:', e);
    return c.json({ data: [] });
  }
});

app.post('/fornecedores', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const body = (await c.req.json()) as any;

  if (!body.razao_social) return c.json({ error: 'razao_social é obrigatório' }, 400);

  try {
    const [result] = await db.insert(fornecedores)
      .values({
        organizationId: user.organizationId,
        tipoPessoa: body.tipo_pessoa ?? 'pj',
        razaoSocial: body.razao_social,
        nomeFantasia: body.nome_fantasia ?? null,
        cpfCnpj: body.cpf_cnpj ?? null,
        inscricaoEstadual: body.inscricao_estadual ?? null,
        email: body.email ?? null,
        telefone: body.telefone ?? null,
        celular: body.celular ?? null,
        endereco: body.endereco ?? null,
        cidade: body.cidade ?? null,
        estado: body.estado ?? null,
        cep: body.cep ?? null,
        observacoes: body.observacoes ?? null,
        categoria: body.categoria ?? null,
        ativo: body.ativo !== undefined ? String(body.ativo) : 'true',
      })
      .returning();

    return c.json({ data: result }, 201);
  } catch (e) {
    console.error('[Financial/Fornecedores] Insert error:', e);
    return c.json({ error: 'Erro ao criar fornecedor' }, 500);
  }
});

app.put('/fornecedores/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as any;

  try {
    const [result] = await db.update(fornecedores)
      .set({
        tipoPessoa: body.tipo_pessoa !== undefined ? body.tipo_pessoa : undefined,
        razaoSocial: body.razao_social !== undefined ? body.razao_social : undefined,
        nomeFantasia: body.nome_fantasia !== undefined ? body.nome_fantasia : undefined,
        cpfCnpj: body.cpf_cnpj !== undefined ? body.cpf_cnpj : undefined,
        inscricaoEstadual: body.inscricao_estadual !== undefined ? body.inscricao_estadual : undefined,
        email: body.email !== undefined ? body.email : undefined,
        telefone: body.telefone !== undefined ? body.telefone : undefined,
        celular: body.celular !== undefined ? body.celular : undefined,
        endereco: body.endereco !== undefined ? body.endereco : undefined,
        cidade: body.cidade !== undefined ? body.cidade : undefined,
        estado: body.estado !== undefined ? body.estado : undefined,
        cep: body.cep !== undefined ? body.cep : undefined,
        observacoes: body.observacoes !== undefined ? body.observacoes : undefined,
        categoria: body.categoria !== undefined ? body.categoria : undefined,
        ativo: body.ativo !== undefined ? String(body.ativo) : undefined,
        updatedAt: new Date(),
      })
      .where(and(
        eq(fornecedores.id, id),
        eq(fornecedores.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Fornecedor não encontrado' }, 404);
    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/Fornecedores] Update error:', e);
    return c.json({ error: 'Erro ao atualizar fornecedor' }, 500);
  }
});

app.delete('/fornecedores/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();

  try {
    const [result] = await db.delete(fornecedores)
      .where(and(
        eq(fornecedores.id, id),
        eq(fornecedores.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Fornecedor não encontrado' }, 404);
    return c.json({ ok: true });
  } catch (e) {
    console.error('[Financial/Fornecedores] Delete error:', e);
    return c.json({ error: 'Erro ao deletar fornecedor' }, 500);
  }
});

// ===== FORMAS DE PAGAMENTO =====

app.get('/formas-pagamento', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);

  try {
    const result = await db.select().from(formasPagamento)
      .where(eq(formasPagamento.organizationId, user.organizationId))
      .orderBy(formasPagamento.nome);

    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/FormasPagamento] Drizzle error:', e);
    return c.json({ data: [] });
  }
});

app.post('/formas-pagamento', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const body = (await c.req.json()) as any;

  if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);

  try {
    const [result] = await db.insert(formasPagamento)
      .values({
        organizationId: user.organizationId,
        nome: String(body.nome),
        tipo: body.tipo ?? 'geral',
        taxaPercentual: body.taxa_percentual != null ? String(body.taxa_percentual) : '0',
        diasRecebimento: body.dias_recebimento != null ? Number(body.dias_recebimento) : 0,
        ativo: body.ativo !== false,
      })
      .returning();

    return c.json({ data: result }, 201);
  } catch (e) {
    console.error('[Financial/FormasPagamento] Insert error:', e);
    return c.json({ error: 'Erro ao criar forma de pagamento' }, 500);
  }
});

app.put('/formas-pagamento/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as any;

  try {
    const [result] = await db.update(formasPagamento)
      .set({
        nome: body.nome !== undefined ? String(body.nome) : undefined,
        tipo: body.tipo !== undefined ? body.tipo : undefined,
        taxaPercentual: body.taxa_percentual !== undefined ? String(body.taxa_percentual) : undefined,
        diasRecebimento: body.dias_recebimento !== undefined ? Number(body.dias_recebimento) : undefined,
        ativo: body.ativo !== undefined ? Boolean(body.ativo) : undefined,
        updatedAt: new Date(),
      })
      .where(and(
        eq(formasPagamento.id, id),
        eq(formasPagamento.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Forma de pagamento não encontrada' }, 404);
    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/FormasPagamento] Update error:', e);
    return c.json({ error: 'Erro ao atualizar forma de pagamento' }, 500);
  }
});

app.delete('/formas-pagamento/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();

  try {
    const [result] = await db.delete(formasPagamento)
      .where(and(
        eq(formasPagamento.id, id),
        eq(formasPagamento.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Forma de pagamento não encontrada' }, 404);
    return c.json({ ok: true });
  } catch (e) {
    console.error('[Financial/FormasPagamento] Delete error:', e);
    return c.json({ error: 'Erro ao deletar forma de pagamento' }, 500);
  }
});

// ===== CONVENIOS =====

app.get('/convenios', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { ativo } = c.req.query();

  const where = [eq(convenios.organizationId, user.organizationId)];
  if (ativo !== undefined) {
    where.push(eq(convenios.ativo, ativo === 'true'));
  }

  try {
    const result = await db.select()
      .from(convenios)
      .where(and(...where))
      .orderBy(convenios.nome);

    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/Convenios] Get error:', e);
    return c.json({ data: [] });
  }
});

app.post('/convenios', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const body = (await c.req.json()) as Record<string, any>;

  if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);

  try {
    const [result] = await db.insert(convenios)
      .values({
        organizationId: user.organizationId,
        nome: String(body.nome),
        cnpj: body.cnpj ?? null,
        telefone: body.telefone ?? null,
        email: body.email ?? null,
        contatoResponsavel: body.contato_responsavel ?? null,
        valorRepasse: body.valor_repasse != null ? String(body.valor_repasse) : null,
        prazoPagamentoDias: body.prazo_pagamento_dias != null ? Number(body.prazo_pagamento_dias) : null,
        observacoes: body.observacoes ?? null,
        ativo: body.ativo !== false,
      })
      .returning();

    return c.json({ data: result }, 201);
  } catch (e) {
    console.error('[Financial/Convenios] Create error:', e);
    return c.json({ error: 'Erro ao criar convênio' }, 500);
  }
});

app.put('/convenios/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, any>;

  try {
    const [result] = await db.update(convenios)
      .set({
        nome: body.nome !== undefined ? String(body.nome) : undefined,
        cnpj: body.cnpj !== undefined ? body.cnpj : undefined,
        telefone: body.telefone !== undefined ? body.telefone : undefined,
        email: body.email !== undefined ? body.email : undefined,
        contatoResponsavel: body.contato_responsavel !== undefined ? body.contato_responsavel : undefined,
        valorRepasse: body.valor_repasse !== undefined ? String(body.valor_repasse) : undefined,
        prazoPagamentoDias: body.prazo_pagamento_dias !== undefined ? Number(body.prazo_pagamento_dias) : undefined,
        observacoes: body.observacoes !== undefined ? body.observacoes : undefined,
        ativo: body.ativo !== undefined ? body.ativo : undefined,
        updatedAt: new Date(),
      })
      .where(and(
        eq(convenios.id, id),
        eq(convenios.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Convênio não encontrado' }, 404);
    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/Convenios] Update error:', e);
    return c.json({ error: 'Erro ao atualizar convênio' }, 500);
  }
});

app.delete('/convenios/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();

  try {
    const [result] = await db.delete(convenios)
      .where(and(
        eq(convenios.id, id),
        eq(convenios.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Convênio não encontrado' }, 404);
    return c.json({ ok: true });
  } catch (e) {
    console.error('[Financial/Convenios] Delete error:', e);
    return c.json({ error: 'Erro ao deletar convênio' }, 500);
  }
});

// ===== PAGAMENTOS =====

app.get('/pagamentos', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { eventoId, patientId, appointmentId, dateFrom, dateTo, limit = '50', offset = '0' } = c.req.query();

  const where = [eq(pagamentos.organizationId, user.organizationId)];
  if (eventoId) where.push(eq(pagamentos.eventoId, eventoId));
  if (patientId) where.push(eq(pagamentos.patientId, patientId));
  if (appointmentId) where.push(eq(pagamentos.appointmentId, appointmentId));
  
  // Date filtering logic matching original COALESCE(pago_em, created_at::date)
  if (dateFrom) {
    where.push(sql`COALESCE(${pagamentos.pagoEm}, ${pagamentos.createdAt}::date) >= ${dateFrom}`);
  }
  if (dateTo) {
    where.push(sql`COALESCE(${pagamentos.pagoEm}, ${pagamentos.createdAt}::date) <= ${dateTo}`);
  }

  try {
    const result = await db.select()
      .from(pagamentos)
      .where(and(...where))
      .orderBy(desc(pagamentos.pagoEm), desc(pagamentos.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/Pagamentos] Get error:', e);
    return c.json({ data: [] });
  }
});

app.post('/pagamentos', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const body = (await c.req.json()) as Record<string, any>;

  if (body.valor == null) return c.json({ error: 'valor é obrigatório' }, 400);

  try {
    const [result] = await db.insert(pagamentos)
      .values({
        organizationId: user.organizationId,
        eventoId: body.evento_id ?? null,
        appointmentId: body.appointment_id ?? null,
        valor: String(body.valor),
        formaPagamento: body.forma_pagamento ?? null,
        pagoEm: body.pago_em ?? null,
        observacoes: body.observacoes ?? null,
        patientId: body.patient_id ?? null,
      })
      .returning();

    return c.json({ data: result }, 201);
  } catch (e) {
    console.error('[Financial/Pagamentos] Create error:', e);
    return c.json({ error: 'Erro ao registrar pagamento' }, 500);
  }
});

app.put('/pagamentos/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, any>;

  try {
    const [result] = await db.update(pagamentos)
      .set({
        valor: body.valor !== undefined ? String(body.valor) : undefined,
        formaPagamento: body.forma_pagamento !== undefined ? body.forma_pagamento : undefined,
        pagoEm: body.pago_em !== undefined ? body.pago_em : undefined,
        observacoes: body.observacoes !== undefined ? body.observacoes : undefined,
        updatedAt: new Date(),
      })
      .where(and(
        eq(pagamentos.id, id),
        eq(pagamentos.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Pagamento não encontrado' }, 404);
    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/Pagamentos] Update error:', e);
    return c.json({ error: 'Erro ao atualizar pagamento' }, 500);
  }
});

app.delete('/pagamentos/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();

  try {
    const [result] = await db.delete(pagamentos)
      .where(and(
        eq(pagamentos.id, id),
        eq(pagamentos.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Pagamento não encontrado' }, 404);
    return c.json({ ok: true });
  } catch (e) {
    console.error('[Financial/Pagamentos] Delete error:', e);
    return c.json({ error: 'Erro ao deletar pagamento' }, 500);
  }
});

// ===== PACOTES DE PACIENTES =====

app.get('/package-templates', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);

  try {
    const result = await db.select()
      .from(sessionPackageTemplates)
      .where(eq(sessionPackageTemplates.organizationId, user.organizationId))
      .orderBy(sessionPackageTemplates.sessionsCount, desc(sessionPackageTemplates.createdAt));

    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/PackageTemplates] Get error:', e);
    return c.json({ data: [] });
  }
});

app.post('/package-templates', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const body = (await c.req.json()) as Record<string, any>;

  if (!body.name || !body.sessions_count || !body.price) {
    return c.json({ error: 'name, sessions_count e price são obrigatórios' }, 400);
  }

  try {
    const [result] = await db.insert(sessionPackageTemplates)
      .values({
        organizationId: user.organizationId,
        name: String(body.name),
        description: body.description ? String(body.description) : null,
        sessionsCount: Number(body.sessions_count),
        price: String(body.price),
        validityDays: Number(body.validity_days ?? 365),
        isActive: body.is_active !== undefined ? Boolean(body.is_active) : true,
        createdBy: user.uid,
      })
      .returning();

    return c.json({ data: result }, 201);
  } catch (e) {
    console.error('[Financial/PackageTemplates] Create error:', e);
    return c.json({ error: 'Erro ao criar template de pacote' }, 500);
  }
});

app.put('/package-templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, any>;

  try {
    const [result] = await db.update(sessionPackageTemplates)
      .set({
        name: body.name !== undefined ? String(body.name) : undefined,
        description: body.description !== undefined ? (body.description ? String(body.description) : null) : undefined,
        sessionsCount: body.sessions_count !== undefined ? Number(body.sessions_count) : undefined,
        price: body.price !== undefined ? String(body.price) : undefined,
        validityDays: body.validity_days !== undefined ? Number(body.validity_days) : undefined,
        isActive: body.is_active !== undefined ? Boolean(body.is_active) : undefined,
        updatedAt: new Date(),
      })
      .where(and(
        eq(sessionPackageTemplates.id, id),
        eq(sessionPackageTemplates.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Pacote não encontrado' }, 404);
    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/PackageTemplates] Update error:', e);
    return c.json({ error: 'Erro ao atualizar template de pacote' }, 500);
  }
});

app.delete('/package-templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();

  try {
    const [result] = await db.delete(sessionPackageTemplates)
      .where(and(
        eq(sessionPackageTemplates.id, id),
        eq(sessionPackageTemplates.organizationId, user.organizationId)
      ))
      .returning();

    if (!result) return c.json({ error: 'Pacote não encontrado' }, 404);
    return c.json({ ok: true });
  } catch (e) {
    console.error('[Financial/PackageTemplates] Delete error:', e);
    return c.json({ error: 'Erro ao deletar template de pacote' }, 500);
  }
});

app.get('/patient-packages', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { patientId, status: filterStatus, limit = '100', offset = '0' } = c.req.query();

  const whereConditions = [eq(patientPackages.organizationId, user.organizationId)];
  if (patientId) whereConditions.push(eq(patientPackages.patientId, patientId));
    if (filterStatus) whereConditions.push(eq(patientPackages.status, filterStatus as any));

  try {
    const result = await db.select({
      id: patientPackages.id,
      patientId: patientPackages.patientId,
      packageTemplateId: patientPackages.packageTemplateId,
      name: patientPackages.name,
      totalSessions: patientPackages.totalSessions,
      usedSessions: patientPackages.usedSessions,
      remainingSessions: patientPackages.remainingSessions,
      price: patientPackages.price,
      paymentMethod: patientPackages.paymentMethod,
      status: patientPackages.status,
      purchasedAt: patientPackages.purchasedAt,
      expiresAt: patientPackages.expiresAt,
      lastUsedAt: patientPackages.lastUsedAt,
      createdAt: patientPackages.createdAt,
      patient_name: patients.fullName,
      patient_phone: patients.phone
    })
    .from(patientPackages)
    .innerJoin(patients, eq(patients.id, patientPackages.patientId))
    .where(and(...whereConditions))
    .orderBy(desc(patientPackages.createdAt))
    .limit(Number(limit))
    .offset(Number(offset));

    return c.json({ data: result });
  } catch (e) {
    console.error('[Financial/PatientPackages] Get error:', e);
    return c.json({ data: [] });
  }
});

app.post('/patient-packages', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const body = (await c.req.json()) as Record<string, any>;

  const patientId = String(body.patient_id ?? '').trim();
  const packageTemplateId = body.package_id ? String(body.package_id) : null;
  if (!patientId) return c.json({ error: 'patient_id é obrigatório' }, 400);

  try {
    let template: any = null;
    if (packageTemplateId) {
      [template] = await db.select()
        .from(sessionPackageTemplates)
        .where(and(
          eq(sessionPackageTemplates.id, packageTemplateId),
          eq(sessionPackageTemplates.organizationId, user.organizationId)
        ))
        .limit(1);
      
      if (!template) return c.json({ error: 'Template de pacote não encontrado' }, 404);
    }

    const totalSessions = Number(body.custom_sessions ?? template?.sessionsCount ?? 0);
    const price = String(body.custom_price ?? template?.price ?? 0);
    const validityDays = Number(template?.validityDays ?? body.validity_days ?? 365);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    const [result] = await db.insert(patientPackages)
      .values({
        organizationId: user.organizationId,
        patientId: patientId,
        packageTemplateId: packageTemplateId,
        name: String(template?.name ?? body.name ?? 'Pacote Avulso'),
        totalSessions,
        usedSessions: 0,
        remainingSessions: totalSessions,
        price,
        paymentMethod: body.payment_method ? String(body.payment_method) : null,
        status: 'active',
        purchasedAt: new Date(),
        expiresAt,
        createdBy: user.uid,
      })
      .returning();

    return c.json({ data: result }, 201);
  } catch (e) {
    console.error('[Financial/PatientPackages] Create error:', e);
    return c.json({ error: 'Erro ao criar pacote de paciente' }, 500);
  }
});

app.post('/patient-packages/:id/consume', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json().catch(() => ({}))) as Record<string, any>;

  try {
    const [current] = await db.select()
      .from(patientPackages)
      .where(and(
        eq(patientPackages.id, id),
        eq(patientPackages.organizationId, user.organizationId)
      ))
      .limit(1);

    if (!current) return c.json({ error: 'Pacote não encontrado' }, 404);
    if (current.status !== 'active') return c.json({ error: 'Pacote não está ativo' }, 400);
    if (current.expiresAt && new Date(current.expiresAt) < new Date()) {
      return c.json({ error: 'Pacote expirado' }, 400);
    }
    if ((current.remainingSessions ?? 0) <= 0) {
      return c.json({ error: 'Sem sessões disponíveis neste pacote' }, 400);
    }

    const [updated] = await db.update(patientPackages)
      .set({
        usedSessions: (current.usedSessions ?? 0) + 1,
        remainingSessions: (current.remainingSessions ?? 0) - 1,
        lastUsedAt: new Date(),
        status: (current.remainingSessions ?? 0) - 1 <= 0 ? 'used' : current.status as any,
        updatedAt: new Date(),
      })
      .where(and(
        eq(patientPackages.id, id),
        eq(patientPackages.organizationId, user.organizationId)
      ))
      .returning();

    await db.insert(packageUsage)
      .values({
        organizationId: user.organizationId,
        patientPackageId: id,
        patientId: current.patientId,
        appointmentId: body.appointmentId ? String(body.appointmentId) : null,
        usedAt: new Date(),
        createdBy: user.uid,
      });

    return c.json({ data: updated });
  } catch (e) {
    console.error('[Financial/PatientPackages] Consume error:', e);
    return c.json({ error: 'Erro ao consumir pacote' }, 500);
  }
});

registerFinancialCommerceRoutes(app);

// ===== PREDICTION & BI =====

app.get('/prediction', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  
  // 1. Get confirmed future appointments value (Next 30 days)
  const [futureSchedule] = await db.select({
    expectedRevenue: sql<number>`COALESCE(SUM(${appointments.paymentAmount}), 0)`,
    sessionCount: sql<number>`COUNT(*)`
  })
  .from(appointments)
  .where(and(
    eq(appointments.organizationId, user.organizationId),
    gte(appointments.date, sql`CURRENT_DATE`),
    lte(appointments.date, sql`CURRENT_DATE + INTERVAL '30 days'`),
    sql`${appointments.status} NOT IN ('cancelled', 'no_show')`
  ));

  // 2. Get recurring revenue baseline (Active packages remaining value)
  const [packagesBaseline] = await db.select({
    inventoryValue: sql<number>`COALESCE(SUM(${patientPackages.remainingSessions} * (${patientPackages.price} / NULLIF(${patientPackages.totalSessions}, 0))), 0)`
  })
  .from(patientPackages)
  .where(and(
    eq(patientPackages.organizationId, user.organizationId),
    eq(patientPackages.status, 'active')
  ));

  // 3. Historical no-show rate to adjust prediction
  const [noShowRate] = await db.select({
    rate: sql<number>`(COUNT(CASE WHEN ${appointments.status} = 'no_show' THEN 1 END)::float / NULLIF(COUNT(*), 0))`
  })
  .from(appointments)
  .where(and(
    eq(appointments.organizationId, user.organizationId),
    sql`${appointments.date} < CURRENT_DATE`,
    sql`${appointments.date} >= CURRENT_DATE - INTERVAL '90 days'`
  ));

  const rawExpected = Number(futureSchedule?.expectedRevenue || 0);
  const rate = Number(noShowRate?.rate || 0.1); // Default 10% if no data
  
  return c.json({
    data: {
      next30Days: {
        raw: rawExpected,
        adjusted: rawExpected * (1 - rate),
        sessions: Number(futureSchedule?.sessionCount || 0),
        confidence: 0.85
      },
      inventory: {
        packageValue: Number(packagesBaseline?.inventoryValue || 0)
      },
      historicalMetrics: {
        noShowRate: rate
      }
    }
  });
});

// ─── Card→Patient mapping (receipt OCR automation) ────────────────────────────
app.get('/card-mapping/:digits', requireAuth, async (c) => {
  const user = c.get('user');
  const digits = c.req.param('digits').replace(/\D/g, '').slice(-4);
  if (digits.length !== 4) return c.json({ data: null });
  const pool = createPool(c.env);
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS card_patient_mappings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id TEXT NOT NULL,
      card_digits CHAR(4) NOT NULL,
      patient_id UUID NOT NULL,
      patient_name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(organization_id, card_digits)
    )`);
    const res = await pool.query(
      `SELECT patient_id, patient_name FROM card_patient_mappings WHERE organization_id = $1 AND card_digits = $2`,
      [user.organizationId, digits]
    );
    return c.json({ data: res.rows[0] ?? null });
  } catch {
    return c.json({ data: null });
  }
});

app.post('/card-mapping', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json() as { patientId: string; cardLastDigits: string; patientName?: string };
  const digits = String(body.cardLastDigits ?? '').replace(/\D/g, '').slice(-4);
  if (!body.patientId || digits.length !== 4) {
    return c.json({ error: 'patientId e cardLastDigits (4 dígitos) são obrigatórios' }, 400);
  }
  const pool = createPool(c.env);
  try {
    await pool.query(
      `INSERT INTO card_patient_mappings (organization_id, card_digits, patient_id, patient_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, card_digits) DO UPDATE SET patient_id = EXCLUDED.patient_id, patient_name = EXCLUDED.patient_name`,
      [user.organizationId, digits, body.patientId, body.patientName ?? null]
    );
    return c.json({ ok: true });
  } catch (err: any) {
    return c.json({ error: 'Erro ao salvar mapeamento', details: err.message }, 500);
  }
});

export { app as financialRoutes };
