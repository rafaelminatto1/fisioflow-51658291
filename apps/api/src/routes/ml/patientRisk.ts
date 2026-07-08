import { Hono } from "hono";
import { calculatePatientRisks, explainRiskWithAI } from "../../lib/ml/patientRiskScoring";
import { AIRouter } from "../../lib/ai/aiRouter";
// import { db } from "@fisioflow/db";
// import { patientRiskScores } from "@fisioflow/db/schema";

const app = new Hono<{ Bindings: any }>();

app.get("/:patientId", async (c) => {
  const patientId = c.req.param("patientId");

  // Real life: Buscar do Neon `patientRiskScores`
  // Para fins do endpoint agora, geramos on-the-fly um mock the features
  const mockFeatures = {
    recentNoShows: 1,
    recentCancellations: 0,
    sessionsWithoutEvolution: 0,
    daysSinceLastSession: 15,
    hasFutureSession: false,
    painVariation: -2,
    totalSessions: 4
  };

  const scores = calculatePatientRisks(mockFeatures);
  
  return c.json({
    patientId,
    features: mockFeatures,
    scores,
    lastUpdate: new Date().toISOString()
  });
});

app.post("/:patientId/explain", async (c) => {
  const patientId = c.req.param("patientId");
  const organizationId = c.req.header("x-organization-id") || "";
    if (c.env.ML_RISK_SCORING_ENABLED !== "true") {
      return c.json({ error: "ML Risk Scoring está desativado no ambiente atual." }, 403);
    }
    const { userId } = await c.req.json();

  const mockFeatures = {
    recentNoShows: 1,
    recentCancellations: 0,
    sessionsWithoutEvolution: 0,
    daysSinceLastSession: 15,
    hasFutureSession: false,
    painVariation: -2,
    totalSessions: 4
  };
  const scores = calculatePatientRisks(mockFeatures);

  const router = new AIRouter({
    env: c.env,
    organizationId,
    userId: userId || "system",
    patientId,
    taskType: "no_show_risk_explanation"
  });

  const explanation = await explainRiskWithAI(router, mockFeatures, scores);

  return c.json({
    patientId,
    explanation
  });
});

export default app;
