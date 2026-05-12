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
        capacity: Number(occupancyRes.rows[0].estimated_capacity_monthly || 1), // Evitar divisão por zero
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

export { app as clinicMetricsRoutes };
