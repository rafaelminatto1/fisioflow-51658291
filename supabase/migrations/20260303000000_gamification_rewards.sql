-- =====================================================================
-- Gamification Rewards & Weekly Challenges Schema
-- Sistema de recompensas e desafios para engajamento de pacientes
-- =====================================================================

-- =====================================================================
-- 1. REWARDS (Loja de Recompensas)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    point_cost INTEGER NOT NULL,
    icon TEXT DEFAULT 'Gift',
    category TEXT DEFAULT 'general', -- 'physical', 'digital', 'discount', 'experience'
    stock INTEGER, -- NULL = unlimited
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reward Redemptions (Histórico de Resgates)
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
    points_spent INTEGER NOT NULL,
    status TEXT DEFAULT 'claimed', -- 'claimed', 'fulfilled', 'cancelled'
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    fulfilled_at TIMESTAMPTZ,
    notes TEXT
);

-- =====================================================================
-- 2. WEEKLY CHALLENGES (Desafios Semanais)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.weekly_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    xp_reward INTEGER DEFAULT 200,
    point_reward INTEGER DEFAULT 50,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target JSONB NOT NULL, -- e.g. {"type": "sessions", "count": 5}
    icon TEXT DEFAULT 'Target',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient Challenge Progress
CREATE TABLE IF NOT EXISTS public.patient_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(patient_id, challenge_id)
);

-- =====================================================================
-- 3. RLS POLICIES
-- =====================================================================

-- Rewards
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rewards"
    ON public.rewards FOR SELECT
    USING (is_active = true OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'fisioterapeuta' OR role = 'admin')
    ));

CREATE POLICY "Admins can manage rewards"
    ON public.rewards FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'fisioterapeuta' OR role = 'admin')
    ));

-- Reward Redemptions
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own redemptions"
    ON public.reward_redemptions FOR SELECT
    USING (patient_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'fisioterapeuta' OR role = 'admin')
    ));

CREATE POLICY "Patients can claim rewards"
    ON public.reward_redemptions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can manage redemptions"
    ON public.reward_redemptions FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'fisioterapeuta' OR role = 'admin')
    ));

-- Weekly Challenges
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenges"
    ON public.weekly_challenges FOR SELECT
    USING (is_active = true OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'fisioterapeuta' OR role = 'admin')
    ));

CREATE POLICY "Admins can manage challenges"
    ON public.weekly_challenges FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'fisioterapeuta' OR role = 'admin')
    ));

-- Patient Challenges
ALTER TABLE public.patient_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own challenge progress"
    ON public.patient_challenges FOR SELECT
    USING (patient_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'fisioterapeuta' OR role = 'admin')
    ));

CREATE POLICY "System can update challenge progress"
    ON public.patient_challenges FOR ALL
    USING (true);

-- =====================================================================
-- 4. GRANTS
-- =====================================================================

GRANT ALL ON public.rewards TO authenticated;
GRANT ALL ON public.rewards TO service_role;
GRANT ALL ON public.reward_redemptions TO authenticated;
GRANT ALL ON public.reward_redemptions TO service_role;
GRANT ALL ON public.weekly_challenges TO authenticated;
GRANT ALL ON public.weekly_challenges TO service_role;
GRANT ALL ON public.patient_challenges TO authenticated;
GRANT ALL ON public.patient_challenges TO service_role;

-- =====================================================================
-- 5. SEED DATA
-- =====================================================================

-- Sample Rewards
INSERT INTO public.rewards (title, description, point_cost, icon, category, stock) VALUES
('Sessão Bônus', 'Ganhe uma sessão extra de fisioterapia', 500, 'Calendar', 'experience', 10),
('Desconto 10%', 'Cupom de 10% de desconto no próximo pacote', 300, 'Percent', 'discount', NULL),
('Caneca FisioFlow', 'Caneca exclusiva com logo FisioFlow', 200, 'Coffee', 'physical', 20),
('Aula de Yoga', 'Participe de uma aula especial de yoga', 400, 'Flower', 'experience', 5),
('Faixa de Exercícios', 'Kit de faixas elásticas para exercícios em casa', 350, 'Dumbbell', 'physical', 15),
('Avaliação Postural', 'Avaliação postural completa gratuita', 600, 'Scan', 'experience', 5)
ON CONFLICT DO NOTHING;

-- Sample Weekly Challenge (current week)
INSERT INTO public.weekly_challenges (title, description, xp_reward, point_reward, start_date, end_date, target, icon)
SELECT 
    'Maratona da Semana',
    'Complete 5 sessões de exercícios esta semana',
    300,
    100,
    date_trunc('week', CURRENT_DATE)::date,
    (date_trunc('week', CURRENT_DATE) + interval '6 days')::date,
    '{"type": "sessions", "count": 5}'::jsonb,
    'Zap'
WHERE NOT EXISTS (
    SELECT 1 FROM public.weekly_challenges 
    WHERE start_date = date_trunc('week', CURRENT_DATE)::date
);
