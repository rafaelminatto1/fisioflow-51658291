-- Create some demo data with valid UUIDs
-- Function to generate consistent demo UUIDs (same logic as frontend)
CREATE OR REPLACE FUNCTION generate_demo_uuid_v2(role_name text)
RETURNS uuid AS $$
DECLARE
    char_sum integer := 0;
    hash_result bigint;
    hex_string text;
    uuid_string text;
BEGIN
    -- Calculate sum of character codes (same as frontend hash)
    FOR i IN 1..length(role_name) LOOP
        char_sum := char_sum + ascii(substring(role_name from i for 1));
    END LOOP;
    
    -- Simple hash calculation
    hash_result := abs(char_sum * 31 + length(role_name));
    hex_string := lpad(to_hex(hash_result % 4294967296), 8, '0');
    
    -- Format as UUID v4 (same pattern as frontend)
    uuid_string := substr(hex_string, 1, 8) || '-' || 
                   substr(hex_string, 1, 4) || '-4' || 
                   substr(hex_string, 2, 3) || '-8' || 
                   substr(hex_string, 1, 3) || '-' || 
                   rpad(substr(hex_string, 1, 12), 12, '0');
    
    RETURN uuid_string::uuid;
END;
$$ LANGUAGE plpgsql;

-- Insert demo patients (not tied to specific users)
INSERT INTO public.patients (
    id,
    name,
    email,
    phone,
    birth_date,
    gender,
    main_condition,
    status,
    address,
    medical_history
) VALUES 
(
    gen_random_uuid(),
    'Maria Silva',
    'maria.silva@email.com',
    '(11) 98888-1111',
    '1985-03-15',
    'Feminino',
    'Lombalgia',
    'Ativo',
    'Rua das Flores, 123 - São Paulo/SP',
    'Histórico de dor lombar há 2 anos. Trabalha em escritório.'
),
(
    gen_random_uuid(),
    'João Santos',
    'joao.santos@email.com',
    '(11) 98888-2222',
    '1978-07-22',
    'Masculino',
    'Lesão no ombro',
    'Ativo',
    'Av. Principal, 456 - São Paulo/SP',
    'Lesão durante atividade esportiva. Pratica tênis recreativo.'
),
(
    gen_random_uuid(),
    'Ana Oliveira',
    'ana.oliveira@email.com',
    '(11) 98888-3333',
    '1992-11-08',
    'Feminino',
    'Dor cervical',
    'Inicial',
    'Rua da Esperança, 789 - São Paulo/SP',
    'Dor cervical por postura inadequada no trabalho. Primeira consulta.'
),
(
    gen_random_uuid(),
    'Carlos Pereira',
    'carlos.pereira@email.com',
    '(11) 98888-4444',
    '1965-05-30',
    'Masculino',
    'Artrose de joelho',
    'Em tratamento',
    'Rua do Comércio, 321 - São Paulo/SP',
    'Artrose bilateral de joelhos. Aposentado, 65 anos.'
),
(
    gen_random_uuid(),
    'Fernanda Costa',
    'fernanda.costa@email.com',
    '(11) 98888-5555',
    '1988-12-03',
    'Feminino',
    'Fibromialgia',
    'Ativo',
    'Av. das Palmeiras, 654 - São Paulo/SP',
    'Diagnóstico de fibromialgia. Professora, 35 anos.'
)
ON CONFLICT DO NOTHING;

-- Insert demo exercises
INSERT INTO public.exercises (
    id,
    name,
    description,
    instructions,
    category,
    difficulty,
    duration,
    target_muscles,
    equipment,
    contraindications
) VALUES 
(
    gen_random_uuid(),
    'Alongamento Lombar',
    'Exercício para alívio da tensão lombar',
    'Deite-se de costas, flexione os joelhos e puxe-os em direção ao peito. Mantenha por 30 segundos.',
    'Alongamento',
    'Fácil',
    '30 segundos',
    ARRAY['paravertebrais', 'lombar'],
    ARRAY['nenhum'],
    'Dor aguda intensa, hérnias discais grandes'
),
(
    gen_random_uuid(),
    'Fortalecimento do Core',
    'Exercício para fortalecimento da musculatura abdominal',
    'Deite-se de costas, flexione os joelhos e eleve o tronco contraindo o abdômen. 3 séries de 15 repetições.',
    'Fortalecimento',
    'Médio',
    '10 minutos',
    ARRAY['abdominais', 'core'],
    ARRAY['colchonete'],
    'Hérnias abdominais, gravidez'
),
(
    gen_random_uuid(),
    'Mobilização Cervical',
    'Exercício para melhora da mobilidade cervical',
    'Sentado, realize movimentos lentos de flexão, extensão e rotação do pescoço. 10 repetições cada movimento.',
    'Mobilização',
    'Fácil',
    '5 minutos',
    ARRAY['cervical', 'trapezio'],
    ARRAY['nenhum'],
    'Vertigens, instabilidade cervical'
),
(
    gen_random_uuid(),
    'Caminhada Assistida',
    'Exercício cardiovascular de baixo impacto',
    'Caminhe em superfície plana por 20-30 minutos, mantendo ritmo confortável.',
    'Cardiovascular',
    'Fácil',
    '20-30 minutos',
    ARRAY['membros_inferiores', 'cardiovascular'],
    ARRAY['tenis_confortavel'],
    'Dor aguda em membros inferiores'
),
(
    gen_random_uuid(),
    'Exercício de Respiração',
    'Técnica de respiração diafragmática',
    'Deite-se confortavelmente, coloque uma mão no peito e outra no abdômen. Respire profundamente inflando o abdômen.',
    'Respiratório',
    'Fácil',
    '10 minutos',
    ARRAY['diafragma', 'intercostais'],
    ARRAY['nenhum'],
    'Pneumotórax ativo'
)
ON CONFLICT DO NOTHING;

-- Insert some appointment data for the current week
INSERT INTO public.appointments (
    id,
    patient_id,
    appointment_date,
    appointment_time,
    duration,
    type,
    status,
    notes
) 
SELECT 
    gen_random_uuid(),
    p.id,
    CURRENT_DATE + (i % 7),
    ('09:00:00'::time + (i * interval '1 hour')),
    60,
    CASE (i % 3)
        WHEN 0 THEN 'Consulta Inicial'
        WHEN 1 THEN 'Sessão de Fisioterapia'
        ELSE 'Reavaliação'
    END,
    CASE (i % 4)
        WHEN 0 THEN 'Confirmado'
        WHEN 1 THEN 'Pendente'
        WHEN 2 THEN 'Realizado'
        ELSE 'Confirmado'
    END,
    'Agendamento demo para ' || p.name
FROM (
    SELECT id, name, ROW_NUMBER() OVER (ORDER BY name) as i
    FROM public.patients 
    LIMIT 10
) p
ON CONFLICT DO NOTHING;