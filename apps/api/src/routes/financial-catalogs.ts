import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { healthInsurances, partnerCompanies, suppliers, paymentMethods } from "@fisioflow/db";
import { createDb } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

type FinancialApp = Hono<{ Bindings: Env; Variables: AuthVariables }>;

export const registerFinancialCatalogRoutes = (app: FinancialApp) => {
  app.get("/empresas-parceiras", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);

    try {
      const result = await db
        .select()
        .from(partnerCompanies)
        .where(eq(partnerCompanies.organizationId, user.organizationId))
        .orderBy(partnerCompanies.name);

      return c.json({ data: result });
    } catch (e) {
      console.error("[Financial/PartnerCompanies] Drizzle error:", e);
      return c.json({ data: [] });
    }
  });

  app.post("/empresas-parceiras", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const body = (await c.req.json()) as any;

    if (!body.nome && !body.name) return c.json({ error: "name é obrigatório" }, 400);

    try {
      const [result] = await db
        .insert(partnerCompanies)
        .values({
          organizationId: user.organizationId,
          name: String(body.nome ?? body.name),
          contact: body.contato ?? body.contact ?? null,
          email: body.email ?? null,
          phone: body.telefone ?? body.phone ?? null,
          benefits: body.contrapartidas ?? body.benefits ?? null,
          notes: body.observacoes ?? body.notes ?? null,
          isActive:
            (body.ativo ?? body.is_active) !== undefined
              ? Boolean(body.ativo ?? body.is_active)
              : true,
        })
        .returning();

      return c.json({ data: result }, 201);
    } catch (e) {
      console.error("[Financial/PartnerCompanies] Insert error:", e);
      return c.json({ error: "Erro ao criar empresa parceira" }, 500);
    }
  });

  app.put("/empresas-parceiras/:id", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as any;

    try {
      const [result] = await db
        .update(partnerCompanies)
        .set({
          name: (body.nome ?? body.name) !== undefined ? String(body.nome ?? body.name) : undefined,
          contact:
            (body.contato ?? body.contact) !== undefined
              ? (body.contato ?? body.contact)
              : undefined,
          email: body.email !== undefined ? body.email : undefined,
          phone:
            (body.telefone ?? body.phone) !== undefined ? (body.telefone ?? body.phone) : undefined,
          benefits:
            (body.contrapartidas ?? body.benefits) !== undefined
              ? (body.contrapartidas ?? body.benefits)
              : undefined,
          notes:
            (body.observacoes ?? body.notes) !== undefined
              ? (body.observacoes ?? body.notes)
              : undefined,
          isActive:
            (body.ativo ?? body.is_active) !== undefined
              ? Boolean(body.ativo ?? body.is_active)
              : undefined,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(partnerCompanies.id, id),
            eq(partnerCompanies.organizationId, user.organizationId),
          ),
        )
        .returning();

      if (!result) return c.json({ error: "Empresa parceira não encontrada" }, 404);
      return c.json({ data: result });
    } catch (e) {
      console.error("[Financial/PartnerCompanies] Update error:", e);
      return c.json({ error: "Erro ao atualizar empresa parceira" }, 500);
    }
  });

  app.delete("/empresas-parceiras/:id", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const { id } = c.req.param();

    try {
      const [result] = await db
        .update(partnerCompanies)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(partnerCompanies.id, id),
            eq(partnerCompanies.organizationId, user.organizationId),
          ),
        )
        .returning();

      if (!result) return c.json({ error: "Empresa parceira não encontrada" }, 404);
      return c.json({ ok: true });
    } catch (e) {
      console.error("[Financial/PartnerCompanies] Delete error:", e);
      return c.json({ error: "Erro ao deletar empresa parceira" }, 500);
    }
  });

  app.get("/fornecedores", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);

    try {
      const result = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.organizationId, user.organizationId))
        .orderBy(suppliers.legalName);

      return c.json({ data: result });
    } catch (e) {
      console.error("[Financial/Suppliers] Drizzle error:", e);
      return c.json({ data: [] });
    }
  });

  app.post("/fornecedores", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const body = (await c.req.json()) as any;

    if (!body.razao_social && !body.legal_name)
      return c.json({ error: "legal_name é obrigatório" }, 400);

    try {
      const [result] = await db
        .insert(suppliers)
        .values({
          organizationId: user.organizationId,
          personType: body.tipo_pessoa ?? body.person_type ?? "pj",
          legalName: body.razao_social ?? body.legal_name,
          tradeName: body.nome_fantasia ?? body.trade_name ?? null,
          taxId: body.cpf_cnpj ?? body.tax_id ?? null,
          stateRegistration: body.inscricao_estadual ?? body.state_registration ?? null,
          email: body.email ?? null,
          phone: body.telefone ?? body.phone ?? null,
          mobilePhone: body.celular ?? body.mobile_phone ?? null,
          address: body.endereco ?? body.address ?? null,
          city: body.cidade ?? body.city ?? null,
          state: body.estado ?? body.state ?? null,
          zipCode: body.cep ?? body.zip_code ?? null,
          notes: body.observacoes ?? body.notes ?? null,
          category: body.categoria ?? body.category ?? null,
          isActive:
            (body.ativo ?? body.is_active) !== undefined
              ? Boolean(body.ativo ?? body.is_active)
              : true,
        })
        .returning();

      return c.json({ data: result }, 201);
    } catch (e) {
      console.error("[Financial/Suppliers] Insert error:", e);
      return c.json({ error: "Erro ao criar fornecedor" }, 500);
    }
  });

  app.put("/fornecedores/:id", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as any;

    try {
      const [result] = await db
        .update(suppliers)
        .set({
          personType:
            (body.tipo_pessoa ?? body.person_type) !== undefined
              ? (body.tipo_pessoa ?? body.person_type)
              : undefined,
          legalName:
            (body.razao_social ?? body.legal_name) !== undefined
              ? (body.razao_social ?? body.legal_name)
              : undefined,
          tradeName:
            (body.nome_fantasia ?? body.trade_name) !== undefined
              ? (body.nome_fantasia ?? body.trade_name)
              : undefined,
          taxId:
            (body.cpf_cnpj ?? body.tax_id) !== undefined
              ? (body.cpf_cnpj ?? body.tax_id)
              : undefined,
          stateRegistration:
            (body.inscricao_estadual ?? body.state_registration) !== undefined
              ? (body.inscricao_estadual ?? body.state_registration)
              : undefined,
          email: body.email !== undefined ? body.email : undefined,
          phone:
            (body.telefone ?? body.phone) !== undefined ? (body.telefone ?? body.phone) : undefined,
          mobilePhone:
            (body.celular ?? body.mobile_phone) !== undefined
              ? (body.celular ?? body.mobile_phone)
              : undefined,
          address:
            (body.endereco ?? body.address) !== undefined
              ? (body.endereco ?? body.address)
              : undefined,
          city: (body.cidade ?? body.city) !== undefined ? (body.cidade ?? body.city) : undefined,
          state:
            (body.estado ?? body.state) !== undefined ? (body.estado ?? body.state) : undefined,
          zipCode:
            (body.cep ?? body.zip_code) !== undefined ? (body.cep ?? body.zip_code) : undefined,
          notes:
            (body.observacoes ?? body.notes) !== undefined
              ? (body.observacoes ?? body.notes)
              : undefined,
          category:
            (body.categoria ?? body.category) !== undefined
              ? (body.categoria ?? body.category)
              : undefined,
          isActive:
            (body.ativo ?? body.is_active) !== undefined
              ? Boolean(body.ativo ?? body.is_active)
              : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(suppliers.id, id), eq(suppliers.organizationId, user.organizationId)))
        .returning();

      if (!result) return c.json({ error: "Fornecedor não encontrado" }, 404);
      return c.json({ data: result });
    } catch (e) {
      console.error("[Financial/Suppliers] Update error:", e);
      return c.json({ error: "Erro ao atualizar fornecedor" }, 500);
    }
  });

  app.delete("/fornecedores/:id", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const { id } = c.req.param();

    try {
      const [result] = await db
        .update(suppliers)
        .set({ deletedAt: new Date() })
        .where(and(eq(suppliers.id, id), eq(suppliers.organizationId, user.organizationId)))
        .returning();

      if (!result) return c.json({ error: "Fornecedor não encontrado" }, 404);
      return c.json({ ok: true });
    } catch (e) {
      console.error("[Financial/Suppliers] Delete error:", e);
      return c.json({ error: "Erro ao deletar fornecedor" }, 500);
    }
  });

  app.get("/formas-pagamento", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);

    try {
      const result = await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.organizationId, user.organizationId))
        .orderBy(paymentMethods.name);

      return c.json({ data: result });
    } catch (e) {
      console.error("[Financial/PaymentMethods] Drizzle error:", e);
      return c.json({ data: [] });
    }
  });

  app.post("/formas-pagamento", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const body = (await c.req.json()) as any;

    if (!body.nome && !body.name) return c.json({ error: "name é obrigatório" }, 400);

    try {
      const [result] = await db
        .insert(paymentMethods)
        .values({
          organizationId: user.organizationId,
          name: String(body.nome ?? body.name),
          type: body.tipo ?? body.type ?? "geral",
          feePercentage:
            (body.taxa_percentual ?? body.fee_percentage) != null
              ? String(body.taxa_percentual ?? body.fee_percentage)
              : "0",
          payoutDays:
            (body.dias_recebimento ?? body.payout_days) != null
              ? Number(body.dias_recebimento ?? body.payout_days)
              : 0,
          isActive: (body.ativo ?? body.is_active) !== false,
        })
        .returning();

      return c.json({ data: result }, 201);
    } catch (e) {
      console.error("[Financial/PaymentMethods] Insert error:", e);
      return c.json({ error: "Erro ao criar forma de pagamento" }, 500);
    }
  });

  app.put("/formas-pagamento/:id", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as any;

    try {
      const [result] = await db
        .update(paymentMethods)
        .set({
          name: (body.nome ?? body.name) !== undefined ? String(body.nome ?? body.name) : undefined,
          type: (body.tipo ?? body.type) !== undefined ? (body.tipo ?? body.type) : undefined,
          feePercentage:
            (body.taxa_percentual ?? body.fee_percentage) !== undefined
              ? String(body.taxa_percentual ?? body.fee_percentage)
              : undefined,
          payoutDays:
            (body.dias_recebimento ?? body.payout_days) !== undefined
              ? Number(body.dias_recebimento ?? body.payout_days)
              : undefined,
          isActive:
            (body.ativo ?? body.is_active) !== undefined
              ? Boolean(body.ativo ?? body.is_active)
              : undefined,
          updatedAt: new Date(),
        })
        .where(
          and(eq(paymentMethods.id, id), eq(paymentMethods.organizationId, user.organizationId)),
        )
        .returning();

      if (!result) return c.json({ error: "Forma de pagamento não encontrada" }, 404);
      return c.json({ data: result });
    } catch (e) {
      console.error("[Financial/PaymentMethods] Update error:", e);
      return c.json({ error: "Erro ao atualizar forma de pagamento" }, 500);
    }
  });

  app.delete("/formas-pagamento/:id", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const { id } = c.req.param();

    try {
      const [result] = await db
        .update(paymentMethods)
        .set({ deletedAt: new Date() })
        .where(
          and(eq(paymentMethods.id, id), eq(paymentMethods.organizationId, user.organizationId)),
        )
        .returning();

      if (!result) return c.json({ error: "Forma de pagamento não encontrada" }, 404);
      return c.json({ ok: true });
    } catch (e) {
      console.error("[Financial/PaymentMethods] Delete error:", e);
      return c.json({ error: "Erro ao deletar forma de pagamento" }, 500);
    }
  });

  app.get("/convenios", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const { ativo } = c.req.query();

    const where = [eq(healthInsurances.organizationId, user.organizationId)];
    if (ativo !== undefined) {
      where.push(eq(healthInsurances.isActive, ativo === "true"));
    }

    try {
      const result = await db
        .select()
        .from(healthInsurances)
        .where(and(...where))
        .orderBy(healthInsurances.name);

      return c.json({ data: result });
    } catch (e) {
      console.error("[Financial/HealthInsurances] Get error:", e);
      return c.json({ data: [] });
    }
  });

  app.post("/convenios", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const body = (await c.req.json()) as Record<string, any>;

    if (!body.nome && !body.name) return c.json({ error: "name é obrigatório" }, 400);

    try {
      const [result] = await db
        .insert(healthInsurances)
        .values({
          organizationId: user.organizationId,
          name: String(body.nome ?? body.name),
          taxId: body.cnpj ?? body.tax_id ?? null,
          phone: body.telefone ?? body.phone ?? null,
          email: body.email ?? null,
          responsibleContact: body.contato_responsavel ?? body.responsible_contact ?? null,
          reimbursementAmount:
            (body.valor_repasse ?? body.reimbursement_amount) != null
              ? String(body.valor_repasse ?? body.reimbursement_amount)
              : null,
          paymentTermsDays:
            (body.prazo_pagamento_dias ?? body.payment_terms_days) != null
              ? Number(body.prazo_pagamento_dias ?? body.payment_terms_days)
              : null,
          notes: body.observacoes ?? body.notes ?? null,
          isActive: (body.ativo ?? body.is_active) !== false,
        })
        .returning();

      return c.json({ data: result }, 201);
    } catch (e) {
      console.error("[Financial/HealthInsurances] Create error:", e);
      return c.json({ error: "Erro ao criar convênio" }, 500);
    }
  });

  app.put("/convenios/:id", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as Record<string, any>;

    try {
      const [result] = await db
        .update(healthInsurances)
        .set({
          name: (body.nome ?? body.name) !== undefined ? String(body.nome ?? body.name) : undefined,
          taxId: (body.cnpj ?? body.tax_id) !== undefined ? (body.cnpj ?? body.tax_id) : undefined,
          phone:
            (body.telefone ?? body.phone) !== undefined ? (body.telefone ?? body.phone) : undefined,
          email: body.email !== undefined ? body.email : undefined,
          responsibleContact:
            (body.contato_responsavel ?? body.responsible_contact) !== undefined
              ? (body.contato_responsavel ?? body.responsible_contact)
              : undefined,
          reimbursementAmount:
            (body.valor_repasse ?? body.reimbursement_amount) !== undefined
              ? String(body.valor_repasse ?? body.reimbursement_amount)
              : undefined,
          paymentTermsDays:
            (body.prazo_pagamento_dias ?? body.payment_terms_days) !== undefined
              ? Number(body.prazo_pagamento_dias ?? body.payment_terms_days)
              : undefined,
          notes:
            (body.observacoes ?? body.notes) !== undefined
              ? (body.observacoes ?? body.notes)
              : undefined,
          isActive:
            (body.ativo ?? body.is_active) !== undefined
              ? (body.ativo ?? body.is_active)
              : undefined,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(healthInsurances.id, id),
            eq(healthInsurances.organizationId, user.organizationId),
          ),
        )
        .returning();

      if (!result) return c.json({ error: "Convênio não encontrado" }, 404);
      return c.json({ data: result });
    } catch (e) {
      console.error("[Financial/HealthInsurances] Update error:", e);
      return c.json({ error: "Erro ao atualizar convênio" }, 500);
    }
  });

  app.delete("/convenios/:id", requireAuth, async (c) => {
    const user = c.get("user");
    const db = createDb(c.env);
    const { id } = c.req.param();

    try {
      const [result] = await db
        .update(healthInsurances)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(healthInsurances.id, id),
            eq(healthInsurances.organizationId, user.organizationId),
          ),
        )
        .returning();

      if (!result) return c.json({ error: "Convênio não encontrado" }, 404);
      return c.json({ ok: true });
    } catch (e) {
      console.error("[Financial/HealthInsurances] Delete error:", e);
      return c.json({ error: "Erro ao deletar convênio" }, 500);
    }
  });
};
