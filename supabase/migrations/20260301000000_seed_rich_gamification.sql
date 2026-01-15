-- =====================================================================
-- Seed Rich Gamification Data
-- Sistema de gamificação completo para engajamento de pacientes
-- =====================================================================

-- =====================================================================
-- 1. ACHIEVEMENTS (Conquistas)
-- =====================================================================

-- Inserir achievements com upsert para evitar duplicatas
INSERT INTO public.achievements (code, title, description, xp_reward, icon, category, requirements)
VALUES
-- =====================================================================
-- CONSISTÊNCIA / SEQUÊNCIA (Streaks)
-- =====================================================================
('streak_3', 'Aquecimento', 'Complete exercícios por 3 dias seguidos', 50, 'Flame', 'streak', '{"type": "streak", "count": 3}'),
('streak_7', 'Em Chamas', 'Complete exercícios por 7 dias seguidos', 150, 'Flame', 'streak', '{"type": "streak", "count": 7}'),
('streak_14', 'Hábito Formado', 'Complete exercícios por 14 dias seguidos', 300, 'Zap', 'streak', '{"type": "streak", "count": 14}'),
('streak_30', 'Guerreiro Mensal', 'Complete exercícios por 30 dias seguidos', 1000, 'Crown', 'streak', '{"type": "streak", "count": 30}'),
('streak_60', 'Lenda Persistente', 'Complete exercícios por 60 dias seguidos', 2500, 'Sparkles', 'streak', '{"type": "streak", "count": 60}'),
('streak_90', 'Trimestre Perfeito', 'Complete exercícios por 90 dias seguidos', 5000, 'Medal', 'streak', '{"type": "streak", "count": 90}'),

-- =====================================================================
-- VOLUME / SESSÕES (Milestones)
-- =====================================================================
('sessions_1', 'Primeiro Passo', 'Complete sua primeira sessão de exercícios', 50, 'Footprints', 'milestone', '{"type": "sessions", "count": 1}'),
('sessions_5', 'Pegando o Ritmo', 'Complete 5 sessões de exercícios', 100, 'Activity', 'milestone', '{"type": "sessions", "count": 5}'),
('sessions_10', 'Comprometido', 'Complete 10 sessões de exercícios', 200, 'Target', 'milestone', '{"type": "sessions", "count": 10}'),
('sessions_25', 'Veterano', 'Complete 25 sessões de exercícios', 500, 'Award', 'milestone', '{"type": "sessions", "count": 25}'),
('sessions_50', 'Mestre da Reabilitação', 'Complete 50 sessões de exercícios', 1000, 'Trophy', 'milestone', '{"type": "sessions", "count": 50}'),
('sessions_100', 'Centenário', 'Complete 100 sessões de exercícios', 2500, 'Gem', 'milestone', '{"type": "sessions", "count": 100}'),

-- =====================================================================
-- TEMPO / HORÁRIOS (Timing)
-- =====================================================================
('early_bird', 'Madrugador', 'Complete uma sessão antes das 8:00', 75, 'Sunrise', 'timing', '{"type": "time_before", "hour": 8}'),
('night_owl', 'Coruja Noturna', 'Complete uma sessão após as 20:00', 75, 'Moon', 'timing', '{"type": "time_after", "hour": 20}'),
('weekend_warrior', 'Guerreiro de Fim de Semana', 'Complete uma sessão no sábado ou domingo', 100, 'Calendar', 'timing', '{"type": "weekend"}'),
('lunch_break', 'Pausa Saudável', 'Complete uma sessão entre 12:00 e 14:00', 75, 'Coffee', 'timing', '{"type": "time_between", "start": 12, "end": 14}'),

-- =====================================================================
-- RECUPERAÇÃO / DOR (Recovery)
-- =====================================================================
('pain_log_5', 'Monitoramento Constante', 'Registre sua dor por 5 dias', 100, 'Clipboard', 'recovery', '{"type": "pain_log_count", "count": 5}'),
('pain_log_30', 'Diário de Recuperação', 'Registre sua dor por 30 dias', 500, 'Book', 'recovery', '{"type": "pain_log_count", "count": 30}'),
('pain_relief', 'Alívio Conquistado', 'Registre redução de dor após exercício', 150, 'Heart', 'recovery', '{"type": "pain_reduction"}'),
('pain_free', 'Livre da Dor', 'Registre nível 0 de dor por 3 dias seguidos', 300, 'Smile', 'recovery', '{"type": "pain_free_streak", "count": 3}'),

-- =====================================================================
-- PROGRESSO / EVOLUÇÃO (Progress)
-- =====================================================================
('evolution_10', 'Melhora Visível', 'Atingir 10 pontos de evolução', 100, 'TrendingUp', 'progress', '{"type": "evolution_score", "count": 10}'),
('evolution_50', 'Meio Caminho', 'Atingir 50 pontos de evolução', 400, 'BarChart', 'progress', '{"type": "evolution_score", "count": 50}'),
('evolution_100', 'Transformação Completa', 'Atingir 100 pontos de evolução', 1000, 'Rocket', 'progress', '{"type": "evolution_score", "count": 100}'),

-- =====================================================================
-- NÍVEIS (Level Milestones)
-- =====================================================================
('level_5', 'Nível 5', 'Chegue ao nível 5', 200, 'Star', 'level', '{"type": "level", "count": 5}'),
('level_10', 'Nível 10', 'Chegue ao nível 10', 500, 'Star', 'level', '{"type": "level", "count": 10}'),
('level_20', 'Nível 20', 'Chegue ao nível 20', 1200, 'Star', 'level', '{"type": "level", "count": 20}'),
('level_50', 'Nível 50', 'Chegue ao nível 50 - Meio Caminho para Glória!', 3000, 'Crown', 'level', '{"type": "level", "count": 50}'),

-- =====================================================================
-- EXERCÍCIOS ESPECÍFICOS (Exercise Types)
-- =====================================================================
('mobility_master', 'Mestre da Mobilidade', 'Complete 10 sessões de mobilidade', 200, 'Arm', 'exercise', '{"type": "exercise_category", "category": "mobility", "count": 10}'),
('strength_hero', 'Herói da Força', 'Complete 10 sessões de fortalecimento', 200, 'Dumbbell', 'exercise', '{"type": "exercise_category", "category": "strength", "count": 10}'),
('balance_guru', 'Guru do Equilíbrio', 'Complete 10 sessões de equilíbrio', 200, 'Scale', 'exercise', '{"type": "exercise_category", "category": "balance", "count": 10}'),

-- =====================================================================
-- CONQUISTAS ESPECIAIS (Special)
-- =====================================================================
('perfectionist', 'Perfeccionista', 'Complete todos os exercícios prescritos em um dia', 300, 'CheckCircle', 'special', '{"type": "complete_all_daily"}'),
('speed_demon', 'Velocista', 'Complete uma sessão em menos de 5 minutos', 150, 'Zap', 'special', '{"type": "fast_session", "minutes": 5}'),
('dedicated', 'Dedicado', 'Complete sessões por 7 dias consecutivos (independente do tipo)', 350, 'Heart', 'special', '{"type": "daily_activity", "count": 7}'),
('social_butterfly', 'Social', 'Compartilhe seu progresso pela primeira vez', 100, 'Share', 'special', '{"type": "share_progress"}')

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    xp_reward = EXCLUDED.xp_reward,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    requirements = EXCLUDED.requirements;

-- =====================================================================
-- LEVEL BADGES (Badges por Nível)
-- =====================================================================

INSERT INTO public.achievements (code, title, description, xp_reward, icon, category, requirements)
VALUES
('novice', 'Novato', 'Iniciou sua jornada de reabilitação', 0, 'Seeding', 'level', '{"type": "level", "count": 1}'),
('apprentice', 'Aprendiz', 'Aprendendo os exercícios básicos', 0, 'Sprout', 'level', '{"type": "level", "count": 5}'),
('practitioner', 'Praticante', 'Exercícios tornaram-se hábito', 0, 'Leaf', 'level', '{"type": "level", "count": 10}'),
('expert', 'Especialista', 'Dominando sua recuperação', 0, 'Flower', 'level', '{"type": "level", "count": 20}'),
('master', 'Mestre', 'Jornada de recuperação completa', 0, 'Tree', 'level', '{"type": "level", "count": 50}')
ON CONFLICT (code) DO NOTHING;

-- =====================================================================
-- GAMIFICATION SETTINGS (Configurações)
-- =====================================================================

-- Criar tabela de configurações se não existir
CREATE TABLE IF NOT EXISTS public.gamification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações padrão
INSERT INTO public.gamification_settings (key, value, description)
VALUES
('xp_level_curve', '{"formula": "100 * n^1.5", "max_level": 100}', 'Curva de XP por nível'),
('daily_quest_refresh', '{"hour": 0, "timezone": "America/Sao_Paulo"}', 'Horário de refresh das quests diárias'),
('streak_freeze_cost', '{"price": 100, "max_per_month": 3}', 'Custo para congelar sequência'),
('achievement_notification', '{"enabled": true, "sound": true}', 'Notificações de conquistas')
ON CONFLICT (key) DO NOTHING;

-- =====================================================================
-- RELATÓRIO DO SEED
-- =====================================================================

DO $$
DECLARE
  v_achievements INT;
  v_quests_daily INT;
  v_quests_weekly INT;
BEGIN
  SELECT COUNT(*) INTO v_achievements FROM public.achievements;
  SELECT COUNT(*) INTO v_quests_daily FROM public.quest_definitions WHERE category = 'daily';
  SELECT COUNT(*) INTO v_quests_weekly FROM public.quest_definitions WHERE category = 'weekly';

  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Gamification Seed Completed!';
  RAISE NOTICE '- Achievements: %', v_achievements;
  RAISE NOTICE '- Daily Quests: %', v_quests_daily;
  RAISE NOTICE '- Weekly Challenges: %', v_quests_weekly;
  RAISE NOTICE '====================================================================';
END $$;
