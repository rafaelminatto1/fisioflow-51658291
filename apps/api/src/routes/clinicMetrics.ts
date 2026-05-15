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

    const stats = {
      occupancy: {
        booked: Number(occupancyRes.rows[0].booked_slots || 0),
        capacity: Number(occupancyRes.rows[0].estimated_capacity_monthly || 1),
      },
      noShow: {
        count: Number(noShowRes.rows[0].no_shows || 0),
        total: Number(noShowRes.rows[0].total_appointments || 1),
      },
      financial: {
        totalRevenue: Number(revenueRes.rows[0].total_revenue || 0),
        avgTicket: Number(revenueRes.rows[0].avg_ticket || 0),
      },
      clinical: {
        avgSessions: Number(ltvRes.rows[0].avg_sessions_per_patient || 0),
      }
    };

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

/**
 * GET /api/clinic-metrics/patients/:id/ai-snapshot
 * Gera um resumo executivo da jornada clínica do paciente via IA.
 */
app.get("/patients/:id/ai-snapshot", requireAuth, async (c) => {
  const patientId = c.req.param("id");
  const user = c.get("user");
  const pool = createPool(c.env);

  try {
    // 1. Coletar dados clínicos recentes (últimas 10 evoluções).
    // Modelo pós-migração: observacao + pain_scale + estruturados JSONB.
    const history = await pool.query(
      `SELECT s.date, s.observacao, s.pain_scale, s.procedures, s.exercises, s.measurements, s.home_exercises
       FROM sessions s
       WHERE s.patient_id = $1 AND s.organization_id = $2
       ORDER BY s.date DESC
       LIMIT 10`,
      [patientId, user.organizationId]
    );

    if (history.rows.length === 0) {
      return c.json({ data: { mainStatus: "Sem histórico clínico suficiente para gerar snapshot." } });
    }

    const { runThinkingModel } = await import("../lib/ai-native");

    const prompt = `
      Você é um fisioterapeuta sênior em São Paulo. 
      Sua tarefa é ler estas últimas 10 evoluções clínicas de um paciente e gerar um snapshot executivo para o time clínico.
      
      EVOLUÇÕES:
      ${JSON.stringify(history.rows)}

      FORMATO DE SAÍDA (Retorne APENAS JSON puro):
      {
        "mainStatus": "Resumo em 1 frase do estado atual e evolução",
        "keyWins": ["Ganho clínico 1", "Ganho clínico 2"],
        "remainingChallenges": ["Desafio 1", "Desafio 2"],
        "clinicalRisk": "low | medium | high"
      }
    `.trim();

    const result = await runThinkingModel(c.env, {
      prompt,
      model: "gemini-1.5-flash",
      temperature: 0.2,
      responseFormat: "json"
    });

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch?.[0] ?? result.content);

    return c.json({ data });
  } catch (error) {
    console.error("[Metrics] AI Snapshot error:", error);
    return c.json({ error: "Failed to generate AI snapshot" }, 500);
  }
});

/**
 * GET /api/clinic-metrics/protocol-efficacy
 * Compara a eficácia dos protocolos clínicos (sessões médias até a melhora).
 */
app.get("/protocol-efficacy", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  try {
    const result = await pool.query(
      `WITH session_pain AS (
        SELECT
          s.patient_id,
          p.protocol_id,
          ep.name as protocol_name,
          s.date,
          s.pain_scale::int as pain,
          ROW_NUMBER() OVER(PARTITION BY s.patient_id, p.protocol_id ORDER BY s.date ASC) as session_num
        FROM sessions s
        JOIN patient_protocols p ON p.patient_id = s.patient_id
        JOIN exercise_protocols ep ON ep.id = p.protocol_id
        WHERE s.organization_id = $1
          AND s.pain_scale IS NOT NULL
      ),
      improvement_milestones AS (
        SELECT 
          protocol_id,
          protocol_name,
          patient_id,
          MIN(session_num) as sessions_to_improvement
        FROM session_pain
        WHERE pain <= 3
        GROUP BY protocol_id, protocol_name, patient_id
      )
      SELECT 
        protocol_id,
        protocol_name,
        COUNT(DISTINCT patient_id) as total_patients,
        AVG(sessions_to_improvement)::numeric(5,1) as avg_sessions_to_goal
      FROM improvement_milestones
      GROUP BY protocol_id, protocol_name
      HAVING COUNT(DISTINCT patient_id) >= 2
      ORDER BY avg_sessions_to_goal ASC`,
      [user.organizationId]
    );

    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Metrics] Protocol Efficacy error:", error);
    return c.json({ error: "Failed to calculate protocol efficacy" }, 500);
  }
});

/**
 * GET /api/clinic-metrics/clinical-quality
 * Dashboard de qualidade clínica: scores médios de SOAP por terapeuta.
 */
app.get("/clinical-quality", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  try {
    const result = await pool.query(
      `SELECT 
        p.full_name,
        AVG(apr.quality_score)::numeric(5,1) as avg_quality,
        COUNT(apr.id) as reviews_count,
        (SELECT COUNT(*) FROM sessions WHERE organization_id = $1 AND therapist_id = p.id) as total_sessions
       FROM profiles p
       JOIN ai_peer_reviews apr ON apr.therapist_id = p.id
       WHERE p.organization_id = $1 AND p.role = 'therapist'
       GROUP BY p.id, p.full_name
       ORDER BY avg_quality DESC`,
      [user.organizationId]
    );

    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Metrics] Clinical Quality error:", error);
    return c.json({ error: "Failed to calculate clinical quality" }, 500);
  }
});

/**
 * GET /api/clinic-metrics/clinical-alerts
 * Lista todos os alertas pendentes de monitoramento (RTM/IA).
 */
app.get("/clinical-alerts", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  try {
    const result = await pool.query(
      `SELECT 
        ca.*,
        p.full_name as patient_name
       FROM clinical_alerts ca
       JOIN patients p ON p.id = ca.patient_id
       WHERE p.organization_id = $1 AND ca.status = 'pending'
       ORDER BY ca.created_at DESC`,
      [user.organizationId]
    );

    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Metrics] Clinical Alerts error:", error);
    return c.json({ error: "Failed to fetch clinical alerts" }, 500);
  }
});

export { app as clinicMetricsRoutes };
