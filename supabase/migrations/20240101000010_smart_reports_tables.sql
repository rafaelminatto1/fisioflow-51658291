-- Create adherence_reports table
CREATE TABLE IF NOT EXISTS adherence_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES exercise_plans(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  total_exercises INTEGER NOT NULL DEFAULT 0,
  completed_exercises INTEGER NOT NULL DEFAULT 0,
  adherence_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  average_pain_level DECIMAL(3,1) NOT NULL DEFAULT 0,
  average_functional_score DECIMAL(3,1) NOT NULL DEFAULT 0,
  progression_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  recommendations TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create progress_reports table
CREATE TABLE IF NOT EXISTS progress_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES exercise_plans(id) ON DELETE CASCADE,
  report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('weekly', 'monthly', 'custom')),
  metrics JSONB NOT NULL DEFAULT '{}',
  trends JSONB NOT NULL DEFAULT '{}',
  insights TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create report_exports table for tracking exports
CREATE TABLE IF NOT EXISTS report_exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL,
  report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('adherence', 'progress')),
  export_format VARCHAR(10) NOT NULL CHECK (export_format IN ('pdf', 'csv', 'excel')),
  file_path TEXT,
  exported_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_adherence_reports_patient_id ON adherence_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_adherence_reports_plan_id ON adherence_reports(plan_id);
CREATE INDEX IF NOT EXISTS idx_adherence_reports_period ON adherence_reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_adherence_reports_created_at ON adherence_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_progress_reports_patient_id ON progress_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_plan_id ON progress_reports(plan_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_type ON progress_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_progress_reports_created_at ON progress_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_report_exports_report_id ON report_exports(report_id);
CREATE INDEX IF NOT EXISTS idx_report_exports_type ON report_exports(report_type);

-- Enable Row Level Security
ALTER TABLE adherence_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for adherence_reports
CREATE POLICY "Users can view adherence reports for their patients" ON adherence_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = adherence_reports.patient_id
      AND patients.organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create adherence reports for their patients" ON adherence_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = adherence_reports.patient_id 
      AND patients.organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update adherence reports for their patients" ON adherence_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = adherence_reports.patient_id 
      AND patients.organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete adherence reports for their patients" ON adherence_reports
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = adherence_reports.patient_id 
      AND patients.organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Create RLS policies for progress_reports
CREATE POLICY "Users can view progress reports for their patients" ON progress_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = progress_reports.patient_id 
      AND patients.organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create progress reports for their patients" ON progress_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = progress_reports.patient_id 
      AND patients.organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update progress reports for their patients" ON progress_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = progress_reports.patient_id 
      AND patients.organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete progress reports for their patients" ON progress_reports
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = progress_reports.patient_id 
      AND patients.organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Create RLS policies for report_exports
CREATE POLICY "Users can view their own report exports" ON report_exports
  FOR SELECT USING (exported_by = auth.uid());

CREATE POLICY "Users can create report exports" ON report_exports
  FOR INSERT WITH CHECK (exported_by = auth.uid());

-- Create function to calculate comprehensive adherence metrics
CREATE OR REPLACE FUNCTION calculate_comprehensive_adherence(
  p_patient_id UUID,
  p_plan_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  total_exercises INTEGER,
  completed_exercises INTEGER,
  adherence_percentage DECIMAL,
  avg_pain_level DECIMAL,
  avg_functional_score DECIMAL,
  progression_score DECIMAL,
  session_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH exercise_stats AS (
    SELECT 
      COUNT(epi.id) as total_ex,
      COUNT(CASE WHEN pp.exercise_compliance >= 80 THEN 1 END) as completed_ex,
      AVG(pp.pain_level) as avg_pain,
      AVG(pp.functional_score) as avg_function,
      COUNT(pp.id) as sessions
    FROM exercise_plan_items epi
    LEFT JOIN patient_progress pp ON pp.patient_id = p_patient_id
      AND pp.created_at BETWEEN p_start_date AND p_end_date
    WHERE epi.plan_id = p_plan_id
  ),
  progression_calc AS (
    SELECT 
      CASE 
        WHEN COUNT(*) >= 2 THEN
          ((MAX(functional_score) - MIN(functional_score)) / NULLIF(MIN(functional_score), 0)) * 100
        ELSE 0
      END as prog_score
    FROM patient_progress
    WHERE patient_id = p_patient_id
      AND created_at BETWEEN p_start_date AND p_end_date
  )
  SELECT 
    es.total_ex::INTEGER,
    es.completed_ex::INTEGER,
    CASE 
      WHEN es.total_ex > 0 THEN (es.completed_ex::DECIMAL / es.total_ex * 100)
      ELSE 0
    END,
    COALESCE(es.avg_pain, 0)::DECIMAL,
    COALESCE(es.avg_function, 0)::DECIMAL,
    COALESCE(pc.prog_score, 0)::DECIMAL,
    es.sessions::INTEGER
  FROM exercise_stats es
  CROSS JOIN progression_calc pc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate automatic weekly reports
CREATE OR REPLACE FUNCTION generate_weekly_reports()
RETURNS void AS $$
DECLARE
  plan_record RECORD;
  report_data RECORD;
BEGIN
  -- Generate reports for all active plans
  FOR plan_record IN 
    SELECT DISTINCT ep.id as plan_id, ep.patient_id
    FROM exercise_plans ep
    WHERE ep.status = 'active'
      AND ep.created_at <= NOW() - INTERVAL '7 days'
  LOOP
    -- Calculate metrics for the past week
    SELECT * INTO report_data
    FROM calculate_comprehensive_adherence(
      plan_record.patient_id,
      plan_record.plan_id,
      NOW() - INTERVAL '7 days',
      NOW()
    );
    
    -- Only create report if there's meaningful data
    IF report_data.session_count > 0 THEN
      INSERT INTO adherence_reports (
        patient_id,
        plan_id,
        period_start,
        period_end,
        total_exercises,
        completed_exercises,
        adherence_percentage,
        average_pain_level,
        average_functional_score,
        progression_score,
        recommendations
      ) VALUES (
        plan_record.patient_id,
        plan_record.plan_id,
        NOW() - INTERVAL '7 days',
        NOW(),
        report_data.total_exercises,
        report_data.completed_exercises,
        report_data.adherence_percentage,
        report_data.avg_pain_level,
        report_data.avg_functional_score,
        report_data.progression_score,
        CASE 
          WHEN report_data.adherence_percentage < 70 THEN 
            ARRAY['Melhorar aderência aos exercícios']
          WHEN report_data.progression_score > 20 THEN 
            ARRAY['Excelente progresso - considerar progressão']
          ELSE ARRAY['Manter programa atual']
        END
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_adherence_reports_updated_at
  BEFORE UPDATE ON adherence_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_reports_updated_at
  BEFORE UPDATE ON progress_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON adherence_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON progress_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_exports TO authenticated;

-- Grant permissions to anon users (read-only for public reports if needed)
GRANT SELECT ON adherence_reports TO anon;
GRANT SELECT ON progress_reports TO anon;

-- Create view for report summaries
CREATE OR REPLACE VIEW report_summaries AS
SELECT 
  'adherence' as report_type,
  ar.id,
  ar.patient_id,
  p.name as patient_name,
  ar.plan_id,
  ep.name as plan_name,
  ar.adherence_percentage as main_metric,
  ar.created_at
FROM adherence_reports ar
JOIN patients p ON p.id = ar.patient_id
JOIN exercise_plans ep ON ep.id = ar.plan_id

UNION ALL

SELECT 
  'progress' as report_type,
  pr.id,
  pr.patient_id,
  p.name as patient_name,
  pr.plan_id,
  ep.name as plan_name,
  (pr.metrics->>'goal_achievement')::DECIMAL as main_metric,
  pr.created_at
FROM progress_reports pr
JOIN patients p ON p.id = pr.patient_id
JOIN exercise_plans ep ON ep.id = pr.plan_id;

-- Grant permissions on the view
GRANT SELECT ON report_summaries TO authenticated;
GRANT SELECT ON report_summaries TO anon;