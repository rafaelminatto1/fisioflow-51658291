-- Insert demo data (condicionalmente, apenas se as colunas existirem)
-- Esta é uma migration de demo data, erros serão ignorados
DO $$
DECLARE
    has_gender BOOLEAN;
    has_main_condition BOOLEAN;
    has_status BOOLEAN;
    has_address BOOLEAN;
    has_medical_history BOOLEAN;
    has_contraindications BOOLEAN;
BEGIN
    has_gender := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'gender');
    has_main_condition := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'main_condition');
    has_status := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'status');
    has_address := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'address');
    has_medical_history := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'medical_history');
    has_contraindications := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'contraindications');
    
    BEGIN
        -- Insert patients
        IF has_gender AND has_main_condition AND has_status AND has_address AND has_medical_history THEN
            INSERT INTO public.patients (id, name, email, phone, birth_date, gender, main_condition, status, address, medical_history)
            VALUES 
            (gen_random_uuid(), 'Maria Silva', 'maria.silva@email.com', '(11) 98888-1111', '1985-03-15', 'feminino', 'Lombalgia', 'Em Tratamento', 'Rua das Flores, 123 - São Paulo/SP', 'Histórico de dor lombar há 2 anos. Trabalha em escritório.'),
            (gen_random_uuid(), 'João Santos', 'joao.santos@email.com', '(11) 98888-2222', '1978-07-22', 'masculino', 'Lesão no ombro', 'Em Tratamento', 'Av. Principal, 456 - São Paulo/SP', 'Lesão durante atividade esportiva. Pratica tênis recreativo.'),
            (gen_random_uuid(), 'Ana Oliveira', 'ana.oliveira@email.com', '(11) 98888-3333', '1992-11-08', 'feminino', 'Dor cervical', 'Inicial', 'Rua da Esperança, 789 - São Paulo/SP', 'Dor cervical por postura inadequada no trabalho. Primeira consulta.'),
            (gen_random_uuid(), 'Carlos Pereira', 'carlos.pereira@email.com', '(11) 98888-4444', '1965-05-30', 'masculino', 'Artrose de joelho', 'Em Tratamento', 'Rua do Comércio, 321 - São Paulo/SP', 'Artrose bilateral de joelhos. Aposentado, 65 anos.'),
            (gen_random_uuid(), 'Fernanda Costa', 'fernanda.costa@email.com', '(11) 98888-5555', '1988-12-03', 'feminino', 'Fibromialgia', 'Em Tratamento', 'Av. das Palmeiras, 654 - São Paulo/SP', 'Diagnóstico de fibromialgia. Professora, 35 anos.')
            ON CONFLICT DO NOTHING;
        ELSIF has_main_condition AND has_status THEN
            INSERT INTO public.patients (id, name, email, phone, birth_date, main_condition, status)
            VALUES 
            (gen_random_uuid(), 'Maria Silva', 'maria.silva@email.com', '(11) 98888-1111', '1985-03-15', 'Lombalgia', 'Em Tratamento'),
            (gen_random_uuid(), 'João Santos', 'joao.santos@email.com', '(11) 98888-2222', '1978-07-22', 'Lesão no ombro', 'Em Tratamento'),
            (gen_random_uuid(), 'Ana Oliveira', 'ana.oliveira@email.com', '(11) 98888-3333', '1992-11-08', 'Dor cervical', 'Inicial'),
            (gen_random_uuid(), 'Carlos Pereira', 'carlos.pereira@email.com', '(11) 98888-4444', '1965-05-30', 'Artrose de joelho', 'Em Tratamento'),
            (gen_random_uuid(), 'Fernanda Costa', 'fernanda.costa@email.com', '(11) 98888-5555', '1988-12-03', 'Fibromialgia', 'Em Tratamento')
            ON CONFLICT DO NOTHING;
        ELSE
            INSERT INTO public.patients (id, name, email, phone, birth_date)
            VALUES 
            (gen_random_uuid(), 'Maria Silva', 'maria.silva@email.com', '(11) 98888-1111', '1985-03-15'),
            (gen_random_uuid(), 'João Santos', 'joao.santos@email.com', '(11) 98888-2222', '1978-07-22'),
            (gen_random_uuid(), 'Ana Oliveira', 'ana.oliveira@email.com', '(11) 98888-3333', '1992-11-08'),
            (gen_random_uuid(), 'Carlos Pereira', 'carlos.pereira@email.com', '(11) 98888-4444', '1965-05-30'),
            (gen_random_uuid(), 'Fernanda Costa', 'fernanda.costa@email.com', '(11) 98888-5555', '1988-12-03')
            ON CONFLICT DO NOTHING;
        END IF;
        
        -- Insert exercises
        IF has_contraindications THEN
            INSERT INTO public.exercises (id, name, description, instructions, category, difficulty, duration, target_muscles, equipment, contraindications)
            VALUES 
            (gen_random_uuid(), 'Alongamento Lombar', 'Exercício para alívio da tensão lombar', 'Deite-se de costas, flexione os joelhos e puxe-os em direção ao peito. Mantenha por 30 segundos.', 'Alongamento', 'Fácil', '30 segundos', ARRAY['paravertebrais', 'lombar'], ARRAY['nenhum'], 'Dor aguda intensa'),
            (gen_random_uuid(), 'Fortalecimento do Core', 'Exercício para fortalecimento da musculatura abdominal', 'Deite-se de costas, flexione os joelhos e eleve o tronco contraindo o abdômen. 3 séries de 15 repetições.', 'Fortalecimento', 'Médio', '10 minutos', ARRAY['abdominais', 'core'], ARRAY['colchonete'], 'Hérnias abdominais'),
            (gen_random_uuid(), 'Mobilização Cervical', 'Exercício para melhora da mobilidade cervical', 'Sentado, realize movimentos lentos de flexão, extensão e rotação do pescoço. 10 repetições cada movimento.', 'Mobilização', 'Fácil', '5 minutos', ARRAY['cervical', 'trapezio'], ARRAY['nenhum'], 'Vertigens'),
            (gen_random_uuid(), 'Caminhada Assistida', 'Exercício cardiovascular de baixo impacto', 'Caminhe em superfície plana por 20-30 minutos, mantendo ritmo confortável.', 'Cardiovascular', 'Fácil', '20-30 minutos', ARRAY['membros_inferiores', 'cardiovascular'], ARRAY['tenis_confortavel'], 'Dor aguda em membros inferiores'),
            (gen_random_uuid(), 'Exercício de Respiração', 'Técnica de respiração diafragmática', 'Deite-se confortavelmente, coloque uma mão no peito e outra no abdômen. Respire profundamente inflando o abdômen.', 'Respiratório', 'Fácil', '10 minutos', ARRAY['diafragma', 'intercostais'], ARRAY['nenhum'], 'Pneumotórax ativo')
            ON CONFLICT DO NOTHING;
        ELSE
            INSERT INTO public.exercises (id, name, description, instructions, category, difficulty, duration, target_muscles, equipment)
            VALUES 
            (gen_random_uuid(), 'Alongamento Lombar', 'Exercício para alívio da tensão lombar', 'Deite-se de costas, flexione os joelhos e puxe-os em direção ao peito. Mantenha por 30 segundos.', 'Alongamento', 'Fácil', '30 segundos', ARRAY['paravertebrais', 'lombar'], ARRAY['nenhum']),
            (gen_random_uuid(), 'Fortalecimento do Core', 'Exercício para fortalecimento da musculatura abdominal', 'Deite-se de costas, flexione os joelhos e eleve o tronco contraindo o abdômen. 3 séries de 15 repetições.', 'Fortalecimento', 'Médio', '10 minutos', ARRAY['abdominais', 'core'], ARRAY['colchonete']),
            (gen_random_uuid(), 'Mobilização Cervical', 'Exercício para melhora da mobilidade cervical', 'Sentado, realize movimentos lentos de flexão, extensão e rotação do pescoço. 10 repetições cada movimento.', 'Mobilização', 'Fácil', '5 minutos', ARRAY['cervical', 'trapezio'], ARRAY['nenhum']),
            (gen_random_uuid(), 'Caminhada Assistida', 'Exercício cardiovascular de baixo impacto', 'Caminhe em superfície plana por 20-30 minutos, mantendo ritmo confortável.', 'Cardiovascular', 'Fácil', '20-30 minutos', ARRAY['membros_inferiores', 'cardiovascular'], ARRAY['tenis_confortavel']),
            (gen_random_uuid(), 'Exercício de Respiração', 'Técnica de respiração diafragmática', 'Deite-se confortavelmente, coloque uma mão no peito e outra no abdômen. Respire profundamente inflando o abdômen.', 'Respiratório', 'Fácil', '10 minutos', ARRAY['diafragma', 'intercostais'], ARRAY['nenhum'])
            ON CONFLICT DO NOTHING;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Ignorar erros (demo data não é crítica)
            NULL;
    END;
END $$;
