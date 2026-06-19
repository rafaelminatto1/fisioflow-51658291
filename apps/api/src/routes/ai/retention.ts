import { Hono } from "hono";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth } from "../../lib/auth";
import { isUuid } from "../../lib/validators";
import { rateLimit } from "../../middleware/rateLimit";

/**
 * Proxy REST para o PatientAgent (Durable Object SQLite, Agents SDK).
 *
 * GET    /api/ai/retention/:patientId            → estado atual do agente
 * POST   /api/ai/retention/:patientId/update     → reavalia risco {name?, painLevel?, missedSession?}
 * POST   /api/ai/retention/:patientId/draft      → gera rascunho de reengajamento via Workers AI
 * POST   /api/ai/retention/:patientId/dismiss    → arquiva a ação e reseta o agente
 *
 * Rate limit: 60 chamadas/org/min para evitar abuso do DO.
 */
const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("*", requireAuth, rateLimit({ endpoint: "retention", limit: 60, windowSeconds: 60 }));

function getStub(c: { env: Env }, patientId: string) {
  const ns = c.env.PATIENT_AGENT;
  if (!ns) return null;
  return ns.get(ns.idFromName(patientId)) as any;
}

function handleError(e: unknown, context: string) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[Retention] ${context}:`, msg);
  return { error: `Falha ao ${context}`, details: msg };
}

// ── GET /:patientId ────────────────────────────────────────────────────────

app.get("/:patientId", async (c) => {
  const patientId = c.req.param("patientId");
  if (!isUuid(patientId)) return c.json({ error: "patientId inválido" }, 400);

  const stub = getStub(c, patientId);
  if (!stub) return c.json({ error: "PATIENT_AGENT indisponível" }, 503);

  try {
    const state = await stub.getStatus();
    return c.json({ data: state });
  } catch (e) {
    return c.json(handleError(e, "ler o agente"), 500);
  }
});

// ── POST /:patientId/update ────────────────────────────────────────────────

app.post("/:patientId/update", async (c) => {
  const patientId = c.req.param("patientId");
  if (!isUuid(patientId)) return c.json({ error: "patientId inválido" }, 400);

  const user = c.get("user");
  if (!user?.organizationId) return c.json({ error: "organizationId obrigatório" }, 400);

  const body = (await c.req.json().catch(() => ({}))) as {
    name?: string;
    painLevel?: number;
    missedSession?: boolean;
  };

  if (typeof body.painLevel === "number" && (body.painLevel < 0 || body.painLevel > 10)) {
    return c.json({ error: "painLevel deve estar entre 0 e 10" }, 400);
  }

  const stub = getStub(c, patientId);
  if (!stub) return c.json({ error: "PATIENT_AGENT indisponível" }, 503);

  try {
    const data = await stub.updateClinicalStatus({
      organizationId: user.organizationId,
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(typeof body.painLevel === "number" ? { painLevel: body.painLevel } : {}),
      ...(body.missedSession ? { missedSession: true } : {}),
    });
    return c.json({ data });
  } catch (e) {
    return c.json(handleError(e, "atualizar o agente"), 500);
  }
});

// ── POST /:patientId/draft ─────────────────────────────────────────────────

app.post("/:patientId/draft", async (c) => {
  const patientId = c.req.param("patientId");
  if (!isUuid(patientId)) return c.json({ error: "patientId inválido" }, 400);

  const stub = getStub(c, patientId);
  if (!stub) return c.json({ error: "PATIENT_AGENT indisponível" }, 503);

  try {
    await stub.generateRetentionDraft();
    const state = await stub.getStatus();
    return c.json({ data: state });
  } catch (e) {
    return c.json(handleError(e, "gerar rascunho"), 500);
  }
});

// ── POST /:patientId/dismiss ───────────────────────────────────────────────

app.post("/:patientId/dismiss", async (c) => {
  const patientId = c.req.param("patientId");
  if (!isUuid(patientId)) return c.json({ error: "patientId inválido" }, 400);

  const stub = getStub(c, patientId);
  if (!stub) return c.json({ error: "PATIENT_AGENT indisponível" }, 503);

  try {
    await stub.dismissAction();
    const state = await stub.getStatus();
    return c.json({ data: state });
  } catch (e) {
    return c.json(handleError(e, "arquivar ação"), 500);
  }
});

export { app as aiRetentionRoutes };
