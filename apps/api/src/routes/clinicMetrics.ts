import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createPool } from "../lib/db";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// GET /api/clinic-metrics/kpis?month=2026-05
app.get("/kpis", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  const rawMonth = c.req.query("month");
  const month = rawMonth && /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : null;

  // Default to current month
  const now = new Date();
  const year = month ? month.split("-")[0] : String(now.getFullYear());
  const mon = month ? month.split("-")[1] : String(now.getMonth() + 1).padStart(2, "0");
  const periodStart = `${year}-${mon}-01`;
  const periodEnd = new Date(Number(year), Number(mon), 0).toISOString().split("T")[0];

  const [apptStats, ticketStats, patientStats, ltmStats] = await Promise.all([
    // Appointment breakdown for the month
    pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status::text IN ('atendido','avaliacao'))::int AS completed,
         COUNT(*) FILTER (WHERE status::text IN (
           'faltou','faltou_com_aviso','faltou_sem_aviso',
           'nao_atendido','nao_atendido_sem_cobranca'
         ))::int AS no_show,
         COUNT(*) FILTER (WHERE status::text IN ('cancelado','cancelado_paciente','cancelado_clinica'))::int AS cancelled,
         COUNT(*) FILTER (WHERE status::text IN ('agendado','presenca_confirmada'))::int AS upcoming
       FROM appointments
       WHERE organization_id = $1
         AND date >= $2::date AND date <= $3::date
         AND deleted_at IS NULL`,
      [user.organizationId, periodStart, periodEnd],
    ),

    // Average ticket from completed appointments with payment
    pool.query(
      `SELECT
         COALESCE(AVG(payment_amount) FILTER (WHERE payment_amount > 0), 0)::numeric AS avg_ticket,
         COALESCE(SUM(payment_amount) FILTER (WHERE payment_amount > 0), 0)::numeric AS total_revenue,
         COUNT(*) FILTER (WHERE payment_amount > 0)::int AS paid_count
       FROM appointments
       WHERE organization_id = $1
         AND date >= $2::date AND date <= $3::date
         AND status::text IN ('atendido','avaliacao')
         AND deleted_at IS NULL`,
      [user.organizationId, periodStart, periodEnd],
    ),

    // Active patients (with at least 1 appointment in the last 60 days)
    pool.query(
      `SELECT
         COUNT(DISTINCT patient_id)::int AS active_patients,
         COUNT(DISTINCT patient_id) FILTER (
           WHERE date < (NOW() - INTERVAL '30 days')::date
         )::int AS at_risk_patients
       FROM appointments
       WHERE organization_id = $1
         AND date >= (NOW() - INTERVAL '60 days')::date
         AND status::text IN ('atendido','avaliacao')
         AND deleted_at IS NULL`,
      [user.organizationId],
    ),

    // Last 6 months for LTV estimation
    pool.query(
      `SELECT
         COUNT(*)::int AS total_completed_6m,
         COUNT(DISTINCT patient_id)::int AS unique_patients_6m,
         COALESCE(AVG(payment_amount) FILTER (WHERE payment_amount > 0), 0)::numeric AS avg_ticket_6m
       FROM appointments
       WHERE organization_id = $1
         AND date >= (NOW() - INTERVAL '6 months')::date
         AND status::text IN ('atendido','avaliacao')
         AND deleted_at IS NULL`,
      [user.organizationId],
    ),
  ]);

  const appt = apptStats.rows[0] ?? {};
  const ticket = ticketStats.rows[0] ?? {};
  const patients = patientStats.rows[0] ?? {};
  const ltm = ltmStats.rows[0] ?? {};

  const total = Number(appt.total ?? 0);
  const completed = Number(appt.completed ?? 0);
  const noShow = Number(appt.no_show ?? 0);
  const cancelled = Number(appt.cancelled ?? 0);
  const avgTicket = Number(ticket.avg_ticket ?? 0);
  const totalRevenue = Number(ticket.total_revenue ?? 0);
  const activePatients = Number(patients.active_patients ?? 0);

  // Occupancy = completed / (completed + no_show + cancelled) — excludes upcoming
  const attended = completed + noShow + cancelled;
  const occupancyRate = attended > 0 ? Math.round((completed / attended) * 100 * 10) / 10 : 0;

  // No-show rate
  const noShowRate = attended > 0 ? Math.round((noShow / attended) * 100 * 10) / 10 : 0;

  // Cancellation rate
  const cancellationRate = attended > 0 ? Math.round((cancelled / attended) * 100 * 10) / 10 : 0;

  // LTV estimate: avg sessions per patient in 6m × 2 (2 treatment cycles/year) × avg ticket
  const total6m = Number(ltm.total_completed_6m ?? 0);
  const patients6m = Number(ltm.unique_patients_6m ?? 1);
  const avgTicket6m = Number(ltm.avg_ticket_6m ?? 0);
  const avgSessionsPerPatient6m = patients6m > 0 ? total6m / patients6m : 0;
  // Annualized: ×2 for 12 months
  const ltv = Math.round(avgSessionsPerPatient6m * 2 * avgTicket6m * 100) / 100;

  return c.json({
    data: {
      period: { start: periodStart, end: periodEnd },
      appointments: {
        total,
        completed,
        no_show: noShow,
        cancelled,
        upcoming: Number(appt.upcoming ?? 0),
      },
      occupancy_rate: occupancyRate,
      no_show_rate: noShowRate,
      cancellation_rate: cancellationRate,
      avg_ticket: Math.round(avgTicket * 100) / 100,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      active_patients: activePatients,
      at_risk_patients: Number(patients.at_risk_patients ?? 0),
      ltv_estimate: ltv,
      avg_sessions_per_patient_6m: Math.round(avgSessionsPerPatient6m * 10) / 10,
    },
  });
});

// GET /api/clinic-metrics/overdue-payments
app.get("/overdue-payments", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  const result = await pool.query(
    `SELECT
       p.id AS patient_id,
       p.full_name,
       p.phone,
       p.whatsapp,
       COUNT(a.id)::int AS overdue_count,
       COALESCE(SUM(a.payment_amount), 0)::numeric AS overdue_total,
       MIN(a.date)::text AS oldest_overdue_date
     FROM appointments a
     INNER JOIN patients p ON p.id = a.patient_id
     WHERE a.organization_id = $1
       AND a.status::text IN ('atendido','avaliacao')
       AND a.payment_status::text = 'pending'
       AND a.payment_amount > 0
       AND a.date < CURRENT_DATE
       AND a.deleted_at IS NULL
       AND p.deleted_at IS NULL
     GROUP BY p.id, p.full_name, p.phone, p.whatsapp
     ORDER BY overdue_total DESC
     LIMIT 20`,
    [user.organizationId],
  );

  const totalResult = await pool.query(
    `SELECT
       COUNT(*)::int AS total_appointments,
       COALESCE(SUM(payment_amount), 0)::numeric AS total_overdue
     FROM appointments
     WHERE organization_id = $1
       AND status::text IN ('atendido','avaliacao')
       AND payment_status::text = 'pending'
       AND payment_amount > 0
       AND date < CURRENT_DATE
       AND deleted_at IS NULL`,
    [user.organizationId],
  );

  return c.json({
    data: {
      patients: result.rows,
      summary: totalResult.rows[0] ?? { total_appointments: 0, total_overdue: 0 },
    },
  });
});

// GET /api/clinic-metrics/at-risk-patients
app.get("/at-risk-patients", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  const result = await pool.query(
    `SELECT
       p.id,
       p.full_name,
       p.phone,
       p.whatsapp,
       MAX(a.date)::text AS last_appointment_date,
       (CURRENT_DATE - MAX(a.date)::date)::int AS days_since_last_session
     FROM patients p
     INNER JOIN appointments a ON a.patient_id = p.id
     WHERE p.organization_id = $1
       AND a.organization_id = $1
       AND a.status::text IN ('atendido','avaliacao')
       AND a.deleted_at IS NULL
       AND p.deleted_at IS NULL
     GROUP BY p.id, p.full_name, p.phone, p.whatsapp
     HAVING MAX(a.date) < (CURRENT_DATE - INTERVAL '14 days')
       AND MAX(a.date) >= (CURRENT_DATE - INTERVAL '90 days')
     ORDER BY MAX(a.date) ASC
     LIMIT 20`,
    [user.organizationId],
  );

  return c.json({ data: result.rows });
});

// GET /api/clinic-metrics/packages-expiring
app.get("/packages-expiring", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  const result = await pool.query(
    `SELECT
       pp.id,
       pp.patient_id,
       p.full_name AS patient_name,
       p.phone,
       p.whatsapp,
       pp.name AS package_name,
       pp.remaining_sessions,
       pp.total_sessions,
       pp.expires_at::text AS expires_at,
       (pp.expires_at::date - CURRENT_DATE)::int AS days_until_expiry,
       CASE
         WHEN pp.remaining_sessions <= 0 THEN 'zero'
         WHEN pp.remaining_sessions <= 2 THEN 'low'
         WHEN pp.expires_at::date <= CURRENT_DATE + 7 THEN 'expiring_soon'
         ELSE 'ok'
       END AS alert_type
     FROM patient_packages pp
     INNER JOIN patients p ON p.id = pp.patient_id
     WHERE pp.organization_id = $1
       AND pp.status::text = 'active'
       AND pp.deleted_at IS NULL
       AND p.deleted_at IS NULL
       AND (
         pp.remaining_sessions <= 2
         OR pp.expires_at::date <= CURRENT_DATE + 7
       )
     ORDER BY pp.remaining_sessions ASC, pp.expires_at ASC
     LIMIT 20`,
    [user.organizationId],
  );

  return c.json({ data: result.rows });
});

// GET /api/clinic-metrics/revenue-forecast
app.get("/revenue-forecast", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  // Upcoming scheduled appointments this month × avg ticket (last 30 days)
  const [upcoming, avgTicket] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)::int AS upcoming_count,
         TO_CHAR(date, 'YYYY-MM-DD') AS day,
         COUNT(*)::int AS count_by_day
       FROM appointments
       WHERE organization_id = $1
         AND date >= CURRENT_DATE
         AND date <= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'
         AND status::text IN ('agendado', 'presenca_confirmada', 'scheduled', 'confirmed')
         AND deleted_at IS NULL
       GROUP BY date
       ORDER BY date ASC`,
      [user.organizationId],
    ),
    pool.query(
      `SELECT
         COALESCE(AVG(payment_amount) FILTER (WHERE payment_amount > 0), 0)::numeric AS avg_ticket,
         COALESCE(SUM(payment_amount) FILTER (WHERE payment_amount > 0), 0)::numeric AS realized_revenue
       FROM appointments
       WHERE organization_id = $1
         AND date >= DATE_TRUNC('month', CURRENT_DATE)
         AND date < CURRENT_DATE
         AND status::text IN ('atendido', 'avaliacao')
         AND deleted_at IS NULL`,
      [user.organizationId],
    ),
  ]);

  const upcomingCount = upcoming.rows.reduce((s: number, r: any) => s + Number(r.count_by_day), 0);
  const avgT = Number(avgTicket.rows[0]?.avg_ticket ?? 0);
  const realized = Number(avgTicket.rows[0]?.realized_revenue ?? 0);
  const forecast = Math.round(avgT * upcomingCount * 100) / 100;
  const total = Math.round((realized + forecast) * 100) / 100;

  return c.json({
    data: {
      upcoming_appointments: upcomingCount,
      avg_ticket: Math.round(avgT * 100) / 100,
      realized_revenue_mtd: realized,
      forecast_remaining: forecast,
      total_month_estimate: total,
      by_day: upcoming.rows,
    },
  });
});

export { app as clinicMetricsRoutes };
