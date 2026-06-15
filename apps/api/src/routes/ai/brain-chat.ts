import { Hono } from "hono";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth } from "../../lib/auth";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * POST /api/ai/brain/chat/:patientId
 * Chat consultivo com o FisioFlow Brain.
 */
app.post("/:patientId", requireAuth, async (c) => {
  const patientId = c.req.param("patientId");
  const { question, context } = await c.req.json();

  if (!question) return c.json({ error: "Pergunta vazia" }, 400);

  try {
    if (!c.env.PATIENT_AGENT) throw new Error("Durable Object PATIENT_AGENT não configurado");

    // Usar Durable Object para manter o "cérebro" do paciente ativo
    const id = c.env.PATIENT_AGENT.idFromName(patientId);
    const stub = c.env.PATIENT_AGENT.get(id);

    // No modo real, o stub chamaria consultBrain
    // Como estamos usando a lib 'agents', chamamos via RPC
    const response = await (stub as any).consultBrain({
      question,
      historyContext: context,
    });

    return c.json({
      success: true,
      answer: response.answer,
    });
  } catch (error: any) {
    console.error("[AI/Brain/Chat] Error:", error);
    return c.json({ error: "Erro na conversa com o Brain" }, 500);
  }
});

export { app as aiBrainChatRoutes };
