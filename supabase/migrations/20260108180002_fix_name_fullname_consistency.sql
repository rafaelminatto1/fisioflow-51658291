-- Migration: Fix name/full_name consistency across tables
-- Description: Rename patients.name to patients.full_name for consistency
-- Date: 2026-01-08

-- ============================================================
-- STEP 1: BACKUP AND DROP DEPENDENT VIEWS
-- ============================================================

DROP VIEW IF EXISTS public.appointments_full CASCADE;
DROP VIEW IF EXISTS public.therapist_stats CASCADE;
DROP VIEW IF EXISTS public.patient_appointment_summary CASCADE;

-- ============================================================
-- STEP 2: RENAME COLUMN IN PATIENTS TABLE
-- ============================================================

-- Rename name to full_name for consistency with profiles table
ALTER TABLE public.patients RENAME COLUMN name TO full_name;

-- ============================================================
-- STEP 3: UPDATE TABLE COMMENTS
-- ============================================================

COMMENT ON COLUMN public.patients.full_name IS 'Patient full name (consistent with profiles.full_name)';

-- ============================================================
-- STEP 4: RECREATE VIEWS WITH UPDATED COLUMN NAMES
-- ============================================================

-- Recreate appointments_full view
CREATE OR REPLACE VIEW public.appointments_full AS
SELECT 
    a.id,
    a.patient_id,
    a.therapist_id,
    a.date,
    a.start_time,
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
    -- Removed dynamic check for created_by as it fails SQL parsing if column missing
    NULL::uuid as created_by,
    p.full_name as patient_name,
    p.phone as patient_phone,
    p.email as patient_email,
    pr.full_name as therapist_name,
    -- Removed dynamic check for crefito
    NULL as therapist_crefito,
    CONCAT(COALESCE(a.date::text, ''), ' ', COALESCE(a.start_time::text, '')) as full_datetime
FROM public.appointments a
LEFT JOIN public.patients p ON a.patient_id = p.id
LEFT JOIN public.profiles pr ON a.therapist_id = pr.id;

-- Recreate patient_appointment_summary view
CREATE OR REPLACE VIEW public.patient_appointment_summary
WITH (security_invoker = true)
AS
SELECT 
    a.id,
    a.date,
    a.start_time,
    a.end_time,
    a.status,
    a.payment_status,
    'individual'::text AS session_type,
    a.notes,
    COALESCE(pr.full_name, 'Fisioterapeuta'::text) AS therapist_name
FROM public.appointments a
LEFT JOIN profiles pr ON pr.id = a.therapist_id
WHERE is_patient_owner(a.patient_id);

-- ============================================================
-- STEP 5: UPDATE THERAPIST_STATS VIEW IF EXISTS
-- ============================================================

-- Recreate therapist_stats view using full_name consistently
CREATE OR REPLACE VIEW public.therapist_stats AS
SELECT 
    pr.id,
    pr.full_name,
    pr.role,
    COUNT(a.id) AS total_appointments,
    COUNT(CASE WHEN a.status = 'agendado' THEN 1 END) AS scheduled_count,
    COUNT(CASE WHEN a.status = 'confirmado' THEN 1 END) AS confirmed_count,
    COUNT(CASE WHEN a.status = 'atendido' THEN 1 END) AS completed_count,
    COUNT(CASE WHEN a.status = 'cancelado' THEN 1 END) AS cancelled_count,
    COUNT(CASE WHEN a.status = 'faltou' THEN 1 END) AS no_show_count
FROM public.profiles pr
LEFT JOIN public.appointments a ON pr.id = a.therapist_id
WHERE pr.role IN ('fisioterapeuta', 'admin', 'estagiario')
GROUP BY pr.id, pr.full_name, pr.role;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: patients.name renamed to patients.full_name';
END $$;
