import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';
import { registerPatientAnalyticsRoutes } from './analytics/patient';
import { registerMlAnalyticsRoutes } from './analytics/ml';
import { hasTable, parseDate } from './analytics/shared';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

type PaymentTrendRow = {
  day: string | Date | null;
  sum: number | string | null;
};

type FinancialPaymentRow = {
  valor: number | string | null;
  forma_pagamento: string | null;
  status: string | null;
};

type PainRegionRow = {
  name: string | null;
  value: number | string | null;
};

app.get('/dashboard', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const period = c.req.query('period') || 'month';
  const endDate = parseDate(c.req.query('endDate')) ?? new Date().toISOString().split('T')[0];
  const startDate = parseDate(c.req.query('startDate')) ?? (() => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return now.toISOString().split('T')[0];
  })();

  const [activePatientsRes, paymentsRes, appointmentsRes, todayRes, sessionStatsRes] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM patients
       WHERE organization_id = $1 AND is_active = true`,
      [user.organizationId],
    ),
    { rows: [] as PaymentTrendRow[] },
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'completed')::int AS total_completed,
         COUNT(*) FILTER (WHERE status IN ('scheduled','confirmed'))::int AS upcoming,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'no_show')::int AS no_show,
         COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed
       FROM appointments
       WHERE organization_id = $1
         AND start_time BETWEEN $2::timestamp AND $3::timestamp`,
      [user.organizationId, `${startDate}T00:00:00`, `${endDate}T23:59:59`],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM appointments
       WHERE organization_id = $1
         AND start_time BETWEEN $2::timestamp AND $3::timestamp`,
      [user.organizationId, `${endDate}T00:00:00`, `${endDate}T23:59:59`],
    ),
    pool.query(
      `SELECT
         COUNT(*)::int AS total_sessions,
         AVG(duration_minutes)::numeric AS avg_session_duration
       FROM sessions
       WHERE organization_id = $1
         AND started_at BETWEEN $2::timestamp AND $3::timestamp`,
      [user.organizationId, `${startDate}T00:00:00`, `${endDate}T23:59:59`],
    ),
  ]);

  const activePatients = Number(activePatientsRes.rows[0]?.total ?? 0);
  const payments = paymentsRes.rows.map((row) => ({
    date:
      row.day instanceof Date
        ? row.day.toISOString().split('T')[0]
        : row.day
          ? new Date(row.day).toISOString().split('T')[0]
          : startDate,
    amount: Number(row.sum ?? 0),
  }));
  const revenueChart = [];
  const dayMap = new Map<string, number>();
  for (const row of payments) {
    dayMap.set(row.date, (dayMap.get(row.date) ?? 0) + row.amount);
  }
  const dayIterator = new Date(startDate);
  while (dayIterator <= new Date(endDate)) {
    const iso = dayIterator.toISOString().split('T')[0];
    revenueChart.push({ date: iso, revenue: dayMap.get(iso) ?? 0 });
    dayIterator.setDate(dayIterator.getDate() + 1);
  }

  const appts = appointmentsRes.rows[0] ?? {};
  const totalAppointments = Number(appts.total ?? 0);
  const completedAppointments = Number(appts.total_completed ?? 0);
  const noShowAppointments = Number(appts.no_show ?? 0);
  const confirmedAppointments = Number(appts.confirmed ?? 0);
  const occupancyRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;
  const absenceRate = totalAppointments > 0 ? (noShowAppointments / totalAppointments) * 100 : 0;
  const confirmationRate = totalAppointments > 0 ? (confirmedAppointments / totalAppointments) * 100 : 0;
  const avgSessionDuration = Number(sessionStatsRes.rows[0]?.avg_session_duration ?? 0);
  const engagementScore = Math.max(
    0,
    Math.min(
      100,
      Math.round((((100 - absenceRate) * 0.6) + (confirmationRate * 0.4)) * 10) / 10,
    ),
  );

  let topPainRegions: Array<{ name: string; value: number }> = [];
  try {
    const painRegionsRes = { rows: [] as PainRegionRow[] };
    topPainRegions = painRegionsRes.rows.map((row) => ({
      name: String(row.name),
      value: Number(row.value ?? 0),
    }));
  } catch (error) {
    console.warn('[analytics] topPainRegions fallback:', error);
  }

  const dashboard: Record<string, unknown> = {
    totalPatients: activePatients,
    activePatients,
    monthlyRevenue: Number(
      payments.reduce((sum, item) => sum + item.amount, 0).toFixed(2),
    ),
    totalAppointments,
    completedAppointments,
    occupancyRate: Number((Math.round(occupancyRate * 10) / 10).toFixed(1)),
    noShowRate: Number((Math.round(absenceRate * 10) / 10).toFixed(1)),
    confirmationRate: Number((Math.round(confirmationRate * 10) / 10).toFixed(1)),
    avgSessionDuration: Number((Math.round(avgSessionDuration * 10) / 10).toFixed(1)),
    engagementScore,
    topPainRegions,
    npsScore: 0,
    appointmentsToday: Number(todayRes.rows[0]?.count ?? 0),
    revenueChart,
  };

  return c.json({ data: dashboard });
});

app.get('/financial', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const startDate = parseDate(c.req.query('startDate')) ?? new Date().toISOString().split('T')[0];
  const endDate = parseDate(c.req.query('endDate')) ?? startDate;

  const paymentsRes = { rows: [] as FinancialPaymentRow[] };

  const sessionsRes = await pool.query(
    `SELECT therapist_id, status, started_at
     FROM sessions
     WHERE organization_id = $1
       AND started_at BETWEEN $2::timestamp AND $3::timestamp`,
    [user.organizationId, `${startDate}T00:00:00`, `${endDate}T23:59:59`],
  );

  const payments = paymentsRes.rows;
  const sessions = sessionsRes.rows;
  const totalRevenue = payments.reduce((sum, row) => sum + Number(row.valor ?? 0), 0);
  const revenueByMethod: Record<string, number> = {};
  payments.forEach((row) => {
    const method = (row.forma_pagamento as string | undefined) || 'outros';
    revenueByMethod[method] = (revenueByMethod[method] || 0) + Number(row.valor ?? 0);
  });

  const therapistMap: Record<string, { name: string; sessions: number; revenue: number }> = {};
  sessions.forEach((row) => {
    const id = row.therapist_id ?? 'unassigned';
    therapistMap[id] = therapistMap[id] ?? { name: String(row.therapist_id ?? 'Não atribuído'), sessions: 0, revenue: 0 };
    therapistMap[id].sessions += 1;
  });
  const avgPerSession = sessions.length ? totalRevenue / sessions.length : 0;
  Object.values(therapistMap).forEach((bucket) => {
    bucket.revenue = Number((bucket.sessions * avgPerSession).toFixed(2));
  });

  const revenueByTherapist = Object.entries(therapistMap)
    .map(([therapistId, data]) => ({
      therapistId,
      therapistName: data.name,
      revenue: data.revenue,
      sessions: data.sessions,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const pending = payments
    .filter((row) => row.status === 'pending')
    .reduce((sum, row) => sum + Number(row.valor ?? 0), 0);

  const delinquencyRate = totalRevenue + pending > 0 ? (pending / (totalRevenue + pending)) * 100 : 0;

  return c.json({
    data: {
      totalRevenue,
      totalExpenses: 0,
      netIncome: totalRevenue,
      revenueByMethod,
      revenueByTherapist,
      delinquencyRate: Number((Math.round(delinquencyRate * 10) / 10).toFixed(1)),
    },
  });
});

app.get('/top-exercises', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const limitValue = Math.min(Number(c.req.query('limit') ?? 5) || 5, 20);

  if (!(await hasTable(pool, 'prescribed_exercises'))) {
    return c.json({ data: [] });
  }

  const result = await pool.query(
    `
      SELECT COALESCE(e.name, 'Exercicio sem nome') AS name, COUNT(*)::int AS count
      FROM prescribed_exercises pe
      LEFT JOIN exercises e ON e.id = pe.exercise_id
      WHERE pe.organization_id = $1 AND pe.is_active = true
      GROUP BY 1
      ORDER BY count DESC, name ASC
      LIMIT $2
    `,
    [user.organizationId, limitValue],
  );

  return c.json({
    data: result.rows.map((row) => ({
      name: String(row.name),
      count: Number(row.count ?? 0),
    })),
  });
});

app.get('/pain-map', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const limitValue = Math.min(Number(c.req.query('limit') ?? 5) || 5, 20);

  try {
    const result = await pool.query(
      `
        SELECT COALESCE(NULLIF(TRIM(pmp.region), ''), 'Nao informado') AS name,
               COUNT(*)::int AS value
        FROM pain_map_points pmp
        INNER JOIN pain_maps pm ON pm.id = pmp.pain_map_id
        WHERE pm.organization_id = $1
        GROUP BY 1
        ORDER BY value DESC, name ASC
        LIMIT $2
      `,
      [user.organizationId, limitValue],
    );

    return c.json({
      data: result.rows.map((row) => ({
        name: String(row.name),
        value: Number(row.value ?? 0),
      })),
    });
  } catch (error) {
    console.warn('[analytics] pain-map fallback:', error);
    return c.json({ data: [] });
  }
});

registerPatientAnalyticsRoutes(app);
registerMlAnalyticsRoutes(app);

app.get('/retention/risk', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);

  try {
    // Identify patients at risk: 
    // 1. No appointments in the last 15 days
    // 2. More than 2 missed sessions in the last month
    // 3. Zero home exercise compliance
    const result = await pool.query(
      `
      WITH patient_stats AS (
        SELECT 
          p.id,
          p.full_name,
          p.phone,
          MAX(a.date) as last_appointment,
          COUNT(*) FILTER (WHERE a.status = 'no_show' AND a.date > NOW() - INTERVAL '30 days') as missed_count,
          (SELECT COUNT(*) FROM patient_exercise_logs pel WHERE pel.patient_id = p.id AND pel.created_at > NOW() - INTERVAL '7 days') as recent_exercises
        FROM patients p
        LEFT JOIN appointments a ON a.patient_id = p.id
        WHERE p.organization_id = $1 AND p.is_active = true
        GROUP BY p.id, p.full_name, p.phone
      )
      SELECT * FROM patient_stats
      WHERE last_appointment < NOW() - INTERVAL '15 days'
         OR missed_count >= 2
         OR (last_appointment IS NOT NULL AND recent_exercises = 0)
      ORDER BY last_appointment ASC NULLS LAST
      LIMIT 10
      `,
      [user.organizationId]
    );

    return c.json({ data: result.rows });
  } catch (error) {
    console.error('[Analytics/Retention] Error:', error);
    return c.json({ error: 'Erro ao calcular risco de retenção' }, 500);
  }
});

app.get('/efficacy/pain-evolution', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const patientId = c.req.query('patientId');

  try {
    const query = patientId 
      ? `SELECT session_date as date, pain_level_before as value 
         FROM patient_session_metrics 
         WHERE patient_id = $2 AND organization_id = $1 
         ORDER BY session_date ASC LIMIT 20`
      : `SELECT session_date as date, AVG(pain_level_before)::numeric(10,2) as value 
         FROM patient_session_metrics 
         WHERE organization_id = $1 
         GROUP BY 1 ORDER BY 1 ASC LIMIT 30`;
    
    const params = patientId ? [user.organizationId, patientId] : [user.organizationId];
    const result = await pool.query(query, params);

    return c.json({ data: result.rows });
  } catch (error) {
    console.error('[Analytics/Efficacy] Error:', error);
    return c.json({ error: 'Erro ao carregar evolução de dor' }, 500);
  }
});

app.get('/weekly-activity', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // End of week (Saturday)

  const [apptsRes, exercisesRes] = await Promise.all([
    pool.query(
      `SELECT extract(dow from date) as day_index, count(*)::int as count
       FROM appointments
       WHERE organization_id = $1 AND date BETWEEN $2::date AND $3::date
       GROUP BY 1`,
      [user.organizationId, start.toISOString().split('T')[0], end.toISOString().split('T')[0]]
    ),
    pool.query(
      `SELECT extract(dow from created_at) as day_index, count(*)::int as count
       FROM prescribed_exercises
       WHERE organization_id = $1 AND created_at BETWEEN $2::timestamp AND $3::timestamp
       GROUP BY 1`,
      [user.organizationId, start.toISOString().split('T')[0] + 'T00:00:00', end.toISOString().split('T')[0] + 'T23:59:59']
    )
  ]);

  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const activity = days.map((day, index) => {
    const appt = apptsRes.rows.find(r => Number(r.day_index) === index);
    const ex = exercisesRes.rows.find(r => Number(r.day_index) === index);
    return {
      day,
      consultas: appt ? Number(appt.count) : 0,
      exercicios: ex ? Number(ex.count) : 0
    };
  });

  return c.json({ data: activity });
});

export { app as analyticsRoutes };
