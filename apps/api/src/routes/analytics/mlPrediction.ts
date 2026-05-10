import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../../lib/auth";
import { createPool } from "../../lib/db";
import type { Env } from "../../types/env";
import { callAIStructured } from "../../lib/ai/callAI";
import { z } from "zod";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const RecoveryPredictionSchema = z.object({
  recovery_velocity: z.number().describe("Velocidade de recuperação de 0 a 1"),
  estimated_sessions_to_discharge: z.number().describe("Estimativa de sessões restantes"),
  risk_of_abandonment: z.number().describe("Risco de abandono do tratamento de 0 a 1"),
  key_limiting_factors: z.array(z.string()).describe("Fatores que estão limitando o progresso"),
  recommendations: z.array(z.string()).describe("Recomendações clínicas para acelerar a alta"),
  confidence_score: z.number().describe("Nível de confiança da predição de 0 a 1"),
});

app.get("/recovery-prediction/:patientId", requireAuth, async (c) => {
  const { patientId } = c.req.param();
  const user = c.get("user");
  const pool = await createPool(c.env);

  try {
    // 1. Coleta de dados multidimensionais do paciente
    const [patientRes, metricsRes, appointmentsRes, pathologiesRes, exercisesRes] = await Promise.all([
      pool.query("SELECT * FROM patients WHERE id = $1 AND organization_id = $2", [patientId, user.organizationId]),
      pool.query(
        "SELECT * FROM patient_session_metrics WHERE patient_id = $1 AND organization_id = $2 ORDER BY session_date DESC LIMIT 10",
        [patientId, user.organizationId]
      ),
      pool.query(
        "SELECT status, date FROM appointments WHERE patient_id = $1 AND organization_id = $2 ORDER BY date DESC LIMIT 20",
        [patientId, user.organizationId]
      ),
      pool.query("SELECT * FROM patient_pathologies WHERE patient_id = $1 AND organization_id = $2", [patientId, user.organizationId]),
      pool.query(
        "SELECT count(*) as total, count(*) FILTER (WHERE completed = true) as completed FROM exercise_sessions WHERE patient_id = $1 AND created_at > NOW() - INTERVAL '30 days'",
        [patientId]
      )
    ]);

    if (patientRes.rows.length === 0) {
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    const patient = patientRes.rows[0];
    const metrics = metricsRes.rows;
    const appointments = appointmentsRes.rows;
    const pathologies = pathologiesRes.rows;
    const exerciseStats = exercisesRes.rows[0];

    // 2. Preparação do contexto para a IA
    const context = {
      patient: {
        age: patient.birth_date ? new Date().getFullYear() - new Date(patient.birth_date).getFullYear() : "N/A",
        gender: patient.gender,
      },
      pathologies: pathologies.map(p => ({ name: p.name, status: p.status })),
      recent_metrics: metrics.map(m => ({
        date: m.session_date,
        pain_before: m.pain_level_before,
        pain_after: m.pain_level_after,
        functional_score: m.functional_score_after
      })),
      attendance: {
        total: appointments.length,
        completed: appointments.filter(a => a.status === 'atendido').length,
        missed: appointments.filter(a => ['faltou', 'no_show'].includes(a.status)).length,
      },
      home_exercise_compliance: exerciseStats.total > 0 ? (exerciseStats.completed / exerciseStats.total) : 0
    };

    // 3. Chamada da IA preditiva (Llama 3.1 8b para velocidade e estrutura)
    const prediction = await callAIStructured(c.env, {
      task: "analysis",
      organizationId: user.organizationId,
      schema: RecoveryPredictionSchema,
      systemInstruction: `Você é um analista de dados clínico especializado em fisioterapia.
Sua missão é analisar o histórico do paciente e prever sua velocidade de recuperação e riscos.
Baseie-se em:
- Evolução da dor (redução entre sessões).
- Ganho funcional (functional_score).
- Adesão ao tratamento (attendance rate).
- Compliance com exercícios em casa.
Seja realista e conservador em suas estimativas.`,
      prompt: `Analise os seguintes dados do paciente:\n${JSON.stringify(context, null, 2)}`,
    });

    // 4. Persistência da predição para histórico (Opcional, mas recomendado para o dashboard)
    await pool.query(
      `INSERT INTO patient_predictions (
        patient_id, organization_id, prediction_type, predicted_value, predicted_class,
        confidence_score, risk_factors, treatment_recommendations, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())`,
      [
        patientId,
        user.organizationId,
        'recovery_velocity',
        prediction.data.recovery_velocity,
        prediction.data.recovery_velocity > 0.7 ? 'fast' : (prediction.data.recovery_velocity > 0.4 ? 'moderate' : 'slow'),
        prediction.data.confidence_score,
        prediction.data.key_limiting_factors,
        prediction.data.recommendations,
      ]
    );

    return c.json({
      success: true,
      prediction: prediction.data,
      metadata: {
        model: prediction.model,
        latencyMs: prediction.latencyMs
      }
    });

  } catch (error: any) {
    console.error("[RecoveryPrediction] Error:", error);
    return c.json({ error: "Erro ao gerar predição de recuperação", details: error.message }, 500);
  }
});

// GET /api/analytics/ml/recovery-prediction/history/:patientId — Timeline of predictions
app.get("/history/:patientId", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId } = c.req.param();
  const db = await createDb(c.env);

  const history = await db
    .select()
    .from(patientPredictions)
    .where(
      and(
        eq(patientPredictions.patientId, patientId),
        eq(patientPredictions.organizationId, user.organizationId)
      )
    )
    .orderBy(desc(patientPredictions.createdAt));

  return c.json({ data: history });
});

export { app as mlPredictionRoutes };
