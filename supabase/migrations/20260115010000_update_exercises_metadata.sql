-- Update existing exercises with comprehensive body_parts and equipment metadata
-- This makes the filtering more useful and includes home-friendly equipment options

-- Update each existing exercise with appropriate metadata
-- Based on exercise names in the seed data

-- Agachamento Livre
UPDATE exercises SET 
  body_parts = ARRAY['Quadríceps', 'Glúteos', 'Core', 'Quadril'],
  equipment = ARRAY['Peso Corporal']
WHERE name ILIKE '%agachamento%livre%' OR name ILIKE '%squat%';

-- Rotação Externa de Ombro  
UPDATE exercises SET 
  body_parts = ARRAY['Ombro', 'Manguito Rotador'],
  equipment = ARRAY['Faixa Elástica Média', 'Toalha']
WHERE name ILIKE '%rota%extern%ombro%';

-- Alongamento de Isquiotibiais
UPDATE exercises SET 
  body_parts = ARRAY['Isquiotibiais', 'Lombar'],
  equipment = ARRAY['Toalha', 'Colchonete']
WHERE name ILIKE '%alongamento%isquio%';

-- Ponte Unilateral
UPDATE exercises SET 
  body_parts = ARRAY['Glúteos', 'Lombar', 'Core', 'Quadril'],
  equipment = ARRAY['Colchonete']
WHERE name ILIKE '%ponte%unilateral%';

-- Propriocepção em Disco
UPDATE exercises SET 
  body_parts = ARRAY['Tornozelo/Pé', 'Core'],
  equipment = ARRAY['Disco de Equilíbrio']
WHERE name ILIKE '%propriocep%disco%';

-- Generic update for exercises with 'ombro' in name
UPDATE exercises SET 
  body_parts = COALESCE(body_parts, '{}') || ARRAY['Ombro']::text[]
WHERE name ILIKE '%ombro%' AND (body_parts IS NULL OR array_length(body_parts, 1) = 0);

-- Generic update for exercises with 'joelho' in name
UPDATE exercises SET 
  body_parts = COALESCE(body_parts, '{}') || ARRAY['Joelho', 'Quadríceps']::text[]
WHERE name ILIKE '%joelho%' AND (body_parts IS NULL OR array_length(body_parts, 1) = 0);

-- Generic update for exercises with 'lombar' or 'coluna' in name
UPDATE exercises SET 
  body_parts = COALESCE(body_parts, '{}') || ARRAY['Coluna Lombar', 'Core']::text[]
WHERE (name ILIKE '%lombar%' OR name ILIKE '%coluna%') AND (body_parts IS NULL OR array_length(body_parts, 1) = 0);

-- Generic update for exercises with 'cervical' or 'pescoço' in name
UPDATE exercises SET 
  body_parts = COALESCE(body_parts, '{}') || ARRAY['Coluna Cervical', 'Cabeça/Pescoço']::text[]
WHERE (name ILIKE '%cervical%' OR name ILIKE '%pescoco%' OR name ILIKE '%pescoço%') AND (body_parts IS NULL OR array_length(body_parts, 1) = 0);

-- Generic update for exercises with 'quadril' in name
UPDATE exercises SET 
  body_parts = COALESCE(body_parts, '{}') || ARRAY['Quadril', 'Glúteos']::text[]
WHERE name ILIKE '%quadril%' AND (body_parts IS NULL OR array_length(body_parts, 1) = 0);

-- Update exercises with 'alongamento' category to add Peso Corporal if no equipment
UPDATE exercises SET 
  equipment = ARRAY['Peso Corporal', 'Colchonete']
WHERE category = 'Alongamento' AND (equipment IS NULL OR array_length(equipment, 1) = 0);

-- Update exercises with 'fortalecimento' that have no equipment - add versatile options
UPDATE exercises SET 
  equipment = ARRAY['Peso Corporal']
WHERE category = 'Fortalecimento' AND (equipment IS NULL OR array_length(equipment, 1) = 0);

-- Update exercises with 'equilibrio' or 'propriocepção' category
UPDATE exercises SET 
  equipment = ARRAY['Peso Corporal']
WHERE (category = 'Equilíbrio' OR category = 'Propriocepção') AND (equipment IS NULL OR array_length(equipment, 1) = 0);

-- Add some additional seed exercises with home-friendly equipment for common conditions

INSERT INTO exercises (name, category, difficulty, indicated_pathologies, contraindicated_pathologies, body_parts, equipment, description) 
VALUES
-- Upper body home exercises
('Rotação de Ombro com Toalha', 'Mobilidade', 'Iniciante', 
  ARRAY['Tendinite Manguito Rotador', 'Capsulite Adesiva', 'Dor no Ombro'], 
  ARRAY['Lesão Aguda Manguito', 'Luxação Recente'], 
  ARRAY['Ombro', 'Manguito Rotador'], 
  ARRAY['Toalha'], 
  'Segure uma toalha com ambas as mãos atrás das costas e faça movimentos suaves de subida e descida para mobilizar o ombro.'),

('Extensão de Cotovelo com Garrafa', 'Fortalecimento', 'Iniciante', 
  ARRAY['Epicondilite', 'Fraqueza Muscular', 'Reabilitação Pós-Cirúrgica'], 
  ARRAY['Epicondilite Aguda', 'Fratura Recente'], 
  ARRAY['Cotovelo', 'Punho/Mão'], 
  ARRAY['Garrafa de Água (como peso)'], 
  'Segure uma garrafa de água e faça extensões de cotovelo controladas para fortalecer os músculos do braço.'),

('Exercício de Parede para Ombro', 'Fortalecimento', 'Iniciante', 
  ARRAY['Capsulite Adesiva', 'Dor no Ombro', 'Síndrome do Impacto'], 
  ARRAY['Lesão Aguda'], 
  ARRAY['Ombro'], 
  ARRAY['Parede'], 
  'De frente para a parede, deslize os dedos pela parede elevando progressivamente o braço.'),

-- Lower body home exercises
('Agachamento na Cadeira', 'Fortalecimento', 'Iniciante', 
  ARRAY['Artrose de Joelho', 'Fraqueza Muscular', 'Reabilitação Pós-Cirúrgica'], 
  ARRAY['Dor Aguda Joelho'], 
  ARRAY['Quadríceps', 'Glúteos', 'Joelho'], 
  ARRAY['Cadeira'], 
  'Sente e levante de uma cadeira controladamente, fortalecendo quadríceps e glúteos de forma segura.'),

('Elevação de Panturrilha em Degrau', 'Fortalecimento', 'Intermediário', 
  ARRAY['Tendinite de Aquiles', 'Fraqueza de Panturrilha', 'Fascite Plantar'], 
  ARRAY['Ruptura de Tendão', 'Fratura'], 
  ARRAY['Panturrilha', 'Tornozelo/Pé'], 
  ARRAY['Escada/Degrau', 'Parede'], 
  'Em um degrau, suba e desça apoiando nos dedos dos pés para fortalecer panturrilha.'),

('Alongamento de Quadríceps com Toalha', 'Alongamento', 'Iniciante', 
  ARRAY['Encurtamento Anterior', 'Dor no Joelho', 'Pós-Exercício'], 
  ARRAY['Lesão de Ligamento Recente'], 
  ARRAY['Quadríceps', 'Joelho'], 
  ARRAY['Toalha', 'Colchonete'], 
  'Deitado de bruços, use uma toalha para puxar o pé em direção ao glúteo, alongando o quadríceps.'),

-- Core exercises
('Prancha na Parede', 'Fortalecimento', 'Iniciante', 
  ARRAY['Dor Lombar Leve', 'Fortalecimento Core', 'Postura'], 
  ARRAY['Dor Lombar Aguda', 'Hérnia de Disco Sintomática'], 
  ARRAY['Core', 'Abdômen', 'Ombro'], 
  ARRAY['Parede'], 
  'Versão iniciante da prancha: apoie as mãos na parede em ângulo e mantenha o corpo reto.'),

('Mobilização Cervical com Toalha', 'Mobilidade', 'Iniciante', 
  ARRAY['Cervicalgia', 'Torcicolo', 'Tensão Muscular'], 
  ARRAY['Hérnia Cervical Aguda', 'Trauma Cervical'], 
  ARRAY['Coluna Cervical', 'Cabeça/Pescoço'], 
  ARRAY['Toalha'], 
  'Use uma toalha dobrada atrás do pescoço para auxiliar movimentos de flexão e extensão cervical suaves.'),

('Flexão de Quadril com Vassoura', 'Mobilidade', 'Iniciante', 
  ARRAY['Rigidez de Quadril', 'Artrose de Quadril', 'Bursite'], 
  ARRAY['Prótese Recente', 'Fratura'], 
  ARRAY['Quadril', 'Core'], 
  ARRAY['Vassoura/Cabo de Madeira'], 
  'Use um cabo de vassoura para auxílio de equilíbrio enquanto faz flexões de quadril controladas.')

ON CONFLICT DO NOTHING;

-- Add COMMENT for reference
COMMENT ON TABLE exercises IS 'Exercise library with body parts and equipment for filtering. Equipment includes home-friendly options (Toalha, Cadeira, Parede, etc.) for patient home programs.';
