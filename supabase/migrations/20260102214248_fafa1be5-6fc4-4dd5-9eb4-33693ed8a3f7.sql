-- =====================================================
-- FIX ERROR-LEVEL SECURITY ISSUES
-- =====================================================

-- 1. Enable RLS on sessions table (fixes SUPA_rls_disabled_in_public and SUPA_policy_exists_rls_disabled)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 2. Fix patient_appointment_summary view - remove auth.users reference and add security_invoker
-- This fixes SUPA_auth_users_exposed and SUPA_security_definer_view
DROP VIEW IF EXISTS public.patient_appointment_summary;
CREATE VIEW public.patient_appointment_summary
WITH (security_invoker = true)
AS
SELECT 
    a.id,
    COALESCE(a.date, a.appointment_date) AS date,
    COALESCE(a.start_time, a.appointment_time) AS start_time,
    a.end_time,
    a.status,
    a.payment_status,
    'individual'::text AS session_type,
    a.notes,
    COALESCE(p.full_name, 'Fisioterapeuta'::text) AS therapist_name
FROM appointments a
LEFT JOIN profiles p ON p.user_id = a.therapist_id
WHERE is_patient_owner(a.patient_id);

-- 3. Fix patient_timeline view - add security_invoker
DROP VIEW IF EXISTS public.patient_timeline;
CREATE VIEW public.patient_timeline
WITH (security_invoker = true)
AS
SELECT 
    ts.id AS session_id,
    ts.patient_id,
    COALESCE(ts.session_date, (ts.created_at)::date) AS session_date,
    'treatment'::character varying(20) AS session_type,
    ts.pain_level,
    NULL::integer AS functional_score,
    'completed'::character varying(20) AS status,
    NULL::integer AS pain_improvement,
    NULL::integer AS functional_improvement,
    NULL::numeric(5,2) AS exercise_compliance,
    NULL::numeric(5,2) AS session_effectiveness,
    p.name AS patient_name
FROM treatment_sessions ts
LEFT JOIN patients p ON ts.patient_id = p.id
ORDER BY COALESCE(ts.session_date, (ts.created_at)::date) DESC;

-- 4. Fix report_summaries view - add security_invoker
DROP VIEW IF EXISTS public.report_summaries;
CREATE VIEW public.report_summaries
WITH (security_invoker = true)
AS
SELECT 'adherence'::text AS report_type,
    ar.id,
    ar.patient_id,
    p.name AS patient_name,
    ar.plan_id,
    ep.name AS plan_name,
    ar.adherence_percentage AS main_metric,
    ar.created_at
FROM adherence_reports ar
JOIN patients p ON p.id = ar.patient_id
JOIN exercise_plans ep ON ep.id = ar.plan_id
UNION ALL
SELECT 'progress'::text AS report_type,
    pr.id,
    pr.patient_id,
    p.name AS patient_name,
    pr.plan_id,
    ep.name AS plan_name,
    ((pr.metrics ->> 'goal_achievement'::text))::numeric AS main_metric,
    pr.created_at
FROM progress_reports pr
JOIN patients p ON p.id = pr.patient_id
JOIN exercise_plans ep ON ep.id = pr.plan_id;

-- 5. Fix therapist_dashboard view - add security_invoker
DROP VIEW IF EXISTS public.therapist_dashboard;
CREATE VIEW public.therapist_dashboard
WITH (security_invoker = true)
AS
SELECT 
    a.id,
    a.patient_id,
    p.name AS patient_name,
    p.phone AS patient_phone,
    COALESCE(a.date, a.appointment_date) AS date,
    COALESCE(a.start_time, a.appointment_time) AS start_time,
    a.end_time,
    a.status,
    a.payment_status,
    'individual'::text AS session_type,
    a.notes,
    a.created_at,
    a.updated_at
FROM appointments a
JOIN patients p ON p.id = a.patient_id
WHERE get_user_role() = ANY (ARRAY['admin'::text, 'therapist'::text, 'intern'::text]);

-- 6. Fix today_appointments_with_packages view - add security_invoker
DROP VIEW IF EXISTS public.today_appointments_with_packages;
CREATE VIEW public.today_appointments_with_packages
WITH (security_invoker = true)
AS
SELECT 
    a.id,
    a.patient_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status,
    a.organization_id,
    p.name AS patient_name,
    COALESCE((
        SELECT pp.id
        FROM patient_packages pp
        WHERE pp.patient_id = a.patient_id 
        AND pp.sessions_used < pp.sessions_purchased 
        AND (pp.expires_at IS NULL OR pp.expires_at > now())
        LIMIT 1
    ), NULL::uuid) AS active_package_id
FROM appointments a
JOIN patients p ON a.patient_id = p.id
WHERE a.appointment_date = CURRENT_DATE;