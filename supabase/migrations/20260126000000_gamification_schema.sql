-- Create patient_gamification table (renamed from gamification_profiles for consistency)
CREATE TABLE IF NOT EXISTS public.patient_gamification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    current_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    last_activity_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(patient_id)
);

-- Create xp_transactions table (New feature: Audit trail for XP)
CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL, -- e.g., 'session_completed', 'manual_award', 'streak_bonus'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) -- Who awarded it (system or therapist)
);

-- Create achievements table (metadata)
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    xp_reward INTEGER DEFAULT 50,
    icon TEXT,
    category TEXT DEFAULT 'general',
    requirements JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies

-- Patient Gamification
ALTER TABLE public.patient_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gamification" 
    ON public.patient_gamification FOR SELECT 
    USING (auth.uid() = patient_id OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'therapist'
    ));

CREATE POLICY "System/Therapists can update gamification" 
    ON public.patient_gamification FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'therapist'
    ) OR auth.uid() = patient_id); -- Setup for triggers/functions, but typically client shouldn't update Level directly.
    -- Ideally we use a stored procedure for adding XP, but allowing update for now with RLS.

CREATE POLICY "System can insert gamification"
    ON public.patient_gamification FOR INSERT
    WITH CHECK (true);

-- XP Transactions
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" 
    ON public.xp_transactions FOR SELECT 
    USING (auth.uid() = patient_id);

CREATE POLICY "Therapists can view all transactions" 
    ON public.xp_transactions FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'therapist'
    ));

CREATE POLICY "Therapists/System can insert transactions" 
    ON public.xp_transactions FOR INSERT
    WITH CHECK (true); -- Allow insert if authenticated (logic controlled by app)

-- Achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view achievements" 
    ON public.achievements FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.patient_gamification TO authenticated;
GRANT ALL ON public.patient_gamification TO service_role;
GRANT ALL ON public.xp_transactions TO authenticated;
GRANT ALL ON public.xp_transactions TO service_role;
GRANT ALL ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;

-- Seed Achievements
INSERT INTO public.achievements (code, title, description, xp_reward, icon, category)
VALUES 
('streak_fire', 'Sequência de Fogo', 'Complete exercícios por 7 dias seguidos', 100, 'Flame', 'streak'),
('precision_total', 'Precisão Total', 'Complete 20 exercícios com perfeição', 200, 'Target', 'performance'),
('superacao', 'Superação', 'Melhore sua pontuação de dor em 50%', 150, 'Zap', 'recovery'),
('dedicacao', 'Dedicação', 'Participe de 30 sessões', 300, 'Heart', 'consistency'),
('first_steps', 'Primeiros Passos', 'Complete o primeiro exercício', 50, 'Footprints', 'onboarding')
ON CONFLICT (code) DO NOTHING;
