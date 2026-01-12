-- Fix duplicate indexes (Part 2)
DROP INDEX IF EXISTS idx_session_packages_org; -- Keep idx_packages_org (or vice versa)
DROP INDEX IF EXISTS idx_soap_patient_id; -- Keep idx_soap_records_patient_id (more descriptive)

-- Fix unindexed foreign keys (from advisor analysis Part 2)
CREATE INDEX IF NOT EXISTS idx_exercise_logs_prescribed_exercise_id ON public.exercise_logs(prescribed_exercise_id);
CREATE INDEX IF NOT EXISTS idx_goals_medical_record_id ON public.goals(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_packages_organization_id ON public.packages(organization_id);

-- Fix RLS Policies (Part 2)

-- package_usage
ALTER TABLE public.package_usage ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'package_usage' AND policyname = 'Organization members can view usage') THEN
        CREATE POLICY "Organization members can view usage" ON public.package_usage FOR SELECT TO authenticated USING (
            -- Direct check since organization_id exists on the table
            organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
            OR
            -- Allow patient to view their own usage
            patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
        );
    END IF;
END $$;

-- prescription_items
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_items' AND policyname = 'Users view their prescriptions') THEN
        CREATE POLICY "Users view their prescriptions" ON public.prescription_items FOR SELECT TO authenticated USING (
            EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.id = prescription_id AND (
                p.professional_id = auth.uid() OR 
                p.patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid()) OR
                p.organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
            ))
        );
    END IF;
END $$;

-- session_attachments
ALTER TABLE public.session_attachments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'session_attachments' AND policyname = 'View attachments') THEN
        CREATE POLICY "View attachments" ON public.session_attachments FOR SELECT TO authenticated USING (
             EXISTS (SELECT 1 FROM public.treatment_sessions ts JOIN public.patients p ON ts.patient_id = p.id WHERE ts.id = session_id AND (
                p.profile_id = auth.uid() OR
                ts.professional_id = auth.uid() OR
                ts.organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
             ))
        );
    END IF;
END $$;

-- treatment_goals
ALTER TABLE public.treatment_goals ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'treatment_goals' AND policyname = 'View goals') THEN
        CREATE POLICY "View goals" ON public.treatment_goals FOR SELECT TO authenticated USING (
            -- Join not needed if we trust patient_id, but to verify ownership:
            EXISTS (SELECT 1 FROM public.patients p WHERE p.id = treatment_goals.patient_id AND (
                 p.profile_id = auth.uid() OR
                 p.organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
            ))
        );
    END IF;
END $$;


-- whatsapp_metrics
-- Fix overly permissive policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_metrics' AND policyname = 'System can insert metrics') THEN
        ALTER POLICY "System can insert metrics" ON public.whatsapp_metrics 
        WITH CHECK (
            -- Restrict to system/admin functions or check organization
             EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (specialties::text[] @> ARRAY['admin']))
        );
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_metrics' AND policyname = 'System can update metrics') THEN
        ALTER POLICY "System can update metrics" ON public.whatsapp_metrics USING (
             EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (specialties::text[] @> ARRAY['admin']))
        );
    END IF;
END $$;
