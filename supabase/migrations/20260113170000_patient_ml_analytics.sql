-- Migration: Patient ML Analytics and Prediction System
-- Date: 2025-01-13
-- Description: Creates comprehensive tables for machine learning data collection,
--              patient predictions, lifecycle tracking, and outcome measurements

-- ============================================================================
-- PATIENT LIFECYCLE TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patient_lifecycle_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'lead_created', 'first_contact', 'first_appointment_scheduled',
    'first_appointment_completed', 'treatment_started', 'treatment_paused',
    'treatment_resumed', 'treatment_completed', 'discharged',
    'follow_up_scheduled', 'reactivation', 'churned'
  )),
  event_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

COMMENT ON TABLE public.patient_lifecycle_events IS 'Tracks all lifecycle events for patients to analyze journey patterns';
COMMENT ON COLUMN public.patient_lifecycle_events.event_type IS 'Type of lifecycle event that occurred';
COMMENT ON COLUMN public.patient_lifecycle_events.metadata IS 'Additional context: source, campaign, referral, etc.';

-- ============================================================================
-- PATIENT OUTCOME MEASURES (PROMs - Patient Reported Outcome Measures)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patient_outcome_measures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  measure_type TEXT NOT NULL CHECK (measure_type IN (
    'pain_scale', 'functional_scale', 'quality_of_life',
    'disability_index', 'satisfaction', 'adherence'
  )),
  measure_name TEXT NOT NULL, -- e.g., "VAS Pain", "Oswestry", "SF-36"
  score NUMERIC NOT NULL,
  normalized_score NUMERIC, -- 0-100 scale for comparison
  min_score NUMERIC DEFAULT 0,
  max_score NUMERIC DEFAULT 10,
  measurement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  body_part TEXT, -- e.g., "lower_back", "knee_left", "shoulder_right"
  context TEXT, -- e.g., "at_rest", "after_activity", "morning"
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.patient_outcome_measures IS 'Patient-reported outcome measures for tracking progress over time';
COMMENT ON COLUMN public.patient_outcome_measures.normalized_score IS 'Score normalized to 0-100 scale for comparison across measures';

-- ============================================================================
-- PATIENT SESSION METRICS (Detailed tracking per session)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patient_session_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id UUID, -- Can link to appointments or soap_records
  session_date TIMESTAMP WITH TIME ZONE NOT NULL,
  session_number INTEGER, -- Sequential session number for the patient

  -- Pre-session metrics
  pain_level_before INTEGER CHECK (pain_level_before BETWEEN 0 AND 10),
  functional_score_before INTEGER CHECK (functional_score_before BETWEEN 0 AND 100),
  mood_before TEXT CHECK (mood_before IN ('excellent', 'good', 'fair', 'poor', 'very_poor')),

  -- Session details
  duration_minutes INTEGER,
  treatment_type TEXT,
  techniques_used TEXT[],
  areas_treated TEXT[],

  -- Post-session metrics
  pain_level_after INTEGER CHECK (pain_level_after BETWEEN 0 AND 10),
  functional_score_after INTEGER CHECK (functional_score_after BETWEEN 0 AND 100),
  mood_after TEXT CHECK (mood_after IN ('excellent', 'good', 'fair', 'poor', 'very_poor')),
  patient_satisfaction INTEGER CHECK (patient_satisfaction BETWEEN 1 AND 5),

  -- Improvement calculated
  pain_reduction NUMERIC GENERATED ALWAYS AS (
    CASE WHEN pain_level_before IS NOT NULL AND pain_level_after IS NOT NULL
      THEN pain_level_before::NUMERIC - pain_level_after::NUMERIC
      ELSE NULL END
  ) STORED,
  functional_improvement NUMERIC GENERATED ALWAYS AS (
    CASE WHEN functional_score_before IS NOT NULL AND functional_score_after IS NOT NULL
      THEN functional_score_after::NUMERIC - functional_score_before::NUMERIC
      ELSE NULL END
    ) STORED,

  notes TEXT,
  therapist_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.patient_session_metrics IS 'Detailed metrics collected during each treatment session';
COMMENT ON COLUMN public.patient_session_metrics.pain_reduction IS 'Calculated reduction in pain (positive = improvement)';

-- ============================================================================
-- PREDICTIONS AND ML OUTPUTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patient_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL CHECK (prediction_type IN (
    'outcome_success', 'dropout_risk', 'recovery_timeline',
    'optimal_session_frequency', 'pain_projection', 'functional_projection'
  )),
  prediction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Input features used
  features JSONB DEFAULT '{}',

  -- Prediction outputs
  predicted_value NUMERIC,
  predicted_class TEXT,
  confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),
  confidence_interval JSONB, -- e.g., {"lower": 0.7, "upper": 0.9}

  -- Timeframe for prediction
  target_date DATE,
  timeframe_days INTEGER,

  -- Actual outcome (for model validation)
  actual_value NUMERIC,
  actual_class TEXT,
  outcome_determined_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  model_version TEXT DEFAULT 'v1.0',
  model_name TEXT,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.patient_predictions IS 'ML predictions for patient outcomes and risks';
COMMENT ON COLUMN public.patient_predictions.features IS 'Input features used for the prediction';
COMMENT ON COLUMN public.patient_predictions.confidence_score IS 'Model confidence (0-1)';

-- ============================================================================
-- PATIENT RISK SCORES (Composite risk analysis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patient_risk_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Individual risk factors
  dropout_risk_score INTEGER CHECK (dropout_risk_score BETWEEN 0 AND 100),
  no_show_risk_score INTEGER CHECK (no_show_risk_score BETWEEN 0 AND 100),
  poor_outcome_risk_score INTEGER CHECK (poor_outcome_risk_score BETWEEN 0 AND 100),

  -- Overall composite risk
  overall_risk_score INTEGER CHECK (overall_risk_score BETWEEN 0 AND 100),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

  -- Contributing factors
  risk_factors JSONB DEFAULT '{}',
  protective_factors JSONB DEFAULT '{}',

  -- Recommendations
  recommended_actions TEXT[],

  -- Context
  days_since_last_session INTEGER,
  upcoming_appointments INTEGER,
  session_attendance_rate NUMERIC,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.patient_risk_scores IS 'Calculated risk scores for patient retention and outcomes';

-- ============================================================================
-- PATIENT GOALS AND TARGETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patient_goal_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  goal_title TEXT NOT NULL,
  goal_description TEXT,
  goal_category TEXT CHECK (goal_category IN (
    'pain_reduction', 'functional_improvement', 'range_of_motion',
    'strength', 'endurance', 'activities_of_daily_living', 'return_to_sport', 'other'
  )),

  -- Target definition
  target_value NUMERIC,
  current_value NUMERIC,
  initial_value NUMERIC,
  unit TEXT,
  target_date DATE,

  -- Status
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'achieved', 'on_hold', 'cancelled')) DEFAULT 'not_started',
  progress_percentage NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN initial_value IS NOT NULL AND target_value IS NOT NULL AND initial_value != target_value
        THEN ROUND(((current_value - initial_value) / (target_value - initial_value) * 100)::NUMERIC, 2)
      WHEN current_value IS NOT NULL AND target_value IS NOT NULL
        THEN ROUND((current_value / target_value * 100)::NUMERIC, 2)
      ELSE NULL
    END
  ) STORED,

  -- Achievement
  achieved_at TIMESTAMP WITH TIME ZONE,
  achievement_milestone TEXT,

  -- Relationships
  related_pathology TEXT,
  associated_plan_id UUID,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.patient_goal_tracking IS 'Tracks patient goals and progress toward targets';

-- ============================================================================
-- ML TRAINING DATA (Anonymized for model training)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ml_training_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_hash TEXT NOT NULL, -- Anonymized patient identifier

  -- Demographic features (anonymized/binned)
  age_group TEXT, -- e.g., "18-30", "31-50", etc.
  gender TEXT,

  -- Clinical features
  primary_pathology TEXT,
  chronic_condition BOOLEAN,
  baseline_pain_level INTEGER,
  baseline_functional_score INTEGER,

  -- Treatment features
  treatment_type TEXT,
  session_frequency_weekly NUMERIC,
  total_sessions INTEGER,

  -- Engagement features
  attendance_rate NUMERIC,
  home_exercise_compliance NUMERIC,
  portal_login_frequency NUMERIC,

  -- Outcome (what we're predicting)
  outcome_category TEXT, -- 'success', 'partial', 'poor'
  sessions_to_discharge INTEGER,
  pain_reduction_percentage NUMERIC,
  functional_improvement_percentage NUMERIC,
  patient_satisfaction_score INTEGER,

  -- Metadata
  data_collection_period_start DATE,
  data_collection_period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ml_training_data IS 'Anonymized training data for machine learning models';

-- ============================================================================
-- CLINICAL BENCHMARKS (For comparison)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.clinical_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  benchmark_name TEXT NOT NULL,
  benchmark_category TEXT NOT NULL, -- e.g., 'recovery_time', 'pain_reduction', 'functional_gain'
  pathology TEXT,
  population_segment TEXT, -- e.g., 'adults_18_65', 'elderly_65plus'

  -- Benchmark values
  median_value NUMERIC,
  mean_value NUMERIC,
  percentile_25 NUMERIC,
  percentile_75 NUMERIC,
  standard_deviation NUMERIC,

  -- Context
  sample_size INTEGER,
  data_source TEXT,
  reference TEXT,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clinical_benchmarks IS 'Clinical benchmark data for patient comparison';

-- Insert initial benchmark data
INSERT INTO public.clinical_benchmarks (benchmark_name, benchmark_category, pathology, median_value, mean_value, percentile_25, percentile_75, sample_size, data_source) VALUES
  ('Low Back Pain Recovery Time', 'recovery_time', 'low_back_pain', 42, 45, 28, 60, 1000, 'internal_data'),
  ('Knee Pain Recovery Time', 'recovery_time', 'knee_pain', 35, 38, 21, 49, 800, 'internal_data'),
  ('Shoulder Pain Recovery Time', 'recovery_time', 'shoulder_pain', 28, 32, 18, 42, 600, 'internal_data'),
  ('Typical Pain Reduction Rate', 'pain_reduction', null, 60, 58, 40, 80, 2000, 'internal_data'),
  ('Typical Functional Improvement', 'functional_improvement', null, 45, 48, 25, 70, 1800, 'internal_data')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PATIENT INSIGHTS (AI-generated insights)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patient_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'trend_alert', 'milestone_achieved', 'risk_detected',
    'recommendation', 'comparison', 'progress_summary'
  )),
  insight_text TEXT NOT NULL,
  confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),

  -- Related data
  related_metric TEXT,
  metric_value NUMERIC,
  comparison_value NUMERIC,
  comparison_benchmark_id UUID REFERENCES public.clinical_benchmarks(id),

  -- Status
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES auth.users(id),

  -- Action taken
  action_taken TEXT,
  actioned_at TIMESTAMP WITH TIME ZONE,
  actioned_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days')
);

COMMENT ON TABLE public.patient_insights IS 'AI-generated and curated insights for individual patients';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_patient ON public.patient_lifecycle_events(patient_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_type ON public.patient_lifecycle_events(event_type, event_date);
CREATE INDEX IF NOT EXISTS idx_outcome_measures_patient_date ON public.patient_outcome_measures(patient_id, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_outcome_measures_type ON public.patient_outcome_measures(measure_type, measurement_date);
CREATE INDEX IF NOT EXISTS idx_session_metrics_patient ON public.patient_session_metrics(patient_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_session_metrics_date ON public.patient_session_metrics(session_date);
CREATE INDEX IF NOT EXISTS idx_predictions_patient_active ON public.patient_predictions(patient_id, is_active, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON public.patient_predictions(prediction_type, prediction_date);
CREATE INDEX IF NOT EXISTS idx_risk_scores_patient ON public.patient_risk_scores(patient_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_scores_level ON public.patient_risk_scores(risk_level, overall_risk_score);
CREATE INDEX IF NOT EXISTS idx_goal_tracking_patient ON public.patient_goal_tracking(patient_id, status, target_date);
CREATE INDEX IF NOT EXISTS idx_insights_patient_active ON public.patient_insights(patient_id, is_acknowledged, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_type ON public.patient_insights(insight_type, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================
ALTER TABLE public.patient_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_outcome_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_session_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_goal_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_insights ENABLE ROW LEVEL SECURITY;

-- Staff can view all patient analytics
CREATE POLICY "Staff can view lifecycle events" ON public.patient_lifecycle_events
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'fisioterapeuta')
  ));

CREATE POLICY "Staff can insert lifecycle events" ON public.patient_lifecycle_events
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'fisioterapeuta')
  ));

CREATE POLICY "Staff can view outcome measures" ON public.patient_outcome_measures
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'fisioterapeuta')
  ));

CREATE POLICY "Staff can manage outcome measures" ON public.patient_outcome_measures
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'fisioterapeuta')
  ));

CREATE POLICY "Staff can view session metrics" ON public.patient_session_metrics
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'fisioterapeuta')
  ));

CREATE POLICY "Staff can insert session metrics" ON public.patient_session_metrics
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'fisioterapeuta')
  ));

CREATE POLICY "Staff can view predictions" ON public.patient_predictions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'fisioterapeuta')
  ));

CREATE POLICY "System can manage predictions" ON public.patient_predictions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Staff can view risk scores" ON public.patient_risk_scores
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'fisioterapeuta')
  ));

CREATE POLICY "Staff can view goals" ON public.patient_goal_tracking
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'fisioterapeuta')
  ));

CREATE POLICY "Staff can manage goals" ON public.patient_goal_tracking
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'fisioterapeuta')
  ));

CREATE POLICY "Admin can manage training data" ON public.ml_training_data
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Everyone can view benchmarks" ON public.clinical_benchmarks
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage benchmarks" ON public.clinical_benchmarks
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Staff can view insights" ON public.patient_insights
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'fisioterapeuta')
  ));

CREATE POLICY "Staff can acknowledge insights" ON public.patient_insights
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'fisioterapeuta')
  ));

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate patient risk score
CREATE OR REPLACE FUNCTION public.calculate_patient_risk(p_patient_id UUID)
RETURNS TABLE (
  dropout_risk INTEGER,
  no_show_risk INTEGER,
  poor_outcome_risk INTEGER,
  overall_risk INTEGER,
  risk_level TEXT,
  risk_factors JSONB,
  protective_factors JSONB
) AS $$
DECLARE
  v_days_since_last_session INTEGER;
  v_attendance_rate NUMERIC;
  v_cancellation_rate NUMERIC;
  v_total_sessions INTEGER;
  v_avg_pain_reduction NUMERIC;
  v_current_trend TEXT;
  factors JSONB := '{}'::JSONB;
  protective JSONB := '{}'::JSONB;
BEGIN
  -- Get days since last session
  SELECT EXTRACT(DAY FROM AGE(NOW(), MAX(session_date)))::INTEGER
  INTO v_days_since_last_session
  FROM public.patient_session_metrics
  WHERE patient_id = p_patient_id;

  IF v_days_since_last_session IS NULL THEN
    v_days_since_last_session := 365;
  END IF;

  -- Get attendance metrics
  SELECT
    COUNT(*) FILTER (WHERE status = 'concluido')::NUMERIC / NULLIF(COUNT(*), 0),
    COUNT(*) FILTER (WHERE status = 'cancelado')::NUMERIC / NULLIF(COUNT(*), 0),
    COUNT(*)
  INTO v_attendance_rate, v_cancellation_rate, v_total_sessions
  FROM public.appointments
  WHERE patient_id = p_patient_id
    AND appointment_date >= NOW() - INTERVAL '90 days';

  IF v_attendance_rate IS NULL THEN v_attendance_rate := 0; END IF;
  IF v_cancellation_rate IS NULL THEN v_cancellation_rate := 0; END IF;
  IF v_total_sessions IS NULL THEN v_total_sessions := 0; END IF;

  -- Get average pain reduction
  SELECT AVG(pain_reduction)
  INTO v_avg_pain_reduction
  FROM public.patient_session_metrics
  WHERE patient_id = p_patient_id
    AND pain_reduction IS NOT NULL;

  -- Calculate risk scores
  factors := factors || jsonb_build_object(
    'days_since_last_session', v_days_since_last_session,
    'attendance_rate', ROUND(v_attendance_rate::NUMERIC, 2),
    'cancellation_rate', ROUND(v_cancellation_rate::NUMERIC, 2),
    'total_sessions', v_total_sessions
  );

  RETURN QUERY SELECT
    -- Dropout risk
    CASE
      WHEN v_days_since_last_session > 60 THEN 80 + LEAST(20, (v_days_since_last_session - 60) / 3)
      WHEN v_days_since_last_session > 30 THEN 50 + LEAST(30, (v_days_since_last_session - 30) / 2)
      WHEN v_cancellation_rate > 0.3 THEN 60 + (v_cancellation_rate * 100)::INTEGER
      WHEN v_total_sessions <= 3 THEN 40
      ELSE GREATEST(0, 30 - v_attendance_rate * 50)::INTEGER
    END::INTEGER AS dropout_risk,

    -- No-show risk (based on cancellation rate)
    LEAST(100, ROUND(v_cancellation_rate * 100)::INTEGER) AS no_show_risk,

    -- Poor outcome risk (based on pain trends)
    CASE
      WHEN v_avg_pain_reduction IS NULL THEN 50
      WHEN v_avg_pain_reduction < 0 THEN 80
      WHEN v_avg_pain_reduction < 1 THEN 60
      WHEN v_avg_pain_reduction < 2 THEN 30
      ELSE 10
    END::INTEGER AS poor_outcome_risk,

    -- Overall risk (weighted average)
    CASE
      WHEN v_days_since_last_session > 90 THEN 90
      WHEN v_days_since_last_session > 60 THEN 70
      WHEN v_cancellation_rate > 0.4 THEN 75
      WHEN v_total_sessions <= 2 AND v_days_since_last_session > 14 THEN 60
      ELSE LEAST(100, (
        CASE
          WHEN v_days_since_last_session > 60 THEN 70 + LEAST(30, (v_days_since_last_session - 60) / 3)
          WHEN v_days_since_last_session > 30 THEN 40 + LEAST(30, (v_days_since_last_session - 30) / 2)
          WHEN v_cancellation_rate > 0.3 THEN 50 + (v_cancellation_rate * 100)::INTEGER
          WHEN v_total_sessions <= 3 THEN 30
          ELSE GREATEST(0, 20 - v_attendance_rate * 40)::INTEGER
        END
      ))::INTEGER
    END::INTEGER AS overall_risk,

    -- Risk level category
    CASE
      WHEN LEAST(100, (
        CASE
          WHEN v_days_since_last_session > 60 THEN 70 + LEAST(30, (v_days_since_last_session - 60) / 3)
          WHEN v_days_since_last_session > 30 THEN 40 + LEAST(30, (v_days_since_last_session - 30) / 2)
          WHEN v_cancellation_rate > 0.3 THEN 50 + (v_cancellation_rate * 100)::INTEGER
          WHEN v_total_sessions <= 3 THEN 30
          ELSE GREATEST(0, 20 - v_attendance_rate * 40)::INTEGER
        END
      )) >= 70 THEN 'critical'
      WHEN LEAST(100, (
        CASE
          WHEN v_days_since_last_session > 60 THEN 70 + LEAST(30, (v_days_since_last_session - 60) / 3)
          WHEN v_days_since_last_session > 30 THEN 40 + LEAST(30, (v_days_since_last_session - 30) / 2)
          WHEN v_cancellation_rate > 0.3 THEN 50 + (v_cancellation_rate * 100)::INTEGER
          WHEN v_total_sessions <= 3 THEN 30
          ELSE GREATEST(0, 20 - v_attendance_rate * 40)::INTEGER
        END
      )) >= 50 THEN 'high'
      WHEN LEAST(100, (
        CASE
          WHEN v_days_since_last_session > 60 THEN 70 + LEAST(30, (v_days_since_last_session - 60) / 3)
          WHEN v_days_since_last_session > 30 THEN 40 + LEAST(30, (v_days_since_last_session - 30) / 2)
          WHEN v_cancellation_rate > 0.3 THEN 50 + (v_cancellation_rate * 100)::INTEGER
          WHEN v_total_sessions <= 3 THEN 30
          ELSE GREATEST(0, 20 - v_attendance_rate * 40)::INTEGER
        END
      )) >= 30 THEN 'medium'
      ELSE 'low'
    END::TEXT AS risk_level,

    factors AS risk_factors,
    protective AS protective_factors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create/update patient risk score
CREATE OR REPLACE FUNCTION public.update_patient_risk_score(p_patient_id UUID)
RETURNS public.patient_risk_scores AS $$
DECLARE
  v_risk RECORD;
  v_result public.patient_risk_scores;
BEGIN
  -- Get calculated risk
  SELECT * INTO v_risk FROM public.calculate_patient_risk(p_patient_id);

  -- Check if existing record exists
  INSERT INTO public.patient_risk_scores (
    patient_id,
    dropout_risk_score,
    no_show_risk_score,
    poor_outcome_risk_score,
    overall_risk_score,
    risk_level,
    risk_factors,
    protective_factors,
    days_since_last_session
  ) VALUES (
    p_patient_id,
    v_risk.dropout_risk,
    v_risk.no_show_risk,
    v_risk.poor_outcome_risk,
    v_risk.overall_risk,
    v_risk.risk_level,
    v_risk.risk_factors,
    v_risk.protective_factors,
    (v_risk.risk_factors->>'days_since_last_session')::INTEGER
  )
  ON CONFLICT DO NOTHING;

  SELECT * INTO v_result FROM public.patient_risk_scores
  WHERE patient_id = p_patient_id
  ORDER BY calculated_at DESC
  LIMIT 1;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate patient progress summary
CREATE OR REPLACE FUNCTION public.get_patient_progress_summary(p_patient_id UUID)
RETURNS TABLE (
  total_sessions INTEGER,
  avg_pain_reduction NUMERIC,
  total_pain_reduction INTEGER,
  avg_functional_improvement NUMERIC,
  current_pain_level INTEGER,
  initial_pain_level INTEGER,
  goals_achieved INTEGER,
  goals_in_progress INTEGER,
  overall_progress_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM public.patient_session_metrics WHERE patient_id = p_patient_id) AS total_sessions,

    (SELECT AVG(pain_reduction) FROM public.patient_session_metrics
     WHERE patient_id = p_patient_id AND pain_reduction IS NOT NULL) AS avg_pain_reduction,

    (SELECT COALESCE(
      (SELECT pain_level_before FROM public.patient_session_metrics
       WHERE patient_id = p_patient_id AND pain_level_before IS NOT NULL
       ORDER BY session_date ASC LIMIT 1), 0) -
     (SELECT pain_level_after FROM public.patient_session_metrics
      WHERE patient_id = p_patient_id AND pain_level_after IS NOT NULL
      ORDER BY session_date DESC LIMIT 1)
    )::INTEGER AS total_pain_reduction,

    (SELECT AVG(functional_improvement) FROM public.patient_session_metrics
     WHERE patient_id = p_patient_id AND functional_improvement IS NOT NULL) AS avg_functional_improvement,

    (SELECT pain_level_after FROM public.patient_session_metrics
     WHERE patient_id = p_patient_id AND pain_level_after IS NOT NULL
     ORDER BY session_date DESC LIMIT 1) AS current_pain_level,

    (SELECT pain_level_before FROM public.patient_session_metrics
     WHERE patient_id = p_patient_id AND pain_level_before IS NOT NULL
     ORDER BY session_date ASC LIMIT 1) AS initial_pain_level,

    (SELECT COUNT(*)::INTEGER FROM public.patient_goal_tracking
     WHERE patient_id = p_patient_id AND status = 'achieved') AS goals_achieved,

    (SELECT COUNT(*)::INTEGER FROM public.patient_goal_tracking
     WHERE patient_id = p_patient_id AND status = 'in_progress') AS goals_in_progress,

    (SELECT AVG(progress_percentage) FROM public.patient_goal_tracking
     WHERE patient_id = p_patient_id AND status IN ('in_progress', 'achieved')) AS overall_progress_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_patient_risk TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_patient_risk_score TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_patient_progress_summary TO authenticated;
