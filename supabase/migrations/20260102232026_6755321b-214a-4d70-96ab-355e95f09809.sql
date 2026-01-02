-- Fix patient_appointment_summary view - correct the join condition
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
LEFT JOIN profiles p ON p.id = a.therapist_id
WHERE is_patient_owner(a.patient_id);