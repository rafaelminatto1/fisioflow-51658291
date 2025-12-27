-- Insert demo exercises (condicionalmente, apenas se as colunas existirem)
-- Esta é uma migration de demo data, erros serão ignorados
DO $$
DECLARE
    has_target_muscles BOOLEAN;
    has_equipment BOOLEAN;
    has_contraindications BOOLEAN;
    has_appointment_date BOOLEAN;
    has_appointment_time BOOLEAN;
    has_duration BOOLEAN;
    has_type BOOLEAN;
    has_notes BOOLEAN;
BEGIN
    has_target_muscles := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'target_muscles');
    has_equipment := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'equipment');
    has_contraindications := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'contraindications');
    has_appointment_date := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'appointment_date');
    has_appointment_time := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'appointment_time');
    has_duration := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'duration');
    has_type := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'type');
    has_notes := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'notes');
    
    BEGIN
        -- Insert exercises
        IF has_target_muscles AND has_equipment AND has_contraindications THEN
            INSERT INTO public.exercises (id, name, description, instructions, category, difficulty, duration, target_muscles, equipment, contraindications)
            VALUES 
            (gen_random_uuid(), 'Alongamento Lombar', 'Exercício para alívio da tensão lombar', 'Deite-se de costas, flexione os joelhos e puxe-os em direção ao peito. Mantenha por 30 segundos.', 'alongamento', 'iniciante', '30 segundos', ARRAY['paravertebrais', 'lombar'], ARRAY['nenhum'], 'Dor aguda intensa'),
            (gen_random_uuid(), 'Fortalecimento do Core', 'Exercício para fortalecimento da musculatura abdominal', 'Deite-se de costas, flexione os joelhos e eleve o tronco contraindo o abdômen. 3 séries de 15 repetições.', 'fortalecimento', 'intermediario', '10 minutos', ARRAY['abdominais', 'core'], ARRAY['colchonete'], 'Hérnias abdominais'),
            (gen_random_uuid(), 'Mobilização Cervical', 'Exercício para melhora da mobilidade cervical', 'Sentado, realize movimentos lentos de flexão, extensão e rotação do pescoço. 10 repetições cada movimento.', 'mobilidade', 'iniciante', '5 minutos', ARRAY['cervical', 'trapezio'], ARRAY['nenhum'], 'Vertigens'),
            (gen_random_uuid(), 'Caminhada Assistida', 'Exercício cardiovascular de baixo impacto', 'Caminhe em superfície plana por 20-30 minutos, mantendo ritmo confortável.', 'cardio', 'iniciante', '20-30 minutos', ARRAY['membros_inferiores', 'cardiovascular'], ARRAY['tenis_confortavel'], 'Dor aguda em membros inferiores'),
            (gen_random_uuid(), 'Exercício de Respiração', 'Técnica de respiração diafragmática', 'Deite-se confortavelmente, coloque uma mão no peito e outra no abdômen. Respire profundamente inflando o abdômen.', 'respiratorio', 'iniciante', '10 minutos', ARRAY['diafragma', 'intercostais'], ARRAY['nenhum'], 'Pneumotórax ativo'),
            (gen_random_uuid(), 'Exercícios de Equilíbrio', 'Exercícios para melhora do equilíbrio e propriocepção', 'Fique em pé sobre uma perna só, mantenha por 30 segundos. Repita com a outra perna.', 'equilibrio', 'intermediario', '15 minutos', ARRAY['proprioceptores', 'core'], ARRAY['superficie_instavel'], 'Vertigens severas')
            ON CONFLICT DO NOTHING;
        ELSIF has_target_muscles AND has_equipment THEN
            INSERT INTO public.exercises (id, name, description, instructions, category, difficulty, duration, target_muscles, equipment)
            VALUES 
            (gen_random_uuid(), 'Alongamento Lombar', 'Exercício para alívio da tensão lombar', 'Deite-se de costas, flexione os joelhos e puxe-os em direção ao peito. Mantenha por 30 segundos.', 'alongamento', 'iniciante', '30 segundos', ARRAY['paravertebrais', 'lombar'], ARRAY['nenhum']),
            (gen_random_uuid(), 'Fortalecimento do Core', 'Exercício para fortalecimento da musculatura abdominal', 'Deite-se de costas, flexione os joelhos e eleve o tronco contraindo o abdômen. 3 séries de 15 repetições.', 'fortalecimento', 'intermediario', '10 minutos', ARRAY['abdominais', 'core'], ARRAY['colchonete']),
            (gen_random_uuid(), 'Mobilização Cervical', 'Exercício para melhora da mobilidade cervical', 'Sentado, realize movimentos lentos de flexão, extensão e rotação do pescoço. 10 repetições cada movimento.', 'mobilidade', 'iniciante', '5 minutos', ARRAY['cervical', 'trapezio'], ARRAY['nenhum']),
            (gen_random_uuid(), 'Caminhada Assistida', 'Exercício cardiovascular de baixo impacto', 'Caminhe em superfície plana por 20-30 minutos, mantendo ritmo confortável.', 'cardio', 'iniciante', '20-30 minutos', ARRAY['membros_inferiores', 'cardiovascular'], ARRAY['tenis_confortavel']),
            (gen_random_uuid(), 'Exercício de Respiração', 'Técnica de respiração diafragmática', 'Deite-se confortavelmente, coloque uma mão no peito e outra no abdômen. Respire profundamente inflando o abdômen.', 'respiratorio', 'iniciante', '10 minutos', ARRAY['diafragma', 'intercostais'], ARRAY['nenhum']),
            (gen_random_uuid(), 'Exercícios de Equilíbrio', 'Exercícios para melhora do equilíbrio e propriocepção', 'Fique em pé sobre uma perna só, mantenha por 30 segundos. Repita com a outra perna.', 'equilibrio', 'intermediario', '15 minutos', ARRAY['proprioceptores', 'core'], ARRAY['superficie_instavel'])
            ON CONFLICT DO NOTHING;
        ELSE
            INSERT INTO public.exercises (id, name, description, instructions, category, difficulty, duration)
            VALUES 
            (gen_random_uuid(), 'Alongamento Lombar', 'Exercício para alívio da tensão lombar', 'Deite-se de costas, flexione os joelhos e puxe-os em direção ao peito. Mantenha por 30 segundos.', 'alongamento', 'iniciante', '30 segundos'),
            (gen_random_uuid(), 'Fortalecimento do Core', 'Exercício para fortalecimento da musculatura abdominal', 'Deite-se de costas, flexione os joelhos e eleve o tronco contraindo o abdômen. 3 séries de 15 repetições.', 'fortalecimento', 'intermediario', '10 minutos'),
            (gen_random_uuid(), 'Mobilização Cervical', 'Exercício para melhora da mobilidade cervical', 'Sentado, realize movimentos lentos de flexão, extensão e rotação do pescoço. 10 repetições cada movimento.', 'mobilidade', 'iniciante', '5 minutos'),
            (gen_random_uuid(), 'Caminhada Assistida', 'Exercício cardiovascular de baixo impacto', 'Caminhe em superfície plana por 20-30 minutos, mantendo ritmo confortável.', 'cardio', 'iniciante', '20-30 minutos'),
            (gen_random_uuid(), 'Exercício de Respiração', 'Técnica de respiração diafragmática', 'Deite-se confortavelmente, coloque uma mão no peito e outra no abdômen. Respire profundamente inflando o abdômen.', 'respiratorio', 'iniciante', '10 minutos'),
            (gen_random_uuid(), 'Exercícios de Equilíbrio', 'Exercícios para melhora do equilíbrio e propriocepção', 'Fique em pé sobre uma perna só, mantenha por 30 segundos. Repita com a outra perna.', 'equilibrio', 'intermediario', '15 minutos')
            ON CONFLICT DO NOTHING;
        END IF;
        
        -- Insert appointments
        IF has_appointment_date AND has_appointment_time AND has_duration AND has_type AND has_notes THEN
            INSERT INTO public.appointments (id, patient_id, appointment_date, appointment_time, duration, type, status, notes)
            SELECT 
                gen_random_uuid(),
                p.id,
                CURRENT_DATE + ((p.i % 7)::integer),
                ('09:00:00'::time + (p.i * interval '1 hour')),
                60,
                CASE (p.i % 3)
                    WHEN 0 THEN 'Consulta Inicial'
                    WHEN 1 THEN 'Sessão de Fisioterapia'
                    ELSE 'Reavaliação'
                END,
                CASE (p.i % 4)
                    WHEN 0 THEN 'Confirmado'
                    WHEN 1 THEN 'Pendente'
                    WHEN 2 THEN 'Realizado'
                    ELSE 'Confirmado'
                END,
                'Agendamento demo para ' || p.name
            FROM (
                SELECT id, name, ROW_NUMBER() OVER (ORDER BY name)::integer as i
                FROM public.patients 
                WHERE name IN ('Maria Silva', 'João Santos', 'Ana Oliveira', 'Carlos Pereira', 'Fernanda Costa')
            ) p
            ON CONFLICT DO NOTHING;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Ignorar erros (demo data não é crítica)
            NULL;
    END;
END $$;
