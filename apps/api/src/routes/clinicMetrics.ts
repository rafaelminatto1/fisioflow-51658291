import { Hono } from "hono";
import { createReplicaPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { WORKERS_AI_MODELS } from "../lib/workersAi";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

type OverduePatientAggregateRow = {
  patient_id: string | null;
  full_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  overdue_count: string | number | null;
  overdue_total: string | number | null;
  oldest_overdue_date: string | null;
};

type OverdueSummaryAggregateRow = {
  total_patients: string | number | null;
  total_overdue: string | number | null;
};

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function mapOverduePatientRow(row: OverduePatientAggregateRow) {
  return {
    patient_id: toText(row.patient_id),
    full_name: toText(row.full_name, "Paciente sem nome"),
    phone: typeof row.phone === "string" ? row.phone : null,
    whatsapp: typeof row.whatsapp === "string" ? row.whatsapp : null,
    overdue_count: toNumber(row.overdue_count),
    overdue_total: toNumber(row.overdue_total),
    oldest_overdue_date: toText(row.oldest_overdue_date),
  };
}

export function mapOverdueSummaryRow(row?: OverdueSummaryAggregateRow) {
  return {
    total_patients: toNumber(row?.total_patients),
    total_overdue: toNumber(row?.total_overdue),
  };
}

app.get("/kpis", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createReplicaPool(c.env);

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
      [user.organizationId],
    );

    // 2. No-Show Rate (Últimos 90 dias)
    const noShowRes = await pool.query(
      `SELECT 
        COUNT(*) filter (where status = 'no_show') as no_shows,
        COUNT(*) as total_appointments
       FROM appointments 
       WHERE organization_id = $1 
         AND date >= CURRENT_DATE - interval '90 days'`,
      [user.organizationId],
    );

    // 3. Ticket Médio e Receita
    const revenueRes = await pool.query(
      `SELECT 
        SUM(amount) as total_revenue,
        COUNT(*) as total_payments,
        AVG(amount) as avg_ticket
       FROM payments
       WHERE organization_id = $1
         AND created_at >= date_trunc('month', CURRENT_DATE)`,
      [user.organizationId],
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
      [user.organizationId],
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
      },
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
  const pool = createReplicaPool(c.env);

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
          a.therapist_id,
          SUM(p.amount) as revenue
        FROM payments p
        JOIN appointments a ON a.id = p.appointment_id
        WHERE p.organization_id = $1
          AND p.created_at >= date_trunc('month', CURRENT_DATE)
        GROUP BY a.therapist_id
      )
      SELECT 
        s.*,
        COALESCE(r.revenue, 0) as monthly_revenue
      FROM professional_stats s
      LEFT JOIN professional_revenue r ON r.therapist_id = s.therapist_id
      ORDER BY monthly_revenue DESC`,
      [user.organizationId],
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
  const pool = createReplicaPool(c.env);

  try {
    const result = await pool.query(
      `SELECT * FROM patient_longitudinal_summary 
       WHERE patient_id = $1 AND organization_id = $2`,
      [patientId, user.organizationId],
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
  const pool = createReplicaPool(c.env);

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
      [user.organizationId],
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
  const pool = createReplicaPool(c.env);

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
      [user.organizationId],
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
  const pool = createReplicaPool(c.env);

  try {
    // 1. Coletar dados clínicos recentes (últimas 10 evoluções).
    // Modelo pós-migração: observacao + pain_scale + estruturados JSONB.
    const history = await pool.query(
      `SELECT s.date, s.observacao, s.pain_scale, s.procedures, s.exercises, s.measurements, s.home_exercises
       FROM sessions s
       WHERE s.patient_id = $1 AND s.organization_id = $2
       ORDER BY s.date DESC
       LIMIT 10`,
      [patientId, user.organizationId],
    );

    if (history.rows.length === 0) {
      return c.json({
        data: { mainStatus: "Sem histórico clínico suficiente para gerar snapshot." },
      });
    }

    const { runThinkingModel } = await import("../lib/ai-native");

    const prompt = `
      Você é um fisioterapeuta sênior em São Paulo. 
      Sua tarefa é ler estas últimas 10 evoluções clínicas de um paciente e gerar um snapshot executivo para o time clínico.
      
      EVOLUÇÕES:
      ${JSON.stringify(history.rows).substring(0, 15000)}

      FORMATO DE SAÍDA (Retorne APENAS JSON puro):
      {
        "mainStatus": "Resumo em 1 frase do estado atual e evolução",
        "keyWins": ["Ganho clínico 1", "Ganho clínico 2"],
        "remainingChallenges": ["Desafio 1", "Desafio 2"],
        "clinicalRisk": "low | medium | high"
      }
    `.trim();

    try {
      const result = await runThinkingModel(c.env, {
        prompt,
        model: WORKERS_AI_MODELS.llama_3_1_8b,
        temperature: 0.2,
        responseFormat: "json",
      });

      let data;
      try {
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        data = JSON.parse(jsonMatch?.[0] ?? result.content);
      } catch (parseError: any) {
        console.error(
          "[ClinicMetrics/AI] Failed to parse AI snapshot JSON:",
          parseError,
          result.content,
        );
        data = {
          mainStatus: "Erro ao processar resposta da IA.",
          keyWins: [],
          remainingChallenges: [],
          clinicalRisk: "medium",
          _raw: result.content.substring(0, 100),
        };
      }

      return c.json({ data });
    } catch (modelError: any) {
      console.error("[ClinicMetrics/AI] Model error:", modelError);
      return c.json({
        data: {
          mainStatus: "Análise IA temporariamente indisponível.",
          keyWins: [],
          remainingChallenges: [],
          clinicalRisk: "medium",
        },
      });
    }
  } catch (error: any) {
    console.error("[ClinicMetrics] Unexpected error:", error);
    return c.json({ error: "Erro inesperado", details: error.message }, 500);
  }
});

/**
 * GET /api/clinic-metrics/protocol-efficacy
 * Compara a eficácia dos protocolos clínicos (sessões médias até a melhora).
 */
app.get("/protocol-efficacy", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createReplicaPool(c.env);

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
      [user.organizationId],
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
  const pool = createReplicaPool(c.env);

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
      [user.organizationId],
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
  const pool = createReplicaPool(c.env);

  try {
    const result = await pool.query(
      `SELECT 
        ca.*,
        p.full_name as patient_name
       FROM clinical_alerts ca
       JOIN patients p ON p.id = ca.patient_id
       WHERE p.organization_id = $1 AND ca.status = 'pending'
       ORDER BY ca.created_at DESC`,
      [user.organizationId],
    );

    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Metrics] Clinical Alerts error:", error);
    return c.json({ error: "Failed to fetch clinical alerts" }, 500);
  }
});

/**
 * GET /api/clinic-metrics/at-risk-patients
 * Pacientes em risco de abandono (sem sessão há mais de 21 dias).
 * Usa tabelas: appointments, patients
 */
app.get("/at-risk-patients", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createReplicaPool(c.env);

  try {
    const result = await pool.query(
      `WITH last_activity AS (
        SELECT 
          patient_id,
          MAX(date) as last_session_date
        FROM appointments
        WHERE organization_id = $1 
          AND status IN ('confirmed', 'completed', 'realizado')
        GROUP BY patient_id
      )
      SELECT 
        p.id,
        p.full_name,
        p.phone,
        la.last_session_date,
        CURRENT_DATE - la.last_session_date::date as days_since_last_session,
        CASE 
          WHEN CURRENT_DATE - la.last_session_date::date > 45 THEN 0.9
          WHEN CURRENT_DATE - la.last_session_date::date > 30 THEN 0.7
          ELSE 0.5
        END as dropout_risk,
        CASE 
          WHEN CURRENT_DATE - la.last_session_date::date > 45 THEN 'Ligar para reengajamento'
          WHEN CURRENT_DATE - la.last_session_date::date > 30 THEN 'Enviar mensagem de acompanhamento'
          ELSE 'Monitorar'
        END as suggested_action
      FROM patients p
      JOIN last_activity la ON la.patient_id = p.id
      WHERE p.organization_id = $1
        AND p.is_active = true
        AND la.last_session_date < CURRENT_DATE - INTERVAL '21 days'
      ORDER BY days_since_last_session DESC`,
      [user.organizationId],
    );

    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Metrics] At-Risk Patients error:", error);
    return c.json({ error: "Failed to fetch at-risk patients" }, 500);
  }
});

/**
 * GET /api/clinic-metrics/revenue-forecast
 * Previsão de receita baseada em pagamentos confirmados.
 * Schema real: payments.amount (numeric), payments.paid_at (date), payments.status
 */
app.get("/revenue-forecast", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createReplicaPool(c.env);

  try {
    // Pagamentos dos próximos 30 dias (baseado em paid_at)
    const confirmedRes = await pool.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as confirmed_revenue,
        COUNT(*) as confirmed_payments
      FROM payments
      WHERE organization_id = $1
        AND status = 'completed'
        AND paid_at >= CURRENT_DATE
        AND paid_at <= CURRENT_DATE + INTERVAL '30 days'
        AND deleted_at IS NULL`,
      [user.organizationId],
    );

    // Pagamentos dos últimos 30 dias para comparação
    const historicalRes = await pool.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as historical_revenue,
        COUNT(*) as historical_payments
      FROM payments
      WHERE organization_id = $1
        AND status = 'completed'
        AND paid_at >= CURRENT_DATE - INTERVAL '30 days'
        AND paid_at < CURRENT_DATE
        AND deleted_at IS NULL`,
      [user.organizationId],
    );

    const confirmedRevenue = Number(confirmedRes.rows[0]?.confirmed_revenue || 0);
    const historicalRevenue = Number(historicalRes.rows[0]?.historical_revenue || 0);

    return c.json({
      data: {
        forecast: {
          next_30_days: {
            confirmed_revenue: confirmedRevenue,
            confirmed_payments: Number(confirmedRes.rows[0]?.confirmed_payments || 0),
          },
          previous_30_days: {
            revenue: historicalRevenue,
            payments: Number(historicalRes.rows[0]?.historical_payments || 0),
          },
          trend:
            historicalRevenue > 0
              ? (((confirmedRevenue - historicalRevenue) / historicalRevenue) * 100).toFixed(1)
              : "0",
        },
      },
    });
  } catch (error) {
    console.error("[Metrics] Revenue Forecast error:", error);
    return c.json({ error: "Failed to calculate revenue forecast" }, 500);
  }
});

/**
 * GET /api/clinic-metrics/overdue-payments
 * Recebíveis vencidos por paciente.
 * Usa contas_financeiras como fonte de verdade para inadimplência.
 */
app.get("/overdue-payments", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createReplicaPool(c.env);

  try {
    const result = await pool.query<OverduePatientAggregateRow>(
      `SELECT 
        p.id::text as patient_id,
        p.full_name,
        p.phone,
        COALESCE(p.phone_secondary, p.phone) as whatsapp,
        COUNT(cf.id)::int as overdue_count,
        COALESCE(SUM(cf.valor), 0) as overdue_total,
        MIN(COALESCE(cf.data_vencimento, cf.created_at::date))::text as oldest_overdue_date
      FROM contas_financeiras cf
      JOIN patients p
        ON p.id = cf.patient_id
       AND p.organization_id = cf.organization_id
      WHERE cf.organization_id = $1
        AND cf.deleted_at IS NULL
        AND cf.tipo IN ('receber', 'receita')
        AND cf.status IN ('pendente', 'atrasado')
        AND COALESCE(cf.data_vencimento, cf.created_at::date) < CURRENT_DATE
        AND cf.patient_id IS NOT NULL
      GROUP BY p.id, p.full_name, p.phone, p.phone_secondary
      ORDER BY overdue_total DESC, oldest_overdue_date ASC`,
      [user.organizationId],
    );

    const summaryRes = await pool.query<OverdueSummaryAggregateRow>(
      `SELECT 
        COUNT(DISTINCT cf.patient_id)::int as total_patients,
        COALESCE(SUM(cf.valor), 0) as total_overdue
      FROM contas_financeiras cf
      WHERE cf.organization_id = $1
        AND cf.deleted_at IS NULL
        AND cf.tipo IN ('receber', 'receita')
        AND cf.status IN ('pendente', 'atrasado')
        AND COALESCE(cf.data_vencimento, cf.created_at::date) < CURRENT_DATE
        AND cf.patient_id IS NOT NULL`,
      [user.organizationId],
    );

    return c.json({
      data: {
        patients: result.rows.map(mapOverduePatientRow),
        summary: mapOverdueSummaryRow(summaryRes.rows[0]),
      },
    });
  } catch (error) {
    console.error("[Metrics] Overdue Payments error:", error);
    return c.json({ error: "Failed to fetch overdue payments" }, 500);
  }
});

/**
 * GET /api/clinic-metrics/packages-expiring
 * Pacotes de sessões com saldo baixo ou próximos da expiração.
 * Schema real: patient_packages (name, total_sessions, remaining_sessions, expires_at, status, deleted_at)
 */
app.get("/packages-expiring", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createReplicaPool(c.env);

  try {
    const result = await pool.query(
      `SELECT 
        pkg.id,
        pkg.patient_id,
        p.full_name as patient_name,
        p.phone,
        pkg.name as package_name,
        pkg.total_sessions,
        pkg.remaining_sessions,
        pkg.expires_at,
        CASE 
          WHEN pkg.expires_at IS NOT NULL 
          THEN (pkg.expires_at::date - CURRENT_DATE)
          ELSE NULL
        END as days_until_expiry,
        CASE 
          WHEN pkg.remaining_sessions = 0 THEN 'zero'
          WHEN pkg.remaining_sessions <= 2 THEN 'low'
          WHEN pkg.expires_at IS NOT NULL AND pkg.expires_at::date <= CURRENT_DATE + INTERVAL '14 days' THEN 'expiring_soon'
          ELSE 'ok'
        END as alert_type
      FROM patient_packages pkg
      JOIN patients p ON p.id = pkg.patient_id
      WHERE pkg.organization_id = $1
        AND pkg.deleted_at IS NULL
        AND pkg.status = 'active'
        AND (
          pkg.remaining_sessions <= 2
          OR (pkg.expires_at IS NOT NULL AND pkg.expires_at::date <= CURRENT_DATE + INTERVAL '14 days')
        )
      ORDER BY 
        CASE 
          WHEN pkg.remaining_sessions = 0 THEN 0
          WHEN pkg.remaining_sessions <= 2 THEN 1
          ELSE 2
        END,
        pkg.expires_at ASC NULLS LAST`,
      [user.organizationId],
    );

    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Metrics] Packages Expiring error:", error);
    return c.json({ error: "Failed to fetch expiring packages" }, 500);
  }
});

export { app as clinicMetricsRoutes };
