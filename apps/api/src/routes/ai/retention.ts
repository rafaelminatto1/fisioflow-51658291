import { Hono } from "hono";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth } from "../../lib/auth";
import { isUuid } from "../../lib/validators";

/**
 * Proxy REST para o PatientAgent (Durable Object SQLite, Agents SDK).
 * GET    /api/ai/retention/:patientId            → estado atual do agente
 * POST   /api/ai/retention/:patientId/update     → reavalia risco {name?, painLevel?, missedSession?}
 * POST   /api/ai/retention/:patientId/draft      → gera rascunho de reengajamento
 * POST   /api/ai/retention/:patientId/dismiss    → arquiva a ação
 */
const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

function stubFor(c: { env: Env }, patientId: string) {
  const ns = c.env.PATIENT_AGENT;
  if (!ns) return null;
  return ns.get(ns.idFromName(patientId)) as any;
}

app.get("/:patientId", requireAuth, async (c) => {
  const patientId = c.req.param("patientId");
  if (!isUuid(patientId)) return c.json({ error: "patientId inválido" }, 400);
  const stub = stubFor(c, patientId);
  if (!stub) return c.json({ error: "PATIENT_AGENT indisponível" }, 503);
  try {
    return c.json({ data: await stub.getStatus() });
  } catch (e) {
    return c.json({ error: "Falha ao ler o agente", details: (e as Error).message }, 500);
  }
});

app.post("/:patientId/update", requireAuth, async (c) => {
  const patientId = c.req.param("patientId");
  if (!isUuid(patientId)) return c.json({ error: "patientId inválido" }, 400);
  const user = c.get("user");
  const body = (await c.req.json().catch(() => ({}))) as {
    name?: string;
    painLevel?: number;
    missedSession?: boolean;
  };
  const stub = stubFor(c, patientId);
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
    return c.json({ error: "Falha ao atualizar o agente", details: (e as Error).message }, 500);
  }
});

app.post("/:patientId/draft", requireAuth, async (c) => {
  const patientId = c.req.param("patientId");
  if (!isUuid(patientId)) return c.json({ error: "patientId inválido" }, 400);
  const stub = stubFor(c, patientId);
  if (!stub) return c.json({ error: "PATIENT_AGENT indisponível" }, 503);
  try {
    await stub.generateRetentionDraft();
    return c.json({ data: await stub.getStatus() });
  } catch (e) {
    return c.json({ error: "Falha ao gerar rascunho", details: (e as Error).message }, 500);
  }
});

app.post("/:patientId/dismiss", requireAuth, async (c) => {
  const patientId = c.req.param("patientId");
  if (!isUuid(patientId)) return c.json({ error: "patientId inválido" }, 400);
  const stub = stubFor(c, patientId);
  if (!stub) return c.json({ error: "PATIENT_AGENT indisponível" }, 503);
  try {
    await stub.dismissAction();
    return c.json({ data: await stub.getStatus() });
  } catch (e) {
    return c.json({ error: "Falha ao arquivar ação", details: (e as Error).message }, 500);
  }
});

export { app as aiRetentionRoutes };
