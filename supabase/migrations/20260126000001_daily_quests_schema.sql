-- Daily Quests Table
CREATE TABLE IF NOT EXISTS public.daily_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    quests_data JSONB NOT NULL DEFAULT '[
        {"id": "session", "title": "Realizar Sessão", "completed": false, "xp": 50, "icon": "Activity", "description": "Complete sua sessão de exercícios de hoje"},
        {"id": "pain", "title": "Registrar Dor", "completed": false, "xp": 20, "icon": "Thermometer", "description": "Atualize seu mapa de dor"},
        {"id": "hydration", "title": "Hidratação", "completed": false, "xp": 10, "icon": "Droplets", "description": "Beba 2L de água"}
    ]'::jsonb,
    completed_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(patient_id, date)
);

-- RLS
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily quests" 
    ON public.daily_quests FOR SELECT 
    USING (auth.uid() = patient_id OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'fisioterapeuta'
    ));

CREATE POLICY "Users can update own daily quests" 
    ON public.daily_quests FOR UPDATE
    USING (auth.uid() = patient_id OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'fisioterapeuta'
    ));

CREATE POLICY "System/Therapists can insert daily quests" 
    ON public.daily_quests FOR INSERT
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.daily_quests TO authenticated;
GRANT ALL ON public.daily_quests TO service_role;
