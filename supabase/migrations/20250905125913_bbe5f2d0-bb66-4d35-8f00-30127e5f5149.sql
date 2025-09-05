-- Inserir usuários de teste com metadados corretos
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
        '{"full_name": "Administrator Sistema", "role": "admin"}',
        false,
        '',
        '',
        '',
        '',
        NOW()
    ) RETURNING id INTO admin_user_id;

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
        '{"full_name": "João Silva", "role": "fisioterapeuta"}',
        false,
        '',
        '',
        '',
        '',
        NOW()
    ) RETURNING id INTO fisio_user_id;

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
        '{"full_name": "Maria Santos", "role": "estagiario"}',
        false,
        '',
        '',
        '',
        '',
        NOW()
    ) RETURNING id INTO estagiario_user_id;

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
        '{"full_name": "Ana Costa", "role": "paciente"}',
        false,
        '',
        '',
        '',
        '',
        NOW()
    ) RETURNING id INTO paciente_user_id;

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
        '{"full_name": "Carlos Oliveira", "role": "parceiro"}',
        false,
        '',
        '',
        '',
        '',
        NOW()
    ) RETURNING id INTO parceiro_user_id;

    -- Atualizar perfis criados automaticamente pelo trigger
    UPDATE public.profiles 
    SET 
        phone = '(11) 99999-9999',
        crefito = null,
        specialties = null,
        cpf = '12345678901',
        birth_date = '1980-01-01',
        bio = 'Administrador do sistema FisioFlow',
        experience_years = 10,
        consultation_fee = null,
        onboarding_completed = true,
        is_active = true,
        role = 'admin'
    WHERE user_id = admin_user_id;

    UPDATE public.profiles 
    SET 
        phone = '(11) 98888-8888',
        crefito = '12345-F',
        specialties = ARRAY['Ortopedia', 'Traumatologia'],
        cpf = '12345678902',
        birth_date = '1985-05-15',
        bio = 'Fisioterapeuta especializado em ortopedia e traumatologia',
        experience_years = 8,
        consultation_fee = 120.00,
        onboarding_completed = true,
        is_active = true,
        role = 'fisioterapeuta'
    WHERE user_id = fisio_user_id;

    UPDATE public.profiles 
    SET 
        phone = '(11) 97777-7777',
        crefito = null,
        specialties = null,
        cpf = '12345678903',
        birth_date = '1998-03-20',
        bio = 'Estagiária de fisioterapia',
        experience_years = 1,
        consultation_fee = null,
        onboarding_completed = true,
        is_active = true,
        role = 'estagiario'
    WHERE user_id = estagiario_user_id;

    UPDATE public.profiles 
    SET 
        phone = '(11) 96666-6666',
        crefito = null,
        specialties = null,
        cpf = '12345678904',
        birth_date = '1990-07-10',
        bio = null,
        experience_years = null,
        consultation_fee = null,
        onboarding_completed = true,
        is_active = true,
        role = 'paciente'
    WHERE user_id = paciente_user_id;

    UPDATE public.profiles 
    SET 
        phone = '(11) 95555-5555',
        crefito = null,
        specialties = null,
        cpf = '12345678905',
        birth_date = '1975-12-05',
        bio = 'Parceiro comercial',
        experience_years = 5,
        consultation_fee = null,
        onboarding_completed = true,
        is_active = true,
        role = 'parceiro'
    WHERE user_id = parceiro_user_id;

END $$;