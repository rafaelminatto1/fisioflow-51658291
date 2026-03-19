-- Finalizes the remaining Worker-critical tables that had no formal migration coverage.

CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id
  ON organization_members (organization_id, active, role, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id
  ON organization_members (user_id, active, joined_at DESC);

CREATE TABLE IF NOT EXISTS patient_session_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id uuid,
  session_date timestamptz NOT NULL DEFAULT now(),
  session_number integer,
  pain_level_before numeric(10,2),
  functional_score_before numeric(10,2),
  mood_before text,
  duration_minutes integer,
  treatment_type text,
  techniques_used jsonb,
  areas_treated jsonb,
  pain_level_after numeric(10,2),
  functional_score_after numeric(10,2),
  mood_after text,
  patient_satisfaction numeric(10,2),
  pain_reduction numeric(10,2),
  functional_improvement numeric(10,2),
  notes text,
  therapist_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_session_metrics_org_patient_date
  ON patient_session_metrics (organization_id, patient_id, session_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_session_metrics_patient_session
  ON patient_session_metrics (patient_id, session_id);

CREATE TABLE IF NOT EXISTS prescribed_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE SET NULL,
  frequency text,
  sets integer NOT NULL DEFAULT 3,
  reps integer NOT NULL DEFAULT 10,
  duration integer,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescribed_exercises_org_patient_active
  ON prescribed_exercises (organization_id, patient_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescribed_exercises_org_exercise
  ON prescribed_exercises (organization_id, exercise_id);

CREATE TABLE IF NOT EXISTS generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  report_content text NOT NULL,
  date_range_start date,
  date_range_end date,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_org_patient_created
  ON generated_reports (organization_id, patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_reports_org_type_created
  ON generated_reports (organization_id, report_type, created_at DESC);
