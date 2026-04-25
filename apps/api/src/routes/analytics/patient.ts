import { requireAuth } from "../../lib/auth";
import { createPool } from "../../lib/db";
import { roundTo } from "../mlHelpers";
import { asNumber, asString, hasTable, parseDate, type AnalyticsRouteApp } from "./shared";

const mapTechniques = (value: unknown) => {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string") {
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

export const registerPatientAnalyticsRoutes = (app: AnalyticsRouteApp) => {
  app.get("/intelligent-reports/:patientId", requireAuth, async (c) => {
    const { patientId } = c.req.param();
    const user = c.get("user");
    const pool = await createPool(c.env);

    const reports = await pool
      .query(
        `
        SELECT id, patient_id, report_type, report_content, date_range_start, date_range_end, created_at
        FROM generated_reports
        WHERE organization_id = $1 AND patient_id = $2
        ORDER BY created_at DESC
        LIMIT 10
      `,
        [user.organizationId, patientId],
      )
      .catch(() => ({ rows: [] as Array<Record<string, unknown>> }));

    return c.json({ data: reports.rows });
  });

  app.post("/intelligent-reports", requireAuth, async (c) => {
    const user = c.get("user");
    const pool = await createPool(c.env);
    const body = (await c.req.json()) as {
      patientId?: string;
      reportType?: string;
      dateRange?: { start?: string; end?: string };
    };

    if (!body.patientId) {
      return c.json({ error: "patientId e obrigatorio" }, 400);
    }

    const startDate =
      parseDate(body.dateRange?.start) ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const endDate = parseDate(body.dateRange?.end) ?? new Date().toISOString().split("T")[0];
    const reportType = body.reportType ?? "evolution";

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
      return c.json({ error: "Paciente nao encontrado" }, 404);
    }

    const metrics = metricsRes.rows;
    const outcomes = outcomesRes.rows;
    const goals = goalsRes.rows;

    const firstMetric = metrics[0];
    const lastMetric = metrics[metrics.length - 1];
    const averagePainReduction =
      metrics.length > 0
        ? roundTo(
            metrics.reduce((sum, row) => sum + Number(row.pain_reduction ?? 0), 0) / metrics.length,
            1,
          )
        : 0;
    const averageFunctionalImprovement =
      metrics.length > 0
        ? roundTo(
            metrics.reduce((sum, row) => sum + Number(row.functional_improvement ?? 0), 0) /
              metrics.length,
            1,
          )
        : 0;

    const reportLines = [
      `# Relatorio Inteligente - ${patient.full_name ?? "Paciente"}`,
      "",
      `**Tipo:** ${reportType}`,
      `**Periodo:** ${startDate} ate ${endDate}`,
      `**Condicao principal:** ${patient.main_condition ?? "Nao informada"}`,
      "",
      "## Resumo clinico",
      `- Total de sessoes analisadas: ${metrics.length}`,
      `- Dor inicial registrada: ${firstMetric?.pain_level_before ?? "n/d"}`,
      `- Dor final registrada: ${lastMetric?.pain_level_after ?? "n/d"}`,
      `- Reducao media da dor: ${averagePainReduction}%`,
      `- Melhora funcional media: ${averageFunctionalImprovement}%`,
      "",
      "## Desfechos recentes",
      ...(outcomes.length > 0
        ? outcomes
            .slice(0, 5)
            .map(
              (row) =>
                `- ${row.measure_name}: ${row.normalized_score ?? row.score} (${String(row.measurement_date).slice(0, 10)})`,
            )
        : ["- Nenhuma medida de desfecho encontrada no periodo."]),
      "",
      "## Objetivos do tratamento",
      ...(goals.length > 0
        ? goals
            .slice(0, 5)
            .map(
              (row) =>
                `- ${row.goal_title}: status ${row.status}, progresso ${Number(row.progress_percentage ?? 0)}%`,
            )
        : ["- Nenhum objetivo registrado."]),
      "",
      "## Recomendacoes",
      ...(averagePainReduction < 15
        ? ["- Reavaliar adesao ao tratamento e frequencia das sessoes."]
        : ["- Manter o plano atual, com foco em progressao funcional gradual."]),
      ...(averageFunctionalImprovement < 10
        ? ["- Considerar ajuste de exercicios domiciliares e metas semanais."]
        : ["- Continuar monitorando os ganhos funcionais obtidos."]),
    ];

    const report = reportLines.join("\n");

    if (await hasTable(pool, "generated_reports")) {
      await pool
        .query(
          `
          INSERT INTO generated_reports (
            organization_id, patient_id, report_type, report_content, date_range_start, date_range_end, created_by, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
        `,
          [user.organizationId, body.patientId, reportType, report, startDate, endDate, user.uid],
        )
        .catch(() => null);
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

  app.get("/patient-evolution/:patientId", requireAuth, async (c) => {
    const { patientId } = c.req.param();
    const user = c.get("user");
    const pool = await createPool(c.env);

    const sessionsRes = await pool.query(
      `SELECT started_at, pain_level
       FROM sessions
       WHERE organization_id = $1 AND patient_id = $2
         AND status = 'finalized'
       ORDER BY started_at ASC
       LIMIT 50`,
      [user.organizationId, patientId],
    );

    const map = sessionsRes.rows.map((row) => ({
      id: row.started_at?.toISOString() ?? `${row.started_at}`,
      date: row.started_at?.toISOString().split("T")[0] ?? "",
      averageEva: Number(row.pain_level ?? 0),
    }));

    return c.json({ data: map });
  });

  app.get("/patient-progress/:patientId", requireAuth, async (c) => {
    const { patientId } = c.req.param();
    const user = c.get("user");
    const pool = await createPool(c.env);

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
    const progressPercent = totalGoalCount > 0 ? (goalsAchieved / totalGoalCount) * 100 : 0;

    return c.json({
      data: {
        total_sessions: Number(metricsRow.total_sessions ?? 0),
        avg_pain_reduction:
          metricsRow.avg_pain_reduction !== null ? Number(metricsRow.avg_pain_reduction) : null,
        total_pain_reduction:
          metricsRow.total_pain_reduction !== null ? Number(metricsRow.total_pain_reduction) : 0,
        avg_functional_improvement:
          metricsRow.avg_functional_improvement !== null
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

  app.get("/patient-lifecycle-events/:patientId", requireAuth, async (c) => {
    const { patientId } = c.req.param();
    const user = c.get("user");
    const pool = await createPool(c.env);

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

  app.post("/patient-lifecycle-events", requireAuth, async (c) => {
    const user = c.get("user");
    const pool = await createPool(c.env);
    const body = (await c.req.json()) as {
      patient_id?: string;
      event_type?: string;
      event_date?: string;
      notes?: string;
    };

    if (!body.patient_id) {
      return c.json({ error: "patient_id é obrigatório" }, 400);
    }

    if (!body.event_type) {
      return c.json({ error: "event_type é obrigatório" }, 400);
    }

    const eventDate = body.event_date
      ? new Date(body.event_date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

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
      [
        body.patient_id,
        user.organizationId,
        body.event_type,
        eventDate,
        body.notes ?? null,
        user.uid,
      ],
    );

    return c.json({ data: insertRes.rows[0] });
  });

  app.get("/patient-outcome-measures/:patientId", requireAuth, async (c) => {
    const { patientId } = c.req.param();
    const user = c.get("user");
    const pool = await createPool(c.env);
    const measureType = c.req.query("measureType");
    const limitValue = Number(c.req.query("limit") ?? 0);

    if (!(await hasTable(pool, "patient_outcome_measures"))) {
      return c.json({ data: [] });
    }

    const params: Array<string | number> = [user.organizationId, patientId];
    const conditions = ["organization_id = $1", "patient_id = $2"];

    if (measureType) {
      params.push(measureType);
      conditions.push(`measure_type = $${params.length}`);
    }

    let limitClause = "";
    if (limitValue > 0) {
      params.push(Math.min(limitValue, 200));
      limitClause = `LIMIT $${params.length}`;
    }

    const rows = await pool.query(
      `
        SELECT *
        FROM patient_outcome_measures
        WHERE ${conditions.join(" AND ")}
        ORDER BY measurement_date DESC, created_at DESC
        ${limitClause}
      `,
      params,
    );

    return c.json({ data: rows.rows });
  });

  app.post("/patient-outcome-measures", requireAuth, async (c) => {
    const user = c.get("user");
    const pool = await createPool(c.env);
    const body = (await c.req.json()) as Record<string, unknown>;

    if (!(await hasTable(pool, "patient_outcome_measures"))) {
      return c.json({ error: "Schema de medidas de resultado indisponível" }, 501);
    }

    const patientId = asString(body.patient_id);
    const measureType = asString(body.measure_type);
    const measureName = asString(body.measure_name);

    if (!patientId) return c.json({ error: "patient_id é obrigatório" }, 400);
    if (!measureType) return c.json({ error: "measure_type é obrigatório" }, 400);
    if (!measureName) return c.json({ error: "measure_name é obrigatório" }, 400);
    if (asNumber(body.score) == null) return c.json({ error: "score é obrigatório" }, 400);

    const measurementDate =
      parseDate(asString(body.measurement_date)) ?? new Date().toISOString().split("T")[0];

    const insertRes = await pool.query(
      `
        INSERT INTO patient_outcome_measures (
          organization_id, patient_id, measure_type, measure_name, score, normalized_score,
          min_score, max_score, measurement_date, body_part, context, notes, recorded_by,
          created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW()
        ) RETURNING *
      `,
      [
        user.organizationId,
        patientId,
        measureType,
        measureName,
        asNumber(body.score),
        asNumber(body.normalized_score),
        asNumber(body.min_score),
        asNumber(body.max_score),
        measurementDate,
        asString(body.body_part) ?? null,
        asString(body.context) ?? null,
        asString(body.notes) ?? null,
        user.uid,
      ],
    );

    return c.json({ data: insertRes.rows[0] }, 201);
  });

  app.get("/patient-session-metrics/:patientId", requireAuth, async (c) => {
    const { patientId } = c.req.param();
    const user = c.get("user");
    const pool = await createPool(c.env);
    const limitValue = Number(c.req.query("limit") ?? 0);

    const params: Array<string | number> = [patientId, user.organizationId];
    let limitClause = "";
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

  app.post("/patient-session-metrics", requireAuth, async (c) => {
    const user = c.get("user");
    const pool = await createPool(c.env);
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

  app.get("/patient-predictions/:patientId", requireAuth, async (c) => {
    const { patientId } = c.req.param();
    const user = c.get("user");
    const pool = await createPool(c.env);
    const predictionType = c.req.query("predictionType");
    const limit = Number(c.req.query("limit") ?? 0) || 50;

    const params: Array<string | number> = [user.organizationId, patientId];
    let where = "WHERE organization_id = $1 AND patient_id = $2";
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

  app.get("/patient-risk/:patientId", requireAuth, async (c) => {
    const { patientId } = c.req.param();
    const pool = await createPool(c.env);
    const riskRes = await pool.query("SELECT * FROM calculate_patient_risk($1)", [patientId]);
    return c.json({ data: riskRes.rows[0] ?? null });
  });

  app.get("/patient-insights/:patientId", requireAuth, async (c) => {
    const { patientId } = c.req.param();
    const user = c.get("user");
    const pool = await createPool(c.env);
    const includeAcknowledged = c.req.query("includeAcknowledged") === "true";

    const params = [user.organizationId, patientId];
    let where = "WHERE organization_id = $1 AND patient_id = $2";
    if (!includeAcknowledged) {
      where += " AND is_acknowledged = false";
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

  app.patch("/patient-insights/:insightId/acknowledge", requireAuth, async (c) => {
    const { insightId } = c.req.param();
    const user = c.get("user");
    const pool = await createPool(c.env);

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
      return c.json({ error: "Insight não encontrado" }, 404);
    }

    return c.json({ data: res.rows[0] });
  });

  app.get("/patient-goals/:patientId", requireAuth, async (c) => {
    const { patientId } = c.req.param();
    const user = c.get("user");
    const pool = await createPool(c.env);

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

  app.post("/patient-goals", requireAuth, async (c) => {
    const user = c.get("user");
    const pool = await createPool(c.env);
    const body = (await c.req.json()) as Record<string, unknown>;

    const patientId = asString(body.patient_id);
    const goalTitle = asString(body.goal_title);
    const goalCategory = asString(body.goal_category);
    const status = asString(body.status);

    if (!patientId) return c.json({ error: "patient_id é obrigatório" }, 400);
    if (!goalTitle) return c.json({ error: "goal_title é obrigatório" }, 400);
    if (!goalCategory) return c.json({ error: "goal_category é obrigatório" }, 400);
    if (!status) return c.json({ error: "status é obrigatório" }, 400);

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

  app.put("/patient-goals/:goalId", requireAuth, async (c) => {
    const { goalId } = c.req.param();
    const user = c.get("user");
    const pool = await createPool(c.env);
    const body = (await c.req.json()) as Record<string, unknown>;

    const allowedFields = [
      "goal_title",
      "goal_description",
      "goal_category",
      "target_value",
      "current_value",
      "initial_value",
      "unit",
      "target_date",
      "status",
      "progress_percentage",
      "achieved_at",
      "achievement_milestone",
      "related_pathology",
      "associated_plan_id",
    ] as const;

    const fieldValues: Record<string, string | number | null | undefined> = {
      goal_title: body.goal_title === undefined ? undefined : asString(body.goal_title),
      goal_description:
        body.goal_description === undefined ? undefined : (asString(body.goal_description) ?? null),
      goal_category: body.goal_category === undefined ? undefined : asString(body.goal_category),
      target_value: body.target_value === undefined ? undefined : asNumber(body.target_value),
      current_value: body.current_value === undefined ? undefined : asNumber(body.current_value),
      initial_value: body.initial_value === undefined ? undefined : asNumber(body.initial_value),
      unit: body.unit === undefined ? undefined : (asString(body.unit) ?? null),
      target_date:
        body.target_date === undefined ? undefined : (asString(body.target_date) ?? null),
      status: body.status === undefined ? undefined : asString(body.status),
      progress_percentage:
        body.progress_percentage === undefined ? undefined : asNumber(body.progress_percentage),
      achieved_at:
        body.achieved_at === undefined ? undefined : (asString(body.achieved_at) ?? null),
      achievement_milestone:
        body.achievement_milestone === undefined
          ? undefined
          : (asString(body.achievement_milestone) ?? null),
      related_pathology:
        body.related_pathology === undefined
          ? undefined
          : (asString(body.related_pathology) ?? null),
      associated_plan_id:
        body.associated_plan_id === undefined
          ? undefined
          : (asString(body.associated_plan_id) ?? null),
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
      return c.json({ error: "Nenhum campo para atualizar" }, 400);
    }

    params.push(goalId, user.organizationId);

    const res = await pool.query(
      `
        UPDATE patient_goal_tracking
        SET ${sets.join(", ")}, updated_at = NOW()
        WHERE id = $${params.length - 1} AND organization_id = $${params.length}
        RETURNING *
      `,
      params,
    );

    if (res.rows.length === 0) {
      return c.json({ error: "Objetivo não encontrado" }, 404);
    }

    return c.json({ data: res.rows[0] });
  });

  app.patch("/patient-goals/:goalId/complete", requireAuth, async (c) => {
    const { goalId } = c.req.param();
    const user = c.get("user");
    const pool = await createPool(c.env);

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
      return c.json({ error: "Objetivo não encontrado" }, 404);
    }

    return c.json({ data: res.rows[0] });
  });

  app.get("/clinical-benchmarks", requireAuth, async (c) => {
    const pool = await createPool(c.env);
    const category = c.req.query("category");
    const params: Array<string> = [];
    let where = "";
    if (category) {
      params.push(category);
      where = "WHERE benchmark_category = $1";
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
};
