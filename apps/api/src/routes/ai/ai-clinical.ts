import { Hono } from "hono";
import type { AuthVariables } from "../../lib/auth";
import type { Env } from "../../types/env";

import { unifiedThinking, unifiedStructured } from "../../lib/ai/unifiedAI";
import { callAIVision } from "../../lib/ai/callAI";
import {
  getOrCreatePatientCache,
  invalidatePatientCache,
  readPatientCacheEntry,
} from "../../lib/ai-context-cache";
import { AssessmentRecordingService } from "../../services/ai/AssessmentRecordingService";
import { isUuid } from "../../lib/validators";
import { logToAxiom } from "../../lib/axiom";
import { ClinicalReportSchema } from "../../schemas/ai-schemas";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

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

app.get("/usage/weekly", async (c) => {
  const user = c.get("user");
  const orgId = user.organizationId;
  const url = c.env.NEON_URL || c.env.HYPERDRIVE?.connectionString;
  if (!url) return c.json({ error: "DB unavailable" }, 503);

  try {
    const sql = (await import("@neondatabase/serverless").then((m) => m.neon))(url);
    const rows = await sql`
      SELECT
        COUNT(*)::int                              AS total_calls,
        COALESCE(SUM(input_tokens + output_tokens), 0)::int AS total_tokens,
        COALESCE(SUM(latency_ms), 0)::int         AS total_latency_ms,
        COUNT(*) FILTER (WHERE was_fallback)::int  AS fallback_calls
      FROM ai_usage
      WHERE created_at >= now() - INTERVAL '7 days'
        AND (org_id = ${orgId} OR org_id IS NULL)
    `;
    const row = rows[0] ?? {};
    return c.json({
      period: "7d",
      totalCalls: row.total_calls ?? 0,
      totalTokens: row.total_tokens ?? 0,
      avgLatencyMs: row.total_calls > 0 ? Math.round(row.total_latency_ms / row.total_calls) : 0,
      fallbackCalls: row.fallback_calls ?? 0,
    });
  } catch (err) {
    console.error("[ai/usage/weekly]", err);
    return c.json({ error: "query failed" }, 500);
  }
});

export { app as aiClinicalRoutes };
