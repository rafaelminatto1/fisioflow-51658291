import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { createDb } from "../lib/db";
import { requireAuth } from "../lib/auth";
import { clinicalScribeLogs } from "@fisioflow/db";
import { transcribeAudio } from "../lib/ai-native";
import { callAI } from "../lib/ai/callAI";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env }>();

/**
 * POST /api/ia-studio/scribe/process
 * Processa áudio do escriba e gera texto formatado.
 * Usa Deepgram Nova-3 → Whisper fallback via AI Gateway (runAi).
 */
app.post("/scribe/process", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const { patientId, section, audioBase64 } = body;

  if (!patientId || !section || !audioBase64) {
    return c.json({ error: "Campos obrigatórios ausentes" }, 400);
  }

  const db = await createDb(c.env);

  try {
    const patientData = await db.execute(sql`
      SELECT main_condition FROM patients
      WHERE id = ${patientId} AND organization_id = ${user.organizationId}
    `);
    const patient = patientData.rows[0] as any;
    const condition = patient?.main_condition || "não informada";

    const rawText = await transcribeAudio(c.env, audioBase64);
    if (!rawText) return c.json({ error: "Falha na transcrição" }, 422);

    const sectionName =
      (
        {
          S: "Subjetivo (Queixas e Histórico)",
          O: "Objetivo (Medições e Exames)",
          A: "Avaliação (Raciocínio Clínico)",
          P: "Plano (Condutas e Próximos Passos)",
        } as Record<string, string>
      )[section] ?? section;

    const result = await callAI(c.env, {
      task: "soap",
      systemInstruction:
        "Você é um redator de prontuários de fisioterapia experiente. Retorne APENAS o parágrafo refinado, sem introduções ou conclusões.",
      prompt: `
Contexto clínico: Condição: ${condition}
Seção SOAP alvo: ${sectionName}
Texto bruto transcrito: "${rawText}"

Diretrizes:
1. Use terminologia clínica avançada (ADM, algia, hipertonia, disfunção biomecânica).
2. Mantenha texto conciso e focado em fatos clínicos.
3. Corrija erros gramaticais típicos de transcrição.
4. Formate medições claramente (ângulos, repetições).
5. NÃO invente fatos.
      `.trim(),
      temperature: 0.15,
      maxTokens: 512,
      organizationId: user.organizationId,
    });

    const formattedText = result.content;

    await db.insert(clinicalScribeLogs).values({
      organizationId: user.organizationId,
      patientId,
      therapistId: user.uid,
      section,
      rawText,
      formattedText,
      tokensUsed: result.usage.inputTokens + result.usage.outputTokens,
    });

    return c.json({ success: true, rawText, formattedText });
  } catch (error: any) {
    console.error("[AI-Studio] Erro no processamento do escriba:", error);
    return c.json({ error: "Erro ao processar áudio", details: error.message }, 500);
  }
});

/**
 * GET /api/ia-studio/retention/at-risk
 */
app.get("/retention/at-risk", requireAuth, async (c) => {
  const user = c.get("user");
  const db = await createDb(c.env);

  try {
    const result = await db.execute(sql`
      SELECT p.id, p.full_name as "fullName", p.phone, p.status,
             MAX(a.date) as "lastSession"
      FROM patients p
      LEFT JOIN appointments a ON a.patient_id = p.id
      WHERE p.organization_id = ${user.organizationId}
        AND p.is_active = true
        AND p.id NOT IN (
          SELECT patient_id FROM appointments
          WHERE date >= CURRENT_DATE
            AND status::text IN ('agendado', 'presenca_confirmada', 'avaliacao')
        )
      GROUP BY p.id
      HAVING MAX(a.date) < CURRENT_DATE - INTERVAL '10 days'
      ORDER BY MAX(a.date) DESC
      LIMIT 10
    `);

    const data = result.rows.map((row: any) => {
      const daysAbsent = Math.floor(
        (Date.now() - new Date(row.lastSession).getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        ...row,
        riskScore: Math.min(95, 40 + daysAbsent),
        reason: daysAbsent > 30 ? "Inativo há mais de 1 mês" : "Frequência interrompida",
      };
    });

    return c.json({ data });
  } catch (error: any) {
    console.error("[AI-Studio] Erro ao buscar pacientes em risco:", error);
    return c.json({ error: "Erro ao analisar retenção" }, 500);
  }
});

/**
 * GET /api/ia-studio/predict/discharge/:patientId
 */
app.get("/predict/discharge/:patientId", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId } = c.req.param();
  const db = await createDb(c.env);

  try {
    const patientData = await db.execute(sql`
      SELECT p.main_condition,
             (
               SELECT COUNT(*)
               FROM appointments
               WHERE patient_id = ${patientId}
                 AND status::text IN ('atendido', 'avaliacao')
             ) as "sessionsCount"
      FROM patients p
      WHERE p.id = ${patientId} AND p.organization_id = ${user.organizationId}
    `);

    if (!patientData.rows.length) return c.json({ error: "Paciente não encontrado" }, 404);

    const row = patientData.rows[0] as any;
    const condition = row.main_condition?.toLowerCase() || "geral";
    const currentSessions = Number(row.sessionsCount);

    let baseSessions = 15;
    if (condition.includes("pos-op") || condition.includes("cirurgia")) baseSessions = 30;
    if (condition.includes("coluna") || condition.includes("hernia")) baseSessions = 24;

    return c.json({
      data: {
        patientId,
        predictedTotal: baseSessions,
        currentSessions,
        remainingSessions: Math.max(1, baseSessions - currentSessions),
        progressPercentage: Math.min(98, Math.floor((currentSessions / baseSessions) * 100)),
        confidence: 0.85,
        factors: [
          "Histórico de adesão: Alto",
          `Protocolo para ${condition}: Ativo`,
          "Ganho de ADM: Constante",
        ],
      },
    });
  } catch (error: any) {
    console.error("[AI-Studio] Erro na predição de alta:", error);
    return c.json({ error: "Erro ao calcular predição" }, 500);
  }
});

/**
 * POST /api/ia-studio/reports/synthesize
 * Gera síntese clínica dual (médico/paciente) com Llama via AI Gateway.
 */
app.post("/reports/synthesize", requireAuth, async (c) => {
  const body = await c.req.json();
  const { patientId, highlights } = body;

  if (!patientId || !highlights) {
    return c.json({ error: "Paciente e destaques são obrigatórios" }, 400);
  }

  try {
    const result = await callAI(c.env, {
      task: "report",
      systemInstruction: "Você é um especialista em comunicação clínica de fisioterapia.",
      prompt: `
Gere um relatório de evolução dual baseado nos destaques clínicos: "${highlights}"

Retorne APENAS JSON puro neste formato exato:
{"medico":"<síntese técnica formal em terminologia fisioterapêutica>","paciente":"<mensagem motivadora em linguagem humanizada focada nas conquistas>"}
      `.trim(),
      responseFormat: "json",
      temperature: 0.3,
      maxTokens: 800,
    });

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch?.[0] ?? result.content);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[AI-Studio] Erro na síntese de relatório:", error);
    return c.json({ error: "Erro ao gerar síntese" }, 500);
  }
});

/**
 * POST /api/ia-studio/generate-protocol
 * Gera um protocolo de tratamento estruturado baseado na condição do paciente.
 */
app.post("/generate-protocol", requireAuth, async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as any;
  const { condition, sessionCount = 10 } = body;

  if (!condition) return c.json({ error: "Condição clínica é obrigatória" }, 400);

  try {
    const { runThinkingModel } = await import("../lib/ai-native");

    const prompt = `
      Você é um especialista em reabilitação física e fisioterapia baseada em evidências.
      Sua tarefa é gerar um protocolo de tratamento estruturado de ${sessionCount} sessões para a condição: "${condition}".

      O protocolo deve ser dividido em FASES (ex: Inflamatória, Remodelagem, Retorno ao Esporte).
      Para cada fase, sugira os objetivos e uma lista de 3 a 5 exercícios/técnicas.

      Retorne APENAS JSON puro neste formato:
      {
        "title": "Protocolo de Reabilitação para ${condition}",
        "objective": "<objetivo geral do tratamento>",
        "phases": [
          {
            "name": "<nome da fase>",
            "description": "<foco clínico da fase>",
            "sessions": "Sessões 1-4",
            "exercises": ["Exercício 1", "Exercício 2", "Exercício 3"]
          }
        ]
      }
    `.trim();

    const result = await runThinkingModel(c.env, {
      prompt,
      model: "gemini-1.5-flash",
      temperature: 0.4,
      responseFormat: "json",
    });

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch?.[0] ?? result.content);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[AI-Studio] Erro ao gerar protocolo:", error);
    return c.json({ error: "Falha ao gerar protocolo inteligente" }, 500);
  }
});

export { app as aiStudioRoutes };
