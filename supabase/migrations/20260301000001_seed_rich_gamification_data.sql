-- Seed Rich Gamification Data (Attempt 2 - forcing execution)

-- 1. Achievements (Upsert using ON CONFLICT)
INSERT INTO public.achievements (code, title, description, xp_reward, icon, category, requirements)
VALUES 
-- Consistency / Streak
('streak_3', 'Aquecimento', 'Complete exercícios por 3 dias seguidos', 50, 'Flame', 'streak', '{"type": "streak", "count": 3}'),
('streak_7', 'Em Chamas', 'Complete exercícios por 7 dias seguidos', 150, 'Flame', 'streak', '{"type": "streak", "count": 7}'),
('streak_14', 'Hábito Formado', 'Complete exercícios por 14 dias seguidos', 300, 'Zap', 'streak', '{"type": "streak", "count": 14}'),
('streak_30', 'Guerreiro Mensal', 'Complete exercícios por 30 dias seguidos', 1000, 'Crown', 'streak', '{"type": "streak", "count": 30}'),

-- Volume / Sessions
('sessions_1', 'Primeiro Passo', 'Complete sua primeira sessão de exercícios', 50, 'Footprints', 'milestone', '{"type": "sessions", "count": 1}'),
('sessions_5', 'Pegando o Ritmo', 'Complete 5 sessões de exercícios', 100, 'Activity', 'milestone', '{"type": "sessions", "count": 5}'),
('sessions_10', 'Comprometido', 'Complete 10 sessões de exercícios', 200, 'Target', 'milestone', '{"type": "sessions", "count": 10}'),
('sessions_25', 'Veterano', 'Complete 25 sessões de exercícios', 500, 'Award', 'milestone', '{"type": "sessions", "count": 25}'),
('sessions_50', 'Mestre da Reabilitação', 'Complete 50 sessões de exercícios', 1000, 'Trophy', 'milestone', '{"type": "sessions", "count": 50}'),

-- Timing
('early_bird', 'Madrugador', 'Complete uma sessão antes das 8:00 da manhã', 75, 'Sun', 'timing', '{"type": "time_before", "hour": 8}'),
('night_owl', 'Coruja Noturna', 'Complete uma sessão após as 20:00 da noite', 75, 'Moon', 'timing', '{"type": "time_after", "hour": 20}'),
('weekend_warrior', 'Guerreiro de Fim de Semana', 'Complete uma sessão no sábado ou domingo', 100, 'Calendar', 'timing', '{"type": "weekend"}'),

-- Recovery
('pain_log_5', 'Monitoramento Constante', 'Registre seu nível de dor por 5 dias', 100, 'Clipboard', 'recovery', '{"type": "pain_log_count", "count": 5}'),
('pain_relief', 'Alívio Conquistado', 'Registre uma redução de dor após exercício', 150, 'Smile', 'recovery', '{"type": "pain_reduction"}'),

-- Levels
('level_5', 'Nível 5 Alcançado', 'Chegue ao nível 5 de experiência', 200, 'Star', 'level', '{"type": "level", "count": 5}'),
('level_10', 'Nível 10 Alcançado', 'Chegue ao nível 10 de experiência', 500, 'Star', 'level', '{"type": "level", "count": 10}')
ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    xp_reward = EXCLUDED.xp_reward,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    requirements = EXCLUDED.requirements;

-- 2. Daily Quest Definitions
INSERT INTO public.quest_definitions (title, description, xp_reward, icon, category, is_active)
SELECT 'Alongamento Rápido', 'Faça um alongamento de 2 minutos', 15, 'Move', 'daily', true
WHERE NOT EXISTS (SELECT 1 FROM public.quest_definitions WHERE title = 'Alongamento Rápido');

INSERT INTO public.quest_definitions (title, description, xp_reward, icon, category, is_active)
SELECT 'Caminhada Leve', 'Caminhe por 10 minutos', 30, 'Footprints', 'daily', true
WHERE NOT EXISTS (SELECT 1 FROM public.quest_definitions WHERE title = 'Caminhada Leve');

INSERT INTO public.quest_definitions (title, description, xp_reward, icon, category, is_active)
SELECT 'Respiração Profunda', 'Pratique 5 minutos de respiração', 25, 'Wind', 'daily', true
WHERE NOT EXISTS (SELECT 1 FROM public.quest_definitions WHERE title = 'Respiração Profunda');

INSERT INTO public.quest_definitions (title, description, xp_reward, icon, category, is_active)
SELECT 'Registro de Humor', 'Como você está se sentindo hoje?', 15, 'Smile', 'daily', true
WHERE NOT EXISTS (SELECT 1 FROM public.quest_definitions WHERE title = 'Registro de Humor');
