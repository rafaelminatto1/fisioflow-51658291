-- ===================================================
-- FISIOFLOW - ESTRUTURA COMPLETA DE DADOS
-- ===================================================

-- 1. ATUALIZAR TABELA PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cpf text UNIQUE,
ADD COLUMN IF NOT EXISTS specialties text[],
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS license_expiry date,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS emergency_contact jsonb;

-- Atualizar constraints de role (apenas se a coluna existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('admin', 'fisioterapeuta', 'estagiario', 'paciente', 'parceiro'));
    END IF;
END $$;

-- 2. ATUALIZAR TABELA PATIENTS
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS blood_type text,
ADD COLUMN IF NOT EXISTS allergies text,
ADD COLUMN IF NOT EXISTS medications text,
ADD COLUMN IF NOT EXISTS insurance_info jsonb,
ADD COLUMN IF NOT EXISTS consent_data boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_image boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS height_cm integer,
ADD COLUMN IF NOT EXISTS weight_kg numeric(5,2),
ADD COLUMN IF NOT EXISTS occupation text,
ADD COLUMN IF NOT EXISTS referral_source text;

-- 3. ATUALIZAR TABELA APPOINTMENTS
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS therapist_id uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS room text,
ADD COLUMN IF NOT EXISTS end_time time,
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false;

-- Melhorar constraints de appointments
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('agendado', 'confirmado', 'atendido', 'cancelado', 'faltou', 'reagendado'));

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_type_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_type_check 
CHECK (type IN ('avaliacao', 'fisioterapia', 'reavaliacao', 'retorno', 'consulta_inicial'));

-- 4. ATUALIZAR TABELA MEDICAL_RECORDS
ALTER TABLE public.medical_records 
ADD COLUMN IF NOT EXISTS therapist_id uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS chief_complaint text,
ADD COLUMN IF NOT EXISTS current_history text,
ADD COLUMN IF NOT EXISTS physical_exam jsonb,
ADD COLUMN IF NOT EXISTS diagnosis text,
ADD COLUMN IF NOT EXISTS icd10 text,
ADD COLUMN IF NOT EXISTS coffito_code text,
ADD COLUMN IF NOT EXISTS treatment_plan jsonb,
ADD COLUMN IF NOT EXISTS session_number integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS vital_signs jsonb,
ADD COLUMN IF NOT EXISTS functional_assessment jsonb;

-- 5. CRIAR TABELA DE AUDITORIA
CREATE TABLE IF NOT EXISTS public.audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values jsonb,
    new_values jsonb,
    user_id uuid REFERENCES auth.users(id),
    user_email text,
    timestamp timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text
);

-- 6. CRIAR TABELA DE CONFIGURAÇÕES DA CLÍNICA
CREATE TABLE IF NOT EXISTS public.clinic_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    cnpj text,
    address jsonb,
    phone text,
    email text,
    logo_url text,
    working_hours jsonb,
    appointment_duration integer DEFAULT 60,
    max_appointments_per_day integer DEFAULT 20,
    holiday_dates date[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 7. CRIAR TABELA DE NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id uuid REFERENCES public.profiles(id),
    type text NOT NULL CHECK (type IN ('appointment_reminder', 'appointment_confirmation', 'payment_due', 'system_alert')),
    title text NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false,
    sent_at timestamp with time zone,
    scheduled_for timestamp with time zone,
    delivery_method text CHECK (delivery_method IN ('email', 'sms', 'whatsapp', 'app')),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- 8. CRIAR TABELA DE SESSÕES DE TRATAMENTO EXPANDIDA
ALTER TABLE public.treatment_sessions 
ADD COLUMN IF NOT EXISTS session_number integer,
ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS techniques_used text[],
ADD COLUMN IF NOT EXISTS equipment_used text[],
ADD COLUMN IF NOT EXISTS patient_response text,
ADD COLUMN IF NOT EXISTS homework_assigned text,
ADD COLUMN IF NOT EXISTS attachments jsonb;

-- 9. CRIAR FUNÇÃO DE AUDITORIA
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. CRIAR TRIGGERS DE AUDITORIA
DROP TRIGGER IF EXISTS audit_patients ON public.patients;
CREATE TRIGGER audit_patients
    AFTER INSERT OR UPDATE OR DELETE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_appointments ON public.appointments;
CREATE TRIGGER audit_appointments
    AFTER INSERT OR UPDATE OR DELETE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_medical_records ON public.medical_records;
CREATE TRIGGER audit_medical_records
    AFTER INSERT OR UPDATE OR DELETE ON public.medical_records
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_treatment_sessions ON public.treatment_sessions;
CREATE TRIGGER audit_treatment_sessions
    AFTER INSERT OR UPDATE OR DELETE ON public.treatment_sessions
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- 11. CRIAR FUNÇÃO PARA VALIDAÇÃO DE CPF
CREATE OR REPLACE FUNCTION public.validate_cpf(cpf_input text)
RETURNS boolean AS $$
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
$$ LANGUAGE plpgsql;

-- 12. CRIAR FUNÇÕES ÚTEIS
CREATE OR REPLACE FUNCTION public.get_patient_full_info(patient_uuid uuid)
RETURNS jsonb AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. CRIAR VIEW PARA AGENDAMENTOS COMPLETOS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'crefito') THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.appointments_full AS
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
        EXECUTE 'CREATE OR REPLACE VIEW public.appointments_full AS
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

-- 14. CRIAR VIEW PARA ESTATÍSTICAS
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

-- 15. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 16. CRIAR POLÍTICAS RLS ESPECÍFICAS POR ROLE
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
    DROP POLICY IF EXISTS "Admins can manage clinic settings" ON public.clinic_settings;
    DROP POLICY IF EXISTS "Staff can view clinic settings" ON public.clinic_settings;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        EXECUTE 'CREATE POLICY "Admins can view audit log" ON public.audit_log
            FOR SELECT USING (
                EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin'')
            )';
        EXECUTE 'CREATE POLICY "Admins can manage clinic settings" ON public.clinic_settings
            FOR ALL USING (
                EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin'')
            )';
        EXECUTE 'CREATE POLICY "Staff can view clinic settings" ON public.clinic_settings
            FOR SELECT USING (
                EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''fisioterapeuta'', ''estagiario''))
            )';
    ELSE
        EXECUTE 'CREATE POLICY "Admins can view audit log" ON public.audit_log
            FOR SELECT USING (
                EXISTS(SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND role = ''admin'')
            )';
        EXECUTE 'CREATE POLICY "Admins can manage clinic settings" ON public.clinic_settings
            FOR ALL USING (
                EXISTS(SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND role = ''admin'')
            )';
        EXECUTE 'CREATE POLICY "Staff can view clinic settings" ON public.clinic_settings
            FOR SELECT USING (true)';
    END IF;
END $$;

-- Políticas para notifications
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
    DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'recipient_id') THEN
        EXECUTE 'CREATE POLICY "Users can view their notifications" ON public.notifications
            FOR SELECT USING (recipient_id = auth.uid())';
        EXECUTE 'CREATE POLICY "Users can update their notifications" ON public.notifications
            FOR UPDATE USING (recipient_id = auth.uid())';
    ELSE
        EXECUTE 'CREATE POLICY "Users can view their notifications" ON public.notifications
            FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "Users can update their notifications" ON public.notifications
            FOR UPDATE USING (true)';
    END IF;
    
    EXECUTE 'CREATE POLICY "System can create notifications" ON public.notifications
        FOR INSERT WITH CHECK (true)';
END $$;

-- 17. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_patients_profile_id ON public.patients(profile_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON public.appointments(appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist ON public.appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_patient ON public.treatment_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.audit_log(table_name, record_id);
-- Criar índice apenas se a coluna existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'recipient_id') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
    END IF;
END $$;

-- 18. CONFIGURAR REALTIME PARA AGENDAMENTOS
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 19. INSERIR CONFIGURAÇÃO INICIAL DA CLÍNICA
INSERT INTO public.clinic_settings (name, working_hours, appointment_duration, max_appointments_per_day)
VALUES (
    'FisioFlow Clínica',
    '{"monday": {"start": "08:00", "end": "18:00"}, "tuesday": {"start": "08:00", "end": "18:00"}, "wednesday": {"start": "08:00", "end": "18:00"}, "thursday": {"start": "08:00", "end": "18:00"}, "friday": {"start": "08:00", "end": "18:00"}, "saturday": {"start": "08:00", "end": "12:00"}, "sunday": {"closed": true}}'::jsonb,
    60,
    20
) ON CONFLICT DO NOTHING;