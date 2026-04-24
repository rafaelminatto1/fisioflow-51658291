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
  transactions, 
  financialAccounts, 
  costCenters,
  payments,
  sessionPackageTemplates,
  patientPackages,
  packageUsage,
  patients,
} from '@fisioflow/db';
import { createDb } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { withTenant } from '../lib/db-utils';
import type { Env } from '../types/env';
import { registerFinancialCommerceRoutes } from './financial-commerce';
import { registerFinancialAnalyticsRoutes } from './financial-analytics';
import { registerFinancialCatalogRoutes } from './financial-catalogs';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ===== TRANSACOES =====

app.get('/transacoes', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { tipo, status, dateFrom, dateTo, limit = '50', offset = '0' } = c.req.query();

  try {
    const filters = [withTenant(transactions, user.organizationId)];

    if (tipo) filters.push(eq(transactions.type, tipo));
    if (status) filters.push(eq(transactions.status, status));
    if (dateFrom) filters.push(gte(transactions.createdAt, new Date(dateFrom)));
    if (dateTo) filters.push(lte(transactions.createdAt, new Date(dateTo)));

    const limitNum = Math.min(1000, Math.max(1, Number(limit) || 50));
    const offsetNum = Math.max(0, Number(offset) || 0);

    const result = await db.select().from(transactions)
      .where(and(...filters))
      .orderBy(desc(transactions.createdAt))
      .limit(limitNum)
      .offset(offsetNum);

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

  if (!body.tipo && !body.type) return c.json({ error: 'type é obrigatório' }, 400);
  if (body.valor == null && body.amount == null) return c.json({ error: 'amount é obrigatório' }, 400);

  try {
    const [result] = await db.insert(transactions)
      .values({
        organizationId: user.organizationId,
        userId: body.user_id ?? user.uid,
        type: String(body.tipo ?? body.type),
        amount: String(body.valor ?? body.amount), // numeric is string in drizzle
        description: body.descricao ?? body.description ?? null,
        status: body.status ?? 'pending',
        category: body.categoria ?? body.category ?? null,
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
    const [result] = await db.update(transactions)
      .set({
        type: (body.tipo ?? body.type) !== undefined ? String(body.tipo ?? body.type) : undefined,
        amount: (body.valor ?? body.amount) !== undefined ? String(body.valor ?? body.amount) : undefined,
        description: (body.descricao ?? body.description) !== undefined ? (body.descricao ?? body.description) : undefined,
        status: body.status !== undefined ? body.status : undefined,
        category: (body.categoria ?? body.category) !== undefined ? (body.categoria ?? body.category) : undefined,
        metadata: body.metadata !== undefined ? body.metadata : undefined,
        updatedAt: new Date(),
      })
      .where(withTenant(transactions, user.organizationId, eq(transactions.id, id)))
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
    const [result] = await db.update(transactions).set({ deletedAt: new Date() })
      .where(withTenant(transactions, user.organizationId, eq(transactions.id, id)))
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
    const filters = [withTenant(financialAccounts, user.organizationId)];
   
    if (tipo) filters.push(eq(financialAccounts.type, tipo));
    if (status) filters.push(eq(financialAccounts.status, status));
    if (dateFrom) filters.push(sql`COALESCE(${financialAccounts.dueDate}, ${financialAccounts.createdAt}::date) >= ${dateFrom}`);
    if (dateTo) filters.push(sql`COALESCE(${financialAccounts.dueDate}, ${financialAccounts.createdAt}::date) <= ${dateTo}`);
    if (patientId) filters.push(eq(financialAccounts.patientId, patientId));

    const limitNum = Math.min(1000, Math.max(1, Number(limit) || 50));
    const offsetNum = Math.max(0, Number(offset) || 0);

    const result = await db.select({
      id: financialAccounts.id,
      organizationId: financialAccounts.organizationId,
      type: financialAccounts.type,
      amount: financialAccounts.amount,
      status: financialAccounts.status,
      description: financialAccounts.description,
      due_date: financialAccounts.dueDate,
      paid_at: financialAccounts.paidAt,
      patient_id: financialAccounts.patientId,
      appointment_id: financialAccounts.appointmentId,
      category: financialAccounts.category,
      payment_method: financialAccounts.paymentMethod,
      notes: financialAccounts.notes,
      created_at: financialAccounts.createdAt,
      updated_at: financialAccounts.updatedAt,
      patient_name: sql<string | null>`p.full_name`
    })
    .from(financialAccounts)
    .leftJoin(sql`patients p`, sql`p.id = ${financialAccounts.patientId}`)
    .where(and(...filters))
    .orderBy(sql`${financialAccounts.dueDate} ASC NULLS LAST`, desc(financialAccounts.createdAt))
    .limit(limitNum)
    .offset(offsetNum);

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
 
  if (!body.tipo && !body.type) return c.json({ error: 'type é obrigatório' }, 400);
  if (body.valor == null && body.amount == null) return c.json({ error: 'amount é obrigatório' }, 400);
 
  try {
    const [result] = await db.insert(financialAccounts)
      .values({
        organizationId: user.organizationId,
        type: String(body.tipo ?? body.type),
        amount: String(body.valor ?? body.amount),
        status: body.status ?? 'pending',
        description: body.descricao ?? body.description ?? null,
        dueDate: body.due_date ?? body.data_vencimento ?? null,
        paidAt: body.paid_at ?? body.pago_em ?? null,
        patientId: body.patient_id ?? null,
        appointmentId: body.appointment_id ?? null,
        category: body.categoria ?? body.category ?? null,
        paymentMethod: body.payment_method ?? body.forma_pagamento ?? null,
        notes: body.observacoes ?? body.notes ?? null,
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
    const [result] = await db.update(financialAccounts)
      .set({
        status: body.status !== undefined ? body.status : undefined,
        amount: (body.valor ?? body.amount) !== undefined ? String(body.valor ?? body.amount) : undefined,
        description: (body.descricao ?? body.description) !== undefined ? (body.descricao ?? body.description) : undefined,
        dueDate: (body.due_date ?? body.data_vencimento) !== undefined ? (body.due_date ?? body.data_vencimento) : undefined,
        paidAt: (body.paid_at ?? body.pago_em) !== undefined ? (body.paid_at ?? body.pago_em) : undefined,
        notes: (body.observacoes ?? body.notes) !== undefined ? (body.observacoes ?? body.notes) : undefined,
        paymentMethod: (body.payment_method ?? body.forma_pagamento) !== undefined ? (body.payment_method ?? body.forma_pagamento) : undefined,
        category: (body.categoria ?? body.category) !== undefined ? (body.categoria ?? body.category) : undefined,
        updatedAt: new Date(),
      })
      .where(withTenant(financialAccounts, user.organizationId, eq(financialAccounts.id, id)))
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
    const [result] = await db.update(financialAccounts).set({ deletedAt: new Date() })
      .where(withTenant(financialAccounts, user.organizationId, eq(financialAccounts.id, id)))
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
    const filters = [withTenant(costCenters, user.organizationId)];
    if (ativo !== undefined) filters.push(eq(costCenters.isActive, ativo === 'true'));

    const result = await db.select().from(costCenters)
      .where(and(...filters))
      .orderBy(costCenters.name);

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

  if (!body.nome && !body.name) return c.json({ error: 'name é obrigatório' }, 400);

  try {
    const [result] = await db.insert(costCenters)
      .values({
        organizationId: user.organizationId,
        name: String(body.nome ?? body.name),
        description: body.descricao ?? body.description ?? null,
        code: body.codigo ?? body.code ?? null,
        isActive: (body.ativo ?? body.is_active) !== undefined ? Boolean(body.ativo ?? body.is_active) : true,
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
    const [result] = await db.update(costCenters)
      .set({
        name: (body.nome ?? body.name) !== undefined ? String(body.nome ?? body.name) : undefined,
        description: (body.descricao ?? body.description) !== undefined ? (body.descricao ?? body.description) : undefined,
        code: (body.codigo ?? body.code) !== undefined ? (body.codigo ?? body.code) : undefined,
        isActive: (body.ativo ?? body.is_active) !== undefined ? Boolean(body.ativo ?? body.is_active) : undefined,
        updatedAt: new Date(),
      })
      .where(withTenant(costCenters, user.organizationId, eq(costCenters.id, id)))
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
    const [result] = await db.update(costCenters).set({ deletedAt: new Date() })
      .where(withTenant(costCenters, user.organizationId, eq(costCenters.id, id)))
      .returning();

    if (!result) return c.json({ error: 'Centro de custo não encontrado' }, 404);
    return c.json({ ok: true });
  } catch (e) {
    console.error('[Financial/CentrosCusto] Delete error:', e);
    return c.json({ error: 'Erro ao deletar centro de custo' }, 500);
  }
});

// ===== PAGAMENTOS =====

app.get('/pagamentos', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { eventoId, patientId, appointmentId, dateFrom, dateTo, limit = '50', offset = '0' } = c.req.query();

  const where = [withTenant(payments, user.organizationId)];
  if (eventoId) where.push(eq(payments.eventId, eventoId));
  if (patientId) where.push(eq(payments.patientId, patientId));
  if (appointmentId) where.push(eq(payments.appointmentId, appointmentId));
  
  // Date filtering logic matching original COALESCE(paid_at, created_at::date)
  if (dateFrom) {
    where.push(sql`COALESCE(${payments.paidAt}, ${payments.createdAt}::date) >= ${dateFrom}`);
  }
  if (dateTo) {
    where.push(sql`COALESCE(${payments.paidAt}, ${payments.createdAt}::date) <= ${dateTo}`);
  }

  try {
    const limitNum = Math.min(1000, Math.max(1, Number(limit) || 50));
    const offsetNum = Math.max(0, Number(offset) || 0);

    const result = await db.select()
      .from(payments)
      .where(and(...where))
      .orderBy(desc(payments.paidAt), desc(payments.createdAt))
      .limit(limitNum)
      .offset(offsetNum);

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

  if (body.valor == null && body.amount == null) return c.json({ error: 'amount é obrigatório' }, 400);

  try {
    const [result] = await db.insert(payments)
      .values({
        organizationId: user.organizationId,
        eventId: body.evento_id ?? body.event_id ?? null,
        appointmentId: body.appointment_id ?? null,
        amount: String(body.valor ?? body.amount),
        paymentMethod: body.payment_method ?? body.forma_pagamento ?? null,
        paidAt: body.paid_at ?? body.pago_em ?? null,
        notes: body.observacoes ?? body.notes ?? null,
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
    const [result] = await db.update(payments)
      .set({
        amount: (body.valor ?? body.amount) !== undefined ? String(body.valor ?? body.amount) : undefined,
        paymentMethod: (body.payment_method ?? body.forma_pagamento) !== undefined ? (body.payment_method ?? body.forma_pagamento) : undefined,
        paidAt: (body.paid_at ?? body.pago_em) !== undefined ? (body.paid_at ?? body.pago_em) : undefined,
        notes: (body.observacoes ?? body.notes) !== undefined ? (body.observacoes ?? body.notes) : undefined,
        updatedAt: new Date(),
      })
      .where(withTenant(payments, user.organizationId, eq(payments.id, id)))
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
    const [result] = await db.update(payments).set({ deletedAt: new Date() })
      .where(withTenant(payments, user.organizationId, eq(payments.id, id)))
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
      .where(withTenant(sessionPackageTemplates, user.organizationId))
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
      .where(withTenant(sessionPackageTemplates, user.organizationId, eq(sessionPackageTemplates.id, id)))
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
    const [result] = await db.update(sessionPackageTemplates).set({ deletedAt: new Date() })
      .where(withTenant(sessionPackageTemplates, user.organizationId, eq(sessionPackageTemplates.id, id)))
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

  const whereConditions = [withTenant(patientPackages, user.organizationId)];
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
        .where(withTenant(sessionPackageTemplates, user.organizationId, eq(sessionPackageTemplates.id, packageTemplateId)))
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
    const updated = await (async (tx: typeof db) => {
      const [current] = await tx.select()
        .from(patientPackages)
        .where(withTenant(patientPackages, user.organizationId, eq(patientPackages.id, id)))
        .limit(1);

      if (!current) throw new Error('Pacote não encontrado');
      if (current.status !== 'active') throw new Error('Pacote não está ativo');
      if (current.expiresAt && new Date(current.expiresAt) < new Date()) {
        throw new Error('Pacote expirado');
      }
      if ((current.remainingSessions ?? 0) <= 0) {
        throw new Error('Sem sessões disponíveis neste pacote');
      }

      const [updatedRecord] = await tx.update(patientPackages)
        .set({
          usedSessions: (current.usedSessions ?? 0) + 1,
          remainingSessions: (current.remainingSessions ?? 0) - 1,
          lastUsedAt: new Date(),
          status: (current.remainingSessions ?? 0) - 1 <= 0 ? 'used' : current.status as any,
          updatedAt: new Date(),
        })
        .where(withTenant(patientPackages, user.organizationId, eq(patientPackages.id, id)))
        .returning();

      await tx.insert(packageUsage)
        .values({
          organizationId: user.organizationId,
          patientPackageId: id,
          patientId: current.patientId,
          appointmentId: body.appointmentId ? String(body.appointmentId) : null,
          usedAt: new Date(),
          createdBy: user.uid,
        });

      return updatedRecord;
    })(db);

    return c.json({ data: updated });
  } catch (e: any) {
    console.error('[Financial/PatientPackages] Consume error:', e);
    if (e.message === 'Pacote não encontrado') return c.json({ error: e.message }, 404);
    if (['Pacote não está ativo', 'Pacote expirado', 'Sem sessões disponíveis neste pacote'].includes(e.message)) {
      return c.json({ error: e.message }, 400);
    }
    return c.json({ error: 'Erro ao consumir pacote' }, 500);
  }
});

registerFinancialCommerceRoutes(app);
registerFinancialAnalyticsRoutes(app);
registerFinancialCatalogRoutes(app);

export { app as financialRoutes };
