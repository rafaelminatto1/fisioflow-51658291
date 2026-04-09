import { Hono } from 'hono';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  nfse,
  nfseConfig,
  userVouchers,
  voucherCheckoutSessions,
  vouchers,
} from '@fisioflow/db';
import { createDb } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

type FinancialApp = Hono<{ Bindings: Env; Variables: AuthVariables }>;

export const registerFinancialCommerceRoutes = (app: FinancialApp) => {
  app.get('/vouchers', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { all, ativo } = c.req.query();

    const whereArr = [eq(vouchers.organizationId, user.organizationId)];
    if (all !== 'true') {
      whereArr.push(eq(vouchers.ativo, ativo === undefined ? true : ativo === 'true'));
    } else if (ativo !== undefined) {
      whereArr.push(eq(vouchers.ativo, ativo === 'true'));
    }

    const data = await db
      .select()
      .from(vouchers)
      .where(and(...whereArr))
      .orderBy(vouchers.preco, desc(vouchers.createdAt));

    return c.json({ data });
  });

  app.post('/vouchers', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json()) as any;

    if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);
    if (!body.tipo) return c.json({ error: 'tipo é obrigatório' }, 400);
    if (body.preco == null) return c.json({ error: 'preco é obrigatório' }, 400);

    const [newVoucher] = await db.insert(vouchers).values({
      organizationId: user.organizationId,
      nome: String(body.nome),
      descricao: body.descricao ? String(body.descricao) : null,
      tipo: String(body.tipo),
      sessoes: body.sessoes != null ? Number(body.sessoes) : null,
      validadeDias: Number(body.validade_dias ?? 30),
      preco: sql`${Number(body.preco)}::numeric`,
      ativo: body.ativo !== undefined ? Boolean(body.ativo) : true,
      stripePriceId: body.stripe_price_id ? String(body.stripe_price_id) : null,
    }).returning();

    return c.json({ data: newVoucher }, 201);
  });

  app.put('/vouchers/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as any;
    const updateData: any = { updatedAt: new Date() };

    if (body.nome !== undefined) updateData.nome = String(body.nome);
    if (body.descricao !== undefined) updateData.descricao = body.descricao ? String(body.descricao) : null;
    if (body.tipo !== undefined) updateData.tipo = String(body.tipo);
    if (body.sessoes !== undefined) updateData.sessoes = body.sessoes != null ? Number(body.sessoes) : null;
    if (body.validade_dias !== undefined) updateData.validadeDias = Number(body.validade_dias);
    if (body.preco !== undefined) updateData.preco = sql`${Number(body.preco)}::numeric`;
    if (body.ativo !== undefined) updateData.ativo = Boolean(body.ativo);
    if (body.stripe_price_id !== undefined) updateData.stripePriceId = body.stripe_price_id ? String(body.stripe_price_id) : null;

    const [updatedVoucher] = await db
      .update(vouchers)
      .set(updateData)
      .where(and(eq(vouchers.id, id), eq(vouchers.organizationId, user.organizationId)))
      .returning();

    if (!updatedVoucher) return c.json({ error: 'Voucher não encontrado' }, 404);
    return c.json({ data: updatedVoucher });
  });

  app.delete('/vouchers/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    await db.update(vouchers).set({ deletedAt: new Date() }).where(and(eq(vouchers.id, id), eq(vouchers.organizationId, user.organizationId)));
    return c.json({ ok: true });
  });

  app.get('/user-vouchers', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);

    const data = await db
      .select({
        id: userVouchers.id,
        organizationId: userVouchers.organizationId,
        userId: userVouchers.userId,
        voucherId: userVouchers.voucherId,
        sessoesRestantes: userVouchers.sessoesRestantes,
        sessoesTotais: userVouchers.sessoesTotais,
        dataCompra: userVouchers.dataCompra,
        dataExpiracao: userVouchers.dataExpiracao,
        ativo: userVouchers.ativo,
        valorPago: userVouchers.valorPago,
        createdAt: userVouchers.createdAt,
        updatedAt: userVouchers.updatedAt,
        voucher: vouchers,
      })
      .from(userVouchers)
      .innerJoin(vouchers, eq(vouchers.id, userVouchers.voucherId))
      .where(and(eq(userVouchers.userId, user.uid), eq(userVouchers.organizationId, user.organizationId)))
      .orderBy(desc(userVouchers.dataCompra));

    return c.json({ data });
  });

  app.post('/user-vouchers/:id/consume', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    const [current] = await db
      .select()
      .from(userVouchers)
      .where(and(eq(userVouchers.id, id), eq(userVouchers.userId, user.uid), eq(userVouchers.organizationId, user.organizationId)))
      .limit(1);

    if (!current) return c.json({ error: 'Voucher não encontrado' }, 404);
    if (!current.ativo) return c.json({ error: 'Voucher inativo' }, 400);
    if (current.dataExpiracao && new Date(current.dataExpiracao) < new Date()) return c.json({ error: 'Voucher expirado' }, 400);
    if (Number(current.sessoesRestantes ?? 0) <= 0) return c.json({ error: 'Voucher sem sessões disponíveis' }, 400);

    const [updated] = await db
      .update(userVouchers)
      .set({
        sessoesRestantes: sql`${userVouchers.sessoesRestantes} - 1`,
        ativo: sql`CASE WHEN ${userVouchers.sessoesRestantes} - 1 <= 0 THEN false ELSE ${userVouchers.ativo} END`,
        updatedAt: new Date(),
      })
      .where(eq(userVouchers.id, id))
      .returning();

    return c.json({ data: updated });
  });

  app.post('/vouchers/:id/checkout', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    const [voucher] = await db
      .select()
      .from(vouchers)
      .where(and(eq(vouchers.id, id), eq(vouchers.organizationId, user.organizationId), eq(vouchers.ativo, true)))
      .limit(1);

    if (!voucher) return c.json({ error: 'Voucher não encontrado' }, 404);

    const [checkout] = await db.insert(voucherCheckoutSessions).values({
      organizationId: user.organizationId,
      userId: user.uid,
      voucherId: id,
      amount: sql`${Number(voucher.preco ?? 0)}::numeric`,
      status: 'pending',
    }).returning();

    return c.json({
      data: {
        sessionId: checkout.id,
        url: `/vouchers?session_id=${checkout.id}`,
      },
    });
  });

  app.post('/vouchers/checkout/verify', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json().catch(() => ({}))) as any;
    const sessionId = String(body.sessionId ?? '').trim();

    if (!sessionId) return c.json({ error: 'sessionId é obrigatório' }, 400);

    const [checkout] = await db
      .select({
        id: voucherCheckoutSessions.id,
        voucherId: voucherCheckoutSessions.voucherId,
        status: voucherCheckoutSessions.status,
        userVoucherId: voucherCheckoutSessions.userVoucherId,
        amount: voucherCheckoutSessions.amount,
        sessoes: vouchers.sessoes,
        validadeDias: vouchers.validadeDias,
      })
      .from(voucherCheckoutSessions)
      .innerJoin(vouchers, eq(vouchers.id, voucherCheckoutSessions.voucherId))
      .where(and(eq(voucherCheckoutSessions.id, sessionId), eq(voucherCheckoutSessions.userId, user.uid), eq(voucherCheckoutSessions.organizationId, user.organizationId)))
      .limit(1);

    if (!checkout) return c.json({ error: 'Sessão de checkout não encontrada' }, 404);

    if (checkout.status === 'paid' && checkout.userVoucherId) {
      return c.json({ data: { success: true, userVoucherId: checkout.userVoucherId } });
    }

    const expiration = new Date();
    expiration.setDate(expiration.getDate() + Number(checkout.validadeDias ?? 30));

    const [userVoucher] = await db.insert(userVouchers).values({
      organizationId: user.organizationId,
      userId: user.uid,
      voucherId: checkout.voucherId,
      sessoesRestantes: Number(checkout.sessoes ?? 0),
      sessoesTotais: Number(checkout.sessoes ?? 0),
      dataCompra: new Date(),
      dataExpiracao: expiration,
      ativo: true,
      valorPago: sql`${Number(checkout.amount ?? 0)}::numeric`,
    }).returning();

    await db.update(voucherCheckoutSessions)
      .set({ status: 'paid', userVoucherId: userVoucher.id, updatedAt: new Date() })
      .where(eq(voucherCheckoutSessions.id, sessionId));

    return c.json({ data: { success: true, userVoucherId: userVoucher.id } });
  });

  app.get('/nfse', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);

    const data = await db
      .select()
      .from(nfse)
      .where(eq(nfse.organizationId, user.organizationId))
      .orderBy(desc(nfse.dataEmissao), desc(nfse.createdAt));

    return c.json({ data });
  });

  app.post('/nfse', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json()) as any;

    if (!body.numero) return c.json({ error: 'numero é obrigatório' }, 400);
    if (body.valor == null) return c.json({ error: 'valor é obrigatório' }, 400);

    const [newNfse] = await db.insert(nfse).values({
      organizationId: user.organizationId,
      numero: String(body.numero),
      serie: body.serie ?? '1',
      tipo: body.tipo ?? 'saida',
      valor: sql`${Number(body.valor)}::numeric`,
      dataEmissao: body.data_emissao ? new Date(String(body.data_emissao)) : new Date(),
      dataPrestacao: body.data_prestacao ? new Date(String(body.data_prestacao)) : null,
      destinatario: body.destinatario ?? {},
      prestador: body.prestador ?? {},
      servico: body.servico ?? {},
      status: body.status ?? 'rascunho',
      chaveAcesso: body.chave_acesso ?? null,
      protocolo: body.protocolo ?? null,
      verificacao: body.verificacao ?? null,
    }).returning();

    return c.json({ data: newNfse }, 201);
  });

  app.put('/nfse/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as any;

    const [updated] = await db.update(nfse)
      .set({
        numero: body.numero ? String(body.numero) : undefined,
        serie: body.serie,
        tipo: body.tipo,
        valor: body.valor != null ? sql`${Number(body.valor)}::numeric` : undefined,
        dataEmissao: body.data_emissao ? new Date(String(body.data_emissao)) : undefined,
        dataPrestacao: body.data_prestacao ? new Date(String(body.data_prestacao)) : undefined,
        destinatario: body.destinatario,
        prestador: body.prestador,
        servico: body.servico,
        status: body.status,
        chaveAcesso: body.chave_acesso,
        protocolo: body.protocolo,
        verificacao: body.verificacao,
        updatedAt: new Date(),
      })
      .where(and(eq(nfse.id, id), eq(nfse.organizationId, user.organizationId)))
      .returning();

    if (!updated) return c.json({ error: 'NFSe não encontrada' }, 404);
    return c.json({ data: updated });
  });

  app.delete('/nfse/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    const [deleted] = await db.update(nfse).set({ deletedAt: new Date() })
      .where(and(eq(nfse.id, id), eq(nfse.organizationId, user.organizationId)))
      .returning({ id: nfse.id });

    if (!deleted) return c.json({ error: 'NFSe não encontrada' }, 404);
    return c.json({ ok: true });
  });

  app.get('/nfse-config', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);

    const [config] = await db
      .select()
      .from(nfseConfig)
      .where(eq(nfseConfig.organizationId, user.organizationId))
      .limit(1);

    return c.json({ data: config ?? null });
  });

  app.put('/nfse-config', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json()) as any;

    const [updated] = await db.insert(nfseConfig).values({
      organizationId: user.organizationId,
      ambiente: body.ambiente ?? 'homologacao',
      municipioCodigo: body.municipio_codigo ?? null,
      cnpjPrestador: body.cnpj_prestador ?? null,
      inscricaoMunicipal: body.inscricao_municipal ?? null,
      aliquotaIss: body.aliquota_iss != null ? sql`${Number(body.aliquota_iss)}::numeric` : sql`5::numeric`,
      autoEmissao: body.auto_emissao ?? false,
    }).onConflictDoUpdate({
      target: [nfseConfig.organizationId],
      set: {
        ambiente: body.ambiente ?? 'homologacao',
        municipioCodigo: body.municipio_codigo ?? null,
        cnpjPrestador: body.cnpj_prestador ?? null,
        inscricaoMunicipal: body.inscricao_municipal ?? null,
        aliquotaIss: body.aliquota_iss != null ? sql`${Number(body.aliquota_iss)}::numeric` : sql`5::numeric`,
        autoEmissao: body.auto_emissao ?? false,
        updatedAt: new Date(),
      }
    }).returning();

    return c.json({ data: updated });
  });
};
