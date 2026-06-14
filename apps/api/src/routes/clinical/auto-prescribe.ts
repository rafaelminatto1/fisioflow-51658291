import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { runAi } from "../../lib/ai-native";
import { requireAuth } from "../../lib/auth";
import { evaluateClinicalTest, type ClinicalTestType } from "../../lib/clinical-rules";
import { getRawSql } from "../../lib/db";
import { WORKERS_AI_MODELS } from "../../lib/workersAi";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const AutoPrescribeSchema = z.object({
  assessmentId: z.string().uuid(),
  testType: z.enum(["TRENDELENBURG", "DYNAMIC_VALGUS", "HOP_TEST", "GENERIC"]).default("GENERIC"),
});

/**
 * POST /api/clinical/prescriptions/suggest
 * Analisa o teste biomecânico e sugere condutas via Brain + RAG.
 */
app.post("/suggest", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  
  const validation = AutoPrescribeSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ error: "Dados inválidos", details: validation.error.format() }, 400);
  }

  const { assessmentId, testType } = validation.data;
  const sql = getRawSql(c.env, "read");

  try {
    // 1. Buscar dados da avaliação
    const assessmentRes = await sql`
      SELECT analysis_data, type, patient_id 
      FROM biomechanics_assessments 
      WHERE id = ${assessmentId}::uuid AND organization_id = ${user.organizationId}::uuid
    `;
    
    const assessment = assessmentRes.rows[0];
    if (!assessment) return c.json({ error: "Avaliação não encontrada" }, 404);

    // 2. Avaliar via Clinical Engine
    const analysisData = assessment.analysis_data || {};
    const metrics = analysisData.metrics || {};
    const evaluation = evaluateClinicalTest(testType as ClinicalTestType, metrics);

    // 3. Buscar Exercícios Corretivos via RAG (AI Search)
    let suggestedExercises: any[] = [];
    if (c.env.AI_SEARCH && evaluation.recommendationKeywords.length > 0) {
      try {
        const query = `Exercícios de fisioterapia para: ${evaluation.recommendationKeywords.join(", ")}`;
        const searchResult = await c.env.AI_SEARCH.search({
          messages: [{ role: "user", content: query }],
          limit: 3
        });
        suggestedExercises = searchResult.sources.map((s: any) => ({
          title: s.title || "Exercício Sugerido",
          description: s.content.slice(0, 200) + "...",
          source: "Literature"
        }));
      } catch (err) {
        console.error("[AutoPrescribe/RAG] Failed to search literature:", err);
      }
    }

    // 4. Se não encontrou no RAG, sugerir genéricos baseados em keywords via LLM
    if (suggestedExercises.length === 0) {
      const llmPrompt = `
        Como especialista em biomecânica, sugira 3 exercícios de reabilitação para um paciente com: ${evaluation.findings.join(", ")}.
        Responda apenas um array JSON: [{"title": "...", "description": "..."}]
      `;
      const aiRes = await runAi(c.env, WORKERS_AI_MODELS.llama_3_1_8b, {
        messages: [{ role: "user", content: llmPrompt }]
      }, { cache: false });
      
      try {
        const jsonMatch = aiRes.response?.match(/\[[\s\S]*\]/);
        if (jsonMatch) suggestedExercises = JSON.parse(jsonMatch[0]);
      } catch (e) {}
    }

    // 5. Armazenar no Durable Object para a próxima evolução
    const id = c.env.PATIENT_AGENT?.idFromName(assessment.patient_id);
    if (id && c.env.PATIENT_AGENT) {
      const stub = c.env.PATIENT_AGENT.get(id);
      await (stub as any).setPendingClinicalDraft({
        assessmentId,
        evaluation,
        suggestions: suggestedExercises,
        timestamp: new Date().toISOString()
      });
    }

    return c.json({
      success: true,
      evaluation,
      suggestions: suggestedExercises
    });
  } catch (error: any) {
    console.error("[AutoPrescribe] Error:", error);
    return c.json({ error: "Erro ao gerar sugestões clínicas", details: error.message }, 500);
  }
});

export { app as autoPrescribeRoutes };
