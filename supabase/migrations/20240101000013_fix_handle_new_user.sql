-- Corrigir a função handle_new_user para trabalhar com o enum user_role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'fisioterapeuta'::user_role)
  );
  RETURN NEW;
END;
$$;

-- Inserir usuários de teste
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
        is_super_admin
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
        '{}',
        '{"full_name": "Administrador", "role": "admin"}',
        false
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
        is_super_admin
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'fisio@fisioflow.com.br',
        '$2a$10$WK5zKfZfPPr.tHy9AhfKfOGQShZH9YDu0oTSkbP4RKMgxL3j2nFSu', -- senha123
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated',
        '{}',
        '{"full_name": "Dr. João Silva", "role": "fisioterapeuta"}',
        false
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
        is_super_admin
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'estagiario@fisioflow.com.br',
        '$2a$10$WK5zKfZfPPr.tHy9AhfKfOGQShZH9YDu0oTSkbP4RKMgxL3j2nFSu', -- senha123
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated',
        '{}',
        '{"full_name": "Maria Santos", "role": "estagiario"}',
        false
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
        is_super_admin
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'paciente@fisioflow.com.br',
        '$2a$10$WK5zKfZfPPr.tHy9AhfKfOGQShZH9YDu0oTSkbP4RKMgxL3j2nFSu', -- senha123
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated',
        '{}',
        '{"full_name": "Carlos Oliveira", "role": "paciente"}',
        false
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
        is_super_admin
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'parceiro@fisioflow.com.br',
        '$2a$10$WK5zKfZfPPr.tHy9AhfKfOGQShZH9YDu0oTSkbP4RKMgxL3j2nFSu', -- senha123
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated',
        '{}',
        '{"full_name": "Ana Costa", "role": "parceiro"}',
        false
    ) RETURNING id INTO parceiro_user_id;
    
    RAISE NOTICE 'Usuários de teste criados com sucesso!';
END;
$$;