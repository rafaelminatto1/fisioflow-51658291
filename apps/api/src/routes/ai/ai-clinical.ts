import { Hono } from "hono";
import { z } from "zod";
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
import { ClinicalReportSchema, SoapSummarySchema } from "../../schemas/ai-schemas";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const soapSummaryRequestSchema = z.object({
  patientId: z.string().uuid(),
  currentObservation: z.string().trim().optional(),
  limit: z.number().int().min(1).max(10).optional().default(5),
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

/**
 * POST /api/ai/summarize-patient
 * Gera resumo clínico de um paciente a partir de dados de sessões/SOAP.
 * Usado por useAiSummarizer.ts no dashboard profissional.
 */
app.post("/summarize-patient", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const { patientId, soapNotes, sessions, condition } = body as {
    patientId?: string;
    soapNotes?: string;
    sessions?: number;
    condition?: string;
  };

  let clinicalContext = soapNotes ?? "";

  if (!clinicalContext && patientId) {
    try {
      const url = c.env.NEON_URL || c.env.HYPERDRIVE?.connectionString;
      if (url) {
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(url);
        const rows = await sql`
          SELECT s.observacao, s.pain_scale, s.procedures, s.exercises, s.date AS session_date
          FROM sessions s
          JOIN appointments a ON s.appointment_id = a.id
          WHERE a.patient_id = ${patientId}
            AND a.organization_id = ${user.organizationId}
          ORDER BY s.date DESC
          LIMIT 5
        `;
        if (rows.length) {
          clinicalContext = rows
            .map((r: any) => {
              const pain = r.pain_scale != null ? ` | EVA ${r.pain_scale}/10` : "";
              const procCount = Array.isArray(r.procedures) ? r.procedures.length : 0;
              const exCount = Array.isArray(r.exercises) ? r.exercises.length : 0;
              const counts =
                procCount || exCount ? ` | ${procCount} procedimentos, ${exCount} exercícios` : "";
              return `[${r.session_date}] ${r.observacao ?? ""}${pain}${counts}`;
            })
            .join("\n");
        }
      }
    } catch {
      // proceed with empty context
    }
  }

  if (!clinicalContext) {
    return c.json({ error: "Dados clínicos insuficientes para resumo" }, 422);
  }

  try {
    const { summarizeClinicalNote } = await import("../../lib/ai-native");
    const contextHeader = [
      condition ? `Condição principal: ${condition}` : "",
      sessions != null ? `Total de sessões: ${sessions}` : "",
      "Últimas evoluções (observação clínica):",
    ]
      .filter(Boolean)
      .join("\n");

    const summary = await summarizeClinicalNote(c.env, `${contextHeader}\n\n${clinicalContext}`);
    return c.json({ success: true, data: { summary } });
  } catch (error: any) {
    console.error("[ai/summarize-patient]", error);
    return c.json({ error: "Falha ao gerar resumo", details: error.message }, 500);
  }
});

app.post("/summarize-patient-soap", async (c) => {
  const user = c.get("user");
  const parsed = soapSummaryRequestSchema.safeParse(await c.req.json().catch(() => ({})));

  if (!parsed.success) {
    return c.json(
      {
        error: "Payload inválido",
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  const { patientId, currentObservation, limit } = parsed.data;

  try {
    const url = c.env.NEON_URL || c.env.HYPERDRIVE?.connectionString;
    if (!url) return c.json({ error: "DB unavailable" }, 503);

    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);

    const patientRows = await sql`
      SELECT full_name, diagnosis, condition
      FROM patients
      WHERE id = ${patientId}
        AND organization_id = ${user.organizationId}
        AND deleted_at IS NULL
      LIMIT 1
    `;

    if (!patientRows.length) {
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    const sessionRows = await sql`
      SELECT
        date,
        observacao,
        pain_scale,
        procedures,
        exercises,
        status
      FROM sessions
      WHERE patient_id = ${patientId}
        AND organization_id = ${user.organizationId}
        AND deleted_at IS NULL
      ORDER BY date DESC, created_at DESC
      LIMIT ${limit}
    `;

    const timeline = sessionRows
      .map((row: any, index: number) => {
        const parts = [
          `[${String(row.date ?? "").slice(0, 10) || `sessão ${index + 1}`}]`,
          row.status ? `status=${row.status}` : "",
          row.pain_scale != null ? `EVA ${row.pain_scale}/10` : "",
          row.observacao ? `observação: ${String(row.observacao).trim()}` : "",
        ].filter(Boolean);
        return parts.join(" | ");
      })
      .filter(Boolean);

    if (currentObservation?.trim()) {
      timeline.unshift(`[sessão atual em edição] observação: ${currentObservation.trim()}`);
    }

    if (timeline.length === 0) {
      return c.json({ error: "Dados clínicos insuficientes para resumo SOAP" }, 422);
    }

    const patient = patientRows[0] as Record<string, unknown>;
    const patientHeader = [
      `Paciente: ${String(patient.full_name ?? "Sem nome")}`,
      patient.diagnosis ? `Diagnóstico: ${String(patient.diagnosis)}` : "",
      patient.condition ? `Condição principal: ${String(patient.condition)}` : "",
      `Total de registros analisados: ${timeline.length}`,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `
Gere um resumo SOAP clínico consolidado a partir das evoluções abaixo.

Regras:
- Responda em português brasileiro.
- Seja objetivo, técnico e fiel ao contexto fornecido.
- Não invente exames, medições ou condutas não citadas.
- Se algum bloco tiver pouco contexto, assuma essa limitação explicitamente.
- O conteúdo deve servir para rápida continuidade do atendimento na próxima sessão.

${patientHeader}

EVOLUÇÕES RECENTES:
${timeline.join("\n\n")}
    `.trim();

    const data = await unifiedStructured(c.env, {
      schema: SoapSummarySchema,
      prompt,
      model: "gemini-3-flash-preview",
      thinkingLevel: "MEDIUM",
      temperature: 0.2,
      maxOutputTokens: 1200,
      systemInstruction:
        "Você é um fisioterapeuta sênior sintetizando evolução clínica em formato SOAP com base apenas no histórico fornecido.",
    });

    return c.json({
      success: true,
      data,
      meta: {
        analyzedEntries: timeline.length,
        includesCurrentDraft: Boolean(currentObservation?.trim()),
      },
    });
  } catch (error: any) {
    console.error("[ai/summarize-patient-soap]", error);
    return c.json({ error: "Falha ao gerar resumo SOAP", details: error.message }, 500);
  }
});

/**
 * POST /api/ai/peer-review
 * Revisão peer de nota SOAP: score de qualidade + insights clínicos.
 * Usado por usePeerReview.ts no dashboard profissional.
 */
app.post("/peer-review", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const {
    observacao = "",
    subjective = "",
    objective = "",
    assessment = "",
    plan = "",
  } = body as Record<string, string>;

  // Modelo único pós-migração SOAP→observação. Aceita `observacao` direto
  // OU concatena campos legados (S/O/A/P) caso clientes ainda não migrados
  // enviem nesse formato.
  const noteText =
    observacao || [subjective, objective, assessment, plan].filter(Boolean).join("\n\n");

  if (!noteText.trim()) {
    return c.json({ error: "Nota clínica vazia" }, 422);
  }

  try {
    const { callAI } = await import("../../lib/ai/callAI");
    const result = await callAI(c.env, {
      task: "soap-review",
      organizationId: user.organizationId,
      systemInstruction:
        "Você é um fisioterapeuta sênior avaliando a qualidade de uma evolução clínica narrativa. Responda sempre em JSON válido.",
      prompt: `
Avalie a seguinte evolução clínica de fisioterapia e retorne um JSON com este formato exato:
{
  "score": <número de 0 a 100 representando qualidade geral>,
  "insights": [<lista de pontos fortes e observações em até 4 frases curtas>],
  "missingTests": [<testes ou escalas ausentes que seriam relevantes, ex: "EVA", "PSFS", "ADM de ombro">],
  "suggestedExercises": [<até 3 sugestões de exercícios ou condutas baseadas na conduta descrita>]
}

OBSERVAÇÃO CLÍNICA:
${noteText}

Retorne APENAS o JSON, sem markdown.
      `.trim(),
      responseFormat: "json",
      temperature: 0.2,
      maxTokens: 600,
    });

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch?.[0] ?? result.content);

    // Persistir revisão no banco de dados para auditoria (Background)
    const { createPool } = await import("../../lib/db");
    const pool = createPool(c.env);
    const sessionId = body.sessionId;

    c.executionCtx.waitUntil(
      pool
        .query(
          `INSERT INTO ai_peer_reviews (organization_id, session_id, therapist_id, quality_score, insights, missing_tests, suggestions)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            user.organizationId,
            sessionId ?? null,
            user.uid,
            data.score,
            JSON.stringify(data.insights),
            JSON.stringify(data.missingTests),
            JSON.stringify(data.suggestedExercises),
          ],
        )
        .catch((e) => console.error("[AI/PeerReview] Persistence failed", e)),
    );

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[ai/peer-review]", error);
    return c.json({ error: "Falha na revisão peer", details: error.message }, 500);
  }
});

/**
 * GET /api/ai/medical-report/outcome
 * Gera um relatório de desfecho clínico (resumo de ciclo) para o médico.
 */
app.get("/medical-report/outcome", async (c) => {
  const user = c.get("user");
  const patientId = c.req.query("patientId");

  if (!isUuid(patientId)) return c.json({ error: "patientId inválido" }, 400);

  try {
    const { getRawSql } = await import("../../lib/db");
    const sql = getRawSql(c.env, "read");

    // 1. Buscar histórico consolidado
    const [patientData, sessions] = await Promise.all([
      sql`SELECT full_name, diagnosis, condition FROM patients WHERE id = ${patientId}::uuid AND organization_id = ${user.organizationId}::uuid`,
      sql`SELECT date AS session_date, observacao, pain_scale, procedures, exercises FROM sessions WHERE patient_id = ${patientId}::uuid AND organization_id = ${user.organizationId}::uuid ORDER BY date ASC LIMIT 20`,
    ]);

    if (!patientData.rows.length || !sessions.rows.length) {
      return c.json({ error: "Dados insuficientes para gerar relatório" }, 422);
    }

    const { runThinkingModel } = await import("../../lib/ai-native");

    const prompt = `
      Você é um fisioterapeuta sênior redigindo um relatório de desfecho clínico para um médico ortopedista.
      PACIENTE: ${patientData.rows[0].full_name}
      DIAGNÓSTICO: ${patientData.rows[0].diagnosis}
      
      HISTÓRICO DE EVOLUÇÕES:
      ${JSON.stringify(sessions.rows)}

      Sua tarefa é sintetizar este tratamento em um relatório executivo de 1 página.
      ESTRUTURA REQUERIDA (JSON):
      {
        "executiveSummary": "Resumo profissional de 2-3 frases sobre a evolução global.",
        "functionalGains": ["Ganho 1", "Ganho 2"],
        "painEvolution": "Descrição da evolução do quadro álgico.",
        "finalRecommendation": "Sugestão para o médico (ex: manter atividades, alta, ou retorno para reavaliação)."
      }
      Mantenha um tom técnico, respeitoso e baseado em evidências.
    `.trim();

    const aiReport = await runThinkingModel(c.env, {
      prompt,
      model: "gemini-1.5-flash",
      temperature: 0.2,
      responseFormat: "json",
    });

    const jsonMatch = aiReport.content.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch?.[0] ?? aiReport.content);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[ai/medical-report]", error);
    return c.json({ error: "Falha ao gerar relatório médico", details: error.message }, 500);
  }
});

export { app as aiClinicalRoutes };
