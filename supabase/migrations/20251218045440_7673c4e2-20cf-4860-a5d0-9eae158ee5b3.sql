-- ==============================================
-- FASE 7: INOVAÇÕES E DIFERENCIAL COMPETITIVO
-- ==============================================

-- 1. Sistema de Previsão de Faltas (No-Show Prediction)
CREATE TABLE IF NOT EXISTS public.appointment_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  no_show_probability DECIMAL(5,4) DEFAULT 0,
  risk_factors JSONB DEFAULT '[]',
  recommended_actions TEXT[],
  prediction_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  was_accurate BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Sistema de Gamificação Avançada
CREATE TABLE IF NOT EXISTS public.patient_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE,
  current_level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  badges JSONB DEFAULT '[]',
  title TEXT DEFAULT 'Iniciante',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gamification_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'badge', 'title', 'discount', 'bonus_session'
  xp_required INTEGER,
  level_required INTEGER,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.patient_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  reward_id UUID REFERENCES public.gamification_rewards(id),
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notified BOOLEAN DEFAULT false
);

-- 3. WhatsApp Exercise Bot Queue
CREATE TABLE IF NOT EXISTS public.whatsapp_exercise_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  exercise_plan_id UUID,
  phone_number TEXT NOT NULL,
  exercises JSONB NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'opened', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Smart Scheduling Preferences
CREATE TABLE IF NOT EXISTS public.patient_scheduling_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE,
  preferred_days TEXT[] DEFAULT '{}',
  preferred_times TEXT[] DEFAULT '{}',
  avoided_days TEXT[] DEFAULT '{}',
  avoided_times TEXT[] DEFAULT '{}',
  max_travel_time INTEGER,
  prefers_same_therapist BOOLEAN DEFAULT true,
  preferred_therapist_id UUID,
  notification_preferences JSONB DEFAULT '{"sms": true, "whatsapp": true, "email": true}',
  auto_book_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Predictive Analytics Data
CREATE TABLE IF NOT EXISTS public.patient_outcome_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  condition TEXT NOT NULL,
  predicted_sessions_to_recovery INTEGER,
  confidence_score DECIMAL(5,4),
  risk_of_dropout DECIMAL(5,4),
  predicted_completion_date DATE,
  factors JSONB DEFAULT '{}',
  model_version TEXT DEFAULT 'v1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. AI Clinical Assistant Sessions
CREATE TABLE IF NOT EXISTS public.ai_clinical_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id),
  patient_id UUID NOT NULL,
  therapist_id UUID,
  audio_url TEXT,
  transcription TEXT,
  ai_generated_soap JSONB,
  ai_suggestions JSONB DEFAULT '[]',
  therapist_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Patient Self-Assessment via WhatsApp
CREATE TABLE IF NOT EXISTS public.patient_self_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  assessment_type TEXT NOT NULL, -- 'pain_level', 'mood', 'exercise_completion', 'nps'
  question TEXT NOT NULL,
  response TEXT,
  numeric_value INTEGER,
  received_via TEXT DEFAULT 'whatsapp',
  sent_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Revenue Forecasting
CREATE TABLE IF NOT EXISTS public.revenue_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  forecast_date DATE NOT NULL,
  predicted_revenue DECIMAL(12,2),
  actual_revenue DECIMAL(12,2),
  predicted_appointments INTEGER,
  actual_appointments INTEGER,
  confidence_interval_low DECIMAL(12,2),
  confidence_interval_high DECIMAL(12,2),
  factors JSONB DEFAULT '{}',
  model_version TEXT DEFAULT 'v1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. Smart Inventory Management
CREATE TABLE IF NOT EXISTS public.clinic_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  item_name TEXT NOT NULL,
  category TEXT,
  current_quantity INTEGER DEFAULT 0,
  minimum_quantity INTEGER DEFAULT 5,
  unit TEXT DEFAULT 'unidade',
  cost_per_unit DECIMAL(10,2),
  supplier TEXT,
  last_restock_date DATE,
  expiration_date DATE,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES public.clinic_inventory(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- 'entrada', 'saida', 'ajuste', 'perda'
  quantity INTEGER NOT NULL,
  reason TEXT,
  related_appointment_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. Staff Performance Analytics
CREATE TABLE IF NOT EXISTS public.staff_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL,
  metric_date DATE NOT NULL,
  total_appointments INTEGER DEFAULT 0,
  completed_appointments INTEGER DEFAULT 0,
  cancelled_appointments INTEGER DEFAULT 0,
  no_show_appointments INTEGER DEFAULT 0,
  average_session_duration INTEGER,
  patient_satisfaction_avg DECIMAL(3,2),
  revenue_generated DECIMAL(12,2) DEFAULT 0,
  new_patients INTEGER DEFAULT 0,
  returning_patients INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(therapist_id, metric_date)
);

-- Enable RLS
ALTER TABLE public.appointment_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_exercise_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_scheduling_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_outcome_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_clinical_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_self_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
DROP POLICY IF EXISTS "Users can view their org data" ON public.appointment_predictions;
CREATE POLICY "Users can view their org data" ON public.appointment_predictions FOR ALL USING (true);
DROP POLICY IF EXISTS "Users can manage levels" ON public.patient_levels;
CREATE POLICY "Users can manage levels" ON public.patient_levels FOR ALL USING (true);
DROP POLICY IF EXISTS "Anyone can view rewards" ON public.gamification_rewards;
CREATE POLICY "Anyone can view rewards" ON public.gamification_rewards FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage achievements" ON public.patient_achievements;
CREATE POLICY "Users can manage achievements" ON public.patient_achievements FOR ALL USING (true);
DROP POLICY IF EXISTS "Users can manage whatsapp queue" ON public.whatsapp_exercise_queue;
CREATE POLICY "Users can manage whatsapp queue" ON public.whatsapp_exercise_queue FOR ALL USING (true);
DROP POLICY IF EXISTS "Users can manage preferences" ON public.patient_scheduling_preferences;
CREATE POLICY "Users can manage preferences" ON public.patient_scheduling_preferences FOR ALL USING (true);
DROP POLICY IF EXISTS "Users can view predictions" ON public.patient_outcome_predictions;
CREATE POLICY "Users can view predictions" ON public.patient_outcome_predictions FOR ALL USING (true);
DROP POLICY IF EXISTS "Users can manage ai sessions" ON public.ai_clinical_sessions;
CREATE POLICY "Users can manage ai sessions" ON public.ai_clinical_sessions FOR ALL USING (true);
DROP POLICY IF EXISTS "Users can manage assessments" ON public.patient_self_assessments;
CREATE POLICY "Users can manage assessments" ON public.patient_self_assessments FOR ALL USING (true);
DROP POLICY IF EXISTS "Users can view forecasts" ON public.revenue_forecasts;
CREATE POLICY "Users can view forecasts" ON public.revenue_forecasts FOR ALL USING (true);
DROP POLICY IF EXISTS "Users can manage inventory" ON public.clinic_inventory;
CREATE POLICY "Users can manage inventory" ON public.clinic_inventory FOR ALL USING (true);
DROP POLICY IF EXISTS "Users can manage movements" ON public.inventory_movements;
CREATE POLICY "Users can manage movements" ON public.inventory_movements FOR ALL USING (true);
DROP POLICY IF EXISTS "Users can view performance" ON public.staff_performance_metrics;
CREATE POLICY "Users can view performance" ON public.staff_performance_metrics FOR ALL USING (true);

-- Seed Gamification Rewards
INSERT INTO public.gamification_rewards (name, description, type, xp_required, level_required, icon, color) VALUES
('Primeira Sessão', 'Completou sua primeira sessão de fisioterapia', 'badge', 0, 1, '🎯', '#10B981'),
('Dedicação Total', 'Completou 10 sessões sem faltas', 'badge', 500, 3, '🏆', '#F59E0B'),
('Mestre da Consistência', 'Manteve uma sequência de 30 dias', 'badge', 1500, 5, '🔥', '#EF4444'),
('Atleta em Formação', 'Completou 50 exercícios em casa', 'badge', 1000, 4, '💪', '#3B82F6'),
('Feedback Valioso', 'Respondeu 5 pesquisas de satisfação', 'badge', 250, 2, '⭐', '#8B5CF6'),
('Embaixador', 'Indicou um amigo para a clínica', 'badge', 500, 3, '🤝', '#EC4899'),
('Guerreiro', 'Superou uma lesão grave', 'badge', 2000, 6, '⚔️', '#6366F1'),
('Maratonista', 'Completou 100 sessões', 'badge', 5000, 10, '🏅', '#14B8A6'),
('Iniciante', 'Título inicial', 'title', 0, 1, '🌱', '#9CA3AF'),
('Comprometido', 'Nível 5 alcançado', 'title', 2500, 5, '💎', '#0EA5E9'),
('Expert', 'Nível 10 alcançado', 'title', 10000, 10, '👑', '#F97316'),
('Desconto 10%', 'Desconto na próxima sessão', 'discount', 3000, 7, '🎁', '#22C55E'),
('Sessão Bônus', 'Ganhe uma sessão gratuita', 'bonus_session', 8000, 9, '🎉', '#A855F7');

-- Function to calculate and update patient level
CREATE OR REPLACE FUNCTION public.update_patient_gamification()
RETURNS TRIGGER AS $$
DECLARE
  current_xp INTEGER;
  new_level INTEGER;
  new_title TEXT;
BEGIN
  -- Get current XP
  SELECT COALESCE(total_xp, 0) INTO current_xp
  FROM public.patient_levels
  WHERE patient_id = NEW.patient_id;
  
  -- Calculate new level (every 500 XP = 1 level)
  new_level := GREATEST(1, FLOOR((current_xp + COALESCE(NEW.xp_reward, 0)) / 500) + 1);
  
  -- Determine title based on level
  new_title := CASE
    WHEN new_level >= 10 THEN 'Expert'
    WHEN new_level >= 7 THEN 'Avançado'
    WHEN new_level >= 5 THEN 'Comprometido'
    WHEN new_level >= 3 THEN 'Dedicado'
    ELSE 'Iniciante'
  END;
  
  -- Update or insert patient level
  INSERT INTO public.patient_levels (patient_id, current_level, total_xp, title, last_activity_date, updated_at)
  VALUES (NEW.patient_id, new_level, current_xp + COALESCE(NEW.xp_reward, 0), new_title, CURRENT_DATE, now())
  ON CONFLICT (patient_id) DO UPDATE SET
    current_level = new_level,
    total_xp = patient_levels.total_xp + COALESCE(NEW.xp_reward, 0),
    title = new_title,
    last_activity_date = CURRENT_DATE,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for gamification updates
DROP TRIGGER IF EXISTS trigger_update_gamification ON public.achievements_log;
CREATE TRIGGER trigger_update_gamification
  AFTER INSERT ON public.achievements_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_patient_gamification();

-- Function to update streak
CREATE OR REPLACE FUNCTION public.update_patient_streak(_patient_id UUID)
RETURNS VOID AS $$
DECLARE
  last_date DATE;
  streak INTEGER;
BEGIN
  SELECT last_activity_date, current_streak INTO last_date, streak
  FROM public.patient_levels
  WHERE patient_id = _patient_id;
  
  IF last_date IS NULL OR last_date < CURRENT_DATE - 1 THEN
    -- Reset streak
    UPDATE public.patient_levels
    SET current_streak = 1, last_activity_date = CURRENT_DATE
    WHERE patient_id = _patient_id;
  ELSIF last_date = CURRENT_DATE - 1 THEN
    -- Increment streak
    UPDATE public.patient_levels
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_activity_date = CURRENT_DATE
    WHERE patient_id = _patient_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;