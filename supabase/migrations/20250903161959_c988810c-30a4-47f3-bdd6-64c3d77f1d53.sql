-- Inserir usuários demo (ignorar erros de foreign key - demo data não é crítica)
DO $$
BEGIN
    BEGIN
        INSERT INTO public.profiles (user_id, full_name, role, onboarding_completed, is_active, phone, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Admin Demo', 'admin', true, true, '(11) 99999-9999', now(), now())
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
        WHEN foreign_key_violation OR OTHERS THEN NULL;
    END;
    
    BEGIN
        INSERT INTO public.profiles (user_id, full_name, role, onboarding_completed, is_active, phone, crefito, specialties, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Dr. Fisioterapeuta Demo', 'fisioterapeuta', true, true, '(11) 88888-8888', 'CREFITO-3/123456', ARRAY['Ortopedia', 'Neurologia'], now(), now())
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
        WHEN foreign_key_violation OR OTHERS THEN NULL;
    END;
    
    BEGIN
        INSERT INTO public.profiles (user_id, full_name, role, onboarding_completed, is_active, phone, birth_date, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Paciente Demo', 'paciente', true, true, '(11) 77777-7777', '1990-01-01', now(), now())
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
        WHEN foreign_key_violation OR OTHERS THEN NULL;
    END;
END $$;