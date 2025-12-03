-- Fix Security Definer Views - Set security_invoker = true to enforce RLS
-- This ensures views respect the RLS policies of the underlying tables

-- Recreate eventos_resumo with security_invoker
DROP VIEW IF EXISTS public.eventos_resumo;
CREATE VIEW public.eventos_resumo
WITH (security_invoker = true)
AS
SELECT e.id,
    e.nome,
    e.status,
    e.data_inicio,
    e.data_fim,
    e.categoria,
    count(DISTINCT p.id) AS total_participantes,
    count(DISTINCT pr.id) AS total_prestadores,
    COALESCE(sum(pr.valor_acordado), 0::numeric) AS custo_prestadores,
    COALESCE(sum(ci.quantidade::numeric * ci.custo_unitario), 0::numeric) AS custo_checklist,
    COALESCE(sum(pg.valor), 0::numeric) AS pagamentos_totais
FROM eventos e
LEFT JOIN participantes p ON p.evento_id = e.id
LEFT JOIN prestadores pr ON pr.evento_id = e.id
LEFT JOIN checklist_items ci ON ci.evento_id = e.id
LEFT JOIN pagamentos pg ON pg.evento_id = e.id
GROUP BY e.id;

-- Recreate financial_summary with security_invoker
DROP VIEW IF EXISTS public.financial_summary;
CREATE VIEW public.financial_summary
WITH (security_invoker = true)
AS
SELECT date_trunc('month'::text, appointment_date::timestamp with time zone)::date AS month,
    organization_id,
    count(*) AS total_appointments,
    count(*) FILTER (WHERE payment_status = 'paid'::text) AS paid_appointments,
    COALESCE(sum(payment_amount) FILTER (WHERE payment_status = 'paid'::text), 0::numeric) AS total_revenue,
    COALESCE(sum(payment_amount) FILTER (WHERE payment_status = 'pending'::text), 0::numeric) AS pending_revenue,
    count(DISTINCT patient_id) AS unique_patients
FROM appointments a
WHERE appointment_date >= (CURRENT_DATE - '1 year'::interval)
GROUP BY (date_trunc('month'::text, appointment_date::timestamp with time zone)), organization_id
ORDER BY (date_trunc('month'::text, appointment_date::timestamp with time zone)::date) DESC;

-- Recreate new_patients_by_period with security_invoker
DROP VIEW IF EXISTS public.new_patients_by_period;
CREATE VIEW public.new_patients_by_period
WITH (security_invoker = true)
AS
SELECT date_trunc('week'::text, created_at)::date AS week_start,
    organization_id,
    count(*) AS new_patients
FROM patients
WHERE created_at >= (CURRENT_DATE - '6 mons'::interval)
GROUP BY (date_trunc('week'::text, created_at)), organization_id
ORDER BY (date_trunc('week'::text, created_at)::date) DESC;

-- Recreate patient_activity_summary with security_invoker
DROP VIEW IF EXISTS public.patient_activity_summary;
CREATE VIEW public.patient_activity_summary
WITH (security_invoker = true)
AS
SELECT id,
    name,
    organization_id,
    created_at,
    status,
    (SELECT max(a.appointment_date) AS max
     FROM appointments a
     WHERE a.patient_id = p.id) AS last_appointment_date,
    (SELECT count(*) AS count
     FROM appointments a
     WHERE a.patient_id = p.id AND a.status = 'completed'::text) AS total_completed_sessions,
    (SELECT COALESCE(sum(sp.remaining_sessions), 0::bigint) AS "coalesce"
     FROM session_packages sp
     WHERE sp.patient_id = p.id AND sp.status = 'ativo'::package_status) AS sessions_available,
    CASE
        WHEN ((SELECT max(a.appointment_date) AS max
               FROM appointments a
               WHERE a.patient_id = p.id)) >= (CURRENT_DATE - '30 days'::interval) THEN 'active'::text
        WHEN ((SELECT max(a.appointment_date) AS max
               FROM appointments a
               WHERE a.patient_id = p.id)) >= (CURRENT_DATE - '90 days'::interval) THEN 'inactive'::text
        ELSE 'dormant'::text
    END AS activity_status
FROM patients p;

-- Recreate security_events with security_invoker
DROP VIEW IF EXISTS public.security_events;
CREATE VIEW public.security_events
WITH (security_invoker = true)
AS
SELECT al.id,
    al."timestamp",
    al.action,
    al.table_name,
    p.full_name AS user_name,
    p.email AS user_email,
    al.old_data,
    al.new_data
FROM audit_log al
LEFT JOIN profiles p ON p.user_id = al.user_id
WHERE al.action ~~ '%ROLE%'::text OR al.action ~~ '%INVITATION%'::text
ORDER BY al."timestamp" DESC;

-- Recreate suspicious_login_activity with security_invoker
DROP VIEW IF EXISTS public.suspicious_login_activity;
CREATE VIEW public.suspicious_login_activity
WITH (security_invoker = true)
AS
SELECT email,
    count(*) FILTER (WHERE NOT success) AS failed_attempts,
    max(created_at) FILTER (WHERE NOT success) AS last_attempt,
    array_agg(DISTINCT ip_address::text) AS ip_addresses
FROM login_attempts
WHERE created_at > (now() - '24:00:00'::interval)
GROUP BY email
HAVING count(*) FILTER (WHERE NOT success) >= 3
ORDER BY (count(*) FILTER (WHERE NOT success)) DESC;

-- Grant permissions to authenticated users
GRANT SELECT ON public.eventos_resumo TO authenticated;
GRANT SELECT ON public.financial_summary TO authenticated;
GRANT SELECT ON public.new_patients_by_period TO authenticated;
GRANT SELECT ON public.patient_activity_summary TO authenticated;
GRANT SELECT ON public.security_events TO authenticated;
GRANT SELECT ON public.suspicious_login_activity TO authenticated;