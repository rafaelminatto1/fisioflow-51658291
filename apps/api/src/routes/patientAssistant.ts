import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { chatAiSearchOn } from "../lib/cloudflareAiSearch";
import { ASK_MATCH_THRESHOLD, mapAskSources, normalizeAskQuery, resolveAskOutcome } from "../lib/wikiAsk";
import { writeEvent } from "../lib/analytics";

export const PATIENT_ASSISTANT_DISCLAIMER =
  "Este conteúdo é educativo e não substitui a orientação do seu fisioterapeuta. Em caso de dor intensa ou piora, entre em contato com a clínica.";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Consulta exclusivamente a instância do paciente (fisioflow-rag-paciente):
// o isolamento de conteúdo é garantido pela instância, não por filtro.
app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const query = String(body.query ?? "").trim();
  if (query.length < 3) return c.json({ error: "Pergunta muito curta" }, 400);
  if (query.length > 500) return c.json({ error: "Pergunta muito longa" }, 400);

  if (!c.env.AI_SEARCH_PATIENT) {
    return c.json({ error: "Assistente indisponível no momento" }, 503);
  }

  const started = Date.now();
  try {
    const result = await chatAiSearchOn(c.env.AI_SEARCH_PATIENT, {
      messages: [
        {
          role: "system",
          content:
            "Você é o assistente de orientações da clínica FisioFlow para pacientes. Responda em Português do Brasil, com linguagem simples e acolhedora, usando APENAS o conteúdo recuperado da base de orientações. Nunca dê diagnóstico, não prescreva medicamentos nem altere condutas. Se o conteúdo não cobrir a pergunta, oriente a falar com o fisioterapeuta da clínica.",
        },
        { role: "user", content: query },
      ],
      maxNumResults: 6,
      matchThreshold: ASK_MATCH_THRESHOLD,
    });

    const outcome = resolveAskOutcome(result.answer, result.sources, ASK_MATCH_THRESHOLD);

    writeEvent(c.env, {
      route: "/api/patient/assistant",
      method: "POST",
      orgId: user.organizationId,
      event: "patient_assistant_query",
      latencyMs: Date.now() - started,
      value: outcome.topScore,
      detail: outcome.answered ? "" : normalizeAskQuery(query),
    });

    if (!outcome.answered) {
      return c.json({
        answered: false,
        answer:
          "Não encontrei uma orientação específica para essa dúvida. Fale com o seu fisioterapeuta na próxima sessão ou pelo WhatsApp da clínica.",
        sources: [],
        disclaimer: PATIENT_ASSISTANT_DISCLAIMER,
      });
    }

    return c.json({
      answered: true,
      answer: result.answer,
      sources: mapAskSources(result.sources, ASK_MATCH_THRESHOLD).map((s) => ({
        id: s.id,
        title: s.title,
      })),
      disclaimer: PATIENT_ASSISTANT_DISCLAIMER,
    });
  } catch (error: any) {
    console.error("[PatientAssistant] error:", error);
    return c.json({ error: "Falha ao consultar o assistente" }, 500);
  }
});

export { app as patientAssistantRoutes };
