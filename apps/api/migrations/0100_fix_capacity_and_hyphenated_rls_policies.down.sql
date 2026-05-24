-- Rollback for Migration 0100

-- We do not recreate the hyphenated policies because they were syntactically invalid
-- and caused errors, but we can drop the clean underscore ones to rollback.

DROP POLICY IF EXISTS org_isolation_schedule_capacity ON public.schedule_capacity;
DROP POLICY IF EXISTS org_isolation_scheduling_notification_settings ON public.scheduling_notification_settings;
DROP POLICY IF EXISTS org_isolation_telemedicine_rooms ON public.telemedicine_rooms;
DROP POLICY IF EXISTS org_isolation_therapist_commissions ON public.therapist_commissions;
DROP POLICY IF EXISTS org_isolation_time_entries ON public.time_entries;
DROP POLICY IF EXISTS org_isolation_treatment_plans ON public.treatment_plans;
DROP POLICY IF EXISTS org_isolation_treatment_sessions ON public.treatment_sessions;
DROP POLICY IF EXISTS org_isolation_user_invitations ON public.user_invitations;
DROP POLICY IF EXISTS org_isolation_user_vouchers ON public.user_vouchers;
DROP POLICY IF EXISTS org_isolation_business_hours ON public.business_hours;
DROP POLICY IF EXISTS org_isolation_cancellation_rules ON public.cancellation_rules;
DROP POLICY IF EXISTS org_isolation_security_events ON public.security_events;
DROP POLICY IF EXISTS org_isolation_staff_performance_metrics ON public.staff_performance_metrics;
DROP POLICY IF EXISTS org_isolation_waitlist_offers ON public.waitlist_offers;
DROP POLICY IF EXISTS org_isolation_wearable_data ON public.wearable_data;
DROP POLICY IF EXISTS org_isolation_whatsapp_exercise_queue ON public.whatsapp_exercise_queue;
DROP POLICY IF EXISTS org_isolation_whatsapp_messages ON public.whatsapp_messages;
