import { Hono } from "hono";
import { Env } from "../types/env";
import { AITutorAgent, ChatMessage } from "../services/ai/AITutorAgent";
import { PatientSimulatorAgent, SimulatorProfile } from "../services/ai/PatientSimulatorAgent";
import { ChartGenerationAgent } from "../services/ai/ChartGenerationAgent";
import { SoapReviewAgent } from "../services/ai/SoapReviewAgent";
import { ResourceSearchService } from "../services/ai/ResourceSearchService";
import { requireAuth, AuthVariables } from "../lib/auth";

export const aiAgentsRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

function hasCallAIProvider(env: Env): boolean {
  return Boolean(
    env.ZAI_API_KEY || env.AI || env.GOOGLE_AI_API_KEY || env.FISIOFLOW_AI_GATEWAY_URL,
  );
}

aiAgentsRoutes.post("/resources/search", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const types = Array.isArray(body.types) ? body.types : ["test", "exercise", "protocol", "wiki"];
  const context = body.context;

  if (!query) return c.json({ error: "query is required" }, 400);

  const user = c.get("user");
  const searchService = new ResourceSearchService(c.env);

  try {
    const resources = await searchService.searchResources(query, user.organizationId, context, types);
    return c.json({ data: { resources } });
  } catch (error: any) {
    return c.json({ error: error.message || "Search failed" }, 500);
  }
});

aiAgentsRoutes.post("/resources/suggest", requireAuth, async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { resource, query } = body;
    if (!resource || !query) return c.json({ error: "resource and query are required" }, 400);

    const user = c.get("user");
    const searchService = new ResourceSearchService(c.env);

    try {
        await searchService.saveSuggestion(user.organizationId, user.uid, resource, query);
        return c.json({ success: true });
    } catch (error: any) {
        return c.json({ error: error.message || "Failed to save suggestion" }, 500);
    }
});

aiAgentsRoutes.post("/soap-review", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!text) {
    return c.json({ error: "SOAP text is required" }, 400);
  }

  if (!hasCallAIProvider(c.env)) {
    return c.json({ error: "AI not configured" }, 503);
  }

  const agent = new SoapReviewAgent(c.env);

  try {
    const review = await agent.reviewSoapNote(text);
    return c.json({ data: review });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to process SOAP note" }, 500);
  }
});

aiAgentsRoutes.post("/tutor/chat", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const patientProfile =
    typeof body.patientProfile === "string" ? body.patientProfile : "Standard Patient";
  const exerciseContext =
    typeof body.exerciseContext === "string" ? body.exerciseContext : "General Physiotherapy";
  const chatHistory = Array.isArray(body.chatHistory) ? body.chatHistory : [];
  const newMessage = typeof body.newMessage === "string" ? body.newMessage : "";

  if (!newMessage) {
    return c.json({ error: "newMessage is required" }, 400);
  }

  if (!c.env.GOOGLE_AI_API_KEY) {
    return c.json({ error: "AI not configured" }, 503);
  }

  const agent = new AITutorAgent(c.env);

  try {
    const stream = await agent.generateTutorResponseStream(
      patientProfile,
      exerciseContext,
      chatHistory as ChatMessage[],
      newMessage,
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to generate tutor response" }, 500);
  }
});

aiAgentsRoutes.post("/simulator/chat", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const profile = body.profile as SimulatorProfile | undefined;
  const chatHistory = Array.isArray(body.chatHistory) ? body.chatHistory : [];
  const agentLastMessage = typeof body.agentLastMessage === "string" ? body.agentLastMessage : "";

  if (!profile || !agentLastMessage) {
    return c.json({ error: "profile and agentLastMessage are required" }, 400);
  }

  if (!hasCallAIProvider(c.env)) {
    return c.json({ error: "AI not configured" }, 503);
  }

  const user = c.get("user");
  const simulator = new PatientSimulatorAgent(c.env);

  try {
    const result = await simulator.generateSimulatedResponse(
      profile,
      chatHistory,
      agentLastMessage,
      user.organizationId
    );
    return c.json({ data: result });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to generate simulation" }, 500);
  }
});

aiAgentsRoutes.post("/simulator/evaluate", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const profile = body.profile as SimulatorProfile | undefined;
  const chatHistory = Array.isArray(body.chatHistory) ? body.chatHistory : [];

  if (!profile || chatHistory.length === 0) {
    return c.json({ error: "profile and chatHistory are required" }, 400);
  }

  if (!hasCallAIProvider(c.env)) {
    return c.json({ error: "AI not configured" }, 503);
  }

  const simulator = new PatientSimulatorAgent(c.env);

  try {
    const result = await simulator.evaluateClinicalPerformance(profile, chatHistory);
    return c.json({ data: result });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to evaluate simulation" }, 500);
  }
});

aiAgentsRoutes.post("/charts/generate", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const clinicalDataSummary =
    typeof body.clinicalDataSummary === "string" ? body.clinicalDataSummary : "";
  const focusArea = typeof body.focusArea === "string" ? body.focusArea : "general";

  if (!clinicalDataSummary) {
    return c.json({ error: "clinicalDataSummary is required" }, 400);
  }

  if (!c.env.GOOGLE_AI_API_KEY) {
    return c.json({ error: "AI not configured" }, 503);
  }

  const agent = new ChartGenerationAgent(c.env);

  try {
    const result = await agent.generateChartConfig(clinicalDataSummary, focusArea as any);
    return c.json({ data: result });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to generate chart config" }, 500);
  }
});

// ===== CHAT COM O CLINIC AGENT (DO por organização) =====
aiAgentsRoutes.post("/clinic/chat", requireAuth, async (c) => {
  const user = c.get("user");
  if (!c.env.CLINIC_AGENT) return c.json({ error: "ClinicAgent não disponível" }, 503);

  const body = (await c.req.json().catch(() => ({}))) as { message?: string };
  const message = String(body.message ?? "").trim();
  if (!message) return c.json({ error: "message é obrigatória" }, 400);

  try {
    const stub = c.env.CLINIC_AGENT.get(c.env.CLINIC_AGENT.idFromName(user.organizationId));
    await (stub as any).setOrgId({ orgId: user.organizationId }).catch(() => {});
    const result = await (stub as any).chat({ message });
    return c.json({ data: result });
  } catch (error: any) {
    console.error("[ClinicAgent chat] error:", error);
    return c.json({ error: "Falha ao consultar o agente da clínica" }, 500);
  }
});
