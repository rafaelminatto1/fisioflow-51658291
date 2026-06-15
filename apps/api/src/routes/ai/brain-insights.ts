import { Hono } from "hono";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { runAi } from "../../lib/ai-native";
import { requireAuth } from "../../lib/auth";
import { getRawSql } from "../../lib/db";
import { isUuid } from "../../lib/validators";
import { WORKERS_AI_MODELS } from "../../lib/workersAi";
import { searchAiSearch } from "../../lib/cloudflareAiSearch";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * GET /api/ai/brain/insights/:patientId
 * Gera insights proativos baseados no histórico completo do paciente.
 */
app.get("/:patientId", requireAuth, async (c) => {
  const user = c.get("user");
  const patientId = c.req.param("patientId");

  if (!isUuid(patientId)) return c.json({ error: "patientId inválido" }, 400);

  try {
    const sql = getRawSql(c.env, "read");

    // 1. Coletar Contexto do Paciente
    const [patientRes, sessionsRes, biomechanicsRes, homeExRes] = await Promise.all([
      sql`SELECT full_name, main_diagnosis FROM patients WHERE id = ${patientId}::uuid AND organization_id = ${user.organizationId}::uuid`,
      sql`SELECT session_date, subjective, objective, assessment, plan, pain_scale FROM sessions WHERE patient_id = ${patientId}::uuid ORDER BY session_date DESC LIMIT 5`,
      sql`SELECT type, analysis_data, created_at FROM biomechanics_assessments WHERE patient_id = ${patientId}::uuid ORDER BY created_at DESC LIMIT 2`,
      sql`SELECT exercise_id, metrics, created_at FROM patient_home_exercises WHERE patient_id = ${patientId}::uuid AND status = 'shared' ORDER BY created_at DESC LIMIT 10`,
    ]);

    const patient = patientRes.rows[0];
    if (!patient) return c.json({ error: "Paciente não encontrado" }, 404);

    const context = {
      patient: patient,
      recentSessions: sessionsRes.rows,
      biomechanics: biomechanicsRes.rows,
      homeExercises: homeExRes.rows,
    };

    // 2. RAG Híbrido - Buscar Literatura (Cloudflare AI Search)
    let literatureContext = "";
    if (c.env.AI_SEARCH) {
      try {
        const searchResult = await searchAiSearch(c.env, {
          messages: [
            {
              role: "user",
              content: `Protocolo de tratamento para ${patient.main_diagnosis || "fisioterapia"}. Considerar dor e amplitude de movimento.`,
            },
          ],
          maxNumResults: 3,
        });
        literatureContext = searchResult.sources.map((s) => s.content).join("\n\n");
      } catch (err) {
        console.error("[Brain/RAG] Literature search failed:", err);
      }
    }

    // 3. Gerar Insights via LLM (Llama 3.1)
    const prompt = `
      Você é o FisioFlow Brain, um assistente de raciocínio clínico especializado em fisioterapia ortopédica e esportiva.
      Analise o histórico do paciente abaixo e gere 3 insights técnicos e acionáveis para o fisioterapeuta.

      DADOS DO PACIENTE:
      - Nome: ${patient.full_name}
      - Diagnóstico Principal: ${patient.main_diagnosis || "Não informado"}
      
      CONTEXTO CLÍNICO RECENTE (Últimas Sessões/Biomecânica/Exercícios Casa):
      ${JSON.stringify(context)}

      LITERATURA CIENTÍFICA E PROTOCOLO DE REFERÊNCIA:
      ${literatureContext || "Use conhecimentos padrão de fisioterapia baseada em evidências."}

      REQUISITOS DOS INSIGHTS:
      1. INSIGHT DE EVOLUÇÃO: Analise a tendência de Dor vs. ROM. Identifique platôs ou ganhos significativos.
      2. RECOMENDAÇÃO TÉCNICA: Sugira uma progressão de carga, alteração de técnica manual ou novo exercício baseado no estágio atual.
      3. ALERTA DE COMPLIANCE: Analise a frequência e qualidade dos exercícios domiciliares e sugira uma abordagem de engajamento.

      CITE AS FONTES: Sempre que possível, refira-se a sessões específicas pela data ou à literatura fornecida.

      Responda EXCLUSIVAMENTE em JSON:
      {
        "insights": [
          { 
            "type": "plateau|progress|alert", 
            "title": "...", 
            "description": "...", 
            "severity": "low|medium|high",
            "citation": "Ex: Baseado na sessão de 10/05 ou Guia ASSET"
          }
        ],
        "summary": "Resumo clínico executivo de uma frase."
      }
    `;

    const aiResponse = await runAi(
      c.env,
      WORKERS_AI_MODELS.llama_3_1_8b,
      {
        messages: [{ role: "user", content: prompt }],
      },
      { cache: false },
    );

    // Limpeza de resposta para garantir JSON válido
    let content = aiResponse.response || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : { insights: [], summary: "Análise concluída." };

    return c.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[AI/Brain/Insights] Error:", error);
    return c.json({ error: "Erro ao processar insights do Brain", details: error.message }, 500);
  }
});

export { app as aiBrainInsightsRoutes };
