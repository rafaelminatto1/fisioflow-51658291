-- ============================================================================
-- Fix Quest Definitions Table - Complete Restructure
-- Recria a tabela quest_definitions com estrutura correta
-- ============================================================================

-- Primeiro, verificar e recriar a tabela com a estrutura correta
DROP TABLE IF EXISTS public.quest_definitions CASCADE;

-- Criar tabela de definições de quests com estrutura correta
CREATE TABLE public.quest_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('daily', 'weekly', 'special')),
    xp_reward INTEGER NOT NULL DEFAULT 50,
    points_reward INTEGER DEFAULT 0,
    requirements JSONB NOT NULL DEFAULT '{}',
    icon TEXT,
    difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    repeat_interval TEXT DEFAULT 'daily' CHECK (repeat_interval IN ('once', 'daily', 'weekly', 'monthly')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.quest_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active quests"
    ON public.quest_definitions FOR SELECT
    USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Therapists can manage quests"
    ON public.quest_definitions FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'fisioterapeuta'
    ));

-- Grant permissions
GRANT ALL ON public.quest_definitions TO authenticated;
GRANT ALL ON public.quest_definitions TO service_role;

-- Índices para performance
CREATE INDEX idx_quest_definitions_category ON public.quest_definitions(category);
CREATE INDEX idx_quest_definitions_active ON public.quest_definitions(is_active);
CREATE INDEX idx_quest_definitions_dates ON public.quest_definitions(start_date, end_date) WHERE start_date IS NOT NULL;

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_quest_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quest_definitions_updated_at
    BEFORE UPDATE ON public.quest_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_quest_definitions_updated_at();

-- ============================================================================
-- Recreate patient_quests table
-- ============================================================================
DROP TABLE IF EXISTS public.patient_quests CASCADE;

CREATE TABLE public.patient_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES public.quest_definitions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired')),
    progress JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(patient_id, quest_id)
);

-- RLS para patient_quests
ALTER TABLE public.patient_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quests"
    ON public.patient_quests FOR SELECT
    USING (auth.uid() = patient_id);

CREATE POLICY "Therapists can view all patient quests"
    ON public.patient_quests FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'fisioterapeuta'
    ));

CREATE POLICY "System can insert quests"
    ON public.patient_quests FOR INSERT
    WITH CHECK (true);

CREATE POLICY "System can update quests"
    ON public.patient_quests FOR UPDATE
    USING (true);

-- Grant permissions
GRANT ALL ON public.patient_quests TO authenticated;
GRANT ALL ON public.patient_quests TO service_role;

-- Índices para patient_quests
CREATE INDEX idx_patient_quests_patient_status ON public.patient_quests(patient_id, status);
CREATE INDEX idx_patient_quests_expires ON public.patient_quests(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_patient_quests_completed ON public.patient_quests(completed_at) WHERE completed_at IS NOT NULL;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_patient_quests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patient_quests_updated_at
    BEFORE UPDATE ON public.patient_quests
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_quests_updated_at();

-- ============================================================================
-- Seed de Quests
-- ============================================================================

INSERT INTO public.quest_definitions (code, title, description, category, xp_reward, points_reward, requirements, icon, difficulty, repeat_interval)
VALUES
-- Quests Diárias Fáceis
('daily_complete_any', 'Exercite-se Hoje', 'Complete qualquer sessão de exercícios', 'daily', 25, 10, '{"type": "complete_any_session", "count": 1}', 'Activity', 'easy', 'daily'),
('daily_log_pain', 'Registre sua Dor', 'Registre seu nível de dor hoje', 'daily', 15, 5, '{"type": "log_pain", "count": 1}', 'Clipboard', 'easy', 'daily'),
('daily_watch_video', 'Aprenda Algo Novo', 'Assista a um vídeo de exercício', 'daily', 20, 5, '{"type": "watch_video", "count": 1}', 'PlayCircle', 'easy', 'daily'),

-- Quests Diárias Médias
('daily_complete_3', 'Três em Um', 'Complete 3 sessões de exercícios', 'daily', 75, 30, '{"type": "complete_any_session", "count": 3}', 'Target', 'medium', 'daily'),
('daily_perfect_session', 'Sessão Perfeita', 'Complete uma sessão com 100% de precisão', 'daily', 100, 40, '{"type": "perfect_session", "count": 1}', 'Star', 'medium', 'daily'),
('daily_all_exercises', 'Completo', 'Complete todos os exercícios prescritos', 'daily', 125, 50, '{"type": "complete_all_prescribed", "count": 1}', 'CheckCircle', 'medium', 'daily'),

-- Quests Diárias Difíceis
('daily_5_sessions', 'Maratonista', 'Complete 5 sessões de exercícios', 'daily', 150, 75, '{"type": "complete_any_session", "count": 5}', 'Zap', 'hard', 'daily'),
('daily_streak_keeper', 'Guardião da Sequência', 'Mantenha sua streak ativa fazendo exercícios', 'daily', 50, 20, '{"type": "maintain_streak", "min_streak": 1}', 'Flame', 'hard', 'daily'),

-- Quests Semanais
('weekly_7_days', 'Semana Perfeita', 'Complete exercícios por 7 dias seguidos', 'weekly', 500, 200, '{"type": "daily_activity", "count": 7}', 'Calendar', 'hard', 'weekly'),
('weekly_10_sessions', 'Dedicação Total', 'Complete 10 sessões na semana', 'weekly', 300, 150, '{"type": "complete_any_session", "count": 10}', 'Award', 'medium', 'weekly'),
('weekly_all_categories', 'Variado é Bom', 'Complete sessões de 3 categorias diferentes', 'weekly', 250, 100, '{"type": "complete_categories", "categories": ["mobility", "strength", "balance"], "count": 1}', 'Grid', 'medium', 'weekly'),
('weekly_no_pain', 'Semana Sem Dor', 'Registre nível 0 de dor por 5 dias', 'weekly', 350, 150, '{"type": "pain_free_streak", "count": 5}', 'Smile', 'hard', 'weekly'),

-- Quests Especiais
('special_early_bird_week', 'Semana Madrugadora', 'Complete 5 sessões antes das 8:00', 'special', 400, 175, '{"type": "time_before_sessions", "hour": 8, "count": 5}', 'Sunrise', 'hard', 'weekly'),
('special_weekend_warrior', 'Guerreiro do Fim de Semana', 'Complete 3 sessões no sábado ou domingo', 'special', 200, 100, '{"type": "weekend_sessions", "count": 3}', 'Calendar', 'medium', 'weekly');

-- Relatório
DO $$
DECLARE
    v_daily_quests INT;
    v_weekly_quests INT;
    v_special_quests INT;
BEGIN
    SELECT COUNT(*) INTO v_daily_quests FROM public.quest_definitions WHERE category = 'daily';
    SELECT COUNT(*) INTO v_weekly_quests FROM public.quest_definitions WHERE category = 'weekly';
    SELECT COUNT(*) INTO v_special_quests FROM public.quest_definitions WHERE category = 'special';

    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'Quest System Recreated Successfully!';
    RAISE NOTICE '- Daily Quests: %', v_daily_quests;
    RAISE NOTICE '- Weekly Quests: %', v_weekly_quests;
    RAISE NOTICE '- Special Quests: %', v_special_quests;
    RAISE NOTICE '====================================================================';
END $$;
