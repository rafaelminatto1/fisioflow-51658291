-- REMOVER E RECRIAR VIEWS COMPLETAMENTE
DROP VIEW IF EXISTS public.appointments_full CASCADE;
DROP VIEW IF EXISTS public.therapist_stats CASCADE;

-- Recriar view appointments_full usando EXECUTE para evitar erros de colunas inexistentes
DO $$
DECLARE
    has_created_by BOOLEAN;
    has_crefito BOOLEAN;
    view_sql TEXT;
BEGIN
    has_created_by := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'created_by');
    has_crefito := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'crefito');
    
    view_sql := 'CREATE OR REPLACE VIEW public.appointments_full AS
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
            a.updated_at';
    
    IF has_created_by THEN
        view_sql := view_sql || ', a.created_by';
    ELSE
        view_sql := view_sql || ', NULL::uuid as created_by';
    END IF;
    
    view_sql := view_sql || ',
            p.name as patient_name,
            p.phone as patient_phone,
            p.email as patient_email,
            pr.full_name as therapist_name';
    
    IF has_crefito THEN
        view_sql := view_sql || ', pr.crefito as therapist_crefito';
    ELSE
        view_sql := view_sql || ', NULL::text as therapist_crefito';
    END IF;
    
    view_sql := view_sql || ',
            CONCAT(COALESCE(a.appointment_date::text, ''''), '' '', COALESCE(a.appointment_time::text, '''')) as full_datetime
        FROM public.appointments a
        LEFT JOIN public.patients p ON a.patient_id = p.id
        LEFT JOIN public.profiles pr ON a.therapist_id = pr.id';
    
    EXECUTE view_sql;
END $$;

-- Recriar view therapist_stats usando EXECUTE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.therapist_stats AS
        SELECT 
            pr.id as therapist_id,
            pr.full_name as therapist_name,
            COUNT(DISTINCT a.patient_id) as total_patients,
            COUNT(a.id) as total_appointments,
            COUNT(CASE WHEN a.status = ''atendido'' THEN 1 END) as completed_appointments,
            COUNT(CASE WHEN a.status = ''faltou'' THEN 1 END) as missed_appointments,
            ROUND(
                COUNT(CASE WHEN a.status = ''atendido'' THEN 1 END)::numeric / 
                NULLIF(COUNT(a.id), 0) * 100, 2
            ) as completion_rate
        FROM public.profiles pr
        LEFT JOIN public.appointments a ON pr.id = a.therapist_id
        WHERE (pr.role IN (''fisioterapeuta'', ''admin'') OR pr.role IS NULL)
        GROUP BY pr.id, pr.full_name';
    ELSE
        EXECUTE 'CREATE OR REPLACE VIEW public.therapist_stats AS
        SELECT 
            pr.id as therapist_id,
            pr.full_name as therapist_name,
            COUNT(DISTINCT a.patient_id) as total_patients,
            COUNT(a.id) as total_appointments,
            COUNT(CASE WHEN a.status = ''atendido'' THEN 1 END) as completed_appointments,
            COUNT(CASE WHEN a.status = ''faltou'' THEN 1 END) as missed_appointments,
            ROUND(
                COUNT(CASE WHEN a.status = ''atendido'' THEN 1 END)::numeric / 
                NULLIF(COUNT(a.id), 0) * 100, 2
            ) as completion_rate
        FROM public.profiles pr
        LEFT JOIN public.appointments a ON pr.id = a.therapist_id
        GROUP BY pr.id, pr.full_name';
    END IF;
END $$;