import { Hono } from "hono";
import type { AuthVariables } from "../../lib/auth";
import type { Env } from "../../types/env";

import { callGemini, streamGeminiChat } from "../../lib/ai-gemini";
import { smartChat, smartStructured } from "../../lib/ai/smartAI";
import { unifiedThinking, unifiedStructured } from "../../lib/ai/unifiedAI";
import { runAi, summarizeClinicalNote } from "../../lib/ai-native";
import { logToAxiom } from "../../lib/axiom";
import {
  ClinicalReportSchema,
  ExerciseSuggestionSchema,
  FastProcessingSchema,
  FormSuggestionSchema,
  TreatmentAdherenceSchema,
} from "../../schemas/ai-schemas";
import {
  safeText,
  inferRiskLevel,
  buildClinicalReport,
  buildFormSuggestions,
  buildExecutiveSummary,
} from "./ai-helpers";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.post("/service", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "");
  const data =
    body.data && typeof body.data === "object" ? (body.data as Record<string, unknown>) : body;

  switch (action) {
    case "clinicalChat": {
      const message = safeText(data.message);
      const context =
        data.context && typeof data.context === "object"
          ? (data.context as Record<string, unknown>)
          : {};

      const prompt = `Você é um assistente especializado em fisioterapia.
      Contexto do paciente: ${JSON.stringify(context)}
      Pergunta do profissional: ${message}`;

      const systemInstruction =
        "Responda de forma técnica, concisa e baseada em evidências clínicas. Use o raciocínio clínico profundo para oferecer a melhor orientação.";

      const start = performance.now();
      try {
        const result = await smartChat(c.env, {
          task: "chat",
          prompt,
          thinkingLevel: "MEDIUM",
          systemInstruction,
          temperature: 0.4,
        });
        const duration = performance.now() - start;

        c.executionCtx.waitUntil(
          logToAxiom(c.env, c.executionCtx, {
            level: "info",
            type: "ai_inference_latency",
            message: "smartChat clinicalChat completed",
            metadata: {
              action: "clinicalChat",
              durationMs: duration,
            },
          }),
        );

        return c.json({ data: { response: result.text, thoughts: result.thoughts } });
      } catch (error) {
        console.error("clinicalChat failed:", error);
        const response = await callGemini(
          c.env.GOOGLE_AI_API_KEY,
          prompt,
          "gemini-1.5-flash",
          c.env.FISIOFLOW_AI_GATEWAY_URL,
        );
        return c.json({ data: { response } });
      }
    }
    case "exerciseSuggestion": {
      const goals = Array.isArray(data.goals) ? data.goals.map((goal) => String(goal)) : [];
      const prompt = `Sugira 3 a 5 exercícios de fisioterapia apropriados para os objetivos: ${goals.join(", ")}. Inclua nome, justificativa clínica objetiva, área/articulação alvo e, quando pertinente, séries/repetições.`;

      const systemInstruction =
        "Você é um fisioterapeuta especialista em prescrição de exercícios. Retorne exercícios seguros, progressivos e com embasamento clínico em português brasileiro.";

      try {
        const { data: parsed } = await smartStructured(c.env, {
          task: "exercise",
          schema: ExerciseSuggestionSchema,
          prompt,
          thinkingLevel: "LOW",
          systemInstruction,
          temperature: 0.6,
        });
        return c.json({ data: { success: true, data: parsed } });
      } catch (error) {
        c.executionCtx.waitUntil(
          logToAxiom(c.env, c.executionCtx, {
            level: "error",
            type: "ai_inference_error",
            message: "exerciseSuggestion failed",
            metadata: {
              action: "exerciseSuggestion",
              error: error instanceof Error ? error.message : String(error),
            },
          }),
        );
        return c.json({ data: { success: true, data: { exercises: [] } } });
      }
    }
    case "eventPlanning": {
      const category = safeText(data.category);
      const participants = safeText(data.participants);
      const prompt = `
        Aja como um gestor de eventos de fisioterapia experiente.
        Planeje o kit clínico e logístico necessário para um evento do tipo: ${category} com aproximadamente ${participants} participantes.

        Sugira detalhadamente:
        1. Dimensionamento de Equipe: Quantidade ideal de fisioterapeutas, estagiários e pessoal de apoio.
        2. Materiais Críticos: Lista de insumos (fitas, gel, agulhas, etc) e equipamentos (macas, aparelhos).
        3. Dica de Ouro: Uma sugestão estratégica para garantir o sucesso deste tipo específico de evento.
        4. Biossegurança: Cuidados essenciais para este volume de pessoas.

        Retorne em Markdown elegante, usando tabelas se necessário. Responda em Português Brasileiro.
      `;

      const systemInstruction =
        "Você é um consultor sênior em logística de saúde e eventos esportivos.";

      const result = await smartChat(c.env, {
        task: "event-planning",
        prompt,
        thinkingLevel: "MEDIUM",
        systemInstruction,
        temperature: 0.6,
      });

      return c.json({ data: { response: result.text, thoughts: result.thoughts } });
    }
    // ... other cases can be migrated similarly
    default:
      return c.json({ error: "Ação de IA não suportada" }, 400);
  }
});

app.post("/chat", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as any;
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (messages.length === 0) {
    return c.json({ error: "Mensagens são obrigatórias" }, 400);
  }

  if (!c.env.GOOGLE_AI_API_KEY) {
    console.error("GOOGLE_AI_API_KEY is missing");
    return c.json({ error: "Configuração de IA ausente" }, 500);
  }

  console.log(`Starting chat stream with ${messages.length} messages`);

  const stream = await streamGeminiChat(
    c.env.GOOGLE_AI_API_KEY,
    messages,
    "gemini-1.5-flash-latest",
    c.env.FISIOFLOW_AI_GATEWAY_URL,
    c.env.FISIOFLOW_AI_GATEWAY_TOKEN,
  ).catch((e) => {
    console.error("streamGeminiChat error:", e);
    return null;
  });

  if (!stream) {
    return c.json({ error: "Falha ao iniciar stream de IA" }, 500);
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Processar o stream de forma assíncrona
  (async () => {
    try {
      const reader = stream.getReader();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const jsonString = trimmed.slice(6).trim();
              if (jsonString === "[DONE]") break;

              const json = JSON.parse(jsonString);
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                const payload = JSON.stringify({
                  choices: [{ delta: { content: text } }],
                });
                await writer.write(encoder.encode(`data: ${payload}\n\n`));
              }
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (e) {
      console.error("Stream transformation error:", e);
    } finally {
      try {
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch {}
      await writer.close();
    }
  })();

  return c.body(readable, 200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
});

app.post("/fast-processing", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = safeText(body.text);
  const mode = safeText(body.mode) || "fix_grammar";

  const prompt =
    mode === "fix_grammar"
      ? `Corrija a gramática e melhore a clareza técnica deste registro de fisioterapia, mantendo o tom profissional: "${text}".`
      : `Resuma este registro clínico de forma concisa: "${text}".`;

  const systemInstruction = "Você é um assistente de redação clínica de alta precisão.";

  try {
    const parsed = await unifiedStructured(c.env, {
      schema: FastProcessingSchema,
      prompt,
      model: "gemini-3-flash-preview",
      systemInstruction,
      temperature: 0.2,
    });
    return c.json({ data: { result: parsed.result } });
  } catch (_error) {
    // Basic fallback
    const result = await callGemini(
      c.env.GOOGLE_AI_API_KEY,
      `${prompt} Retorne apenas o texto final.`,
      "gemini-1.5-flash-latest",
      c.env.FISIOFLOW_AI_GATEWAY_URL,
    );
    return c.json({ data: { result } });
  }
});

app.post("/treatment-assistant", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = safeText(body.action);
  const context = safeText(body.context);
  const patientId = safeText(body.patientId);

  if (action !== "predict_adherence") {
    const fallbackRisk = inferRiskLevel(`${patientId} ${context}`);
    const suggestion =
      action === "generate_report"
        ? "Relatório automático: evolução clínica monitorada, manter acompanhamento e registrar resposta funcional nas próximas sessões."
        : `Conduta sugerida (risco ${fallbackRisk}): revisar metas, ajustar progressão terapêutica e reforçar educação do paciente.`;
    return c.json({ data: { suggestion } });
  }

  const prompt = `Paciente ID: ${patientId || "N/A"}
Contexto clínico/histórico:
${context || "Sem contexto adicional fornecido."}

Analise o risco de não-aderência ao tratamento fisioterapêutico, identifique os fatores principais e recomende ações concretas.`;

  const systemInstruction =
    "Você é um fisioterapeuta experiente em gestão de aderência terapêutica. Baseie seu raciocínio em evidências clínicas e comportamentais.";

  const start = performance.now();
  try {
    const adherence = await unifiedStructured(c.env, {
      schema: TreatmentAdherenceSchema,
      prompt,
      model: "gemini-3.1-pro-preview",
      thinkingLevel: "HIGH",
      systemInstruction,
      temperature: 0.3,
      maxOutputTokens: 2048,
    });
    const duration = performance.now() - start;

    c.executionCtx.waitUntil(
      logToAxiom(c.env, c.executionCtx, {
        level: "info",
        type: "ai_inference_latency",
        message: "Treatment adherence prediction completed",
        metadata: {
          action: "predict_adherence",
          durationMs: duration,
          model: "gemini-3.1-pro-preview",
          riskLevel: adherence.riskLevel,
        },
      }),
    );

    return c.json({
      data: {
        suggestion: adherence.suggestion,
        riskLevel: adherence.riskLevel,
        confidenceScore: adherence.confidenceScore,
        primaryFactors: adherence.primaryFactors,
        nextActions: adherence.nextActions,
      },
    });
  } catch (error) {
    c.executionCtx.waitUntil(
      logToAxiom(c.env, c.executionCtx, {
        level: "error",
        type: "ai_inference_error",
        message: "Treatment adherence prediction failed, using heuristic",
        metadata: {
          action: "predict_adherence",
          error: error instanceof Error ? error.message : String(error),
        },
      }),
    );
    const fallbackRisk = inferRiskLevel(`${patientId} ${context}`);
    return c.json({
      data: {
        suggestion: `Risco de aderência: ${fallbackRisk}. Fatores principais: frequência irregular, dor percebida e necessidade de reforço do plano domiciliar.`,
        riskLevel:
          fallbackRisk === "negative" ? "high" : fallbackRisk === "positive" ? "low" : "medium",
      },
    });
  }
});

app.post("/analysis", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const metrics = (body.metrics as Record<string, unknown>) ?? {};
  const history = (body.history as Record<string, unknown>) ?? undefined;

  const prompt = `Métricas clínicas do paciente:
${JSON.stringify(metrics, null, 2)}
${history ? `\nHistórico anterior:\n${JSON.stringify(history, null, 2)}` : ""}

Gere uma análise clínica estruturada em português brasileiro com resumo executivo, tendência evolutiva, achados-chave, raciocínio clínico, fatores de risco e recomendações objetivas.`;

  const systemInstruction =
    "Você é um fisioterapeuta sênior elaborando análise clínica para um prontuário. Seja objetivo, embasado em evidências e evite frases genéricas.";

  const start = performance.now();
  try {
    const report = await unifiedStructured(c.env, {
      schema: ClinicalReportSchema,
      prompt,
      model: "gemini-3.1-pro-preview",
      thinkingLevel: "HIGH",
      systemInstruction,
      temperature: 0.3,
      maxOutputTokens: 3072,
    });
    const duration = performance.now() - start;

    c.executionCtx.waitUntil(
      logToAxiom(c.env, c.executionCtx, {
        level: "info",
        type: "ai_inference_latency",
        message: "Clinical analysis completed",
        metadata: {
          action: "analysis",
          durationMs: duration,
          model: "gemini-3.1-pro-preview",
          trend: report.trend,
        },
      }),
    );

    return c.json({
      data: {
        ...report,
        metrics,
        history: history ?? null,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    c.executionCtx.waitUntil(
      logToAxiom(c.env, c.executionCtx, {
        level: "error",
        type: "ai_inference_error",
        message: "Clinical analysis failed, using heuristic",
        metadata: {
          action: "analysis",
          error: error instanceof Error ? error.message : String(error),
        },
      }),
    );
    return c.json({ data: buildClinicalReport(metrics, history) });
  }
});

app.post("/form-suggestions", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const context = safeText(body.context);

  const prompt = `Com base no contexto clínico fornecido, sugira campos, testes ou escalas relevantes para complementar a avaliação do paciente.
  Contexto: ${context}`;

  const systemInstruction =
    "Você é um fisioterapeuta especialista em triagem e avaliação funcional. Retorne sugestões pertinentes ao quadro clínico apresentado.";

  try {
    const parsed = await unifiedStructured(c.env, {
      schema: FormSuggestionSchema,
      prompt,
      model: "gemini-3-flash-preview",
      thinkingLevel: "LOW",
      systemInstruction,
      temperature: 0.5,
    });
    return c.json({ data: { suggestions: parsed.suggestions } });
  } catch (_error) {
    return c.json({
      data: {
        suggestions: buildFormSuggestions(context).map((s) => ({
          label: s,
          reason: "Sugestão padrão baseada em palavras-chave.",
          category: "outro" as const,
        })),
      },
    });
  }
});

app.post("/suggest-reply", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const patientName = safeText(body.patientName) || "Paciente";
  const context = safeText(body.context) || "Acompanhamento de rotina";

  const prompt = `Você é um assistente administrativo e clínico de uma clínica de fisioterapia premium.
  Sua tarefa é redigir uma mensagem de WhatsApp para o paciente: ${patientName}.
  Contexto atual: ${context}`;

  const systemInstruction =
    "Tom profissional, acolhedor e empático. Seja conciso. Use no máximo 2 emojis. Inclua um Call to Action.";

  try {
    const result = await unifiedThinking(c.env, {
      prompt,
      model: "gemini-3-flash-preview",
      thinkingLevel: "LOW",
      systemInstruction,
      temperature: 0.7,
    });
    return c.json({ data: { suggestion: result.text, thoughts: result.thoughts } });
  } catch (error: any) {
    console.error("[AI/SuggestReply] Error:", error);
    return c.json({ error: "Erro ao gerar sugestão de IA" }, 500);
  }
});

app.post("/executive-summary", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  return c.json({ data: buildExecutiveSummary(body) });
});

/**
 * Endpoints nativos de IA (Workers AI)
 */
app.post("/native/summarize", async (c) => {
  const { text } = await c.req.json();
  if (!text) return c.json({ error: "Texto é obrigatório" }, 400);

  const summary = await summarizeClinicalNote(c.env, text);
  return c.json({ data: { summary } });
});

app.post("/native/translate", async (c) => {
  const { text, target } = await c.req.json();
  const response = await runAi(c.env, "@cf/meta/m2m100-1.2b", {
    text,
    target_lang: target || "english",
  });
  return c.json({ data: { translated: (response as any).translated_text } });
});

/**
 * Busca Vetorial (RAG) - Conhecimento Clínico
 */
app.post("/vector-search", async (c) => {
  const { query, filter } = await c.req.json();

  if (!query) return c.json({ error: "Query is required" }, 400);

  try {
    // 1. Gerar embedding da pergunta via Gateway
    const baseUrl = c.env.FISIOFLOW_AI_GATEWAY_URL
      ? `${c.env.FISIOFLOW_AI_GATEWAY_URL}/google-ai-studio`
      : "https://generativelanguage.googleapis.com";

    const embedUrl = `${baseUrl}/v1beta/models/text-embedding-004:embedContent?key=${c.env.GOOGLE_AI_API_KEY}`;

    const embedRes = await fetch(embedUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.env.FISIOFLOW_AI_GATEWAY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: { parts: [{ text: query }] } }),
    });

    const { embedding } = (await embedRes.json()) as any;

    // 2. Buscar no Vectorize (se o binding existir)
    // Nota: Como o binding é dinâmico em 2026, verificamos a existência
    if (c.env.CLINICAL_KNOWLEDGE) {
      const vectorRes = await c.env.CLINICAL_KNOWLEDGE.query(embedding.values, {
        topK: 5,
        filter: filter || {},
        returnMetadata: "all",
      });
      return c.json({ data: vectorRes.matches });
    }

    return c.json({ data: [], message: "Vector index not initialized" });
  } catch (error: any) {
    return c.json({ error: "Vector search failed", details: error.message }, 500);
  }
});

/**
 * Ingestão de Conhecimento (Wiki -> Vectorize)
 */
app.post("/ingest", async (c) => {
  const { text, metadata } = await c.req.json();

  if (!text) return c.json({ error: "Text is required" }, 400);

  try {
    // 1. Gerar embedding do conteúdo via Gateway
    const baseUrl = c.env.FISIOFLOW_AI_GATEWAY_URL
      ? `${c.env.FISIOFLOW_AI_GATEWAY_URL}/google-ai-studio`
      : "https://generativelanguage.googleapis.com";

    const embedUrl = `${baseUrl}/v1beta/models/text-embedding-004:embedContent?key=${c.env.GOOGLE_AI_API_KEY}`;

    const embedRes = await fetch(embedUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.env.FISIOFLOW_AI_GATEWAY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    });

    const { embedding } = (await embedRes.json()) as any;

    // 2. Salvar no Vectorize
    if (c.env.CLINICAL_KNOWLEDGE) {
      const id = `wiki_${Date.now()}`;
      await c.env.CLINICAL_KNOWLEDGE.upsert([
        {
          id,
          values: embedding.values,
          metadata: {
            ...metadata,
            text: text.substring(0, 1000), // Guardar amostra do texto para o chat
            timestamp: new Date().toISOString(),
          },
        },
      ]);
      return c.json({ success: true, id });
    }

    return c.json({ error: "Vector index not initialized" }, 500);
  } catch (error: any) {
    return c.json({ error: "Ingestion failed", details: error.message }, 500);
  }
});

export { app as aiChatRoutes };
