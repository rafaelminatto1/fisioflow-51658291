-- Tabela de relatórios gerados
CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  content TEXT NOT NULL,
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de prescrições de exercícios com IA
CREATE TABLE IF NOT EXISTS public.ai_exercise_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  prescription_data JSONB NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_generated_reports_patient ON public.generated_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_created ON public.generated_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_prescriptions_patient ON public.ai_exercise_prescriptions(patient_id);

-- RLS Policies para generated_reports
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins e fisios podem ver todos os relatórios" ON public.generated_reports;
CREATE POLICY "Admins e fisios podem ver todos os relatórios"
  ON public.generated_reports FOR SELECT
  USING (
    public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  );

DROP POLICY IF EXISTS "Pacientes podem ver seus próprios relatórios" ON public.generated_reports;
CREATE POLICY "Pacientes podem ver seus próprios relatórios"
  ON public.generated_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.profiles pr ON pr.id = p.profile_id
      WHERE p.id = patient_id AND pr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins e fisios podem criar relatórios" ON public.generated_reports;
CREATE POLICY "Admins e fisios podem criar relatórios"
  ON public.generated_reports FOR INSERT
  WITH CHECK (
    public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  );

-- RLS Policies para ai_exercise_prescriptions
ALTER TABLE public.ai_exercise_prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins e fisios podem ver prescrições" ON public.ai_exercise_prescriptions;
CREATE POLICY "Admins e fisios podem ver prescrições"
  ON public.ai_exercise_prescriptions FOR SELECT
  USING (
    public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  );

DROP POLICY IF EXISTS "Pacientes podem ver suas prescrições" ON public.ai_exercise_prescriptions;
CREATE POLICY "Pacientes podem ver suas prescrições"
  ON public.ai_exercise_prescriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.profiles pr ON pr.id = p.profile_id
      WHERE p.id = patient_id AND pr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins e fisios podem criar prescrições" ON public.ai_exercise_prescriptions;
CREATE POLICY "Admins e fisios podem criar prescrições"
  ON public.ai_exercise_prescriptions FOR INSERT
  WITH CHECK (
    public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  );

DROP POLICY IF EXISTS "Admins e fisios podem atualizar prescrições" ON public.ai_exercise_prescriptions;
CREATE POLICY "Admins e fisios podem atualizar prescrições"
  ON public.ai_exercise_prescriptions FOR UPDATE
  USING (
    public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  );

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_generated_reports_updated_at ON public.generated_reports;
CREATE TRIGGER update_generated_reports_updated_at
  BEFORE UPDATE ON public.generated_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_prescriptions_updated_at ON public.ai_exercise_prescriptions;
CREATE TRIGGER update_ai_prescriptions_updated_at
  BEFORE UPDATE ON public.ai_exercise_prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();