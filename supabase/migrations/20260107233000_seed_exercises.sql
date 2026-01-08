-- Redefine constraint to ensure we know the allowed values
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_difficulty_check;

-- Normalize existing data
UPDATE exercises SET difficulty = 'Iniciante' WHERE difficulty ILIKE 'iniciante';
UPDATE exercises SET difficulty = 'Intermediário' WHERE difficulty ILIKE 'intermediario' OR difficulty ILIKE 'intermediário';
UPDATE exercises SET difficulty = 'Avançado' WHERE difficulty ILIKE 'avancado' OR difficulty ILIKE 'avançado';
-- Set any remaining invalid values to Iniciante (fallback)
UPDATE exercises SET difficulty = 'Iniciante' WHERE difficulty NOT IN ('Iniciante', 'Intermediário', 'Avançado');

ALTER TABLE exercises ADD CONSTRAINT exercises_difficulty_check CHECK (difficulty IN ('Iniciante', 'Intermediário', 'Avançado'));

-- Seed initial exercises
INSERT INTO exercises (name, category, difficulty, indicated_pathologies, contraindicated_pathologies, body_parts, equipment, description) VALUES
('Agachamento Livre', 'Fortalecimento', 'Iniciante', ARRAY['Joelho Valgo', 'Fraqueza Quadríceps'], ARRAY['Artrose Severa Joelho'], ARRAY['Quadríceps', 'Glúteos'], ARRAY['Peso do corpo'], 'Agachamento utilizando apenas o peso corporal, mantendo postura ereta.'),
('Rotação Externa de Ombro', 'Fortalecimento', 'Iniciante', ARRAY['Tendinite Manguito Rotador', 'Instabilidade Ombro'], ARRAY['Bursite Aguda'], ARRAY['Ombro', 'Manguito Rotador'], ARRAY['Faixa Elástica', 'Toalha'], 'Com o cotovelo apoiado ao corpo, rodar o braço para fora contra resistência.'),
('Alongamento de Isquiotibiais', 'Alongamento', 'Iniciante', ARRAY['Encurtamento Posterior'], ARRAY['Ciatalgia Aguda'], ARRAY['Isquiotibiais'], ARRAY['Toalha', 'Faixa'], 'Deitado de costas, elevar a perna reta com auxílio de uma toalha.'),
('Ponte Unilateral', 'Fortalecimento', 'Intermediário', ARRAY['Instabilidade Pélvica'], ARRAY['Dor Lombar Aguda'], ARRAY['Glúteos', 'Lombar'], ARRAY['Colchonete'], 'Elevação pélvica com uma perna só apoiada.'),
('Propriocepção em Disco', 'Equilíbrio', 'Avançado', ARRAY['Entorse Tornozelo'], ARRAY['Fratura Recente'], ARRAY['Tornozelo'], ARRAY['Disco de Equilíbrio'], 'Equilíbrio unipodal sobre disco instável.');
