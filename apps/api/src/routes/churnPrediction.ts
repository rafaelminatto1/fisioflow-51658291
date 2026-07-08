import { Hono } from "hono";
import { createReplicaPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

type RiskLevel = "high" | "medium";

interface ChurnSignal {
  patient_id: string;
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
  signal_type: "increasing_noshow" | "scheduling_gap";
  risk_level: RiskLevel;
  noshow_count: number | null;
  days_since_last: number | null;
}

function toText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

const RISK_PRIORITY: Record<RiskLevel, number> = {
  high: 2,
  medium: 1,
};

// GET /api/churn-prediction/at-risk-signals
app.get("/at-risk-signals", requireAuth, async (c) => {
  const organizationId = c.get("user").organizationId;
  const pool = createReplicaPool(c.env);

  try {
    const [noshowResult, gapResult] = await Promise.all([
      // Sinal 1: Frequência de faltas aumentando (3+ no-shows nos últimos 60 dias)
      pool.query<{
        id: string;
        full_name: string;
        phone: string | null;
        whatsapp: string | null;
        noshow_count: string;
        signal_type: string;
        risk_level: string;
      }>(
        `SELECT p.id, p.full_name, p.phone, p.whatsapp,
                COUNT(*) AS noshow_count,
                'increasing_noshow' AS signal_type,
                'high' AS risk_level
         FROM appointments a
         JOIN patients p ON p.id = a.patient_id
         WHERE a.organization_id = $1
           AND a.status = 'no_show'
           AND a.start_time >= NOW() - INTERVAL '60 days'
         GROUP BY p.id, p.full_name, p.phone, p.whatsapp
         HAVING COUNT(*) >= 3`,
        [organizationId]
      ),

      // Sinal 2: Paciente ativo sem agendamento há 21+ dias (mas com sessão nos últimos 90)
      pool.query<{
        id: string;
        full_name: string;
        phone: string | null;
        whatsapp: string | null;
        days_since_last: string;
        signal_type: string;
        risk_level: string;
      }>(
        `SELECT DISTINCT p.id, p.full_name, p.phone, p.whatsapp,
                DATE_PART('day', NOW() - MAX(a.start_time)) AS days_since_last,
                'scheduling_gap' AS signal_type,
                'medium' AS risk_level
         FROM patients p
         JOIN appointments a ON a.patient_id = p.id
         WHERE p.organization_id = $1
           AND a.start_time >= NOW() - INTERVAL '90 days'
         GROUP BY p.id, p.full_name, p.phone, p.whatsapp
         HAVING MAX(a.start_time) < NOW() - INTERVAL '21 days'
            AND MAX(a.start_time) >= NOW() - INTERVAL '90 days'`,
        [organizationId]
      ),
    ]);

    // Mapear resultados para tipo uniforme
    const noshowSignals: ChurnSignal[] = noshowResult.rows.map((row) => ({
      patient_id: toText(row.id),
      full_name: toText(row.full_name, "Paciente sem nome"),
      phone: toNullableString(row.phone),
      whatsapp: toNullableString(row.whatsapp),
      signal_type: "increasing_noshow",
      risk_level: "high",
      noshow_count: toNullableNumber(row.noshow_count),
      days_since_last: null,
    }));

    const gapSignals: ChurnSignal[] = gapResult.rows.map((row) => ({
      patient_id: toText(row.id),
      full_name: toText(row.full_name, "Paciente sem nome"),
      phone: toNullableString(row.phone),
      whatsapp: toNullableString(row.whatsapp),
      signal_type: "scheduling_gap",
      risk_level: "medium",
      noshow_count: null,
      days_since_last: toNullableNumber(row.days_since_last),
    }));

    // Combinar e deduplicar por patient_id — manter o de maior risco
    const byPatient = new Map<string, ChurnSignal>();

    for (const signal of [...noshowSignals, ...gapSignals]) {
      const existing = byPatient.get(signal.patient_id);
      if (!existing) {
        byPatient.set(signal.patient_id, signal);
      } else {
        const currentPriority = RISK_PRIORITY[signal.risk_level] ?? 0;
        const existingPriority = RISK_PRIORITY[existing.risk_level] ?? 0;
        if (currentPriority > existingPriority) {
          byPatient.set(signal.patient_id, signal);
        }
      }
    }

    const data = Array.from(byPatient.values());

    const highRisk = data.filter((s) => s.risk_level === "high").length;
    const mediumRisk = data.filter((s) => s.risk_level === "medium").length;

    return c.json({
      data,
      total: data.length,
      high_risk: highRisk,
      medium_risk: mediumRisk,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[churnPrediction] Error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { app as churnPredictionRoutes };
