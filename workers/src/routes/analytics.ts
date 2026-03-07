import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';
import { determineOutcomeCategory, getAgeGroup, hashPatientId, roundTo } from './mlHelpers';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const hasTable = async (pool: ReturnType<typeof createPool>, tableName: string) => {
  const result = await pool.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS exists
    `,
    [tableName],
  );
  return Boolean(result.rows[0]?.exists);
};

const parseDate = (input: string | undefined): string | null => {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
};

app.get('/dashboard', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
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
    pool.query(
      `SELECT date_trunc('day', paid_at)::date AS day, SUM(valor)::numeric
       FROM payments
       WHERE organization_id = $1 AND status IN ('paid', 'completed')
         AND paid_at BETWEEN $2::date AND $3::date
       GROUP BY 1
       ORDER BY 1 ASC`,
      [user.organizationId, startDate, endDate],
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('confirmed','completed','atendido','realizado'))::int AS total_completed,
         COUNT(*) FILTER (WHERE status IN ('scheduled','confirmed'))::int AS upcoming,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status IN ('no_show','faltou'))::int AS no_show,
         COUNT(*) FILTER (WHERE status IN ('confirmed','atendido'))::int AS confirmed
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
    date: (row.day as Date).toISOString().split('T')[0],
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
    const painRegionsRes = await pool.query(
      `
        SELECT COALESCE(NULLIF(TRIM(pmp.region), ''), 'Nao informado') AS name,
               COUNT(*)::int AS value
        FROM pain_map_points pmp
        INNER JOIN pain_maps pm ON pm.id = pmp.pain_map_id
        WHERE pm.organization_id = $1
        GROUP BY 1
        ORDER BY value DESC
        LIMIT 5
      `,
      [user.organizationId],
    );
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
  const pool = createPool(c.env);
  const startDate = parseDate(c.req.query('startDate')) ?? new Date().toISOString().split('T')[0];
  const endDate = parseDate(c.req.query('endDate')) ?? startDate;

  const paymentsRes = await pool.query(
    `SELECT status, valor, forma_pagamento, created_at
     FROM payments
     WHERE organization_id = $1
       AND created_at BETWEEN $2::timestamp AND $3::timestamp`,
    [user.organizationId, `${startDate}T00:00:00`, `${endDate}T23:59:59`],
  );

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
  const pool = createPool(c.env);
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
  const pool = createPool(c.env);
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

app.get('/intelligent-reports/:patientId', requireAuth, async (c) => {
  const { patientId } = c.req.param();
  const user = c.get('user');
  const pool = createPool(c.env);

  const reports = await pool.query(
    `
      SELECT id, patient_id, report_type, report_content, date_range_start, date_range_end, created_at
      FROM generated_reports
      WHERE organization_id = $1 AND patient_id = $2
      ORDER BY created_at DESC
      LIMIT 10
    `,
    [user.organizationId, patientId],
  ).catch(() => ({ rows: [] as Array<Record<string, unknown>> }));

  return c.json({ data: reports.rows });
});

app.post('/intelligent-reports', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as {
    patientId?: string;
    reportType?: string;
    dateRange?: { start?: string; end?: string };
  };

  if (!body.patientId) {
    return c.json({ error: 'patientId e obrigatorio' }, 400);
  }

  const startDate = parseDate(body.dateRange?.start) ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = parseDate(body.dateRange?.end) ?? new Date().toISOString().split('T')[0];
  const reportType = body.reportType ?? 'evolution';

  const [patientRes, metricsRes, outcomesRes, goalsRes] = await Promise.all([
    pool.query(
      `
        SELECT id, full_name, email, phone, main_condition
        FROM patients
        WHERE organization_id = $1 AND id = $2
        LIMIT 1
      `,
      [user.organizationId, body.patientId],
    ),
    pool.query(
      `
        SELECT session_date, pain_level_before, pain_level_after, functional_improvement, pain_reduction, notes
        FROM patient_session_metrics
        WHERE organization_id = $1 AND patient_id = $2
          AND session_date BETWEEN $3::timestamp AND $4::timestamp
        ORDER BY session_date ASC
      `,
      [user.organizationId, body.patientId, `${startDate}T00:00:00`, `${endDate}T23:59:59`],
    ),
    pool.query(
      `
        SELECT measure_name, measure_type, score, normalized_score, measurement_date
        FROM patient_outcome_measures
        WHERE organization_id = $1 AND patient_id = $2
          AND measurement_date BETWEEN $3::date AND $4::date
        ORDER BY measurement_date DESC
        LIMIT 20
      `,
      [user.organizationId, body.patientId, startDate, endDate],
    ),
    pool.query(
      `
        SELECT goal_title, status, progress_percentage, target_date
        FROM patient_goal_tracking
        WHERE organization_id = $1 AND patient_id = $2
        ORDER BY target_date ASC NULLS LAST, created_at DESC
        LIMIT 20
      `,
      [user.organizationId, body.patientId],
    ),
  ]);

  const patient = patientRes.rows[0];
  if (!patient) {
    return c.json({ error: 'Paciente nao encontrado' }, 404);
  }

  const metrics = metricsRes.rows;
  const outcomes = outcomesRes.rows;
  const goals = goalsRes.rows;

  const firstMetric = metrics[0];
  const lastMetric = metrics[metrics.length - 1];
  const averagePainReduction =
    metrics.length > 0
      ? roundTo(metrics.reduce((sum, row) => sum + Number(row.pain_reduction ?? 0), 0) / metrics.length, 1)
      : 0;
  const averageFunctionalImprovement =
    metrics.length > 0
      ? roundTo(metrics.reduce((sum, row) => sum + Number(row.functional_improvement ?? 0), 0) / metrics.length, 1)
      : 0;

  const reportLines = [
    `# Relatorio Inteligente - ${patient.full_name ?? 'Paciente'}`,
    '',
    `**Tipo:** ${reportType}`,
    `**Periodo:** ${startDate} ate ${endDate}`,
    `**Condicao principal:** ${patient.main_condition ?? 'Nao informada'}`,
    '',
    '## Resumo clinico',
    `- Total de sessoes analisadas: ${metrics.length}`,
    `- Dor inicial registrada: ${firstMetric?.pain_level_before ?? 'n/d'}`,
    `- Dor final registrada: ${lastMetric?.pain_level_after ?? 'n/d'}`,
    `- Reducao media da dor: ${averagePainReduction}%`,
    `- Melhora funcional media: ${averageFunctionalImprovement}%`,
    '',
    '## Desfechos recentes',
    ...(outcomes.length > 0
      ? outcomes.slice(0, 5).map((row) =>
          `- ${row.measure_name}: ${row.normalized_score ?? row.score} (${String(row.measurement_date).slice(0, 10)})`,
        )
      : ['- Nenhuma medida de desfecho encontrada no periodo.']),
    '',
    '## Objetivos do tratamento',
    ...(goals.length > 0
      ? goals.slice(0, 5).map((row) =>
          `- ${row.goal_title}: status ${row.status}, progresso ${Number(row.progress_percentage ?? 0)}%`,
        )
      : ['- Nenhum objetivo registrado.']),
    '',
    '## Recomendacoes',
    ...(averagePainReduction < 15
      ? ['- Reavaliar adesao ao tratamento e frequencia das sessoes.']
      : ['- Manter o plano atual, com foco em progressao funcional gradual.']),
    ...(averageFunctionalImprovement < 10
      ? ['- Considerar ajuste de exercicios domiciliares e metas semanais.']
      : ['- Continuar monitorando os ganhos funcionais obtidos.']),
  ];

  const report = reportLines.join('\n');

  if (await hasTable(pool, 'generated_reports')) {
    await pool.query(
      `
        INSERT INTO generated_reports (
          organization_id, patient_id, report_type, report_content, date_range_start, date_range_end, created_by, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
      `,
      [user.organizationId, body.patientId, reportType, report, startDate, endDate, user.uid],
    ).catch(() => null);
  }

  return c.json({
    data: {
      report,
      patientId: body.patientId,
      reportType,
      dateRange: { start: startDate, end: endDate },
      generatedAt: new Date().toISOString(),
    },
  });
});

app.get('/patient-evolution/:patientId', requireAuth, async (c) => {
  const { patientId } = c.req.param();
  const user = c.get('user');
  const pool = createPool(c.env);

  const sessionsRes = await pool.query(
    `SELECT started_at, pain_level
     FROM sessions
     WHERE organization_id = $1 AND patient_id = $2
       AND status = 'completed'
     ORDER BY started_at ASC
     LIMIT 50`,
    [user.organizationId, patientId],
  );

  const map = sessionsRes.rows.map((row) => ({
    id: row.started_at?.toISOString() ?? `${row.started_at}`,
    date: row.started_at?.toISOString().split('T')[0] ?? '',
    averageEva: Number(row.pain_level ?? 0),
  }));

  return c.json({ data: map });
});

app.get('/patient-progress/:patientId', requireAuth, async (c) => {
  const { patientId } = c.req.param();
  const user = c.get('user');
  const pool = createPool(c.env);

  const metricsRes = await pool.query(
    `
      SELECT
        COUNT(*)::int AS total_sessions,
        AVG(pain_reduction)::numeric AS avg_pain_reduction,
        SUM(pain_reduction)::numeric AS total_pain_reduction,
        AVG(functional_improvement)::numeric AS avg_functional_improvement
      FROM patient_session_metrics
      WHERE organization_id = $1 AND patient_id = $2
    `,
    [user.organizationId, patientId],
  );

  const firstPainRes = await pool.query(
    `
      SELECT pain_level_before
      FROM patient_session_metrics
      WHERE organization_id = $1 AND patient_id = $2 AND pain_level_before IS NOT NULL
      ORDER BY created_at ASC
      LIMIT 1
    `,
    [user.organizationId, patientId],
  );

  const lastPainRes = await pool.query(
    `
      SELECT pain_level_after
      FROM patient_session_metrics
      WHERE organization_id = $1 AND patient_id = $2 AND pain_level_after IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [user.organizationId, patientId],
  );

  const goalsRes = await pool.query(
    `
      SELECT
        COUNT(*) FILTER (WHERE status = 'achieved')::int AS goals_achieved,
        COUNT(*) FILTER (WHERE status != 'achieved' AND status IS NOT NULL)::int AS goals_in_progress
      FROM patient_goal_tracking
      WHERE organization_id = $1 AND patient_id = $2
    `,
    [user.organizationId, patientId],
  );

  const metricsRow = metricsRes.rows[0] ?? {};
  const firstPainRow = firstPainRes.rows[0];
  const lastPainRow = lastPainRes.rows[0];
  const goalsRow = goalsRes.rows[0] ?? {};

  const goalsAchieved = Number(goalsRow.goals_achieved ?? 0);
  const goalsInProgress = Number(goalsRow.goals_in_progress ?? 0);
  const totalGoalCount = goalsAchieved + goalsInProgress;
  const progressPercent =
    totalGoalCount > 0 ? (goalsAchieved / totalGoalCount) * 100 : 0;

  return c.json({
    data: {
      total_sessions: Number(metricsRow.total_sessions ?? 0),
      avg_pain_reduction: metricsRow.avg_pain_reduction !== null
        ? Number(metricsRow.avg_pain_reduction)
        : null,
      total_pain_reduction: metricsRow.total_pain_reduction !== null
        ? Number(metricsRow.total_pain_reduction)
        : 0,
      avg_functional_improvement: metricsRow.avg_functional_improvement !== null
        ? Number(metricsRow.avg_functional_improvement)
        : null,
      current_pain_level: lastPainRow ? Number(lastPainRow.pain_level_after ?? null) : null,
      initial_pain_level: firstPainRow ? Number(firstPainRow.pain_level_before ?? null) : null,
      goals_achieved: goalsAchieved,
      goals_in_progress: goalsInProgress,
      overall_progress_percentage: Number(progressPercent.toFixed(1)),
    },
  });
});

app.get('/patient-lifecycle-events/:patientId', requireAuth, async (c) => {
  const { patientId } = c.req.param();
  const user = c.get('user');
  const pool = createPool(c.env);

  const eventsRes = await pool.query(
    `
      SELECT id, event_type, event_date, notes, created_by, created_at
      FROM patient_lifecycle_events
      WHERE organization_id = $1 AND patient_id = $2
      ORDER BY event_date ASC, created_at ASC
    `,
    [user.organizationId, patientId],
  );

  return c.json({ data: eventsRes.rows });
});

app.post('/patient-lifecycle-events', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as {
    patient_id?: string;
    event_type?: string;
    event_date?: string;
    notes?: string;
  };

  if (!body.patient_id) {
    return c.json({ error: 'patient_id é obrigatório' }, 400);
  }

  if (!body.event_type) {
    return c.json({ error: 'event_type é obrigatório' }, 400);
  }

  const eventDate = body.event_date
    ? new Date(body.event_date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const insertRes = await pool.query(
    `
      INSERT INTO patient_lifecycle_events (
        patient_id,
        organization_id,
        event_type,
        event_date,
        notes,
        created_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, event_type, event_date, notes, created_by, created_at
    `,
    [body.patient_id, user.organizationId, body.event_type, eventDate, body.notes ?? null, user.uid],
  );

  return c.json({ data: insertRes.rows[0] });
});

const mapTechniques = (value: unknown) => {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [value];
    } catch {
      return [value];
    }
  }
  return undefined;
};

const rowToSessionMetric = (row: Record<string, unknown>): Record<string, unknown> => ({
  id: row.id,
  patient_id: row.patient_id,
  session_id: row.session_id ?? undefined,
  session_date: row.session_date ? String(row.session_date) : undefined,
  session_number: row.session_number != null ? Number(row.session_number) : undefined,
  pain_level_before: row.pain_level_before != null ? Number(row.pain_level_before) : undefined,
  functional_score_before:
    row.functional_score_before != null ? Number(row.functional_score_before) : undefined,
  mood_before: row.mood_before ? String(row.mood_before) : undefined,
  duration_minutes: row.duration_minutes != null ? Number(row.duration_minutes) : undefined,
  treatment_type: row.treatment_type ? String(row.treatment_type) : undefined,
  techniques_used: mapTechniques(row.techniques_used),
  areas_treated: mapTechniques(row.areas_treated),
  pain_level_after: row.pain_level_after != null ? Number(row.pain_level_after) : undefined,
  functional_score_after:
    row.functional_score_after != null ? Number(row.functional_score_after) : undefined,
  mood_after: row.mood_after ? String(row.mood_after) : undefined,
  patient_satisfaction:
    row.patient_satisfaction != null ? Number(row.patient_satisfaction) : undefined,
  pain_reduction: row.pain_reduction != null ? Number(row.pain_reduction) : undefined,
  functional_improvement:
    row.functional_improvement != null ? Number(row.functional_improvement) : undefined,
  notes: row.notes ? String(row.notes) : undefined,
  therapist_id: row.therapist_id ? String(row.therapist_id) : undefined,
  created_at: row.created_at ? String(row.created_at) : undefined,
});

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))
    ? Number(value)
    : null;

app.get('/patient-session-metrics/:patientId', requireAuth, async (c) => {
  const { patientId } = c.req.param();
  const user = c.get('user');
  const pool = createPool(c.env);
  const limitValue = Number(c.req.query('limit') ?? 0);

  const params: Array<string | number> = [patientId, user.organizationId];
  let limitClause = '';
  if (limitValue > 0) {
    params.push(Math.min(limitValue, 200));
    limitClause = `LIMIT $${params.length}`;
  }

  const rows = await pool.query(
    `
      SELECT *
      FROM patient_session_metrics
      WHERE patient_id = $1 AND organization_id = $2
      ORDER BY session_date ASC
      ${limitClause}
    `,
    params,
  );

  return c.json({ data: rows.rows.map(rowToSessionMetric) });
});

app.post('/patient-session-metrics', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;
  const sessionDate = body.session_date
    ? new Date(String(body.session_date)).toISOString()
    : new Date().toISOString();

  const techniques = body.techniques_used ? JSON.stringify(body.techniques_used) : null;
  const areas = body.areas_treated ? JSON.stringify(body.areas_treated) : null;

  const insertRes = await pool.query(
    `
      INSERT INTO patient_session_metrics (
        patient_id, organization_id, session_id, session_date, session_number,
        pain_level_before, functional_score_before, mood_before, duration_minutes,
        treatment_type, techniques_used, areas_treated, pain_level_after,
        functional_score_after, mood_after, patient_satisfaction, pain_reduction,
        functional_improvement, notes, therapist_id, created_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW()
      ) RETURNING *
    `,
    [
      body.patient_id,
      user.organizationId,
      body.session_id ?? null,
      sessionDate,
      body.session_number ?? null,
      body.pain_level_before ?? null,
      body.functional_score_before ?? null,
      body.mood_before ?? null,
      body.duration_minutes ?? null,
      body.treatment_type ?? null,
      techniques,
      areas,
      body.pain_level_after ?? null,
      body.functional_score_after ?? null,
      body.mood_after ?? null,
      body.patient_satisfaction ?? null,
      body.pain_reduction ?? null,
      body.functional_improvement ?? null,
      body.notes ?? null,
      body.therapist_id ?? user.uid,
    ],
  );

  return c.json({ data: rowToSessionMetric(insertRes.rows[0]) });
});

app.get('/patient-predictions/:patientId', requireAuth, async (c) => {
  const { patientId } = c.req.param();
  const user = c.get('user');
  const pool = createPool(c.env);
  const predictionType = c.req.query('predictionType');
  const limit = Number(c.req.query('limit') ?? 0) || 50;

  const params: Array<string | number> = [user.organizationId, patientId];
  let where = 'WHERE organization_id = $1 AND patient_id = $2';
  if (predictionType) {
    params.push(predictionType);
    where += ` AND prediction_type = $${params.length}`;
  }

  params.push(limit);

  const rows = await pool.query(
    `
      SELECT
        *,
        COALESCE(milestones, '[]'::jsonb) AS milestones,
        COALESCE(risk_factors, '[]'::jsonb) AS risk_factors,
        COALESCE(treatment_recommendations, '{}'::jsonb) AS treatment_recommendations,
        COALESCE(similar_cases, '{}'::jsonb) AS similar_cases
      FROM patient_predictions
      ${where}
      ORDER BY prediction_date DESC
      LIMIT $${params.length}
    `,
    params,
  );

  return c.json({ data: rows.rows });
});

app.get('/patient-risk/:patientId', requireAuth, async (c) => {
  const { patientId } = c.req.param();
  const pool = createPool(c.env);
  const riskRes = await pool.query('SELECT * FROM calculate_patient_risk($1)', [patientId]);
  return c.json({ data: riskRes.rows[0] ?? null });
});

app.get('/patient-insights/:patientId', requireAuth, async (c) => {
  const { patientId } = c.req.param();
  const user = c.get('user');
  const pool = createPool(c.env);
  const includeAcknowledged = c.req.query('includeAcknowledged') === 'true';

  const params = [user.organizationId, patientId];
  let where = 'WHERE organization_id = $1 AND patient_id = $2';
  if (!includeAcknowledged) {
    where += ' AND is_acknowledged = false';
  }

  const rows = await pool.query(
    `
      SELECT id, patient_id, insight_type, insight_text, confidence_score,
             related_metric, metric_value, comparison_value, comparison_benchmark_id,
             is_acknowledged, acknowledged_at, acknowledged_by,
             action_taken, actioned_at, actioned_by, created_at, expires_at
      FROM patient_insights
      ${where}
      ORDER BY created_at DESC
    `,
    params,
  );

  return c.json({ data: rows.rows });
});

app.patch('/patient-insights/:insightId/acknowledge', requireAuth, async (c) => {
  const { insightId } = c.req.param();
  const user = c.get('user');
  const pool = createPool(c.env);

  const res = await pool.query(
    `
      UPDATE patient_insights
      SET is_acknowledged = true,
          acknowledged_at = NOW(),
          acknowledged_by = $1,
          updated_at = NOW()
      WHERE id = $2 AND organization_id = $3
      RETURNING id, patient_id, insight_type, insight_text, confidence_score,
                related_metric, metric_value, comparison_value, comparison_benchmark_id,
                is_acknowledged, acknowledged_at, acknowledged_by,
                action_taken, actioned_at, actioned_by, created_at, expires_at
    `,
    [user.uid, insightId, user.organizationId],
  );

  if (res.rows.length === 0) {
    return c.json({ error: 'Insight não encontrado' }, 404);
  }

  return c.json({ data: res.rows[0] });
});

app.get('/patient-goals/:patientId', requireAuth, async (c) => {
  const { patientId } = c.req.param();
  const user = c.get('user');
  const pool = createPool(c.env);

  const rows = await pool.query(
    `
      SELECT *
      FROM patient_goal_tracking
      WHERE organization_id = $1 AND patient_id = $2
      ORDER BY target_date ASC NULLS LAST, created_at ASC
    `,
    [user.organizationId, patientId],
  );

  return c.json({ data: rows.rows });
});

app.post('/patient-goals', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const patientId = asString(body.patient_id);
  const goalTitle = asString(body.goal_title);
  const goalCategory = asString(body.goal_category);
  const status = asString(body.status);

  if (!patientId) return c.json({ error: 'patient_id é obrigatório' }, 400);
  if (!goalTitle) return c.json({ error: 'goal_title é obrigatório' }, 400);
  if (!goalCategory) return c.json({ error: 'goal_category é obrigatório' }, 400);
  if (!status) return c.json({ error: 'status é obrigatório' }, 400);

  const insertRes = await pool.query(
    `
      INSERT INTO patient_goal_tracking (
        patient_id, organization_id, goal_title, goal_description, goal_category,
        target_value, current_value, initial_value, unit, target_date,
        status, progress_percentage, achieved_at, achievement_milestone,
        related_pathology, associated_plan_id, created_by, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW()
      ) RETURNING *
    `,
    [
      body.patient_id,
      user.organizationId,
      goalTitle,
      asString(body.goal_description) ?? null,
      goalCategory,
      asNumber(body.target_value),
      asNumber(body.current_value),
      asNumber(body.initial_value),
      asString(body.unit) ?? null,
      asString(body.target_date) ?? null,
      status,
      asNumber(body.progress_percentage),
      asString(body.achieved_at) ?? null,
      asString(body.achievement_milestone) ?? null,
      asString(body.related_pathology) ?? null,
      asString(body.associated_plan_id) ?? null,
      user.uid,
    ],
  );

  return c.json({ data: insertRes.rows[0] });
});

app.put('/patient-goals/:goalId', requireAuth, async (c) => {
  const { goalId } = c.req.param();
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const allowedFields = [
    'goal_title',
    'goal_description',
    'goal_category',
    'target_value',
    'current_value',
    'initial_value',
    'unit',
    'target_date',
    'status',
    'progress_percentage',
    'achieved_at',
    'achievement_milestone',
    'related_pathology',
    'associated_plan_id',
  ] as const;

  const fieldValues: Record<string, string | number | null | undefined> = {
    goal_title: body.goal_title === undefined ? undefined : asString(body.goal_title),
    goal_description:
      body.goal_description === undefined ? undefined : asString(body.goal_description) ?? null,
    goal_category: body.goal_category === undefined ? undefined : asString(body.goal_category),
    target_value: body.target_value === undefined ? undefined : asNumber(body.target_value),
    current_value: body.current_value === undefined ? undefined : asNumber(body.current_value),
    initial_value: body.initial_value === undefined ? undefined : asNumber(body.initial_value),
    unit: body.unit === undefined ? undefined : asString(body.unit) ?? null,
    target_date:
      body.target_date === undefined ? undefined : asString(body.target_date) ?? null,
    status: body.status === undefined ? undefined : asString(body.status),
    progress_percentage:
      body.progress_percentage === undefined ? undefined : asNumber(body.progress_percentage),
    achieved_at:
      body.achieved_at === undefined ? undefined : asString(body.achieved_at) ?? null,
    achievement_milestone:
      body.achievement_milestone === undefined
        ? undefined
        : asString(body.achievement_milestone) ?? null,
    related_pathology:
      body.related_pathology === undefined ? undefined : asString(body.related_pathology) ?? null,
    associated_plan_id:
      body.associated_plan_id === undefined ? undefined : asString(body.associated_plan_id) ?? null,
  };

  const sets: string[] = [];
  const params: Array<string | number | null> = [];
  allowedFields.forEach((field) => {
    const value = fieldValues[field];
    if (value !== undefined) {
      params.push(value);
      sets.push(`${field} = $${params.length}`);
    }
  });

  if (sets.length === 0) {
    return c.json({ error: 'Nenhum campo para atualizar' }, 400);
  }

  params.push(goalId, user.organizationId);

  const res = await pool.query(
    `
      UPDATE patient_goal_tracking
      SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${params.length - 1} AND organization_id = $${params.length}
      RETURNING *
    `,
    params,
  );

  if (res.rows.length === 0) {
    return c.json({ error: 'Objetivo não encontrado' }, 404);
  }

  return c.json({ data: res.rows[0] });
});

app.patch('/patient-goals/:goalId/complete', requireAuth, async (c) => {
  const { goalId } = c.req.param();
  const user = c.get('user');
  const pool = createPool(c.env);

  const res = await pool.query(
    `
      UPDATE patient_goal_tracking
      SET status = 'achieved',
          achieved_at = NOW(),
          updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `,
    [goalId, user.organizationId],
  );

  if (res.rows.length === 0) {
    return c.json({ error: 'Objetivo não encontrado' }, 404);
  }

  return c.json({ data: res.rows[0] });
});

app.get('/clinical-benchmarks', requireAuth, async (c) => {
  const pool = createPool(c.env);
  const category = c.req.query('category');
  const params: Array<string> = [];
  let where = '';
  if (category) {
    params.push(category);
    where = 'WHERE benchmark_category = $1';
  }

  const rows = await pool.query(
    `
      SELECT *
      FROM clinical_benchmarks
      ${where}
      ORDER BY benchmark_name ASC
    `,
    params,
  );

  return c.json({ data: rows.rows });
});

const AGE_GROUP_RANGES: Record<string, [number, number]> = {
  '0-17': [0, 17],
  '18-30': [18, 30],
  '31-50': [31, 50],
  '51-65': [51, 65],
  '65+': [65, 120],
};

const matchesAgeGroup = (ageGroup: string | undefined, minAge?: number, maxAge?: number): boolean => {
  if (!ageGroup) return true;
  if (!minAge && !maxAge) return true;
  const range = AGE_GROUP_RANGES[ageGroup];
  if (!range) return true;
  const [lower, upper] = range;
  if (minAge && upper < minAge) return false;
  if (maxAge && lower > maxAge) return false;
  return true;
};

app.get('/ml-training-data/patient/:patientId', requireAuth, async (c) => {
  const { patientId } = c.req.param();
  const user = c.get('user');
  const pool = createPool(c.env);
  const salt = c.env.ML_SALT ?? c.env.VITE_ML_SALT ?? 'fisioflow-ml-salt';

  const patientRes = await pool.query(
    `
      SELECT birth_date, gender, created_at
      FROM patients
      WHERE id = $1 AND organization_id = $2
    `,
    [patientId, user.organizationId],
  );

  if (patientRes.rows.length === 0) {
    return c.json({ error: 'Paciente não encontrado' }, 404);
  }

  const patient = patientRes.rows[0];
  const sessionsRes = await pool.query(
    `
      SELECT pain_level_before, pain_level_after, functional_score_before, functional_score_after,
             patient_satisfaction, session_date
      FROM patient_session_metrics
      WHERE patient_id = $1 AND organization_id = $2
      ORDER BY session_date ASC
    `,
    [patientId, user.organizationId],
  );
  const sessions = sessionsRes.rows;

  const appointmentsRes = await pool.query(
    `
      SELECT status
      FROM appointments
      WHERE patient_id = $1 AND organization_id = $2
    `,
    [patientId, user.organizationId],
  );

  const pathologiesRes = await pool.query(
    `
      SELECT name, status, is_primary, created_at
      FROM patient_pathologies
      WHERE patient_id = $1 AND organization_id = $2
      ORDER BY is_primary DESC, created_at DESC
    `,
    [patientId, user.organizationId],
  );

  const totalSessions = sessions.length;
  const completedAppointments = (appointmentsRes.rows ?? []).filter(
    (row) => row.status === 'completed',
  );
  const totalAppointments = appointmentsRes.rows.length;
  const attendanceRate =
    totalAppointments > 0 ? completedAppointments.length / totalAppointments : 0;

  const firstSession = sessions[0];
  const lastSession = sessions[sessions.length - 1];
  const initialPain = Number(firstSession?.pain_level_before ?? 0);
  const finalPain = Number(lastSession?.pain_level_after ?? initialPain);
  const initialFunction = Number(firstSession?.functional_score_before ?? 0);
  const finalFunction = Number(lastSession?.functional_score_after ?? initialFunction);

  const painReduction =
    initialPain > 0 ? ((initialPain - finalPain) / initialPain) * 100 : 0;
  const functionalImprovement =
    initialFunction < 100
      ? ((finalFunction - initialFunction) / (100 - initialFunction)) * 100
      : 0;

  const satisfactionSum = sessions.reduce(
    (sum, session) => sum + Number(session.patient_satisfaction ?? 0),
    0,
  );
  const avgSatisfaction = totalSessions > 0 ? satisfactionSum / totalSessions : 0;

  const firstDate = firstSession?.session_date ? new Date(firstSession.session_date) : new Date();
  const lastDate = lastSession?.session_date ? new Date(lastSession.session_date) : new Date();
  const weeksActive =
    totalSessions > 0
      ? Math.max(
          1,
          Math.abs(lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
        )
      : 1;
  const sessionFrequency = totalSessions / weeksActive;

  const primaryPathology =
    pathologiesRes.rows.find((row) => row.status === 'ativo')?.name ||
    pathologiesRes.rows[0]?.name ||
    'unknown';
  const chronicCondition = pathologiesRes.rows.some((row) => row.status === 'cronico');

  const startPeriod = patient.created_at ?? new Date().toISOString();
  const endPeriod = lastSession?.session_date
    ? new Date(lastSession.session_date).toISOString()
    : new Date().toISOString();

  const trainingData = {
    patient_hash: await hashPatientId(patientId, salt),
    age_group: getAgeGroup(patient.birth_date),
    gender: patient.gender ?? 'unknown',
    primary_pathology: primaryPathology,
    chronic_condition: chronicCondition,
    baseline_pain_level: roundTo(initialPain, 1),
    baseline_functional_score: roundTo(initialFunction, 1),
    treatment_type: 'physical_therapy',
    session_frequency_weekly: roundTo(sessionFrequency, 1),
    total_sessions: totalSessions,
    attendance_rate: roundTo(attendanceRate, 2),
    home_exercise_compliance: 0.5,
    portal_login_frequency: 0.1,
    outcome_category: determineOutcomeCategory(
      totalSessions,
      painReduction,
      functionalImprovement,
    ),
    sessions_to_discharge: totalSessions,
    pain_reduction_percentage: roundTo(painReduction, 1),
    functional_improvement_percentage: roundTo(functionalImprovement, 1),
    patient_satisfaction_score: roundTo(avgSatisfaction, 1),
    data_collection_period_start: startPeriod,
    data_collection_period_end: endPeriod,
    created_at: new Date().toISOString(),
  };

  return c.json({ data: trainingData });
});

app.get('/ml-training-data/patients', requireAuth, async (c) => {
  const pool = createPool(c.env);
  const user = c.get('user');
  const limitValue = Math.min(Math.max(Number(c.req.query('limit') ?? 50), 1), 200);
  const rows = await pool.query(
    `
      SELECT id, created_at
      FROM patients
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [user.organizationId, limitValue],
  );

  return c.json({ data: rows.rows });
});

app.get('/ml-training-data/stats', requireAuth, async (c) => {
  const pool = createPool(c.env);
  const user = c.get('user');
  const rows = await pool.query(
    `
      SELECT outcome_category, age_group, pain_reduction_percentage, functional_improvement_percentage
      FROM ml_training_data
      WHERE organization_id = $1
    `,
    [user.organizationId],
  );
  const records = rows.rows;
  const totalRecords = records.length;

  const outcomeCounts = records.reduce<Record<string, number>>((acc, row) => {
    const key = row.outcome_category ?? 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const ageDistribution = records.reduce<Record<string, number>>((acc, row) => {
    const key = row.age_group ?? 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const avgPainReduction =
    totalRecords > 0
      ? roundTo(
          records.reduce(
            (sum, row) => sum + Number(row.pain_reduction_percentage ?? 0),
            0,
          ) / totalRecords,
          1,
        )
      : 0;

  const avgFunctionalImprovement =
    totalRecords > 0
      ? roundTo(
          records.reduce(
            (sum, row) => sum + Number(row.functional_improvement_percentage ?? 0),
            0,
          ) / totalRecords,
          1,
        )
      : 0;

  const successRate =
    totalRecords > 0
      ? roundTo(((outcomeCounts.success ?? 0) / totalRecords) * 100, 1)
      : 0;

  return c.json({
    data: {
      totalRecords,
      outcomeCounts,
      ageDistribution,
      avgPainReduction,
      avgFunctionalImprovement,
      successRate,
    },
  });
});

app.get('/ml-training-data/similar', requireAuth, async (c) => {
  const pool = createPool(c.env);
  const user = c.get('user');
  const condition = c.req.query('condition');
  const minAge = Number(c.req.query('minAge') ?? 0);
  const maxAge = Number(c.req.query('maxAge') ?? 0);
  const limitValue = Math.min(Math.max(Number(c.req.query('limit') ?? 50), 1), 200);

  if (!condition) {
    return c.json({ data: [] });
  }

  const rows = await pool.query(
    `
      SELECT *
      FROM ml_training_data
      WHERE organization_id = $1 AND primary_pathology = $2
      ORDER BY created_at DESC
      LIMIT $3
    `,
    [user.organizationId, condition, limitValue],
  );

  const candidates = rows.rows.filter((row) =>
    matchesAgeGroup(row.age_group, minAge || undefined, maxAge || undefined),
  );

  return c.json({ data: candidates });
});

app.post('/ml-training-data', requireAuth, async (c) => {
  const pool = createPool(c.env);
  const user = c.get('user');
  const payload = (await c.req.json()) as Record<string, unknown>;
  const columns = [
    'patient_hash',
    'age_group',
    'gender',
    'primary_pathology',
    'chronic_condition',
    'baseline_pain_level',
    'baseline_functional_score',
    'treatment_type',
    'session_frequency_weekly',
    'total_sessions',
    'attendance_rate',
    'home_exercise_compliance',
    'portal_login_frequency',
    'outcome_category',
    'sessions_to_discharge',
    'pain_reduction_percentage',
    'functional_improvement_percentage',
    'patient_satisfaction_score',
    'data_collection_period_start',
    'data_collection_period_end',
    'created_at',
  ];

  const values = columns.map((column) => payload[column] ?? null);
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const updateClause = columns.map((column) => `${column} = EXCLUDED.${column}`).join(', ');

  const insertRes = await pool.query(
    `
      INSERT INTO ml_training_data (${columns.join(', ')}, organization_id, updated_at)
      VALUES (${placeholders}, $${columns.length + 1}, NOW())
      ON CONFLICT (organization_id, patient_hash)
      DO UPDATE SET ${updateClause}, updated_at = NOW()
      RETURNING *
    `,
    [...values, user.organizationId],
  );

  return c.json({ data: insertRes.rows[0] });
});

app.post('/patient-predictions/upsert', requireAuth, async (c) => {
  const pool = createPool(c.env);
  const user = c.get('user');
  const body = (await c.req.json()) as {
    patient_id?: string;
    predictions?: Array<Record<string, unknown>>;
  };

  if (!body.patient_id || !Array.isArray(body.predictions)) {
    return c.json({ error: 'patient_id e predictions são obrigatórios' }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `
        UPDATE patient_predictions
        SET is_active = false, updated_at = NOW()
        WHERE patient_id = $1 AND organization_id = $2 AND is_active = true
      `,
      [body.patient_id, user.organizationId],
    );

    const inserted: Record<string, unknown>[] = [];

    for (const prediction of body.predictions) {
      const res = await client.query(
        `
          INSERT INTO patient_predictions (
            patient_id, organization_id, prediction_type, prediction_date, features,
            predicted_value, predicted_class, confidence_score, confidence_interval,
            target_date, timeframe_days, model_version, model_name,
            is_active, milestones, risk_factors, treatment_recommendations, similar_cases,
            created_at, updated_at
          ) VALUES (
            $1,$2,$3,NOW(),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW()
          ) RETURNING *
        `,
        [
          body.patient_id,
          user.organizationId,
          prediction.prediction_type,
          prediction.features ?? {},
          prediction.predicted_value ?? null,
          prediction.predicted_class ?? null,
          prediction.confidence_score ?? 0,
          prediction.confidence_interval ?? null,
          prediction.target_date ?? null,
          prediction.timeframe_days ?? null,
          prediction.model_version ?? 'custom',
          prediction.model_name ?? null,
          true,
          prediction.milestones ?? [],
          prediction.risk_factors ?? [],
          prediction.treatment_recommendations ?? {},
          prediction.similar_cases ?? {},
        ],
      );
      inserted.push(res.rows[0]);
    }

    await client.query('COMMIT');
    return c.json({ data: inserted });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

app.get('/population-health', requireAuth, async (c) => {
  const pool = createPool(c.env);
  const user = c.get('user');
  const startDate = parseDate(c.req.query('startDate')) ?? new Date().toISOString().split('T')[0];
  const endDate = parseDate(c.req.query('endDate')) ?? new Date().toISOString().split('T')[0];

  const patientsRes = await pool.query(
    `
      SELECT id, full_name, gender, created_at, birth_date
      FROM patients
      WHERE organization_id = $1
        AND created_at BETWEEN $2::timestamp AND $3::timestamp
    `,
    [user.organizationId, `${startDate}T00:00:00`, `${endDate}T23:59:59`],
  );

  const mlRes = await pool.query(
    `
      SELECT *
      FROM ml_training_data
      WHERE organization_id = $1
        AND data_collection_period_start >= $2::date
        AND data_collection_period_end <= $3::date
      ORDER BY created_at DESC
      LIMIT 500
    `,
    [user.organizationId, startDate, endDate],
  );

  const appointmentsRes = await pool.query(
    `
      SELECT id, patient_id, date, status, type
      FROM appointments
      WHERE organization_id = $1
        AND date BETWEEN $2::date AND $3::date
      ORDER BY date ASC
    `,
    [user.organizationId, startDate, endDate],
  );

  return c.json({
    data: {
      patients: patientsRes.rows,
      mlData: mlRes.rows,
      appointments: appointmentsRes.rows,
      totalRecords:
        (patientsRes.rowCount ?? 0) + (mlRes.rowCount ?? 0) + (appointmentsRes.rowCount ?? 0),
    },
  });
});

export { app as analyticsRoutes };
