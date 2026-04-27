-- Migration 0052: Fix RLS policies to use NULLIF(current_setting('app.org_id', true), '')
-- 
-- Problem: All policies using current_setting('app.org_id') without the second `true` argument
-- throw a Postgres error when app.org_id is not set in the session, causing 500 errors on INSERT.
--
-- Fix: Use NULLIF(current_setting('app.org_id', true), '')::uuid so that:
--   1. If app.org_id is unset → returns NULL → policy denies access (safe)
--   2. If app.org_id is empty string → returns NULL → policy denies access (safe)
--   3. If app.org_id is a valid UUID → casts correctly → policy allows access
--
-- Also adds WITH CHECK to all policies that were missing it (required for INSERT/UPDATE).

-- ============================================================
-- appointments
-- ============================================================
DROP POLICY IF EXISTS policy_appointments_isolation ON appointments;
DROP POLICY IF EXISTS org_isolation_appointments ON appointments;
CREATE POLICY policy_appointments_isolation ON appointments FOR ALL
  TO authenticated
  USING (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ============================================================
-- patients
-- ============================================================
DROP POLICY IF EXISTS policy_patients_isolation ON patients;
DROP POLICY IF EXISTS org_isolation_patients ON patients;
CREATE POLICY policy_patients_isolation ON patients FOR ALL
  TO authenticated
  USING (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ============================================================
-- sessions
-- ============================================================
DROP POLICY IF EXISTS policy_sessions_isolation ON sessions;
DROP POLICY IF EXISTS org_isolation_sessions ON sessions;
CREATE POLICY policy_sessions_isolation ON sessions FOR ALL
  TO authenticated
  USING (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ============================================================
-- blocked_slots
-- ============================================================
DROP POLICY IF EXISTS policy_blocked_slots_isolation ON blocked_slots;
DROP POLICY IF EXISTS org_isolation_blocked-slots ON blocked_slots;
CREATE POLICY policy_blocked_slots_isolation ON blocked_slots FOR ALL
  TO authenticated
  USING (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ============================================================
-- rooms
-- ============================================================
DROP POLICY IF EXISTS policy_rooms_isolation ON rooms;
CREATE POLICY policy_rooms_isolation ON rooms FOR ALL
  TO authenticated
  USING (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ============================================================
-- medical_records
-- ============================================================
DROP POLICY IF EXISTS policy_medical_records_isolation ON medical_records;
CREATE POLICY policy_medical_records_isolation ON medical_records FOR ALL
  TO authenticated
  USING (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ============================================================
-- schedule_capacity (if exists)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'schedule_capacity') THEN
    DROP POLICY IF EXISTS policy_schedule_capacity_isolation ON schedule_capacity;
    DROP POLICY IF EXISTS "org_isolation_schedule-capacity" ON schedule_capacity;
    EXECUTE $p$
      CREATE POLICY policy_schedule_capacity_isolation ON schedule_capacity FOR ALL
        TO authenticated
        USING (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
        WITH CHECK (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
    $p$;
  END IF;
END $$;
