import { Hono } from "hono";
import { createDb } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";
import { businessMetrics, patientAdherencePredictions, patients } from "@fisioflow/db";
import { eq, desc, and } from "drizzle-orm";
import { withTenant } from "../lib/db-utils";
import { AdherencePredictor } from "../lib/ai/adherencePredictor";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("*", requireAuth);

/**
 * GET /at-risk-patients
 * Returns patients with high dropout risk.
 */
app.get("/at-risk-patients", async (c) => {
  const db = createDb(c.env);
  const user = c.get("user");

  const results = await db
    .select({
      id: patients.id,
      name: patients.fullName,
      risk: patientAdherencePredictions.dropoutRisk,
      factors: patientAdherencePredictions.riskFactors,
      suggestion: patientAdherencePredictions.suggestedAction,
    })
    .from(patientAdherencePredictions)
    .innerJoin(patients, eq(patientAdherencePredictions.patientId, patients.id))
    .where(
      and(
        eq(patientAdherencePredictions.organizationId, user.organizationId),
        eq(patientAdherencePredictions.status, "active")
      )
    )
    .orderBy(desc(patientAdherencePredictions.dropoutRisk))
    .limit(20);

  return c.json({ data: results });
});

/**
 * POST /predict/:patientId
 * Manually triggers a prediction for a patient.
 */
app.post("/predict/:patientId", async (c) => {
  const db = createDb(c.env);
  const user = c.get("user");
  const patientId = c.req.param("patientId");

  const prediction = await AdherencePredictor.predictForPatient(
    db,
    user.organizationId,
    patientId
  );

  return c.json({ data: prediction });
});

/**
 * GET /business-kpis
 * Returns business KPIs for the dashboard.
 */
app.get("/business-kpis", async (c) => {
  const db = createDb(c.env);
  const user = c.get("user");

  const metrics = await db
    .select()
    .from(businessMetrics)
    .where(eq(businessMetrics.organizationId, user.organizationId))
    .orderBy(desc(businessMetrics.metricDate))
    .limit(1);

  return c.json({ data: metrics[0] || null });
});

export { app as analyticsRoutes };
