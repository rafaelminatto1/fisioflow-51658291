-- Migration: Fix RLS policies that incorrectly use profiles.id instead of profiles.user_id
-- Issue: "column user_id does not exist" error when querying appointments
-- Root cause: RLS policies use profiles.id = auth.uid() when they should use profiles.user_id = auth.uid()
-- Improvement: Use optimized helper function for better performance

-- ============================================
-- CREATE/UPDATE HELPER FUNCTION (if not exists)
-- ============================================

-- Function to get user's organization from profiles (optimized for RLS)
-- This function is cached and performs better than inline subqueries
CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_org 
ON public.profiles(user_id, organization_id) 
WHERE organization_id IS NOT NULL;

-- Index for appointments queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_appointments_org_date 
ON public.appointments(organization_id, appointment_date, appointment_time) 
WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_patient_date 
ON public.appointments(patient_id, appointment_date) 
WHERE patient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_status_date 
ON public.appointments(status, appointment_date) 
WHERE status IS NOT NULL;

-- ============================================
-- FIX APPOINTMENTS RLS POLICIES
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'organization_id') THEN
      -- Drop existing incorrect policies
      DROP POLICY IF EXISTS "appointments_org_select" ON public.appointments;
      DROP POLICY IF EXISTS "appointments_org_insert" ON public.appointments;
      DROP POLICY IF EXISTS "appointments_org_update" ON public.appointments;
      DROP POLICY IF EXISTS "appointments_org_delete" ON public.appointments;
    
      -- Recreate with optimized helper function for better performance
      CREATE POLICY "appointments_org_select" ON public.appointments
        FOR SELECT TO authenticated USING (
          organization_id IS NULL 
          OR organization_id = get_current_user_org_id()
        );
    
      CREATE POLICY "appointments_org_insert" ON public.appointments
        FOR INSERT TO authenticated
        WITH CHECK (
          organization_id IS NULL 
          OR organization_id = get_current_user_org_id()
        );
    
      CREATE POLICY "appointments_org_update" ON public.appointments
        FOR UPDATE TO authenticated USING (
          organization_id IS NULL 
          OR organization_id = get_current_user_org_id()
        );
    
      CREATE POLICY "appointments_org_delete" ON public.appointments
        FOR DELETE TO authenticated USING (
          organization_id IS NULL 
          OR organization_id = get_current_user_org_id()
        );
    END IF;
  END IF;
END $$;

-- ============================================
-- FIX OTHER TABLES RLS POLICIES (if they exist)
-- ===========================================

-- Fix patients policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patients') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'organization_id') THEN
      DROP POLICY IF EXISTS "patients_org_select" ON public.patients;
      DROP POLICY IF EXISTS "patients_org_insert" ON public.patients;
      DROP POLICY IF EXISTS "patients_org_update" ON public.patients;
      DROP POLICY IF EXISTS "patients_org_delete" ON public.patients;
    
      CREATE POLICY "patients_org_select" ON public.patients
        FOR SELECT TO authenticated USING (
          organization_id IS NULL 
          OR organization_id = get_current_user_org_id()
        );
    
      CREATE POLICY "patients_org_insert" ON public.patients
        FOR INSERT TO authenticated
        WITH CHECK (
          organization_id IS NULL 
          OR organization_id = get_current_user_org_id()
        );
    
      CREATE POLICY "patients_org_update" ON public.patients
        FOR UPDATE TO authenticated USING (
          organization_id IS NULL 
          OR organization_id = get_current_user_org_id()
        );
    
      CREATE POLICY "patients_org_delete" ON public.patients
        FOR DELETE TO authenticated USING (
          organization_id IS NULL 
          OR organization_id = get_current_user_org_id()
        );
    END IF;
  END IF;
END $$;

-- Fix other common tables that might have the same issue
DO $$
DECLARE
  table_name TEXT;
  tables_to_fix TEXT[] := ARRAY['payments', 'patient_sessions', 'treatment_sessions', 'exercise_plans', 'prescriptions'];
BEGIN
  FOREACH table_name IN ARRAY tables_to_fix
  LOOP
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
      IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = table_name AND column_name = 'organization_id') THEN
        EXECUTE format('DROP POLICY IF EXISTS %I_org_select ON public.%I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I_org_insert ON public.%I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I_org_update ON public.%I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I_org_delete ON public.%I', table_name, table_name);
        
        EXECUTE format('
          CREATE POLICY %I_org_select ON public.%I
            FOR SELECT TO authenticated USING (
              organization_id IS NULL 
              OR organization_id = get_current_user_org_id()
            )', table_name, table_name);
        
        EXECUTE format('
          CREATE POLICY %I_org_insert ON public.%I
            FOR INSERT TO authenticated
            WITH CHECK (
              organization_id IS NULL 
              OR organization_id = get_current_user_org_id()
            )', table_name, table_name);
        
        EXECUTE format('
          CREATE POLICY %I_org_update ON public.%I
            FOR UPDATE TO authenticated USING (
              organization_id IS NULL 
              OR organization_id = get_current_user_org_id()
            )', table_name, table_name);
        
        EXECUTE format('
          CREATE POLICY %I_org_delete ON public.%I
            FOR DELETE TO authenticated USING (
              organization_id IS NULL 
              OR organization_id = get_current_user_org_id()
            )', table_name, table_name);
      END IF;
    END IF;
  END LOOP;
END $$;

