-- Migration: Secure RLS Policies
-- Description: Restricts write access on sensitive tables to admin/therapist roles.

-- 1. assessment_test_configs
-- Drop overly permissive policies
DROP POLICY IF EXISTS "assessment_test_configs_auth_all" ON public.assessment_test_configs;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.assessment_test_configs;

-- Re-create with stricter controls
-- Everyone can read
CREATE POLICY "everyone_can_read_configs" ON public.assessment_test_configs
    FOR SELECT TO authenticated USING (true);

-- Only staff can modify
CREATE POLICY "staff_can_modify_configs" ON public.assessment_test_configs
    FOR ALL TO authenticated 
    USING (get_user_role() IN ('admin', 'therapist'))
    WITH CHECK (get_user_role() IN ('admin', 'therapist'));


-- 2. knowledge_documents
DROP POLICY IF EXISTS "knowledge_documents_auth_insert" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Authenticated users can insert knowledge documents." ON public.knowledge_documents;

-- Only staff can upload/insert
CREATE POLICY "staff_can_insert_documents" ON public.knowledge_documents
    FOR INSERT TO authenticated 
    WITH CHECK (get_user_role() IN ('admin', 'therapist'));


-- 3. notification_history
DROP POLICY IF EXISTS "System can insert notification history" ON public.notification_history;
DROP POLICY IF EXISTS "System can update notification history" ON public.notification_history;

-- Allow admins to manage history if needed (Service Role bypasses RLS automatically)
CREATE POLICY "admins_can_manage_history" ON public.notification_history
    FOR ALL TO authenticated 
    USING (get_user_role() = 'admin');


-- 4. notification_templates
DROP POLICY IF EXISTS "Authenticated users can manage notification templates" ON public.notification_templates;

-- Only staff can manage templates
CREATE POLICY "staff_can_manage_templates" ON public.notification_templates
    FOR ALL TO authenticated 
    USING (get_user_role() IN ('admin', 'therapist'));
