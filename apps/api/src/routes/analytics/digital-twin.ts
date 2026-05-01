/**
 * Digital Twin — AI-powered patient prognosis panel.
 * Aggregates PROMs, HEP adherence, attendance rate, and Claude insights.
 */

import { z } from "zod";
import { Hono } from "hono";
import { createPool } from "../../lib/db";
import { requireAuth, type AuthVariables } from "../../lib/auth";
import type { Env } from "../../types/env";
import { sendPushToUser } from "../../lib/webpush";
import { callAI } from "../../lib/ai/callAI";

const DigitalTwinInsightsSchema = z.object({
  prognostic_score: z.number().min(0).max(100).optional(),
  risk_level: z.enum(["low", "medium", "high"]).optional(),
  recovery_estimate_sessions: z.number().nullable().optional(),
  narrative: z.string().optional(),
  alerts: z.array(z.string()).optional(),
  insights: z.array(z.string()).optional(),
});

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/patient/:id", requireAuth, async (c) => {
  const { id: patientId } = c.req.param();
  const user = c.get("user");
  const db = await createPool(c.env);

  // Check KV cache (24h TTL)
  const cacheKey = `digital-twin:${patientId}`;
  if (c.env.FISIOFLOW_CONFIG) {
    const cached = await c.env.FISIOFLOW_CONFIG.get(cacheKey, "json");
    if (cached) return c.json({ data: cached });
  }

  // 1. PROMs timeline
  const promsResult = await db.query(
    `SELECT scale_name, score, completed_at
     FROM standardized_test_results
     WHERE patient_id = $1
     ORDER BY completed_at ASC`,
    [patientId],
  ).catch(() => ({ rows: [] }));

  // 2. Attendance rate (last 60 days)
  const attendanceResult = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('concluido','confirmado','em_atendimento')) AS attended,
       COUNT(*) AS total
     FROM appointments
     WHERE patient_id = $1
       AND date >= CURRENT_DATE - INTERVAL '60 days'
       AND status NOT IN ('cancelado')`,
    [patientId],
  ).catch(() => ({ rows: [{ attended: 0, total: 0 }] }));

  const { attended, total } = attendanceResult.rows[0] ?? { attended: 0, total: 1 };
  const attendanceRate = total > 0 ? Math.round((Number(attended) / Number(total)) * 100) : 0;

  // 3. Days since last session
  const lastSessionResult = await db.query(
    `SELECT MAX(created_at) AS last_session FROM sessions WHERE patient_id = $1`,
    [patientId],
  ).catch(() => ({ rows: [{ last_session: null }] }));
  const lastSession = lastSessionResult.rows[0]?.last_session;
  const daysSinceLastSession = lastSession
    ? Math.floor((Date.now() - new Date(lastSession).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // 4. HEP adherence (XP gained in last 30 days as proxy)
  const hepResult = await db.query(
    `SELECT COALESCE(SUM(xp_earned), 0) AS xp_30d
     FROM xp_transactions
     WHERE patient_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
    [patientId],
  ).catch(() => ({ rows: [{ xp_30d: 0 }] }));
  const xp30d = Number(hepResult.rows[0]?.xp_30d ?? 0);
  // 30 * 35 XP/day theoretical max; normalize 0–100
  const adherenceScore = Math.min(100, Math.round((xp30d / (30 * 35)) * 100));

  // 5. Missed consecutive appointments
  const missedResult = await db.query(
    `SELECT COUNT(*) AS missed
     FROM appointments
     WHERE patient_id = $1
       AND status = 'nao_compareceu'
       AND date >= CURRENT_DATE - INTERVAL '14 days'`,
    [patientId],
  ).catch(() => ({ rows: [{ missed: 0 }] }));
  const recentMissed = Number(missedResult.rows[0]?.missed ?? 0);

  // 6. Dropout risk calculation
  let dropoutRisk: "low" | "medium" | "high" = "low";
  const riskFactors: string[] = [];

  if (recentMissed >= 2) { dropoutRisk = "high"; riskFactors.push("2+ faltas nos últimos 14 dias"); }
  if (adherenceScore < 30) { if (dropoutRisk === "low") dropoutRisk = "medium"; riskFactors.push("Aderência ao HEP abaixo de 30%"); }
  if (daysSinceLastSession > 14) { if (dropoutRisk === "low") dropoutRisk = "medium"; riskFactors.push(`Sem sessão há ${daysSinceLastSession} dias`); }
  if (attendanceRate < 50 && total > 0) { if (dropoutRisk === "low") dropoutRisk = "medium"; riskFactors.push(`Taxa de comparecimento: ${attendanceRate}%`); }
  if (recentMissed >= 3 || (daysSinceLastSession > 21 && adherenceScore < 30)) dropoutRisk = "high";

  // 7. PROMs trend
  const promsTimeline = promsResult.rows;
  let trend: "improving" | "stable" | "declining" = "stable";
  if (promsTimeline.length >= 4) {
    const half = Math.floor(promsTimeline.length / 2);
    const earlyAvg = promsTimeline.slice(0, half).reduce((s: number, p: any) => s + Number(p.score), 0) / half;
    const recentAvg = promsTimeline.slice(-half).reduce((s: number, p: any) => s + Number(p.score), 0) / half;
    if (recentAvg < earlyAvg * 0.9) trend = "improving"; // lower score = better for pain scales
    else if (recentAvg > earlyAvg * 1.1) trend = "declining";
  }

  // 8. AI narrative prognosis via callAI (task: patient-360)
  let aiInsights: string[] = [];
  let prognosticScore = 50;
  let riskLevel: "low" | "medium" | "high" = dropoutRisk;
  let recoveryEstimateSessions: number | null = null;
  let narrative = "";
  let alerts: string[] = riskFactors;

  try {
    const prompt = `Você é um fisioterapeuta sênior gerando um prognóstico clínico completo para o Digital Twin de um paciente.

Dados clínicos:
- Sessões totais: ${total}
- Taxa de comparecimento (60 dias): ${attendanceRate}%
- Aderência ao HEP (30 dias): ${adherenceScore}%
- Última sessão: há ${daysSinceLastSession} dias
- Risco de abandono calculado: ${dropoutRisk}
- Fatores de risco: ${riskFactors.join(", ") || "nenhum"}
- PROMs: ${promsTimeline.length} registros, tendência: ${trend}

Retorne SOMENTE JSON válido neste formato:
{
  "prognostic_score": <número 0-100, onde 100 = excelente prognóstico>,
  "risk_level": "<low|medium|high>",
  "recovery_estimate_sessions": <número estimado de sessões para alta, ou null se incerto>,
  "narrative": "<parágrafo narrativo clínico de 3-4 frases para o fisioterapeuta, em português>",
  "alerts": ["<alerta clínico 1>", "<alerta clínico 2>"],
  "insights": ["<insight clínico 1>", "<insight clínico 2>", "<insight clínico 3>"]
}`;

    const aiResult = await callAI(c.env, {
      task: "patient-360",
      prompt,
      organizationId: user.organizationId,
    });

    const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = DigitalTwinInsightsSchema.safeParse(JSON.parse(jsonMatch[0]));
      if (parsed.success) {
        prognosticScore = Number(parsed.data.prognostic_score ?? 50);
        riskLevel = parsed.data.risk_level ?? dropoutRisk;
        recoveryEstimateSessions = parsed.data.recovery_estimate_sessions ?? null;
        narrative = parsed.data.narrative ?? "";
        alerts = parsed.data.alerts ?? riskFactors;
        aiInsights = parsed.data.insights ?? [];
      }
    }
  } catch {
    aiInsights = [];
  }

  const result = {
    patientId,
    promsTimeline,
    attendanceRate,
    adherenceScore,
    daysSinceLastSession,
    dropoutRisk: riskLevel,
    dropoutRiskFactors: riskFactors,
    trend,
    totalSessions: Number(total),
    aiInsights,
    prognosticScore,
    riskLevel,
    recoveryEstimateSessions,
    narrative,
    alerts,
    generatedAt: new Date().toISOString(),
  };

  // Save snapshot to digital_twin_snapshots (non-blocking)
  c.executionCtx.waitUntil(
    db.query(
      `INSERT INTO digital_twin_snapshots (patient_id, org_id, snapshot, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (patient_id) DO UPDATE
         SET snapshot = EXCLUDED.snapshot, created_at = NOW()`,
      [patientId, user.organizationId, JSON.stringify(result)],
    ).catch(() => {}),
  );

  // Cache for 24h
  if (c.env.FISIOFLOW_CONFIG) {
    c.env.FISIOFLOW_CONFIG.put(cacheKey, JSON.stringify(result), { expirationTtl: 86400 }).catch(() => {});
  }

  // Alert therapist if high risk
  if (dropoutRisk === "high" && user.uid) {
    const patientResult = await db.query(
      `SELECT full_name FROM patients WHERE id = $1 LIMIT 1`,
      [patientId],
    ).catch(() => ({ rows: [] }));
    const name = patientResult.rows[0]?.full_name ?? "Paciente";

    sendPushToUser(
      user.uid,
      {
        title: "⚠️ Risco de abandono detectado",
        body: `${name} apresenta alto risco de abandono. ${riskFactors[0] || "Verifique o prontuário."}`,
        url: `/pacientes/${patientId}`,
        tag: `dropout-risk-${patientId}`,
      },
      c.env,
    ).catch(() => {});
  }

  return c.json({ data: result });
});

// Invalidate cache when a new session or appointment is recorded
app.delete("/patient/:id/cache", requireAuth, async (c) => {
  const { id } = c.req.param();
  if (c.env.FISIOFLOW_CONFIG) {
    await c.env.FISIOFLOW_CONFIG.delete(`digital-twin:${id}`).catch(() => {});
  }
  return c.json({ ok: true });
});

export { app as digitalTwinRoutes };
