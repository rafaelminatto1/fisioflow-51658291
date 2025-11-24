-- Tabela para armazenar resultados de testes padronizados
CREATE TABLE IF NOT EXISTS public.standardized_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN ('oswestry', 'lysholm', 'dash')),
  test_name TEXT NOT NULL,
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL,
  interpretation TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_test_results_patient ON public.standardized_test_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_test_results_type ON public.standardized_test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON public.standardized_test_results(created_at DESC);

-- RLS Policies
ALTER TABLE public.standardized_test_results ENABLE ROW LEVEL SECURITY;

-- Admins e fisios podem ver todos os testes
CREATE POLICY "Admins e fisios veem testes padronizados"
  ON public.standardized_test_results
  FOR SELECT
  USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

-- Admins e fisios podem criar testes
CREATE POLICY "Admins e fisios criam testes padronizados"
  ON public.standardized_test_results
  FOR INSERT
  WITH CHECK (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

-- Estagiários podem ver e criar testes de pacientes atribuídos
CREATE POLICY "Estagiários veem testes de pacientes atribuídos"
  ON public.standardized_test_results
  FOR SELECT
  USING (
    user_has_role(auth.uid(), 'estagiario'::app_role) 
    AND estagiario_pode_acessar_paciente(auth.uid(), patient_id)
  );

CREATE POLICY "Estagiários criam testes de pacientes atribuídos"
  ON public.standardized_test_results
  FOR INSERT
  WITH CHECK (
    user_has_role(auth.uid(), 'estagiario'::app_role) 
    AND estagiario_pode_acessar_paciente(auth.uid(), patient_id)
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_standardized_test_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_standardized_test_results_updated_at
  BEFORE UPDATE ON public.standardized_test_results
  FOR EACH ROW
  EXECUTE FUNCTION update_standardized_test_results_updated_at();