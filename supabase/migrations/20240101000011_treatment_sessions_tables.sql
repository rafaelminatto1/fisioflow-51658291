-- Create treatment_sessions table
CREATE TABLE IF NOT EXISTS treatment_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_date TIMESTAMP WITH TIME ZONE NOT NULL,
  session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('consultation', 'treatment', 'evaluation', 'follow_up')),
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  pain_level_before INTEGER NOT NULL CHECK (pain_level_before >= 0 AND pain_level_before <= 10),
  pain_level_after INTEGER NOT NULL CHECK (pain_level_after >= 0 AND pain_level_after <= 10),
  functional_score_before INTEGER NOT NULL CHECK (functional_score_before >= 0 AND functional_score_before <= 100),
  functional_score_after INTEGER NOT NULL CHECK (functional_score_after >= 0 AND functional_score_after <= 100),
  exercises_performed JSONB DEFAULT '[]'::jsonb,
  observations TEXT,
  next_session_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session_exercises table for detailed exercise tracking
CREATE TABLE IF NOT EXISTS session_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES treatment_sessions(id) ON DELETE CASCADE,
  exercise_name VARCHAR(255) NOT NULL,
  sets_planned INTEGER NOT NULL DEFAULT 1,
  sets_completed INTEGER NOT NULL DEFAULT 0,
  reps_planned INTEGER NOT NULL DEFAULT 1,
  reps_completed INTEGER NOT NULL DEFAULT 0,
  weight_kg DECIMAL(5,2),
  duration_seconds INTEGER,
  difficulty_level INTEGER NOT NULL DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
  patient_feedback TEXT,
  therapist_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session_metrics table for calculated metrics
CREATE TABLE IF NOT EXISTS session_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES treatment_sessions(id) ON DELETE CASCADE,
  pain_improvement INTEGER NOT NULL,
  functional_improvement INTEGER NOT NULL,
  exercise_compliance DECIMAL(5,2) NOT NULL DEFAULT 0,
  session_effectiveness DECIMAL(5,2) NOT NULL DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create patient_timeline view
CREATE OR REPLACE VIEW patient_timeline AS
SELECT 
  ts.id as session_id,
  ts.patient_id,
  ts.session_date,
  ts.session_type,
  ts.pain_level_after as pain_level,
  ts.functional_score_after as functional_score,
  ts.status,
  sm.pain_improvement,
  sm.functional_improvement,
  sm.exercise_compliance,
  sm.session_effectiveness,
  p.name as patient_name
FROM treatment_sessions ts
LEFT JOIN session_metrics sm ON ts.id = sm.session_id
LEFT JOIN patients p ON ts.patient_id = p.id
ORDER BY ts.session_date DESC;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_patient_id ON treatment_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_therapist_id ON treatment_sessions(therapist_id);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_date ON treatment_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_status ON treatment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_exercises_session_id ON session_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_session_metrics_session_id ON session_metrics(session_id);

-- Enable Row Level Security
ALTER TABLE treatment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for treatment_sessions
CREATE POLICY "Users can view their own sessions" ON treatment_sessions
  FOR SELECT USING (
    auth.uid() = therapist_id OR 
    auth.uid() IN (
      SELECT user_id FROM patients WHERE id = patient_id
    )
  );

CREATE POLICY "Therapists can insert sessions" ON treatment_sessions
  FOR INSERT WITH CHECK (auth.uid() = therapist_id);

CREATE POLICY "Therapists can update their sessions" ON treatment_sessions
  FOR UPDATE USING (auth.uid() = therapist_id);

CREATE POLICY "Therapists can delete their sessions" ON treatment_sessions
  FOR DELETE USING (auth.uid() = therapist_id);

-- Create RLS policies for session_exercises
CREATE POLICY "Users can view session exercises" ON session_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM treatment_sessions ts 
      WHERE ts.id = session_id AND (
        auth.uid() = ts.therapist_id OR 
        auth.uid() IN (
          SELECT user_id FROM patients WHERE id = ts.patient_id
        )
      )
    )
  );

CREATE POLICY "Therapists can manage session exercises" ON session_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM treatment_sessions ts 
      WHERE ts.id = session_id AND auth.uid() = ts.therapist_id
    )
  );

-- Create RLS policies for session_metrics
CREATE POLICY "Users can view session metrics" ON session_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM treatment_sessions ts 
      WHERE ts.id = session_id AND (
        auth.uid() = ts.therapist_id OR 
        auth.uid() IN (
          SELECT user_id FROM patients WHERE id = ts.patient_id
        )
      )
    )
  );

CREATE POLICY "System can manage session metrics" ON session_metrics
  FOR ALL USING (true);

-- Function to calculate and store session metrics
CREATE OR REPLACE FUNCTION calculate_session_metrics(session_id_param UUID)
RETURNS void AS $$
DECLARE
  session_record treatment_sessions%ROWTYPE;
  total_exercises INTEGER;
  completed_exercises INTEGER;
  exercise_compliance DECIMAL(5,2);
  pain_improvement INTEGER;
  functional_improvement INTEGER;
  session_effectiveness DECIMAL(5,2);
BEGIN
  -- Get session data
  SELECT * INTO session_record FROM treatment_sessions WHERE id = session_id_param;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate exercise compliance
  SELECT COUNT(*) INTO total_exercises FROM session_exercises WHERE session_id = session_id_param;
  
  SELECT COUNT(*) INTO completed_exercises 
  FROM session_exercises 
  WHERE session_id = session_id_param 
    AND sets_completed >= (sets_planned * 0.8);
  
  exercise_compliance := CASE 
    WHEN total_exercises > 0 THEN (completed_exercises::DECIMAL / total_exercises) * 100
    ELSE 0
  END;
  
  -- Calculate improvements
  pain_improvement := session_record.pain_level_before - session_record.pain_level_after;
  functional_improvement := session_record.functional_score_after - session_record.functional_score_before;
  
  -- Calculate session effectiveness
  session_effectiveness := (
    CASE WHEN pain_improvement > 0 THEN 25 ELSE 0 END +
    CASE WHEN functional_improvement > 0 THEN 25 ELSE 0 END +
    (exercise_compliance * 0.5)
  );
  
  session_effectiveness := LEAST(session_effectiveness, 100);
  
  -- Insert or update metrics
  INSERT INTO session_metrics (
    session_id, 
    pain_improvement, 
    functional_improvement, 
    exercise_compliance, 
    session_effectiveness
  ) VALUES (
    session_id_param,
    pain_improvement,
    functional_improvement,
    exercise_compliance,
    session_effectiveness
  )
  ON CONFLICT (session_id) DO UPDATE SET
    pain_improvement = EXCLUDED.pain_improvement,
    functional_improvement = EXCLUDED.functional_improvement,
    exercise_compliance = EXCLUDED.exercise_compliance,
    session_effectiveness = EXCLUDED.session_effectiveness,
    calculated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically calculate metrics when session is completed
CREATE OR REPLACE FUNCTION trigger_calculate_session_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM calculate_session_metrics(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_metrics_on_completion
  AFTER UPDATE ON treatment_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_session_metrics();

-- Function to get patient progress summary
CREATE OR REPLACE FUNCTION get_patient_progress_summary(patient_id_param UUID)
RETURNS TABLE (
  total_sessions INTEGER,
  completed_sessions INTEGER,
  avg_pain_improvement DECIMAL,
  avg_functional_improvement DECIMAL,
  avg_exercise_compliance DECIMAL,
  latest_pain_level INTEGER,
  latest_functional_score INTEGER,
  trend_direction TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH session_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      AVG(sm.pain_improvement) as avg_pain_imp,
      AVG(sm.functional_improvement) as avg_func_imp,
      AVG(sm.exercise_compliance) as avg_compliance
    FROM treatment_sessions ts
    LEFT JOIN session_metrics sm ON ts.id = sm.session_id
    WHERE ts.patient_id = patient_id_param
  ),
  latest_session AS (
    SELECT 
      pain_level_after,
      functional_score_after,
      session_date
    FROM treatment_sessions
    WHERE patient_id = patient_id_param AND status = 'completed'
    ORDER BY session_date DESC
    LIMIT 1
  ),
  trend_calc AS (
    SELECT 
      CASE 
        WHEN AVG(sm.pain_improvement) > 0 AND AVG(sm.functional_improvement) > 0 THEN 'improving'
        WHEN AVG(sm.pain_improvement) < 0 OR AVG(sm.functional_improvement) < 0 THEN 'declining'
        ELSE 'stable'
      END as trend
    FROM treatment_sessions ts
    LEFT JOIN session_metrics sm ON ts.id = sm.session_id
    WHERE ts.patient_id = patient_id_param 
      AND ts.session_date >= NOW() - INTERVAL '30 days'
      AND ts.status = 'completed'
  )
  SELECT 
    ss.total::INTEGER,
    ss.completed::INTEGER,
    COALESCE(ss.avg_pain_imp, 0)::DECIMAL,
    COALESCE(ss.avg_func_imp, 0)::DECIMAL,
    COALESCE(ss.avg_compliance, 0)::DECIMAL,
    COALESCE(ls.pain_level_after, 0)::INTEGER,
    COALESCE(ls.functional_score_after, 0)::INTEGER,
    COALESCE(tc.trend, 'unknown')::TEXT
  FROM session_stats ss
  CROSS JOIN latest_session ls
  CROSS JOIN trend_calc tc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON treatment_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON session_exercises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON session_metrics TO authenticated;
GRANT SELECT ON patient_timeline TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_session_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_patient_progress_summary(UUID) TO authenticated;

-- Grant basic permissions to anon role for public access
GRANT SELECT ON treatment_sessions TO anon;
GRANT SELECT ON session_exercises TO anon;
GRANT SELECT ON session_metrics TO anon;
GRANT SELECT ON patient_timeline TO anon;