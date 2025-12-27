-- Tabela para sugestões de IA
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  suggestion_text TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para sistema de gamificação
CREATE TABLE IF NOT EXISTS public.patient_gamification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  achievements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para conquistas/achievements
CREATE TABLE IF NOT EXISTS public.achievements_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  achievement_title TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  xp_reward INTEGER DEFAULT 0
);

-- Tabela para histórico de pontos/XP
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies para ai_suggestions
DROP POLICY IF EXISTS "Admins e fisios visualizam sugestões de IA" ON public.ai_suggestions;
CREATE POLICY "Admins e fisios visualizam sugestões de IA"
  ON public.ai_suggestions FOR SELECT
  USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

DROP POLICY IF EXISTS "Sistema cria sugestões de IA" ON public.ai_suggestions;
CREATE POLICY "Sistema cria sugestões de IA"
  ON public.ai_suggestions FOR INSERT
  WITH CHECK (true);

-- RLS Policies para gamification
DROP POLICY IF EXISTS "Pacientes veem própria gamificação" ON public.patient_gamification;
CREATE POLICY "Pacientes veem própria gamificação"
  ON public.patient_gamification FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      JOIN profiles pr ON pr.id = p.profile_id
      WHERE pr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins e fisios veem gamificação" ON public.patient_gamification;
CREATE POLICY "Admins e fisios veem gamificação"
  ON public.patient_gamification FOR SELECT
  USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

DROP POLICY IF EXISTS "Sistema gerencia gamificação" ON public.patient_gamification;
CREATE POLICY "Sistema gerencia gamificação"
  ON public.patient_gamification FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies para achievements_log
DROP POLICY IF EXISTS "Pacientes veem próprias conquistas" ON public.achievements_log;
CREATE POLICY "Pacientes veem próprias conquistas"
  ON public.achievements_log FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      JOIN profiles pr ON pr.id = p.profile_id
      WHERE pr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins e fisios veem conquistas" ON public.achievements_log;
CREATE POLICY "Admins e fisios veem conquistas"
  ON public.achievements_log FOR SELECT
  USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

DROP POLICY IF EXISTS "Sistema cria conquistas" ON public.achievements_log;
CREATE POLICY "Sistema cria conquistas"
  ON public.achievements_log FOR INSERT
  WITH CHECK (true);

-- RLS Policies para xp_transactions
DROP POLICY IF EXISTS "Pacientes veem próprio XP" ON public.xp_transactions;
CREATE POLICY "Pacientes veem próprio XP"
  ON public.xp_transactions FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      JOIN profiles pr ON pr.id = p.profile_id
      WHERE pr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins e fisios veem XP" ON public.xp_transactions;
CREATE POLICY "Admins e fisios veem XP"
  ON public.xp_transactions FOR SELECT
  USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

DROP POLICY IF EXISTS "Sistema cria transações XP" ON public.xp_transactions;
CREATE POLICY "Sistema cria transações XP"
  ON public.xp_transactions FOR INSERT
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_patient ON public.ai_suggestions(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created ON public.ai_suggestions(created_at);
CREATE INDEX IF NOT EXISTS idx_gamification_patient ON public.patient_gamification(patient_id);
CREATE INDEX IF NOT EXISTS idx_achievements_patient ON public.achievements_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_patient ON public.xp_transactions(patient_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ai_suggestions_updated_at ON public.ai_suggestions;
CREATE TRIGGER update_ai_suggestions_updated_at
  BEFORE UPDATE ON public.ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gamification_updated_at ON public.patient_gamification;
CREATE TRIGGER update_gamification_updated_at
  BEFORE UPDATE ON public.patient_gamification
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
