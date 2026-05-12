import { Hono } from "hono";
import type { AuthVariables } from "../../lib/auth";
import type { Env } from "../../types/env";

import { transcribeAudioWithGemini } from "../../lib/ai-gemini";
import { smartStructured, smartTranscribe } from "../../lib/ai/smartAI";
import { logToAxiom } from "../../lib/axiom";
import { transcribeAudio as transcribeWithWhisper } from "../../lib/ai-native";
import { SoapSchema } from "../../schemas/ai-schemas";
import { safeText, buildSoapFromText } from "./ai-helpers";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

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
  } catch {
    return c.json({ success: true, transcript, soapData: buildSoapFromText(transcript) });
  }
});

app.post("/voice/task", async (c) => {
  const user = c.get("user");
  const formData = await c.req.parseBody();
  const audioFile = formData["audio"] as File | undefined;

  if (!audioFile) return c.json({ error: "Arquivo de áudio obrigatório" }, 400);

  try {
    const audioBuffer = await audioFile.arrayBuffer();
    const transcript = await smartTranscribe(c.env, audioBuffer, "pt");

    const { runThinkingModel } = await import("../../lib/ai-native");

    const prompt = `
      Converta esta nota de voz de um fisioterapeuta em uma tarefa estruturada para o time administrativo.
      NOTA DE VOZ: "${transcript}"

      Retorne APENAS um JSON:
      {
        "title": "Título curto e claro",
        "description": "Explicação detalhada da tarefa",
        "priority": "BAIXA | MEDIA | ALTA | URGENTE"
      }
    `.trim();

    const aiRes = await runThinkingModel(c.env, {
      prompt,
      model: "gemini-1.5-flash",
      temperature: 0.2,
      responseFormat: "json"
    });

    const jsonMatch = aiRes.content.match(/\{[\s\S]*\}/);
    const taskData = JSON.parse(jsonMatch?.[0] ?? aiRes.content);

    const { createPool } = await import("../../lib/db");
    const pool = createPool(c.env);

    const result = await pool.query(
      `INSERT INTO tarefas (organization_id, created_by, titulo, descricao, prioridade, status, tipo, order_index)
       VALUES ($1, $2, $3, $4, $5, 'A_FAZER', 'TAREFA', 0)
       RETURNING id`,
      [user.organizationId, user.uid, taskData.title, taskData.description, taskData.priority]
    );

    return c.json({ success: true, taskId: result.rows[0].id, transcript, taskData });
  } catch (error: any) {
    console.error("[Voice/Task] Error:", error);
    return c.json({ error: "Falha ao processar comando de voz" }, 500);
  }
});

export { app as aiAudioRoutes };
