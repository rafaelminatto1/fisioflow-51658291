-- REMOVER E RECRIAR VIEWS COMPLETAMENTE
DROP VIEW IF EXISTS public.appointments_full CASCADE;
DROP VIEW IF EXISTS public.therapist_stats CASCADE;

-- Recriar view appointments_full sem qualquer configuração de segurança
CREATE OR REPLACE VIEW public.appointments_full AS
SELECT 
    a.id,
    a.patient_id,
    a.therapist_id,
    a.appointment_date,
    a.appointment_time,
    a.duration,
    a.type,
    a.status,
    a.notes,
    a.room,
    a.end_time,
    a.cancellation_reason,
    a.reminder_sent,
    a.created_at,
    a.updated_at,
    a.created_by,
    p.name as patient_name,
    p.phone as patient_phone,
    p.email as patient_email,
    pr.full_name as therapist_name,
    pr.crefito as therapist_crefito,
    CONCAT(a.appointment_date, ' ', a.appointment_time) as full_datetime
FROM public.appointments a
LEFT JOIN public.patients p ON a.patient_id = p.id
LEFT JOIN public.profiles pr ON a.therapist_id = pr.id;

-- Recriar view therapist_stats sem qualquer configuração de segurança
CREATE OR REPLACE VIEW public.therapist_stats AS
SELECT 
    pr.id as therapist_id,
    pr.full_name as therapist_name,
    COUNT(DISTINCT a.patient_id) as total_patients,
    COUNT(a.id) as total_appointments,
    COUNT(CASE WHEN a.status = 'atendido' THEN 1 END) as completed_appointments,
    COUNT(CASE WHEN a.status = 'faltou' THEN 1 END) as missed_appointments,
    ROUND(
        COUNT(CASE WHEN a.status = 'atendido' THEN 1 END)::numeric / 
        NULLIF(COUNT(a.id), 0) * 100, 2
    ) as completion_rate
FROM public.profiles pr
LEFT JOIN public.appointments a ON pr.id = a.therapist_id
WHERE pr.role IN ('fisioterapeuta', 'admin')
GROUP BY pr.id, pr.full_name;