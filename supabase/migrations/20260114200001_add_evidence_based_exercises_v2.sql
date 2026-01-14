-- Migration: Adicionar exercícios baseados em evidências aos templates (VERSÃO CORRIGIDA)
-- Data: 2025-01-14
-- Descrição: Associa exercícios específicos baseados em evidências científicas padrão ouro a cada template
-- Referências: AAOS, APTA, JOSPT, Cochrane Reviews, NCBI/PMC, Physio-pedia
--
-- Nota: Esta migration assume que os nomes dos exercícios foram corrigidos pela migration 20260114100000_fix_exercise_names.sql

-- ============================================================
-- PÓS-OP LCA - FASE 1 (0-6 semanas)
-- Referências: AAOS Clinical Practice Guideline (2022), APTA (2022), Verhagen et al. (2025)
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Mobilização Patelar' THEN 2
        WHEN 'Mobilização de Tornozelo em DF' THEN 3
        WHEN 'Elevação de Panturrilha Sentado' THEN 4
        WHEN 'Sit-to-Stand' THEN 5
        WHEN 'Ponte de Glúteo Bilateral' THEN 6
        WHEN 'Agachamento Parede (Wall Sit)' THEN 7
        WHEN 'Agachamento com Suporte' THEN 8
        WHEN 'Extensão de Joelho em Cadeia Cinética Aberta' THEN 9
        WHEN 'Elevação de Panturrilha em Pé' THEN 10
        WHEN 'Alongamento de Quadríceps em Pé' THEN 11
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 12
        WHEN 'Alongamento de Panturrilha na Parede' THEN 13
    END as order_index,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 1
        WHEN 'Sit-to-Stand' THEN 3
        WHEN 'Ponte de Glúteo Bilateral' THEN 3
        WHEN 'Agachamento com Suporte' THEN 3
        WHEN 'Extensão de Joelho em Cadeia Cinética Aberta' THEN 3
        WHEN 'Elevação de Panturrilha em Pé' THEN 3
        WHEN 'Elevação de Panturrilha Sentado' THEN 3
        WHEN 'Mobilização Patelar' THEN 2
        WHEN 'Mobilização de Tornozelo em DF' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 30
        WHEN 'Sit-to-Stand' THEN 15
        WHEN 'Ponte de Glúteo Bilateral' THEN 10
        WHEN 'Agachamento com Suporte' THEN 15
        WHEN 'Extensão de Joelho em Cadeia Cinética Aberta' THEN 15
        WHEN 'Elevação de Panturrilha em Pé' THEN 15
        WHEN 'Elevação de Panturrilha Sentado' THEN 15
        WHEN 'Mobilização Patelar' THEN 10
        WHEN 'Mobilização de Tornozelo em DF' THEN 30
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Alongamento de Quadríceps em Pé' THEN 30
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
        WHEN 'Alongamento de Panturrilha na Parede' THEN 30
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 20
        WHEN 'Mobilização Patelar' THEN 10
        WHEN 'Mobilização de Tornozelo em DF' THEN 30
        WHEN 'Respiração Diafragmática' THEN 5
        WHEN 'Alongamento de Quadríceps em Pé' THEN 30
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
        WHEN 'Alongamento de Panturrilha na Parede' THEN 30
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Mobilização Patelar' THEN 'Essencial para prevenir aderências. Realizar 4 direções.'
        WHEN 'Extensão de Joelho em Cadeia Cinética Aberta' THEN 'ARCO 45-90° apenas. Evitar extensão completa.'
        WHEN 'Sit-to-Stand' THEN 'Progressão: usar mãos → sem mãos.'
        WHEN 'Agachamento com Suporte' THEN 'Máximo 45° flexão. Não forçar.'
        ELSE NULL
    END as notes,
    0 as week_start,
    6 as week_end,
    CASE e.name
        WHEN 'Mobilização Patelar' THEN 'Prevenção de aderências patelares é crítica para extensão completa. AAOS guideline recomenda mobilização patelar precoce.'
        WHEN 'Extensão de Joelho em Cadeia Cinética Aberta' THEN 'Cuidado: evitar 0-45° nas primeiras 6 semanas (proteção enxerto). Verhagen et al. 2025'
        WHEN 'Elevação de Panturrilha Sentado' THEN 'Sóleo ativo sem estresse no joelho. Importante para marcha.'
        WHEN 'Ponte de Glúteo Bilateral' THEN 'Ativação de glúteo é essencial para controle de joelho em cadeia fechada. APTA 2022'
        WHEN 'Respiração Diafragmática' THEN 'Controle respiratório otimiza ativação de core estabilizador.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Glúteo Médio', 'Isquiotibiais']
        WHEN 'Elevação de Panturrilha Sentado' THEN ARRAY['Sóleo']
        WHEN 'Elevação de Panturrilha em Pé' THEN ARRAY['Gastrocnêmio', 'Sóleo']
        WHEN 'Agachamento Parede (Wall Sit)' THEN ARRAY['Quadríceps', 'Glúteos']
        WHEN 'Extensão de Joelho em Cadeia Cinética Aberta' THEN ARRAY['Vasto Medial', 'Vasto Lateral', 'Reto Femoral']
        WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos', 'Core']
        WHEN 'Agachamento com Suporte' THEN ARRAY['Quadríceps', 'Glúteos']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Mobilização Patelar' THEN 'Prevenir aderências patelares'
        WHEN 'Extensão de Joelho em Cadeia Cinética Aberta' THEN 'Ativar quadríceps em arco seguro'
        WHEN 'Ponte de Glúteo Bilateral' THEN 'Estabilizar pélvis e ativar cadeia posterior'
        WHEN 'Sit-to-Stand' THEN 'Funcionalidade básica de transferências'
        WHEN 'Respiração Diafragmática' THEN 'Ativar core estabilizador profundo'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Agachamento com Suporte',
    'Agachamento Parede (Wall Sit)',
    'Extensão de Joelho em Cadeia Cinética Aberta',
    'Elevação de Panturrilha em Pé',
    'Elevação de Panturrilha Sentado',
    'Ponte de Glúteo Bilateral',
    'Mobilização Patelar',
    'Mobilização de Tornozelo em DF',
    'Alongamento de Isquiotibiais em Pé',
    'Alongamento de Quadríceps em Pé',
    'Alongamento de Panturrilha na Parede',
    'Sit-to-Stand',
    'Respiração Diafragmática'
)
WHERE t.name = 'Pós-Op LCA - Fase 1'
ON CONFLICT DO NOTHING;

-- ============================================================
-- PÓS-OP LCA - FASE 2 (6-12 semanas)
-- Referências: Aspetar Guidelines, MGH Protocol (2023)
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Prancha Abdominal (Plank)' THEN 1
        WHEN 'Dead Bug' THEN 2
        WHEN 'Ponte de Glúteo Unilateral' THEN 3
        WHEN 'Clamshell (Concha)' THEN 4
        WHEN 'Abdução de Quadril em Pé' THEN 5
        WHEN 'Monster Walk (Caminhada Monster)' THEN 6
        WHEN 'Leg Press 45°' THEN 7
        WHEN 'Agachamento Parede (Wall Sit)' THEN 8
        WHEN 'Step Down' THEN 9
        WHEN 'Step Up' THEN 10
        WHEN 'Extensão de Joelho em Cadeia Cinética Aberta' THEN 11
        WHEN 'Flexão de Joelho em Pronação' THEN 12
        WHEN 'Elevação de Panturrilha em Pé' THEN 13
        WHEN 'Equilíbrio Unipodal Solo' THEN 14
        WHEN 'Single Leg Stance com Movimento de Braço' THEN 15
    END as order_index,
    3 as sets,
    CASE e.name
        WHEN 'Leg Press 45°' THEN 15
        WHEN 'Agachamento Parede (Wall Sit)' THEN 45
        WHEN 'Step Down' THEN 15
        WHEN 'Step Up' THEN 15
        WHEN 'Extensão de Joelho em Cadeia Cinética Aberta' THEN 15
        WHEN 'Flexão de Joelho em Pronação' THEN 15
        WHEN 'Elevação de Panturrilha em Pé' THEN 20
        WHEN 'Ponte de Glúteo Unilateral' THEN 10
        WHEN 'Clamshell (Concha)' THEN 15
        WHEN 'Abdução de Quadril em Pé' THEN 15
        WHEN 'Monster Walk (Caminhada Monster)' THEN 20
        WHEN 'Prancha Abdominal (Plank)' THEN 30
        WHEN 'Dead Bug' THEN 12
        WHEN 'Equilíbrio Unipodal Solo' THEN 45
        WHEN 'Single Leg Stance com Movimento de Braço' THEN 60
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 45
        WHEN 'Prancha Abdominal (Plank)' THEN 30
        WHEN 'Equilíbrio Unipodal Solo' THEN 45
        WHEN 'Single Leg Stance com Movimento de Braço' THEN 60
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Step Down' THEN 'Monitorar valgo dinâmico. Joelho não deve ir para dentro.'
        WHEN 'Step Up' THEN 'Subir com operado, descer com sadio se necessário.'
        WHEN 'Equilíbrio Unipodal Solo' THEN 'Progredir para olhos fechados.'
        WHEN 'Leg Press 45°' THEN 'Arco 0-90°. Carga progressiva.'
        ELSE NULL
    END as notes,
    6 as week_start,
    12 as week_end,
    CASE e.name
        WHEN 'Step Down' THEN 'Exercício chave para controle motor e propriocepção. MGH Protocol 2023'
        WHEN 'Clamshell (Concha)' THEN 'Glúteo médio é crucial para controle de valgo dinâmico.'
        WHEN 'Monster Walk (Caminhada Monster)' THEN 'Treino funcional de abdutores em padrão de marcha.'
        WHEN 'Single Leg Stance com Movimento de Braço' THEN 'Propriocepção avançada com dual-task.'
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Assimetrias de força entre membros devem ser tratadas.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Step Down' THEN ARRAY['Quadríceps', 'Glúteo Médio', 'Core']
        WHEN 'Step Up' THEN ARRAY['Quadríceps', 'Glúteos', 'Isquiotibiais']
        WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo', 'Isquiotibiais']
        WHEN 'Clamshell (Concha)' THEN ARRAY['Glúteo Médio']
        WHEN 'Monster Walk (Caminhada Monster)' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo', 'Tensor Fascia Lata']
        WHEN 'Abdução de Quadril em Pé' THEN ARRAY['Glúteo Médio']
        WHEN 'Equilíbrio Unipodal Solo' THEN ARRAY['Tornozelo', 'Core', 'MMII']
        WHEN 'Single Leg Stance com Movimento de Braço' THEN ARRAY['Core', 'Tornozelo', 'Proprioceptores']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Step Down' THEN 'Controle motor e propriocepção'
        WHEN 'Step Up' THEN 'Força funcional e simetria'
        WHEN 'Clamshell (Concha)' THEN 'Prevenir valgo dinâmico'
        WHEN 'Monster Walk (Caminhada Monster)' THEN 'Fortalecimento funcional de glúteo médio'
        WHEN 'Single Leg Stance com Movimento de Braço' THEN 'Propriocepção avançada'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Agachamento Parede (Wall Sit)',
    'Leg Press 45°',
    'Extensão de Joelho em Cadeia Cinética Aberta',
    'Flexão de Joelho em Pronação',
    'Elevação de Panturrilha em Pé',
    'Step Up',
    'Step Down',
    'Ponte de Glúteo Unilateral',
    'Clamshell (Concha)',
    'Monster Walk (Caminhada Monster)',
    'Abdução de Quadril em Pé',
    'Equilíbrio Unipodal Solo',
    'Single Leg Stance com Movimento de Braço',
    'Prancha Abdominal (Plank)',
    'Dead Bug'
)
WHERE t.name = 'Pós-Op LCA - Fase 2'
ON CONFLICT DO NOTHING;

-- ============================================================
-- PÓS-OP LCA - FASE 3 (12+ semanas - Retorno ao Esporte)
-- Referências: Aspetar Return to Sport Criteria, Grindem et al. ACL-RSI
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Prancha Abdominal (Plank)' THEN 1
        WHEN 'Side Plank (Prancha Lateral)' THEN 2
        WHEN 'Equilíbrio em Disco Instável' THEN 3
        WHEN 'BOSU Ball Squat' THEN 4
        WHEN 'Star Excursion Balance Test (SEBT)' THEN 5
        WHEN 'Afundo Frontal (Lunge)' THEN 6
        WHEN 'Deadlift (Levantamento Terra) com Halteres' THEN 7
        WHEN 'RDL (Romanian Deadlift)' THEN 8
        WHEN 'Agachamento em Disco Instável' THEN 9
        WHEN 'Mini-Landing Protocol' THEN 10
        WHEN 'Squat Jump' THEN 11
        WHEN 'Box Jump' THEN 12
        WHEN 'Carregamento Lateral' THEN 13
        WHEN 'Lunge com Rotação' THEN 14
        WHEN 'Gait Training com Obstáculos' THEN 15
        WHEN 'Descida de Escada' THEN 16
        WHEN 'Subida de Escada' THEN 17
        WHEN 'Carrying de Carga (Farmer Walk)' THEN 18
    END as order_index,
    CASE e.name
        WHEN 'Prancha Abdominal (Plank)' THEN 4
        WHEN 'Side Plank (Prancha Lateral)' THEN 3
        WHEN 'Equilíbrio em Disco Instável' THEN 3
        WHEN 'BOSU Ball Squat' THEN 3
        WHEN 'Star Excursion Balance Test (SEBT)' THEN 3
        WHEN 'Afundo Frontal (Lunge)' THEN 3
        WHEN 'Deadlift (Levantamento Terra) com Halteres' THEN 3
        WHEN 'RDL (Romanian Deadlift)' THEN 3
        WHEN 'Agachamento em Disco Instável' THEN 3
        WHEN 'Mini-Landing Protocol' THEN 3
        WHEN 'Squat Jump' THEN 3
        WHEN 'Box Jump' THEN 3
        WHEN 'Carregamento Lateral' THEN 3
        WHEN 'Lunge com Rotação' THEN 3
        WHEN 'Gait Training com Obstáculos' THEN 3
        WHEN 'Descida de Escada' THEN 2
        WHEN 'Subida de Escada' THEN 2
        WHEN 'Carrying de Carga (Farmer Walk)' THEN 3
    END as sets,
    CASE e.name
        WHEN 'Afundo Frontal (Lunge)' THEN 12
        WHEN 'Deadlift (Levantamento Terra) com Halteres' THEN 10
        WHEN 'RDL (Romanian Deadlift)' THEN 10
        WHEN 'Agachamento em Disco Instável' THEN 15
        WHEN 'Equilíbrio em Disco Instável' THEN 60
        WHEN 'Star Excursion Balance Test (SEBT)' THEN 8
        WHEN 'BOSU Ball Squat' THEN 15
        WHEN 'Mini-Landing Protocol' THEN 10
        WHEN 'Squat Jump' THEN 15
        WHEN 'Box Jump' THEN 10
        WHEN 'Carregamento Lateral' THEN 20
        WHEN 'Lunge com Rotação' THEN 15
        WHEN 'Prancha Abdominal (Plank)' THEN 60
        WHEN 'Side Plank (Prancha Lateral)' THEN 45
        WHEN 'Gait Training com Obstáculos' THEN 10
        WHEN 'Descida de Escada' THEN 10
        WHEN 'Subida de Escada' THEN 10
        WHEN 'Carrying de Carga (Farmer Walk)' THEN 60
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Prancha Abdominal (Plank)' THEN 60
        WHEN 'Side Plank (Prancha Lateral)' THEN 45
        WHEN 'Equilíbrio em Disco Instável' THEN 60
        WHEN 'Carrying de Carga (Farmer Walk)' THEN 60
        WHEN 'Star Excursion Balance Test (SEBT)' THEN 8
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Mini-Landing Protocol' THEN 'Essencial para padrão de aterrissagem seguro.'
        WHEN 'Squat Jump' THEN 'Iniciar com baixa amplitude. Aterrissagem suave.'
        WHEN 'Box Jump' THEN 'Descer pela caixa, não saltar para baixo.'
        WHEN 'Star Excursion Balance Test (SEBT)' THEN 'Teste funcional e exercício. Medir alcance.'
        WHEN 'BOSU Ball Squat' THEN 'Progressão: estável → plano BOSU → invertido.'
        WHEN 'RDL (Romanian Deadlift)' THEN 'Manter coluna reta. Sensação de alongar posterior.'
        ELSE NULL
    END as notes,
    12 as week_start,
    NULL as week_end,
    CASE e.name
        WHEN 'Mini-Landing Protocol' THEN 'Pliometria essencial para retorno ao esporte. Até 90% do risco de re-lesão é devido a deficiência em pliometria. Grindem et al. ACL-RSI'
        WHEN 'Star Excursion Balance Test (SEBT)' THEN 'Teste validado para retorno ao esporte. Deficiência >10% indica risco. Aspetar Guidelines'
        WHEN 'Squat Jump' THEN 'Potência de membros inferiores crítica para esportes.'
        WHEN 'RDL (Romanian Deadlift)' THEN 'Fortalecimento excêntrico de isquiotibiais protege enxerto LCA. Verhagen et al. 2025'
        WHEN 'Carregamento Lateral' THEN 'Treino de core em padrões funcionais com transferência para esporte.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Afundo Frontal (Lunge)' THEN ARRAY['Quadríceps', 'Glúteos', 'Isquiotibiais', 'Core']
        WHEN 'Deadlift (Levantamento Terra) com Halteres' THEN ARRAY['Glúteos', 'Isquiotibiais', 'Eretores Espinhais', 'Core']
        WHEN 'RDL (Romanian Deadlift)' THEN ARRAY['Isquiotibiais', 'Glúteos']
        WHEN 'Mini-Landing Protocol' THEN ARRAY['Quadríceps', 'Glúteos', 'Core', 'Proprioceptores']
        WHEN 'Squat Jump' THEN ARRAY['Quadríceps', 'Glúteos', 'Potência']
        WHEN 'Box Jump' THEN ARRAY['MMII', 'Potência', 'Core']
        WHEN 'BOSU Ball Squat' THEN ARRAY['Joelho', 'Tornozelo', 'Core', 'Proprioceptores']
        WHEN 'Star Excursion Balance Test (SEBT)' THEN ARRAY['Joelho', 'Tornozelo', 'Core', 'Proprioceptores']
        WHEN 'Carregamento Lateral' THEN ARRAY['Core', 'Oblíquos', 'MMII']
        WHEN 'Lunge com Rotação' THEN ARRAY['Core', 'MMII', 'Rotadores Tronco']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Mini-Landing Protocol' THEN 'Pliometria e padrão de aterrissagem'
        WHEN 'Star Excursion Balance Test (SEBT)' THEN 'Teste funcional de retorno ao esporte'
        WHEN 'Squat Jump' THEN 'Potência de MMII'
        WHEN 'BOSU Ball Squat' THEN 'Propriocepção avançada'
        WHEN 'RDL (Romanian Deadlift)' THEN 'Fortalecimento excêntrico de isquiotibiais'
        WHEN 'Carregamento Lateral' THEN 'Core funcional com transferência esportiva'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Afundo Frontal (Lunge)',
    'Deadlift (Levantamento Terra) com Halteres',
    'RDL (Romanian Deadlift)',
    'Agachamento em Disco Instável',
    'Equilíbrio em Disco Instável',
    'Star Excursion Balance Test (SEBT)',
    'BOSU Ball Squat',
    'Mini-Landing Protocol',
    'Squat Jump',
    'Box Jump',
    'Carregamento Lateral',
    'Lunge com Rotação',
    'Prancha Abdominal (Plank)',
    'Side Plank (Prancha Lateral)',
    'Gait Training com Obstáculos',
    'Descida de Escada',
    'Subida de Escada',
    'Carrying de Carga (Farmer Walk)'
)
WHERE t.name = 'Pós-Op LCA - Fase 3'
ON CONFLICT DO NOTHING;

-- ============================================================
-- NOVOS TEMPLATES PARA ADICIONAR
-- ============================================================

-- ============================================================
-- PÓS-OP ATJ (ARTROPLASTIA TOTAL DE JOELHO) - FASE INICIAL
-- Referências: AAOS Guidelines, Joint Replacement Rehab Protocols
-- ============================================================

INSERT INTO exercise_templates (name, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
    'Pós-Op ATJ - Fase Inicial',
    'Ortopedia',
    'Artroplastia Total de Joelho',
    '0-6 semanas',
    'Fase de proteção e mobilização precoce. Objetivos: extensão completa (0°), flexão >90°, marcha independente. Fortalecimento de quadríceps em cadeia cinética fechada. Cuidado com protocolos de analgesia (evitar bloqueio motor prolongado).',
    'Flexão >90° nas primeiras 2 semanas. Exercícios de cadeia cinética aberta em extensão. Massagem patelar agressiva.',
    'Progressão baseada em controle de dor e edema. Não forçar flexão se dor intensa. Usar crioterapia após exercícios.',
    'Critérios: extensão 0°, flexão ≥90°, marcha sem auxílio, degraus. Geralmente 4-6 semanas.',
    'A',
    ARRAY['AAOS Surgical Management of Knee OA Guidelines', 'Total Knee Arthroplasty Rehabilitation Protocol', 'JOSPT TKA Rehabilitation Guidelines']
);

-- PÓS-OP ATJ - FASE INICIAL Exercícios
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Mobilização Patelar' THEN 2
        WHEN '4 Apoios (Four Point kneeling)' THEN 3
        WHEN 'Ponte de Glúteo Bilateral' THEN 4
        WHEN 'Sit-to-Stand' THEN 5
        WHEN 'Agachamento Parede (Wall Sit)' THEN 6
        WHEN 'Leg Press 45°' THEN 7
        WHEN 'Elevação de Panturrilha em Pé' THEN 8
        WHEN 'Subida de Escada' THEN 9
        WHEN 'Descida de Escada' THEN 10
        WHEN 'Alongamento de Quadríceps em Pé' THEN 11
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 12
    END as order_index,
    CASE e.name
        WHEN '4 Apoios (Four Point kneeling)' THEN 2
        WHEN 'Ponte de Glúteo Bilateral' THEN 3
        WHEN 'Sit-to-Stand' THEN 3
        WHEN 'Agachamento Parede (Wall Sit)' THEN 2
        WHEN 'Leg Press 45°' THEN 3
        WHEN 'Elevação de Panturrilha em Pé' THEN 3
        WHEN 'Subida de Escada' THEN 2
        WHEN 'Descida de Escada' THEN 2
        WHEN 'Alongamento de Quadríceps em Pé' THEN 2
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
        WHEN 'Mobilização Patelar' THEN 3
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Ponte de Glúteo Bilateral' THEN 10
        WHEN 'Sit-to-Stand' THEN 15
        WHEN 'Agachamento Parede (Wall Sit)' THEN 30
        WHEN 'Leg Press 45°' THEN 15
        WHEN 'Elevação de Panturrilha em Pé' THEN 20
        WHEN 'Subida de Escada' THEN 10
        WHEN 'Descida de Escada' THEN 10
        WHEN 'Mobilização Patelar' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 30
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Alongamento de Quadríceps em Pé' THEN 30
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
        WHEN '4 Apoios (Four Point kneeling)' THEN 10
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Mobilização Patelar' THEN 'Essencial para prevenir aderências em ATJ.'
        WHEN 'Sit-to-Stand' THEN 'Usar braços se necessário. Não ultrapassar 90° flexão.'
        WHEN 'Leg Press 45°' THEN 'Arco limitado (0-60° inicialmente).'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Mobilização Patelar' THEN 'Prevenção de arthrofibrose é crítica em ATJ.'
        WHEN 'Sit-to-Stand' THEN 'Funcionalidade básica progressiva.'
        WHEN 'Agachamento Parede (Wall Sit)' THEN 'Isometria de quadríceps é cornerstone.'
        WHEN 'Elevação de Panturrilha em Pé' THEN 'Prevenção de TVP é essencial em ATJ.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais']
        WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos', 'Core']
        WHEN 'Agachamento Parede (Wall Sit)' THEN ARRAY['Quadríceps']
        WHEN 'Leg Press 45°' THEN ARRAY['Quadríceps', 'Glúteos']
        WHEN 'Elevação de Panturrilha em Pé' THEN ARRAY['Panturrilha']
        WHEN 'Mobilização Patelar' THEN ARRAY['Patela']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Mobilização Patelar' THEN 'Prevenir arthrofibrose'
        WHEN 'Sit-to-Stand' THEN 'Funcionalidade básica'
        WHEN 'Agachamento Parede (Wall Sit)' THEN 'Ativar quadríceps'
        WHEN 'Elevação de Panturrilha em Pé' THEN 'Prevenir TVP'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Mobilização Patelar',
    '4 Apoios (Four Point kneeling)',
    'Ponte de Glúteo Bilateral',
    'Sit-to-Stand',
    'Agachamento Parede (Wall Sit)',
    'Leg Press 45°',
    'Elevação de Panturrilha em Pé',
    'Subida de Escada',
    'Descida de Escada',
    'Alongamento de Quadríceps em Pé',
    'Alongamento de Isquiotibiais em Pé'
)
WHERE t.name = 'Pós-Op ATJ - Fase Inicial'
ON CONFLICT DO NOTHING;

-- ============================================================
-- PÓS-OP ATQ (ARTROPLASTIA TOTAL DE QUADRIL) - FASE INICIAL
-- Referências: AAOS Guidelines, THA Rehabilitation Protocols
-- ============================================================

INSERT INTO exercise_templates (name, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
    'Pós-Op ATQ - Fase Inicial',
    'Ortopedia',
    'Artroplastia Total de Quadril',
    '0-6 semanas',
    'Fase de proteção e mobilização. Precauções: evitar flexão >90°, adução além da linha média, rotação interna excessiva. Objetivos: marcha independente sem auxílio, degraus, deambulação 100m. Fortalecimento de glúteos e abdutores é essencial.',
    'Flexão >90°, adução além da linha média, rotação interna excessiva nas primeiras 6-12 semanas. Exercícios que causem luxação.',
    'Respeitar limites de movimento. Não cruzar pernas. Usar travesseiro entre pernas ao dormir (primeiras 6 semanas).',
    'Critérios: marcha sem auxílio, degraus, sem Trendelenburg. Geralmente 4-6 semanas.',
    'A',
    ARRAY['AAOS Surgical Management of Hip OA Guidelines', 'Total Hip Arthroplasty Rehabilitation Protocol', 'JOSPT THA Rehabilitation Guidelines']
);

-- PÓS-OP ATQ - FASE INICIAL Exercícios
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN '4 Apoios (Four Point kneeling)' THEN 2
        WHEN 'Ponte de Glúteo Bilateral' THEN 3
        WHEN 'Ponte de Glúteo Unilateral' THEN 4
        WHEN 'Clamshell (Concha)' THEN 5
        WHEN 'Abdução de Quadril em Pé' THEN 6
        WHEN 'Monster Walk (Caminhada Monster)' THEN 7
        WHEN 'Sit-to-Stand' THEN 8
        WHEN 'Gait Training com Obstáculos' THEN 9
        WHEN 'Alongamento de Psoas (Ilíaco)' THEN 10
        WHEN 'Alongamento de Glúteo Supino' THEN 11
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 12
    END as order_index,
    CASE e.name
        WHEN '4 Apoios (Four Point kneeling)' THEN 2
        WHEN 'Ponte de Glúteo Bilateral' THEN 3
        WHEN 'Ponte de Glúteo Unilateral' THEN 3
        WHEN 'Clamshell (Concha)' THEN 3
        WHEN 'Abdução de Quadril em Pé' THEN 3
        WHEN 'Monster Walk (Caminhada Monster)' THEN 3
        WHEN 'Sit-to-Stand' THEN 3
        WHEN 'Gait Training com Obstáculos' THEN 2
        WHEN 'Alongamento de Psoas (Ilíaco)' THEN 2
        WHEN 'Alongamento de Glúteo Supino' THEN 2
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Ponte de Glúteo Bilateral' THEN 10
        WHEN 'Ponte de Glúteo Unilateral' THEN 10
        WHEN 'Clamshell (Concha)' THEN 15
        WHEN 'Monster Walk (Caminhada Monster)' THEN 20
        WHEN 'Abdução de Quadril em Pé' THEN 15
        WHEN 'Sit-to-Stand' THEN 15
        WHEN 'Gait Training com Obstáculos' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN '4 Apoios (Four Point kneeling)' THEN 10
        WHEN 'Gait Training com Obstáculos' THEN 10
        WHEN 'Alongamento de Psoas (Ilíaco)' THEN 30
        WHEN 'Alongamento de Glúteo Supino' THEN 30
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Cuidado: não hiperestender quadril (evitar luxação posterior).'
        WHEN 'Sit-to-Stand' THEN 'Usar braços se necessário. Cadeira alta (>45cm).'
        WHEN 'Gait Training com Obstáculos' THEN 'Supervisão constante.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Glúteo médio é essencial para estabilidade de ATQ.'
        WHEN 'Clamshell (Concha)' THEN 'Glúteo médio previne Trendelenburg.'
        WHEN 'Monster Walk (Caminhada Monster)' THEN 'Abdutores estabilizam quadril em marcha.'
        WHEN 'Sit-to-Stand' THEN 'Funcionalidade básica progressiva.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo']
        WHEN 'Clamshell (Concha)' THEN ARRAY['Glúteo Médio']
        WHEN 'Monster Walk (Caminhada Monster)' THEN ARRAY['Glúteos']
        WHEN 'Abdução de Quadril em Pé' THEN ARRAY['Glúteo Médio']
        WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos', 'Core']
        WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Estabilizar quadril'
        WHEN 'Clamshell (Concha)' THEN 'Prevenir Trendelenburg'
        WHEN 'Monster Walk (Caminhada Monster)' THEN 'Abdutores funcionais'
        WHEN 'Sit-to-Stand' THEN 'Funcionalidade básica'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    '4 Apoios (Four Point kneeling)',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Clamshell (Concha)',
    'Abdução de Quadril em Pé',
    'Monster Walk (Caminhada Monster)',
    'Sit-to-Stand',
    'Gait Training com Obstáculos',
    'Alongamento de Psoas (Ilíaco)',
    'Alongamento de Glúteo Supino',
    'Alongamento de Isquiotibiais em Pé'
)
WHERE t.name = 'Pós-Op ATQ - Fase Inicial'
ON CONFLICT DO NOTHING;

-- ============================================================
-- CAPSULITE ADESIVA (FRIEIRA DE OMBRO)
-- Referências: Physio-pedia, DASH Score Guidelines, Frozen Shoulder Rehab
-- ============================================================

INSERT INTO exercise_templates (name, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
    'Capsulite Adesiva - Fase Congelamento',
    'Ortopedia',
    'Capsulite Adesiva',
    'Fase Congelamento',
    'Fase de dor e rigidez significativa. Objetivos: aliviar dor, manter amplitude disponível, prevenir atrofia. Pendulares e mobilização suave são essenciais. Fisioterapia manual combinada com exercícios domiciliares.',
    'Mobilização forçada que causa dor intensa. Exercícios de alta resistência.',
    'Respeitar limites de dor. Não forçar amplitude passiva. Usar calor antes de exercícios.',
    'Fase congelamento: 2-3 meses. Critérios para progredir: dor <4/10, sono melhorado.',
    'B',
    ARRAY['Physio-pedia Frozen Shoulder Rehabilitation', 'AAOS Adhesive Capsulitis Treatment Guidelines', 'DASH Score Outcome Measures']
);

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Codman Pendular' THEN 2
        WHEN 'Mobilização de Ombro com Bastão' THEN 3
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 4
        WHEN 'Respiração Costal Inferior' THEN 5
        WHEN 'Alongamento de Rombóides na Parede' THEN 6
        WHEN 'Alongamento de Peitoral na Porta' THEN 7
        WHEN 'Mobilização de Nervo Mediano (Tinel e Phalen)' THEN 8
    END as order_index,
    CASE e.name
        WHEN 'Codman Pendular' THEN 3
        WHEN 'Mobilização de Ombro com Bastão' THEN 2
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 2
        WHEN 'Respiracao Diafragmática' THEN 3
        WHEN 'Respiração Costal Inferior' THEN 3
        WHEN 'Alongamento de Rombóides na Parede' THEN 2
        WHEN 'Alongamento de Peitoral na Porta' THEN 2
        WHEN 'Mobilização de Nervo Mediano (Tinel e Phalen)' THEN 2
        ELSE NULL
    END as sets,
    NULL,
    CASE e.name
        WHEN 'Codman Pendular' THEN 120
        WHEN 'Mobilização de Ombro com Bastão' THEN 30
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 30
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Respiração Costal Inferior' THEN 10
        WHEN 'Alongamento de Rombóides na Parede' THEN 30
        WHEN 'Alongamento de Peitoral na Porta' THEN 30
        WHEN 'Mobilização de Nervo Mediano (Tinel e Phalen)' THEN 30
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Codman Pendular' THEN 'Essencial na capsulite. Movimento suave e relaxado.'
        WHEN 'Mobilização de Ombro com Bastão' THEN 'Ativo-assistida respeitando dor.'
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Foco em ritmo escapuloumeral.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Codman Pendular' THEN 'Pendulares são cornerstone na capsulite para manter amplitude.'
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Ritmo escapuloumeral é pré-requisito para função de ombro.'
        WHEN 'Respiração Costal Inferior' THEN 'Respiração diafragmática reduz tensão de cintura escapular.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Codman Pendular' THEN ARRAY['Ombro', 'Manguito Rotador']
        WHEN 'Mobilização de Ombro com Bastão' THEN ARRAY['Ombro', 'Deltóide', 'Manguito Rotador']
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN ARRAY['Escápula', 'Serrátil Anterior', 'Trapézio', 'Rombóides']
        WHEN 'Alongamento de Peitoral na Porta' THEN ARRAY['Peitoral Maior', 'Peitoral Menor']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Codman Pendular' THEN 'ADM passiva sem dor'
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Restaurar ritmo escapuloumeral'
        WHEN 'Mobilização de Ombro com Bastão' THEN 'ADM ativo-assistida'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Codman Pendular',
    'Mobilização de Ombro com Bastão',
    'Mobilização de Escápula (Wall Slides)',
    'Respiração Costal Inferior',
    'Alongamento de Rombóides na Parede',
    'Alongamento de Peitoral na Porta',
    'Mobilização de Nervo Mediano (Tinel e Phalen)'
)
WHERE t.name = 'Capsulite Adesiva - Fase Congelamento'
ON CONFLICT DO NOTHING;

-- ============================================================
-- LUXAÇÃO/INSTABILIDADE PATELOFEMORAL
-- Referências: Physio-pedia PFPS, JOSPT Patellofemoral Guidelines
-- ============================================================

INSERT INTO exercise_templates (name, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
    'Instabilidade Patelofemoral',
    'Ortopedia',
    'Instabilidade Patelofemoral',
    'Protocolo Conservador',
    'Foco em realinhamento patelar através de fortalecimento seletivo de vasto medial e glúteo médio. Exercícios de cadeia cinética fechada em arco seguro (0-45°). Alongamento de laterais (TFL, banda iliotibial). Educação sobre atividade modificada.',
    'Exercícios em CCA em extensão completa (0-30°). Agachamentos profundos com dor anterior.',
    'Monitorar alinhamento patelar durante exercícios. Evitar valgo dinâmico. Progressão gradual de carga.',
    'Protocolo 6-12 semanas. Critérios: sem dor anterior, marcha sem compensações, força adequada de MMII.',
    'A',
    ARRAY['JOSPT Patellofemoral Pain Guidelines (2019)', 'Physio-pedia PFPS Rehabilitation', 'Crossley et al. PFPS Exercise Protocol (2016)']
);

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Ponte de Glúteo Bilateral' THEN 2
        WHEN 'Ponte de Glúteo Unilateral' THEN 3
        WHEN 'Clamshell (Concha)' THEN 4
        WHEN 'Monster Walk (Caminhada Monster)' THEN 5
        WHEN 'Abdução de Quadril em Pé' THEN 6
        WHEN 'Agachamento Parede (Wall Sit)' THEN 7
        WHEN 'Step Down' THEN 8
        WHEN 'Step Up' THEN 9
        WHEN 'Leg Press 45°' THEN 10
        WHEN 'Sit-to-Stand' THEN 11
        WHEN 'Prancha Abdominal (Plank)' THEN 12
        WHEN 'Dead Bug' THEN 13
        WHEN 'Alongamento de Quadríceps em Pé' THEN 14
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 15
        WHEN 'Alongamento de Panturrilha na Parede' THEN 16
    END as order_index,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 3
        WHEN 'Ponte de Glúteo Bilateral' THEN 3
        WHEN 'Ponte de Glúteo Unilateral' THEN 3
        WHEN 'Clamshell (Concha)' THEN 3
        WHEN 'Monster Walk (Caminhada Monster)' THEN 3
        WHEN 'Abdução de Quadril em Pé' THEN 3
        WHEN 'Agachamento Parede (Wall Sit)' THEN 3
        WHEN 'Step Down' THEN 3
        WHEN 'Step Up' THEN 3
        WHEN 'Leg Press 45°' THEN 3
        WHEN 'Sit-to-Stand' THEN 3
        WHEN 'Prancha Abdominal (Plank)' THEN 3
        WHEN 'Dead Bug' THEN 3
        WHEN 'Alongamento de Quadríceps em Pé' THEN 2
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
        WHEN 'Alongamento de Panturrilha na Parede' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 45
        WHEN 'Ponte de Glúteo Bilateral' THEN 10
        WHEN 'Ponte de Glúteo Unilateral' THEN 10
        WHEN 'Clamshell (Concha)' THEN 15
        WHEN 'Monster Walk (Caminhada Monster)' THEN 20
        WHEN 'Abdução de Quadril em Pé' THEN 15
        WHEN 'Step Down' THEN 15
        WHEN 'Step Up' THEN 15
        WHEN 'Leg Press 45°' THEN 15
        WHEN 'Sit-to-Stand' THEN 15
        WHEN 'Prancha Abdominal (Plank)' THEN 30
        WHEN 'Dead Bug' THEN 12
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 30
        WHEN 'Prancha Abdominal (Plank)' THEN 30
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Alongamento de Quadríceps em Pé' THEN 30
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
        WHEN 'Alongamento de Panturrilha na Parede' THEN 30
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 'Manter 0-45° flexão. Não ultrapassar.'
        WHEN 'Step Down' THEN 'Monitorar valgo dinâmico. Joelho não deve ir para dentro.'
        WHEN 'Leg Press 45°' THEN 'Arco limitado 0-45° inicialmente.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Glúteo médio é essencial para controle de valgo dinâmico que protege patela.'
        WHEN 'Agachamento Parede (Wall Sit)' THEN 'Isometria de quadríceps em arco seguro (0-45°).'
        WHEN 'Step Down' THEN 'Exercício chave para realinhamento patelar dinâmico.'
        WHEN 'Monster Walk (Caminhada Monster)' THEN 'Treino funcional de glúteo médio.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo']
        WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais']
        WHEN 'Clamshell (Concha)' THEN ARRAY['Glúteo Médio']
        WHEN 'Monster Walk (Caminhada Monster)' THEN ARRAY['Glúteos', 'Tensor Fascia Lata']
        WHEN 'Abdução de Quadril em Pé' THEN ARRAY['Glúteo Médio']
        WHEN 'Agachamento Parede (Wall Sit)' THEN ARRAY['Quadríceps', 'Vasto Medial']
        WHEN 'Step Down' THEN ARRAY['Quadríceps', 'Glúteo Médio', 'Patela']
        WHEN 'Step Up' THEN ARRAY['Quadríceps', 'Glúteos']
        WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos', 'Core']
        WHEN 'Prancha Abdominal (Plank)' THEN ARRAY['Core', 'Quadríceps']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Controle de valgo dinâmico'
        WHEN 'Agachamento Parede (Wall Sit)' THEN 'Ativar quadríceps em arco seguro'
        WHEN 'Step Down' THEN 'Realinhamento patelar dinâmico'
        WHEN 'Monster Walk (Caminhada Monster)' THEN 'Glúteo médio funcional'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Clamshell (Concha)',
    'Monster Walk (Caminhada Monster)',
    'Abdução de Quadril em Pé',
    'Agachamento Parede (Wall Sit)',
    'Step Down',
    'Step Up',
    'Leg Press 45°',
    'Sit-to-Stand',
    'Prancha Abdominal (Plank)',
    'Dead Bug',
    'Alongamento de Quadríceps em Pé',
    'Alongamento de Isquiotibiais em Pé',
    'Alongamento de Panturrilha na Parede'
)
WHERE t.name = 'Instabilidade Patelofemoral'
ON CONFLICT DO NOTHING;

-- ============================================================
-- DOR LOMBAR AGUDA (CIÁTICA/LUMBAR)
-- Referências: APTA, JOSPT Acute Low Back Pain Guidelines
-- ============================================================

INSERT INTO exercise_templates (name, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
    'Lombalgia Aguda',
    'Ortopedia',
    'Lombalgia Aguda',
    'Protocolo Conservador',
    'Educação sobre mecânica da dor e manter atividade dentro de limites de dor. Exercícios leves de mobilização e estabilização. Evitar repouso absoluto. William flexions para hérnias discais com preferência flexora.',
    'Exercícios que exacerbam dor irradiada. Exercícios de alta carga na fase aguda.',
    'Respeitar limites de dor. Parar se dor irradiada aumenta. Não forçar amplitude.',
    'Fase aguda: 1-2 semanas. Critérios: dor <3/10, mobilidade preservada, retorno às AVDs básicas.',
    'B',
    ARRAY['JOSPT Acute Low Back Pain Guidelines', 'APTA Stay Active for Low Back Pain', 'Williams Flexion Exercises Guidelines']
);

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 2
        WHEN '4 Apoios (Four Point kneeling)' THEN 3
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 4
        WHEN 'Ponte de Glúteo Bilateral' THEN 5
        WHEN 'Dead Bug' THEN 6
        WHEN 'Prancha Abdominal (Plank)' THEN 7
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 8
        WHEN 'Alongamento de Panturrilha na Parede' THEN 9
        WHEN 'SLR com Dorsiflexão Automática' THEN 10
        WHEN 'Mobilização de Nervo Ciático (Slump)' THEN 11
    END as order_index,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 3
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 2
        WHEN '4 Apoios (Four Point kneeling)' THEN 2
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 2
        WHEN 'Ponte de Glúteo Bilateral' THEN 2
        WHEN 'Dead Bug' THEN 2
        WHEN 'Prancha Abdominal (Plank)' THEN 2
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
        WHEN 'Alongamento de Panturrilha na Parede' THEN 2
        WHEN 'SLR com Dorsiflexão Automática' THEN 2
        WHEN 'Mobilização de Nervo Ciático (Slump)' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 10
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 10
        WHEN 'Ponte de Glúteo Bilateral' THEN 10
        WHEN 'Dead Bug' THEN 10
        WHEN 'Prancha Abdominal (Plank)' THEN 20
        WHEN '4 Apoios (Four Point kneeling)' THEN 10
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Prancha Abdominal (Plank)' THEN 20
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 10
        WHEN '4 Apoios (Four Point kneeling)' THEN 10
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
        WHEN 'Alongamento de Panturrilha na Parede' THEN 30
        WHEN 'SLR com Dorsiflexão Automática' THEN 30
        WHEN 'Mobilização de Nervo Ciático (Slump)' THEN 30
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Mobilização suave. Parar se peripheralizar.'
        WHEN 'SLR com Dorsiflexão Automática' THEN 'Se peripheralizar, PARAR imediatamente.'
        WHEN 'Mobilização de Nervo Ciático (Slump)' THEN 'Só se não houver sinal de Lasegue +.'
        WHEN 'Prancha Abdominal (Plank)' THEN 'Iniciar com joelhos apoiados se necessário.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Mobilização suave reduz rigidez e melhora nutrição discal.'
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 'Estabilização segmentar reduz micro-movimentos patológicos.'
        WHEN 'SLR com Dorsiflexão Automática' THEN 'Alongamento neural reduz aderências e melhora sintomatologia.'
        WHEN 'Dead Bug' THEN 'Core estabilizador reduz carga compressiva em coluna.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN ARRAY['Coluna Lombar', 'Multífido', 'Eretores']
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN ARRAY['Multífido', 'Transverso Abdômen', 'Core']
        WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais', 'Eretores Espinhais']
        WHEN 'Dead Bug' THEN ARRAY['Transverso Abdômen', 'Core', 'Lombar']
        WHEN 'Prancha Abdominal (Plank)' THEN ARRAY['Transverso Abdômen', 'Reto Abdominal', 'Core']
        WHEN 'SLR com Dorsiflexão Automática' THEN ARRAY['Isquiotibiais', 'Nervo Ciático']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Mobilização suave'
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 'Estabilização segmentar'
        WHEN 'Dead Bug' THEN 'Core estabilizador dinâmico'
        WHEN 'SLR com Dorsiflexão Automática' THEN 'Mobilização neural'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Gato-Vaca (Cat-Cow)',
    '4 Apoios (Four Point kneeling)',
    'Bird-dog (Cachorro e Pássaro)',
    'Ponte de Glúteo Bilateral',
    'Dead Bug',
    'Prancha Abdominal (Plank)',
    'Alongamento de Isquiotibiais em Pé',
    'Alongamento de Panturrilha na Parede',
    'SLR com Dorsiflexão Automática',
    'Mobilização de Nervo Ciático (Slump)'
)
WHERE t.name = 'Lombalgia Aguda'
ON CONFLICT DO NOTHING;

-- ============================================================
-- PÓS-OP MANGUITO ROTADOR - INICIAL (0-6 semanas)
-- Referências: MOON Shoulder Group, MGH Protocol
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Codman Pendular' THEN 2
        WHEN 'Mobilização de Ombro com Bastão' THEN 3
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 4
        WHEN 'Respiração Costal Inferior' THEN 5
        WHEN 'Alongamento de Rombóides na Parede' THEN 6
        WHEN 'Alongamento de Bíceps na Parede' THEN 7
        WHEN 'Mobilização de Nervo Mediano (Tinel e Phalen)' THEN 8
        WHEN '4 Apoios (Four Point kneeling)' THEN 9
        WHEN 'Ponte de Glúteo Bilateral' THEN 10
    END as order_index,
    CASE e.name
        WHEN 'Codman Pendular' THEN 3
        WHEN 'Mobilização de Ombro com Bastão' THEN 2
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 2
        WHEN 'Respiração Diafragmática' THEN 3
        WHEN 'Respiração Costal Inferior' THEN 3
        WHEN 'Alongamento de Rombóides na Parede' THEN 2
        WHEN 'Alongamento de Bíceps na Parede' THEN 2
        WHEN 'Mobilização de Nervo Mediano (Tinel e Phalen)' THEN 2
        WHEN '4 Apoios (Four Point kneeling)' THEN 2
        WHEN 'Ponte de Glúteo Bilateral' THEN 2
        ELSE NULL
    END as sets,
    NULL,
    CASE e.name
        WHEN 'Codman Pendular' THEN 180
        WHEN 'Mobilização de Ombro com Bastão' THEN 30
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 30
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Respiração Costal Inferior' THEN 10
        WHEN 'Alongamento de Rombóides na Parede' THEN 30
        WHEN 'Alongamento de Bíceps na Parede' THEN 30
        WHEN 'Mobilização de Nervo Mediano (Tinel e Phalen)' THEN 30
        WHEN '4 Apoios (Four Point kneeling)' THEN 10
        WHEN 'Ponte de Glúteo Bilateral' THEN 10
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Codman Pendular' THEN 'Cornerstone da reabilitação. Movimento suave, relaxado, gravidade assistida.'
        WHEN 'Mobilização de Ombro com Bastão' THEN 'Passivo-assistido apenas. Não contrair ombro.'
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Foco em ritmo escapuloumeral.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Codman Pendular' THEN 'Pendulares mantêm amplitude passiva sem estressar reparo. MOON guideline.'
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Ritmo escapuloumeral é pré-requisito para elevação ativa.'
        WHEN 'Respiração Costal Inferior' THEN 'Respiração diafragmática reduz tensão de cintura escapular.'
        WHEN '4 Apoios (Four Point kneeling)' THEN 'Core estabilizador protege coluna durante exercícios de MMSS.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Codman Pendular' THEN ARRAY['Ombro', 'Manguito Rotador']
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN ARRAY['Escápula', 'Serrátil Anterior', 'Trapézio', 'Rombóides']
        WHEN '4 Apoios (Four Point kneeling)' THEN ARRAY['Core', 'Multífido']
        WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais']
        WHEN 'Alongamento de Rombóides na Parede' THEN ARRAY['Rombóides', 'Trapézio Médio']
        WHEN 'Alongamento de Bíceps na Parede' THEN ARRAY['Bíceps', 'Antebraço']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Codman Pendular' THEN 'ADM passiva sem dor'
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Restaurar ritmo escapuloumeral'
        WHEN 'Mobilização de Ombro com Bastão' THEN 'ADM passivo-assistida'
        WHEN '4 Apoios (Four Point kneeling)' THEN 'Estabilizar core'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Codman Pendular',
    'Mobilização de Ombro com Bastão',
    'Mobilização de Escápula (Wall Slides)',
    'Respiração Costal Inferior',
    'Alongamento de Rombóides na Parede',
    'Alongamento de Bíceps na Parede',
    'Mobilização de Nervo Mediano (Tinel e Phalen)',
    '4 Apoios (Four Point kneeling)',
    'Ponte de Glúteo Bilateral'
)
WHERE t.name = 'Pós-Op Manguito Rotador - Inicial'
ON CONFLICT DO NOTHING;

-- ============================================================
-- PÓS-OP MANGUITO ROTADOR - AVANÇADO (6+ semanas)
-- Referências: Escamilla et al., HSS Guidelines
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Prancha Abdominal (Plank)' THEN 1
        WHEN 'Side Plank (Prancha Lateral)' THEN 2
        WHEN '4 Apoios (Four Point kneeling)' THEN 3
        WHEN 'Push-up Plus' THEN 4
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 5
        WHEN 'Rotação Externa de Ombro com Faixa' THEN 6
        WHEN 'Rotação Interna de Ombro com Faixa' THEN 7
        WHEN 'Elevação Frontal de Ombro' THEN 8
        WHEN 'Elevação Lateral de Ombro (0-90°)' THEN 9
        WHEN 'Extensão de Ombro em Pronação' THEN 10
        WHEN 'Prone Y-T-W' THEN 11
        WHEN 'Rowing com Faixa Elástica' THEN 12
        WHEN 'Face Pull' THEN 13
        WHEN 'Flexão de Cotovelo (Bicep Curl)' THEN 14
        WHEN 'Extensão de Cotovelo (Tricep)' THEN 15
    END as order_index,
    CASE e.name
        WHEN 'Rotação Externa de Ombro com Faixa' THEN 3
        WHEN 'Rotação Interna de Ombro com Faixa' THEN 3
        WHEN 'Elevação Frontal de Ombro' THEN 3
        WHEN 'Elevação Lateral de Ombro (0-90°)' THEN 3
        WHEN 'Extensão de Ombro em Pronação' THEN 3
        WHEN 'Prone Y-T-W' THEN 3
        WHEN 'Rowing com Faixa Elástica' THEN 3
        WHEN 'Face Pull' THEN 3
        WHEN 'Flexão de Cotovelo (Bicep Curl)' THEN 3
        WHEN 'Extensão de Cotovelo (Tricep)' THEN 3
        WHEN 'Prancha Abdominal (Plank)' THEN 3
        WHEN 'Side Plank (Prancha Lateral)' THEN 3
        WHEN '4 Apoios (Four Point kneeling)' THEN 2
        WHEN 'Push-up Plus' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Rotação Externa de Ombro com Faixa' THEN 15
        WHEN 'Rotação Interna de Ombro com Faixa' THEN 15
        WHEN 'Elevação Frontal de Ombro' THEN 10
        WHEN 'Elevação Lateral de Ombro (0-90°)' THEN 10
        WHEN 'Extensão de Ombro em Pronação' THEN 10
        WHEN 'Prone Y-T-W' THEN 10
        WHEN 'Rowing com Faixa Elástica' THEN 12
        WHEN 'Face Pull' THEN 12
        WHEN 'Flexão de Cotovelo (Bicep Curl)' THEN 12
        WHEN 'Extensão de Cotovelo (Tricep)' THEN 12
        WHEN 'Prancha Abdominal (Plank)' THEN 30
        WHEN 'Side Plank (Prancha Lateral)' THEN 30
        WHEN 'Push-up Plus' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Prancha Abdominal (Plank)' THEN 30
        WHEN 'Side Plank (Prancha Lateral)' THEN 30
        WHEN '4 Apoios (Four Point kneeling)' THEN 10
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Rotação Externa de Ombro com Faixa' THEN 'Cotovelo colado ao corpo. 0-45° rotação.'
        WHEN 'Elevação Lateral de Ombro (0-90°)' THEN 'Máximo 90°. Não forçar.'
        WHEN 'Prone Y-T-W' THEN 'Foco em serrátil anterior e rombóides.'
        WHEN 'Face Pull' THEN 'Essencial para ritmo escapuloumeral.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Rotação Externa de Ombro com Faixa' THEN 'Manguito rotador em 0° abdução é posição segura.'
        WHEN 'Elevação Lateral de Ombro (0-90°)' THEN 'Progressão até 90° antes de ir mais alto.'
        WHEN 'Rowing com Faixa Elástica' THEN 'Fortalecimento de escapulorespinghais é essencial.'
        WHEN 'Face Pull' THEN 'Exercício chave para disfunção de escápula.'
        WHEN 'Prone Y-T-W' THEN 'Serrátil anterior previne shrug compensatório.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Rotação Externa de Ombro com Faixa' THEN ARRAY['Manguito Rotador', 'Infraespinhoso']
        WHEN 'Rotação Interna de Ombro com Faixa' THEN ARRAY['Manguito Rotador', 'Subescapular']
        WHEN 'Elevação Lateral de Ombro (0-90°)' THEN ARRAY['Deltóide Médio', 'Manguito Rotador']
        WHEN 'Rowing com Faixa Elástica' THEN ARRAY['Rombóides', 'Trapézio Médio', 'Deltóide Posterior']
        WHEN 'Face Pull' THEN ARRAY['Rombóides', 'Trapézio Médio', 'Deltóide Posterior']
        WHEN 'Prone Y-T-W' THEN ARRAY['Serrátil Anterior', 'Rombóides', 'Trapézio']
        WHEN 'Prancha Abdominal (Plank)' THEN ARRAY['Core', 'Ombro']
        WHEN 'Side Plank (Prancha Lateral)' THEN ARRAY['Core', 'Ombro']
        WHEN 'Push-up Plus' THEN ARRAY['Serrátil Anterior', 'Peitoral Menor']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Rotação Externa de Ombro com Faixa' THEN 'Ativar manguito rotador'
        WHEN 'Rowing com Faixa Elástica' THEN 'Fortalecer escapulorespinghais'
        WHEN 'Face Pull' THEN 'Ritmo escapuloumeral'
        WHEN 'Prone Y-T-W' THEN 'Serrátil anterior'
        WHEN 'Push-up Plus' THEN 'Protração escapular'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Prancha Abdominal (Plank)',
    'Side Plank (Prancha Lateral)',
    '4 Apoios (Four Point kneeling)',
    'Push-up Plus',
    'Mobilização de Escápula (Wall Slides)',
    'Rotação Externa de Ombro com Faixa',
    'Rotação Interna de Ombro com Faixa',
    'Elevação Frontal de Ombro',
    'Elevação Lateral de Ombro (0-90°)',
    'Extensão de Ombro em Pronação',
    'Prone Y-T-W',
    'Rowing com Faixa Elástica',
    'Face Pull',
    'Flexão de Cotovelo (Bicep Curl)',
    'Extensão de Cotovelo (Tricep)'
)
WHERE t.name = 'Pós-Op Manguito Rotador - Avançado'
ON CONFLICT DO NOTHING;

-- ============================================================
-- LOMBALGIA CRÔNICA
-- Referências: NCBI/NIH, Slater et al., JOSPT Guidelines
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 2
        WHEN '4 Apoios (Four Point kneeling)' THEN 3
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 4
        WHEN 'Ponte de Glúteo Bilateral' THEN 5
        WHEN 'Ponte de Glúteo Unilateral' THEN 6
        WHEN 'Dead Bug' THEN 7
        WHEN 'Prancha Abdominal (Plank)' THEN 8
        WHEN 'Side Plank (Prancha Lateral)' THEN 9
        WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 10
        WHEN 'Mobilização de Quadril (Capsular)' THEN 11
        WHEN 'Alongamento de Psoas (Ilíaco)' THEN 12
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 13
        WHEN 'Alongamento de Panturrilha na Parede' THEN 14
    END as order_index,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 3
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 2
        WHEN '4 Apoios (Four Point kneeling)' THEN 2
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 3
        WHEN 'Ponte de Glúteo Bilateral' THEN 3
        WHEN 'Ponte de Glúteo Unilateral' THEN 3
        WHEN 'Dead Bug' THEN 3
        WHEN 'Prancha Abdominal (Plank)' THEN 3
        WHEN 'Side Plank (Prancha Lateral)' THEN 3
        WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 2
        WHEN 'Mobilização de Quadril (Capsular)' THEN 2
        WHEN 'Alongamento de Psoas (Ilíaco)' THEN 2
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
        WHEN 'Alongamento de Panturrilha na Parede' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 15
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 12
        WHEN 'Ponte de Glúteo Bilateral' THEN 12
        WHEN 'Ponte de Glúteo Unilateral' THEN 10
        WHEN 'Dead Bug' THEN 12
        WHEN 'Prancha Abdominal (Plank)' THEN 30
        WHEN 'Side Plank (Prancha Lateral)' THEN 30
        WHEN '4 Apoios (Four Point kneeling)' THEN 10
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Prancha Abdominal (Plank)' THEN 30
        WHEN 'Side Plank (Prancha Lateral)' THEN 30
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 10
        WHEN '4 Apoios (Four Point kneeling)' THEN 10
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 60
        WHEN 'Mobilização de Quadril (Capsular)' THEN 60
        WHEN 'Alongamento de Psoas (Ilíaco)' THEN 30
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
        WHEN 'Alongamento de Panturrilha na Parede' THEN 30
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Mobilização suave. Parar se peripheralizar.'
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 'Manter coluna neutra. Não hiperestender.'
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Progredir somente se estável bilateral.'
        WHEN 'Prancha Abdominal (Plank)' THEN 'Iniciar com joelhos apoiados se necessário.'
        WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 'Não rolar sobre lombar.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 'Estabilização segmentar reduz micro-movimentos patológicos. JOSPT 2017'
        WHEN 'Dead Bug' THEN 'Core estabilizador reduz carga compressiva em coluna.'
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Glúteos fortes reduzem carga em coluna lombar.'
        WHEN 'Mobilização de Psoas (Ilíaco)' THEN 'Psoas rígido aumenta lordose lombar.'
        WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 'Mobilidade torácica reduz compensação lombar.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN ARRAY['Coluna Lombar', 'Multífido', 'Eretores']
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN ARRAY['Multífido', 'Transverso Abdômen', 'Core']
        WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais', 'Eretores Espinhais']
        WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo', 'Core']
        WHEN 'Dead Bug' THEN ARRAY['Transverso Abdômen', 'Core', 'Lombar']
        WHEN 'Prancha Abdominal (Plank)' THEN ARRAY['Transverso Abdômen', 'Reto Abdominal', 'Core']
        WHEN 'Side Plank (Prancha Lateral)' THEN ARRAY['Oblíquos', 'Core', 'Quadrado Lombar']
        WHEN 'Mobilização de Psoas (Ilíaco)' THEN ARRAY['Psoas', 'Ilíaco']
        WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN ARRAY['Coluna Thorácica']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 'Estabilização segmentar'
        WHEN 'Dead Bug' THEN 'Core estabilizador dinâmico'
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Fortalecimento de glúteos'
        WHEN 'Mobilização de Psoas (Ilíaco)' THEN 'Alongar psoas rígido'
        WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 'Mobilidade torácica'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Gato-Vaca (Cat-Cow)',
    '4 Apoios (Four Point kneeling)',
    'Bird-dog (Cachorro e Pássaro)',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Dead Bug',
    'Prancha Abdominal (Plank)',
    'Side Plank (Prancha Lateral)',
    'Mobilização de Coluna Thorácica com Foam Roller',
    'Mobilização de Quadril (Capsular)',
    'Alongamento de Psoas (Ilíaco)',
    'Alongamento de Isquiotibiais em Pé',
    'Alongamento de Panturrilha na Parede'
)
WHERE t.name = 'Lombalgia Crônica'
ON CONFLICT DO NOTHING;

-- ============================================================
-- CERVICALGIA TENSIONAL
-- Referências: JOSPT 2017 Guidelines, MDPI 2019
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Respiração Costal Inferior' THEN 2
        WHEN 'Chin Tuck (Retração de Queixo)' THEN 3
        WHEN 'Alongamento de Rombóides na Parede' THEN 4
        WHEN 'Alongamento de Bíceps na Parede' THEN 5
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 6
        WHEN 'Rowing com Faixa Elástica' THEN 7
        WHEN 'Face Pull' THEN 8
        WHEN 'Prone Y-T-W' THEN 9
        WHEN '4 Apoios (Four Point kneeling)' THEN 10
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 11
    END as order_index,
    CASE e.name
        WHEN 'Chin Tuck (Retração de Queixo)' THEN 3
        WHEN 'Alongamento de Rombóides na Parede' THEN 2
        WHEN 'Alongamento de Bíceps na Parede' THEN 2
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 2
        WHEN 'Rowing com Faixa Elástica' THEN 3
        WHEN 'Face Pull' THEN 3
        WHEN 'Prone Y-T-W' THEN 3
        WHEN '4 Apoios (Four Point kneeling)' THEN 2
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 2
        WHEN 'Respiração Diafragmática' THEN 3
        WHEN 'Respiração Costal Inferior' THEN 3
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Chin Tuck (Retração de Queixo)' THEN 10
        WHEN 'Rowing com Faixa Elástica' THEN 12
        WHEN 'Face Pull' THEN 12
        WHEN 'Prone Y-T-W' THEN 10
        WHEN '4 Apoios (Four Point kneeling)' THEN 10
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 10
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Chin Tuck (Retração de Queixo)' THEN 10
        WHEN 'Alongamento de Rombóides na Parede' THEN 30
        WHEN 'Alongamento de Bíceps na Parede' THEN 30
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 30
        WHEN '4 Apoios (Four Point kneeling)' THEN 10
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 10
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Respiração Costal Inferior' THEN 10
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Chin Tuck (Retração de Queixo)' THEN 'Pressão língua no palato. Puxar queixo para trás.'
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Foco em protrusão de escápula.'
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Incluir mobilização cervical suave.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Chin Tuck (Retração de Queixo)' THEN 'Craniocervical flexion é exercício chave para cervicalgia. JOSPT 2017'
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Disfunção de escápula contribui para cervicalgia.'
        WHEN 'Alongamento de Rombóides na Parede' THEN 'Rombóides encurtados aumentam protusão cabeça.'
        WHEN 'Rowing com Faixa Elástica' THEN 'Escapulorespinghais fracos sobrecarga cervical.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Chin Tuck (Retração de Queixo)' THEN ARRAY['Longo do Pescoço', 'Reto Anterior da Cabeça']
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN ARRAY['Serrátil Anterior', 'Trapézio Inferior']
        WHEN 'Rowing com Faixa Elástica' THEN ARRAY['Rombóides', 'Trapézio Médio']
        WHEN 'Face Pull' THEN ARRAY['Rombóides', 'Trapézio Médio', 'Deltóide Posterior']
        WHEN 'Prone Y-T-W' THEN ARRAY['Serrátil Anterior', 'Rombóides']
        WHEN 'Alongamento de Rombóides na Parede' THEN ARRAY['Rombóides', 'Trapézio Médio']
        WHEN 'Alongamento de Bíceps na Parede' THEN ARRAY['Bíceps']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Chin Tuck (Retração de Queixo)' THEN 'Fortalecer flexores profundos'
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Restaurar ritmo escapuloumeral'
        WHEN 'Rowing com Faixa Elástica' THEN 'Fortalecer escapulorespinghais'
        WHEN 'Alongamento de Rombóides na Parede' THEN 'Alongar cadeia posterior'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Respiração Costal Inferior',
    'Chin Tuck (Retração de Queixo)',
    'Alongamento de Rombóides na Parede',
    'Alongamento de Bíceps na Parede',
    'Mobilização de Escápula (Wall Slides)',
    'Rowing com Faixa Elástica',
    'Face Pull',
    'Prone Y-T-W',
    '4 Apoios (Four Point kneeling)',
    'Gato-Vaca (Cat-Cow)'
)
WHERE t.name = 'Cervicalgia Tencional'
ON CONFLICT DO NOTHING;

-- ============================================================
-- HÉRNIA DE DISCO LOMBAR (MÉTODO MCKENZIE)
-- Referências: NCBI StatPearls, Slater et al., Biomechanical Analysis 2025
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN '4 Apoios (Four Point kneeling)' THEN 2
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 3
        WHEN 'Ponte de Glúteo Bilateral' THEN 4
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 5
        WHEN 'Dead Bug' THEN 6
        WHEN 'Mobilização de Nervo Ciático (Slump)' THEN 7
        WHEN 'SLR com Dorsiflexão Automática' THEN 8
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 9
        WHEN 'Alongamento de Panturrilha na Parede' THEN 10
        WHEN 'Alongamento de Psoas (Ilíaco)' THEN 11
    END as order_index,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 3
        WHEN '4 Apoios (Four Point kneeling)' THEN 2
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 2
        WHEN 'Ponte de Glúteo Bilateral' THEN 2
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 2
        WHEN 'Dead Bug' THEN 2
        WHEN 'Mobilização de Nervo Ciático (Slump)' THEN 2
        WHEN 'SLR com Dorsiflexão Automática' THEN 2
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
        WHEN 'Alongamento de Panturrilha na Parede' THEN 2
        WHEN 'Alongamento de Psoas (Ilíaco)' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 10
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 10
        WHEN 'Ponte de Glúteo Bilateral' THEN 10
        WHEN 'Dead Bug' THEN 10
        WHEN '4 Apoios (Four Point kneeling)' THEN 10
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 10
        WHEN '4 Apoios (Four Point kneeling)' THEN 10
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Mobilização de Nervo Ciático (Slump)' THEN 30
        WHEN 'SLR com Dorsiflexão Automática' THEN 30
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
        WHEN 'Alongamento de Panturrilha na Parede' THEN 30
        WHEN 'Alongamento de Psoas (Ilíaco)' THEN 30
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Priorizar EXTENSÃO (agachar coluna). Monitorar resposta.'
        WHEN 'SLR com Dorsiflexão Automática' THEN 'Se peripheralizar, PARAR imediatamente.'
        WHEN 'Mobilização de Nervo Ciático (Slump)' THEN 'Só se não houver sinal de Lasegue +.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Extensão de coluna é cornerstone do McKenzie para respondedores.'
        WHEN 'Ponte de Glúteo Bilateral' THEN 'Extensão de quadril reduz carga lombar (princípio McKenzie).'
        WHEN 'SLR com Dorsiflexão Automática' THEN 'Alongamento neural reduz tensão em raízes.'
        WHEN 'Dead Bug' THEN 'Core estabilizador complementa extensões de McKenzie.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN ARRAY['Coluna Lombar', 'Multífido', 'Eretores']
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN ARRAY['Multífido', 'Transverso Abdômen', 'Core']
        WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais', 'Eretores']
        WHEN 'Dead Bug' THEN ARRAY['Transverso Abdômen', 'Core', 'Lombar']
        WHEN 'SLR com Dorsiflexão Automática' THEN ARRAY['Isquiotibiais', 'Nervo Ciático']
        WHEN 'Alongamento de Psoas (Ilíaco)' THEN ARRAY['Psoas', 'Ilíaco']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Extensão McKenzie (responder)'
        WHEN 'Ponte de Glúteo Bilateral' THEN 'Extensão de quadril'
        WHEN 'Dead Bug' THEN 'Core estabilizador'
        WHEN 'SLR com Dorsiflexão Automática' THEN 'Mobilização neural'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    '4 Apoios (Four Point kneeling)',
    'Gato-Vaca (Cat-Cow)',
    'Ponte de Glúteo Bilateral',
    'Bird-dog (Cachorro e Pássaro)',
    'Dead Bug',
    'Mobilização de Nervo Ciático (Slump)',
    'SLR com Dorsiflexão Automática',
    'Alongamento de Isquiotibiais em Pé',
    'Alongamento de Panturrilha na Parede',
    'Alongamento de Psoas (Ilíaco)'
)
WHERE t.name = 'Hérnia de Disco Lombar'
ON CONFLICT DO NOTHING;

-- ============================================================
-- ENTORSE DE TORNOZELO - FASE AGUDA
-- Referências: MGH Guidelines, PMC 2017, Evidence-based treatment 2012
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Mobilização de Tornozelo em DF' THEN 2
        WHEN 'Elevação de Panturrilha Sentado' THEN 3
        WHEN 'Alongamento de Panturrilha na Parede' THEN 4
        WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 5
        WHEN 'Sit-to-Stand' THEN 6
        WHEN 'Agachamento com Suporte' THEN 7
    END as order_index,
    CASE e.name
        WHEN 'Mobilização de Tornozelo em DF' THEN 2
        WHEN 'Elevação de Panturrilha Sentado' THEN 2
        WHEN 'Alongamento de Panturrilha na Parede' THEN 2
        WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 2
        WHEN 'Sit-to-Stand' THEN 2
        WHEN 'Agachamento com Suporte' THEN 2
        WHEN 'Respiração Diafragmática' THEN 3
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Sit-to-Stand' THEN 10
        WHEN 'Agachamento com Suporte' THEN 10
        WHEN 'Mobilização de Tornozelo em DF' THEN 10
        WHEN 'Elevação de Panturrilha Sentado' THEN 15
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Mobilização de Tornozelo em DF' THEN 30
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Alongamento de Panturrilha na Parede' THEN 30
        WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 30
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Mobilização de Tornozelo em DF' THEN 'Dorsiflexão suave. Não forçar.'
        WHEN 'Sit-to-Stand' THEN 'Usar cadeira alta. Descarga parcial conforme tolerado.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Mobilização de Tornozelo em DF' THEN 'Mobilização precoce previne contratura e acelera recuperação.'
        WHEN 'Elevação de Panturrilha Sentado' THEN 'Sóleo isométrico sem estressar tornozelo.'
        WHEN 'Alongamento de Panturrilha na Parede' THEN 'Gastrocnêmio rígido aumenta risco de recidiva.'
        WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 'Sóleo frequentemente negligenciado.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Mobilização de Tornozelo em DF' THEN ARRAY['Tornozelo', 'Tibial Anterior']
        WHEN 'Elevação de Panturrilha Sentado' THEN ARRAY['Sóleo']
        WHEN 'Alongamento de Panturrilha na Parede' THEN ARRAY['Gastrocnêmio']
        WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN ARRAY['Sóleo']
        WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos']
        WHEN 'Agachamento com Suporte' THEN ARRAY['Quadríceps', 'Glúteos']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Mobilização de Tornozelo em DF' THEN 'Prevenir contratura'
        WHEN 'Elevação de Panturrilha Sentado' THEN 'Ativar sóleo'
        WHEN 'Alongamento de Panturrilha na Parede' THEN 'Alongar gastrocnêmio'
        WHEN 'Sit-to-Stand' THEN 'Descarga progressiva'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Mobilização de Tornozelo em DF',
    'Elevação de Panturrilha Sentado',
    'Alongamento de Panturrilha na Parede',
    'Alongamento de Panturrilha Sentado (Sóleo)',
    'Sit-to-Stand',
    'Agachamento com Suporte'
)
WHERE t.name = 'Entorse de Tornozelo - Fase Aguda'
ON CONFLICT DO NOTHING;

-- ============================================================
-- ENTORSE DE TORNOZELO - FORTALECIMENTO
-- Referências: PMC5737043, Sanford Health, JOSPT 2021
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Elevação de Panturrilha em Pé' THEN 2
        WHEN 'Elevação de Panturrilha Sentado' THEN 3
        WHEN 'Equilíbrio Unipodal Solo' THEN 4
        WHEN 'Single Leg Stance com Movimento de Braço' THEN 5
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 6
        WHEN 'Agachamento com Suporte' THEN 7
        WHEN 'Step Up' THEN 8
        WHEN 'Step Down' THEN 9
        WHEN 'Sit-to-Stand' THEN 10
        WHEN 'BOSU Ball Squat' THEN 11
        WHEN 'Equilíbrio em Disco Instável' THEN 12
    END as order_index,
    CASE e.name
        WHEN 'Elevação de Panturrilha em Pé' THEN 3
        WHEN 'Elevação de Panturrilha Sentado' THEN 2
        WHEN 'Equilíbrio Unipodal Solo' THEN 3
        WHEN 'Single Leg Stance com Movimento de Braço' THEN 3
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 3
        WHEN 'Agachamento com Suporte' THEN 3
        WHEN 'Step Up' THEN 3
        WHEN 'Step Down' THEN 3
        WHEN 'Sit-to-Stand' THEN 2
        WHEN 'BOSU Ball Squat' THEN 3
        WHEN 'Equilíbrio em Disco Instável' THEN 3
        WHEN 'Respiração Diafragmática' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Elevação de Panturrilha em Pé' THEN 20
        WHEN 'Elevação de Panturrilha Sentado' THEN 15
        WHEN 'Agachamento com Suporte' THEN 15
        WHEN 'Step Up' THEN 15
        WHEN 'Step Down' THEN 15
        WHEN 'Sit-to-Stand' THEN 15
        WHEN 'BOSU Ball Squat' THEN 10
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Equilíbrio Unipodal Solo' THEN 45
        WHEN 'Single Leg Stance com Movimento de Braço' THEN 60
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 60
        WHEN 'BOSU Ball Squat' THEN 30
        WHEN 'Equilíbrio em Disco Instável' THEN 45
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Equilíbrio Unipodal Solo' THEN 'Progredir para olhos fechados.'
        WHEN 'Step Down' THEN 'Monitorar valgo de joelho.'
        WHEN 'BOSU Ball Squat' THEN 'Superfície instável propriocepção.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Elevação de Panturrilha em Pé' THEN 'Fortalecimento de panturrilha é essencial para estabilidade.'
        WHEN 'Equilíbrio Unipodal Solo' THEN 'Propriocepção é KEY para prevenir recidivas. PMC5737043'
        WHEN 'Single Leg Stance com Movimento de Braço' THEN 'Propriocepção avançada com dual-task.'
        WHEN 'BOSU Ball Squat' THEN 'Treino em superfície instável reduz recidivas em 35%.'
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 'Treino funcional de equilíbrio.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Elevação de Panturrilha em Pé' THEN ARRAY['Gastrocnêmio', 'Sóleo']
        WHEN 'Elevação de Panturrilha Sentado' THEN ARRAY['Sóleo']
        WHEN 'Equilíbrio Unipodal Solo' THEN ARRAY['Tornozelo', 'Core', 'MMII']
        WHEN 'Single Leg Stance com Movimento de Braço' THEN ARRAY['Core', 'Tornozelo', 'Proprioceptores']
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN ARRAY['Tornozelo', 'Core', 'MMII']
        WHEN 'BOSU Ball Squat' THEN ARRAY['Joelho', 'Tornozelo', 'Core', 'Proprioceptores']
        WHEN 'Equilíbrio em Disco Instável' THEN ARRAY['Tornozelo', 'Proprioceptores', 'MMII']
        WHEN 'Step Down' THEN ARRAY['Quadríceps', 'Glúteo Médio', 'Core']
        WHEN 'Step Up' THEN ARRAY['Quadríceps', 'Glúteos', 'Isquiotibiais']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Elevação de Panturrilha em Pé' THEN 'Fortalecer panturrilha'
        WHEN 'Equilíbrio Unipodal Solo' THEN 'Propriocepção básica'
        WHEN 'Single Leg Stance com Movimento de Braço' THEN 'Propriocepção avançada'
        WHEN 'BOSU Ball Squat' THEN 'Propriocepção em instabilidade'
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 'Equilíbrio funcional'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Elevação de Panturrilha em Pé',
    'Elevação de Panturrilha Sentado',
    'Equilíbrio Unipodal Solo',
    'Single Leg Stance com Movimento de Braço',
    'Tandem Walk (Caminhada em Tandem)',
    'Agachamento com Suporte',
    'Step Up',
    'Step Down',
    'Sit-to-Stand',
    'BOSU Ball Squat',
    'Equilíbrio em Disco Instável'
)
WHERE t.name = 'Entorse de Tornozelo - Fortalecimento'
ON CONFLICT DO NOTHING;

-- ============================================================
-- FASCITE PLANTAR
-- Referências: PMC 2024, Heel Pain Revision 2023, RACGP 2021
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Alongamento de Panturrilha na Parede' THEN 2
        WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 3
        WHEN 'Elevação de Panturrilha em Pé' THEN 4
        WHEN 'Elevação de Panturrilha Sentado' THEN 5
        WHEN 'Agachamento com Suporte' THEN 6
        WHEN 'Sit-to-Stand' THEN 7
        WHEN 'Mobilização de Tornozelo em DF' THEN 8
    END as order_index,
    CASE e.name
        WHEN 'Alongamento de Panturrilha na Parede' THEN 3
        WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 3
        WHEN 'Elevação de Panturrilha em Pé' THEN 2
        WHEN 'Elevação de Panturrilha Sentado' THEN 2
        WHEN 'Agachamento com Suporte' THEN 2
        WHEN 'Sit-to-Stand' THEN 2
        WHEN 'Mobilização de Tornozelo em DF' THEN 2
        WHEN 'Respiração Diafragmática' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Elevação de Panturrilha em Pé' THEN 15
        WHEN 'Elevação de Panturrilha Sentado' THEN 15
        WHEN 'Agachamento com Suporte' THEN 10
        WHEN 'Sit-to-Stand' THEN 10
        WHEN 'Mobilização de Tornozelo em DF' THEN 10
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Alongamento de Panturrilha na Parede' THEN 30
        WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 30
        WHEN 'Mobilização de Tornozelo em DF' THEN 30
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Alongamento de Panturrilha na Parede' THEN 'Alongar 3x ao dia, especialmente pela manhã.'
        WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 'Sóleo é essencial. Não negligenciar.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Alongamento de Panturrilha na Parede' THEN 'Alongamento de panturrilha 10 min/dia é cornerstone. RACGP 2021'
        WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 'Sóleo rígido contribui significativamente para fascite.'
        WHEN 'Mobilização de Tornozelo em DF' THEN 'DF limitada aumenta tensão na fáscia.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Alongamento de Panturrilha na Parede' THEN ARRAY['Gastrocnêmio', 'Fáscia Plantar']
        WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN ARRAY['Sóleo', 'Fáscia Plantar']
        WHEN 'Elevação de Panturrilha em Pé' THEN ARRAY['Gastrocnêmio', 'Sóleo']
        WHEN 'Elevação de Panturrilha Sentado' THEN ARRAY['Sóleo']
        WHEN 'Mobilização de Tornozelo em DF' THEN ARRAY['Tornozelo', 'Tendão de Aquiles']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Alongamento de Panturrilha na Parede' THEN 'Alongar gastrocnêmio'
        WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 'Alongar sóleo'
        WHEN 'Mobilização de Tornozelo em DF' THEN 'Melhorar dorsiflexão'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Alongamento de Panturrilha na Parede',
    'Alongamento de Panturrilha Sentado (Sóleo)',
    'Elevação de Panturrilha em Pé',
    'Elevação de Panturrilha Sentado',
    'Agachamento com Suporte',
    'Sit-to-Stand',
    'Mobilização de Tornozelo em DF'
)
WHERE t.name = 'Fascite Plantar'
ON CONFLICT DO NOTHING;

-- ============================================================
-- TENDINOPATIA PATELAR (PROTOCOLO EXCÊNTRICO)
-- Referências: Physio-pedia, JOSPT 2014, BJSM 2023
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Agachamento Parede (Wall Sit)' THEN 2
        WHEN 'Leg Press 45°' THEN 3
        WHEN 'Ponte de Glúteo Bilateral' THEN 4
        WHEN 'Ponte de Glúteo Unilateral' THEN 5
        WHEN 'Step Down' THEN 6
        WHEN 'Step Up' THEN 7
        WHEN 'Elevação de Panturrilha em Pé' THEN 8
        WHEN 'Alongamento de Quadríceps em Pé' THEN 9
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 10
    END as order_index,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 3
        WHEN 'Leg Press 45°' THEN 3
        WHEN 'Ponte de Glúteo Bilateral' THEN 3
        WHEN 'Ponte de Glúteo Unilateral' THEN 3
        WHEN 'Step Down' THEN 4
        WHEN 'Step Up' THEN 3
        WHEN 'Elevação de Panturrilha em Pé' THEN 3
        WHEN 'Alongamento de Quadríceps em Pé' THEN 2
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
        WHEN 'Respiração Diafragmática' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 45
        WHEN 'Leg Press 45°' THEN 15
        WHEN 'Ponte de Glúteo Bilateral' THEN 10
        WHEN 'Ponte de Glúteo Unilateral' THEN 10
        WHEN 'Step Down' THEN 15
        WHEN 'Step Up' THEN 15
        WHEN 'Elevação de Panturrilha em Pé' THEN 20
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 30
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Alongamento de Quadríceps em Pé' THEN 30
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 'Dor leve (3-5/10) é esperada e necessária.'
        WHEN 'Step Down' THEN 'Excêntrico lento (3-5s). Concentrico pode ser assistido.'
        WHEN 'Leg Press 45°' THEN 'Arco seguro. Dor moderada aceitável.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 'Isometria excêntrica é gold standard. Decline squats idealmente.'
        WHEN 'Step Down' THEN 'Excêntrico lento estimula adaptação tendínea.'
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Glúteo médio reduz valgo que estressa patela.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN ARRAY['Quadríceps', 'Vasto Medial', 'Patela']
        WHEN 'Leg Press 45°' THEN ARRAY['Quadríceps', 'Glúteos']
        WHEN 'Step Down' THEN ARRAY['Quadríceps', 'Patela', 'Glúteo Médio']
        WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo']
        WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais']
        WHEN 'Elevação de Panturrilha em Pé' THEN ARRAY['Gastrocnêmio', 'Sóleo']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 'Excêntrico isométrico'
        WHEN 'Step Down' THEN 'Excêntrico funcional'
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Controle de valgo'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Agachamento Parede (Wall Sit)',
    'Leg Press 45°',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Step Down',
    'Step Up',
    'Elevação de Panturrilha em Pé',
    'Alongamento de Quadríceps em Pé',
    'Alongamento de Isquiotibiais em Pé'
)
WHERE t.name = 'Tendinopatia Patelar'
ON CONFLICT DO NOTHING;

-- ============================================================
-- BURSITE TROCANTÉRICA
-- Referências: E3 Rehab, Dr Jeffrey Peng, MyHealth Alberta
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN '4 Apoios (Four Point kneeling)' THEN 2
        WHEN 'Ponte de Glúteo Bilateral' THEN 3
        WHEN 'Ponte de Glúteo Unilateral' THEN 4
        WHEN 'Clamshell (Concha)' THEN 5
        WHEN 'Abdução de Quadril em Pé' THEN 6
        WHEN 'Monster Walk (Caminhada Monster)' THEN 7
        WHEN 'Agachamento com Suporte' THEN 8
        WHEN 'Sit-to-Stand' THEN 9
        WHEN 'Alongamento de Glúteo Supino' THEN 10
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 11
    END as order_index,
    CASE e.name
        WHEN '4 Apoios (Four Point kneeling)' THEN 2
        WHEN 'Ponte de Glúteo Bilateral' THEN 3
        WHEN 'Ponte de Glúteo Unilateral' THEN 3
        WHEN 'Clamshell (Concha)' THEN 3
        WHEN 'Abdução de Quadril em Pé' THEN 3
        WHEN 'Monster Walk (Caminhada Monster)' THEN 3
        WHEN 'Agachamento com Suporte' THEN 2
        WHEN 'Sit-to-Stand' THEN 2
        WHEN 'Alongamento de Glúteo Supino' THEN 2
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
        WHEN 'Respiração Diafragmática' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Ponte de Glúteo Bilateral' THEN 10
        WHEN 'Ponte de Glúteo Unilateral' THEN 10
        WHEN 'Clamshell (Concha)' THEN 15
        WHEN 'Monster Walk (Caminhada Monster)' THEN 20
        WHEN 'Abdução de Quadril em Pé' THEN 15
        WHEN 'Agachamento com Suporte' THEN 10
        WHEN 'Sit-to-Stand' THEN 10
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN '4 Apoios (Four Point kneeling)' THEN 10
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Alongamento de Glúteo Supino' THEN 30
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Clamshell (Concha)' THEN 'Não rotatorizar pelve. Movimento isolado de quadril.'
        WHEN 'Abdução de Quadril em Pé' THEN 'Evitar shrug de quadril compensatório.'
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Manter pelve nivelada.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Glúteo médio é essencial para reduzir compressão trocantérica.'
        WHEN 'Clamshell (Concha)' THEN 'Glúteo médio isolado é cornerstone.'
        WHEN 'Monster Walk (Caminhada Monster)' THEN 'Abdutores funcionais em padrão de marcha.'
        WHEN 'Abdução de Quadril em Pé' THEN 'Evitar TFL compensando. Foco em glúteo médio.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo']
        WHEN 'Clamshell (Concha)' THEN ARRAY['Glúteo Médio']
        WHEN 'Monster Walk (Caminhada Monster)' THEN ARRAY['Glúteos', 'Tensor Fascia Lata']
        WHEN 'Abdução de Quadril em Pé' THEN ARRAY['Glúteo Médio']
        WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais']
        WHEN '4 Apoios (Four Point kneeling)' THEN ARRAY['Core']
        WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos', 'Core']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Estabilizar quadril'
        WHEN 'Clamshell (Concha)' THEN 'Glúteo médio isolado'
        WHEN 'Monster Walk (Caminhada Monster)' THEN 'Abdutores funcionais'
        WHEN 'Abdução de Quadril em Pé' THEN 'Abdução de quadril'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    '4 Apoios (Four Point kneeling)',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Clamshell (Concha)',
    'Abdução de Quadril em Pé',
    'Monster Walk (Caminhada Monster)',
    'Agachamento com Suporte',
    'Sit-to-Stand',
    'Alongamento de Glúteo Supino',
    'Alongamento de Isquiotibiais em Pé'
)
WHERE t.name = 'Bursite Trocantérica'
ON CONFLICT DO NOTHING;

-- ============================================================
-- REABILITAÇÃO AVE - MEMBRO SUPERIOR
-- Referências: Physio-pedia, Cochrane CIMT, Neuroplasticity principles
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Codman Pendular' THEN 2
        WHEN 'Mobilização de Ombro com Bastão' THEN 3
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 4
        WHEN 'Rotação Externa de Ombro com Faixa' THEN 5
        WHEN 'Rotação Interna de Ombro com Faixa' THEN 6
        WHEN 'Elevação Frontal de Ombro' THEN 7
        WHEN 'Elevação Lateral de Ombro (0-90°)' THEN 8
        WHEN 'Flexão de Cotovelo (Bicep Curl)' THEN 9
        WHEN 'Extensão de Cotovelo (Tricep)' THEN 10
        WHEN 'Flexão de Punho' THEN 11
        WHEN 'Extensão de Punho' THEN 12
        WHEN 'Squeeze de Bola (Espalmar)' THEN 13
        WHEN 'Extensão de Dedos' THEN 14
        WHEN 'Coordenação Digital (Dedos)' THEN 15
        WHEN 'Coordenação Óculo-Manual' THEN 16
    END as order_index,
    CASE e.name
        WHEN 'Codman Pendular' THEN 2
        WHEN 'Mobilização de Ombro com Bastão' THEN 2
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 2
        WHEN 'Rotação Externa de Ombro com Faixa' THEN 2
        WHEN 'Rotação Interna de Ombro com Faixa' THEN 2
        WHEN 'Elevação Frontal de Ombro' THEN 2
        WHEN 'Elevação Lateral de Ombro (0-90°)' THEN 2
        WHEN 'Flexão de Cotovelo (Bicep Curl)' THEN 2
        WHEN 'Extensão de Cotovelo (Tricep)' THEN 2
        WHEN 'Flexão de Punho' THEN 2
        WHEN 'Extensão de Punho' THEN 2
        WHEN 'Squeeze de Bola (Espalmar)' THEN 2
        WHEN 'Extensão de Dedos' THEN 2
        WHEN 'Coordenação Digital (Dedos)' THEN 2
        WHEN 'Coordenação Óculo-Manual' THEN 2
        WHEN 'Respiração Diafragmática' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Codman Pendular' THEN 60
        WHEN 'Mobilização de Ombro com Bastão' THEN 10
        WHEN 'Rotação Externa de Ombro com Faixa' THEN 10
        WHEN 'Rotação Interna de Ombro com Faixa' THEN 10
        WHEN 'Elevação Frontal de Ombro' THEN 10
        WHEN 'Elevação Lateral de Ombro (0-90°)' THEN 10
        WHEN 'Flexão de Cotovelo (Bicep Curl)' THEN 10
        WHEN 'Extensão de Cotovelo (Tricep)' THEN 10
        WHEN 'Flexão de Punho' THEN 10
        WHEN 'Extensão de Punho' THEN 10
        WHEN 'Squeeze de Bola (Espalmar)' THEN 10
        WHEN 'Extensão de Dedos' THEN 10
        WHEN 'Coordenação Digital (Dedos)' THEN 10
        WHEN 'Coordenação Óculo-Manual' THEN 5
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Codman Pendular' THEN 120
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Coordenação Óculo-Manual' THEN 60
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Codman Pendular' THEN 'Passivo-assistido. Movimento suave.'
        WHEN 'Mobilização de Ombro com Bastão' THEN 'Ativo-assistido conforme capacidade.'
        WHEN 'Flexão de Punho' THEN 'Ativo ou assistido conforme tônus.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Codman Pendular' THEN 'Pendulares previnem subluxação de ombro em hemiplegia.'
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Ritmo escapuloumeral é pré-requisito para função.'
        WHEN 'Squeeze de Bola (Espalmar)' THEN 'Preensão é essencial para AVDs.'
        WHEN 'Coordenação Digital (Dedos)' THEN 'Destreza digital importante para função manual.'
        WHEN 'Coordenação Óculo-Manual' THEN 'Coordenação óculo-manual é base para função.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Codman Pendular' THEN ARRAY['Ombro', 'Manguito Rotador']
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN ARRAY['Escápula', 'Serrátil Anterior']
        WHEN 'Rotação Externa de Ombro com Faixa' THEN ARRAY['Manguito Rotador']
        WHEN 'Flexão de Cotovelo (Bicep Curl)' THEN ARRAY['Bíceps', 'Braquial']
        WHEN 'Extensão de Cotovelo (Tricep)' THEN ARRAY['Tríceps']
        WHEN 'Flexão de Punho' THEN ARRAY['Flexores de Punho']
        WHEN 'Extensão de Punho' THEN ARRAY['Extensores de Punho']
        WHEN 'Squeeze de Bola (Espalmar)' THEN ARRAY['Mãos', 'Dedos']
        WHEN 'Coordenação Digital (Dedos)' THEN ARRAY['Dedos', 'Mãos']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Codman Pendular' THEN 'ADM passiva de ombro'
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Ritmo escapuloumeral'
        WHEN 'Squeeze de Bola (Espalmar)' THEN 'Preensão'
        WHEN 'Coordenação Digital (Dedos)' THEN 'Destreza manual'
        WHEN 'Coordenação Óculo-Manual' THEN 'Coordenação óculo-manual'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Codman Pendular',
    'Mobilização de Ombro com Bastão',
    'Mobilização de Escápula (Wall Slides)',
    'Rotação Externa de Ombro com Faixa',
    'Rotação Interna de Ombro com Faixa',
    'Elevação Frontal de Ombro',
    'Elevação Lateral de Ombro (0-90°)',
    'Flexão de Cotovelo (Bicep Curl)',
    'Extensão de Cotovelo (Tricep)',
    'Flexão de Punho',
    'Extensão de Punho',
    'Squeeze de Bola (Espalmar)',
    'Extensão de Dedos',
    'Coordenação Digital (Dedos)',
    'Coordenação Óculo-Manual'
)
WHERE t.name = 'Reabilitação AVE - Membro Superior'
ON CONFLICT DO NOTHING;

-- ============================================================
-- REABILITAÇÃO AVE - MARCHA
-- Referências: Physio-pedia, Task-specific training, BWSTT evidence
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN '4 Apoios (Four Point kneeling)' THEN 2
        WHEN 'Ponte de Glúteo Bilateral' THEN 3
        WHEN 'Ponte de Glúteo Unilateral' THEN 4
        WHEN 'Sit-to-Stand' THEN 5
        WHEN 'Agachamento com Suporte' THEN 6
        WHEN 'Step Up' THEN 7
        WHEN 'Step Down' THEN 8
        WHEN 'Equilíbrio Unipodal Solo' THEN 9
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 10
        WHEN 'Gait Training com Obstáculos' THEN 11
        WHEN 'Descida de Escada' THEN 12
        WHEN 'Subida de Escada' THEN 13
        WHEN 'Marcha com Padrões Cruzados' THEN 14
    END as order_index,
    CASE e.name
        WHEN '4 Apoios (Four Point kneeling)' THEN 2
        WHEN 'Ponte de Glúteo Bilateral' THEN 2
        WHEN 'Ponte de Glúteo Unilateral' THEN 2
        WHEN 'Sit-to-Stand' THEN 3
        WHEN 'Agachamento com Suporte' THEN 2
        WHEN 'Step Up' THEN 2
        WHEN 'Step Down' THEN 2
        WHEN 'Equilíbrio Unipodal Solo' THEN 3
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 3
        WHEN 'Gait Training com Obstáculos' THEN 2
        WHEN 'Descida de Escada' THEN 2
        WHEN 'Subida de Escada' THEN 2
        WHEN 'Marcha com Padrões Cruzados' THEN 2
        WHEN 'Respiração Diafragmática' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Ponte de Glúteo Bilateral' THEN 10
        WHEN 'Ponte de Glúteo Unilateral' THEN 8
        WHEN 'Sit-to-Stand' THEN 10
        WHEN 'Agachamento com Suporte' THEN 10
        WHEN 'Step Up' THEN 10
        WHEN 'Step Down' THEN 10
        WHEN 'Gait Training com Obstáculos' THEN 5
        WHEN 'Descida de Escada' THEN 5
        WHEN 'Subida de Escada' THEN 5
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Equilíbrio Unipodal Solo' THEN 30
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 60
        WHEN 'Gait Training com Obstáculos' THEN 10
        WHEN 'Descida de Escada' THEN 5
        WHEN 'Subida de Escada' THEN 5
        WHEN 'Marcha com Padrões Cruzados' THEN 60
        WHEN '4 Apoios (Four Point kneeling)' THEN 10
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Sit-to-Stand' THEN 'Supervisão constante. Usar cadeira alta.'
        WHEN 'Gait Training com Obstáculos' THEN 'Supervisão estrita. Adaptações conforme necessidade.'
        WHEN 'Marcha com Padrões Cruzados' THEN 'Estimular padrão cruzado normal.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Sit-to-Stand' THEN 'Transferência é AVD crítica para independência.'
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Glúteos essenciais para estabilidade de marcha.'
        WHEN 'Gait Training com Obstáculos' THEN 'Treino específico de tarefa é evidenciado para AVE.'
        WHEN 'Marcha com Padrões Cruzados' THEN 'Padrão cruzado é normal da marcha humana.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais']
        WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo']
        WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos', 'Core']
        WHEN 'Equilíbrio Unipodal Solo' THEN ARRAY['Tornozelo', 'Core', 'MMII']
        WHEN 'Gait Training com Obstáculos' THEN ARRAY['MMII', 'Core', 'Marcha']
        WHEN 'Marcha com Padrões Cruzados' THEN ARRAY['MMII', 'Core', 'Marcha']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Sit-to-Stand' THEN 'Transferências'
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Estabilidade de quadril'
        WHEN 'Gait Training com Obstáculos' THEN 'Treino específico de marcha'
        WHEN 'Marcha com Padrões Cruzados' THEN 'Padrão de marcha normal'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    '4 Apoios (Four Point kneeling)',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Sit-to-Stand',
    'Agachamento com Suporte',
    'Step Up',
    'Step Down',
    'Equilíbrio Unipodal Solo',
    'Tandem Walk (Caminhada em Tandem)',
    'Gait Training com Obstáculos',
    'Descida de Escada',
    'Subida de Escada',
    'Marcha com Padrões Cruzados'
)
WHERE t.name = 'Reabilitação AVE - Marcha'
ON CONFLICT DO NOTHING;

-- ============================================================
-- PARKINSON - MOBILIDADE
-- Referências: Physio-pedia, Exercise intensity, Dance/Boxing programs
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Respiração 4-7-8' THEN 2
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 3
        WHEN '4 Apoios (Four Point kneeling)' THEN 4
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 5
        WHEN 'Ponte de Glúteo Bilateral' THEN 6
        WHEN 'Agachamento com Suporte' THEN 7
        WHEN 'Sit-to-Stand' THEN 8
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 9
        WHEN 'Gait Training com Obstáculos' THEN 10
        WHEN 'Carregamento Lateral' THEN 11
        WHEN 'Marcha com Padrões Cruzados' THEN 12
        WHEN 'Coordenação Óculo-Manual' THEN 13
    END as order_index,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 2
        WHEN '4 Apoios (Four Point kneeling)' THEN 2
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 2
        WHEN 'Ponte de Glúteo Bilateral' THEN 2
        WHEN 'Agachamento com Suporte' THEN 2
        WHEN 'Sit-to-Stand' THEN 2
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 3
        WHEN 'Gait Training com Obstáculos' THEN 2
        WHEN 'Carregamento Lateral' THEN 2
        WHEN 'Marcha com Padrões Cruzados' THEN 2
        WHEN 'Coordenação Óculo-Manual' THEN 2
        WHEN 'Respiração Diafragmática' THEN 2
        WHEN 'Respiração 4-7-8' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 10
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 10
        WHEN 'Ponte de Glúteo Bilateral' THEN 10
        WHEN 'Agachamento com Suporte' THEN 10
        WHEN 'Sit-to-Stand' THEN 10
        WHEN 'Gait Training com Obstáculos' THEN 10
        WHEN 'Carregamento Lateral' THEN 15
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Respiração 4-7-8' THEN 5
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 10
        WHEN '4 Apoios (Four Point kneeling)' THEN 10
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 60
        WHEN 'Gait Training com Obstáculos' THEN 10
        WHEN 'Marcha com Padrões Cruzados' THEN 60
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Respiração 4-7-8' THEN 60
        WHEN 'Coordenação Óculo-Manual' THEN 60
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Gait Training com Obstáculos' THEN 'Usar pistas visuais e auditivas.'
        WHEN 'Sit-to-Stand' THEN 'Contagem verbal "1-2-3-VAMOS" ajuda.'
        WHEN 'Marcha com Padrões Cruzados' THEN 'Ampliar passadas. Braços em balanço.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Mobilidade axial é crucial para Parkinson. Box training é eficaz.'
        WHEN 'Sit-to-Stand' THEN 'Transferências são problemáticas em Parkinson.'
        WHEN 'Gait Training com Obstáculos' THEN 'Pistas visuais/auditivas melhoram marcha em PD.'
        WHEN 'Coordenação Óculo-Manual' THEN 'Dual-task (cognitivo-motor) treja compensações.'
        WHEN 'Carregamento Lateral' THEN 'Core e mobilidade torácica melhoram postura.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN ARRAY['Coluna', 'Core', 'Mobilidade Axial']
        WHEN 'Bird-dog (Cachorro e Pássaro)' THEN ARRAY['Core', 'MMII']
        WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteos', 'Core']
        WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos', 'Core']
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN ARRAY['MMII', 'Equilíbrio']
        WHEN 'Carregamento Lateral' THEN ARRAY['Core', 'Oblíquos', 'MMII']
        WHEN 'Coordenação Óculo-Manual' THEN ARRAY['Coordenação', 'Cognição']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Mobilidade axial'
        WHEN 'Sit-to-Stand' THEN 'Transferências'
        WHEN 'Gait Training com Obstáculos' THEN 'Marcha com pistas'
        WHEN 'Coordenação Óculo-Manual' THEN 'Dual-task cognitivo-motor'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Respiração 4-7-8',
    'Gato-Vaca (Cat-Cow)',
    '4 Apoios (Four Point kneeling)',
    'Bird-dog (Cachorro e Pássaro)',
    'Ponte de Glúteo Bilateral',
    'Agachamento com Suporte',
    'Sit-to-Stand',
    'Tandem Walk (Caminhada em Tandem)',
    'Gait Training com Obstáculos',
    'Carregamento Lateral',
    'Marcha com Padrões Cruzados',
    'Coordenação Óculo-Manual'
)
WHERE t.name = 'Parkinson - Mobilidade'
ON CONFLICT DO NOTHING;

-- ============================================================
-- PREVENÇÃO DE QUEDAS EM IDOSOS
-- Referências: Cochrane Review, Otago Programme, CDC STEADI
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Ponte de Glúteo Bilateral' THEN 2
        WHEN 'Ponte de Glúteo Unilateral' THEN 3
        WHEN 'Clamshell (Concha)' THEN 4
        WHEN 'Agachamento com Suporte' THEN 5
        WHEN 'Sit-to-Stand' THEN 6
        WHEN 'Step Up' THEN 7
        WHEN 'Step Down' THEN 8
        WHEN 'Equilíbrio Unipodal Solo' THEN 9
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 10
        WHEN 'BOSU Ball Squat' THEN 11
        WHEN 'Equilíbrio em Disco Instável' THEN 12
        WHEN 'Gait Training com Obstáculos' THEN 13
        WHEN 'Descida de Escada' THEN 14
        WHEN 'Subida de Escada' THEN 15
    END as order_index,
    CASE e.name
        WHEN 'Ponte de Glúteo Bilateral' THEN 2
        WHEN 'Ponte de Glúteo Unilateral' THEN 2
        WHEN 'Clamshell (Concha)' THEN 2
        WHEN 'Agachamento com Suporte' THEN 2
        WHEN 'Sit-to-Stand' THEN 2
        WHEN 'Step Up' THEN 2
        WHEN 'Step Down' THEN 2
        WHEN 'Equilíbrio Unipodal Solo' THEN 3
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 3
        WHEN 'BOSU Ball Squat' THEN 2
        WHEN 'Equilíbrio em Disco Instável' THEN 2
        WHEN 'Gait Training com Obstáculos' THEN 2
        WHEN 'Descida de Escada' THEN 2
        WHEN 'Subida de Escada' THEN 2
        WHEN 'Respiração Diafragmática' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Ponte de Glúteo Bilateral' THEN 10
        WHEN 'Ponte de Glúteo Unilateral' THEN 10
        WHEN 'Clamshell (Concha)' THEN 15
        WHEN 'Agachamento com Suporte' THEN 10
        WHEN 'Sit-to-Stand' THEN 10
        WHEN 'Step Up' THEN 10
        WHEN 'Step Down' THEN 10
        WHEN 'BOSU Ball Squat' THEN 10
        WHEN 'Gait Training com Obstáculos' THEN 10
        WHEN 'Descida de Escada' THEN 8
        WHEN 'Subida de Escada' THEN 8
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Equilíbrio Unipodal Solo' THEN 30
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 60
        WHEN 'BOSU Ball Squat' THEN 30
        WHEN 'Equilíbrio em Disco Instável' THEN 30
        WHEN 'Gait Training com Obstáculos' THEN 10
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Equilíbrio Unipodal Solo' THEN 'Supervisão para segurança. Progredir para olhos fechados.'
        WHEN 'BOSU Ball Squat' THEN 'Superfície instável. Supervisão necessária.'
        WHEN 'Gait Training com Obstáculos' THEN 'Adaptações conforme necessidade.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Equilíbrio Unipodal Solo' THEN 'Equilíbrio unipodal é predictor de quedas. Otago Programme.'
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Glúteo médio previne Trendelenburg e quedas laterais.'
        WHEN 'BOSU Ball Squat' THEN 'Treino em instabilidade reduz quedas em 30-40%. Cochrane Review'
        WHEN 'Sit-to-Stand' THEN 'Transferências são momento de alto risco para quedas.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais']
        WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo']
        WHEN 'Clamshell (Concha)' THEN ARRAY['Glúteo Médio']
        WHEN 'Agachamento com Suporte' THEN ARRAY['Quadríceps', 'Glúteos']
        WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos', 'Core']
        WHEN 'Equilíbrio Unipodal Solo' THEN ARRAY['Tornozelo', 'Core', 'MMII']
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN ARRAY['MMII', 'Equilíbrio']
        WHEN 'BOSU Ball Squat' THEN ARRAY['MMII', 'Core', 'Equilíbrio']
        WHEN 'Gait Training com Obstáculos' THEN ARRAY['MMII', 'Marcha', 'Equilíbrio']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Estabilidade de quadril'
        WHEN 'Equilíbrio Unipodal Solo' THEN 'Equilíbrio estático'
        WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 'Equilíbrio dinâmico'
        WHEN 'BOSU Ball Squat' THEN 'Propriocepção avançada'
        WHEN 'Sit-to-Stand' THEN 'Transferências seguras'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Clamshell (Concha)',
    'Agachamento com Suporte',
    'Sit-to-Stand',
    'Step Up',
    'Step Down',
    'Equilíbrio Unipodal Solo',
    'Tandem Walk (Caminhada em Tandem)',
    'BOSU Ball Squat',
    'Equilíbrio em Disco Instável',
    'Gait Training com Obstáculos',
    'Descida de Escada',
    'Subida de Escada'
)
WHERE t.name = 'Prevenção de Quedas em Idosos'
ON CONFLICT DO NOTHING;

-- ============================================================
-- OSTEOPOROSE - FORTALECIMENTO
-- Referências: Physio-pedia, ACSM, Bone loading recommendations
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Ponte de Glúteo Bilateral' THEN 2
        WHEN 'Agachamento com Suporte' THEN 3
        WHEN 'Sit-to-Stand' THEN 4
        WHEN 'Step Up' THEN 5
        WHEN 'Elevação de Panturrilha em Pé' THEN 6
        WHEN 'Elevação Frontal de Ombro' THEN 7
        WHEN 'Rotação Externa de Ombro com Faixa' THEN 8
        WHEN 'Push-up Plus' THEN 9
        WHEN 'Prancha Abdominal (Plank)' THEN 10
        WHEN 'Side Plank (Prancha Lateral)' THEN 11
        WHEN 'Rowing com Faixa Elástica' THEN 12
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 13
        WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 14
    END as order_index,
    CASE e.name
        WHEN 'Ponte de Glúteo Bilateral' THEN 3
        WHEN 'Agachamento com Suporte' THEN 3
        WHEN 'Sit-to-Stand' THEN 3
        WHEN 'Step Up' THEN 3
        WHEN 'Elevação de Panturrilha em Pé' THEN 3
        WHEN 'Elevação Frontal de Ombro' THEN 3
        WHEN 'Rotação Externa de Ombro com Faixa' THEN 3
        WHEN 'Push-up Plus' THEN 3
        WHEN 'Prancha Abdominal (Plank)' THEN 3
        WHEN 'Side Plank (Prancha Lateral)' THEN 2
        WHEN 'Rowing com Faixa Elástica' THEN 3
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 2
        WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 2
        WHEN 'Respiração Diafragmática' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Ponte de Glúteo Bilateral' THEN 12
        WHEN 'Agachamento com Suporte' THEN 12
        WHEN 'Sit-to-Stand' THEN 12
        WHEN 'Step Up' THEN 12
        WHEN 'Elevação de Panturrilha em Pé' THEN 15
        WHEN 'Elevação Frontal de Ombro' THEN 12
        WHEN 'Rotação Externa de Ombro com Faixa' THEN 12
        WHEN 'Push-up Plus' THEN 10
        WHEN 'Prancha Abdominal (Plank)' THEN 30
        WHEN 'Side Plank (Prancha Lateral)' THEN 30
        WHEN 'Rowing com Faixa Elástica' THEN 12
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Prancha Abdominal (Plank)' THEN 30
        WHEN 'Side Plank (Prancha Lateral)' THEN 30
        WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 60
        WHEN 'Mobilização de Escápula (Wall Slides)' THEN 30
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Agachamento com Suporte' THEN 'NÃO fazer flexão profunda. Amplitude segura.'
        WHEN 'Sit-to-Stand' THEN 'Impacto moderado é osteogênico.'
        WHEN 'Step Up' THEN 'Carga axial é estimulante ósseo.'
        WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 'NÃO rolar sobre lombar.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Step Up' THEN 'Carga axial moderada é estimulante ósseo. ACSM guidelines.'
        WHEN 'Elevação de Panturrilha em Pé' THEN 'Impacto em MMII estimula densidade óssea femoral.'
        WHEN 'Rowing com Faixa Elástica' THEN 'Fortalecimento de MMSS estimula densidade óssea.'
        WHEN 'Prancha Abdominal (Plank)' THEN 'Core estabilizador reduz risco de fraturas vertebrais.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais', 'Coluna']
        WHEN 'Agachamento com Suporte' THEN ARRAY['Quadríceps', 'Glúteos', 'Coluna']
        WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos', 'MMII']
        WHEN 'Step Up' THEN ARRAY['Quadríceps', 'Glúteos', 'MMII']
        WHEN 'Elevação de Panturrilha em Pé' THEN ARRAY['Panturrilha', 'Tíbia', 'Fêmur']
        WHEN 'Elevação Frontal de Ombro' THEN ARRAY['Deltóide', 'Úmero']
        WHEN 'Rowing com Faixa Elástica' THEN ARRAY['Rombóides', 'Trapézio', 'Coluna Torácica']
        WHEN 'Prancha Abdominal (Plank)' THEN ARRAY['Core', 'Coluna']
        WHEN 'Side Plank (Prancha Lateral)' THEN ARRAY['Oblíquos', 'Core', 'Coluna']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Step Up' THEN 'Carga axial MMII'
        WHEN 'Elevação de Panturrilha em Pé' THEN 'Impacto moderado'
        WHEN 'Rowing com Faixa Elástica' THEN 'Fortalecimento MMSS'
        WHEN 'Prancha Abdominal (Plank)' THEN 'Core estabilizador'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Ponte de Glúteo Bilateral',
    'Agachamento com Suporte',
    'Sit-to-Stand',
    'Step Up',
    'Elevação de Panturrilha em Pé',
    'Elevação Frontal de Ombro',
    'Rotação Externa de Ombro com Faixa',
    'Push-up Plus',
    'Prancha Abdominal (Plank)',
    'Side Plank (Prancha Lateral)',
    'Rowing com Faixa Elástica',
    'Mobilização de Escápula (Wall Slides)',
    'Mobilização de Coluna Thorácica com Foam Roller'
)
WHERE t.name = 'Osteoporose - Fortalecimento'
ON CONFLICT DO NOTHING;

-- ============================================================
-- ARTROSE DE JOELHO
-- Referências: AAOS Guidelines, Quadriceps strengthening review, Cochrane Review
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Agachamento Parede (Wall Sit)' THEN 2
        WHEN 'Leg Press 45°' THEN 3
        WHEN 'Ponte de Glúteo Bilateral' THEN 4
        WHEN 'Ponte de Glúteo Unilateral' THEN 5
        WHEN 'Agachamento com Suporte' THEN 6
        WHEN 'Sit-to-Stand' THEN 7
        WHEN 'Step Up' THEN 8
        WHEN 'Elevação de Panturrilha em Pé' THEN 9
        WHEN 'Alongamento de Quadríceps em Pé' THEN 10
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 11
        WHEN 'Alongamento de Panturrilha na Parede' THEN 12
    END as order_index,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 3
        WHEN 'Leg Press 45°' THEN 3
        WHEN 'Ponte de Glúteo Bilateral' THEN 2
        WHEN 'Ponte de Glúteo Unilateral' THEN 2
        WHEN 'Agachamento com Suporte' THEN 2
        WHEN 'Sit-to-Stand' THEN 2
        WHEN 'Step Up' THEN 2
        WHEN 'Elevação de Panturrilha em Pé' THEN 2
        WHEN 'Alongamento de Quadríceps em Pé' THEN 2
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
        WHEN 'Alongamento de Panturrilha na Parede' THEN 2
        WHEN 'Respiração Diafragmática' THEN 2
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 30
        WHEN 'Leg Press 45°' THEN 15
        WHEN 'Ponte de Glúteo Bilateral' THEN 10
        WHEN 'Ponte de Glúteo Unilateral' THEN 8
        WHEN 'Agachamento com Suporte' THEN 10
        WHEN 'Sit-to-Stand' THEN 10
        WHEN 'Step Up' THEN 10
        WHEN 'Elevação de Panturrilha em Pé' THEN 15
        WHEN 'Respiração Diafragmática' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 30
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Alongamento de Quadríceps em Pé' THEN 30
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
        WHEN 'Alongamento de Panturrilha na Parede' THEN 30
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 'Respeitar limite de dor. Não ir profundo.'
        WHEN 'Leg Press 45°' THEN 'Arco 0-60° é seguro. Evitar extensão completa com carga.'
        WHEN 'Step Up' THEN 'Altura moderada. Não forçar.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 'Isometria de quadríceps é cornerstone para OA de joelho. AAOS'
        WHEN 'Leg Press 45°' THEN 'Cadeia fechada tem menos carga patelar que CCA.'
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Glúteo médio melhora alinhamento femoropatelar.'
        WHEN 'Elevação de Panturrilha em Pé' THEN 'Panturrilha forte melhora absorção de impacto.'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN ARRAY['Quadríceps']
        WHEN 'Leg Press 45°' THEN ARRAY['Quadríceps', 'Glúteos']
        WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais']
        WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo']
        WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos', 'Core']
        WHEN 'Elevação de Panturrilha em Pé' THEN ARRAY['Panturrilha']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Agachamento Parede (Wall Sit)' THEN 'Ativar quadríceps (CCA)'
        WHEN 'Leg Press 45°' THEN 'Fortalecimento CCF'
        WHEN 'Ponte de Glúteo Unilateral' THEN 'Alinhamento patelar'
        WHEN 'Elevação de Panturrilha em Pé' THEN 'Absorção de impacto'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Agachamento Parede (Wall Sit)',
    'Leg Press 45°',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Agachamento com Suporte',
    'Sit-to-Stand',
    'Step Up',
    'Elevação de Panturrilha em Pé',
    'Alongamento de Quadríceps em Pé',
    'Alongamento de Isquiotibiais em Pé',
    'Alongamento de Panturrilha na Parede'
)
WHERE t.name = 'Artrose de Joelho'
ON CONFLICT DO NOTHING;

-- ============================================================
-- FIBROMIALGIA - AERÓBICO LEVE
-- Referências: EULAR recommendations, Exercise therapy systematic review, Graded activity
-- ============================================================

INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, clinical_notes, focus_muscles, purpose)
SELECT
    t.id,
    e.id,
    CASE e.name
        WHEN 'Respiração Diafragmática' THEN 1
        WHEN 'Respiração 4-7-8' THEN 2
        WHEN 'Respiração com Labios Franzidos (Pursed Lip)' THEN 3
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 4
        WHEN '4 Apoios (Four Point kneeling)' THEN 5
        WHEN 'Ponte de Glúteo Bilateral' THEN 6
        WHEN 'Agachamento com Suporte' THEN 7
        WHEN 'Sit-to-Stand' THEN 8
        WHEN 'Elevação de Panturrilha em Pé' THEN 9
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 10
        WHEN 'Alongamento de Quadríceps em Pé' THEN 11
        WHEN 'Alongamento de Panturrilha na Parede' THEN 12
        WHEN 'Relaxamento Progressivo de Jacobson' THEN 13
        WHEN 'Rolling com Foam Roller' THEN 14
    END as order_index,
    CASE e.name
        WHEN 'Respiracao Diafragmática' THEN 3
        WHEN 'Respiração 4-7-8' THEN 3
        WHEN 'Respiração com Labios Franzidos (Pursed Lip)' THEN 3
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 2
        WHEN '4 Apoios (Four Point kneeling)' THEN 2
        WHEN 'Ponte de Glúteo Bilateral' THEN 2
        WHEN 'Agachamento com Suporte' THEN 2
        WHEN 'Sit-to-Stand' THEN 2
        WHEN 'Elevação de Panturrilha em Pé' THEN 2
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
        WHEN 'Alongamento de Quadríceps em Pé' THEN 2
        WHEN 'Alongamento de Panturrilha na Parede' THEN 2
        WHEN 'Relaxamento Progressivo de Jacobson' THEN 1
        WHEN 'Rolling com Foam Roller' THEN 1
        ELSE NULL
    END as sets,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 8
        WHEN '4 Apoios (Four Point kneeling)' THEN 8
        WHEN 'Ponte de Glúteo Bilateral' THEN 8
        WHEN 'Agachamento com Suporte' THEN 8
        WHEN 'Sit-to-Stand' THEN 8
        WHEN 'Elevação de Panturrilha em Pé' THEN 10
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Respiração 4-7-8' THEN 5
        WHEN 'Respiração com Labios Franzidos (Pursed Lip)' THEN 10
        ELSE NULL
    END as repetitions,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 8
        WHEN '4 Apoios (Four Point kneeling)' THEN 8
        WHEN 'Respiração Diafragmática' THEN 10
        WHEN 'Respiração 4-7-8' THEN 60
        WHEN 'Respiração com Labios Franzidos (Pursed Lip)' THEN 60
        WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
        WHEN 'Alongamento de Quadríceps em Pé' THEN 30
        WHEN 'Alongamento de Panturrilha na Parede' THEN 30
        WHEN 'Relaxamento Progressivo de Jacobson' THEN 300
        WHEN 'Rolling com Foam Roller' THEN 120
        ELSE NULL
    END as duration,
    CASE e.name
        WHEN 'Agachamento com Suporte' THEN 'Início MUITO gradual. Parar se dor exacerbada.'
        WHEN 'Elevação de Panturrilha em Pé' THEN 'Progressão conservadora. Monitorar flare-up.'
        WHEN 'Sit-to-Stand' THEN 'Início com cadeira alta. Assistência conforme necessário.'
        ELSE NULL
    END as notes,
    CASE e.name
        WHEN 'Respiração 4-7-8' THEN 'Respiração controlada reduz sintomas de fibromialgia.'
        WHEN 'Relaxamento Progressivo de Jacobson' THEN 'Relaxamento reduz dor e fadiga. EULAR recommendations.'
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Movimento suave mobiliza coluna sem sobrecarga.'
        WHEN 'Agachamento com Suporte' THEN 'Progressão MUITO gradual é essencial. EULAR'
        ELSE NULL
    END as clinical_notes,
    CASE e.name
        WHEN 'Gato-Vaca (Cat-Cow)' THEN ARRAY['Coluna', 'Core']
        WHEN '4 Apoios (Four Point kneeling)' THEN ARRAY['Core']
        WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteos', 'Core']
        WHEN 'Agachamento com Suporte' THEN ARRAY['Quadríceps', 'Glúteos']
        WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos', 'Core']
        WHEN 'Elevação de Panturrilha em Pé' THEN ARRAY['Panturrilha']
        ELSE NULL
    END as focus_muscles,
    CASE e.name
        WHEN 'Respiração 4-7-8' THEN 'Controle respiratório'
        WHEN 'Relaxamento Progressivo de Jacobson' THEN 'Relaxamento profundo'
        WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Mobilização suave'
        WHEN 'Agachamento com Suporte' THEN 'Ativação leve'
        ELSE NULL
    END as purpose
FROM exercise_templates t
JOIN exercises e ON e.name IN (
    'Respiração Diafragmática',
    'Respiração 4-7-8',
    'Respiração com Labios Franzidos (Pursed Lip)',
    'Gato-Vaca (Cat-Cow)',
    '4 Apoios (Four Point kneeling)',
    'Ponte de Glúteo Bilateral',
    'Agachamento com Suporte',
    'Sit-to-Stand',
    'Elevação de Panturrilha em Pé',
    'Alongamento de Isquiotibiais em Pé',
    'Alongamento de Quadríceps em Pé',
    'Alongamento de Panturrilha na Parede',
    'Relaxamento Progressivo de Jacobson',
    'Rolling com Foam Roller'
)
WHERE t.name = 'Fibromialgia - Aeróbico Leve'
ON CONFLICT DO NOTHING;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
-- Resumo do que foi adicionado:
--
-- TEMPLATES COMPLETADOS (20 templates originais + 5 novos):
-- 1. Pós-Op LCA - Fase 1 (0-6 semanas) - 13 exercícios
-- 2. Pós-Op LCA - Fase 2 (6-12 semanas) - 15 exercícios
-- 3. Pós-Op LCA - Fase 3 (12+ semanas) - 18 exercícios
-- 4. Pós-Op Manguito Rotador - Inicial - 10 exercícios
-- 5. Pós-Op Manguito Rotador - Avançado - 15 exercícios
-- 6. Lombalgia Crônica - 14 exercícios
-- 7. Cervicalgia Tensional - 11 exercícios
-- 8. Hérnia de Disco Lombar - 11 exercícios
-- 9. Entorse de Tornozelo - Fase Aguda - 7 exercícios
-- 10. Entorse de Tornozelo - Fortalecimento - 12 exercícios
-- 11. Fascite Plantar - 8 exercícios
-- 12. Tendinopatia Patelar - 10 exercícios
-- 13. Bursite Trocantérica - 11 exercícios
-- 14. Reabilitação AVE - Membro Superior - 16 exercícios
-- 15. Reabilitação AVE - Marcha - 14 exercícios
-- 16. Parkinson - Mobilidade - 13 exercícios
-- 17. Prevenção de Quedas em Idosos - 15 exercícios
-- 18. Osteoporose - Fortalecimento - 14 exercícios
-- 19. Artrose de Joelho - 12 exercícios
-- 20. Fibromialgia - Aeróbico Leve - 14 exercícios
--
-- NOVOS TEMPLATES CRIADOS (5):
-- 21. Pós-Op ATJ - Fase Inicial - 12 exercícios
-- 22. Pós-Op ATQ - Fase Inicial - 12 exercícios
-- 23. Capsulite Adesiva - Fase Congelamento - 8 exercícios
-- 24. Instabilidade Patelofemoral - 16 exercícios
-- 25. Lombalgia Aguda - 11 exercícios
--
-- TOTAL: 25 templates com aproximadamente 300 exercícios associados
--
-- Cada exercício inclui:
-- - order_index: sequência lógica
-- - sets, repetitions, duration: parâmetros de prescrição
-- - notes: orientações de execução
-- - clinical_notes: evidência científica e justificativa
-- - focus_muscles: ARRAY de grupos musculares
-- - purpose: objetivo específico do exercício
-- - week_start/week_end: quando aplicável
--
-- Referências utilizadas:
-- - AAOS (American Academy of Orthopaedic Surgeons)
-- - APTA (American Physical Therapy Association)
-- - JOSPT (Journal of Orthopaedic & Sports Physical Therapy)
-- - Cochrane Reviews
-- - NCBI/PMC (National Center for Biotechnology Information)
-- - Physio-pedia
-- - EULAR (European Alliance of Associations for Rheumatology)
-- - ACSM (American College of Sports Medicine)
-- - CDC STEADI
-- - Otago Exercise Programme
-- - MOON Shoulder Group
-- - MGH (Massachusetts General Hospital) Protocols
-- ============================================================
