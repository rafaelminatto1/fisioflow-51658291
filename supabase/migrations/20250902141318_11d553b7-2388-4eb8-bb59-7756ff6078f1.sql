-- Insert demo appointments with fixed dates (condicionalmente, apenas se as colunas existirem)
DO $$
DECLARE
    has_appointment_date BOOLEAN;
    has_appointment_time BOOLEAN;
    has_duration BOOLEAN;
    has_type BOOLEAN;
    has_status BOOLEAN;
    has_notes BOOLEAN;
BEGIN
    has_appointment_date := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'appointment_date');
    has_appointment_time := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'appointment_time');
    has_duration := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'duration');
    has_type := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'type');
    has_status := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'status');
    has_notes := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'notes');
    
    BEGIN
        IF has_appointment_date AND has_appointment_time AND has_duration AND has_type AND has_status AND has_notes THEN
            INSERT INTO public.appointments (id, patient_id, appointment_date, appointment_time, duration, type, status, notes)
            SELECT 
                gen_random_uuid(),
                p.id,
                CASE 
                    WHEN p.name = 'Maria Silva' THEN CURRENT_DATE
                    WHEN p.name = 'João Santos' THEN CURRENT_DATE + interval '1 day'
                    WHEN p.name = 'Ana Oliveira' THEN CURRENT_DATE + interval '2 days'
                    WHEN p.name = 'Carlos Pereira' THEN CURRENT_DATE + interval '3 days'
                    ELSE CURRENT_DATE + interval '4 days'
                END,
                CASE 
                    WHEN p.name = 'Maria Silva' THEN '09:00:00'::time
                    WHEN p.name = 'João Santos' THEN '10:00:00'::time
                    WHEN p.name = 'Ana Oliveira' THEN '11:00:00'::time
                    WHEN p.name = 'Carlos Pereira' THEN '14:00:00'::time
                    ELSE '15:00:00'::time
                END,
                60,
                CASE 
                    WHEN p.name = 'Maria Silva' THEN 'Consulta Inicial'
                    WHEN p.name = 'João Santos' THEN 'Sessão de Fisioterapia'
                    ELSE 'Reavaliação'
                END,
                'Confirmado',
                'Agendamento demo para ' || p.name
            FROM public.patients p
            WHERE p.name IN ('Maria Silva', 'João Santos', 'Ana Oliveira', 'Carlos Pereira', 'Fernanda Costa')
            ON CONFLICT DO NOTHING;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Ignorar erros (demo data não é crítica)
            NULL;
    END;
END $$;

-- Insert some exercise plans (condicionalmente, apenas se as colunas existirem)
DO $$
DECLARE
    has_main_condition BOOLEAN;
BEGIN
    has_main_condition := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'main_condition');
    
    BEGIN
        IF has_main_condition THEN
            INSERT INTO public.exercise_plans (id, patient_id, name, description, status)
            SELECT 
                gen_random_uuid(),
                p.id,
                'Plano de ' || p.main_condition || ' - ' || p.name,
                'Plano personalizado para tratamento de ' || p.main_condition,
                'Ativo'
            FROM public.patients p
            WHERE p.name IN ('Maria Silva', 'João Santos', 'Ana Oliveira')
            ON CONFLICT DO NOTHING;
        ELSE
            INSERT INTO public.exercise_plans (id, patient_id, name, description, status)
            SELECT 
                gen_random_uuid(),
                p.id,
                'Plano de Tratamento - ' || p.name,
                'Plano personalizado para tratamento',
                'Ativo'
            FROM public.patients p
            WHERE p.name IN ('Maria Silva', 'João Santos', 'Ana Oliveira')
            ON CONFLICT DO NOTHING;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Ignorar erros (demo data não é crítica)
            NULL;
    END;
END $$;

-- Insert some patient progress data (condicionalmente, apenas se a tabela existir)
DO $$
BEGIN
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patient_progress') THEN
            INSERT INTO public.patient_progress (id, patient_id, progress_date, pain_level, functional_score, exercise_compliance, notes)
            SELECT 
                gen_random_uuid(),
                p.id,
                CURRENT_DATE - interval '1 day',
                CASE 
                    WHEN p.name = 'Maria Silva' THEN 4
                    WHEN p.name = 'João Santos' THEN 3
                    ELSE 5
                END,
                CASE 
                    WHEN p.name = 'Maria Silva' THEN 70
                    WHEN p.name = 'João Santos' THEN 80
                    ELSE 60
                END,
                CASE 
                    WHEN p.name = 'Maria Silva' THEN 85
                    WHEN p.name = 'João Santos' THEN 90
                    ELSE 75
                END,
                'Evolução satisfatória. Paciente demonstra boa aderência ao tratamento.'
            FROM public.patients p
            WHERE p.name IN ('Maria Silva', 'João Santos', 'Ana Oliveira')
            ON CONFLICT DO NOTHING;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Ignorar erros (demo data não é crítica)
            NULL;
    END;
END $$;