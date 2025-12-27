-- CORRIGIR PROBLEMAS DE SEGURANÇA DETECTADOS PELO LINTER

-- 1. Corrigir função validate_cpf para ter search_path seguro
CREATE OR REPLACE FUNCTION public.validate_cpf(cpf_input text)
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cpf text;
    sum1 integer := 0;
    sum2 integer := 0;
    i integer;
BEGIN
    -- Remove caracteres não numéricos
    cpf := regexp_replace(cpf_input, '[^0-9]', '', 'g');
    
    -- Verifica se tem 11 dígitos
    IF length(cpf) != 11 THEN
        RETURN false;
    END IF;
    
    -- Verifica sequências inválidas
    IF cpf IN ('00000000000', '11111111111', '22222222222', '33333333333', 
               '44444444444', '55555555555', '66666666666', '77777777777',
               '88888888888', '99999999999') THEN
        RETURN false;
    END IF;
    
    -- Calcula primeiro dígito verificador
    FOR i IN 1..9 LOOP
        sum1 := sum1 + (substr(cpf, i, 1)::integer * (11 - i));
    END LOOP;
    
    sum1 := 11 - (sum1 % 11);
    IF sum1 >= 10 THEN
        sum1 := 0;
    END IF;
    
    -- Verifica primeiro dígito
    IF sum1 != substr(cpf, 10, 1)::integer THEN
        RETURN false;
    END IF;
    
    -- Calcula segundo dígito verificador
    FOR i IN 1..10 LOOP
        sum2 := sum2 + (substr(cpf, i, 1)::integer * (12 - i));
    END LOOP;
    
    sum2 := 11 - (sum2 % 11);
    IF sum2 >= 10 THEN
        sum2 := 0;
    END IF;
    
    -- Verifica segundo dígito
    RETURN sum2 = substr(cpf, 11, 1)::integer;
END;
$$;

-- 2. Corrigir função get_patient_full_info para ter search_path seguro
CREATE OR REPLACE FUNCTION public.get_patient_full_info(patient_uuid uuid)
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'patient', to_jsonb(p.*),
        'profile', to_jsonb(pr.*),
        'latest_appointment', to_jsonb(latest_apt.*),
        'total_sessions', session_count.total,
        'latest_progress', to_jsonb(latest_prog.*)
    )
    INTO result
    FROM public.patients p
    LEFT JOIN public.profiles pr ON p.profile_id = pr.id
    LEFT JOIN LATERAL (
        SELECT * FROM public.appointments 
        WHERE patient_id = p.id 
        ORDER BY appointment_date DESC, appointment_time DESC 
        LIMIT 1
    ) latest_apt ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as total 
        FROM public.treatment_sessions 
        WHERE patient_id = p.id
    ) session_count ON true
    LEFT JOIN LATERAL (
        SELECT * FROM public.patient_progress 
        WHERE patient_id = p.id 
        ORDER BY progress_date DESC 
        LIMIT 1
    ) latest_prog ON true
    WHERE p.id = patient_uuid;
    
    RETURN result;
END;
$$;

-- 3. Corrigir função handle_new_user para ter search_path seguro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'fisioterapeuta')
  );
  RETURN NEW;
END;
$$;

-- 4. Corrigir função update_updated_at_column para ter search_path seguro
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 5. Corrigir função audit_trigger_function para ter search_path seguro
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.audit_log (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id,
        user_email
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        auth.uid(),
        auth.email()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. Recriar as views sem SECURITY DEFINER (elas não precisam disso)
DROP VIEW IF EXISTS public.appointments_full;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'crefito') THEN
        EXECUTE 'CREATE VIEW public.appointments_full AS
        SELECT 
            a.*,
            p.name as patient_name,
            p.phone as patient_phone,
            p.email as patient_email,
            pr.full_name as therapist_name,
            pr.crefito as therapist_crefito,
            CONCAT(COALESCE(a.appointment_date::text, ''''), '' '', COALESCE(a.appointment_time::text, '''')) as full_datetime
        FROM public.appointments a
        LEFT JOIN public.patients p ON a.patient_id = p.id
        LEFT JOIN public.profiles pr ON a.therapist_id = pr.id';
    ELSE
        EXECUTE 'CREATE VIEW public.appointments_full AS
        SELECT 
            a.*,
            p.name as patient_name,
            p.phone as patient_phone,
            p.email as patient_email,
            pr.full_name as therapist_name,
            NULL::text as therapist_crefito,
            CONCAT(COALESCE(a.appointment_date::text, ''''), '' '', COALESCE(a.appointment_time::text, '''')) as full_datetime
        FROM public.appointments a
        LEFT JOIN public.patients p ON a.patient_id = p.id
        LEFT JOIN public.profiles pr ON a.therapist_id = pr.id';
    END IF;
END $$;

DROP VIEW IF EXISTS public.therapist_stats;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        EXECUTE 'CREATE VIEW public.therapist_stats AS
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
        EXECUTE 'CREATE VIEW public.therapist_stats AS
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