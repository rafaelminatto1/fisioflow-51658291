-- Tabela para regras de adaptação automática
CREATE TABLE IF NOT EXISTS adaptation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('pain_increase', 'pain_decrease', 'functional_improvement', 'compliance_low')),
  threshold_value DECIMAL(5,2) NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('increase_intensity', 'decrease_intensity', 'add_exercise', 'remove_exercise', 'modify_duration')),
  adjustment_percentage DECIMAL(5,2) NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para sugestões de adaptação
CREATE TABLE IF NOT EXISTS adaptation_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  exercise_plan_id UUID NOT NULL REFERENCES exercise_plans(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES adaptation_rules(id) ON DELETE CASCADE,
  current_metrics JSONB NOT NULL,
  suggested_changes JSONB NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected')),
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para histórico de adaptações aplicadas
CREATE TABLE IF NOT EXISTS adaptation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  exercise_plan_id UUID NOT NULL REFERENCES exercise_plans(id) ON DELETE CASCADE,
  suggestion_id UUID NOT NULL REFERENCES adaptation_suggestions(id) ON DELETE CASCADE,
  changes_applied JSONB NOT NULL,
  results_after_days INTEGER,
  effectiveness_score DECIMAL(3,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para métricas de tendência do paciente
CREATE TABLE IF NOT EXISTS patient_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  pain_trend TEXT CHECK (pain_trend IN ('increasing', 'decreasing', 'stable')),
  functional_trend TEXT CHECK (functional_trend IN ('improving', 'declining', 'stable')),
  compliance_trend TEXT CHECK (compliance_trend IN ('improving', 'declining', 'stable')),
  trend_period_days INTEGER DEFAULT 7,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_adaptation_suggestions_patient_id ON adaptation_suggestions(patient_id);
CREATE INDEX IF NOT EXISTS idx_adaptation_suggestions_status ON adaptation_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_adaptation_suggestions_created_at ON adaptation_suggestions(created_at);
CREATE INDEX IF NOT EXISTS idx_adaptation_history_patient_id ON adaptation_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_trends_patient_id ON patient_trends(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_trends_calculated_at ON patient_trends(calculated_at);

-- Habilitar RLS
ALTER TABLE adaptation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptation_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_trends ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para adaptation_rules
CREATE POLICY "Usuários autenticados podem ver regras de adaptação" ON adaptation_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem criar regras de adaptação" ON adaptation_rules
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar regras de adaptação" ON adaptation_rules
  FOR UPDATE TO authenticated USING (true);

-- Políticas RLS para adaptation_suggestions
CREATE POLICY "Usuários autenticados podem ver sugestões de adaptação" ON adaptation_suggestions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem criar sugestões de adaptação" ON adaptation_suggestions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar sugestões de adaptação" ON adaptation_suggestions
  FOR UPDATE TO authenticated USING (true);

-- Políticas RLS para adaptation_history
CREATE POLICY "Usuários autenticados podem ver histórico de adaptação" ON adaptation_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem criar histórico de adaptação" ON adaptation_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- Políticas RLS para patient_trends
CREATE POLICY "Usuários autenticados podem ver tendências do paciente" ON patient_trends
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem criar tendências do paciente" ON patient_trends
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar tendências do paciente" ON patient_trends
  FOR UPDATE TO authenticated USING (true);

-- Função para calcular tendências do paciente
CREATE OR REPLACE FUNCTION calculate_patient_trends(p_patient_id UUID, p_days INTEGER DEFAULT 7)
RETURNS TABLE(
  pain_trend TEXT,
  functional_trend TEXT,
  compliance_trend TEXT
) AS $$
DECLARE
  recent_progress RECORD;
  older_progress RECORD;
  pain_change DECIMAL;
  functional_change DECIMAL;
  compliance_change DECIMAL;
BEGIN
  -- Buscar progresso recente (últimos p_days dias)
  SELECT 
    AVG(pain_level) as avg_pain,
    AVG(functional_score) as avg_functional,
    AVG(exercise_compliance) as avg_compliance
  INTO recent_progress
  FROM patient_progress 
  WHERE patient_id = p_patient_id 
    AND created_at >= NOW() - INTERVAL '1 day' * p_days;

  -- Buscar progresso anterior (p_days anteriores)
  SELECT 
    AVG(pain_level) as avg_pain,
    AVG(functional_score) as avg_functional,
    AVG(exercise_compliance) as avg_compliance
  INTO older_progress
  FROM patient_progress 
  WHERE patient_id = p_patient_id 
    AND created_at >= NOW() - INTERVAL '1 day' * (p_days * 2)
    AND created_at < NOW() - INTERVAL '1 day' * p_days;

  -- Calcular mudanças
  IF recent_progress.avg_pain IS NOT NULL AND older_progress.avg_pain IS NOT NULL THEN
    pain_change := recent_progress.avg_pain - older_progress.avg_pain;
    
    IF pain_change > 1 THEN
      pain_trend := 'increasing';
    ELSIF pain_change < -1 THEN
      pain_trend := 'decreasing';
    ELSE
      pain_trend := 'stable';
    END IF;
  ELSE
    pain_trend := 'stable';
  END IF;

  IF recent_progress.avg_functional IS NOT NULL AND older_progress.avg_functional IS NOT NULL THEN
    functional_change := recent_progress.avg_functional - older_progress.avg_functional;
    
    IF functional_change > 5 THEN
      functional_trend := 'improving';
    ELSIF functional_change < -5 THEN
      functional_trend := 'declining';
    ELSE
      functional_trend := 'stable';
    END IF;
  ELSE
    functional_trend := 'stable';
  END IF;

  IF recent_progress.avg_compliance IS NOT NULL AND older_progress.avg_compliance IS NOT NULL THEN
    compliance_change := recent_progress.avg_compliance - older_progress.avg_compliance;
    
    IF compliance_change > 10 THEN
      compliance_trend := 'improving';
    ELSIF compliance_change < -10 THEN
      compliance_trend := 'declining';
    ELSE
      compliance_trend := 'stable';
    END IF;
  ELSE
    compliance_trend := 'stable';
  END IF;

  RETURN QUERY SELECT pain_trend, functional_trend, compliance_trend;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_adaptation_rules_updated_at
  BEFORE UPDATE ON adaptation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_adaptation_suggestions_updated_at
  BEFORE UPDATE ON adaptation_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir regras de adaptação padrão
INSERT INTO adaptation_rules (condition_type, threshold_value, action_type, adjustment_percentage, description) VALUES
('pain_increase', 2.0, 'decrease_intensity', 20.0, 'Reduzir intensidade quando dor aumentar significativamente'),
('pain_decrease', 1.0, 'increase_intensity', 15.0, 'Aumentar intensidade quando dor diminuir'),
('functional_improvement', 10.0, 'increase_intensity', 10.0, 'Aumentar intensidade com melhora funcional'),
('compliance_low', 60.0, 'decrease_intensity', 25.0, 'Reduzir intensidade com baixa aderência'),
('compliance_low', 50.0, 'modify_duration', -20.0, 'Reduzir duração com aderência muito baixa');

-- Conceder permissões
GRANT ALL PRIVILEGES ON adaptation_rules TO authenticated;
GRANT ALL PRIVILEGES ON adaptation_suggestions TO authenticated;
GRANT ALL PRIVILEGES ON adaptation_history TO authenticated;
GRANT ALL PRIVILEGES ON patient_trends TO authenticated;

GRANT SELECT ON adaptation_rules TO anon;
GRANT SELECT ON adaptation_suggestions TO anon;
GRANT SELECT ON adaptation_history TO anon;
GRANT SELECT ON patient_trends TO anon;