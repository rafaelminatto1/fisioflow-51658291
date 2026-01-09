-- Create patient_pain_records table
CREATE TABLE IF NOT EXISTS public.patient_pain_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pain_level INTEGER NOT NULL CHECK (pain_level >= 0 AND pain_level <= 10),
    pain_type TEXT NOT NULL, -- 'aguda', 'latejante', 'queimação', 'formigamento', etc.
    body_part TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create prescribed_exercises table
CREATE TABLE IF NOT EXISTS public.prescribed_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    frequency TEXT NOT NULL, -- e.g., 'Daily', '3x/week'
    sets INTEGER NOT NULL DEFAULT 3,
    reps INTEGER NOT NULL DEFAULT 10,
    duration_seconds INTEGER, -- for timed exercises
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create exercise_logs table to track completion
CREATE TABLE IF NOT EXISTS public.exercise_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescribed_exercise_id UUID NOT NULL REFERENCES public.prescribed_exercises(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    difficulty_rating TEXT CHECK (difficulty_rating IN ('easy', 'medium', 'hard')),
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.patient_pain_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescribed_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

-- Policies for patient_pain_records
CREATE POLICY "Users can insert their own pain records"
    ON public.patient_pain_records FOR INSERT
    WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Users can view their own pain records"
    ON public.patient_pain_records FOR SELECT
    USING (auth.uid() = patient_id OR EXISTS (
        -- Therapists can view their patients' records (assuming a patient-therapist link exists in generic way or just allow therapists)
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('fisioterapeuta', 'admin')
    ));

-- Policies for prescribed_exercises
CREATE POLICY "Users can view their prescribed exercises"
    ON public.prescribed_exercises FOR SELECT
    USING (auth.uid() = patient_id);

CREATE POLICY "Therapists can manage prescriptions"
    ON public.prescribed_exercises FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('fisioterapeuta', 'admin')));

-- Policies for exercise_logs
CREATE POLICY "Users can log their own exercises"
    ON public.exercise_logs FOR INSERT
    WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Users can view their own exercise logs"
    ON public.exercise_logs FOR SELECT
    USING (auth.uid() = patient_id);

CREATE POLICY "Therapists can view exercise logs"
    ON public.exercise_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('fisioterapeuta', 'admin')));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pain_records_patient ON public.patient_pain_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescribed_exercises(patient_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_patient ON public.exercise_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_date ON public.exercise_logs(completed_at);
