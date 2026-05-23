-- Migration 0100: Fix RLS policies with hyphens for schedule_capacity and others
-- Problem: Policies defined in 0057_rls_complete.sql with hyphens in their names (e.g. org_isolation_schedule-capacity)
-- are syntactically invalid without double quotes in PostgreSQL and were never created, causing RLS violations on insert.
-- Fix: Drop old hyphenated policies (if they exist) and create clean policies with underscores.

DO $$
BEGIN
  -- 1. schedule_capacity
  DROP POLICY IF EXISTS "org_isolation_schedule-capacity" ON public.schedule_capacity;
  DROP POLICY IF EXISTS org_isolation_schedule_capacity ON public.schedule_capacity;
  DROP POLICY IF EXISTS policy_schedule_capacity_isolation ON public.schedule_capacity;
  
  CREATE POLICY org_isolation_schedule_capacity ON public.schedule_capacity FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));

  -- 2. scheduling_notification_settings
  DROP POLICY IF EXISTS "org_isolation_scheduling-notification-settings" ON public.scheduling_notification_settings;
  DROP POLICY IF EXISTS org_isolation_scheduling_notification_settings ON public.scheduling_notification_settings;
  
  CREATE POLICY org_isolation_scheduling_notification_settings ON public.scheduling_notification_settings FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));

  -- 3. telemedicine_rooms
  DROP POLICY IF EXISTS "org_isolation_telemedicine-rooms" ON public.telemedicine_rooms;
  DROP POLICY IF EXISTS org_isolation_telemedicine_rooms ON public.telemedicine_rooms;
  
  CREATE POLICY org_isolation_telemedicine_rooms ON public.telemedicine_rooms FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));

  -- 4. therapist_commissions
  DROP POLICY IF EXISTS "org_isolation_therapist-commissions" ON public.therapist_commissions;
  DROP POLICY IF EXISTS org_isolation_therapist_commissions ON public.therapist_commissions;
  
  CREATE POLICY org_isolation_therapist_commissions ON public.therapist_commissions FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));

  -- 5. time_entries
  DROP POLICY IF EXISTS "org_isolation_time-entries" ON public.time_entries;
  DROP POLICY IF EXISTS org_isolation_time_entries ON public.time_entries;
  
  CREATE POLICY org_isolation_time_entries ON public.time_entries FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));

  -- 6. treatment_plans
  DROP POLICY IF EXISTS "org_isolation_treatment-plans" ON public.treatment_plans;
  DROP POLICY IF EXISTS org_isolation_treatment_plans ON public.treatment_plans;
  
  CREATE POLICY org_isolation_treatment_plans ON public.treatment_plans FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));

  -- 7. treatment_sessions
  DROP POLICY IF EXISTS "org_isolation_treatment-sessions" ON public.treatment_sessions;
  DROP POLICY IF EXISTS org_isolation_treatment_sessions ON public.treatment_sessions;
  
  CREATE POLICY org_isolation_treatment_sessions ON public.treatment_sessions FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));

  -- 8. user_invitations
  DROP POLICY IF EXISTS "org_isolation_user-invitations" ON public.user_invitations;
  DROP POLICY IF EXISTS org_isolation_user_invitations ON public.user_invitations;
  
  CREATE POLICY org_isolation_user_invitations ON public.user_invitations FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));

  -- 9. user_vouchers
  DROP POLICY IF EXISTS "org_isolation_user-vouchers" ON public.user_vouchers;
  DROP POLICY IF EXISTS org_isolation_user_vouchers ON public.user_vouchers;
  
  CREATE POLICY org_isolation_user_vouchers ON public.user_vouchers FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));
END $$;
