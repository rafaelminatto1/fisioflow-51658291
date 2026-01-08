-- =====================================================
-- Fix Additional RLS Policies: profiles.id -> profiles.user_id
-- Created: 2026-01-08
-- =====================================================

-- This migration fixes remaining RLS policies that incorrectly use
-- profiles.id = auth.uid() instead of profiles.user_id = auth.uid()

-- 1. Fix database_backups policy
DROP POLICY IF EXISTS "Admins can view backups" ON database_backups;
CREATE POLICY "Admins can view backups"
  ON database_backups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 2. Fix audit_log (old table) policies if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log' AND table_schema = 'public') THEN
    -- Drop and recreate the admin view policy
    DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
    
    EXECUTE 'CREATE POLICY "Admins can view audit log" ON public.audit_log
      FOR SELECT USING (
        EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = ''admin'')
        OR
        EXISTS(SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND role = ''admin'')
      )';
  END IF;
END $$;

-- 3. Fix clinic_settings policies if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinic_settings' AND table_schema = 'public') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Admins can manage clinic settings" ON public.clinic_settings;
    DROP POLICY IF EXISTS "Staff can view clinic settings" ON public.clinic_settings;
    
    -- Recreate with correct user_id reference
    EXECUTE 'CREATE POLICY "Admins can manage clinic settings" ON public.clinic_settings
      FOR ALL USING (
        EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = ''admin'')
        OR
        EXISTS(SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND role = ''admin'')
      )';
    
    EXECUTE 'CREATE POLICY "Staff can view clinic settings" ON public.clinic_settings
      FOR SELECT USING (
        EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN (''fisioterapeuta'', ''estagiario'', ''admin''))
        OR
        EXISTS(SELECT 1 FROM public.organization_members WHERE user_id = auth.uid())
      )';
  END IF;
END $$;

-- 4. Fix notifications policies if table exists  
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
    -- The notifications table uses recipient_id which references profiles.id
    -- We need to check if recipient matches a profile belonging to the current user
    DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
    
    EXECUTE 'CREATE POLICY "Users can view their notifications" ON public.notifications
      FOR SELECT USING (
        recipient_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      )';
      
    EXECUTE 'CREATE POLICY "Users can update their notifications" ON public.notifications
      FOR UPDATE USING (
        recipient_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      )';
  END IF;
END $$;

COMMENT ON MIGRATION IS 'Fix RLS policies to use profiles.user_id instead of profiles.id for auth.uid() comparisons';

