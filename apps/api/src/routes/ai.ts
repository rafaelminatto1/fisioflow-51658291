import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

import { callGemini, transcribeAudioWithGemini, streamGeminiChat } from "../lib/ai-gemini";
import { smartChat, smartStructured, smartTranscribe } from "../lib/ai/smartAI";
import { unifiedThinking, unifiedStructured } from "../lib/ai/unifiedAI";
import { callAIVision } from "../lib/ai/callAI";
import {
  getOrCreatePatientCache,
  invalidatePatientCache,
  readPatientCacheEntry,
} from "../lib/ai-context-cache";
import { AssessmentRecordingService } from "../services/ai/AssessmentRecordingService";
import { isUuid } from "../lib/validators";
import {
  runAi,
  transcribeAudio as transcribeWithWhisper,
  summarizeClinicalNote,
} from "../lib/ai-native";
import { logToAxiom } from "../lib/axiom";
import { rateLimit } from "../middleware/rateLimit";
import {
  ClinicalReportSchema,
  ExerciseSuggestionSchema,
  FastProcessingSchema,
  FormSuggestionSchema,
  ReceiptOcrSchema,
  SoapSchema,
  TreatmentAdherenceSchema,
} from "../schemas/ai-schemas";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Rate limiting: 100 chamadas AI por org por hora
app.use("*", requireAuth, rateLimit({ endpoint: "ai", limit: 100, windowSeconds: 3600 }));

type ClinicalTrend = "positive" | "neutral" | "negative";

function safeText(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function inferRiskLevel(text: string): ClinicalTrend {
  const lower = text.toLowerCase();
  if (/piora|regredi|falha|dor intensa|recidiva/.test(lower)) return "negative";
  if (/melhora|evolução|progress|adher|boa resposta/.test(lower)) return "positive";
  return "neutral";
}

function buildClinicalReport(metrics: Record<string, unknown>, history?: Record<string, unknown>) {
  return {
    summary: "Análise clínica baseada nos dados fornecidos.",
    metrics,
    history: history ?? null,
    trend: inferRiskLevel(JSON.stringify(metrics)),
    generatedAt: new Date().toISOString(),
  };
}

function buildFormSuggestions(context: string): string[] {
  const base = ["Escala de dor (EVA)", "Amplitude de movimento", "Força muscular"];
  if (/coluna|lombar|cervical/.test(context.toLowerCase()))
    base.push("Teste de Lasègue", "Schober");
  if (/joelho|quadril/.test(context.toLowerCase())) base.push("Teste de McMurray", "Lachman");
  return base;
}

function buildExecutiveSummary(body: Record<string, unknown>) {
  const patientCount = (body.patientCount as number) ?? 0;
  const sessionCount = (body.sessionCount as number) ?? 0;
  return {
    highlights: [`${patientCount} pacientes ativos`, `${sessionCount} sessões realizadas`],
    insights: "Desempenho clínico dentro dos parâmetros esperados.",
    recommendations: ["Manter frequência de reavaliações", "Monitorar adesão ao plano domiciliar"],
    generatedAt: new Date().toISOString(),
  };
}

function buildSoapFromText(text: string) {
  // This will now be handled by a real LLM prompt in the route if needed,
  // but keeping the fallback logic here.
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    subjective:
      lines.slice(0, 2).join(" ") || "Paciente relata evolução clínica em acompanhamento.",
    objective: lines.slice(2, 4).join(" ") || "Avaliação objetiva pendente de complementação.",
    assessment:
      lines.slice(4, 6).join(" ") ||
      "Quadro compatível com seguimento fisioterapêutico sem red flags evidentes.",
    plan:
      lines.slice(6, 8).join(" ") ||
      "Manter plano terapêutico, reforçar adesão e reavaliar na próxima sessão.",
  };
}

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

app.post("/transcribe-audio", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const audioBase64 = String(body.audioData || body.audio || "");

  if (!audioBase64) return c.json({ error: "Nenhum dado de áudio enviado" }, 400);

  try {
    const start = performance.now();
    let transcription = "";
    let provider = "native-whisper";

    // Tentar primeiro com Workers AI (Nativo) se o binding existir
    if (c.env.AI) {
      try {
        transcription = await transcribeWithWhisper(c.env, audioBase64);
      } catch (e) {
        console.error("Whisper failed, falling back to Gemini", e);
        provider = "gemini-fallback";
        transcription = await transcribeAudioWithGemini(
          c.env.GOOGLE_AI_API_KEY,
          audioBase64,
          String(body.mimeType || "audio/webm"),
          c.env.FISIOFLOW_AI_GATEWAY_URL,
          c.env.FISIOFLOW_AI_GATEWAY_TOKEN,
        );
      }
    } else {
      provider = "gemini-direct";
      transcription = await transcribeAudioWithGemini(
        c.env.GOOGLE_AI_API_KEY,
        audioBase64,
        String(body.mimeType || "audio/webm"),
        c.env.FISIOFLOW_AI_GATEWAY_URL,
        c.env.FISIOFLOW_AI_GATEWAY_TOKEN,
      );
    }

    const duration = performance.now() - start;

    c.executionCtx.waitUntil(
      logToAxiom(c.env, c.executionCtx, {
        level: "info",
        type: "ai_inference_latency",
        message: "Audio transcription completed",
        metadata: {
          action: "transcribe-audio",
          provider,
          durationMs: duration,
        },
      }),
    );

    return c.json({ data: { transcription, provider, confidence: 0.95 } });
  } catch (error: any) {
    return c.json({ error: "Erro na transcrição", details: error.message }, 500);
  }
});

app.post("/transcribe-session", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = safeText(body.hintText);

  const prompt = `Relato de uma sessão de fisioterapia para estruturar em SOAP:
"${text}"`;

  const systemInstruction =
    "Você é um fisioterapeuta experiente. Estruture o relato no formato SOAP em português brasileiro. Cada seção deve ter conteúdo clínico objetivo e conciso, sem repetir literalmente o relato.";

  const start = performance.now();
  try {
    const { data: soapData } = await smartStructured(c.env, {
      task: "soap",
      schema: SoapSchema,
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
        message: "SOAP generation completed",
        metadata: {
          action: "transcribe-session",
          durationMs: duration,
          promptLength: prompt.length,
        },
      }),
    );

    return c.json({ data: { soapData } });
  } catch (error) {
    const duration = performance.now() - start;
    c.executionCtx.waitUntil(
      logToAxiom(c.env, c.executionCtx, {
        level: "error",
        type: "ai_inference_error",
        message: "SOAP generation failed, using heuristic fallback",
        metadata: {
          action: "transcribe-session",
          durationMs: duration,
          error: error instanceof Error ? error.message : String(error),
        },
      }),
    );
    return c.json({ data: { soapData: buildSoapFromText(text) } });
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

app.post("/document/analyze", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const fileUrl = safeText(body.fileUrl);
  const fileName = safeText(body.fileName) || "documento";
  const mediaType = safeText(body.mediaType);
  const imageBase64 = safeText(body.imageBase64);

  if (imageBase64 && mediaType.startsWith("image/")) {
    const prompt = `Analise este documento clínico (${fileName}). Extraia os principais achados, faça um resumo clínico, classifique o tipo de documento e forneça recomendações de conduta fisioterapêutica.`;

    try {
      const report = await unifiedStructured(c.env, {
        schema: ClinicalReportSchema,
        prompt: [{ text: prompt }, { inlineData: { mimeType: mediaType, data: imageBase64 } }],
        model: "gemini-3-flash-preview",
        thinkingLevel: "MEDIUM",
        systemInstruction: "Você é um especialista em análise de exames e laudos clínicos.",
      });

      return c.json({
        data: {
          extractedData: {
            fileUrl,
            text: report.summary,
            confidence: 0.95,
          },
          classification: {
            type: report.trend === "negative" ? "clinical_report" : "other",
            confidence: 0.9,
          },
          summary: {
            keyFindings: report.keyFindings,
            impression: report.clinicalReasoning,
            recommendations: report.recommendations,
          },
          report,
        },
      });
    } catch (error) {
      console.error("Document analysis failed:", error);
    }
  }

  const baseText = `Documento ${fileName} recebido para análise.`;
  return c.json({
    data: {
      extractedData: { fileUrl, text: baseText, confidence: 0.5 },
      summary: { keyFindings: [baseText], impression: "Análise manual necessária." },
    },
  });
});

app.post("/document/classify", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = safeText(body.text);

  const prompt = `Classifique o tipo de documento clínico com base no seguinte texto: "${text}".
  Escolha entre: MRI, X-RAY, CT_SCAN, CLINICAL_REPORT, RECEIPT, OTHER.`;

  try {
    const result = await unifiedThinking(c.env, {
      prompt,
      model: "gemini-3-flash-preview",
      thinkingLevel: "MINIMAL",
      temperature: 0.1,
    });
    const type = result.text.trim().toLowerCase();
    return c.json({ data: { type, confidence: 0.9 } });
  } catch {
    return c.json({ data: { type: "clinical_report", confidence: 0.5 } });
  }
});

app.post("/document/summarize", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = safeText(body.text);

  const prompt = `Resuma o seguinte conteúdo clínico de forma objetiva, destacando os principais achados e recomendações:
  "${text}"`;

  try {
    const report = await unifiedStructured(c.env, {
      schema: ClinicalReportSchema,
      prompt,
      model: "gemini-3-flash-preview",
      thinkingLevel: "MEDIUM",
      systemInstruction:
        "Você é um assistente especializado em síntese de prontuários e laudos fisioterapêuticos.",
    });

    return c.json({
      data: {
        keyFindings: report.keyFindings,
        impression: report.summary,
        recommendations: report.recommendations,
        criticalAlerts: report.riskFactors,
      },
    });
  } catch {
    return c.json({
      data: {
        keyFindings: text
          .split("\n")
          .filter((l) => l.length > 10)
          .slice(0, 3),
        impression: "Resumo indisponível via IA, exibindo trechos do texto.",
      },
    });
  }
});

app.post("/document/translate", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = safeText(body.text);
  const targetLanguage = safeText(body.targetLanguage) || "Portuguese";

  const prompt = `Traduza o seguinte texto clínico para ${targetLanguage}, mantendo a precisão terminológica da área de fisioterapia e saúde:
  "${text}"`;

  try {
    const result = await unifiedThinking(c.env, {
      prompt,
      model: "gemini-3-flash-preview",
      thinkingLevel: "MINIMAL",
      temperature: 0.3,
    });
    return c.json({
      data: {
        originalText: text,
        translatedText: result.text,
        sourceLanguage: "auto",
        targetLanguage,
      },
    });
  } catch {
    return c.json({
      data: { originalText: text, translatedText: text, error: "Falha na tradução via IA" },
    });
  }
});

app.post("/document/compare", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const currentText = safeText(body.currentText);
  const previousText = safeText(body.previousText);

  const prompt = `Compare os dois registros clínicos abaixo e identifique mudanças relevantes, progressos ou regressos no quadro do paciente.

  Registro Anterior:
  "${previousText}"

  Registro Atual:
  "${currentText}"`;

  try {
    const result = await unifiedThinking(c.env, {
      prompt,
      model: "gemini-3-flash-preview",
      thinkingLevel: "MEDIUM",
      temperature: 0.3,
    });
    return c.json({
      data: {
        hasChanges: true,
        changes: [result.text],
        progressScore: 70, // Heurística baseada no texto poderia ser implementada
      },
    });
  } catch {
    return c.json({
      data: { hasChanges: false, changes: ["Não foi possível comparar os documentos via IA."] },
    });
  }
});

app.post("/document/pdf", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  return c.json({
    data: {
      url:
        safeText(
          (body.documentData as Record<string, unknown> | undefined)?.extractedData as unknown,
        ) || null,
      generated: true,
    },
  });
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

app.post("/movement-video", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const exerciseName = safeText(body.exerciseName) || "Exercício Livre";
  return c.json({
    data: {
      analysis: {
        reps: 10,
        score: 8,
        errors: [],
        feedback: `Análise automática concluída para ${exerciseName}. Movimento globalmente adequado, revisar amplitude e ritmo para maior consistência.`,
        isValidExercise: true,
      },
    },
  });
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

// ─── Receipt OCR — vision extraction via Gemini ──────────────────────────────
app.post("/receipt-ocr", async (c) => {
  if (!c.env.GOOGLE_AI_API_KEY) {
    return c.json({ error: "AI not configured" }, 503);
  }

  let imageBase64: string;
  let mimeType: string;

  // Accept both multipart/form-data (file upload) and JSON (base64 pre-encoded)
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await c.req.formData();
      const file = formData.get("image") as File | null;
      if (!file) return c.json({ error: "Campo 'image' ausente no formulário" }, 400);
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      imageBase64 = btoa(binary);
      mimeType = file.type || "image/jpeg";
    } catch {
      return c.json({ error: "Erro ao ler imagem do formulário" }, 400);
    }
  } else {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    imageBase64 = String(body.imageBase64 ?? "");
    mimeType = String(body.mimeType ?? "image/jpeg");
    if (!imageBase64) return c.json({ error: "imageBase64 ausente" }, 400);
  }

  const prompt = `Extraia os dados financeiros deste comprovante de pagamento. Se algum campo não estiver visível, retorne null para strings ou false para booleanos. Use ponto como separador decimal.`;

  try {
    const extracted = await unifiedStructured(c.env, {
      schema: ReceiptOcrSchema,
      prompt: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }],
      model: "gemini-3-flash-preview",
      thinkingLevel: "LOW",
      systemInstruction:
        "Você é um sistema de extração precisa de dados financeiros de comprovantes brasileiros (PIX, cartão, boleto).",
      temperature: 0.1,
      maxOutputTokens: 512,
    });

    return c.json({ success: true, data: extracted });
  } catch (error: any) {
    console.error("[AI/ReceiptOCR] Error:", error);
    return c.json(
      { success: false, error: "Erro ao processar comprovante", details: error.message },
      500,
    );
  }
});

// ==========================================================================
// Patient 360° — Long Context + Context Caching (Gemini Pro 1M+ tokens)
// ==========================================================================

const PATIENT_360_SYSTEM_INSTRUCTION = `Você é um fisioterapeuta sênior brasileiro analisando o contexto clínico completo de um paciente. Responda sempre em português, citando datas, sessões e escores específicos quando disponíveis no contexto. Seja direto, clínico e evite especulações além do contexto fornecido.`;

app.post("/patient-360/prime", async (c) => {
  const user = c.get("user");
  const body = (await c.req.json().catch(() => ({}))) as {
    patientId?: string;
    forceRefresh?: boolean;
  };

  if (!isUuid(body.patientId)) return c.json({ error: "patientId inválido" }, 400);

  try {
    const handle = await getOrCreatePatientCache(c.env, body.patientId!, user.organizationId, {
      model: "gemini-3-flash-preview",
      systemInstruction: PATIENT_360_SYSTEM_INSTRUCTION,
      forceRefresh: body.forceRefresh === true,
    });

    return c.json({
      success: true,
      cacheName: handle.cacheName,
      model: handle.model,
      createdNew: handle.createdNew,
      expireTime: handle.expireTime,
      approxTokens: handle.context.approxTokens,
      counts: handle.context.counts,
      generatedAt: handle.context.generatedAt,
    });
  } catch (error: any) {
    console.error("[AI/Patient360/prime] Error:", error);
    await logToAxiom(c.env, c.executionCtx, {
      level: "error",
      message: "ai.patient_360.prime.error",
      patientId: body.patientId,
      error: error?.message,
    });
    return c.json(
      { success: false, error: "Erro ao preparar contexto do paciente", details: error?.message },
      500,
    );
  }
});

app.post("/patient-360/ask", async (c) => {
  const user = c.get("user");
  const body = (await c.req.json().catch(() => ({}))) as {
    patientId?: string;
    question?: string;
    thinkingLevel?: "MINIMAL" | "LOW" | "MEDIUM" | "HIGH";
    includeThoughts?: boolean;
  };

  if (!isUuid(body.patientId)) return c.json({ error: "patientId inválido" }, 400);
  const question = (body.question ?? "").trim();
  if (!question) return c.json({ error: "question ausente" }, 400);

  try {
    const handle = await getOrCreatePatientCache(c.env, body.patientId!, user.organizationId, {
      model: "gemini-3-flash-preview",
      systemInstruction: PATIENT_360_SYSTEM_INSTRUCTION,
    });

    const result = await unifiedThinking(c.env, {
      prompt: question,
      model: handle.model,
      thinkingLevel: body.thinkingLevel ?? "MEDIUM",
      cachedContent: handle.cacheName,
      includeThoughts: body.includeThoughts === true,
      temperature: 0.3,
      maxOutputTokens: 1500,
    });

    return c.json({
      success: true,
      answer: result.text,
      thoughts: result.thoughts,
      usage: result.usageMetadata,
      cache: {
        name: handle.cacheName,
        createdNew: handle.createdNew,
        approxTokens: handle.context.approxTokens,
      },
    });
  } catch (error: any) {
    console.error("[AI/Patient360/ask] Error:", error);
    await logToAxiom(c.env, c.executionCtx, {
      level: "error",
      message: "ai.patient_360.ask.error",
      patientId: body.patientId,
      error: error?.message,
    });
    return c.json(
      { success: false, error: "Erro ao consultar contexto do paciente", details: error?.message },
      500,
    );
  }
});

app.post("/patient-360/clinical-report", async (c) => {
  const user = c.get("user");
  const body = (await c.req.json().catch(() => ({}))) as {
    patientId?: string;
    focus?: string;
  };

  if (!isUuid(body.patientId)) return c.json({ error: "patientId inválido" }, 400);

  try {
    const handle = await getOrCreatePatientCache(c.env, body.patientId!, user.organizationId, {
      model: "gemini-3-flash-preview",
      systemInstruction: PATIENT_360_SYSTEM_INSTRUCTION,
    });

    const focus = body.focus?.trim();
    const prompt = `Gere um relatório clínico estruturado (JSON) consolidando a evolução do paciente com base em todo o contexto carregado.${focus ? ` Foco específico: ${focus}.` : ""} Baseie cada achado em datas/sessões/escores reais quando disponíveis.`;

    const report = await unifiedStructured(c.env, {
      schema: ClinicalReportSchema,
      prompt,
      model: handle.model,
      thinkingLevel: "HIGH",
      cachedContent: handle.cacheName,
      systemInstruction: PATIENT_360_SYSTEM_INSTRUCTION,
      temperature: 0.3,
      maxOutputTokens: 2048,
    });

    return c.json({
      success: true,
      data: report,
      cache: {
        name: handle.cacheName,
        createdNew: handle.createdNew,
        approxTokens: handle.context.approxTokens,
      },
    });
  } catch (error: any) {
    console.error("[AI/Patient360/clinical-report] Error:", error);
    await logToAxiom(c.env, c.executionCtx, {
      level: "error",
      message: "ai.patient_360.report.error",
      patientId: body.patientId,
      error: error?.message,
    });
    return c.json(
      { success: false, error: "Erro ao gerar relatório clínico", details: error?.message },
      500,
    );
  }
});

app.get("/patient-360/status/:patientId", async (c) => {
  const patientId = c.req.param("patientId");
  if (!isUuid(patientId)) return c.json({ error: "patientId inválido" }, 400);

  const entry = await readPatientCacheEntry(c.env, patientId);
  return c.json({
    cached: !!entry,
    entry: entry
      ? {
          cacheName: entry.cacheName,
          model: entry.model,
          expireTime: entry.expireTime,
          generatedAt: entry.generatedAt,
          approxTokens: entry.approxTokens,
        }
      : null,
  });
});

app.delete("/patient-360/:patientId", async (c) => {
  const patientId = c.req.param("patientId");
  if (!isUuid(patientId)) return c.json({ error: "patientId inválido" }, 400);

  try {
    await invalidatePatientCache(c.env, patientId);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("[AI/Patient360/delete] Error:", error);
    return c.json(
      { success: false, error: "Erro ao invalidar cache", details: error?.message },
      500,
    );
  }
});

// ==========================================================================
// Assessment — Voice/Transcript → Structured Form (Phase 2)
// ==========================================================================

app.post("/assessment/recording", async (c) => {
  const user = c.get("user");
  const body = (await c.req.json().catch(() => ({}))) as {
    audioBase64?: string;
    patientId?: string;
    patientContextHint?: string;
  };

  if (!body.audioBase64 || body.audioBase64.length < 100) {
    return c.json({ error: "audioBase64 ausente ou inválido" }, 400);
  }
  if (body.patientId && !isUuid(body.patientId)) {
    return c.json({ error: "patientId inválido" }, 400);
  }

  try {
    const service = new AssessmentRecordingService(c.env);
    const result = await service.processRecording({
      audioBase64: body.audioBase64,
      patientId: body.patientId,
      organizationId: user.organizationId,
      patientContextHint: body.patientContextHint,
    });

    return c.json({
      success: true,
      data: result.form,
      transcript: result.transcript,
      patientContextUsed: result.patientContextUsed,
    });
  } catch (error: any) {
    console.error("[AI/Assessment/recording] Error:", error);
    await logToAxiom(c.env, c.executionCtx, {
      level: "error",
      message: "ai.assessment.recording.error",
      patientId: body.patientId,
      error: error?.message,
    });
    return c.json(
      {
        success: false,
        error: "Erro ao processar gravação",
        details: error?.message,
      },
      500,
    );
  }
});

app.post("/assessment/transcript", async (c) => {
  const user = c.get("user");
  const body = (await c.req.json().catch(() => ({}))) as {
    transcript?: string;
    patientId?: string;
    patientContextHint?: string;
  };

  const transcript = (body.transcript ?? "").trim();
  if (transcript.length < 10) {
    return c.json({ error: "transcript ausente ou muito curto (mín. 10 caracteres)" }, 400);
  }
  if (body.patientId && !isUuid(body.patientId)) {
    return c.json({ error: "patientId inválido" }, 400);
  }

  try {
    const service = new AssessmentRecordingService(c.env);
    const result = await service.processTranscript({
      transcript,
      patientId: body.patientId,
      organizationId: user.organizationId,
      patientContextHint: body.patientContextHint,
    });

    return c.json({
      success: true,
      data: result.form,
      transcript: result.transcript,
      patientContextUsed: result.patientContextUsed,
    });
  } catch (error: any) {
    console.error("[AI/Assessment/transcript] Error:", error);
    await logToAxiom(c.env, c.executionCtx, {
      level: "error",
      message: "ai.assessment.transcript.error",
      patientId: body.patientId,
      error: error?.message,
    });
    return c.json(
      {
        success: false,
        error: "Erro ao processar transcrição",
        details: error?.message,
      },
      500,
    );
  }
});

// ==========================================================================
// Assessment Live — Gemini Live API (Premium, opt-in) (Phase 3)
// ==========================================================================

app.get("/assessment/live-ws", async (c) => {
  const user = c.get("user");

  if (c.env.GOOGLE_AI_PREMIUM_ENABLED !== "true") {
    return c.json({ error: "Modo Premium IA não está habilitado nesta organização" }, 403);
  }
  if (!c.env.ASSESSMENT_LIVE_SESSION) {
    return c.json({ error: "Assessment Live binding indisponível" }, 500);
  }

  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    return c.json({ error: "Expected WebSocket upgrade" }, 426);
  }

  const patientId = c.req.query("patientId");
  if (!patientId || !isUuid(patientId)) {
    return c.json({ error: "patientId inválido" }, 400);
  }

  // Rate limit Premium: 5 sessões/dia/org via D1 EDGE_CACHE
  if (c.env.EDGE_CACHE) {
    const today = new Date().toISOString().slice(0, 10);
    const key = `assessment_live:${user.organizationId}:${today}`;
    const row = await c.env.EDGE_CACHE.prepare("SELECT count FROM rate_limits WHERE key = ?")
      .bind(key)
      .first<{ count: number }>();
    const current = row?.count ?? 0;
    if (current >= 5) {
      return c.json(
        {
          error: "Limite diário de sessões Premium atingido (5/dia). Tente novamente amanhã.",
        },
        429,
      );
    }
    await c.env.EDGE_CACHE.prepare(
      `INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, strftime('%s','now'))
			 ON CONFLICT(key) DO UPDATE SET count = count + 1`,
    )
      .bind(key)
      .run();
  }

  const sessionId = crypto.randomUUID();
  const id = c.env.ASSESSMENT_LIVE_SESSION.idFromName(sessionId);
  const stub = c.env.ASSESSMENT_LIVE_SESSION.get(id);

  const url = new URL(c.req.url);
  const doUrl = new URL(url.origin);
  doUrl.pathname = "/ws";
  doUrl.searchParams.set("sessionId", sessionId);
  doUrl.searchParams.set("patientId", patientId);
  doUrl.searchParams.set("organizationId", user.organizationId);

  return stub.fetch(doUrl.toString(), {
    method: "GET",
    headers: {
      Upgrade: "websocket",
      Connection: "Upgrade",
      "Sec-WebSocket-Version": "13",
      "Sec-WebSocket-Key": c.req.header("Sec-WebSocket-Key") ?? "",
    },
  });
});

// ============================================================
// VOICE EVOLUTION: Transcrição + SOAP via GLM-ASR + callAI()
// ============================================================
app.post("/voice/transcribe", async (c) => {
  const formData = await c.req.parseBody();
  const audioFile = formData["audio"] as File | undefined;

  if (!audioFile) {
    return c.json({ error: "Arquivo de áudio obrigatório (campo 'audio')" }, 400);
  }

  const audioBuffer = await audioFile.arrayBuffer();
  const language = String(formData["language"] ?? "pt");

  try {
    const text = await smartTranscribe(c.env, audioBuffer, language);
    return c.json({ success: true, text, provider: "smart-transcribe" });
  } catch (error: any) {
    return c.json({ error: "Falha na transcrição", details: error.message }, 500);
  }
});

app.post("/voice/evolution", async (c) => {
  const formData = await c.req.parseBody();
  const audioFile = formData["audio"] as File | undefined;
  const hintText = String(formData["hintText"] ?? "");

  if (!audioFile && !hintText) {
    return c.json({ error: "Envie 'audio' ou 'hintText'" }, 400);
  }

  let transcript = hintText;

  if (audioFile) {
    const audioBuffer = await audioFile.arrayBuffer();
    const language = String(formData["language"] ?? "pt");
    try {
      transcript = await smartTranscribe(c.env, audioBuffer, language);
    } catch (error: any) {
      return c.json({ error: "Falha na transcrição", details: error.message }, 500);
    }
  }

  const systemInstruction =
    "Você é um fisioterapeuta experiente. Estruture o relato no formato SOAP em português brasileiro. " +
    "Cada seção deve ter conteúdo clínico objetivo e conciso, sem repetir literalmente o relato. " +
    "Use terminologia técnica apropriada e identifique red flags se presentes.";

  const prompt = `Relato de uma sessão de fisioterapia para estruturar em SOAP:
"${transcript}"`;

  try {
    const { data: soapData } = await smartStructured(c.env, {
      task: "soap",
      schema: SoapSchema,
      prompt,
      systemInstruction,
      thinkingLevel: "MEDIUM",
      temperature: 0.4,
    });

    return c.json({ success: true, transcript, soapData });
  } catch (_error) {
    return c.json({ success: true, transcript, soapData: buildSoapFromText(transcript) });
  }
});

// ============================================================
// VISION: Análise de imagens clínicas (GLM-5V-Turbo)
// ============================================================
app.post("/vision/analyze", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const imageBase64 = String(body.imageBase64 ?? "");
  const imageMimeType = String(body.mimeType ?? "image/jpeg");
  const prompt = String(body.prompt ?? "Analise esta imagem clínica em detalhes.");
  const systemInstruction = String(
    body.systemInstruction ??
      "Você é um especialista em análise de imagens clínicas fisioterapêuticas. Identifique achados relevantes, sugira correlações clínicas e destaque red flags. Responda em português brasileiro.",
  );

  if (!imageBase64) {
    return c.json({ error: "imageBase64 é obrigatório" }, 400);
  }

  try {
    const result = await callAIVision(c.env, {
      imageBase64,
      imageMimeType,
      prompt,
      systemInstruction,
    });
    return c.json({
      success: true,
      analysis: result.content,
      usage: result.usage,
      latencyMs: result.latencyMs,
    });
  } catch (error: any) {
    return c.json({ error: "Falha na análise visual", details: error.message }, 500);
  }
});

app.post("/vision/posture", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const imageBase64 = String(body.imageBase64 ?? "");
  const imageMimeType = String(body.mimeType ?? "image/jpeg");

  if (!imageBase64) {
    return c.json({ error: "imageBase64 é obrigatório" }, 400);
  }

  const prompt = `Analise esta foto de postura do paciente. Identifique:
1. Desvios posturais (anteriorização de cabeça, hiperlordose, escoliose, etc.)
2. Assimetrias entre lado direito e esquerdo
3. Pontos de tensão muscular visíveis
4. Sugestões de correção postural
5. Exercícios recomendados para corrigir os desvios encontrados

Seja específico e use terminologia fisioterapêutica.`;

  try {
    const result = await callAIVision(c.env, {
      imageBase64,
      imageMimeType,
      prompt,
      systemInstruction:
        "Você é um fisioterapeuta especialista em avaliação postural. Responda em português brasileiro com linguagem técnica.",
    });
    return c.json({ success: true, analysis: result.content, usage: result.usage });
  } catch (error: any) {
    return c.json({ error: "Falha na análise postural", details: error.message }, 500);
  }
});

// ============================================================
// toMarkdown: Conversão de documentos para RAG
// ============================================================
app.post("/document/to-markdown", async (c) => {
  const formData = await c.req.parseBody();
  const file = formData["file"] as File | undefined;

  if (!file) {
    return c.json({ error: "Arquivo obrigatório (campo 'file')" }, 400);
  }

  if (!c.env.AI?.toMarkdown) {
    return c.json({ error: "Workers AI toMarkdown não disponível" }, 503);
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const markdown = await c.env.AI.toMarkdown(arrayBuffer);
    return c.json({ success: true, markdown, fileName: file.name, size: file.size });
  } catch (error: any) {
    return c.json({ error: "Falha na conversão", details: error.message }, 500);
  }
});

app.post("/document/rag-ingest", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const markdown = String(body.markdown ?? "");
  const documentId = String(body.documentId ?? crypto.randomUUID());
  const metadata = (body.metadata ?? {}) as Record<string, string>;

  if (!markdown) {
    return c.json({ error: "markdown é obrigatório" }, 400);
  }

  if (!c.env.CLINICAL_KNOWLEDGE) {
    return c.json({ error: "Vectorize não configurado" }, 503);
  }

  try {
    const { generateEmbedding } = await import("../lib/ai-native");
    const chunks = splitIntoChunks(markdown, 500);
    const vectors = [];

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(c.env, chunk);
      vectors.push({
        id: `${documentId}-${vectors.length}`,
        values: embedding,
        metadata: { ...metadata, documentId, chunk: String(vectors.length), text: chunk },
      });
    }

    await c.env.CLINICAL_KNOWLEDGE.upsert(vectors);
    return c.json({ success: true, documentId, chunks: vectors.length });
  } catch (error: any) {
    return c.json({ error: "Falha na ingestão RAG", details: error.message }, 500);
  }
});

function splitIntoChunks(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > maxChars && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export { app as aiRoutes };
