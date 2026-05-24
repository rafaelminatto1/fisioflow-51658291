-- Migration 0100: Fix RLS policies with hyphens for schedule_capacity, business_hours and others
-- Problem: Policies defined in 0057_rls_complete.sql with hyphens in their names (e.g. org_isolation_schedule-capacity, org_isolation_business-hours)
-- are syntactically invalid without double quotes in PostgreSQL and were never created, causing RLS violations on insert/update.
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

  -- 10. business_hours
  DROP POLICY IF EXISTS "org_isolation_business-hours" ON public.business_hours;
  DROP POLICY IF EXISTS org_isolation_business_hours ON public.business_hours;
  
  CREATE POLICY org_isolation_business_hours ON public.business_hours FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));

  -- 11. cancellation_rules
  DROP POLICY IF EXISTS "org_isolation_cancellation-rules" ON public.cancellation_rules;
  DROP POLICY IF EXISTS org_isolation_cancellation_rules ON public.cancellation_rules;
  
  CREATE POLICY org_isolation_cancellation_rules ON public.cancellation_rules FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));

  -- 12. security_events
  DROP POLICY IF EXISTS "org_isolation_security-events" ON public.security_events;
  DROP POLICY IF EXISTS org_isolation_security_events ON public.security_events;
  
  CREATE POLICY org_isolation_security_events ON public.security_events FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));

  -- 13. staff_performance_metrics
  DROP POLICY IF EXISTS "org_isolation_staff-performance-metrics" ON public.staff_performance_metrics;
  DROP POLICY IF EXISTS org_isolation_staff_performance_metrics ON public.staff_performance_metrics;
  
  CREATE POLICY org_isolation_staff_performance_metrics ON public.staff_performance_metrics FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));

  -- 14. waitlist_offers
  DROP POLICY IF EXISTS "org_isolation_waitlist-offers" ON public.waitlist_offers;
  DROP POLICY IF EXISTS org_isolation_waitlist_offers ON public.waitlist_offers;
  
  CREATE POLICY org_isolation_waitlist_offers ON public.waitlist_offers FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));

  -- 15. wearable_data
  DROP POLICY IF EXISTS "org_isolation_wearable-data" ON public.wearable_data;
  DROP POLICY IF EXISTS org_isolation_wearable_data ON public.wearable_data;
  
  CREATE POLICY org_isolation_wearable_data ON public.wearable_data FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));

  -- 16. whatsapp_exercise_queue
  DROP POLICY IF EXISTS "org_isolation_whatsapp-exercise-queue" ON public.whatsapp_exercise_queue;
  DROP POLICY IF EXISTS org_isolation_whatsapp_exercise_queue ON public.whatsapp_exercise_queue;
  
  CREATE POLICY org_isolation_whatsapp_exercise_queue ON public.whatsapp_exercise_queue FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));

  -- 17. whatsapp_messages
  DROP POLICY IF EXISTS "org_isolation_whatsapp-messages" ON public.whatsapp_messages;
  DROP POLICY IF EXISTS org_isolation_whatsapp_messages ON public.whatsapp_messages;
  
  CREATE POLICY org_isolation_whatsapp_messages ON public.whatsapp_messages FOR ALL
    USING (organization_id::text = current_setting('app.org_id', true))
    WITH CHECK (organization_id::text = current_setting('app.org_id', true));
END $$;
