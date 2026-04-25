import { Hono } from "hono";
import { and, desc, eq, sql } from "drizzle-orm";
import { nfse, nfseConfig, userVouchers, voucherCheckoutSessions, vouchers } from "@fisioflow/db";
import { createDb } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

type FinancialApp = Hono<{ Bindings: Env; Variables: AuthVariables }>;

export const registerFinancialCommerceRoutes = (app: FinancialApp) => {
  app.get("/vouchers", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const { all, ativo } = c.req.query();

    const whereArr = [eq(vouchers.organizationId, user.organizationId)];
    if (all !== "true") {
      whereArr.push(eq(vouchers.isActive, ativo === undefined ? true : ativo === "true"));
    } else if (ativo !== undefined) {
      whereArr.push(eq(vouchers.isActive, ativo === "true"));
    }

    const data = await db
      .select()
      .from(vouchers)
      .where(and(...whereArr))
      .orderBy(vouchers.price, desc(vouchers.createdAt));

    return c.json({ data });
  });

  app.post("/vouchers", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const body = (await c.req.json()) as any;

    if (!body.nome) return c.json({ error: "nome é obrigatório" }, 400);
    if (!body.tipo) return c.json({ error: "tipo é obrigatório" }, 400);
    if (body.preco == null) return c.json({ error: "preco é obrigatório" }, 400);

    const [newVoucher] = await db
      .insert(vouchers)
      .values({
        organizationId: user.organizationId,
        name: String(body.nome),
        description: body.descricao ? String(body.descricao) : null,
        type: String(body.tipo),
        sessions: body.sessoes != null ? Number(body.sessoes) : null,
        validityDays: Number(body.validade_dias ?? 30),
        price: sql`${Number(body.preco)}::numeric`,
        isActive: body.ativo !== undefined ? Boolean(body.ativo) : true,
        stripePriceId: body.stripe_price_id ? String(body.stripe_price_id) : null,
      })
      .returning();

    return c.json({ data: newVoucher }, 201);
  });

  app.put("/vouchers/:id", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as any;
    const updateData: any = { updatedAt: new Date() };

    if (body.nome !== undefined) updateData.name = String(body.nome);
    if (body.descricao !== undefined)
      updateData.description = body.descricao ? String(body.descricao) : null;
    if (body.tipo !== undefined) updateData.type = String(body.tipo);
    if (body.sessoes !== undefined)
      updateData.sessions = body.sessoes != null ? Number(body.sessoes) : null;
    if (body.validade_dias !== undefined) updateData.validityDays = Number(body.validade_dias);
    if (body.preco !== undefined) updateData.price = sql`${Number(body.preco)}::numeric`;
    if (body.ativo !== undefined) updateData.isActive = Boolean(body.ativo);
    if (body.stripe_price_id !== undefined)
      updateData.stripePriceId = body.stripe_price_id ? String(body.stripe_price_id) : null;

    const [updatedVoucher] = await db
      .update(vouchers)
      .set(updateData)
      .where(and(eq(vouchers.id, id), eq(vouchers.organizationId, user.organizationId)))
      .returning();

    if (!updatedVoucher) return c.json({ error: "Voucher não encontrado" }, 404);
    return c.json({ data: updatedVoucher });
  });

  app.delete("/vouchers/:id", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const { id } = c.req.param();

    await db
      .update(vouchers)
      .set({ deletedAt: new Date() })
      .where(and(eq(vouchers.id, id), eq(vouchers.organizationId, user.organizationId)));
    return c.json({ ok: true });
  });

  app.get("/user-vouchers", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);

    const data = await db
      .select({
        id: userVouchers.id,
        organizationId: userVouchers.organizationId,
        userId: userVouchers.userId,
        voucherId: userVouchers.voucherId,
        remainingSessions: userVouchers.remainingSessions,
        totalSessions: userVouchers.totalSessions,
        purchasedAt: userVouchers.purchasedAt,
        expiresAt: userVouchers.expiresAt,
        isActive: userVouchers.isActive,
        amountPaid: userVouchers.amountPaid,
        createdAt: userVouchers.createdAt,
        updatedAt: userVouchers.updatedAt,
        voucher: vouchers,
      })
      .from(userVouchers)
      .innerJoin(vouchers, eq(vouchers.id, userVouchers.voucherId))
      .where(
        and(
          eq(userVouchers.userId, user.uid),
          eq(userVouchers.organizationId, user.organizationId),
        ),
      )
      .orderBy(desc(userVouchers.purchasedAt));

    return c.json({ data });
  });

  app.post("/user-vouchers/:id/consume", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const { id } = c.req.param();

    const [current] = await db
      .select()
      .from(userVouchers)
      .where(
        and(
          eq(userVouchers.id, id),
          eq(userVouchers.userId, user.uid),
          eq(userVouchers.organizationId, user.organizationId),
        ),
      )
      .limit(1);

    if (!current) return c.json({ error: "Voucher não encontrado" }, 404);
    if (!current.isActive) return c.json({ error: "Voucher inativo" }, 400);
    if (current.expiresAt && new Date(current.expiresAt) < new Date())
      return c.json({ error: "Voucher expirado" }, 400);
    if (Number(current.remainingSessions ?? 0) <= 0)
      return c.json({ error: "Voucher sem sessões disponíveis" }, 400);

    const [updated] = await db
      .update(userVouchers)
      .set({
        remainingSessions: sql`${userVouchers.remainingSessions} - 1`,
        isActive: sql`CASE WHEN ${userVouchers.remainingSessions} - 1 <= 0 THEN false ELSE ${userVouchers.isActive} END`,
        updatedAt: new Date(),
      })
      .where(eq(userVouchers.id, id))
      .returning();

    return c.json({ data: updated });
  });

  app.post("/vouchers/:id/checkout", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const { id } = c.req.param();

    const [voucher] = await db
      .select()
      .from(vouchers)
      .where(
        and(
          eq(vouchers.id, id),
          eq(vouchers.organizationId, user.organizationId),
          eq(vouchers.isActive, true),
        ),
      )
      .limit(1);

    if (!voucher) return c.json({ error: "Voucher não encontrado" }, 404);

    const [checkout] = await db
      .insert(voucherCheckoutSessions)
      .values({
        organizationId: user.organizationId,
        userId: user.uid,
        voucherId: id,
        amount: sql`${Number(voucher.price ?? 0)}::numeric`,
        status: "pending",
      })
      .returning();

    return c.json({
      data: {
        sessionId: checkout.id,
        url: `/vouchers?session_id=${checkout.id}`,
      },
    });
  });

  app.post("/vouchers/checkout/verify", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const body = (await c.req.json().catch(() => ({}))) as any;
    const sessionId = String(body.sessionId ?? "").trim();

    if (!sessionId) return c.json({ error: "sessionId é obrigatório" }, 400);

    const [checkout] = await db
      .select({
        id: voucherCheckoutSessions.id,
        voucherId: voucherCheckoutSessions.voucherId,
        status: voucherCheckoutSessions.status,
        userVoucherId: voucherCheckoutSessions.userVoucherId,
        amount: voucherCheckoutSessions.amount,
        sessions: vouchers.sessions,
        validityDays: vouchers.validityDays,
      })
      .from(voucherCheckoutSessions)
      .innerJoin(vouchers, eq(vouchers.id, voucherCheckoutSessions.voucherId))
      .where(
        and(
          eq(voucherCheckoutSessions.id, sessionId),
          eq(voucherCheckoutSessions.userId, user.uid),
          eq(voucherCheckoutSessions.organizationId, user.organizationId),
        ),
      )
      .limit(1);

    if (!checkout) return c.json({ error: "Sessão de checkout não encontrada" }, 404);

    if (checkout.status === "paid" && checkout.userVoucherId) {
      return c.json({ data: { success: true, userVoucherId: checkout.userVoucherId } });
    }

    const expiration = new Date();
    expiration.setDate(expiration.getDate() + Number(checkout.validityDays ?? 30));

    const [userVoucher] = await db
      .insert(userVouchers)
      .values({
        organizationId: user.organizationId,
        userId: user.uid,
        voucherId: checkout.voucherId,
        remainingSessions: Number(checkout.sessions ?? 0),
        totalSessions: Number(checkout.sessions ?? 0),
        purchasedAt: new Date(),
        expiresAt: expiration,
        isActive: true,
        amountPaid: sql`${Number(checkout.amount ?? 0)}::numeric`,
      })
      .returning();

    await db
      .update(voucherCheckoutSessions)
      .set({ status: "paid", userVoucherId: userVoucher.id, updatedAt: new Date() })
      .where(eq(voucherCheckoutSessions.id, sessionId));

    return c.json({ data: { success: true, userVoucherId: userVoucher.id } });
  });

  app.get("/nfse", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);

    const data = await db
      .select()
      .from(nfse)
      .where(eq(nfse.organizationId, user.organizationId))
      .orderBy(desc(nfse.issuedAt), desc(nfse.createdAt));

    return c.json({ data });
  });

  app.post("/nfse", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const body = (await c.req.json()) as any;

    if (!body.numero) return c.json({ error: "numero é obrigatório" }, 400);
    if (body.valor == null) return c.json({ error: "valor é obrigatório" }, 400);

    const [newNfse] = await db
      .insert(nfse)
      .values({
        organizationId: user.organizationId,
        number: String(body.numero),
        series: body.serie ?? "1",
        type: body.tipo ?? "saida",
        amount: sql`${Number(body.valor)}::numeric`,
        issuedAt: body.data_emissao ? new Date(String(body.data_emissao)) : new Date(),
        serviceDate: body.data_prestacao ? new Date(String(body.data_prestacao)) : null,
        recipient: body.destinatario ?? {},
        provider: body.prestador ?? {},
        service: body.servico ?? {},
        status: body.status ?? "rascunho",
        accessKey: body.chave_acesso ?? null,
        protocol: body.protocolo ?? null,
        verification: body.verificacao ?? null,
      })
      .returning();

    return c.json({ data: newNfse }, 201);
  });

  app.put("/nfse/:id", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as any;

    const [updated] = await db
      .update(nfse)
      .set({
        number: body.numero ? String(body.numero) : undefined,
        series: body.serie,
        type: body.tipo,
        amount: body.valor != null ? sql`${Number(body.valor)}::numeric` : undefined,
        issuedAt: body.data_emissao ? new Date(String(body.data_emissao)) : undefined,
        serviceDate: body.data_prestacao ? new Date(String(body.data_prestacao)) : undefined,
        recipient: body.destinatario,
        provider: body.prestador,
        service: body.servico,
        status: body.status,
        accessKey: body.chave_acesso,
        protocol: body.protocolo,
        verification: body.verificacao,
        updatedAt: new Date(),
      })
      .where(and(eq(nfse.id, id), eq(nfse.organizationId, user.organizationId)))
      .returning();

    if (!updated) return c.json({ error: "NFSe não encontrada" }, 404);
    return c.json({ data: updated });
  });

  app.delete("/nfse/:id", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const { id } = c.req.param();

    const [deleted] = await db
      .update(nfse)
      .set({ deletedAt: new Date() })
      .where(and(eq(nfse.id, id), eq(nfse.organizationId, user.organizationId)))
      .returning({ id: nfse.id });

    if (!deleted) return c.json({ error: "NFSe não encontrada" }, 404);
    return c.json({ ok: true });
  });

  app.get("/nfse-config", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);

    const [config] = await db
      .select()
      .from(nfseConfig)
      .where(eq(nfseConfig.organizationId, user.organizationId))
      .limit(1);

    return c.json({ data: config ?? null });
  });

  app.put("/nfse-config", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const body = (await c.req.json()) as any;

    const [updated] = await db
      .insert(nfseConfig)
      .values({
        organizationId: user.organizationId,
        environment: body.ambiente ?? "homologacao",
        cityCode: body.municipio_codigo ?? null,
        providerTaxId: body.cnpj_prestador ?? null,
        cityRegistration: body.inscricao_municipal ?? null,
        issRate:
          body.aliquota_iss != null ? sql`${Number(body.aliquota_iss)}::numeric` : sql`5::numeric`,
        autoIssuance: body.auto_emissao ?? false,
      })
      .onConflictDoUpdate({
        target: [nfseConfig.organizationId],
        set: {
          environment: body.ambiente ?? "homologacao",
          cityCode: body.municipio_codigo ?? null,
          providerTaxId: body.cnpj_prestador ?? null,
          cityRegistration: body.inscricao_municipal ?? null,
          issRate:
            body.aliquota_iss != null
              ? sql`${Number(body.aliquota_iss)}::numeric`
              : sql`5::numeric`,
          autoIssuance: body.auto_emissao ?? false,
          updatedAt: new Date(),
        },
      })
      .returning();

    return c.json({ data: updated });
  });
};
