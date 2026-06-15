import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../lib/auth";
import type { Env } from "../types/env";

const aiInsightsRoutes = new Hono<{ Bindings: Env }>();

aiInsightsRoutes.use("*", requireAuth);

// Endpoint for proactive dashboard widgets (Churn, Finance, Briefing)
aiInsightsRoutes.get("/widgets", async (c) => {
  const _orgId = c.get("orgId" as any);

  // In a real implementation, this would call the MCP server or execute the raw queries.
  // For now, we return mock data structured as the AI would provide.

  const mockWidgets = {
    churnRisk: [
      { id: "1", patientName: "João Silva", daysSinceLastSession: 15, riskLevel: "high" },
      { id: "2", patientName: "Maria Souza", daysSinceLastSession: 12, riskLevel: "medium" },
    ],
    financialAlerts: [
      { id: "3", patientName: "Carlos Oliveira", pendingAmount: 450.0, daysOverdue: 35 },
      { id: "4", patientName: "Ana Costa", pendingAmount: 150.0, daysOverdue: 15 },
    ],
    dailyBriefing:
      "Hoje temos 15 consultas agendadas. A taxa de ocupação está em 85%. Há 2 pacientes em risco de abandono que precisam de atenção.",
  };

  return c.json(mockWidgets);
});

// Endpoint for the AI Hub Analytics
aiInsightsRoutes.get("/analytics", async (c) => {
  const _orgId = c.get("orgId" as any);

  const mockAnalytics = {
    retention: [
      { month: "Jan", rate: 85 },
      { month: "Fev", rate: 82 },
      { month: "Mar", rate: 88 },
      { month: "Abr", rate: 86 },
      { month: "Mai", rate: 90 },
    ],
    noShow: [
      { month: "Jan", rate: 15 },
      { month: "Fev", rate: 18 },
      { month: "Mar", rate: 12 },
      { month: "Abr", rate: 14 },
      { month: "Mai", rate: 10 },
    ],
    revenueForecast: [
      { month: "Mai", actual: 15000, forecast: 16000 },
      { month: "Jun", actual: null, forecast: 18000 },
      { month: "Jul", actual: null, forecast: 20000 },
    ],
  };

  return c.json(mockAnalytics);
});

// Endpoint for the AI Command Bar (Streaming Chat)
// Uses Server-Sent Events (SSE) / ReadableStream to stream text back to the client
aiInsightsRoutes.post(
  "/chat",
  zValidator(
    "json",
    z.object({
      messages: z.array(
        z.object({
          role: z.enum(["user", "assistant", "system"]),
          content: z.string(),
        }),
      ),
    }),
  ),
  async (c) => {
    const { messages } = c.req.valid("json");
    const lastMessage = messages[messages.length - 1].content.toLowerCase();

    let responseText = "Entendido. Como posso ajudar com a gestão da sua clínica hoje?";

    if (lastMessage.includes("faltou") || lastMessage.includes("no-show")) {
      responseText =
        "Ontem tivemos 2 faltas. Os pacientes foram notificados automaticamente para reagendamento (João Silva e Maria Souza).";
    } else if (lastMessage.includes("receita") || lastMessage.includes("faturamento")) {
      responseText =
        "A receita prevista para este mês é de R$ 16.000,00. Atualmente temos R$ 600,00 em pagamentos atrasados críticos.";
    } else if (lastMessage.includes("risco") || lastMessage.includes("abandono")) {
      responseText =
        "Detectei 2 pacientes que não comparecem há mais de 10 dias. Sugiro enviar uma mensagem de acompanhamento. Posso criar um rascunho de WhatsApp para você.";
    }

    // Simulate streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const words = responseText.split(" ");
        for (const word of words) {
          // Standard data format for streaming
          controller.enqueue(new TextEncoder().encode(word + " "));
          await new Promise((r) => setTimeout(r, 50)); // Simulate token latency
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  },
);

export { aiInsightsRoutes };
