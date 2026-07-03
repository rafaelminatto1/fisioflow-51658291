import { Hono } from "hono";
import { createDb } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";
import { businessMetrics, patientAdherencePredictions, patients } from "@fisioflow/db";
import { eq, desc, and } from "drizzle-orm";
import { createPool } from "../lib/db";
import { AdherencePredictor } from "../lib/ai/adherencePredictor";
import { isUuid } from "../lib/validators";
import { hasTable } from "./analytics/shared";
import { registerPatientAnalyticsRoutes } from "./analytics/patient";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("*", requireAuth);
registerPatientAnalyticsRoutes(app);

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

/**
 * GET /dashboard
 * Dashboard de insights consolidado (usado pela Central de Inteligência).
 * Path completo: /api/insights/dashboard
 */
app.get("/dashboard", async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  try {
    const period = c.req.query("period") || "month";
    let dateFilter = "";
    let truncPeriod = "month";

    switch (period) {
      case "today":
        dateFilter = "AND a.date = CURRENT_DATE";
        truncPeriod = "day";
        break;
      case "week":
        dateFilter =
          "AND a.date >= date_trunc('week', CURRENT_DATE) AND a.date < date_trunc('week', CURRENT_DATE) + interval '1 week'";
        truncPeriod = "week";
        break;
      case "month":
      default:
        dateFilter =
          "AND a.date >= date_trunc('month', CURRENT_DATE) AND a.date < date_trunc('month', CURRENT_DATE) + interval '1 month'";
        truncPeriod = "month";
        break;
    }

    // Agendamentos no período
    const appointmentsRes = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) filter (where status IN ('completed', 'realizado')) as completed,
        COUNT(*) filter (where status = 'no_show') as no_shows,
        COUNT(*) filter (where status IN ('confirmed', 'scheduled', 'agendado')) as upcoming
      FROM appointments a
      WHERE a.organization_id = $1 ${dateFilter}`,
      [user.organizationId],
    );

    // Receita no período (payments usa amount numeric, paid_at date)
    const revenueRes = await pool.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as total_payments,
        AVG(amount) as avg_ticket
      FROM payments
      WHERE organization_id = $1
        AND status = 'completed'
        AND paid_at >= date_trunc('${truncPeriod}', CURRENT_DATE)
        AND deleted_at IS NULL`,
      [user.organizationId],
    );

    // Novos pacientes no período
    const newPatientsRes = await pool.query(
      `SELECT COUNT(*) as count
      FROM patients
      WHERE organization_id = $1
        AND created_at >= date_trunc('${truncPeriod}', CURRENT_DATE)`,
      [user.organizationId],
    );

    return c.json({
      data: {
        period,
        appointments: {
          total: Number(appointmentsRes.rows[0]?.total || 0),
          completed: Number(appointmentsRes.rows[0]?.completed || 0),
          no_shows: Number(appointmentsRes.rows[0]?.no_shows || 0),
          upcoming: Number(appointmentsRes.rows[0]?.upcoming || 0),
        },
        financial: {
          total_revenue: Number(revenueRes.rows[0]?.total_revenue || 0),
          total_payments: Number(revenueRes.rows[0]?.total_payments || 0),
          avg_ticket: Number(revenueRes.rows[0]?.avg_ticket || 0),
        },
        new_patients: Number(newPatientsRes.rows[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("[Analytics] Insights Dashboard error:", error);
    return c.json({ error: "Failed to fetch insights dashboard" }, 500);
  }
});

app.get("/bi", async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const monthsParam = Number(c.req.query("months") ?? 6);
  const months = Number.isFinite(monthsParam) ? Math.min(Math.max(monthsParam, 1), 24) : 6;

  try {
    const periodStartRes = await pool.query(
      `SELECT date_trunc('month', CURRENT_DATE) - (($1::int - 1) * interval '1 month') AS period_start`,
      [months],
    );
    const periodStart = periodStartRes.rows[0]?.period_start;

    const [revenueRes, currentMonthRes, occupancyRes, retentionRes, topTherapistsRes, statusRes, marketingSpendRes, newPatientsRes] =
      await Promise.all([
        pool.query(
          `
            SELECT
              to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
              COUNT(*)::int AS payments_count,
              COALESCE(SUM(amount), 0)::numeric AS revenue
            FROM payments
            WHERE organization_id = $1
              AND created_at >= $2
              AND deleted_at IS NULL
              AND status IN ('completed', 'paid', 'realizado')
            GROUP BY 1
            ORDER BY 1 ASC
          `,
          [user.organizationId, periodStart],
        ),
        pool.query(
          `
            SELECT COALESCE(SUM(amount), 0)::numeric AS revenue
            FROM payments
            WHERE organization_id = $1
              AND deleted_at IS NULL
              AND status IN ('completed', 'paid', 'realizado')
              AND created_at >= date_trunc('month', CURRENT_DATE)
          `,
          [user.organizationId],
        ),
        pool.query(
          `
            WITH scoped AS (
              SELECT status
              FROM appointments
              WHERE organization_id = $1
                AND date >= $2
            )
            SELECT
              COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed', 'realizado', 'scheduled', 'agendado'))::int AS booked,
              COUNT(*)::int AS total
            FROM scoped
          `,
          [user.organizationId, periodStart],
        ),
        pool.query(
          `
            WITH patient_visits AS (
              SELECT patient_id, COUNT(*)::int AS total_visits
              FROM appointments
              WHERE organization_id = $1
                AND patient_id IS NOT NULL
                AND date >= $2
              GROUP BY patient_id
            )
            SELECT
              COUNT(*) FILTER (WHERE total_visits >= 2)::int AS retained_patients,
              COUNT(*)::int AS total_active_patients
            FROM patient_visits
          `,
          [user.organizationId, periodStart],
        ),
        pool.query(
          `
            WITH therapist_sessions AS (
              SELECT
                a.therapist_id,
                COUNT(*) FILTER (WHERE a.status IN ('completed', 'realizado'))::int AS sessions_completed,
                COUNT(*) FILTER (WHERE a.status = 'no_show')::int AS no_shows
              FROM appointments a
              WHERE a.organization_id = $1
                AND a.date >= $2
                AND a.therapist_id IS NOT NULL
              GROUP BY a.therapist_id
            ),
            therapist_revenue AS (
              SELECT
                a.therapist_id,
                COALESCE(SUM(p.amount), 0)::numeric AS revenue
              FROM payments p
              JOIN appointments a ON a.id = p.appointment_id
              WHERE p.organization_id = $1
                AND p.deleted_at IS NULL
                AND p.status IN ('completed', 'paid', 'realizado')
                AND p.created_at >= $2
                AND a.therapist_id IS NOT NULL
              GROUP BY a.therapist_id
            )
            SELECT
              ts.therapist_id,
              COALESCE(pr.full_name, ts.therapist_id::text, 'Profissional') AS name,
              ts.sessions_completed,
              ts.no_shows,
              COALESCE(tr.revenue, 0)::text AS revenue
            FROM therapist_sessions ts
            LEFT JOIN profiles pr ON pr.id = ts.therapist_id
            LEFT JOIN therapist_revenue tr ON tr.therapist_id = ts.therapist_id
            ORDER BY ts.sessions_completed DESC, COALESCE(tr.revenue, 0) DESC
            LIMIT 5
          `,
          [user.organizationId, periodStart],
        ).catch(() => ({ rows: [] as Array<Record<string, unknown>> })),
        pool.query(
          `
            SELECT status, COUNT(*)::int AS count
            FROM appointments
            WHERE organization_id = $1
              AND date >= $2
            GROUP BY status
            ORDER BY count DESC
          `,
          [user.organizationId, periodStart],
        ),
        pool.query(
          `
            SELECT COALESCE(SUM(amount), 0)::numeric AS marketing_spend
            FROM transactions
            WHERE organization_id = $1
              AND type = 'despesa'
              AND (category = 'marketing' OR category = 'anuncios' OR dre_category = 'marketing' OR description ILIKE '%marketing%' OR description ILIKE '%tráfego%')
              AND created_at >= $2
              AND deleted_at IS NULL
          `,
          [user.organizationId, periodStart],
        ).catch(() => ({ rows: [{ marketing_spend: "0" }] })),
        pool.query(
          `
            SELECT COUNT(*)::int AS count
            FROM patients
            WHERE organization_id = $1
              AND created_at >= $2
              AND deleted_at IS NULL
          `,
          [user.organizationId, periodStart],
        ).catch(() => ({ rows: [{ count: 0 }] })),
      ]);

    const revenueTrend = revenueRes.rows.map((row) => ({
      month: String(row.month ?? ""),
      sessions: Number(row.payments_count ?? 0),
      revenue: String(row.revenue ?? "0"),
    }));
    const currentMonth = Number(currentMonthRes.rows[0]?.revenue ?? 0);
    const previousMonthRevenue =
      revenueTrend.length > 1 ? Number(revenueTrend[revenueTrend.length - 2]?.revenue ?? 0) : 0;
    const trendPct =
      previousMonthRevenue > 0
        ? Number((((currentMonth - previousMonthRevenue) / previousMonthRevenue) * 100).toFixed(1))
        : currentMonth > 0
          ? 100
          : 0;
    const booked = Number(occupancyRes.rows[0]?.booked ?? 0);
    const totalSlots = Number(occupancyRes.rows[0]?.total ?? 0);
    const retainedPatients = Number(retentionRes.rows[0]?.retained_patients ?? 0);
    const totalActivePatients = Number(retentionRes.rows[0]?.total_active_patients ?? 0);

    // Cálculos de BI/ROI
    const marketingSpend = Number(marketingSpendRes.rows[0]?.marketing_spend || 0);
    const newPatients = Number(newPatientsRes.rows[0]?.count || 0);

    const cac = newPatients > 0 ? Number((marketingSpend / newPatients).toFixed(2)) : 0;

    const totalRevenuePeriod = revenueTrend.reduce((sum, row) => sum + Number(row.revenue), 0);
    const totalPaymentsCount = revenueTrend.reduce((sum, row) => sum + Number(row.sessions), 0);

    const avgTicket = totalPaymentsCount > 0 ? totalRevenuePeriod / totalPaymentsCount : 0;
    const avgSessions = totalActivePatients > 0 ? totalPaymentsCount / totalActivePatients : 0;
    const retentionRate = totalActivePatients > 0 ? (retainedPatients / totalActivePatients) : 0;

    const ltv = Number((avgTicket * avgSessions * (retentionRate > 0 ? retentionRate : 1)).toFixed(2));

    const monthlyRevenuePerPatient = totalActivePatients > 0 ? (totalRevenuePeriod / totalActivePatients) / months : 0;
    const payback = cac > 0 && monthlyRevenuePerPatient > 0 ? Number((cac / monthlyRevenuePerPatient).toFixed(1)) : 0;

    return c.json({
      data: {
        revenue: {
          trend: revenueTrend,
          total_period: totalRevenuePeriod,
          current_month: currentMonth,
          trend_pct: trendPct,
        },
        occupancy: {
          rate: totalSlots > 0 ? Number(((booked / totalSlots) * 100).toFixed(1)) : 0,
          booked,
          total_slots: totalSlots,
        },
        retention: {
          rate:
            totalActivePatients > 0
              ? Number(((retainedPatients / totalActivePatients) * 100).toFixed(1))
              : 0,
          retained_patients: retainedPatients,
          total_active_patients: totalActivePatients,
        },
        roi: {
          cac,
          ltv,
          payback,
          marketing_spend: marketingSpend,
          new_patients: newPatients,
        },
        top_therapists: topTherapistsRes.rows.map((row) => ({
          therapist_id: String(row.therapist_id ?? ""),
          name: String(row.name ?? "Profissional"),
          sessions_completed: Number(row.sessions_completed ?? 0),
          no_shows: Number(row.no_shows ?? 0),
          revenue: String(row.revenue ?? "0"),
        })),
        status_breakdown: statusRes.rows.map((row) => ({
          status: String(row.status ?? "unknown"),
          count: Number(row.count ?? 0),
        })),
      },
    });
  } catch (error) {
    console.error("[Analytics] BI error:", error);
    return c.json({ error: "Failed to fetch BI analytics" }, 500);
  }
});

app.get("/top-exercises", async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const limitParam = Number(c.req.query("limit") ?? 5);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 20) : 5;

  try {
    if (await hasTable(pool, "prescribed_exercises")) {
      const result = await pool.query(
        `
          SELECT
            COALESCE(exercise_id::text, 'sem-exercise-id') AS exercise_id,
            COALESCE(MAX(notes), 'Exercício sem nome') AS name,
            COUNT(*)::int AS usage_count
          FROM prescribed_exercises
          WHERE organization_id = $1
            AND deleted_at IS NULL
            AND is_active = true
          GROUP BY exercise_id
          ORDER BY usage_count DESC, name ASC
          LIMIT $2
        `,
        [user.organizationId, limit],
      );

      return c.json({
        data: result.rows.map((row) => ({
          exercise_id: String(row.exercise_id ?? ""),
          name: String(row.name ?? "Exercício"),
          usage_count: Number(row.usage_count ?? 0),
        })),
      });
    }

    return c.json({ data: [] });
  } catch (error) {
    console.error("[Analytics] Top exercises error:", error);
    return c.json({ error: "Failed to fetch top exercises" }, 500);
  }
});

app.get("/pain-map", async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const limitParam = Number(c.req.query("limit") ?? 5);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 20) : 5;

  try {
    if (!(await hasTable(pool, "pain_maps"))) {
      return c.json({ data: [] });
    }

    const hasPoints = await hasTable(pool, "pain_map_points");
    const result = hasPoints
      ? await pool.query(
          `
            SELECT
              COALESCE(NULLIF(TRIM(pmp.region), ''), NULLIF(TRIM(pm.body_region), ''), 'Não informado') AS region,
              COUNT(*)::int AS count,
              COALESCE(AVG(COALESCE(pmp.intensity, pm.pain_level)), 0)::numeric AS avg_intensity
            FROM pain_maps pm
            LEFT JOIN pain_map_points pmp
              ON pmp.pain_map_id = pm.id
             AND (pmp.organization_id = $1 OR pmp.organization_id IS NULL)
            WHERE pm.organization_id = $1
              AND pm.deleted_at IS NULL
            GROUP BY 1
            ORDER BY count DESC, avg_intensity DESC
            LIMIT $2
          `,
          [user.organizationId, limit],
        )
      : await pool.query(
          `
            SELECT
              COALESCE(NULLIF(TRIM(body_region), ''), 'Não informado') AS region,
              COUNT(*)::int AS count,
              COALESCE(AVG(pain_level), 0)::numeric AS avg_intensity
            FROM pain_maps
            WHERE organization_id = $1
              AND deleted_at IS NULL
            GROUP BY 1
            ORDER BY count DESC, avg_intensity DESC
            LIMIT $2
          `,
          [user.organizationId, limit],
        );

    return c.json({
      data: result.rows.map((row) => ({
        region: String(row.region ?? "Não informado"),
        count: Number(row.count ?? 0),
        avg_intensity: Number(row.avg_intensity ?? 0),
      })),
    });
  } catch (error) {
    console.error("[Analytics] Pain map error:", error);
    return c.json({ error: "Failed to fetch pain map analytics" }, 500);
  }
});

export { app as analyticsRoutes };
