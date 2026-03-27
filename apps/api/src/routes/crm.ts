import { Hono } from "hono";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  leads, 
  leadHistorico, 
  crmTarefas, 
  crmCampanhas, 
  crmCampanhaEnvios 
} from "@fisioflow/db";
import { createDb, queryWithCache } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ===== HELPER: CÁLCULO DE SCORE NO BACKEND =====

function calculateBackendLeadScore(lead: any) {
  let totalScore = 0;
  let engagementScore = 0;
  let demographicScore = 0;
  let behavioralScore = 0;
  const factors: any[] = [];

  if (lead.email) {
    demographicScore += 10;
    factors.push({ type: "email", description: "Possui email", points: 10 });
  }

  if (lead.telefone) {
    demographicScore += 15;
    factors.push({ type: "phone", description: "Possui telefone", points: 15 });
  }

  if (lead.origem === "indicacao") {
    demographicScore += 20;
    factors.push({ type: "source", description: "Vindo de indicação", points: 20 });
  }

  if (lead.dataUltimoContato) {
    engagementScore += 15;
    factors.push({ type: "engagement", description: "Contato recente registrado", points: 15 });
  }

  if (lead.interesse) {
    engagementScore += 10;
    factors.push({ type: "interest", description: "Interesse informado", points: 10 });
  }

  if (lead.estagio === "avaliacao_agendada" || lead.estagio === "avaliacao_realizada") {
    behavioralScore += 30;
    factors.push({ type: "stage", description: "Lead avançado no funil", points: 30 });
  } else if (lead.estagio === "em_contato") {
    behavioralScore += 15;
    factors.push({ type: "stage", description: "Lead em contato", points: 15 });
  }

  totalScore = demographicScore + engagementScore + behavioralScore;

  return {
    leadId: lead.id,
    totalScore,
    engagementScore,
    demographicScore,
    behavioralScore,
    factors,
    category: totalScore >= 70 ? "hot" : totalScore >= 40 ? "warm" : "cold",
  };
}

// ===== LEADS =====

app.get("/leads", requireAuth, async (c) => {
  const user = c.get("user");
  const { estagio, responsavelId, limit = "50", offset = "0" } = c.req.query();
  
  const cacheKey = `leads:${user.organizationId}:${estagio || "all"}:${responsavelId || "all"}:${limit}:${offset}`;
  
  const data = await queryWithCache(c.env, cacheKey, 60, async () => {
    const db = createDb(c.env);
    const conditions = [eq(leads.organizationId, user.organizationId)];
    
    if (estagio) conditions.push(eq(leads.estagio, estagio));
    if (responsavelId) conditions.push(eq(leads.responsavelId, responsavelId));

    return await db.query.leads.findMany({
      where: and(...conditions),
      orderBy: [desc(leads.createdAt)],
      limit: Number(limit),
      offset: Number(offset),
    });
  });

  return c.json({ data });
});

/**
 * Novo Endpoint: Lead Scores Calculados no Backend
 */
app.get("/leads/scores", requireAuth, async (c) => {
  const user = c.get("user");
  const { leadId } = c.req.query();
  const db = createDb(c.env);

  const conditions = [eq(leads.organizationId, user.organizationId)];
  if (leadId) conditions.push(eq(leads.id, leadId));

  const allLeads = await db.query.leads.findMany({
    where: and(...conditions),
  });

  const scores = allLeads.map(calculateBackendLeadScore);
  return c.json({ data: scores });
});

app.get("/leads/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const db = createDb(c.env);

  const result = await db.query.leads.findFirst({
    where: and(eq(leads.id, id), eq(leads.organizationId, user.organizationId)),
  });

  if (!result) return c.json({ error: "Lead não encontrado" }, 404);
  return c.json({ data: result });
});

app.post("/leads", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const db = createDb(c.env);

  if (!body.nome) return c.json({ error: "nome é obrigatório" }, 400);

  const [newLead] = await db.insert(leads).values({
    organizationId: user.organizationId,
    nome: body.nome,
    telefone: body.telefone,
    email: body.email,
    origem: body.origem,
    estagio: body.estagio || "aguardando",
    responsavelId: body.responsavel_id || user.uid,
    dataPrimeiroContato: body.data_primeiro_contato ? new Date(body.data_primeiro_contato) : null,
    dataUltimoContato: body.data_ultimo_contato ? new Date(body.data_ultimo_contato) : null,
    interesse: body.interesse,
    observacoes: body.observacoes,
    motivoNaoEfetivacao: body.motivo_nao_efetivacao,
  }).returning();

  return c.json({ data: newLead }, 201);
});

app.put("/leads/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const body = await c.req.json();
  const db = createDb(c.env);

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (body.nome !== undefined) updateData.nome = body.nome;
  if (body.telefone !== undefined) updateData.telefone = body.telefone;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.origem !== undefined) updateData.origem = body.origem;
  if (body.estagio !== undefined) updateData.estagio = body.estagio;
  if (body.responsavel_id !== undefined) updateData.responsavelId = body.responsavel_id;
  if (body.data_primeiro_contato !== undefined) updateData.dataPrimeiroContato = body.data_primeiro_contato ? new Date(body.data_primeiro_contato) : null;
  if (body.data_ultimo_contato !== undefined) updateData.dataUltimoContato = body.data_ultimo_contato ? new Date(body.data_ultimo_contato) : null;
  if (body.interesse !== undefined) updateData.interesse = body.interesse;
  if (body.observacoes !== undefined) updateData.observacoes = body.observacoes;
  if (body.motivo_nao_efetivacao !== undefined) updateData.motivoNaoEfetivacao = body.motivo_nao_efetivacao;

  const [updatedLead] = await db.update(leads)
    .set(updateData)
    .where(and(eq(leads.id, id), eq(leads.organizationId, user.organizationId)))
    .returning();

  if (!updatedLead) return c.json({ error: "Lead não encontrado" }, 404);
  return c.json({ data: updatedLead });
});

app.delete("/leads/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const db = createDb(c.env);

  const result = await db.delete(leads)
    .where(and(eq(leads.id, id), eq(leads.organizationId, user.organizationId)))
    .returning({ id: leads.id });

  if (!result.length) return c.json({ error: "Lead não encontrado" }, 404);
  return c.json({ ok: true });
});

// ===== HISTORICO DO LEAD =====

app.get("/leads/:id/historico", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const db = createDb(c.env);

  const data = await db.query.leadHistorico.findMany({
    where: and(eq(leadHistorico.leadId, id), eq(leadHistorico.organizationId, user.organizationId)),
    orderBy: [desc(leadHistorico.createdAt)],
  });

  return c.json({ data });
});

app.post("/leads/:id/historico", requireAuth, async (c) => {
  const user = c.get("user");
  const { id: leadId } = c.req.param();
  const body = await c.req.json();
  const db = createDb(c.env);

  const [newHistory] = await db.insert(leadHistorico).values({
    organizationId: user.organizationId,
    leadId,
    tipoContato: body.tipo_contato,
    descricao: body.descricao,
    resultado: body.resultado,
    proximoContato: body.proximo_contato ? new Date(body.proximo_contato) : null,
    createdBy: user.uid,
  }).returning();

  return c.json({ data: newHistory }, 201);
});

// ===== TAREFAS CRM =====

app.get("/tarefas", requireAuth, async (c) => {
  const user = c.get("user");
  const { status, responsavelId, leadId } = c.req.query();
  const db = createDb(c.env);

  const conditions = [eq(crmTarefas.organizationId, user.organizationId)];
  if (status) conditions.push(eq(crmTarefas.status, status));
  if (responsavelId) conditions.push(eq(crmTarefas.responsavelId, responsavelId));
  if (leadId) conditions.push(eq(crmTarefas.leadId, leadId));

  const data = await db.query.crmTarefas.findMany({
    where: and(...conditions),
    orderBy: [sql`${crmTarefas.dueDate} ASC NULLS LAST`, desc(crmTarefas.createdAt)],
  });

  return c.json({ data });
});

app.post("/tarefas", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const db = createDb(c.env);

  if (!body.titulo) return c.json({ error: "titulo é obrigatório" }, 400);

  const [newTask] = await db.insert(crmTarefas).values({
    organizationId: user.organizationId,
    titulo: body.titulo,
    descricao: body.descricao,
    status: body.status || "pendente",
    responsavelId: body.responsavel_id || user.uid,
    leadId: body.lead_id,
    dueDate: body.due_date ? new Date(body.due_date) : null,
  }).returning();

  return c.json({ data: newTask }, 201);
});

// ===== CAMPANHAS CRM =====

app.get("/campanhas", requireAuth, async (c) => {
  const user = c.get("user");
  const { status, tipo, limit = "50", offset = "0" } = c.req.query();
  const db = createDb(c.env);

  const conditions = [eq(crmCampanhas.organizationId, user.organizationId)];
  if (status) conditions.push(eq(crmCampanhas.status, status));
  if (tipo) conditions.push(eq(crmCampanhas.tipo, tipo));

  const data = await db.query.crmCampanhas.findMany({
    where: and(...conditions),
    orderBy: [desc(crmCampanhas.createdAt)],
    limit: Number(limit),
    offset: Number(offset),
  });

  return c.json({ data });
});

app.post("/campanhas", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const db = createDb(c.env);

  if (!body.nome || !body.tipo) {
    return c.json({ error: "nome e tipo são obrigatórios" }, 400);
  }

  const patientIds = Array.isArray(body.patient_ids) ? body.patient_ids : [];

  const [campaign] = await db.insert(crmCampanhas).values({
    organizationId: user.organizationId,
    createdBy: user.uid,
    nome: body.nome,
    tipo: body.tipo,
    conteudo: body.conteudo,
    status: body.status || "concluida",
    totalDestinatarios: patientIds.length,
    totalEnviados: patientIds.length,
    agendadaEm: body.agendada_em ? new Date(body.agendada_em) : null,
    concluidaEm: body.concluida_em ? new Date(body.concluida_em) : new Date(),
  }).returning();

  if (patientIds.length > 0) {
    const envios = patientIds.map((pid: string) => ({
      campanhaId: campaign.id,
      patientId: pid,
      canal: body.tipo,
      status: "enviado",
      enviadoEm: campaign.concluidaEm,
    }));
    await db.insert(crmCampanhaEnvios).values(envios);
  }

  return c.json({ data: campaign }, 201);
});

app.put("/campanhas/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const body = await c.req.json();
  const db = createDb(c.env);

  const updateData: any = { updatedAt: new Date() };
  if (body.nome !== undefined) updateData.nome = body.nome;
  if (body.tipo !== undefined) updateData.tipo = body.tipo;
  if (body.conteudo !== undefined) updateData.conteudo = body.conteudo;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.total_destinatarios !== undefined) updateData.totalDestinatarios = Number(body.total_destinatarios);
  if (body.total_enviados !== undefined) updateData.totalEnviados = Number(body.total_enviados);
  if (body.agendada_em !== undefined) updateData.agendadaEm = body.agendada_em ? new Date(body.agendada_em) : null;
  if (body.concluida_em !== undefined) updateData.concluidaEm = body.concluida_em ? new Date(body.concluida_em) : null;

  const [updated] = await db.update(crmCampanhas)
    .set(updateData)
    .where(and(eq(crmCampanhas.id, id), eq(crmCampanhas.organizationId, user.organizationId)))
    .returning();

  if (!updated) return c.json({ error: "Campanha não encontrada" }, 404);
  return c.json({ data: updated });
});

app.delete("/campanhas/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const db = createDb(c.env);

  const result = await db.delete(crmCampanhas)
    .where(and(eq(crmCampanhas.id, id), eq(crmCampanhas.organizationId, user.organizationId)))
    .returning();

  if (!result.length) return c.json({ error: "Campanha não encontrada" }, 404);
  return c.json({ ok: true });
});

export { app as crmRoutes };
