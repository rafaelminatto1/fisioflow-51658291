import { Hono } from "hono";
import { createDb } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";
import { businessMetrics, patientAdherencePredictions, patients } from "@fisioflow/db";
import { eq, desc, and } from "drizzle-orm";
import { AdherencePredictor } from "../lib/ai/adherencePredictor";
import { isUuid } from "../lib/validators";

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
        eq(patientAdherencePredictions.status, "active"),
      ),
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

  const prediction = await AdherencePredictor.predictForPatient(db, user.organizationId, patientId);

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

/**
 * GET /wiki-gaps
 * Perguntas que a busca da wiki não conseguiu responder (últimos 30 dias),
 * agregadas a partir dos eventos wiki_search_miss no Analytics Engine.
 */
app.get("/wiki-gaps", async (c) => {
  const user = c.get("user");
  if (!["admin", "owner"].includes(String(user.role ?? ""))) {
    return c.json({ error: "Acesso restrito a administradores" }, 403);
  }
  if (!c.env.CF_API_TOKEN || !c.env.CF_ACCOUNT_ID) {
    return c.json({ data: [], warning: "CF_API_TOKEN/CF_ACCOUNT_ID não configurados" });
  }
  if (!isUuid(user.organizationId)) {
    return c.json({ data: [] });
  }

  const accountId = c.env.CF_ACCOUNT_ID;
  const sqlQuery = `SELECT
      blob5 AS query,
      count() AS misses,
      max(timestamp) AS last_seen
    FROM fisioflow_events
    WHERE blob4 IN ('wiki_search_miss', 'patient_assistant_query')
      AND blob5 != ''
      AND blob3 = '${user.organizationId}'
      AND timestamp > NOW() - INTERVAL '30' DAY
    GROUP BY blob5
    ORDER BY misses DESC
    LIMIT 25`;

  try {
    const r = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.env.CF_API_TOKEN}`,
          "Content-Type": "text/plain",
        },
        body: sqlQuery,
      },
    );
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      console.error("[wiki-gaps] Analytics Engine error:", r.status, text.slice(0, 200));
      return c.json({ data: [], warning: `Analytics Engine ${r.status}` });
    }
    const json = (await r.json()) as {
      data?: Array<{ query: string; misses: number; last_seen: string }>;
    };
    return c.json({ data: json.data ?? [] });
  } catch (error) {
    console.error("[wiki-gaps] error:", error);
    return c.json({ data: [], warning: "Falha ao consultar Analytics Engine" });
  }
});

export { app as analyticsRoutes };
