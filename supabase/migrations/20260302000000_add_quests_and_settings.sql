-- Create quest_definitions table
CREATE TABLE IF NOT EXISTS public.quest_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    xp_reward INTEGER NOT NULL DEFAULT 50,
    icon TEXT,
    category TEXT DEFAULT 'daily', -- daily, weekly, milestone
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create gamification_settings table
CREATE TABLE IF NOT EXISTS public.gamification_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.quest_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_settings ENABLE ROW LEVEL SECURITY;

-- Policies for quest_definitions
CREATE POLICY "Public read active quests"
    ON public.quest_definitions FOR SELECT
    USING (true); -- Everyone can see quests, filtering by active often happens in app logic or specific queries

CREATE POLICY "Admins and Therapists can manage quests"
    ON public.quest_definitions FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'fisioterapeuta' OR role = 'admin')
    ));

-- Policies for gamification_settings
CREATE POLICY "Authenticated users can read settings"
    ON public.gamification_settings FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and Therapists can manage settings"
    ON public.gamification_settings FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'fisioterapeuta' OR role = 'admin')
    ));

-- Seed initial settings
INSERT INTO public.gamification_settings (key, value, description) VALUES
('xp_multiplier', '1.0', 'Multiplicador global de XP'),
('level_base_xp', '1000', 'XP base necessário para subir de nível'),
('daily_goal_xp', '50', 'XP bônus por meta diária'),
('streak_bonus_base', '10', 'XP base por dia de sequência')
ON CONFLICT (key) DO NOTHING;
