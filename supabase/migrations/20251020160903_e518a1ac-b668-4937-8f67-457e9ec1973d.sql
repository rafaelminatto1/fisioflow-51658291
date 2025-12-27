-- Tabela de cirurgias do paciente
CREATE TABLE IF NOT EXISTS public.patient_surgeries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  surgery_name TEXT NOT NULL,
  surgery_date DATE NOT NULL,
  affected_side TEXT CHECK (affected_side IN ('direito', 'esquerdo', 'bilateral')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de objetivos do paciente
CREATE TABLE IF NOT EXISTS public.patient_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  goal_title TEXT NOT NULL,
  goal_description TEXT,
  target_date DATE,
  target_value TEXT,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido', 'cancelado')),
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de patologias do paciente
CREATE TABLE IF NOT EXISTS public.patient_pathologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  pathology_name TEXT NOT NULL,
  diagnosis_date DATE,
  status TEXT NOT NULL DEFAULT 'em_tratamento' CHECK (status IN ('em_tratamento', 'tratada', 'cronica')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de alertas/medições obrigatórias por patologia
CREATE TABLE IF NOT EXISTS public.pathology_required_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pathology_name TEXT NOT NULL,
  measurement_name TEXT NOT NULL,
  measurement_unit TEXT,
  alert_level TEXT NOT NULL DEFAULT 'high' CHECK (alert_level IN ('high', 'medium', 'low')),
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de medições de evolução
CREATE TABLE IF NOT EXISTS public.evolution_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soap_record_id UUID REFERENCES public.soap_records(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  measurement_type TEXT NOT NULL,
  measurement_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  notes TEXT,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_patient_surgeries_patient ON public.patient_surgeries(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_goals_patient ON public.patient_goals(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_pathologies_patient ON public.patient_pathologies(patient_id);
CREATE INDEX IF NOT EXISTS idx_evolution_measurements_patient ON public.evolution_measurements(patient_id);
CREATE INDEX IF NOT EXISTS idx_evolution_measurements_soap ON public.evolution_measurements(soap_record_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_patient_surgeries_updated_at ON public.patient_surgeries;
CREATE TRIGGER update_patient_surgeries_updated_at
  BEFORE UPDATE ON public.patient_surgeries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_patient_goals_updated_at ON public.patient_goals;
CREATE TRIGGER update_patient_goals_updated_at
  BEFORE UPDATE ON public.patient_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_patient_pathologies_updated_at ON public.patient_pathologies;
CREATE TRIGGER update_patient_pathologies_updated_at
  BEFORE UPDATE ON public.patient_pathologies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.patient_surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_pathologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathology_required_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_measurements ENABLE ROW LEVEL SECURITY;

-- Admins e fisios podem gerenciar tudo
DROP POLICY IF EXISTS "Admins e fisios gerenciam cirurgias" ON public.patient_surgeries;
CREATE POLICY "Admins e fisios gerenciam cirurgias"
  ON public.patient_surgeries FOR ALL
  USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

DROP POLICY IF EXISTS "Admins e fisios gerenciam objetivos" ON public.patient_goals;
CREATE POLICY "Admins e fisios gerenciam objetivos"
  ON public.patient_goals FOR ALL
  USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

DROP POLICY IF EXISTS "Admins e fisios gerenciam patologias" ON public.patient_pathologies;
CREATE POLICY "Admins e fisios gerenciam patologias"
  ON public.patient_pathologies FOR ALL
  USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

DROP POLICY IF EXISTS "Todos podem ver medições obrigatórias" ON public.pathology_required_measurements;
CREATE POLICY "Todos podem ver medições obrigatórias"
  ON public.pathology_required_measurements FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins gerenciam medições obrigatórias" ON public.pathology_required_measurements;
CREATE POLICY "Admins gerenciam medições obrigatórias"
  ON public.pathology_required_measurements FOR ALL
  USING (user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins e fisios gerenciam medições de evolução" ON public.evolution_measurements;
CREATE POLICY "Admins e fisios gerenciam medições de evolução"
  ON public.evolution_measurements FOR ALL
  USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

-- Estagiários podem acessar dados de pacientes atribuídos
DROP POLICY IF EXISTS "Estagiários veem cirurgias de pacientes atribuídos" ON public.patient_surgeries;
CREATE POLICY "Estagiários veem cirurgias de pacientes atribuídos"
  ON public.patient_surgeries FOR SELECT
  USING (user_has_role(auth.uid(), 'estagiario'::app_role) AND estagiario_pode_acessar_paciente(auth.uid(), patient_id));

DROP POLICY IF EXISTS "Estagiários veem objetivos de pacientes atribuídos" ON public.patient_goals;
CREATE POLICY "Estagiários veem objetivos de pacientes atribuídos"
  ON public.patient_goals FOR SELECT
  USING (user_has_role(auth.uid(), 'estagiario'::app_role) AND estagiario_pode_acessar_paciente(auth.uid(), patient_id));

DROP POLICY IF EXISTS "Estagiários veem patologias de pacientes atribuídos" ON public.patient_pathologies;
CREATE POLICY "Estagiários veem patologias de pacientes atribuídos"
  ON public.patient_pathologies FOR SELECT
  USING (user_has_role(auth.uid(), 'estagiario'::app_role) AND estagiario_pode_acessar_paciente(auth.uid(), patient_id));

DROP POLICY IF EXISTS "Estagiários gerenciam medições de pacientes atribuídos" ON public.evolution_measurements;
CREATE POLICY "Estagiários gerenciam medições de pacientes atribuídos"
  ON public.evolution_measurements FOR ALL
  USING (user_has_role(auth.uid(), 'estagiario'::app_role) AND estagiario_pode_acessar_paciente(auth.uid(), patient_id));

-- Inserir algumas medições obrigatórias comuns
INSERT INTO public.pathology_required_measurements (pathology_name, measurement_name, measurement_unit, alert_level, instructions)
VALUES 
  ('Pós-operatório de LCA', 'Amplitude do joelho - Flexão', 'graus', 'high', 'Medir amplitude de flexão do joelho em todas as sessões'),
  ('Pós-operatório de LCA', 'Amplitude do joelho - Extensão', 'graus', 'high', 'Medir amplitude de extensão do joelho em todas as sessões'),
  ('Pós-operatório de LCA', 'Teste de Lachman', 'qualitativo', 'high', 'Avaliar estabilidade anterior do joelho'),
  ('Tendinite do ombro', 'Amplitude do ombro - Flexão', 'graus', 'medium', 'Medir amplitude de flexão do ombro'),
  ('Tendinite do ombro', 'Amplitude do ombro - Abdução', 'graus', 'medium', 'Medir amplitude de abdução do ombro'),
  ('Lombalgia', 'EVA (Dor)', 'escala 0-10', 'high', 'Avaliar nível de dor através da Escala Visual Analógica'),
  ('Lombalgia', 'Teste de Schober', 'cm', 'medium', 'Avaliar flexibilidade da coluna lombar')
ON CONFLICT DO NOTHING;