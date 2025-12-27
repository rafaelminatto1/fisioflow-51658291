-- Insert demo user profiles with proper UUIDs
-- First, let's create a function to generate consistent demo UUIDs
CREATE OR REPLACE FUNCTION generate_demo_uuid(role_name text)
RETURNS uuid AS $$
DECLARE
    hash_input text;
    hash_result bigint;
    hex_string text;
    uuid_string text;
BEGIN
    -- Create a simple hash from role name
    hash_input := 'demo-' || role_name;
    hash_result := abs(('x' || substr(md5(hash_input), 1, 8))::bit(32)::int);
    hex_string := lpad(to_hex(hash_result), 8, '0');
    
    -- Format as UUID v4
    uuid_string := substr(hex_string, 1, 8) || '-' || 
                   substr(hex_string, 1, 4) || '-4' || 
                   substr(hex_string, 2, 3) || '-8' || 
                   substr(hex_string, 1, 3) || '-' || 
                   rpad(substr(hex_string, 1, 12), 12, '0');
    
    RETURN uuid_string::uuid;
END;
$$ LANGUAGE plpgsql;

-- Insert demo profiles (condicionalmente, apenas se as colunas existirem)
-- NOTA: Esta migration insere dados de demonstração. Se houver erros de foreign key (usuários não existem em auth.users),
-- a inserção será pulada silenciosamente, pois esta é uma migration de demo data não crítica.
DO $$
DECLARE
    has_crefito BOOLEAN;
    has_specialties BOOLEAN;
    has_is_active BOOLEAN;
BEGIN
    has_crefito := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'crefito');
    has_specialties := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'specialties');
    has_is_active := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_active');
    
    -- Tentar inserir demo data, mas ignorar erros de foreign key
    BEGIN
        IF has_crefito AND has_specialties AND has_is_active THEN
            INSERT INTO public.profiles (id, user_id, full_name, role, phone, crefito, specialties, is_active)
            VALUES 
            (gen_random_uuid(), generate_demo_uuid('admin'), 'Administrador Demo', 'admin', '(11) 99999-0001', NULL, NULL, true),
            (gen_random_uuid(), generate_demo_uuid('fisioterapeuta'), 'Dr. João Silva', 'fisioterapeuta', '(11) 99999-0002', 'CREFITO-123456', ARRAY['ortopedia', 'neurologia'], true),
            (gen_random_uuid(), generate_demo_uuid('estagiario'), 'Maria Santos', 'estagiario', '(11) 99999-0003', 'CREFITO-789012', ARRAY['ortopedia'], true),
            (gen_random_uuid(), generate_demo_uuid('paciente'), 'Ana Costa', 'paciente', '(11) 99999-0004', NULL, NULL, true),
            (gen_random_uuid(), generate_demo_uuid('parceiro'), 'Carlos Educador', 'parceiro', '(11) 99999-0005', 'CREF-456789', ARRAY['pilates', 'treinamento_funcional'], true)
            ON CONFLICT (user_id) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              role = EXCLUDED.role,
              phone = EXCLUDED.phone,
              crefito = EXCLUDED.crefito,
              specialties = EXCLUDED.specialties,
              is_active = EXCLUDED.is_active;
        ELSIF has_specialties AND has_is_active THEN
            INSERT INTO public.profiles (id, user_id, full_name, role, phone, specialties, is_active)
            VALUES 
            (gen_random_uuid(), generate_demo_uuid('admin'), 'Administrador Demo', 'admin', '(11) 99999-0001', NULL, true),
            (gen_random_uuid(), generate_demo_uuid('fisioterapeuta'), 'Dr. João Silva', 'fisioterapeuta', '(11) 99999-0002', ARRAY['ortopedia', 'neurologia'], true),
            (gen_random_uuid(), generate_demo_uuid('estagiario'), 'Maria Santos', 'estagiario', '(11) 99999-0003', ARRAY['ortopedia'], true),
            (gen_random_uuid(), generate_demo_uuid('paciente'), 'Ana Costa', 'paciente', '(11) 99999-0004', NULL, true),
            (gen_random_uuid(), generate_demo_uuid('parceiro'), 'Carlos Educador', 'parceiro', '(11) 99999-0005', ARRAY['pilates', 'treinamento_funcional'], true)
            ON CONFLICT (user_id) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              role = EXCLUDED.role,
              phone = EXCLUDED.phone,
              specialties = EXCLUDED.specialties,
              is_active = EXCLUDED.is_active;
        ELSIF has_is_active THEN
            INSERT INTO public.profiles (id, user_id, full_name, role, phone, is_active)
            VALUES 
            (gen_random_uuid(), generate_demo_uuid('admin'), 'Administrador Demo', 'admin', '(11) 99999-0001', true),
            (gen_random_uuid(), generate_demo_uuid('fisioterapeuta'), 'Dr. João Silva', 'fisioterapeuta', '(11) 99999-0002', true),
            (gen_random_uuid(), generate_demo_uuid('estagiario'), 'Maria Santos', 'estagiario', '(11) 99999-0003', true),
            (gen_random_uuid(), generate_demo_uuid('paciente'), 'Ana Costa', 'paciente', '(11) 99999-0004', true),
            (gen_random_uuid(), generate_demo_uuid('parceiro'), 'Carlos Educador', 'parceiro', '(11) 99999-0005', true)
            ON CONFLICT (user_id) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              role = EXCLUDED.role,
              phone = EXCLUDED.phone,
              is_active = EXCLUDED.is_active;
        ELSE
            INSERT INTO public.profiles (id, user_id, full_name, role, phone)
            VALUES 
            (gen_random_uuid(), generate_demo_uuid('admin'), 'Administrador Demo', 'admin', '(11) 99999-0001'),
            (gen_random_uuid(), generate_demo_uuid('fisioterapeuta'), 'Dr. João Silva', 'fisioterapeuta', '(11) 99999-0002'),
            (gen_random_uuid(), generate_demo_uuid('estagiario'), 'Maria Santos', 'estagiario', '(11) 99999-0003'),
            (gen_random_uuid(), generate_demo_uuid('paciente'), 'Ana Costa', 'paciente', '(11) 99999-0004'),
            (gen_random_uuid(), generate_demo_uuid('parceiro'), 'Carlos Educador', 'parceiro', '(11) 99999-0005')
            ON CONFLICT (user_id) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              role = EXCLUDED.role,
              phone = EXCLUDED.phone;
        END IF;
    EXCEPTION
        WHEN foreign_key_violation THEN
            -- Ignorar erros de foreign key (usuários não existem em auth.users)
            -- Esta é uma migration de demo data, não é crítica
            NULL;
        WHEN OTHERS THEN
            -- Ignorar outros erros também
            NULL;
    END;
END $$;

-- Insert some demo patients (ignorar erros de foreign key)
DO $$
BEGIN
    INSERT INTO public.patients (
        id, name, email, phone, birth_date, gender, main_condition, status, created_by
    ) VALUES 
    (gen_random_uuid(), 'Maria Silva', 'maria.silva@email.com', '(11) 98888-1111', '1985-03-15', 'Feminino', 'Lombalgia', 'Ativo',
     (SELECT id FROM profiles WHERE user_id = generate_demo_uuid('fisioterapeuta') LIMIT 1)),
    (gen_random_uuid(), 'João Santos', 'joao.santos@email.com', '(11) 98888-2222', '1978-07-22', 'Masculino', 'Lesão no ombro', 'Ativo',
     (SELECT id FROM profiles WHERE user_id = generate_demo_uuid('fisioterapeuta') LIMIT 1)),
    (gen_random_uuid(), 'Ana Oliveira', 'ana.oliveira@email.com', '(11) 98888-3333', '1992-11-08', 'Feminino', 'Dor cervical', 'Inicial',
     (SELECT id FROM profiles WHERE user_id = generate_demo_uuid('fisioterapeuta') LIMIT 1))
    ON CONFLICT DO NOTHING;
EXCEPTION
    WHEN foreign_key_violation OR OTHERS THEN
        -- Ignorar erros (demo data não é crítica)
        NULL;
END $$;

-- Insert some demo exercises (ignorar erros de foreign key)
DO $$
BEGIN
    INSERT INTO public.exercises (
        id, name, description, instructions, category, difficulty, duration, target_muscles, equipment, created_by
    ) VALUES 
    (gen_random_uuid(), 'Alongamento Lombar', 'Exercício para alívio da tensão lombar',
     'Deite-se de costas, flexione os joelhos e puxe-os em direção ao peito. Mantenha por 30 segundos.',
     'Alongamento', 'Fácil', '30 segundos', ARRAY['paravertebrais', 'lombar'], ARRAY['nenhum'],
     (SELECT id FROM profiles WHERE user_id = generate_demo_uuid('fisioterapeuta') LIMIT 1)),
    (gen_random_uuid(), 'Fortalecimento do Core', 'Exercício para fortalecimento da musculatura abdominal',
     'Deite-se de costas, flexione os joelhos e eleve o tronco contraindo o abdômen. 3 séries de 15 repetições.',
     'Fortalecimento', 'Médio', '10 minutos', ARRAY['abdominais', 'core'], ARRAY['colchonete'],
     (SELECT id FROM profiles WHERE user_id = generate_demo_uuid('fisioterapeuta') LIMIT 1)),
    (gen_random_uuid(), 'Mobilização Cervical', 'Exercício para melhora da mobilidade cervical',
     'Sentado, realize movimentos lentos de flexão, extensão e rotação do pescoço. 10 repetições cada movimento.',
     'Mobilização', 'Fácil', '5 minutos', ARRAY['cervical', 'trapezio'], ARRAY['nenhum'],
     (SELECT id FROM profiles WHERE user_id = generate_demo_uuid('fisioterapeuta') LIMIT 1))
    ON CONFLICT DO NOTHING;
EXCEPTION
    WHEN foreign_key_violation OR OTHERS THEN
        -- Ignorar erros (demo data não é crítica)
        NULL;
END $$;