-- Fix duplicate indexes
DROP INDEX IF EXISTS idx_treatment_sessions_patient;
DROP INDEX IF EXISTS idx_waitlist_org;

-- Fix unindexed foreign keys (from advisor analysis)
CREATE INDEX IF NOT EXISTS idx_clinical_test_records_created_by ON public.clinical_test_records(created_by);
CREATE INDEX IF NOT EXISTS idx_clinical_test_templates_created_by ON public.clinical_test_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_evaluation_templates_created_by ON public.evaluation_templates(created_by);

-- Fix RLS Policies

-- exercise_categories: Public read, Admin write
ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exercise_categories' AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON public.exercise_categories FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exercise_categories' AND policyname = 'Allow admin full access'
    ) THEN
        CREATE POLICY "Allow admin full access" ON public.exercise_categories FOR ALL TO authenticated USING (
            auth.jwt() ->> 'email' IN (SELECT email FROM auth.users WHERE is_super_admin = true) OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (specialties::text[] @> ARRAY['admin'] OR email LIKE '%@admin.com')) 
        );
    END IF;
END $$;

-- message_templates
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'message_templates' AND policyname = 'Organization members read access'
    ) THEN
        CREATE POLICY "Organization members read access" ON public.message_templates FOR SELECT TO authenticated USING (
             organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
             created_by = auth.uid()
        );
    END IF;
END $$;

-- notification_queue
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
-- Organization members can see their notifications
DO $$
BEGIN
     IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_queue' AND policyname = 'Organization members can see notifications'
    ) THEN
        CREATE POLICY "Organization members can see notifications" ON public.notification_queue FOR ALL TO authenticated USING (
            organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        );
    END IF;
END $$;


-- Fix Overly Permissive Policies
-- xp_transactions
-- The previous policy was permissive. We replace it with a check that ensures the user is authorized.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'xp_transactions' AND policyname = 'Therapists/System can insert transactions'
    ) THEN
        ALTER POLICY "Therapists/System can insert transactions" ON public.xp_transactions 
        WITH CHECK (
            -- User is the patient
            (SELECT profile_id FROM public.patients WHERE id = patient_id) = auth.uid()
            OR
            -- User is Admin or Therapist
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND (specialties::text[] && ARRAY['admin', 'therapist', 'physiotherapist']::text[])
            )
        );
    END IF;
END $$;

-- whatsapp_templates
-- "Admins can manage templates" - ensure strict check
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_templates' AND policyname = 'Admins can manage templates_insert_gen'
    ) THEN
        ALTER POLICY "Admins can manage templates_insert_gen" ON public.whatsapp_templates 
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND (specialties::text[] @> ARRAY['admin'])
            )
        );
    END IF;
END $$;
