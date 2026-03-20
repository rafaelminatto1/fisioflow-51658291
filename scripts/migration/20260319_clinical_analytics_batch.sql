-- Applies the clinical/analytics residual schema batch directly on Neon.
-- Scope:
--   0021_packages_and_patient_objectives.sql
--   0025_evento_templates_and_standardized_tests.sql
--   0041_clinical_analytics_batch.sql

-- 0021_packages_and_patient_objectives.sql
CREATE TABLE IF NOT EXISTS patient_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_objectives_org_active
  ON patient_objectives (organization_id, ativo, categoria, nome);

CREATE TABLE IF NOT EXISTS patient_objective_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  objective_id UUID NOT NULL,
  prioridade INTEGER NOT NULL DEFAULT 2,
  notas TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_objective_assignments_patient
  ON patient_objective_assignments (patient_id, prioridade, created_at DESC);

-- 0025_evento_templates_and_standardized_tests.sql
CREATE TABLE IF NOT EXISTS evento_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  gratuito BOOLEAN NOT NULL DEFAULT FALSE,
  valor_padrao_prestador NUMERIC(12,2),
  checklist_padrao JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evento_templates_org_created
  ON evento_templates (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS standardized_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  test_name TEXT NOT NULL,
  score NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  interpretation TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_standardized_test_results_patient_created
  ON standardized_test_results (patient_id, created_at DESC);

-- 0041_clinical_analytics_batch.sql
CREATE TABLE IF NOT EXISTS evolution_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  name TEXT,
  tipo TEXT NOT NULL DEFAULT 'fisioterapia',
  descricao TEXT,
  description TEXT,
  conteudo TEXT NOT NULL DEFAULT '',
  content TEXT,
  campos_padrao JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE evolution_templates
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS nome TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'fisioterapia',
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS conteudo TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS campos_padrao JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_evolution_templates_org_tipo_ativo
  ON evolution_templates (organization_id, tipo, ativo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evolution_templates_org_nome
  ON evolution_templates (organization_id, nome);

CREATE TABLE IF NOT EXISTS exercise_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id TEXT,
  qr_code TEXT UNIQUE,
  title TEXT NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  validity_days INTEGER NOT NULL DEFAULT 30,
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'ativo',
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  completed_exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_prescriptions_org_patient_created
  ON exercise_prescriptions (organization_id, patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_prescriptions_org_status_created
  ON exercise_prescriptions (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_prescriptions_qr_code
  ON exercise_prescriptions (qr_code);

CREATE TABLE IF NOT EXISTS patient_outcome_measures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  measure_type TEXT NOT NULL,
  measure_name TEXT NOT NULL,
  score NUMERIC(10,2) NOT NULL,
  normalized_score NUMERIC(10,2),
  min_score NUMERIC(10,2),
  max_score NUMERIC(10,2),
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  body_part TEXT,
  context TEXT,
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_outcome_measures_org_patient_date
  ON patient_outcome_measures (organization_id, patient_id, measurement_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_outcome_measures_org_type_name
  ON patient_outcome_measures (organization_id, measure_type, measure_name);

CREATE TABLE IF NOT EXISTS patient_goal_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  goal_title TEXT NOT NULL,
  goal_description TEXT,
  goal_category TEXT NOT NULL,
  target_value NUMERIC(10,2),
  current_value NUMERIC(10,2),
  initial_value NUMERIC(10,2),
  unit TEXT,
  target_date DATE,
  status TEXT NOT NULL,
  progress_percentage NUMERIC(5,2),
  achieved_at TIMESTAMPTZ,
  achievement_milestone TEXT,
  related_pathology TEXT,
  associated_plan_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_goal_tracking_org_patient_target
  ON patient_goal_tracking (organization_id, patient_id, target_date ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_patient_goal_tracking_org_status
  ON patient_goal_tracking (organization_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_lifecycle_events_org_patient_date
  ON patient_lifecycle_events (organization_id, patient_id, event_date ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS clinical_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_name TEXT NOT NULL,
  benchmark_category TEXT NOT NULL,
  pathology TEXT,
  population_segment TEXT,
  median_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  mean_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  percentile_25 NUMERIC(10,2) NOT NULL DEFAULT 0,
  percentile_75 NUMERIC(10,2) NOT NULL DEFAULT 0,
  standard_deviation NUMERIC(10,2),
  sample_size INTEGER NOT NULL DEFAULT 0,
  data_source TEXT NOT NULL DEFAULT 'manual',
  reference TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_benchmarks_category_name
  ON clinical_benchmarks (benchmark_category, benchmark_name);

CREATE TABLE IF NOT EXISTS patient_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  insight_text TEXT NOT NULL,
  confidence_score NUMERIC(5,4),
  related_metric TEXT,
  metric_value NUMERIC(10,2),
  comparison_value NUMERIC(10,2),
  comparison_benchmark_id UUID,
  is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  action_taken TEXT,
  actioned_at TIMESTAMPTZ,
  actioned_by TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_insights_org_patient_created
  ON patient_insights (organization_id, patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_insights_org_patient_ack
  ON patient_insights (organization_id, patient_id, is_acknowledged, created_at DESC);

ALTER TABLE standardized_test_results
  ADD COLUMN IF NOT EXISTS scale_name TEXT,
  ADD COLUMN IF NOT EXISTS responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS applied_by TEXT,
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS notes TEXT;

UPDATE standardized_test_results
SET
  scale_name = COALESCE(scale_name, UPPER(test_type), UPPER(test_name)),
  responses = COALESCE(responses, answers, '{}'::jsonb),
  applied_at = COALESCE(applied_at, created_at, NOW()),
  applied_by = COALESCE(applied_by, created_by)
WHERE
  scale_name IS NULL
  OR responses IS NULL
  OR applied_at IS NULL
  OR applied_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_standardized_test_results_org_patient_applied
  ON standardized_test_results (organization_id, patient_id, applied_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_standardized_test_results_org_scale
  ON standardized_test_results (organization_id, scale_name);

CREATE OR REPLACE FUNCTION calculate_patient_risk(target_patient_id UUID)
RETURNS TABLE (
  id UUID,
  patient_id UUID,
  calculated_at TIMESTAMPTZ,
  dropout_risk_score NUMERIC,
  no_show_risk_score NUMERIC,
  poor_outcome_risk_score NUMERIC,
  overall_risk_score NUMERIC,
  risk_level TEXT,
  risk_factors JSONB,
  protective_factors JSONB,
  recommended_actions TEXT[],
  days_since_last_session INTEGER,
  upcoming_appointments INTEGER,
  session_attendance_rate NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
AS $$
  WITH appointment_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE status::text IN ('completed', 'no_show', 'atendido', 'faltou', 'faltou_sem_aviso', 'faltou_com_aviso'))::INT AS relevant_appointments,
      COUNT(*) FILTER (WHERE status::text IN ('no_show', 'faltou', 'faltou_sem_aviso', 'faltou_com_aviso'))::INT AS no_show_count,
      COUNT(*) FILTER (
        WHERE status::text IN ('scheduled', 'confirmed', 'agendado', 'presenca_confirmada')
          AND ((date)::timestamp + start_time) > NOW()
      )::INT AS upcoming_appointments
    FROM appointments
    WHERE patient_id = target_patient_id
  ),
  metrics AS (
    SELECT
      MAX(session_date)::date AS last_session_date,
      AVG(COALESCE(pain_reduction, 0))::NUMERIC AS avg_pain_reduction,
      AVG(COALESCE(functional_improvement, 0))::NUMERIC AS avg_functional_improvement
    FROM patient_session_metrics
    WHERE patient_id = target_patient_id
  ),
  goals AS (
    SELECT
      COUNT(*)::INT AS total_goals,
      COUNT(*) FILTER (WHERE status = 'achieved')::INT AS achieved_goals
    FROM patient_goal_tracking
    WHERE patient_id = target_patient_id
  ),
  derived AS (
    SELECT
      COALESCE((CURRENT_DATE - m.last_session_date), 30)::INT AS days_since_last_session,
      a.upcoming_appointments,
      CASE
        WHEN a.relevant_appointments > 0
          THEN ROUND(((a.relevant_appointments - a.no_show_count)::NUMERIC / a.relevant_appointments::NUMERIC) * 100, 2)
        ELSE 70::NUMERIC
      END AS session_attendance_rate,
      ROUND(
        LEAST(
          100,
          GREATEST(
            0,
            COALESCE((CURRENT_DATE - m.last_session_date), 30) * 1.8
            + CASE WHEN a.upcoming_appointments = 0 THEN 18 ELSE 0 END
            + CASE
                WHEN a.relevant_appointments > 0
                  THEN (a.no_show_count::NUMERIC / a.relevant_appointments::NUMERIC) * 35
                ELSE 12
              END
          )
        ),
        2
      ) AS dropout_risk_score,
      ROUND(
        LEAST(
          100,
          GREATEST(
            0,
            CASE
              WHEN a.relevant_appointments > 0
                THEN (a.no_show_count::NUMERIC / a.relevant_appointments::NUMERIC) * 100
              ELSE 10
            END
          )
        ),
        2
      ) AS no_show_risk_score,
      ROUND(
        LEAST(
          100,
          GREATEST(
            0,
            (CASE WHEN m.avg_functional_improvement IS NULL THEN 38 ELSE 55 - m.avg_functional_improvement END)
            + (CASE WHEN m.avg_pain_reduction IS NULL THEN 22 ELSE 45 - m.avg_pain_reduction END)
            + (CASE
                WHEN g.total_goals > 0 AND g.achieved_goals = 0 THEN 10
                WHEN g.total_goals = 0 THEN 6
                ELSE 0
              END)
          )
        ),
        2
      ) AS poor_outcome_risk_score,
      m.avg_pain_reduction,
      m.avg_functional_improvement,
      g.total_goals,
      g.achieved_goals,
      a.no_show_count
    FROM appointment_stats a
    CROSS JOIN metrics m
    CROSS JOIN goals g
  )
  SELECT
    gen_random_uuid() AS id,
    target_patient_id AS patient_id,
    NOW() AS calculated_at,
    d.dropout_risk_score,
    d.no_show_risk_score,
    d.poor_outcome_risk_score,
    ROUND((d.dropout_risk_score * 0.45) + (d.no_show_risk_score * 0.25) + (d.poor_outcome_risk_score * 0.30), 2) AS overall_risk_score,
    CASE
      WHEN ((d.dropout_risk_score * 0.45) + (d.no_show_risk_score * 0.25) + (d.poor_outcome_risk_score * 0.30)) >= 75 THEN 'critical'
      WHEN ((d.dropout_risk_score * 0.45) + (d.no_show_risk_score * 0.25) + (d.poor_outcome_risk_score * 0.30)) >= 60 THEN 'high'
      WHEN ((d.dropout_risk_score * 0.45) + (d.no_show_risk_score * 0.25) + (d.poor_outcome_risk_score * 0.30)) >= 35 THEN 'medium'
      ELSE 'low'
    END AS risk_level,
    jsonb_build_object(
      'attendance_rate', d.session_attendance_rate,
      'days_since_last_session', d.days_since_last_session,
      'no_show_count', d.no_show_count,
      'upcoming_appointments', d.upcoming_appointments,
      'avg_pain_reduction', COALESCE(d.avg_pain_reduction, 0),
      'avg_functional_improvement', COALESCE(d.avg_functional_improvement, 0),
      'goals_total', d.total_goals,
      'goals_achieved', d.achieved_goals
    ) AS risk_factors,
    jsonb_build_object(
      'has_upcoming_appointments', d.upcoming_appointments > 0,
      'goal_completion_ratio', CASE WHEN d.total_goals > 0 THEN ROUND((d.achieved_goals::NUMERIC / d.total_goals::NUMERIC) * 100, 2) ELSE 0 END,
      'recent_sessions', CASE WHEN d.days_since_last_session <= 14 THEN true ELSE false END
    ) AS protective_factors,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN d.upcoming_appointments = 0 THEN 'Agendar contato ativo e próxima sessão.' END,
      CASE WHEN d.session_attendance_rate < 75 THEN 'Reforçar adesão e confirmar presença com antecedência.' END,
      CASE WHEN COALESCE(d.avg_functional_improvement, 0) < 10 THEN 'Reavaliar progressão funcional e ajustar o plano terapêutico.' END,
      CASE WHEN COALESCE(d.avg_pain_reduction, 0) < 10 THEN 'Investigar barreiras clínicas para redução de dor.' END
    ]::TEXT[], NULL) AS recommended_actions,
    d.days_since_last_session,
    d.upcoming_appointments,
    d.session_attendance_rate,
    NOW() AS created_at
  FROM derived d
$$;
