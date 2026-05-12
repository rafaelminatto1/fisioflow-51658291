import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/kpis", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  try {
    // 1. Taxa de Ocupação (Slots preenchidos / total estimado)
    // Assume-se 8h por dia por terapeuta como base para o cálculo de slots
    const occupancyRes = await pool.query(
      `SELECT 
        COUNT(*) filter (where status in ('confirmed', 'completed', 'realizado')) as booked_slots,
        (SELECT COUNT(distinct therapist_id) FROM appointments WHERE organization_id = $1) * 40 * 4 as estimated_capacity_monthly
       FROM appointments 
       WHERE organization_id = $1 
         AND date >= date_trunc('month', CURRENT_DATE)
         AND date < date_trunc('month', CURRENT_DATE) + interval '1 month'`,
      [user.organizationId]
    );

    // 2. No-Show Rate (Últimos 90 dias)
    const noShowRes = await pool.query(
      `SELECT 
        COUNT(*) filter (where status = 'no_show') as no_shows,
        COUNT(*) as total_appointments
       FROM appointments 
       WHERE organization_id = $1 
         AND date >= CURRENT_DATE - interval '90 days'`,
      [user.organizationId]
    );

    // 3. Ticket Médio e Receita
    const revenueRes = await pool.query(
      `SELECT 
        SUM(valor) as total_revenue,
        COUNT(*) as total_payments,
        AVG(valor) as avg_ticket
       FROM pagamentos
       WHERE organization_id = $1
         AND created_at >= date_trunc('month', CURRENT_DATE)`,
      [user.organizationId]
    );

    // 4. LTV Base (Refinado: Pacientes com pelo menos 2 sessões para filtrar 'one-timers')
    const ltvRes = await pool.query(
      `WITH patient_sessions AS (
        SELECT patient_id, COUNT(*) as session_count
        FROM patient_session_metrics
        WHERE organization_id = $1
        GROUP BY patient_id
        HAVING COUNT(*) >= 2
      )
      SELECT COALESCE(AVG(session_count), 0) as avg_sessions_per_patient FROM patient_sessions`,
      [user.organizationId]
    );

    return c.json({ data: stats });
  } catch (error) {
    console.error("[Metrics] Error calculating KPIs:", error);
    return c.json({ error: "Failed to calculate business metrics" }, 500);
  }
});

/**
 * GET /api/clinic-metrics/team-performance
 * Calcula faturamento, ocupação e taxa de comparecimento por profissional.
 */
app.get("/team-performance", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  try {
    const result = await pool.query(
      `WITH professional_stats AS (
        SELECT 
          p.id as therapist_id,
          p.full_name,
          COUNT(a.id) as total_appointments,
          COUNT(a.id) filter (where a.status in ('confirmed', 'completed', 'realizado')) as completed_count,
          COUNT(a.id) filter (where a.status = 'no_show') as no_show_count
        FROM profiles p
        LEFT JOIN appointments a ON a.therapist_id = p.id
        WHERE p.organization_id = $1 AND p.role = 'therapist'
          AND (a.date >= date_trunc('month', CURRENT_DATE) OR a.id IS NULL)
        GROUP BY p.id, p.full_name
      ),
      professional_revenue AS (
        SELECT 
          therapist_id,
          SUM(valor) as revenue
        FROM pagamentos
        WHERE organization_id = $1
          AND created_at >= date_trunc('month', CURRENT_DATE)
        GROUP BY therapist_id
      )
      SELECT 
        s.*,
        COALESCE(r.revenue, 0) as monthly_revenue
      FROM professional_stats s
      LEFT JOIN professional_revenue r ON r.therapist_id = s.therapist_id
      ORDER BY monthly_revenue DESC`,
      [user.organizationId]
    );

    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Metrics] Team Performance error:", error);
    return c.json({ error: "Failed to calculate team performance" }, 500);
  }
});

/**
 * GET /api/clinic-metrics/patients/:id/digital-twin
 * Retorna as predições e métricas de trajetória do paciente.
 */
app.get("/patients/:id/digital-twin", requireAuth, async (c) => {
  const patientId = c.req.param("id");
  const user = c.get("user");
  const pool = createPool(c.env);

  try {
    const result = await pool.query(
      `SELECT * FROM patient_longitudinal_summary 
       WHERE patient_id = $1 AND organization_id = $2`,
      [patientId, user.organizationId]
    );

    return c.json({ data: result.rows[0] || null });
  } catch (error) {
    console.error("[Metrics] Digital Twin error:", error);
    return c.json({ error: "Failed to fetch digital twin data" }, 500);
  }
});

/**
 * GET /api/clinic-metrics/cohorts
 * Análise de Cohort: Retenção de pacientes agrupados por mês de início.
 */
app.get("/cohorts", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  try {
    const result = await pool.query(
      `WITH patient_start AS (
        SELECT 
          id as patient_id,
          date_trunc('month', created_at) as cohort_month
        FROM patients
        WHERE organization_id = $1 AND deleted_at IS NULL
      ),
      patient_activity AS (
        SELECT 
          patient_id,
          date_trunc('month', date) as activity_month
        FROM appointments
        WHERE organization_id = $1 AND status IN ('confirmed', 'completed', 'realizado')
        GROUP BY patient_id, activity_month
      ),
      cohort_size AS (
        SELECT cohort_month, COUNT(*) as size
        FROM patient_start
        GROUP BY cohort_month
      ),
      retention_data AS (
        SELECT 
          s.cohort_month,
          EXTRACT(YEAR FROM a.activity_month - s.cohort_month) * 12 + EXTRACT(MONTH FROM a.activity_month - s.cohort_month) as month_number,
          COUNT(DISTINCT a.patient_id) as retained_patients
        FROM patient_start s
        JOIN patient_activity a ON a.patient_id = s.patient_id
        WHERE a.activity_month >= s.cohort_month
        GROUP BY s.cohort_month, month_number
      )
      SELECT 
        r.cohort_month,
        cs.size as cohort_size,
        r.month_number,
        r.retained_patients,
        (r.retained_patients::float / cs.size) * 100 as retention_rate
      FROM retention_data r
      JOIN cohort_size cs ON cs.cohort_month = r.cohort_month
      ORDER BY r.cohort_month DESC, r.month_number ASC`,
      [user.organizationId]
    );

    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Metrics] Cohort error:", error);
    return c.json({ error: "Failed to calculate cohorts" }, 500);
  }
});

/**
 * GET /api/clinic-metrics/churn
 * Relatório de Churn: Pacientes que pararam de frequentar a clínica.
 */
app.get("/churn", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  try {
    const result = await pool.query(
      `WITH last_activity AS (
        SELECT 
          patient_id,
          MAX(date) as last_session_date
        FROM appointments
        WHERE organization_id = $1 AND status IN ('confirmed', 'completed', 'realizado')
        GROUP BY patient_id
      )
      SELECT 
        p.id,
        p.full_name,
        la.last_session_date,
        CURRENT_DATE - la.last_session_date::date as days_inactive
      FROM patients p
      JOIN last_activity la ON la.patient_id = p.id
      WHERE p.organization_id = $1
        AND p.deleted_at IS NULL
        AND la.last_session_date < CURRENT_DATE - INTERVAL '30 days'
        AND p.status != 'alta'
      ORDER BY la.last_session_date DESC`,
      [user.organizationId]
    );

    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Metrics] Churn error:", error);
    return c.json({ error: "Failed to calculate churn" }, 500);
  }
});

export { app as clinicMetricsRoutes };
