-- Migration: Adicionar exercícios baseados em evidências aos templates
-- Data: 2025-01-14
-- Descrição: Associa exercícios específicos baseados em evidências científicas padrão ouro a cada template
-- Referências: AAOS, APTA, JOSPT, Cochrane Reviews, NCBI/PMC

-- ============================================================
-- FUNÇÃO AUXILIAR PARA OBTER EXERCISE_ID POR NOME
-- ============================================================
-- Esta função facilita a associação de exercícios por nome

-- ============================================================
-- PÓS-OP LCA - FASE 1 (0-6 semanas)
-- Referências: AAOS Clinical Practice Guideline (2022), APTA (2022), Verhagen et al. (2025)
-- ============================================================

WITH lca_fase_1 AS (
  SELECT id FROM exercise_templates WHERE name = 'Pós-Op LCA - Fase 1' LIMIT 1
),
exercises_lca_fase_1 AS (
  SELECT id, name FROM exercises WHERE name IN (
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
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM lca_fase_1),
  e.id,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 1
    WHEN 'Mobilização Patelar' THEN 2
    WHEN 'Mobilização de Tornozelo em DF' THEN 3
    WHEN 'Elevação de Panturrilha Sentado' THEN 4
    WHEN 'Sit-to-Stand' THEN 5
    WHEN 'Agachamento Parede (Wall Sit)' THEN 6
    WHEN 'Ponte de Glúteo Bilateral' THEN 7
    WHEN 'Agachamento com Suporte' THEN 8
    WHEN 'Extensão de Joelho em Cadeia Cinética Aberta' THEN 9
    WHEN 'Elevação de Panturrilha em Pé' THEN 10
    WHEN 'Alongamento de Quadríceps em Pé' THEN 11
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 12
    WHEN 'Alongamento de Panturrilha na Parede' THEN 13
  END,
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
  END,
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
  END,
  CASE e.name
    WHEN 'Agachamento Parede (Wall Sit)' THEN 20
    WHEN 'Mobilização Patelar' THEN 10
    WHEN 'Mobilização de Tornozelo em DF' THEN 30
    WHEN 'Respiração Diafragmática' THEN 5
    WHEN 'Alongamento de Quadríceps em Pé' THEN 30
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
    WHEN 'Alongamento de Panturrilha na Parede' THEN 30
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Mobilização Patelar' THEN 'Essencial para prevenir aderências. Realizar 4 direções.'
    WHEN 'Extensão de Joelho em Cadeia Cinética Aberta' THEN 'ARCO 45-90° apenas. Evitar extensão completa.'
    WHEN 'Sit-to-Stand' THEN 'Progressão: usar mãos → sem mãos.'
    WHEN 'Agachamento com Suporte' THEN 'Máximo 45° flexão. Não forçar.'
    ELSE NULL
  END,
  0, 6,
  CASE e.name
    WHEN 'Mobilização Patelar' THEN 'Prevenção de aderências patelares é crítica para extensão completa.'
    WHEN 'Extensão de Joelho em Cadeia Cinética Aberta' THEN 'Cuidado: evitar 0-45° nas primeiras 6 semanas (proteção enxerto).'
    WHEN 'Elevação de Panturrilha Sentado' THEN 'Sóleo ativo sem estresse no joelho.'
    WHEN 'Ponte de Glúteo Bilateral' THEN 'Ativação de glúteo é essencial para controle de joelho em cadeia fechada.'
    WHEN 'Respiração Diafragmática' THEN 'Controle respiratório otimiza ativação de core estabilizador.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Glúteo Médio', 'Isquiotibiais']
    WHEN 'Elevação de Panturrilha Sentado' THEN ARRAY['Sóleo']
    WHEN 'Elevação de Panturrilha em Pé' THEN ARRAY['Gastrocnêmio', 'Sóleo']
    WHEN 'Agachamento Parede (Wall Sit)' THEN ARRAY['Quadríceps', 'Glúteos']
    WHEN 'Extensão de Joelho em Cadeia Cinética Aberta' THEN ARRAY['Vasto Medial', 'Vasto Lateral', 'Reto Femoral']
    WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos', 'Core']
    WHEN 'Agachamento com Suporte' THEN ARRAY['Quadríceps', 'Glúteos']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Mobilização Patelar' THEN 'Prevenir aderências patelares'
    WHEN 'Extensão de Joelho em Cadeia Cinética Aberta' THEN 'Ativar quadríceps em arco seguro'
    WHEN 'Ponte de Glúteo Bilateral' THEN 'Estabilizar pélvis e ativar cadeia posterior'
    WHEN 'Sit-to-Stand' THEN 'Funcionalidade básica de transferências'
    WHEN 'Respiração Diafragmática' THEN 'Ativar core estabilizador profundo'
    ELSE NULL
  END
FROM exercises_lca_fase_1 e
WHERE EXISTS (SELECT 1 FROM lca_fase_1);

-- ============================================================
-- PÓS-OP LCA - FASE 2 (6-12 semanas)
-- Referências: Aspetar Guidelines, MGH Protocol (2023)
-- ============================================================

WITH lca_fase_2 AS (
  SELECT id FROM exercise_templates WHERE name = 'Pós-Op LCA - Fase 2' LIMIT 1
),
exercises_lca_fase_2 AS (
  SELECT id, name FROM exercises WHERE name IN (
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
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM lca_fase_2),
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
  END,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 3
    WHEN 'Dead Bug' THEN 3
    WHEN 'Ponte de Glúteo Unilateral' THEN 3
    WHEN 'Clamshell (Concha)' THEN 3
    WHEN 'Abdução de Quadril em Pé' THEN 3
    WHEN 'Monster Walk (Caminhada Monster)' THEN 3
    WHEN 'Leg Press 45°' THEN 3
    WHEN 'Agachamento Parede (Wall Sit)' THEN 3
    WHEN 'Step Down' THEN 3
    WHEN 'Step Up' THEN 3
    WHEN 'Extensão de Joelho em Cadeia Cinética Aberta' THEN 3
    WHEN 'Flexão de Joelho em Pronação' THEN 3
    WHEN 'Elevação de Panturrilha em Pé' THEN 3
    WHEN 'Equilíbrio Unipodal Solo' THEN 3
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 3
  END,
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
  END,
  CASE e.name
    WHEN 'Agachamento Parede (Wall Sit)' THEN 45
    WHEN 'Prancha Abdominal (Plank)' THEN 30
    WHEN 'Equilíbrio Unipodal Solo' THEN 45
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 60
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Step Down' THEN 'Monitorar valgo dinâmico. Joelho não deve ir para dentro.'
    WHEN 'Step Up' THEN 'Subir com operado, descer com sadio se necessário.'
    WHEN 'Equilíbrio Unipodal Solo' THEN 'Progredir para olhos fechados.'
    WHEN 'Leg Press 45°' THEN 'Arco 0-90°. Carga progressiva.'
    ELSE NULL
  END,
  6, 12,
  CASE e.name
    WHEN 'Step Down' THEN 'Exercício chave para controle motor e propriocepção.'
    WHEN 'Clamshell (Concha)' THEN 'Glúteo médio é crucial para controle de valgo dinâmico.'
    WHEN 'Monster Walk (Caminhada Monster)' THEN 'Treino funcional de abdutores em padrão de marcha.'
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 'Propriocepção avançada com dual-task.'
    WHEN 'Ponte de Glúteo Unilateral' THEN 'Assimetrias de força entre membros devem ser tratadas.'
    ELSE NULL
  END,
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
  END,
  CASE e.name
    WHEN 'Step Down' THEN 'Controle motor e propriocepção'
    WHEN 'Step Up' THEN 'Força funcional e simetria'
    WHEN 'Clamshell (Concha)' THEN 'Prevenir valgo dinâmico'
    WHEN 'Monster Walk (Caminhada Monster)' THEN 'Fortalecimento funcional de glúteo médio'
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 'Propriocepção avançada'
    ELSE NULL
  END
FROM exercises_lca_fase_2 e
WHERE EXISTS (SELECT 1 FROM lca_fase_2);

-- ============================================================
-- PÓS-OP LCA - FASE 3 (12+ semanas - Retorno ao Esporte)
-- Referências: Aspetar Return to Sport Criteria, Grindem et al. ACL-RSI
-- ============================================================

WITH lca_fase_3 AS (
  SELECT id FROM exercise_templates WHERE name = 'Pós-Op LCA - Fase 3' LIMIT 1
),
exercises_lca_fase_3 AS (
  SELECT id, name FROM exercises WHERE name IN (
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
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM lca_fase_3),
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
  END,
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
  END,
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
  END,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 60
    WHEN 'Side Plank (Prancha Lateral)' THEN 45
    WHEN 'Equilíbrio em Disco Instável' THEN 60
    WHEN 'Carrying de Carga (Farmer Walk)' THEN 60
    WHEN 'Star Excursion Balance Test (SEBT)' THEN 8
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Mini-Landing Protocol' THEN 'Essencial para padrão de aterrissagem seguro.'
    WHEN 'Squat Jump' THEN 'Iniciar com baixa amplitude. Aterrissagem suave.'
    WHEN 'Box Jump' THEN 'Descer pela caixa, não saltar para baixo.'
    WHEN 'Star Excursion Balance Test (SEBT)' THEN 'Teste funcional e exercício. Medir alcance.'
    WHEN 'BOSU Ball Squat' THEN 'Progressão: estável → plano BOSU → invertido.'
    WHEN 'RDL (Romanian Deadlift)' THEN 'Manter coluna reta. Sensação de alongar posterior.'
    ELSE NULL
  END,
  12, NULL,
  CASE e.name
    WHEN 'Mini-Landing Protocol' THEN 'Pliometria essencial para retorno ao esporte. Até 90% do risco de re-lesão é devido a deficiência em pliometria.'
    WHEN 'Star Excursion Balance Test (SEBT)' THEN 'Teste validado para retorno ao esporte. Deficiência >10% indica risco.'
    WHEN 'Squat Jump' THEN 'Potência de membros inferiores crítica para esportes.'
    WHEN 'RDL (Romanian Deadlift)' THEN 'Fortalecimento excêntrico de isquiotibiais protege enxerto LCA.'
    WHEN 'Carregamento Lateral' THEN 'Treino de core em padrões funcionais com transferência para esporte.'
    ELSE NULL
  END,
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
  END,
  CASE e.name
    WHEN 'Mini-Landing Protocol' THEN 'Pliometria e padrão de aterrissagem'
    WHEN 'Star Excursion Balance Test (SEBT)' THEN 'Teste funcional de retorno ao esporte'
    WHEN 'Squat Jump' THEN 'Potência de MMII'
    WHEN 'BOSU Ball Squat' THEN 'Propriocepção avançada'
    WHEN 'RDL (Romanian Deadlift)' THEN 'Fortalecimento excêntrico de isquiotibiais'
    WHEN 'Carregamento Lateral' THEN 'Core funcional com transferência esportiva'
    ELSE NULL
  END
FROM exercises_lca_fase_3 e
WHERE EXISTS (SELECT 1 FROM lca_fase_3);

-- ============================================================
-- PÓS-OP MANGUITO ROTADOR - INICIAL (0-6 semanas)
-- Referências: MOON Shoulder Group, MGH Protocol, van der Meijden
-- ============================================================

WITH mr_inicial AS (
  SELECT id FROM exercise_templates WHERE name = 'Pós-Op Manguito Rotador - Inicial' LIMIT 1
),
exercises_mr_inicial AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Codman Pendular',
    'Mobilização de Ombro com Bastão',
    'Mobilização de Escápula (Wall Slides)',
    'Respiração Diafragmática',
    'Respiração Costal Inferior',
    'Mobilização de Nervo Mediano (Tinel e Phalen)',
    'Alongamento de Rombóides na Parede',
    'Alongamento de Bíceps na Parede'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM mr_inicial),
  e.id,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 1
    WHEN 'Codman Pendular' THEN 2
    WHEN 'Mobilização de Ombro com Bastão' THEN 3
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 4
    WHEN 'Respiração Costal Inferior' THEN 5
    WHEN 'Mobilização de Nervo Mediano (Tinel e Phalen)' THEN 6
    WHEN 'Alongamento de Rombóides na Parede' THEN 7
    WHEN 'Alongamento de Bíceps na Parede' THEN 8
  END,
  CASE e.name
    WHEN 'Codman Pendular' THEN 3
    WHEN 'Mobilização de Ombro com Bastão' THEN 2
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 2
    WHEN 'Respiração Diafragmática' THEN 3
    WHEN 'Respiração Costal Inferior' THEN 3
    WHEN 'Mobilização de Nervo Mediano (Tinel e Phalen)' THEN 2
    WHEN 'Alongamento de Rombóides na Parede' THEN 2
    WHEN 'Alongamento de Bíceps na Parede' THEN 2
  END,
  NULL,
  CASE e.name
    WHEN 'Codman Pendular' THEN 120
    WHEN 'Mobilização de Ombro com Bastão' THEN 30
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 30
    WHEN 'Respiração Diafragmática' THEN 10
    WHEN 'Respiração Costal Inferior' THEN 10
    WHEN 'Mobilização de Nervo Mediano (Tinel e Phalen)' THEN 30
    WHEN 'Alongamento de Rombóides na Parede' THEN 30
    WHEN 'Alongamento de Bíceps na Parede' THEN 30
  END,
  CASE e.name
    WHEN 'Codman Pendular' THEN 'Pendular deve ser relaxado. Usar gravidade.'
    WHEN 'Mobilização de Ombro com Bastão' THEN 'Ativo-assistida. Braço sadio move afetado.'
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Foco em ritmo escapuloumeral.'
    ELSE NULL
  END,
  0, 6,
  CASE e.name
    WHEN 'Codman Pendular' THEN 'Pendulares passivos são essenciais para ganho de amplitude sem ativar manguito.'
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Mobilização escapular é crítica para restaurar ritmo escapuloumeral.'
    WHEN 'Mobilização de Ombro com Bastão' THEN 'Ativo-assistida permite ganho de amplitude sem sobrecarga.'
    WHEN 'Respiração Costal Inferior' THEN 'Respiração diafragmática reduz tensão de cintura escapular.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Codman Pendular' THEN ARRAY['Ombro', 'Manguito Rotador']
    WHEN 'Mobilização de Ombro com Bastão' THEN ARRAY['Ombro', 'Deltóide', 'Manguito Rotador']
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN ARRAY['Escápula', 'Serrátil Anterior', 'Trapézio', 'Rombóides']
    WHEN 'Respiração Costal Inferior' THEN ARRAY['Diafragma', 'Core']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Codman Pendular' THEN 'ADM passiva sem ativação muscular'
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Restaurar ritmo escapuloumeral'
    WHEN 'Mobilização de Ombro com Bastão' THEN 'ADM ativo-assistida'
    ELSE NULL
  END
FROM exercises_mr_inicial e
WHERE EXISTS (SELECT 1 FROM mr_inicial);

-- ============================================================
-- PÓS-OP MANGUITO ROTADOR - AVANÇADO (6+ semanas)
-- Referências: Escamilla et al. (2014), Physio-pedia, HSS Guidelines
-- ============================================================

WITH mr_avancado AS (
  SELECT id FROM exercise_templates WHERE name = 'Pós-Op Manguito Rotador - Avançado' LIMIT 1
),
exercises_mr_avancado AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Rotação Externa de Ombro com Faixa',
    'Rotação Interna de Ombro com Faixa',
    'Elevação Lateral de Ombro (0-90°)',
    'Elevação Frontal de Ombro',
    'Extensão de Ombro em Pronação',
    'Prone Y-T-W',
    'Push-up Plus',
    'Rowing com Faixa Elástica',
    'Face Pull',
    'Prancha Abdominal (Plank)',
    'Side Plank (Prancha Lateral)',
    'Bird-dog (Cachorro e Pássaro)',
    'Dead Bug'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM mr_avancado),
  e.id,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 1
    WHEN 'Side Plank (Prancha Lateral)' THEN 2
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 3
    WHEN 'Dead Bug' THEN 4
    WHEN 'Push-up Plus' THEN 5
    WHEN 'Rowing com Faixa Elástica' THEN 6
    WHEN 'Face Pull' THEN 7
    WHEN 'Rotação Externa de Ombro com Faixa' THEN 8
    WHEN 'Rotação Interna de Ombro com Faixa' THEN 9
    WHEN 'Elevação Lateral de Ombro (0-90°)' THEN 10
    WHEN 'Elevação Frontal de Ombro' THEN 11
    WHEN 'Extensão de Ombro em Pronação' THEN 12
    WHEN 'Prone Y-T-W' THEN 13
  END,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 3
    WHEN 'Side Plank (Prancha Lateral)' THEN 3
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 3
    WHEN 'Dead Bug' THEN 3
    WHEN 'Push-up Plus' THEN 3
    WHEN 'Rowing com Faixa Elástica' THEN 3
    WHEN 'Face Pull' THEN 3
    WHEN 'Rotação Externa de Ombro com Faixa' THEN 3
    WHEN 'Rotação Interna de Ombro com Faixa' THEN 3
    WHEN 'Elevação Lateral de Ombro (0-90°)' THEN 3
    WHEN 'Elevação Frontal de Ombro' THEN 3
    WHEN 'Extensão de Ombro em Pronação' THEN 3
    WHEN 'Prone Y-T-W' THEN 3
  END,
  CASE e.name
    WHEN 'Rotação Externa de Ombro com Faixa' THEN 15
    WHEN 'Rotação Interna de Ombro com Faixa' THEN 15
    WHEN 'Elevação Lateral de Ombro (0-90°)' THEN 15
    WHEN 'Elevação Frontal de Ombro' THEN 15
    WHEN 'Extensão de Ombro em Pronação' THEN 15
    WHEN 'Prone Y-T-W' THEN 10
    WHEN 'Push-up Plus' THEN 15
    WHEN 'Rowing com Faixa Elástica' THEN 15
    WHEN 'Face Pull' THEN 15
    WHEN 'Prancha Abdominal (Plank)' THEN 45
    WHEN 'Side Plank (Prancha Lateral)' THEN 30
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 12
    WHEN 'Dead Bug' THEN 12
  END,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 45
    WHEN 'Side Plank (Prancha Lateral)' THEN 30
    WHEN 'Elevação Lateral de Ombro (0-90°)' THEN 2
    WHEN 'Elevação Frontal de Ombro' THEN 2
    WHEN 'Extensão de Ombro em Pronação' THEN 2
    WHEN 'Prone Y-T-W' THEN 3
    WHEN 'Rotação Externa de Ombro com Faixa' THEN 3
    WHEN 'Rotação Interna de Ombro com Faixa' THEN 3
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Rotação Externa de Ombro com Faixa' THEN 'Cotovelo colado ao corpo. Sem dor.'
    WHEN 'Elevação Lateral de Ombro (0-90°)' THEN 'Não ultrapassar 90° inicialmente.'
    WHEN 'Prone Y-T-W' THEN 'Progressão: Y → T → W.'
    WHEN 'Push-up Plus' THEN 'Protração adicional no topo é crítica.'
    ELSE NULL
  END,
  6, NULL,
  CASE e.name
    WHEN 'Rotação Externa de Ombro com Faixa' THEN 'Essencial para fortalecimento de infraespinhoso.'
    WHEN 'Rotação Interna de Ombro com Faixa' THEN 'Subescapular é chave para rotação interna e estabilização anterior.'
    WHEN 'Prone Y-T-W' THEN 'Fortalecimento de manguito em posição segura (pronação).'
    WHEN 'Push-up Plus' THEN 'Serrátil anterior é crucial para estabilização escapular.'
    WHEN 'Face Pull' THEN 'Trabalha manguito posterior e deltóide posterior simultaneamente.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Rotação Externa de Ombro com Faixa' THEN ARRAY['Infraespinhoso', 'Teres Menor']
    WHEN 'Rotação Interna de Ombro com Faixa' THEN ARRAY['Subescapular', 'Peitoral Maior']
    WHEN 'Elevação Lateral de Ombro (0-90°)' THEN ARRAY['Deltóide Médio', 'Supraespinhoso']
    WHEN 'Elevação Frontal de Ombro' THEN ARRAY['Deltóide Anterior', 'Coracobraquial']
    WHEN 'Extensão de Ombro em Pronação' THEN ARRAY['Deltóide Posterior', 'Teres Maior']
    WHEN 'Prone Y-T-W' THEN ARRAY['Manguito Rotador', 'Deltóide', 'Rombóides']
    WHEN 'Push-up Plus' THEN ARRAY['Serrátil Anterior', 'Peitoral', 'Tríceps']
    WHEN 'Rowing com Faixa Elástica' THEN ARRAY['Rombóides', 'Deltóide Posterior', 'Bíceps']
    WHEN 'Face Pull' THEN ARRAY['Rombóides', 'Manguito Posterior', 'Deltóide Posterior']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Rotação Externa de Ombro com Faixa' THEN 'Fortalecimento infraespinhoso'
    WHEN 'Rotação Interna de Ombro com Faixa' THEN 'Fortalecimento subescapular'
    WHEN 'Prone Y-T-W' THEN 'Manguito em posição segura'
    WHEN 'Push-up Plus' THEN 'Estabilização escapular (serrátil)'
    WHEN 'Face Pull' THEN 'Manguito posterior + estabilizadores escápula'
    ELSE NULL
  END
FROM exercises_mr_avancado e
WHERE EXISTS (SELECT 1 FROM mr_avancado);

-- ============================================================
-- LOMBALGIA CRÔNICA
-- Referências: NCBI StatPearls McKenzie (2023), Slater et al. (2018), JOSPT Guidelines
-- ============================================================

WITH lombalgia AS (
  SELECT id FROM exercise_templates WHERE name = 'Lombalgia Crônica' LIMIT 1
),
exercises_lombalgia AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Gato-Vaca (Cat-Cow)',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Bird-dog (Cachorro e Pássaro)',
    'Prancha Abdominal (Plank)',
    'Side Plank (Prancha Lateral)',
    'Dead Bug',
    '4 Apoios (Four Point kneeling)',
    'Respiração Diafragmática',
    'Respiração Costal Inferior',
    'Alongamento de Isquiotibiais em Pé',
    'Alongamento de Psoas (Ilíaco)',
    'Alongamento de Glúteo Supino',
    'Alongamento de Adutores',
    'Mobilização de Coluna Thorácica com Foam Roller',
    'SLR com Dorsiflexão Automática',
    'Thomas Test Stretch',
    'Mobilização de Quadril (Capsular)'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM lombalgia),
  e.id,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 1
    WHEN '4 Apoios (Four Point kneeling)' THEN 2
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 3
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 4
    WHEN 'Dead Bug' THEN 5
    WHEN 'Ponte de Glúteo Bilateral' THEN 6
    WHEN 'Ponte de Glúteo Unilateral' THEN 7
    WHEN 'Prancha Abdominal (Plank)' THEN 8
    WHEN 'Side Plank (Prancha Lateral)' THEN 9
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 10
    WHEN 'Alongamento de Psoas (Ilíaco)' THEN 11
    WHEN 'Alongamento de Glúteo Supino' THEN 12
    WHEN 'Alongamento de Adutores' THEN 13
    WHEN 'SLR com Dorsiflexão Automática' THEN 14
    WHEN 'Thomas Test Stretch' THEN 15
    WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 16
    WHEN 'Mobilização de Quadril (Capsular)' THEN 17
    WHEN 'Respiração Costal Inferior' THEN 18
  END,
  CASE e.name
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 2
    WHEN 'Ponte de Glúteo Bilateral' THEN 3
    WHEN 'Ponte de Glúteo Unilateral' THEN 3
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 3
    WHEN 'Prancha Abdominal (Plank)' THEN 3
    WHEN 'Side Plank (Prancha Lateral)' THEN 3
    WHEN 'Dead Bug' THEN 3
    WHEN '4 Apoios (Four Point kneeling)' THEN 2
    WHEN 'Respiração Diafragmática' THEN 3
    WHEN 'Respiração Costal Inferior' THEN 3
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
    WHEN 'Alongamento de Psoas (Ilíaco)' THEN 2
    WHEN 'Alongamento de Glúteo Supino' THEN 2
    WHEN 'Alongamento de Adutores' THEN 2
    WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 2
    WHEN 'SLR com Dorsiflexão Automática' THEN 2
    WHEN 'Thomas Test Stretch' THEN 2
    WHEN 'Mobilização de Quadril (Capsular)' THEN 2
  END,
  CASE e.name
    WHEN 'Ponte de Glúteo Bilateral' THEN 10
    WHEN 'Ponte de Glúteo Unilateral' THEN 10
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 12
    WHEN 'Prancha Abdominal (Plank)' THEN 30
    WHEN 'Side Plank (Prancha Lateral)' THEN 30
    WHEN 'Dead Bug' THEN 12
    WHEN '4 Apoios (Four Point kneeling)' THEN 10
    WHEN 'Respiração Diafragmática' THEN 10
    WHEN 'Respiração Costal Inferior' THEN 10
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 10
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 30
    WHEN 'Side Plank (Prancha Lateral)' THEN 30
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 10
    WHEN '4 Apoios (Four Point kneeling)' THEN 10
    WHEN 'Respiração Diafragmática' THEN 10
    WHEN 'Respiração Costal Inferior' THEN 10
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
    WHEN 'Alongamento de Psoas (Ilíaco)' THEN 30
    WHEN 'Alongamento de Glúteo Supino' THEN 30
    WHEN 'Alongamento de Adutores' THEN 30
    WHEN 'SLR com Dorsiflexão Automática' THEN 30
    WHEN 'Thomas Test Stretch' THEN 30
    WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 2
    WHEN 'Mobilização de Quadril (Capsular)' THEN 30
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Mobilização suave. Não forçar amplitude dolorosa.'
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 'Manter coluna neutra. Não hiperestender.'
    WHEN 'Ponte de Glúteo Unilateral' THEN 'Se houver dor, usar bilateral primeiro.'
    WHEN 'Prancha Abdominal (Plank)' THEN 'Iniciar com joelhos apoiados se necessário.'
    WHEN 'SLR com Dorsiflexão Automática' THEN 'Alongamento neural. Não provocar parestesia.'
    ELSE NULL
  END,
  NULL, NULL,
  CASE e.name
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 'Estabilização segmentar de multífido e transverso.'
    WHEN 'Ponte de Glúteo Bilateral' THEN 'Glúteo máximo suporta coluna lombar em atividades funcionais.'
    WHEN 'Ponte de Glúteo Unilateral' THEN 'Treino assimétrico essencial para marcha e funções unipodais.'
    WHEN 'Dead Bug' THEN 'Estabilização dinâmica mantendo lordose neutra.'
    WHEN 'Side Plank (Prancha Lateral)' THEN 'Oblíquos e quadrado lombar essenciais para estabilidade lateral.'
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Mobilização combinada com respiração coordena flexibilidade.'
    WHEN 'Respiração Diafragmática' THEN 'Ativação de transverso do abdômen via controle respiratório.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN ARRAY['Multífido', 'Transverso Abdômen', 'Glúteos', 'Core']
    WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais', 'Eretores Espinhais']
    WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo', 'Core']
    WHEN 'Dead Bug' THEN ARRAY['Transverso Abdômen', 'Oblíquos', 'Core']
    WHEN 'Side Plank (Prancha Lateral)' THEN ARRAY['Oblíquos', 'Quadrado Lombar', 'Core']
    WHEN 'Prancha Abdominal (Plank)' THEN ARRAY['Transverso Abdômen', 'Reto Abdominal', 'Core']
    WHEN 'Gato-Vaca (Cat-Cow)' THEN ARRAY['Coluna', 'Multífido', 'Eretores']
    WHEN '4 Apoios (Four Point kneeling)' THEN ARRAY['Core', 'Ombros', 'Multífido']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 'Estabilização segmentar'
    WHEN 'Ponte de Glúteo Bilateral' THEN 'Suporte lombar via glúteo'
    WHEN 'Ponte de Glúteo Unilateral' THEN 'Força assimétrica funcional'
    WHEN 'Dead Bug' THEN 'Estabilização dinâmica core'
    WHEN 'Side Plank (Prancha Lateral)' THEN 'Estabilidade lateral coluna'
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Mobilização coluna com coordenação'
    ELSE NULL
  END
FROM exercises_lombalgia e
WHERE EXISTS (SELECT 1 FROM lombalgia);

-- ============================================================
-- CERVICALGIA TENSIONAL
-- Referências: JOSPT Guidelines (2017), MDPI (2019)
-- ============================================================

WITH cervicalgia AS (
  SELECT id FROM exercise_templates WHERE name = 'Cervicalgia Tencional' LIMIT 1
),
exercises_cervicalgia AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Respiração Diafragmática',
    'Respiração 4-7-8',
    'Alongamento de Rombóides na Parede',
    'Alongamento de Peitoral na Porta',
    'Gato-Vaca (Cat-Cow)',
    'Mobilização de Escápula (Wall Slides)',
    'Mobilização de Nervo Mediano (Tinel e Phalen)',
    'Mobilização de Nervo Ulnar',
    'Relaxamento Progressivo de Jacobson',
    'Rolling com Foam Roller',
    'Alongamento de Tríceps por Trás',
    '4 Apoios (Four Point kneeling)'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM cervicalgia),
  e.id,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 1
    WHEN 'Respiração 4-7-8' THEN 2
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 3
    WHEN 'Alongamento de Rombóides na Parede' THEN 4
    WHEN 'Alongamento de Peitoral na Porta' THEN 5
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 6
    WHEN '4 Apoios (Four Point kneeling)' THEN 7
    WHEN 'Mobilização de Nervo Mediano (Tinel e Phalen)' THEN 8
    WHEN 'Mobilização de Nervo Ulnar' THEN 9
    WHEN 'Alongamento de Tríceps por Trás' THEN 10
    WHEN 'Relaxamento Progressivo de Jacobson' THEN 11
    WHEN 'Rolling com Foam Roller' THEN 12
  END,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 3
    WHEN 'Respiração 4-7-8' THEN 3
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 2
    WHEN 'Alongamento de Rombóides na Parede' THEN 2
    WHEN 'Alongamento de Peitoral na Porta' THEN 2
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 2
    WHEN '4 Apoios (Four Point kneeling)' THEN 2
    WHEN 'Mobilização de Nervo Mediano (Tinel e Phalen)' THEN 2
    WHEN 'Mobilização de Nervo Ulnar' THEN 2
    WHEN 'Alongamento de Tríceps por Trás' THEN 2
    WHEN 'Relaxamento Progressivo de Jacobson' THEN 1
    WHEN 'Rolling com Foam Roller' THEN 1
  END,
  NULL,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 10
    WHEN 'Respiração 4-7-8' THEN 5
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 30
    WHEN 'Alongamento de Rombóides na Parede' THEN 30
    WHEN 'Alongamento de Peitoral na Porta' THEN 30
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 10
    WHEN '4 Apoios (Four Point kneeling)' THEN 10
    WHEN 'Mobilização de Nervo Mediano (Tinel e Phalen)' THEN 30
    WHEN 'Mobilização de Nervo Ulnar' THEN 30
    WHEN 'Alongamento de Tríceps por Trás' THEN 30
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Evitar shrug compensatório.'
    WHEN 'Alongamento de Peitoral na Porta' THEN 'Cuidado com ombro instável.'
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Mobilizar cervical suavemente.'
    WHEN 'Mobilização de Nervo Mediano (Tinel e Phalen)' THEN 'Não provocar parestesia.'
    ELSE NULL
  END,
  NULL, NULL,
  CASE e.name
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Restaurar ritmo escapuloumeral reduz carga cervical.'
    WHEN 'Alongamento de Peitoral na Porta' THEN 'Peitoral encurtado puxa ombros anteriormente, sobrecarregando cervical.'
    WHEN 'Alongamento de Rombóides na Parede' THEN 'Rombóides fracos causam elevação escapular compensatória.'
    WHEN 'Respiração 4-7-8' THEN 'Técnica respiratória ativa sistema parassimpático, reduz tensão muscular.'
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Mobilização de coluna cervical e torácica integradas.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN ARRAY['Escápula', 'Serrátil Anterior', 'Trapézio Inferior']
    WHEN 'Alongamento de Peitoral na Porta' THEN ARRAY['Peitoral Maior', 'Peitoral Menor']
    WHEN 'Alongamento de Rombóides na Parede' THEN ARRAY['Rombóides', 'Deltóide Posterior']
    WHEN 'Gato-Vaca (Cat-Cow)' THEN ARRAY['Coluna Cervical', 'Coluna Torácica']
    WHEN '4 Apoios (Four Point kneeling)' THEN ARRAY['Core', 'Escápula', 'Trapézio']
    WHEN 'Mobilização de Nervo Mediano (Tinel e Phalen)' THEN ARRAY['Nervo Mediano', 'Flexores Punho']
    WHEN 'Mobilização de Nervo Ulnar' THEN ARRAY['Nervo Ulnar', 'Flexores Punho']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Restaurar ritmo escapuloumeral'
    WHEN 'Alongamento de Peitoral na Porta' THEN 'Liberar cadeia anterior'
    WHEN 'Alongamento de Rombóides na Parede' THEN 'Alongar posterior de ombro'
    WHEN 'Respiração 4-7-8' THEN 'Ativar parassimpático'
    ELSE NULL
  END
FROM exercises_cervicalgia e
WHERE EXISTS (SELECT 1 FROM cervicalgia);

-- ============================================================
-- HÉRNIA DE DISCO LOMBAR (MÉTODO MCKENZIE)
-- Referências: NCBI StatPearls (2023), Biomechanical Analysis (2025)
-- ============================================================

WITH hernia_disco AS (
  SELECT id FROM exercise_templates WHERE name = 'Hérnia de Disco Lombar' LIMIT 1
),
exercises_hernia AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Gato-Vaca (Cat-Cow)',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Prancha Abdominal (Plank)',
    'Dead Bug',
    'Respiração Diafragmática',
    'Alongamento de Isquiotibiais em Pé',
    'Alongamento de Psoas (Ilíaco)',
    'Mobilização de Coluna Thorácica com Foam Roller',
    'SLR com Dorsiflexão Automática',
    'Mobilização de Nervo Ciático (Slump)',
    '4 Apoios (Four Point kneeling)',
    'Bird-dog (Cachorro e Pássaro)',
    'Side Plank (Prancha Lateral)'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM hernia_disco),
  e.id,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 1
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 2
    WHEN '4 Apoios (Four Point kneeling)' THEN 3
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 4
    WHEN 'Dead Bug' THEN 5
    WHEN 'Ponte de Glúteo Bilateral' THEN 6
    WHEN 'Ponte de Glúteo Unilateral' THEN 7
    WHEN 'Prancha Abdominal (Plank)' THEN 8
    WHEN 'Side Plank (Prancha Lateral)' THEN 9
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 10
    WHEN 'Alongamento de Psoas (Ilíaco)' THEN 11
    WHEN 'SLR com Dorsiflexão Automática' THEN 12
    WHEN 'Mobilização de Nervo Ciático (Slump)' THEN 13
    WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 14
  END,
  CASE e.name
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 2
    WHEN 'Ponte de Glúteo Bilateral' THEN 3
    WHEN 'Ponte de Glúteo Unilateral' THEN 3
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 3
    WHEN 'Prancha Abdominal (Plank)' THEN 3
    WHEN 'Side Plank (Prancha Lateral)' THEN 3
    WHEN 'Dead Bug' THEN 3
    WHEN '4 Apoios (Four Point kneeling)' THEN 2
    WHEN 'Respiração Diafragmática' THEN 3
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
    WHEN 'Alongamento de Psoas (Ilíaco)' THEN 2
    WHEN 'SLR com Dorsiflexão Automática' THEN 2
    WHEN 'Mobilização de Nervo Ciático (Slump)' THEN 2
    WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 2
  END,
  CASE e.name
    WHEN 'Ponte de Glúteo Bilateral' THEN 10
    WHEN 'Ponte de Glúteo Unilateral' THEN 10
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 12
    WHEN 'Prancha Abdominal (Plank)' THEN 30
    WHEN 'Side Plank (Prancha Lateral)' THEN 30
    WHEN 'Dead Bug' THEN 12
    WHEN '4 Apoios (Four Point kneeling)' THEN 10
    WHEN 'Respiração Diafragmática' THEN 10
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 10
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 30
    WHEN 'Side Plank (Prancha Lateral)' THEN 30
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 10
    WHEN '4 Apoios (Four Point kneeling)' THEN 10
    WHEN 'Respiração Diafragmática' THEN 10
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
    WHEN 'Alongamento de Psoas (Ilíaco)' THEN 30
    WHEN 'SLR com Dorsiflexão Automática' THEN 30
    WHEN 'Mobilização de Nervo Ciático (Slump)' THEN 30
    WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 2
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Monitorar centralização vs peripheralização.'
    WHEN 'SLR com Dorsiflexão Automática' THEN 'Se peripheralizar, PARAR imediatamente.'
    WHEN 'Mobilização de Nervo Ciático (Slump)' THEN 'Apenas se não houver sinal de Lasegue agudo.'
    WHEN 'Dead Bug' THEN 'Manter lombar no chão (neutral).'
    ELSE NULL
  END,
  NULL, NULL,
  CASE e.name
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Mobilização em extensão é evidenciada para hérnias discais (respondedores).'
    WHEN 'Ponte de Glúteo Bilateral' THEN 'Glúteo suporta coluna e reduz compressão discal.'
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 'Multífido estabiliza segmentos vertebrais reduzindo micro-movimentos patológicos.'
    WHEN 'Dead Bug' THEN 'Core estabilizador reduz carga discal em atividades funcionais.'
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 'Encurtamento de isquiotibiais aumenta pressão discal.'
    WHEN 'Mobilização de Nervo Ciático (Slump)' THEN 'Mobilização neural reduz aderências e melhora sintomatologia radicular.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Gato-Vaca (Cat-Cow)' THEN ARRAY['Coluna Lombar', 'Eretores Espinhais', 'Multífido']
    WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais', 'Eretores Espinhais']
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN ARRAY['Multífido', 'Transverso Abdômen', 'Core']
    WHEN 'Dead Bug' THEN ARRAY['Transverso Abdômen', 'Core', 'Lombar']
    WHEN 'Side Plank (Prancha Lateral)' THEN ARRAY['Oblíquos', 'Quadrado Lombar', 'Core']
    WHEN 'Prancha Abdominal (Plank)' THEN ARRAY['Transverso Abdômen', 'Reto Abdominal', 'Core']
    WHEN 'SLR com Dorsiflexão Automática' THEN ARRAY['Isquiotibiais', 'Nervo Ciático']
    WHEN 'Mobilização de Nervo Ciático (Slump)' THEN ARRAY['Nervo Ciático', 'Coluna Lombar']
    WHEN '4 Apoios (Four Point kneeling)' THEN ARRAY['Core', 'Multífido']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Mobilização extensão (McKenzie)'
    WHEN 'Ponte de Glúteo Bilateral' THEN 'Suporte lombar via glúteo'
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 'Estabilização segmentar'
    WHEN 'Dead Bug' THEN 'Core estabilizador dinâmico'
    WHEN 'Mobilização de Nervo Ciático (Slump)' THEN 'Mobilização neural'
    ELSE NULL
  END
FROM exercises_hernia e
WHERE EXISTS (SELECT 1 FROM hernia_disco);

-- ============================================================
-- ENTORSE DE TORNOZELO - FASE AGUDA
-- Referências: Mass General Hospital, PMC (2017, 2012)
-- ============================================================

WITH entorse_aguda AS (
  SELECT id FROM exercise_templates WHERE name = 'Entorse de Tornozelo - Fase Aguda' LIMIT 1
),
exercises_entorse_aguda AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Mobilização de Tornozelo em DF',
    'Alongamento de Panturrilha na Parede',
    'Alongamento de Panturrilha Sentado (Sóleo)',
    'Respiração Diafragmática',
    'Sit-to-Stand',
    'Tandem Walk (Caminhada em Tandem)',
    'Mobilização de Nervo Ciático (Slump)'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM entorse_aguda),
  e.id,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 1
    WHEN 'Mobilização de Tornozelo em DF' THEN 2
    WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 3
    WHEN 'Alongamento de Panturrilha na Parede' THEN 4
    WHEN 'Sit-to-Stand' THEN 5
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 6
    WHEN 'Mobilização de Nervo Ciático (Slump)' THEN 7
  END,
  CASE e.name
    WHEN 'Mobilização de Tornozelo em DF' THEN 2
    WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 2
    WHEN 'Alongamento de Panturrilha na Parede' THEN 2
    WHEN 'Respiração Diafragmática' THEN 3
    WHEN 'Sit-to-Stand' THEN 3
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 2
    WHEN 'Mobilização de Nervo Ciático (Slump)' THEN 2
  END,
  NULL,
  CASE e.name
    WHEN 'Mobilização de Tornozelo em DF' THEN 30
    WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 30
    WHEN 'Alongamento de Panturrilha na Parede' THEN 30
    WHEN 'Respiração Diafragmática' THEN 10
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 60
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Mobilização de Tornozelo em DF' THEN 'Dor leve é aceitável. Não forçar.'
    WHEN 'Sit-to-Stand' THEN 'Usar apoio se necessário.'
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 'Progredir conforme tolerância.'
    ELSE NULL
  END,
  0, 1,
  CASE e.name
    WHEN 'Mobilização de Tornozelo em DF' THEN 'Dorsiflexão é essencial para marcha normal e prevenir contractura.'
    WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 'Sóleo encurtado causa limitação de dorsiflexão crônica.'
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 'Propriocepção básica iniciada precocemente acelera recuperação.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Mobilização de Tornozelo em DF' THEN ARRAY['Tornozelo', 'Tíbio Társica']
    WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN ARRAY['Sóleo']
    WHEN 'Alongamento de Panturrilha na Parede' THEN ARRAY['Gastrocnêmio']
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN ARRAY['Tornozelo', 'Core', 'Proprioceptores']
    WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos', 'Core']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Mobilização de Tornozelo em DF' THEN 'Manter dorsiflexão funcional'
    WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 'Prevenir contractura de sóleo'
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 'Propriocepção básica'
    ELSE NULL
  END
FROM exercises_entorse_aguda e
WHERE EXISTS (SELECT 1 FROM entorse_aguda);

-- ============================================================
-- ENTORSE DE TORNOZELO - FORTALECIMENTO
-- Referências: PMC5737043 (2017), Sanford Health, JOSPT (2021)
-- ============================================================

WITH entorse_fort AS (
  SELECT id FROM exercise_templates WHERE name = 'Entorse de Tornozelo - Fortalecimento' LIMIT 1
),
exercises_entorse_fort AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Elevação de Panturrilha em Pé',
    'Elevação de Panturrilha Sentado',
    'Equilíbrio Unipodal Solo',
    'Single Leg Stance com Movimento de Braço',
    'Equilíbrio em Disco Instável',
    'Agachamento em Disco Instável',
    'BOSU Ball Squat',
    'Tandem Walk (Caminhada em Tandem)',
    'Star Excursion Balance Test (SEBT)',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Monster Walk (Caminhada Monster)',
    'Clamshell (Concha)',
    'Abdução de Quadril em Pé',
    'Step Up',
    'Step Down',
    'Respiração Diafragmática',
    'Prancha Abdominal (Plank)',
    'Dead Bug'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM entorse_fort),
  e.id,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 1
    WHEN 'Prancha Abdominal (Plank)' THEN 2
    WHEN 'Dead Bug' THEN 3
    WHEN 'Ponte de Glúteo Bilateral' THEN 4
    WHEN 'Clamshell (Concha)' THEN 5
    WHEN 'Ponte de Glúteo Unilateral' THEN 6
    WHEN 'Abdução de Quadril em Pé' THEN 7
    WHEN 'Monster Walk (Caminhada Monster)' THEN 8
    WHEN 'Elevação de Panturrilha Sentado' THEN 9
    WHEN 'Elevação de Panturrilha em Pé' THEN 10
    WHEN 'Equilíbrio Unipodal Solo' THEN 11
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 12
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 13
    WHEN 'Equilíbrio em Disco Instável' THEN 14
    WHEN 'Agachamento em Disco Instável' THEN 15
    WHEN 'BOSU Ball Squat' THEN 16
    WHEN 'Star Excursion Balance Test (SEBT)' THEN 17
    WHEN 'Step Up' THEN 18
    WHEN 'Step Down' THEN 19
  END,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 3
    WHEN 'Prancha Abdominal (Plank)' THEN 3
    WHEN 'Dead Bug' THEN 3
    WHEN 'Ponte de Glúteo Bilateral' THEN 3
    WHEN 'Clamshell (Concha)' THEN 3
    WHEN 'Ponte de Glúteo Unilateral' THEN 3
    WHEN 'Abdução de Quadril em Pé' THEN 3
    WHEN 'Monster Walk (Caminhada Monster)' THEN 3
    WHEN 'Elevação de Panturrilha Sentado' THEN 3
    WHEN 'Elevação de Panturrilha em Pé' THEN 3
    WHEN 'Equilíbrio Unipodal Solo' THEN 3
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 3
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 2
    WHEN 'Equilíbrio em Disco Instável' THEN 3
    WHEN 'Agachamento em Disco Instável' THEN 3
    WHEN 'BOSU Ball Squat' THEN 3
    WHEN 'Star Excursion Balance Test (SEBT)' THEN 3
    WHEN 'Step Up' THEN 3
    WHEN 'Step Down' THEN 3
  END,
  CASE e.name
    WHEN 'Elevação de Panturrilha em Pé' THEN 20
    WHEN 'Elevação de Panturrilha Sentado' THEN 20
    WHEN 'Equilíbrio Unipodal Solo' THEN 60
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 60
    WHEN 'Equilíbrio em Disco Instável' THEN 45
    WHEN 'Agachamento em Disco Instável' THEN 15
    WHEN 'BOSU Ball Squat' THEN 15
    WHEN 'Star Excursion Balance Test (SEBT)' THEN 8
    WHEN 'Ponte de Glúteo Bilateral' THEN 10
    WHEN 'Ponte de Glúteo Unilateral' THEN 10
    WHEN 'Clamshell (Concha)' THEN 15
    WHEN 'Monster Walk (Caminhada Monster)' THEN 20
    WHEN 'Abdução de Quadril em Pé' THEN 15
    WHEN 'Step Up' THEN 15
    WHEN 'Step Down' THEN 15
    WHEN 'Prancha Abdominal (Plank)' THEN 45
    WHEN 'Dead Bug' THEN 12
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 45
    WHEN 'Equilíbrio Unipodal Solo' THEN 60
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 60
    WHEN 'Equilíbrio em Disco Instável' THEN 45
    WHEN 'Star Excursion Balance Test (SEBT)' THEN 8
    WHEN 'Respiração Diafragmática' THEN 10
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 60
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Equilíbrio Unipodal Solo' THEN 'Progredir: olhos abertos → olhos fechados.'
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 'Dual-task aumenta dificuldade.'
    WHEN 'Star Excursion Balance Test (SEBT)' THEN 'Medir alcance em 8 direções.'
    WHEN 'Step Down' THEN 'Monitorar valgo de tornozelo/joelho.'
    ELSE NULL
  END,
  NULL, NULL,
  CASE e.name
    WHEN 'Equilíbrio Unipodal Solo' THEN 'Propriocepção é cornerstone para prevenir recidivas de entorse.'
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 'Propriocepção avançada com dual-task simula atividade funcional.'
    WHEN 'Star Excursion Balance Test (SEBT)' THEN 'Teste validado para identificar déficits de propriocepção.'
    WHEN 'Equilíbrio em Disco Instável' THEN 'Treino em superfície instável melhora resposta neuromuscular.'
    WHEN 'Elevação de Panturrilha em Pé' THEN 'Força de panturrilha é essencial para estabilidade de tornozelo.'
    WHEN 'Monster Walk (Caminhada Monster)' THEN 'Fortalecimento de fibulares é chave para estabilidade lateral.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Equilíbrio Unipodal Solo' THEN ARRAY['Tornozelo', 'Panturrilha', 'Core', 'Proprioceptores']
    WHEN 'Single Leg Stance com Movimento de Braço' THEN ARRAY['Tornozelo', 'Core', 'Proprioceptores', 'Sistema Vestibular']
    WHEN 'Equilíbrio em Disco Instável' THEN ARRAY['Tornozelo', 'Joelho', 'Core', 'Proprioceptores']
    WHEN 'Agachamento em Disco Instável' THEN ARRAY['MMII', 'Core', 'Proprioceptores']
    WHEN 'BOSU Ball Squat' THEN ARRAY['Joelho', 'Tornozelo', 'Core', 'Proprioceptores']
    WHEN 'Star Excursion Balance Test (SEBT)' THEN ARRAY['Joelho', 'Tornozelo', 'Core', 'Proprioceptores']
    WHEN 'Elevação de Panturrilha em Pé' THEN ARRAY['Gastrocnêmio', 'Sóleo']
    WHEN 'Elevação de Panturrilha Sentado' THEN ARRAY['Sóleo']
    WHEN 'Monster Walk (Caminhada Monster)' THEN ARRAY['Glúteo Médio', 'Fibulares']
    WHEN 'Clamshell (Concha)' THEN ARRAY['Glúteo Médio']
    WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo']
    WHEN 'Step Down' THEN ARRAY['Quadríceps', 'Glúteo Médio', 'Tornozelo']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Equilíbrio Unipodal Solo' THEN 'Propriocepção básica'
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 'Propriocepção avançada'
    WHEN 'Star Excursion Balance Test (SEBT)' THEN 'Teste funcional de propriocepção'
    WHEN 'Equilíbrio em Disco Instável' THEN 'Propriocepção instável'
    WHEN 'Elevação de Panturrilha em Pé' THEN 'Força panturrilha'
    WHEN 'Monster Walk (Caminhada Monster)' THEN 'Estabilizadores laterais'
    ELSE NULL
  END
FROM exercises_entorse_fort e
WHERE EXISTS (SELECT 1 FROM entorse_fort);

-- ============================================================
-- FASCITE PLANTAR
-- Referências: PMC (2024), RACGP (2021)
-- ============================================================

WITH fascite_plantar AS (
  SELECT id FROM exercise_templates WHERE name = 'Fascite Plantar' LIMIT 1
),
exercises_fascite AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Alongamento de Panturrilha na Parede',
    'Alongamento de Panturrilha Sentado (Sóleo)',
    'Mobilização de Tornozelo em DF',
    'Elevação de Panturrilha em Pé',
    'Elevação de Panturrilha Sentado',
    'Alongamento de Isquiotibiais em Pé',
    'Ponte de Glúteo Bilateral',
    'Rolling com Foam Roller',
    'Mobilização de Coluna Thorácica com Foam Roller'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM fascite_plantar),
  e.id,
  CASE e.name
    WHEN 'Mobilização de Tornozelo em DF' THEN 1
    WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 2
    WHEN 'Alongamento de Panturrilha na Parede' THEN 3
    WHEN 'Elevação de Panturrilha Sentado' THEN 4
    WHEN 'Elevação de Panturrilha em Pé' THEN 5
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 6
    WHEN 'Ponte de Glúteo Bilateral' THEN 7
    WHEN 'Rolling com Foam Roller' THEN 8
    WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 9
  END,
  CASE e.name
    WHEN 'Mobilização de Tornozelo em DF' THEN 2
    WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 2
    WHEN 'Alongamento de Panturrilha na Parede' THEN 2
    WHEN 'Elevação de Panturrilha Sentado' THEN 2
    WHEN 'Elevação de Panturrilha em Pé' THEN 2
    WHEN 'Ponte de Glúteo Bilateral' THEN 2
    WHEN 'Rolling com Foam Roller' THEN 1
    WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 1
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
  END,
  NULL,
  CASE e.name
    WHEN 'Mobilização de Tornozelo em DF' THEN 30
    WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 30
    WHEN 'Alongamento de Panturrilha na Parede' THEN 30
    WHEN 'Elevação de Panturrilha Sentado' THEN 10
    WHEN 'Elevação de Panturrilha em Pé' THEN 15
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
    WHEN 'Ponte de Glúteo Bilateral' THEN 10
    WHEN 'Rolling com Foam Roller' THEN 60
    WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 2
  END,
  CASE e.name
    WHEN 'Mobilização de Tornozelo em DF' THEN 'Dor leve é aceitável. Manter 30s.'
    WHEN 'Alongamento de Panturrilha na Parede' THEN 'Alongar gastrocnêmio é essencial.'
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 'Cadeia posterior conecta fascia plantar.'
    ELSE NULL
  END,
  NULL, NULL,
  CASE e.name
    WHEN 'Alongamento de Panturrilha na Parede' THEN 'Gastrocnêmio encurtado aumenta tensão na fáscia plantar via cadeia posterior.'
    WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 'Sóleo é frequentemente negligenciado mas crítico para fascite plantar.'
    WHEN 'Mobilização de Tornozelo em DF' THEN 'Limitação de dorsiflexão está fortemente associada à fascite plantar.'
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 'Cadeia posterior contínua da fáscia plantar até occipital.'
    WHEN 'Elevação de Panturrilha Sentado' THEN 'Fortalecimento excêntrico de sóleo tem evidência para fascite plantar.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Mobilização de Tornozelo em DF' THEN ARRAY['Tornozelo', 'Fáscia Plantar', 'Tendão Aquiles']
    WHEN 'Alongamento de Panturrilha na Parede' THEN ARRAY['Gastrocnêmio', 'Fáscia Plantar']
    WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN ARRAY['Sóleo', 'Fáscia Plantar']
    WHEN 'Elevação de Panturrilha em Pé' THEN ARRAY['Gastrocnêmio', 'Sóleo']
    WHEN 'Elevação de Panturrilha Sentado' THEN ARRAY['Sóleo']
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN ARRAY['Isquiotibiais', 'Cadeia Posterior']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Mobilização de Tornozelo em DF' THEN 'Restaurar dorsiflexão'
    WHEN 'Alongamento de Panturrilha na Parede' THEN 'Alongar gastrocnêmio'
    WHEN 'Alongamento de Panturrilha Sentado (Sóleo)' THEN 'Alongar sóleo'
    WHEN 'Elevação de Panturrilha Sentado' THEN 'Fortalecer sóleo'
    ELSE NULL
  END
FROM exercises_fascite e
WHERE EXISTS (SELECT 1 FROM fascite_plantar);

-- ============================================================
-- TENDINOPATIA PATELAR (PROGRAMA EXCÊNTRICO)
-- Referências: Physio-pedia PFPS, JOSPT (2014), BJSM (2023)
-- ============================================================

WITH tendinopatia_patelar AS (
  SELECT id FROM exercise_templates WHERE name = 'Tendinopatia Patelar' LIMIT 1
),
exercises_tendinopatia AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Agachamento Parede (Wall Sit)',
    'Leg Press 45°',
    'Step Down',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Clamshell (Concha)',
    'Monster Walk (Caminhada Monster)',
    'Abdução de Quadril em Pé',
    'Alongamento de Quadríceps em Pé',
    'Alongamento de Isquiotibiais em Pé',
    'Alongamento de Panturrilha na Parede',
    'Prancha Abdominal (Plank)',
    'Side Plank (Prancha Lateral)',
    'Dead Bug'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM tendinopatia_patelar),
  e.id,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 1
    WHEN 'Dead Bug' THEN 2
    WHEN 'Side Plank (Prancha Lateral)' THEN 3
    WHEN 'Ponte de Glúteo Bilateral' THEN 4
    WHEN 'Clamshell (Concha)' THEN 5
    WHEN 'Ponte de Glúteo Unilateral' THEN 6
    WHEN 'Abdução de Quadril em Pé' THEN 7
    WHEN 'Monster Walk (Caminhada Monster)' THEN 8
    WHEN 'Agachamento Parede (Wall Sit)' THEN 9
    WHEN 'Leg Press 45°' THEN 10
    WHEN 'Step Down' THEN 11
    WHEN 'Alongamento de Quadríceps em Pé' THEN 12
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 13
    WHEN 'Alongamento de Panturrilha na Parede' THEN 14
  END,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 3
    WHEN 'Dead Bug' THEN 3
    WHEN 'Side Plank (Prancha Lateral)' THEN 3
    WHEN 'Ponte de Glúteo Bilateral' THEN 3
    WHEN 'Clamshell (Concha)' THEN 3
    WHEN 'Ponte de Glúteo Unilateral' THEN 3
    WHEN 'Abdução de Quadril em Pé' THEN 3
    WHEN 'Monster Walk (Caminhada Monster)' THEN 3
    WHEN 'Agachamento Parede (Wall Sit)' THEN 3
    WHEN 'Leg Press 45°' THEN 3
    WHEN 'Step Down' THEN 3
    WHEN 'Alongamento de Quadríceps em Pé' THEN 2
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
    WHEN 'Alongamento de Panturrilha na Parede' THEN 2
  END,
  CASE e.name
    WHEN 'Agachamento Parede (Wall Sit)' THEN 60
    WHEN 'Leg Press 45°' THEN 15
    WHEN 'Step Down' THEN 15
    WHEN 'Ponte de Glúteo Bilateral' THEN 10
    WHEN 'Ponte de Glúteo Unilateral' THEN 10
    WHEN 'Clamshell (Concha)' THEN 15
    WHEN 'Monster Walk (Caminhada Monster)' THEN 20
    WHEN 'Abdução de Quadril em Pé' THEN 15
    WHEN 'Prancha Abdominal (Plank)' THEN 45
    WHEN 'Side Plank (Prancha Lateral)' THEN 30
    WHEN 'Dead Bug' THEN 12
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 45
    WHEN 'Side Plank (Prancha Lateral)' THEN 30
    WHEN 'Agachamento Parede (Wall Sit)' THEN 60
    WHEN 'Respiração Diafragmática' THEN 10
    WHEN 'Alongamento de Quadríceps em Pé' THEN 30
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
    WHEN 'Alongamento de Panturrilha na Parede' THEN 30
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Agachamento Parede (Wall Sit)' THEN 'Essencial: Decline Squat (superfície inclinada) é melhor isolamento.'
    WHEN 'Step Down' THEN 'Monitorar valgo dinâmico e dor anterior.'
    WHEN 'Leg Press 45°' THEN 'Arco 0-45° é mais seguro para tendão patelar.'
    ELSE NULL
  END,
  NULL, NULL,
  CASE e.name
    WHEN 'Agachamento Parede (Wall Sit)' THEN 'Isometria longo prazo evidenciado para tendinopatia. Decline surface é ideal.'
    WHEN 'Step Down' THEN 'Controle motor excêntrico de quadríceps em cadeia fechada.'
    WHEN 'Ponte de Glúteo Unilateral' THEN 'Glúteo médio reduz valgo dinâmico que sobrecarga patela.'
    WHEN 'Leg Press 45°' THEN 'Cadeia fechada com arco limitado reduz carga patelar vs CCA.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Agachamento Parede (Wall Sit)' THEN ARRAY['Quadríceps', 'Vasto Medial', 'Tendão Patelar']
    WHEN 'Leg Press 45°' THEN ARRAY['Quadríceps', 'Glúteos']
    WHEN 'Step Down' THEN ARRAY['Quadríceps', 'Glúteo Médio', 'Tendão Patelar']
    WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo']
    WHEN 'Clamshell (Concha)' THEN ARRAY['Glúteo Médio']
    WHEN 'Monster Walk (Caminhada Monster)' THEN ARRAY['Glúteos', 'Tensor Fascia Lata']
    WHEN 'Abdução de Quadril em Pé' THEN ARRAY['Glúteo Médio']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Agachamento Parede (Wall Sit)' THEN 'Isometria longo prazo (Decline Squat ideal)'
    WHEN 'Step Down' THEN 'Excêntrico cadeia fechada'
    WHEN 'Leg Press 45°' THEN 'Fortalecimento cadeia fechada'
    WHEN 'Ponte de Glúteo Unilateral' THEN 'Controle valgo dinâmico'
    ELSE NULL
  END
FROM exercises_tendinopatia e
WHERE EXISTS (SELECT 1 FROM tendinopatia_patelar);

-- ============================================================
-- BURSITE TROCANTÉRICA
-- Referências: E3 Rehab, Dr Jeffrey Peng, MyHealth Alberta
-- ============================================================

WITH bursite_trocanterica AS (
  SELECT id FROM exercise_templates WHERE name = 'Bursite Trocantérica' LIMIT 1
),
exercises_bursite AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Clamshell (Concha)',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Abdução de Quadril em Pé',
    'Monster Walk (Caminhada Monster)',
    'Alongamento de Glúteo Supino',
    'Alongamento de Isquiotibiais em Pé',
    'Alongamento de Psoas (Ilíaco)',
    'Prancha Abdominal (Plank)',
    'Side Plank (Prancha Lateral)',
    'Dead Bug',
    'Rolling com Foam Roller'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM bursite_trocanterica),
  e.id,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 1
    WHEN 'Dead Bug' THEN 2
    WHEN 'Side Plank (Prancha Lateral)' THEN 3
    WHEN 'Ponte de Glúteo Bilateral' THEN 4
    WHEN 'Clamshell (Concha)' THEN 5
    WHEN 'Ponte de Glúteo Unilateral' THEN 6
    WHEN 'Abdução de Quadril em Pé' THEN 7
    WHEN 'Monster Walk (Caminhada Monster)' THEN 8
    WHEN 'Alongamento de Glúteo Supino' THEN 9
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 10
    WHEN 'Alongamento de Psoas (Ilíaco)' THEN 11
    WHEN 'Rolling com Foam Roller' THEN 12
  END,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 3
    WHEN 'Dead Bug' THEN 3
    WHEN 'Side Plank (Prancha Lateral)' THEN 3
    WHEN 'Ponte de Glúteo Bilateral' THEN 3
    WHEN 'Clamshell (Concha)' THEN 3
    WHEN 'Ponte de Glúteo Unilateral' THEN 3
    WHEN 'Abdução de Quadril em Pé' THEN 3
    WHEN 'Monster Walk (Caminhada Monster)' THEN 3
    WHEN 'Alongamento de Glúteo Supino' THEN 2
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
    WHEN 'Alongamento de Psoas (Ilíaco)' THEN 2
    WHEN 'Rolling com Foam Roller' THEN 1
  END,
  CASE e.name
    WHEN 'Ponte de Glúteo Bilateral' THEN 10
    WHEN 'Ponte de Glúteo Unilateral' THEN 10
    WHEN 'Clamshell (Concha)' THEN 15
    WHEN 'Monster Walk (Caminhada Monster)' THEN 20
    WHEN 'Abdução de Quadril em Pé' THEN 15
    WHEN 'Prancha Abdominal (Plank)' THEN 45
    WHEN 'Side Plank (Prancha Lateral)' THEN 30
    WHEN 'Dead Bug' THEN 12
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 45
    WHEN 'Side Plank (Prancha Lateral)' THEN 30
    WHEN 'Alongamento de Glúteo Supino' THEN 30
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
    WHEN 'Alongamento de Psoas (Ilíaco)' THEN 30
    WHEN 'Rolling com Foam Roller' THEN 60
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Clamshell (Concha)' THEN 'Evitar shrug compensatório ou rotação de tronco.'
    WHEN 'Ponte de Glúteo Unilateral' THEN 'Se houver dor trocantérica, usar bilateral primeiro.'
    WHEN 'Rolling com Foam Roller' THEN 'Evitar rolar diretamente sobre trocânter.'
    ELSE NULL
  END,
  NULL, NULL,
  CASE e.name
    WHEN 'Clamshell (Concha)' THEN 'Glúteo médio é essencial para reduzir compressão trocantérica.'
    WHEN 'Ponte de Glúteo Unilateral' THEN 'Glúteo máximo suporta pélvis e reduz impacto na bursa.'
    WHEN 'Monster Walk (Caminhada Monster)' THEN 'Fortalecimento funcional de glúteo médio em padrão de marcha.'
    WHEN 'Abdução de Quadril em Pé' THEN 'Abdução em pé é mais funcional que deitado.'
    WHEN 'Side Plank (Prancha Lateral)' THEN 'Oblíquos e quadrado lombar contribuem para estabilidade pélvica.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Clamshell (Concha)' THEN ARRAY['Glúteo Médio']
    WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo']
    WHEN 'Monster Walk (Caminhada Monster)' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo']
    WHEN 'Abdução de Quadril em Pé' THEN ARRAY['Glúteo Médio', 'Tensor Fascia Lata']
    WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais']
    WHEN 'Side Plank (Prancha Lateral)' THEN ARRAY['Oblíquos', 'Quadrado Lombar', 'Glúteo Médio']
    WHEN 'Prancha Abdominal (Plank)' THEN ARRAY['Core', 'Glúteos']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Clamshell (Concha)' THEN 'Glúteo médio isolado'
    WHEN 'Ponte de Glúteo Unilateral' THEN 'Glúteo máximo funcional'
    WHEN 'Monster Walk (Caminhada Monster)' THEN 'Glúteo médio funcional'
    WHEN 'Abdução de Quadril em Pé' THEN 'Abdução funcional em pé'
    ELSE NULL
  END
FROM exercises_bursite e
WHERE EXISTS (SELECT 1 FROM bursite_trocanterica);

-- ============================================================
-- ARTROSE DE JOELHO
-- Referências: AAOS Guidelines, Quadriceps strengthening systematic review, Cochrane Review
-- ============================================================

WITH artrose_joelho AS (
  SELECT id FROM exercise_templates WHERE name = 'Artrose de Joelho' LIMIT 1
),
exercises_artrose AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Agachamento Parede (Wall Sit)',
    'Leg Press 45°',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Alongamento de Quadríceps em Pé',
    'Alongamento de Isquiotibiais em Pé',
    'Alongamento de Panturrilha na Parede',
    'Elevação de Panturrilha em Pé',
    'Sit-to-Stand',
    'Step Up',
    'Step Down',
    'Prancha Abdominal (Plank)',
    'Dead Bug',
    '4 Apoios (Four Point kneeling)',
    'Respiração Diafragmática'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM artrose_joelho),
  e.id,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 1
    WHEN '4 Apoios (Four Point kneeling)' THEN 2
    WHEN 'Prancha Abdominal (Plank)' THEN 3
    WHEN 'Dead Bug' THEN 4
    WHEN 'Ponte de Glúteo Bilateral' THEN 5
    WHEN 'Ponte de Glúteo Unilateral' THEN 6
    WHEN 'Agachamento Parede (Wall Sit)' THEN 7
    WHEN 'Leg Press 45°' THEN 8
    WHEN 'Elevação de Panturrilha em Pé' THEN 9
    WHEN 'Sit-to-Stand' THEN 10
    WHEN 'Step Up' THEN 11
    WHEN 'Step Down' THEN 12
    WHEN 'Alongamento de Quadríceps em Pé' THEN 13
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 14
    WHEN 'Alongamento de Panturrilha na Parede' THEN 15
  END,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 3
    WHEN '4 Apoios (Four Point kneeling)' THEN 2
    WHEN 'Prancha Abdominal (Plank)' THEN 3
    WHEN 'Dead Bug' THEN 3
    WHEN 'Ponte de Glúteo Bilateral' THEN 3
    WHEN 'Ponte de Glúteo Unilateral' THEN 3
    WHEN 'Agachamento Parede (Wall Sit)' THEN 3
    WHEN 'Leg Press 45°' THEN 3
    WHEN 'Elevação de Panturrilha em Pé' THEN 3
    WHEN 'Sit-to-Stand' THEN 3
    WHEN 'Step Up' THEN 3
    WHEN 'Step Down' THEN 3
    WHEN 'Alongamento de Quadríceps em Pé' THEN 2
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
    WHEN 'Alongamento de Panturrilha na Parede' THEN 2
  END,
  CASE e.name
    WHEN 'Agachamento Parede (Wall Sit)' THEN 45
    WHEN 'Leg Press 45°' THEN 15
    WHEN 'Elevação de Panturrilha em Pé' THEN 20
    WHEN 'Ponte de Glúteo Bilateral' THEN 10
    WHEN 'Ponte de Glúteo Unilateral' THEN 10
    WHEN 'Sit-to-Stand' THEN 15
    WHEN 'Step Up' THEN 15
    WHEN 'Step Down' THEN 15
    WHEN 'Prancha Abdominal (Plank)' THEN 30
    WHEN 'Dead Bug' THEN 12
    WHEN '4 Apoios (Four Point kneeling)' THEN 10
    WHEN 'Respiração Diafragmática' THEN 10
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Agachamento Parede (Wall Sit)' THEN 30
    WHEN 'Prancha Abdominal (Plank)' THEN 30
    WHEN 'Respiração Diafragmática' THEN 10
    WHEN 'Alongamento de Quadríceps em Pé' THEN 30
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
    WHEN 'Alongamento de Panturrilha na Parede' THEN 30
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Agachamento Parede (Wall Sit)' THEN 'Respeitar limite de dor. 45° é seguro.'
    WHEN 'Sit-to-Stand' THEN 'Progressão: usar mãos → sem mãos.'
    WHEN 'Leg Press 45°' THEN 'Arco limitado conforme dor. Não forçar.'
    WHEN 'Step Up' THEN 'Subir com afetado, descer com sadio se necessário.'
    ELSE NULL
  END,
  NULL, NULL,
  CASE e.name
    WHEN 'Agachamento Parede (Wall Sit)' THEN 'Isometria de quadríceps é cornerstone para artrose de joelho.'
    WHEN 'Leg Press 45°' THEN 'Cadeia fechada reduz carga patelar vs CCA.'
    WHEN 'Ponte de Glúteo Bilateral' THEN 'Glúteo suporta joelho em atividades funcionais.'
    WHEN 'Elevação de Panturrilha em Pé' THEN 'Fortalecimento de MMII sem impacto no joelho.'
    WHEN 'Sit-to-Stand' THEN 'Funcionalidade básica essencial para independência.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Agachamento Parede (Wall Sit)' THEN ARRAY['Quadríceps']
    WHEN 'Leg Press 45°' THEN ARRAY['Quadríceps', 'Glúteos']
    WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais']
    WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo']
    WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos', 'Core']
    WHEN 'Step Up' THEN ARRAY['Quadríceps', 'Glúteos']
    WHEN 'Step Down' THEN ARRAY['Quadríceps', 'Glúteo Médio']
    WHEN 'Elevação de Panturrilha em Pé' THEN ARRAY['Gastrocnêmio', 'Sóleo']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Agachamento Parede (Wall Sit)' THEN 'Isometria quadríceps'
    WHEN 'Leg Press 45°' THEN 'Fortalecimento cadeia fechada'
    WHEN 'Ponte de Glúteo Bilateral' THEN 'Suporte glúteo'
    WHEN 'Sit-to-Stand' THEN 'Funcionalidade básica'
    ELSE NULL
  END
FROM exercises_artrose e
WHERE EXISTS (SELECT 1 FROM artrose_joelho);

-- ============================================================
-- FIBROMIALGIA - AERÓBICO LEVE
-- Referências: EULAR recommendations, Systematic review, Graded exercise
-- ============================================================

WITH fibromialgia AS (
  SELECT id FROM exercise_templates WHERE name = 'Fibromialgia - Aeróbico Leve' LIMIT 1
),
exercises_fibromialgia AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Respiração Diafragmática',
    'Respiração 4-7-8',
    'Respiração com Labios Franzidos (Pursed Lip)',
    'Respiração Costal Inferior',
    'Relaxamento Progressivo de Jacobson',
    'Gato-Vaca (Cat-Cow)',
    'Rolling com Foam Roller',
    'Stretching Global Ativo',
    'Tandem Walk (Caminhada em Tandem)',
    'Sit-to-Stand',
    'Ponte de Glúteo Bilateral',
    'Alongamento de Isquiotibiais em Pé',
    'Alongamento de Panturrilha na Parede',
    'Mobilização de Coluna Thorácica com Foam Roller',
    'Huff Cough',
    'Espirometria Incentivada'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM fibromialgia),
  e.id,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 1
    WHEN 'Respiração 4-7-8' THEN 2
    WHEN 'Respiração com Labios Franzidos (Pursed Lip)' THEN 3
    WHEN 'Relaxamento Progressivo de Jacobson' THEN 4
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 5
    WHEN 'Ponte de Glúteo Bilateral' THEN 6
    WHEN 'Sit-to-Stand' THEN 7
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 8
    WHEN 'Respiração Costal Inferior' THEN 9
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 10
    WHEN 'Alongamento de Panturrilha na Parede' THEN 11
    WHEN 'Rolling com Foam Roller' THEN 12
    WHEN 'Stretching Global Ativo' THEN 13
    WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 14
    WHEN 'Huff Cough' THEN 15
    WHEN 'Espirometria Incentivada' THEN 16
  END,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 3
    WHEN 'Respiração 4-7-8' THEN 3
    WHEN 'Respiração com Labios Franzidos (Pursed Lip)' THEN 3
    WHEN 'Relaxamento Progressivo de Jacobson' THEN 1
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 2
    WHEN 'Ponte de Glúteo Bilateral' THEN 2
    WHEN 'Sit-to-Stand' THEN 2
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 2
    WHEN 'Respiração Costal Inferior' THEN 3
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
    WHEN 'Alongamento de Panturrilha na Parede' THEN 2
    WHEN 'Rolling com Foam Roller' THEN 1
    WHEN 'Stretching Global Ativo' THEN 1
    WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 1
    WHEN 'Huff Cough' THEN 3
    WHEN 'Espirometria Incentivada' THEN 3
  END,
  NULL,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 10
    WHEN 'Respiração 4-7-8' THEN 5
    WHEN 'Respiração com Labios Franzidos (Pursed Lip)' THEN 5
    WHEN 'Relaxamento Progressivo de Jacobson' THEN 300
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 10
    WHEN 'Ponte de Glúteo Bilateral' THEN 10
    WHEN 'Sit-to-Stand' THEN 10
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 120
    WHEN 'Respiração Costal Inferior' THEN 10
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
    WHEN 'Alongamento de Panturrilha na Parede' THEN 30
    WHEN 'Rolling com Foam Roller' THEN 60
    WHEN 'Stretching Global Ativo' THEN 300
    WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 2
    WHEN 'Huff Cough' THEN 5
    WHEN 'Espirometria Incentivada' THEN 15
  END,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 10
    WHEN 'Respiração 4-7-8' THEN 5
    WHEN 'Relaxamento Progressivo de Jacobson' THEN 300
    WHEN 'Rolling com Foam Roller' THEN 60
    WHEN 'Stretching Global Ativo' THEN 300
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
    WHEN 'Alongamento de Panturrilha na Parede' THEN 30
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 120
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 'Iniciar 5-10 min. Progressão conservadora.'
    WHEN 'Relaxamento Progressivo de Jacobson' THEN 'Essencial para manejo de tensão muscular.'
    WHEN 'Respiração 4-7-8' THEN 'Técnica ansiedade útil para fibromialgia.'
    ELSE NULL
  END,
  NULL, NULL,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 'Ativação parassimpática reduz dor e fadiga.'
    WHEN 'Respiração 4-7-8' THEN 'Técnica respiratória evidenciada para ansiedade e dor crônica.'
    WHEN 'Relaxamento Progressivo de Jacobson' THEN 'Redução de tensão muscular melhora dor e qualidade de vida.'
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Mobilização suave reduz rigidez matinal.'
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 'Exercício aeróbico progressivo é cornerstone.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN ARRAY['Diafragma', 'Sistema Parassimpático']
    WHEN 'Respiração 4-7-8' THEN ARRAY['Diafragma', 'Sistema Parassimpático', 'Sistema Nervoso Autônomo']
    WHEN 'Relaxamento Progressivo de Jacobson' THEN ARRAY['Todos', 'Sistema Nervoso']
    WHEN 'Gato-Vaca (Cat-Cow)' THEN ARRAY['Coluna', 'Multífido']
    WHEN 'Rolling com Foam Roller' THEN ARRAY['Fáscia', 'Músculos']
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN ARRAY['Marcha', 'Cardiovascular', 'Proprioceptores']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 'Ativar parassimpático'
    WHEN 'Respiração 4-7-8' THEN 'Reduzir ansiedade'
    WHEN 'Relaxamento Progressivo de Jacobson' THEN 'Relaxamento muscular progressivo'
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Mobilização suave'
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 'Aeróbico de baixo impacto'
    ELSE NULL
  END
FROM exercises_fibromialgia e
WHERE EXISTS (SELECT 1 FROM fibromialgia);

-- ============================================================
-- PREVENÇÃO DE QUEDAS EM IDOSOS
-- Referências: Cochrane Review, Otago Programme, CDC STEADI
-- ============================================================

WITH prevencao_quedas AS (
  SELECT id FROM exercise_templates WHERE name = 'Prevenção de Quedas em Idosos' LIMIT 1
),
exercises_quedas AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Sit-to-Stand',
    'Equilíbrio Unipodal Solo',
    'Tandem Walk (Caminhada em Tandem)',
    'Single Leg Stance com Movimento de Braço',
    'BOSU Ball Squat',
    'Agachamento em Disco Instável',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Clamshell (Concha)',
    'Monster Walk (Caminhada Monster)',
    'Abdução de Quadril em Pé',
    'Subida de Escada',
    'Descida de Escada',
    'Respiração Diafragmática',
    'Prancha Abdominal (Plank)',
    'Dead Bug',
    'Gait Training com Obstáculos'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM prevencao_quedas),
  e.id,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 1
    WHEN 'Prancha Abdominal (Plank)' THEN 2
    WHEN 'Dead Bug' THEN 3
    WHEN 'Ponte de Glúteo Bilateral' THEN 4
    WHEN 'Clamshell (Concha)' THEN 5
    WHEN 'Ponte de Glúteo Unilateral' THEN 6
    WHEN 'Abdução de Quadril em Pé' THEN 7
    WHEN 'Monster Walk (Caminhada Monster)' THEN 8
    WHEN 'Sit-to-Stand' THEN 9
    WHEN 'Subida de Escada' THEN 10
    WHEN 'Descida de Escada' THEN 11
    WHEN 'Equilíbrio Unipodal Solo' THEN 12
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 13
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 14
    WHEN 'BOSU Ball Squat' THEN 15
    WHEN 'Agachamento em Disco Instável' THEN 16
    WHEN 'Gait Training com Obstáculos' THEN 17
  END,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 3
    WHEN 'Prancha Abdominal (Plank)' THEN 3
    WHEN 'Dead Bug' THEN 3
    WHEN 'Ponte de Glúteo Bilateral' THEN 3
    WHEN 'Clamshell (Concha)' THEN 3
    WHEN 'Ponte de Glúteo Unilateral' THEN 3
    WHEN 'Abdução de Quadril em Pé' THEN 3
    WHEN 'Monster Walk (Caminhada Monster)' THEN 3
    WHEN 'Sit-to-Stand' THEN 3
    WHEN 'Subida de Escada' THEN 2
    WHEN 'Descida de Escada' THEN 2
    WHEN 'Equilíbrio Unipodal Solo' THEN 3
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 2
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 3
    WHEN 'BOSU Ball Squat' THEN 3
    WHEN 'Agachamento em Disco Instável' THEN 3
    WHEN 'Gait Training com Obstáculos' THEN 2
  END,
  CASE e.name
    WHEN 'Ponte de Glúteo Bilateral' THEN 10
    WHEN 'Ponte de Glúteo Unilateral' THEN 10
    WHEN 'Clamshell (Concha)' THEN 15
    WHEN 'Monster Walk (Caminhada Monster)' THEN 20
    WHEN 'Abdução de Quadril em Pé' THEN 15
    WHEN 'Sit-to-Stand' THEN 15
    WHEN 'Equilíbrio Unipodal Solo' THEN 30
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 30
    WHEN 'BOSU Ball Squat' THEN 15
    WHEN 'Agachamento em Disco Instável' THEN 15
    WHEN 'Prancha Abdominal (Plank)' THEN 30
    WHEN 'Dead Bug' THEN 10
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 30
    WHEN 'Equilíbrio Unipodal Solo' THEN 30
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 30
    WHEN 'Respiração Diafragmática' THEN 10
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 60
    WHEN 'Gait Training com Obstáculos' THEN 10
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Equilíbrio Unipodal Solo' THEN 'Supervisão obrigatória. Usar apoio se necessário.'
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 'Progredir conforme segurança.'
    WHEN 'BOSU Ball Squat' THEN 'Supervisão obrigatória em superfícies instáveis.'
    WHEN 'Descida de Escada' THEN 'Corrimão obrigatório inicialmente.'
    ELSE NULL
  END,
  NULL, NULL,
  CASE e.name
    WHEN 'Equilíbrio Unipodal Solo' THEN 'Equilíbrio estático é preditor de quedas em idosos.'
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 'Dual-task simula atividades funcionais reais.'
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 'Equilíbrio dinâmico é crítico para marcha.'
    WHEN 'Sit-to-Stand' THEN 'Transferências são situações de alto risco para quedas.'
    WHEN 'Ponte de Glúteo Unilateral' THEN 'Força de MMII é preditor independente de quedas.'
    WHEN 'BOSU Ball Squat' THEN 'Treino em superfície instável melhora resposta neuromuscular.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Equilíbrio Unipodal Solo' THEN ARRAY['Tornozelo', 'Core', 'Proprioceptores', 'Sistema Vestibular']
    WHEN 'Single Leg Stance com Movimento de Braço' THEN ARRAY['Core', 'Tornozelo', 'Proprioceptores', 'Sistema Vestibular']
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN ARRAY['Marcha', 'Equilíbrio', 'Proprioceptores']
    WHEN 'BOSU Ball Squat' THEN ARRAY['Joelho', 'Tornozelo', 'Core', 'Proprioceptores']
    WHEN 'Agachamento em Disco Instável' THEN ARRAY['MMII', 'Core', 'Proprioceptores']
    WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos', 'Core']
    WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Equilíbrio Unipodal Solo' THEN 'Equilíbrio estático'
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 'Equilíbrio dinâmico dual-task'
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 'Marcha e equilíbrio'
    WHEN 'Sit-to-Stand' THEN 'Transferências seguras'
    WHEN 'BOSU Ball Squat' THEN 'Propriocepção instável'
    ELSE NULL
  END
FROM exercises_quedas e
WHERE EXISTS (SELECT 1 FROM prevencao_quedas);

-- ============================================================
-- OSTEOPOROSE - FORTALECIMENTO
-- Referências: Physio-pedia, ACSM Guidelines, Bone loading recommendations
-- ============================================================

WITH osteoporose AS (
  SELECT id FROM exercise_templates WHERE name = 'Osteoporose - Fortalecimento' LIMIT 1
),
exercises_osteoporose AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Sit-to-Stand',
    'Subida de Escada',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Elevação de Panturrilha em Pé',
    'Step Up',
    'Agachamento Parede (Wall Sit)',
    'Prancha Abdominal (Plank)',
    'Side Plank (Prancha Lateral)',
    'Dead Bug',
    'Bird-dog (Cachorro e Pássaro)',
    'Respiração Diafragmática',
    'Alongamento de Isquiotibiais em Pé',
    'Alongamento de Psoas (Ilíaco)',
    'Tandem Walk (Caminhada em Tandem)'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM osteoporose),
  e.id,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 1
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 2
    WHEN 'Dead Bug' THEN 3
    WHEN 'Prancha Abdominal (Plank)' THEN 4
    WHEN 'Side Plank (Prancha Lateral)' THEN 5
    WHEN 'Ponte de Glúteo Bilateral' THEN 6
    WHEN 'Ponte de Glúteo Unilateral' THEN 7
    WHEN 'Elevação de Panturrilha em Pé' THEN 8
    WHEN 'Sit-to-Stand' THEN 9
    WHEN 'Subida de Escada' THEN 10
    WHEN 'Step Up' THEN 11
    WHEN 'Agachamento Parede (Wall Sit)' THEN 12
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 13
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 14
    WHEN 'Alongamento de Psoas (Ilíaco)' THEN 15
  END,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 3
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 3
    WHEN 'Dead Bug' THEN 3
    WHEN 'Prancha Abdominal (Plank)' THEN 3
    WHEN 'Side Plank (Prancha Lateral)' THEN 3
    WHEN 'Ponte de Glúteo Bilateral' THEN 3
    WHEN 'Ponte de Glúteo Unilateral' THEN 3
    WHEN 'Elevação de Panturrilha em Pé' THEN 3
    WHEN 'Sit-to-Stand' THEN 3
    WHEN 'Subida de Escada' THEN 2
    WHEN 'Step Up' THEN 3
    WHEN 'Agachamento Parede (Wall Sit)' THEN 3
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 2
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
    WHEN 'Alongamento de Psoas (Ilíaco)' THEN 2
  END,
  CASE e.name
    WHEN 'Ponte de Glúteo Bilateral' THEN 10
    WHEN 'Ponte de Glúteo Unilateral' THEN 10
    WHEN 'Elevação de Panturrilha em Pé' THEN 20
    WHEN 'Sit-to-Stand' THEN 15
    WHEN 'Subida de Escada' THEN 10
    WHEN 'Step Up' THEN 15
    WHEN 'Agachamento Parede (Wall Sit)' THEN 10
    WHEN 'Prancha Abdominal (Plank)' THEN 45
    WHEN 'Side Plank (Prancha Lateral)' THEN 30
    WHEN 'Dead Bug' THEN 12
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 12
    WHEN 'Respiração Diafragmática' THEN 10
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 45
    WHEN 'Side Plank (Prancha Lateral)' THEN 30
    WHEN 'Agachamento Parede (Wall Sit)' THEN 30
    WHEN 'Respiração Diafragmática' THEN 10
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
    WHEN 'Alongamento de Psoas (Ilíaco)' THEN 30
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 60
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Agachamento Parede (Wall Sit)' THEN 'NÃO fazer flexão exacerbada de tronco (risco fratura vertebral).'
    WHEN 'Ponte de Glúteo Unilateral' THEN 'Se houver dor, usar bilateral primeiro.'
    WHEN 'Sit-to-Stand' THEN 'Impacto moderado benéfico para osso.'
    ELSE NULL
  END,
  NULL, NULL,
  CASE e.name
    WHEN 'Elevação de Panturrilha em Pé' THEN 'Impacto axial através do calcâneo estimula osso.'
    WHEN 'Sit-to-Stand' THEN 'Carga axial moderada estimula densidade óssea de fêmur e coluna.'
    WHEN 'Ponte de Glúteo Unilateral' THEN 'Impacto em quadril é benéfico para densidade óssea.'
    WHEN 'Prancha Abdominal (Plank)' THEN 'Core estável reduz carga compressiva em coluna.'
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 'Estabilizadores vertebrais protegem fraturas.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Elevação de Panturrilha em Pé' THEN ARRAY['Panturrilha', 'Calcâneo', 'Tíbia']
    WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Fêmur', 'Coluna', 'Glúteos']
    WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Máximo', 'Fêmur']
    WHEN 'Ponte de Glúteo Bilateral' THEN ARRAY['Glúteo Máximo', 'Isquiotibiais', 'Coluna']
    WHEN 'Prancha Abdominal (Plank)' THEN ARRAY['Core', 'Coluna']
    WHEN 'Side Plank (Prancha Lateral)' THEN ARRAY['Oblíquos', 'Quadrado Lombar']
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN ARRAY['Multífido', 'Core']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Elevação de Panturrilha em Pé' THEN 'Impacto axial calcâneo'
    WHEN 'Sit-to-Stand' THEN 'Carga axial moderada'
    WHEN 'Ponte de Glúteo Unilateral' THEN 'Impacto quadril'
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 'Estabilização vertebral'
    ELSE NULL
  END
FROM exercises_osteoporose e
WHERE EXISTS (SELECT 1 FROM osteoporose);

-- ============================================================
-- REABILITAÇÃO AVE - MEMBRO SUPERIOR
-- Referências: Physio-pedia Stroke Rehab, Cochrane Constraint-Induced, Neuroplasticity
-- ============================================================

WITH ave_mmss AS (
  SELECT id FROM exercise_templates WHERE name = 'Reabilitação AVE - Membro Superior' LIMIT 1
),
exercises_ave_mmss AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Squeeze de Bola (Espalmar)',
    'Extensão de Dedos',
    'Flexão de Punho',
    'Extensão de Punho',
    'Desvio Radial de Punho',
    'Rotação Externa de Ombro com Faixa',
    'Rotação Interna de Ombro com Faixa',
    'Elevação Frontal de Ombro',
    'Elevação Lateral de Ombro (0-90°)',
    'Extensão de Ombro em Pronação',
    'Prone Y-T-W',
    'Rowing com Faixa Elástica',
    'Flexão de Cotovelo (Bicep Curl)',
    'Codman Pendular',
    'Mobilização de Ombro com Bastão',
    'Mobilização de Escápula (Wall Slides)',
    'Coordenação Óculo-Manual',
    'Coordenação Digital (Dedos)',
    '4 Apoios (Four Point kneeling)',
    'Push-up Plus',
    'Respiração Diafragmática'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM ave_mmss),
  e.id,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 1
    WHEN 'Codman Pendular' THEN 2
    WHEN 'Mobilização de Ombro com Bastão' THEN 3
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 4
    WHEN '4 Apoios (Four Point kneeling)' THEN 5
    WHEN 'Squeeze de Bola (Espalmar)' THEN 6
    WHEN 'Coordenação Digital (Dedos)' THEN 7
    WHEN 'Flexão de Punho' THEN 8
    WHEN 'Extensão de Punho' THEN 9
    WHEN 'Desvio Radial de Punho' THEN 10
    WHEN 'Rotação Externa de Ombro com Faixa' THEN 11
    WHEN 'Elevação Frontal de Ombro' THEN 12
    WHEN 'Elevação Lateral de Ombro (0-90°)' THEN 13
    WHEN 'Flexão de Cotovelo (Bicep Curl)' THEN 14
    WHEN 'Extensão de Ombro em Pronação' THEN 15
    WHEN 'Prone Y-T-W' THEN 16
    WHEN 'Rowing com Faixa Elástica' THEN 17
    WHEN 'Coordenação Óculo-Manual' THEN 18
    WHEN 'Push-up Plus' THEN 19
  END,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 3
    WHEN 'Codman Pendular' THEN 3
    WHEN 'Mobilização de Ombro com Bastão' THEN 2
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 2
    WHEN '4 Apoios (Four Point kneeling)' THEN 2
    WHEN 'Squeeze de Bola (Espalmar)' THEN 3
    WHEN 'Coordenação Digital (Dedos)' THEN 2
    WHEN 'Flexão de Punho' THEN 2
    WHEN 'Extensão de Punho' THEN 2
    WHEN 'Desvio Radial de Punho' THEN 2
    WHEN 'Rotação Externa de Ombro com Faixa' THEN 2
    WHEN 'Elevação Frontal de Ombro' THEN 2
    WHEN 'Elevação Lateral de Ombro (0-90°)' THEN 2
    WHEN 'Flexão de Cotovelo (Bicep Curl)' THEN 2
    WHEN 'Extensão de Ombro em Pronação' THEN 2
    WHEN 'Prone Y-T-W' THEN 2
    WHEN 'Rowing com Faixa Elástica' THEN 2
    WHEN 'Coordenação Óculo-Manual' THEN 3
    WHEN 'Push-up Plus' THEN 2
  END,
  CASE e.name
    WHEN 'Squeeze de Bola (Espalmar)' THEN 15
    WHEN 'Coordenação Digital (Dedos)' THEN 10
    WHEN 'Flexão de Punho' THEN 15
    WHEN 'Extensão de Punho' THEN 15
    WHEN 'Desvio Radial de Punho' THEN 15
    WHEN 'Rotação Externa de Ombro com Faixa' THEN 15
    WHEN 'Elevação Frontal de Ombro' THEN 15
    WHEN 'Elevação Lateral de Ombro (0-90°)' THEN 15
    WHEN 'Flexão de Cotovelo (Bicep Curl)' THEN 15
    WHEN 'Extensão de Ombro em Pronação' THEN 15
    WHEN 'Prone Y-T-W' THEN 10
    WHEN 'Rowing com Faixa Elástica' THEN 15
    WHEN 'Coordenação Óculo-Manual' THEN 10
    WHEN 'Push-up Plus' THEN 10
    WHEN 'Codman Pendular' THEN 120
    WHEN 'Mobilização de Ombro com Bastão' THEN 30
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 30
    WHEN '4 Apoios (Four Point kneeling)' THEN 10
    WHEN 'Respiração Diafragmática' THEN 10
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Codman Pendular' THEN 120
    WHEN 'Mobilização de Ombro com Bastão' THEN 30
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 30
    WHEN '4 Apoios (Four Point kneeling)' THEN 10
    WHEN 'Coordenação Digital (Dedos)' THEN 5
    WHEN 'Respiração Diafragmática' THEN 10
    WHEN 'Coordenação Óculo-Manual' THEN 10
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Coordenação Digital (Dedos)' THEN 'Trabalhar independentemente cada dedo.'
    WHEN 'Coordenação Óculo-Manual' THEN 'Aumentar complexidade progressivamente.'
    WHEN 'Codman Pendular' THEN 'Essencial para ombro subluxado em hemiplegia.'
    ELSE NULL
  END,
  NULL, NULL,
  CASE e.name
    WHEN 'Squeeze de Bola (Espalmar)' THEN 'Força de preensão é preditor de função de MMSS pós-AVE.'
    WHEN 'Coordenação Digital (Dedos)' THEN 'Destreza digital essencial para AVDs.'
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Ritmo escapuloumeral é pré-requisito para função de MMSS.'
    WHEN 'Prone Y-T-W' THEN 'Manguito rotador essencial para função acima do nível do ombro.'
    WHEN 'Coordenação Óculo-Manual' THEN 'Coordenação óculo-manual é base para AVDs.'
    WHEN 'Rowing com Faixa Elástica' THEN 'Extensão de MMSS é essencial para alcance funcional.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Squeeze de Bola (Espalmar)' THEN ARRAY['Mão', 'Dedos', 'Preensão']
    WHEN 'Coordenação Digital (Dedos)' THEN ARRAY['Mão', 'Dedos', 'Destreza']
    WHEN 'Flexão de Punho' THEN ARRAY['Flexores Punho', 'Antebraço']
    WHEN 'Extensão de Punho' THEN ARRAY['Extensores Punho', 'Antebraço']
    WHEN 'Rotação Externa de Ombro com Faixa' THEN ARRAY['Manguito Rotador', 'Ombro']
    WHEN 'Elevação Frontal de Ombro' THEN ARRAY['Deltóide Anterior', 'Ombro']
    WHEN 'Elevação Lateral de Ombro (0-90°)' THEN ARRAY['Deltóide Médio', 'Supraespinhoso']
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN ARRAY['Escápula', 'Serrátil Anterior', 'Trapézio']
    WHEN 'Prone Y-T-W' THEN ARRAY['Manguito Rotador', 'Deltóide', 'Rombóides']
    WHEN 'Rowing com Faixa Elástica' THEN ARRAY['Rombóides', 'Deltóide Posterior', 'Bíceps']
    WHEN 'Coordenação Óculo-Manual' THEN ARRAY['Oculomotor', 'Mão', 'Coordenação']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Squeeze de Bola (Espalmar)' THEN 'Força de preensão'
    WHEN 'Coordenação Digital (Dedos)' THEN 'Destreza digital'
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 'Ritmo escapuloumeral'
    WHEN 'Prone Y-T-W' THEN 'Manguito rotador'
    WHEN 'Coordenação Óculo-Manual' THEN 'Coordenação óculo-manual'
    ELSE NULL
  END
FROM exercises_ave_mmss e
WHERE EXISTS (SELECT 1 FROM ave_mmss);

-- ============================================================
-- REABILITAÇÃO AVE - MARCHA
-- Referências: Physio-pedia Stroke Gait Rehab, Task-specific training, Bodyweight-supported
-- ============================================================

WITH ave_marcha AS (
  SELECT id FROM exercise_templates WHERE name = 'Reabilitação AVE - Marcha' LIMIT 1
),
exercises_ave_marcha AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Sit-to-Stand',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Elevação de Panturrilha em Pé',
    'Elevação de Panturrilha Sentado',
    'Step Up',
    'Subida de Escada',
    'Descida de Escada',
    'Tandem Walk (Caminhada em Tandem)',
    'Equilíbrio Unipodal Solo',
    'Single Leg Stance com Movimento de Braço',
    'Gait Training com Obstáculos',
    'Marcha com Padrões Cruzados',
    'Respiração Diafragmática',
    'Prancha Abdominal (Plank)',
    'Dead Bug',
    '4 Apoios (Four Point kneeling)'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM ave_marcha),
  e.id,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 1
    WHEN '4 Apoios (Four Point kneeling)' THEN 2
    WHEN 'Prancha Abdominal (Plank)' THEN 3
    WHEN 'Dead Bug' THEN 4
    WHEN 'Ponte de Glúteo Bilateral' THEN 5
    WHEN 'Ponte de Glúteo Unilateral' THEN 6
    WHEN 'Elevação de Panturrilha Sentado' THEN 7
    WHEN 'Elevação de Panturrilha em Pé' THEN 8
    WHEN 'Sit-to-Stand' THEN 9
    WHEN 'Step Up' THEN 10
    WHEN 'Subida de Escada' THEN 11
    WHEN 'Descida de Escada' THEN 12
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 13
    WHEN 'Equilíbrio Unipodal Solo' THEN 14
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 15
    WHEN 'Gait Training com Obstáculos' THEN 16
    WHEN 'Marcha com Padrões Cruzados' THEN 17
  END,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 3
    WHEN '4 Apoios (Four Point kneeling)' THEN 2
    WHEN 'Prancha Abdominal (Plank)' THEN 3
    WHEN 'Dead Bug' THEN 3
    WHEN 'Ponte de Glúteo Bilateral' THEN 3
    WHEN 'Ponte de Glúteo Unilateral' THEN 3
    WHEN 'Elevação de Panturrilha Sentado' THEN 3
    WHEN 'Elevação de Panturrilha em Pé' THEN 3
    WHEN 'Sit-to-Stand' THEN 3
    WHEN 'Step Up' THEN 3
    WHEN 'Subida de Escada' THEN 2
    WHEN 'Descida de Escada' THEN 2
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 2
    WHEN 'Equilíbrio Unipodal Solo' THEN 3
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 3
    WHEN 'Gait Training com Obstáculos' THEN 2
    WHEN 'Marcha com Padrões Cruzados' THEN 2
  END,
  CASE e.name
    WHEN 'Ponte de Glúteo Bilateral' THEN 10
    WHEN 'Ponte de Glúteo Unilateral' THEN 10
    WHEN 'Elevação de Panturrilha em Pé' THEN 20
    WHEN 'Elevação de Panturrilha Sentado' THEN 20
    WHEN 'Sit-to-Stand' THEN 15
    WHEN 'Step Up' THEN 15
    WHEN 'Equilíbrio Unipodal Solo' THEN 30
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 30
    WHEN 'Prancha Abdominal (Plank)' THEN 30
    WHEN 'Dead Bug' THEN 12
    WHEN '4 Apoios (Four Point kneeling)' THEN 10
    WHEN 'Respiração Diafragmática' THEN 10
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 30
    WHEN 'Equilíbrio Unipodal Solo' THEN 30
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 30
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 60
    WHEN 'Gait Training com Obstáculos' THEN 10
    WHEN 'Marcha com Padrões Cruzados' THEN 5
    WHEN 'Respiração Diafragmática' THEN 10
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Sit-to-Stand' THEN 'Supervisão constante. Usar apoio conforme necessário.'
    WHEN 'Equilíbrio Unipodal Solo' THEN 'Supervisar risco de queda.'
    WHEN 'Step Up' THEN 'Usar corrimão inicialmente.'
    WHEN 'Gait Training com Obstáculos' THEN 'Iniciar com obstáculos simples/baixos.'
    ELSE NULL
  END,
  NULL, NULL,
  CASE e.name
    WHEN 'Ponte de Glúteo Unilateral' THEN 'Força assimétrica de glúteo é crítica para marcha após AVE.'
    WHEN 'Elevação de Panturrilha em Pé' THEN 'Push-off deficiente é comum pós-AVE e afeta marcha.'
    WHEN 'Sit-to-Stand' THEN 'Transferência é pré-requisito para deambulação.'
    WHEN 'Step Up' THEN 'Escada é atividade funcional importante.'
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 'Equilíbrio dinâmico essencial para marcha segura.'
    WHEN 'Gait Training com Obstáculos' THEN 'Treino específico de marcha transfere para funcionalidade.'
    WHEN 'Marcha com Padrões Cruzados' THEN 'Ativação cruzada hemisférica promove neuroplasticidade.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteo Médio', 'Glúteo Máximo']
    WHEN 'Elevação de Panturrilha em Pé' THEN ARRAY['Gastrocnêmio', 'Sóleo']
    WHEN 'Elevação de Panturrilha Sentado' THEN ARRAY['Sóleo']
    WHEN 'Sit-to-Stand' THEN ARRAY['Quadríceps', 'Glúteos', 'Core']
    WHEN 'Step Up' THEN ARRAY['Quadríceps', 'Glúteos', 'MMII']
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN ARRAY['Marcha', 'Equilíbrio', 'Proprioceptores']
    WHEN 'Gait Training com Obstáculos' THEN ARRAY['Marcha', 'MMII', 'Coordenação']
    WHEN 'Marcha com Padrões Cruzados' THEN ARRAY['Marcha', 'Coordenação', 'Neuroplasticidade']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Ponte de Glúteo Unilateral' THEN 'Força assimétrica'
    WHEN 'Elevação de Panturrilha em Pé' THEN 'Push-off'
    WHEN 'Sit-to-Stand' THEN 'Transferências'
    WHEN 'Gait Training com Obstáculos' THEN 'Treino específico de marcha'
    WHEN 'Marcha com Padrões Cruzados' THEN 'Neuroplasticidade cruzada'
    ELSE NULL
  END
FROM exercises_ave_marcha e
WHERE EXISTS (SELECT 1 FROM ave_marcha);

-- ============================================================
-- PARKINSON - MOBILIDADE
-- Referências: Physio-pedia Parkinson, Exercise intensity, Dance and boxing programs
-- ============================================================

WITH parkinson_mob AS (
  SELECT id FROM exercise_templates WHERE name = 'Parkinson - Mobilidade' LIMIT 1
),
exercises_parkinson AS (
  SELECT id, name FROM exercises WHERE name IN (
    'Gato-Vaca (Cat-Cow)',
    'Bird-dog (Cachorro e Pássaro)',
    'Ponte de Glúteo Bilateral',
    'Ponte de Glúteo Unilateral',
    'Clamshell (Concha)',
    'Monster Walk (Caminhada Monster)',
    'Abdução de Quadril em Pé',
    'Sit-to-Stand',
    'Tandem Walk (Caminhada em Tandem)',
    'Equilíbrio Unipodal Solo',
    'Single Leg Stance com Movimento de Braço',
    'Gait Training com Obstáculos',
    'Marcha com Padrões Cruzados',
    'Coordenação Óculo-Manual',
    'Prancha Abdominal (Plank)',
    'Side Plank (Prancha Lateral)',
    'Dead Bug',
    'Respiração Diafragmática',
    'Mobilização de Coluna Thorácica com Foam Roller',
    'Mobilização de Escápula (Wall Slides)',
    'Alongamento de Isquiotibiais em Pé'
  )
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes, week_start, week_end, clinical_notes, focus_muscles, purpose)
SELECT
  (SELECT id FROM parkinson_mob),
  e.id,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 1
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 2
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 3
    WHEN 'Prancha Abdominal (Plank)' THEN 4
    WHEN 'Side Plank (Prancha Lateral)' THEN 5
    WHEN 'Dead Bug' THEN 6
    WHEN 'Ponte de Glúteo Bilateral' THEN 7
    WHEN 'Clamshell (Concha)' THEN 8
    WHEN 'Ponte de Glúteo Unilateral' THEN 9
    WHEN 'Abdução de Quadril em Pé' THEN 10
    WHEN 'Monster Walk (Caminhada Monster)' THEN 11
    WHEN 'Sit-to-Stand' THEN 12
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 13
    WHEN 'Equilíbrio Unipodal Solo' THEN 14
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 15
    WHEN 'Gait Training com Obstáculos' THEN 16
    WHEN 'Marcha com Padrões Cruzados' THEN 17
    WHEN 'Coordenação Óculo-Manual' THEN 18
    WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 19
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 20
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 21
  END,
  CASE e.name
    WHEN 'Respiração Diafragmática' THEN 3
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 2
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 3
    WHEN 'Prancha Abdominal (Plank)' THEN 3
    WHEN 'Side Plank (Prancha Lateral)' THEN 3
    WHEN 'Dead Bug' THEN 3
    WHEN 'Ponte de Glúteo Bilateral' THEN 3
    WHEN 'Clamshell (Concha)' THEN 3
    WHEN 'Ponte de Glúteo Unilateral' THEN 3
    WHEN 'Abdução de Quadril em Pé' THEN 3
    WHEN 'Monster Walk (Caminhada Monster)' THEN 3
    WHEN 'Sit-to-Stand' THEN 3
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 2
    WHEN 'Equilíbrio Unipodal Solo' THEN 3
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 3
    WHEN 'Gait Training com Obstáculos' THEN 2
    WHEN 'Marcha com Padrões Cruzados' THEN 2
    WHEN 'Coordenação Óculo-Manual' THEN 3
    WHEN 'Mobilização de Coluna Thorácica com Foam Roller' THEN 1
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 2
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 2
  END,
  CASE e.name
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 15
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 12
    WHEN 'Ponte de Glúteo Bilateral' THEN 10
    WHEN 'Ponte de Glúteo Unilateral' THEN 10
    WHEN 'Clamshell (Concha)' THEN 15
    WHEN 'Monster Walk (Caminhada Monster)' THEN 20
    WHEN 'Abdução de Quadril em Pé' THEN 15
    WHEN 'Sit-to-Stand' THEN 15
    WHEN 'Equilíbrio Unipodal Solo' THEN 30
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 30
    WHEN 'Prancha Abdominal (Plank)' THEN 45
    WHEN 'Side Plank (Prancha Lateral)' THEN 30
    WHEN 'Dead Bug' THEN 12
    WHEN 'Coordenação Óculo-Manual' THEN 10
    WHEN 'Respiração Diafragmática' THEN 10
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Prancha Abdominal (Plank)' THEN 45
    WHEN 'Side Plank (Prancha Lateral)' THEN 30
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 10
    WHEN 'Respiração Diafragmática' THEN 10
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 60
    WHEN 'Coordenação Óculo-Manual' THEN 10
    WHEN 'Mobilização de Escápula (Wall Slides)' THEN 30
    WHEN 'Alongamento de Isquiotibiais em Pé' THEN 30
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Grandes amplitudes para combater rigidez.'
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 'Usar pistas visuais se necessário.'
    WHEN 'Equilíbrio Unipodal Solo' THEN 'Supervisar risco de queda.'
    WHEN 'Coordenação Óculo-Manual' THEN 'Dual-task útil para Parkinson.'
    ELSE NULL
  END,
  NULL, NULL,
  CASE e.name
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Amplitude grande é essencial para combater rigidez parkinsoniana.'
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN 'Rotação de tronco combate rigidez axial.'
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 'Marcha com pistas visuais/auditivas é evidenciada.'
    WHEN 'Gait Training com Obstáculos' THEN 'Treino de marcha especifico é crucial.'
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 'Dual-task treina capacidades divididas.'
    WHEN 'Coordenação Óculo-Manual' THEN 'Coordenação fina é afetada e precisa treino.'
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Gato-Vaca (Cat-Cow)' THEN ARRAY['Coluna', 'Multífido', 'Rotação Tronco']
    WHEN 'Bird-dog (Cachorro e Pássaro)' THEN ARRAY['Core', 'Glúteos', 'Rotação Tronco']
    WHEN 'Ponte de Glúteo Unilateral' THEN ARRAY['Glúteos', 'Core']
    WHEN 'Monster Walk (Caminhada Monster)' THEN ARRAY['Glúteos', 'MMII']
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN ARRAY['Marcha', 'Equilíbrio', 'Parkinson']
    WHEN 'Single Leg Stance com Movimento de Braço' THEN ARRAY['Equilíbrio', 'Coordenação', 'Dual-task']
    WHEN 'Gait Training com Obstáculos' THEN ARRAY['Marcha', 'Coordenação', 'Agilidade']
    WHEN 'Coordenação Óculo-Manual' THEN ARRAY['Oculomotor', 'Mão', 'Coordenação']
    ELSE NULL
  END,
  CASE e.name
    WHEN 'Gato-Vaca (Cat-Cow)' THEN 'Grande amplitude (rigidez)'
    WHEN 'Tandem Walk (Caminhada em Tandem)' THEN 'Marcha com pistas'
    WHEN 'Single Leg Stance com Movimento de Braço' THEN 'Dual-task'
    WHEN 'Gait Training com Obstáculos' THEN 'Treino especifico de marcha'
    WHEN 'Coordenação Óculo-Manual' THEN 'Coordenação fina'
    ELSE NULL
  END
FROM exercises_parkinson e
WHERE EXISTS (SELECT 1 FROM parkinson_mob);
