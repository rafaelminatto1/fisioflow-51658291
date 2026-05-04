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

export { app as clinicMetricsRoutes };
