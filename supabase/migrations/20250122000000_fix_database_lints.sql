-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move pg_net extension to extensions schema
-- ALTER EXTENSION pg_net SET SCHEMA extensions; -- FAILED: extension "pg_net" does not support SET SCHEMA


-- Update search path for standard roles to include extensions
ALTER ROLE postgres SET search_path = public, extensions;
ALTER ROLE authenticated SET search_path = public, extensions;
ALTER ROLE service_role SET search_path = public, extensions;
ALTER ROLE anon SET search_path = public, extensions;

-- Fix Function Search Path Mutable warnings
-- Explicitly setting search_path to 'public, extensions' for all affected functions

ALTER FUNCTION public.update_standardized_test_results_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.update_notification_consent_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.check_appointment_conflict(uuid, date, time, time, uuid) SET search_path = public, extensions;
ALTER FUNCTION public.publish_goal_profile(text) SET search_path = public, extensions;
ALTER FUNCTION public.update_schedule_capacity_config_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.get_available_time_slots(uuid, date, integer) SET search_path = public, extensions;
-- ALTER FUNCTION public.create_test_user(text, text) SET search_path = public, extensions; -- Function does not exist

ALTER FUNCTION public.update_modified_column() SET search_path = public, extensions;
ALTER FUNCTION public.update_appointment_payment_status() SET search_path = public, extensions;
ALTER FUNCTION public.calculate_patient_trends(uuid, integer) SET search_path = public, extensions;
ALTER FUNCTION public.cleanup_expired_notification_data() SET search_path = public, extensions;
ALTER FUNCTION public.update_schedule_settings_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.calculate_comprehensive_adherence(uuid, uuid, timestamp with time zone, timestamp with time zone) SET search_path = public, extensions;
ALTER FUNCTION public.generate_weekly_reports() SET search_path = public, extensions;
ALTER FUNCTION public.trigger_calculate_session_metrics() SET search_path = public, extensions;
ALTER FUNCTION public.calculate_session_metrics(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.get_patient_progress_summary(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.update_notification_system_health() SET search_path = public, extensions;
ALTER FUNCTION public.cleanup_old_notification_data() SET search_path = public, extensions;
ALTER FUNCTION public.add_to_email_queue() SET search_path = public, extensions;
ALTER FUNCTION public.get_email_stats() SET search_path = public, extensions;
ALTER FUNCTION public.process_email_queue() SET search_path = public, extensions;
ALTER FUNCTION public.update_patient_sessions_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.create_session_package() SET search_path = public, extensions;
ALTER FUNCTION public.update_appointments_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.should_send_notification(uuid, varchar, timestamp with time zone) SET search_path = public, extensions;
ALTER FUNCTION public.log_notification(uuid, varchar, text, text, jsonb, varchar) SET search_path = public, extensions;
ALTER FUNCTION public.update_notification_status(uuid, varchar, text) SET search_path = public, extensions;
ALTER FUNCTION public.get_notification_analytics(timestamp with time zone, timestamp with time zone, uuid) SET search_path = public, extensions;
ALTER FUNCTION public.handle_appointment_notification() SET search_path = public, extensions;
ALTER FUNCTION public.update_waitlist_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.export_user_notification_data(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.delete_user_notification_data(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.use_session_from_package() SET search_path = public, extensions;
ALTER FUNCTION public.get_patient_financial_summary(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.get_user_role() SET search_path = public, extensions;
ALTER FUNCTION public.is_patient_owner(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.is_assigned_therapist(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.get_user_permissions() SET search_path = public, extensions;
ALTER FUNCTION public.audit_trigger() SET search_path = public, extensions;
ALTER FUNCTION public.audit_user_roles_changes() SET search_path = public, extensions;
ALTER FUNCTION public.generate_demo_uuid(text) SET search_path = public, extensions;
ALTER FUNCTION public.generate_demo_uuid_v2(text) SET search_path = public, extensions;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, extensions;
ALTER FUNCTION public.cleanup_old_notification_logs() SET search_path = public, extensions;
ALTER FUNCTION public.create_audit_log(uuid, varchar, varchar, jsonb, jsonb) SET search_path = public, extensions;
ALTER FUNCTION public.audit_trigger_function() SET search_path = public, extensions;

-- Fix Materialized View in API warnings
-- Revoke access from API roles to prevent exposure
REVOKE SELECT ON MATERIALIZED VIEW public.monthly_metrics FROM anon, authenticated;
REVOKE SELECT ON MATERIALIZED VIEW public.financial_metrics FROM anon, authenticated;
REVOKE SELECT ON MATERIALIZED VIEW public.clinical_metrics FROM anon, authenticated;
REVOKE SELECT ON MATERIALIZED VIEW public.patient_analytics FROM anon, authenticated;
