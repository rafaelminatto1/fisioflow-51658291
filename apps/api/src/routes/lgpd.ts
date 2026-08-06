import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { getRawSql } from "../lib/db";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
app.use("*", requireAuth);

const deletionRequestSchema = z.object({
  patient_id: z.string().uuid().optional(),
  requester_email: z.string().email(),
  requester_name: z.string().min(1).max(200).optional(),
  scope: z.enum(["all", "cadastral", "marketing"]),
  request_origin: z.string().max(32).optional(),
});

const exportRequestSchema = z.object({
  format: z.enum(["json", "csv", "pdf"]).default("json"),
  types: z.array(z.enum(["appointments", "evolutions", "exercises", "profile"])).min(1),
  dateRange: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
  request_origin: z.string().max(32).optional(),
});

/**
 * POST /api/lgpd/data-export-request
 * LGPD art. 18 V/VI — registra pedido de portabilidade/acesso do proprio usuario.
 *
 * Registra o pedido e devolve o prazo; a geracao do arquivo e feita pelo
 * encarregado. A alternativa seria montar o export na hora, mas exportacao de
 * prontuario nao e coisa que se dispare sem conferencia humana.
 */
app.post("/data-export-request", zValidator("json", exportRequestSchema), async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");
  const orgId = user.organizationId;
  if (!orgId) return c.json({ error: "missing_org_context" }, 400);

  const sql = getRawSql(c.env, "write");
  const result = await sql`
    INSERT INTO public.lgpd_export_requests
      (organization_id, requester_user_id, requester_email, requester_name, request_origin,
       format, types, date_range_start, date_range_end, status, response_summary)
    VALUES
      (${orgId}, ${user.uid}, ${user.email ?? ""}, ${null},
       ${body.request_origin ?? "professional_app"}, ${body.format}, ${body.types},
       ${body.dateRange?.start ?? null}, ${body.dateRange?.end ?? null}, 'received',
       ${"Pedido de exportacao registrado. Sera atendido em ate 15 dias uteis (LGPD art. 18)."})
    RETURNING id, status, format, types, response_summary, due_at, created_at
  `;

  return c.json({ data: result.rows[0] }, 201);
});

/**
 * GET /api/lgpd/data-export-requests
 * Pedidos de exportacao do proprio usuario.
 */
app.get("/data-export-requests", async (c) => {
  const user = c.get("user");
  const orgId = user.organizationId;
  if (!orgId) return c.json({ error: "missing_org_context" }, 400);

  const sql = getRawSql(c.env, "write");
  const result = await sql`
    SELECT id, status, format, types, response_summary, result_url, due_at, responded_at, created_at
      FROM public.lgpd_export_requests
     WHERE organization_id = ${orgId} AND requester_user_id = ${user.uid}
     ORDER BY created_at DESC
     LIMIT 50
  `;

  return c.json({ data: result.rows });
});

/**
 * POST /api/lgpd/data-deletion-request
 * LGPD G3 (Parecer DPO 2026-05-19) — registra pedido de exclusao com resposta
 * automatizada documentando base legal da retencao clinica.
 *
 * scope=all → registra mas marca `denied_clinical_retention` (com explicacao).
 *             Cadastrais e marketing seguem para `in_review` (humano valida).
 * scope=cadastral → `in_review`
 * scope=marketing → completa imediatamente (revoga consentimento marketing).
 */
app.post("/data-deletion-request", zValidator("json", deletionRequestSchema), async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");
  const orgId = user.organizationId;
  if (!orgId) return c.json({ error: "missing_org_context" }, 400);

  let status: string;
  let response_summary: string;
  let legal_basis: string | null = null;
  let responded_at: Date | null = null;

  if (body.scope === "all") {
    status = "denied_clinical_retention";
    response_summary =
      "Pedido recebido. Dados clinicos (prontuario, evolucoes, exames) sao mantidos por no minimo 20 anos do ultimo atendimento conforme Lei 13.787/2018 art. 6 e Resolucao COFFITO 415/2012 art. 6 (base legal LGPD art. 11 II f c/c art. 16 II). Dados cadastrais (nome, e-mail, telefone) podem ser excluidos sob novo pedido com scope=cadastral.";
    legal_basis = "LGPD art. 16 II + Lei 13.787/2018 art. 6";
    responded_at = new Date();
  } else if (body.scope === "marketing") {
    status = "completed";
    response_summary =
      "Consentimento de marketing revogado. Voce nao recebera mais comunicacoes promocionais. Tratamento clinico continua sob base legal art. 11 II f.";
    legal_basis = "LGPD art. 18 IX";
    responded_at = new Date();
  } else {
    status = "in_review";
    response_summary =
      "Pedido de exclusao de dados cadastrais recebido. Sera atendido em ate 15 dias uteis. Dados clinicos (prontuario) permanecem retidos conforme Lei 13.787/2018.";
  }

  const sql = getRawSql(c.env, "write");
  const result = await sql`
    INSERT INTO public.lgpd_deletion_requests
      (organization_id, patient_id, requester_email, requester_name, scope, status, response_summary, legal_basis, responded_at, request_origin)
    VALUES
      (${orgId}, ${body.patient_id ?? null}, ${body.requester_email}, ${body.requester_name ?? null},
       ${body.scope}, ${status}, ${response_summary}, ${legal_basis}, ${responded_at}, ${body.request_origin ?? "patient_portal"})
    RETURNING id, status, response_summary, legal_basis, due_at, responded_at, created_at
  `;

  return c.json({ data: result.rows[0] }, 201);
});

/**
 * GET /api/lgpd/data-deletion-requests?status=
 * Lista pedidos da org (admin).
 */
app.get("/data-deletion-requests", async (c) => {
  const user = c.get("user");
  const orgId = user.organizationId;
  if (!orgId) return c.json({ error: "missing_org_context" }, 400);

  const status = c.req.query("status");
  // `requester_email` permite ao app pedir só os próprios pedidos, em vez de
  // baixar a fila inteira da organização para filtrar no cliente.
  const requesterEmail = c.req.query("requester_email");
  const sql = getRawSql(c.env, "write");

  const result = await sql`
    SELECT * FROM public.lgpd_deletion_requests
    WHERE organization_id = ${orgId}
      AND (${status ?? null}::text IS NULL OR status = ${status ?? null})
      AND (${requesterEmail ?? null}::text IS NULL OR requester_email = ${requesterEmail ?? null})
    ORDER BY created_at DESC
    LIMIT 200
  `;

  return c.json({ data: result.rows });
});

/**
 * GET /api/lgpd/clinical-access-logs?patient_id=&limit=
 * Auditoria de acessos clinicos (admin). Por padrao retorna ultimos 200.
 */
app.get("/clinical-access-logs", async (c) => {
  const user = c.get("user");
  const orgId = user.organizationId;
  if (!orgId) return c.json({ error: "missing_org_context" }, 400);

  const patientId = c.req.query("patient_id");
  const limit = Math.min(Number(c.req.query("limit") ?? 200), 1000);
  const sql = getRawSql(c.env, "write");

  const result = patientId
    ? await sql`SELECT id, user_id, patient_id, session_id, resource, action, source, created_at, request_ip
                FROM public.clinical_access_logs
                WHERE organization_id = ${orgId} AND patient_id = ${patientId}
                ORDER BY created_at DESC LIMIT ${limit}`
    : await sql`SELECT id, user_id, patient_id, session_id, resource, action, source, created_at, request_ip
                FROM public.clinical_access_logs
                WHERE organization_id = ${orgId}
                ORDER BY created_at DESC LIMIT ${limit}`;

  return c.json({ data: result.rows });
});

export { app as lgpdRoutes };
