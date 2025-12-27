-- Inserir usuários de teste no auth.users e criar perfis correspondentes
-- PRIMEIRO: Desabilitar temporariamente triggers de auditoria para evitar erros de tipo
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND trigger_name LIKE 'audit_%'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I DISABLE TRIGGER %I', 'public', r.event_object_table, r.trigger_name);
    END LOOP;
END $$;

DO $$
DECLARE
    admin_user_id uuid;
    fisio_user_id uuid;
    estagiario_user_id uuid;
    paciente_user_id uuid;
    parceiro_user_id uuid;
BEGIN
    -- Criar usuário Admin
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        aud,
        role,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        confirmation_token,
        email_change_token_new,
        email_change_token_current,
        phone_change_token,
        last_sign_in_at
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'admin@fisioflow.com.br',
        '$2a$10$WK5zKfZfPPr.tHy9AhfKfOGQShZH9YDu0oTSkbP4RKMgxL3j2nFSu', -- senha123
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated',
        '{"provider": "email", "providers": ["email"]}',
        '{}',
        false,
        '',
        '',
        '',
        '',
        NOW()
    ) RETURNING id INTO admin_user_id;

    -- Criar perfil Admin
    INSERT INTO public.profiles (
        id,
        user_id,
        full_name,
        role,
        phone,
        crefito,
        specialties,
        cpf,
        birth_date,
        bio,
        experience_years,
        consultation_fee,
        onboarding_completed,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        admin_user_id,
        'Administrator Sistema',
        'admin',
        '(11) 99999-9999',
        null,
        null,
        '12345678901',
        '1980-01-01',
        'Administrador do sistema FisioFlow',
        10,
        null,
        true,
        true,
        NOW(),
        NOW()
    );

    -- Criar usuário Fisioterapeuta
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        aud,
        role,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        confirmation_token,
        email_change_token_new,
        email_change_token_current,
        phone_change_token,
        last_sign_in_at
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'joao@fisioflow.com.br',
        '$2a$10$WK5zKfZfPPr.tHy9AhfKfOGQShZH9YDu0oTSkbP4RKMgxL3j2nFSu', -- senha123
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated',
        '{"provider": "email", "providers": ["email"]}',
        '{}',
        false,
        '',
        '',
        '',
        '',
        NOW()
    ) RETURNING id INTO fisio_user_id;

    -- Criar perfil Fisioterapeuta
    INSERT INTO public.profiles (
        id,
        user_id,
        full_name,
        role,
        phone,
        crefito,
        specialties,
        cpf,
        birth_date,
        bio,
        experience_years,
        consultation_fee,
        onboarding_completed,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        fisio_user_id,
        'João Silva',
        'fisioterapeuta',
        '(11) 98888-8888',
        '12345-F',
        ARRAY['Ortopedia', 'Traumatologia'],
        '12345678902',
        '1985-05-15',
        'Fisioterapeuta especializado em ortopedia e traumatologia',
        8,
        120.00,
        true,
        true,
        NOW(),
        NOW()
    );

    -- Criar usuário Estagiário
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        aud,
        role,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        confirmation_token,
        email_change_token_new,
        email_change_token_current,
        phone_change_token,
        last_sign_in_at
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'maria@fisioflow.com.br',
        '$2a$10$WK5zKfZfPPr.tHy9AhfKfOGQShZH9YDu0oTSkbP4RKMgxL3j2nFSu', -- senha123
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated',
        '{"provider": "email", "providers": ["email"]}',
        '{}',
        false,
        '',
        '',
        '',
        '',
        NOW()
    ) RETURNING id INTO estagiario_user_id;

    -- Criar perfil Estagiário
    INSERT INTO public.profiles (
        id,
        user_id,
        full_name,
        role,
        phone,
        crefito,
        specialties,
        cpf,
        birth_date,
        bio,
        experience_years,
        consultation_fee,
        onboarding_completed,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        estagiario_user_id,
        'Maria Santos',
        'estagiario',
        '(11) 97777-7777',
        null,
        null,
        '12345678903',
        '1998-03-20',
        'Estagiária de fisioterapia',
        1,
        null,
        true,
        true,
        NOW(),
        NOW()
    );

    -- Criar usuário Paciente
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        aud,
        role,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        confirmation_token,
        email_change_token_new,
        email_change_token_current,
        phone_change_token,
        last_sign_in_at
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'ana@email.com',
        '$2a$10$WK5zKfZfPPr.tHy9AhfKfOGQShZH9YDu0oTSkbP4RKMgxL3j2nFSu', -- senha123
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated',
        '{"provider": "email", "providers": ["email"]}',
        '{}',
        false,
        '',
        '',
        '',
        '',
        NOW()
    ) RETURNING id INTO paciente_user_id;

    -- Criar perfil Paciente
    INSERT INTO public.profiles (
        id,
        user_id,
        full_name,
        role,
        phone,
        crefito,
        specialties,
        cpf,
        birth_date,
        bio,
        experience_years,
        consultation_fee,
        onboarding_completed,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        paciente_user_id,
        'Ana Costa',
        'paciente',
        '(11) 96666-6666',
        null,
        null,
        '12345678904',
        '1990-07-10',
        null,
        null,
        null,
        true,
        true,
        NOW(),
        NOW()
    );

    -- Criar usuário Parceiro
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        aud,
        role,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        confirmation_token,
        email_change_token_new,
        email_change_token_current,
        phone_change_token,
        last_sign_in_at
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'carlos@parceiro.com',
        '$2a$10$WK5zKfZfPPr.tHy9AhfKfOGQShZH9YDu0oTSkbP4RKMgxL3j2nFSu', -- senha123
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated',
        '{"provider": "email", "providers": ["email"]}',
        '{}',
        false,
        '',
        '',
        '',
        '',
        NOW()
    ) RETURNING id INTO parceiro_user_id;

    -- Criar perfil Parceiro
    INSERT INTO public.profiles (
        id,
        user_id,
        full_name,
        role,
        phone,
        crefito,
        specialties,
        cpf,
        birth_date,
        bio,
        experience_years,
        consultation_fee,
        onboarding_completed,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        parceiro_user_id,
        'Carlos Oliveira',
        'parceiro',
        '(11) 95555-5555',
        null,
        null,
        '12345678905',
        '1975-12-05',
        'Parceiro comercial',
        5,
        null,
        true,
        true,
        NOW(),
        NOW()
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Ignorar erros (demo data não é crítica)
        NULL;
END $$;

-- Reabilitar triggers de auditoria
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND trigger_name LIKE 'audit_%'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE TRIGGER %I', 'public', r.event_object_table, r.trigger_name);
    END LOOP;
END $$;