CREATE TABLE IF NOT EXISTS exercise_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_type TEXT,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration INTEGER, -- seconds
  repetitions INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  metrics JSONB NOT NULL DEFAULT '{}',
  posture_issues_summary JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_sessions_patient
  ON exercise_sessions (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_sessions_exercise
  ON exercise_sessions (exercise_id, created_at DESC);
