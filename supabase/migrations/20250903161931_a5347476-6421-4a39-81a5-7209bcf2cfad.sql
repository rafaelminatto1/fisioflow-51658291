-- Inserir usuários demo na tabela profiles (condicionalmente, apenas se as colunas existirem)
-- Esta é uma migration de demo data, erros serão ignorados
DO $$
DECLARE
    has_onboarding_completed BOOLEAN;
    has_is_active BOOLEAN;
    has_crefito BOOLEAN;
    has_specialties BOOLEAN;
    has_birth_date BOOLEAN;
BEGIN
    has_onboarding_completed := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_completed');
    has_is_active := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_active');
    has_crefito := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'crefito');
    has_specialties := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'specialties');
    has_birth_date := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'birth_date');
    
    BEGIN
        -- Inserir admin demo
        IF has_onboarding_completed AND has_is_active THEN
            INSERT INTO public.profiles (id, user_id, full_name, role, onboarding_completed, is_active, phone, created_at, updated_at)
            VALUES (gen_random_uuid(), gen_random_uuid(), 'Admin Demo', 'admin', true, true, '(11) 99999-9999', now(), now())
            ON CONFLICT (user_id) DO NOTHING;
        ELSIF has_is_active THEN
            INSERT INTO public.profiles (id, user_id, full_name, role, is_active, phone, created_at, updated_at)
            VALUES (gen_random_uuid(), gen_random_uuid(), 'Admin Demo', 'admin', true, '(11) 99999-9999', now(), now())
            ON CONFLICT (user_id) DO NOTHING;
        ELSE
            INSERT INTO public.profiles (id, user_id, full_name, role, phone, created_at, updated_at)
            VALUES (gen_random_uuid(), gen_random_uuid(), 'Admin Demo', 'admin', '(11) 99999-9999', now(), now())
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
        
        -- Inserir fisioterapeuta demo
        IF has_onboarding_completed AND has_is_active AND has_crefito AND has_specialties THEN
            INSERT INTO public.profiles (id, user_id, full_name, role, onboarding_completed, is_active, phone, crefito, specialties, created_at, updated_at)
            VALUES (gen_random_uuid(), gen_random_uuid(), 'Dr. Fisioterapeuta Demo', 'fisioterapeuta', true, true, '(11) 88888-8888', 'CREFITO-3/123456', ARRAY['Ortopedia', 'Neurologia'], now(), now())
            ON CONFLICT (user_id) DO NOTHING;
        ELSIF has_is_active AND has_crefito AND has_specialties THEN
            INSERT INTO public.profiles (id, user_id, full_name, role, is_active, phone, crefito, specialties, created_at, updated_at)
            VALUES (gen_random_uuid(), gen_random_uuid(), 'Dr. Fisioterapeuta Demo', 'fisioterapeuta', true, '(11) 88888-8888', 'CREFITO-3/123456', ARRAY['Ortopedia', 'Neurologia'], now(), now())
            ON CONFLICT (user_id) DO NOTHING;
        ELSIF has_is_active THEN
            INSERT INTO public.profiles (id, user_id, full_name, role, is_active, phone, created_at, updated_at)
            VALUES (gen_random_uuid(), gen_random_uuid(), 'Dr. Fisioterapeuta Demo', 'fisioterapeuta', true, '(11) 88888-8888', now(), now())
            ON CONFLICT (user_id) DO NOTHING;
        ELSE
            INSERT INTO public.profiles (id, user_id, full_name, role, phone, created_at, updated_at)
            VALUES (gen_random_uuid(), gen_random_uuid(), 'Dr. Fisioterapeuta Demo', 'fisioterapeuta', '(11) 88888-8888', now(), now())
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
        
        -- Inserir paciente demo
        IF has_onboarding_completed AND has_is_active AND has_birth_date THEN
            INSERT INTO public.profiles (id, user_id, full_name, role, onboarding_completed, is_active, phone, birth_date, created_at, updated_at)
            VALUES (gen_random_uuid(), gen_random_uuid(), 'Paciente Demo', 'paciente', true, true, '(11) 77777-7777', '1990-01-01', now(), now())
            ON CONFLICT (user_id) DO NOTHING;
        ELSIF has_is_active AND has_birth_date THEN
            INSERT INTO public.profiles (id, user_id, full_name, role, is_active, phone, birth_date, created_at, updated_at)
            VALUES (gen_random_uuid(), gen_random_uuid(), 'Paciente Demo', 'paciente', true, '(11) 77777-7777', '1990-01-01', now(), now())
            ON CONFLICT (user_id) DO NOTHING;
        ELSIF has_is_active THEN
            INSERT INTO public.profiles (id, user_id, full_name, role, is_active, phone, created_at, updated_at)
            VALUES (gen_random_uuid(), gen_random_uuid(), 'Paciente Demo', 'paciente', true, '(11) 77777-7777', now(), now())
            ON CONFLICT (user_id) DO NOTHING;
        ELSE
            INSERT INTO public.profiles (id, user_id, full_name, role, phone, created_at, updated_at)
            VALUES (gen_random_uuid(), gen_random_uuid(), 'Paciente Demo', 'paciente', '(11) 77777-7777', now(), now())
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    EXCEPTION
        WHEN foreign_key_violation OR OTHERS THEN
            -- Ignorar erros (demo data não é crítica)
            NULL;
    END;
END $$;