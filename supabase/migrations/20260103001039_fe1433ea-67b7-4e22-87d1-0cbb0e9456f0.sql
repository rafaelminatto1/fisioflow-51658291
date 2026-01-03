-- Migration: Fix organizational isolation in RLS policies
-- Issue: appointments_missing_org_rls - Cross-tenant data access vulnerability

-- ============================================
-- 1. CREATE/UPDATE HELPER FUNCTION FOR ORG CHECK
-- ============================================

-- Function to check if user belongs to an organization (optimized with SELECT auth.uid())
CREATE OR REPLACE FUNCTION public.user_belongs_to_organization_check(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = (SELECT auth.uid())
      AND organization_id = _org_id
      AND active = true
  )
$$;

-- Function to get user's organization from profiles (optimized for RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM profiles
  WHERE user_id = (SELECT auth.uid())
  LIMIT 1
$$;

-- ============================================
-- 2. FIX APPOINTMENTS RLS POLICIES
-- ============================================

-- Drop existing policies that don't filter by organization
DROP POLICY IF EXISTS "Admin and therapist can view all appointments" ON appointments;
DROP POLICY IF EXISTS "Admin and therapist can create appointments" ON appointments;
DROP POLICY IF EXISTS "Admin and therapist can update appointments" ON appointments;
DROP POLICY IF EXISTS "Admin and therapist can delete appointments" ON appointments;
DROP POLICY IF EXISTS "Intern can view all appointments" ON appointments;
DROP POLICY IF EXISTS "Intern can update appointment status" ON appointments;

-- Recreate with organization isolation
CREATE POLICY "Admin and therapist can view org appointments"
ON appointments FOR SELECT
USING (
    get_user_role() IN ('admin', 'therapist')
    AND (
      organization_id IS NULL 
      OR organization_id = get_current_user_org_id()
    )
);

CREATE POLICY "Intern can view org appointments"
ON appointments FOR SELECT
USING (
    get_user_role() = 'intern'
    AND (
      organization_id IS NULL 
      OR organization_id = get_current_user_org_id()
    )
);

CREATE POLICY "Admin and therapist can create org appointments"
ON appointments FOR INSERT
WITH CHECK (
    get_user_role() IN ('admin', 'therapist')
    AND (
      organization_id IS NULL 
      OR organization_id = get_current_user_org_id()
    )
);

CREATE POLICY "Admin and therapist can update org appointments"
ON appointments FOR UPDATE
USING (
    get_user_role() IN ('admin', 'therapist')
    AND (
      organization_id IS NULL 
      OR organization_id = get_current_user_org_id()
    )
)
WITH CHECK (
    get_user_role() IN ('admin', 'therapist')
    AND (
      organization_id IS NULL 
      OR organization_id = get_current_user_org_id()
    )
);

CREATE POLICY "Intern can update org appointments"
ON appointments FOR UPDATE
USING (
    get_user_role() = 'intern'
    AND (
      organization_id IS NULL 
      OR organization_id = get_current_user_org_id()
    )
)
WITH CHECK (
    get_user_role() = 'intern'
    AND (
      organization_id IS NULL 
      OR organization_id = get_current_user_org_id()
    )
);

CREATE POLICY "Admin and therapist can delete org appointments"
ON appointments FOR DELETE
USING (
    get_user_role() IN ('admin', 'therapist')
    AND (
      organization_id IS NULL 
      OR organization_id = get_current_user_org_id()
    )
);

-- ============================================
-- 3. FIX PAYMENTS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin and therapist can view all payments" ON payments;
DROP POLICY IF EXISTS "Admin and therapist can create payments" ON payments;
DROP POLICY IF EXISTS "Admin and therapist can update payments" ON payments;
DROP POLICY IF EXISTS "Admin and therapist can delete payments" ON payments;

-- Recreate with organization isolation via appointment relationship
CREATE POLICY "Admin and therapist can view org payments"
ON payments FOR SELECT
USING (
    get_user_role() IN ('admin', 'therapist')
    AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = payments.appointment_id
      AND (
        a.organization_id IS NULL 
        OR a.organization_id = get_current_user_org_id()
      )
    )
);

CREATE POLICY "Admin and therapist can create org payments"
ON payments FOR INSERT
WITH CHECK (
    get_user_role() IN ('admin', 'therapist')
    AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id
      AND (
        a.organization_id IS NULL 
        OR a.organization_id = get_current_user_org_id()
      )
    )
);

CREATE POLICY "Admin and therapist can update org payments"
ON payments FOR UPDATE
USING (
    get_user_role() IN ('admin', 'therapist')
    AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = payments.appointment_id
      AND (
        a.organization_id IS NULL 
        OR a.organization_id = get_current_user_org_id()
      )
    )
)
WITH CHECK (
    get_user_role() IN ('admin', 'therapist')
    AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id
      AND (
        a.organization_id IS NULL 
        OR a.organization_id = get_current_user_org_id()
      )
    )
);

CREATE POLICY "Admin and therapist can delete org payments"
ON payments FOR DELETE
USING (
    get_user_role() IN ('admin', 'therapist')
    AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = payments.appointment_id
      AND (
        a.organization_id IS NULL 
        OR a.organization_id = get_current_user_org_id()
      )
    )
);

-- ============================================
-- 4. FIX PATIENT_SESSIONS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin and therapist can view all patient sessions" ON patient_sessions;
DROP POLICY IF EXISTS "Admin and therapist can create patient sessions" ON patient_sessions;
DROP POLICY IF EXISTS "Admin and therapist can update patient sessions" ON patient_sessions;
DROP POLICY IF EXISTS "Admin and therapist can delete patient sessions" ON patient_sessions;

-- Recreate with organization isolation via patient relationship
CREATE POLICY "Admin and therapist can view org patient sessions"
ON patient_sessions FOR SELECT
USING (
    get_user_role() IN ('admin', 'therapist')
    AND EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_sessions.patient_id
      AND (
        p.organization_id IS NULL 
        OR p.organization_id = get_current_user_org_id()
      )
    )
);

CREATE POLICY "Admin and therapist can create org patient sessions"
ON patient_sessions FOR INSERT
WITH CHECK (
    get_user_role() IN ('admin', 'therapist')
    AND EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_id
      AND (
        p.organization_id IS NULL 
        OR p.organization_id = get_current_user_org_id()
      )
    )
);

CREATE POLICY "Admin and therapist can update org patient sessions"
ON patient_sessions FOR UPDATE
USING (
    get_user_role() IN ('admin', 'therapist')
    AND EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_sessions.patient_id
      AND (
        p.organization_id IS NULL 
        OR p.organization_id = get_current_user_org_id()
      )
    )
)
WITH CHECK (
    get_user_role() IN ('admin', 'therapist')
    AND EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_id
      AND (
        p.organization_id IS NULL 
        OR p.organization_id = get_current_user_org_id()
      )
    )
);

CREATE POLICY "Admin and therapist can delete org patient sessions"
ON patient_sessions FOR DELETE
USING (
    get_user_role() IN ('admin', 'therapist')
    AND EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_sessions.patient_id
      AND (
        p.organization_id IS NULL 
        OR p.organization_id = get_current_user_org_id()
      )
    )
);