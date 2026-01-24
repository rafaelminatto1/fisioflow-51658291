-- ============================================================
-- MIGRATION: Consolidate Multiple RLS Policies
-- ============================================================
-- This migration consolidates multiple permissive policies
-- for the same table/command into single policies using OR logic.
--
-- Impact: Reduces policy evaluation overhead, simplifies management
-- ============================================================

-- ============================================================
-- Table: notification_templates
-- Consolidate 4 policies into 1
-- ============================================================

DROP POLICY IF EXISTS "consolidated_notification_templates_all" ON notification_templates;
DROP POLICY IF EXISTS "staff_manage_templates" ON notification_templates;

CREATE POLICY "consolidated_notification_templates_all"
ON notification_templates FOR ALL
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
  OR organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = (SELECT auth.uid())
  )
);

-- ============================================================
-- Table: payments
-- Consolidate multiple admin/org policies
-- ============================================================

DROP POLICY IF EXISTS "payments_admin_manage" ON payments;
DROP POLICY IF EXISTS "payments_org_manage" ON payments;

CREATE POLICY "consolidated_payments_all"
ON payments FOR ALL
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
  OR organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = (SELECT auth.uid())
  )
);

-- ============================================================
-- Table: session_attachments
-- Consolidate 4 policies into 1
-- ============================================================

DROP POLICY IF EXISTS "consolidated_session_attachments_all" ON session_attachments;
DROP POLICY IF EXISTS "session_attachments_manage" ON session_attachments;

CREATE POLICY "consolidated_session_attachments_all"
ON session_attachments FOR ALL
USING (
  (SELECT auth.uid()) IN (
    SELECT therapist_id FROM sessions
    WHERE sessions.id = session_attachments.session_id
  )
  OR (SELECT auth.uid()) IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

-- ============================================================
-- Table: clinical_benchmarks
-- Consolidate 5 policies into 1
-- ============================================================

DROP POLICY IF EXISTS "Admin can manage benchmarks" ON clinical_benchmarks;
DROP POLICY IF EXISTS "Therapists can view benchmarks" ON clinical_benchmarks;
DROP POLICY IF EXISTS "clinical_benchmarks_select" ON clinical_benchmarks;

CREATE POLICY "consolidated_clinical_benchmarks_all"
ON clinical_benchmarks FOR ALL
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = (SELECT auth.uid())
      AND om.organization_id = clinical_benchmarks.organization_id
  )
);

-- ============================================================
-- Table: appointments
-- Consolidate 4 policies
-- ============================================================

DROP POLICY IF EXISTS "authenticated_appointments_select" ON appointments;
DROP POLICY IF EXISTS "consolidated_appointments_all" ON appointments;
DROP POLICY IF EXISTS "patients_appointments_select" ON appointments;

CREATE POLICY "consolidated_appointments_select"
ON appointments FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM patients WHERE user_id = (SELECT auth.uid())
  )
  OR therapist_id = (SELECT auth.uid())
  OR (SELECT auth.uid()) IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

CREATE POLICY "consolidated_appointments_insert"
ON appointments FOR INSERT
WITH CHECK (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM organization_members
    WHERE organization_id = appointments.organization_id
      AND role IN ('admin', 'fisioterapeuta')
  )
);

CREATE POLICY "consolidated_appointments_update"
ON appointments FOR UPDATE
USING (
  therapist_id = (SELECT auth.uid())
  OR (SELECT auth.uid()) IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

CREATE POLICY "consolidated_appointments_delete"
ON appointments FOR DELETE
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

-- ============================================================
-- Table: message_templates
-- Consolidate duplicate policies
-- ============================================================

DROP POLICY IF EXISTS "Organization members read access" ON message_templates;
DROP POLICY IF EXISTS "message_templates_select" ON message_templates;

CREATE POLICY "consolidated_message_templates_select"
ON message_templates FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = (SELECT auth.uid())
  )
);

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check for remaining duplicate policy opportunities:
SELECT
  tablename,
  cmd,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;

-- Expected: Should show significantly fewer duplicate policies

-- ============================================================
-- NOTES
-- ============================================================

-- After consolidation:
-- 1. Test all CRUD operations on affected tables
-- 2. Verify RLS still allows correct access
-- 3. Check application logs for permission errors
