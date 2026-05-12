import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../../lib/auth";
import type { Env } from "../../types/env";
import { runAi } from "../../lib/ai-native";
import { callAI } from "../../lib/ai/callAI";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * @api {post} /api/ai/dictate Ditado Clínico Inteligente
 * @apiDescription Transcreve áudio usando Whisper v3 e refina o texto para terminologia clínica.
 * Otimizado para o fluxo "hands-free" de evolução SOAP.
 */
app.post("/dictate", requireAuth, async (c) => {
  const formData = await c.req.parseBody();
  const audioFile = formData["audio"] as File | undefined;
  const context = String(formData["context"] || "evolução clínica de fisioterapia");
  const language = String(formData["language"] || "pt-BR");

  if (!audioFile) {
    return c.json({ error: "Arquivo de áudio obrigatório (campo 'audio')" }, 400);
  }

  const audioBuffer = await audioFile.arrayBuffer();
  const startTime = Date.now();

  try {
    // 1. Transcrição Base usando Whisper Large V3 Turbo (Direto no Workers AI para baixa latência)
    // Usamos o modelo nativo conforme solicitado na Fase 4
    const transcriptionResponse = await runAi(
      c.env,
      "@cf/openai/whisper-large-v3-turbo",
      {
        audio: [...new Uint8Array(audioBuffer)],
      },
      { cache: false }
    );

    const rawText = (transcriptionResponse as any).text || "";

    if (!rawText || rawText.trim().length === 0) {
      return c.json({ success: true, text: "", rawText: "", refined: false });
    }

    // 2. Refinamento Clínico (Puncionamento, correção de termos técnicos e formatação)
    // Usamos o modelRegistry via callAI para escolher o melhor modelo de chat (Llama 3.1 8b ou 70b)
    const refinementResult = await callAI(c.env, {
      task: "fast-processing",
      organizationId: c.get("user")?.organizationId,
      systemInstruction: `Você é um assistente de transcrição médica. 
Sua tarefa é limpar o texto de um ditado clínico de fisioterapia.
1. Corrija a pontuação e gramática.
2. Formate termos técnicos corretamente (ex: "EVA", "DM", "PSFS", "ADU", "isquiotibiais").
3. Remova vícios de linguagem ("humm", "então", "né").
4. Mantenha o tom profissional e técnico.
5. Responda APENAS com o texto refinado, sem comentários adicionais.`,
      prompt: `Contexto: ${context}\n\nTexto para refinar:\n${rawText}`,
      temperature: 0.1, // Baixa temperatura para precisão
    });

    const latencyMs = Date.now() - startTime;

    return c.json({
      success: true,
      text: refinementResult.content,
      rawText: rawText,
      refined: true,
      latencyMs,
      usage: refinementResult.usage,
    });
  } catch (error: any) {
    console.error("[ClinicalDictation] Error:", error);
    return c.json(
      {
        error: "Falha no ditado clínico",
        details: error.message,
      },
      500
    );
  }
});

export { app as aiDictationRoutes };
