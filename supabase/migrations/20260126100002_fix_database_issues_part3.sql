-- Fix duplicate indexes (Part 3)
DROP INDEX IF EXISTS idx_surveys_patient; -- Keep idx_surveys_patient_id
DROP INDEX IF EXISTS idx_surveys_therapist; -- Keep idx_surveys_therapist_id

-- Fix unindexed foreign keys (from advisor analysis Part 3)
CREATE INDEX IF NOT EXISTS idx_pathologies_medical_record_id ON public.pathologies(medical_record_id);
-- prescribed_exercises FKs: exercise_id, patient_id
CREATE INDEX IF NOT EXISTS idx_prescribed_exercises_exercise_id ON public.prescribed_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_prescribed_exercises_patient_id ON public.prescribed_exercises(patient_id);


-- Fix RLS Policies (Part 3)

-- whatsapp_connections
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_connections' AND policyname = 'Organization members view connections') THEN
        CREATE POLICY "Organization members view connections" ON public.whatsapp_connections FOR SELECT TO authenticated USING (
            organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        );
    END IF;
END $$;

-- whatsapp_exercise_queue
-- Fix overly permissive UPDATE policy
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_exercise_queue' AND policyname = 'Users can manage whatsapp queue_update_gen') THEN
        ALTER POLICY "Users can manage whatsapp queue_update_gen" ON public.whatsapp_exercise_queue USING (
            -- Restrict to Admin, Therapist (via patient), or Patient themselves?
            -- Assuming primarily system/admin management for queue
             EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (specialties::text[] @> ARRAY['admin']))
             OR
             -- Allow therapist of the patient
             EXISTS (SELECT 1 FROM public.patients p WHERE p.id = whatsapp_exercise_queue.patient_id AND 
                p.organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
             )
        );
    END IF;
    
    -- Fix overly permissive INSERT policy if exists
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_exercise_queue' AND policyname = 'Users can manage whatsapp queue_insert_gen') THEN
         ALTER POLICY "Users can manage whatsapp queue_insert_gen" ON public.whatsapp_exercise_queue 
         WITH CHECK (
             -- Same restriction
              EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (specialties::text[] @> ARRAY['admin']))
             OR
             EXISTS (SELECT 1 FROM public.patients p WHERE p.id = whatsapp_exercise_queue.patient_id AND 
                p.organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
             )
         );
    END IF;
END $$;
