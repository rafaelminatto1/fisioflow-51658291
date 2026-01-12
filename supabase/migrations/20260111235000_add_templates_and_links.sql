-- Migration: Add 20 Exercise Templates and Link Exercises
-- Created by Antigravity on 2026-01-11

-- Insert 20 Templates
INSERT INTO exercise_templates (name, description, category, condition_name, template_variant) VALUES
('Pós-Op LCA - Fase 1', 'Reabilitação inicial focada em proteção do enxerto e ganho de ADM.', 'Pós-Operatório', 'LCA', 'Fase 1'),
('Pós-Op LCA - Fase 2', 'Fase intermediária focada em fortalecimento muscular.', 'Pós-Operatório', 'LCA', 'Fase 2'),
('Pós-Op LCA - Fase 3', 'Retorno gradual ao esporte e propriocepção.', 'Pós-Operatório', 'LCA', 'Fase 3'),
('Pós-Op Manguito Rotador - Inicial', 'Exercícios passivos e assistidos para ganho de amplitude.', 'Pós-Operatório', 'Ombro', 'Inicial'),
('Pós-Op Manguito Rotador - Avançado', 'Fortalecimento da cintura escapular.', 'Pós-Operatório', 'Ombro', 'Avançado'),
('Lombalgia Crônica', 'Exercícios de estabilização central e mobilidade.', 'Coluna', 'Lombalgia', 'Padrão'),
('Cervicalgia Tencional', 'Relaxamento e alongamento para alívio de tensão.', 'Coluna', 'Cervicalgia', 'Relaxamento'),
('Hérnia de Disco Lombar', 'Protocolo McKenzie e estabilização.', 'Coluna', 'Hérnia de Disco', 'McKenzie'),
('Entorse de Tornozelo - Fase Aguda', 'Proteção, PRICE e mobilidade leve.', 'Ortopedia', 'Tornozelo', 'Aguda'),
('Entorse de Tornozelo - Fortalecimento', 'Fortalecimento de fibulares e propriocepção.', 'Ortopedia', 'Tornozelo', 'Fortalecimento'),
('Fascite Plantar', 'Alongamento da cadeia posterior e fáscia.', 'Ortopedia', 'Pé', 'Padrão'),
('Tendinopatia Patelar', 'Exercícios excêntricos para quadríceps.', 'Ortopedia', 'Joelho', 'Excêntrico'),
('Bursite Trocantérica', 'Fortalecimento de glúteo médio e alongamento.', 'Ortopedia', 'Quadril', 'Padrão'),
('Reabilitação AVE - Membro Superior', 'Treino funcional e controle motor.', 'Neurologia', 'AVE', 'Membro Superior'),
('Reabilitação AVE - Marcha', 'Treino de equilíbrio e marcha.', 'Neurologia', 'AVE', 'Marcha'),
('Parkinson - Mobilidade', 'Exercícios de grandes amplitudes e rotação.', 'Neurologia', 'Parkinson', 'Mobilidade'),
('Prevenção de Quedas em Idosos', 'Treino de equilíbrio estático e dinâmico.', 'Geriatria', 'Prevenção', 'Quedas'),
('Osteoporose - Fortalecimento', 'Carga axial controlada para saúde óssea.', 'Geriatria', 'Osteoporose', 'Padrão'),
('Artrose de Joelho', 'Fortalecimento de quadríceps sem impacto.', 'Reumatologia', 'Artrose', 'Joelho'),
('Fibromialgia - Aeróbico Leve', 'Início gradual de atividade física.', 'Reumatologia', 'Fibromialgia', 'Aeróbico');

-- Link Exercises to newly created templates (Randomized logic)
WITH exercises AS (
    SELECT id FROM exercises
),
templates AS (
    SELECT id FROM exercise_templates WHERE created_at > now() - interval '1 hour'
)
INSERT INTO exercise_template_items (template_id, exercise_id, order_index, sets, repetitions, duration, notes)
SELECT 
    t.id, 
    e.id, 
    row_number() OVER (PARTITION BY t.id ORDER BY random()),
    3,
    10,
    NULL,
    'Realizar com controle de movimento e respiração constante.'
FROM templates t
CROSS JOIN exercises e
WHERE random() < 0.3;
