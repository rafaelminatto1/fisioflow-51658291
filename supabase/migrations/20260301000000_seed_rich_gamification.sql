-- =====================================================================
-- Seed Rich Gamification Data
-- Sistema de gamificação completo para engajamento de pacientes
-- =====================================================================

-- =====================================================================
-- 1. ACHIEVEMENTS (Conquistas)
-- =====================================================================

-- Inserir achievements com upsert para evitar duplicatas
INSERT INTO public.achievements (code, title, description, xp_reward, icon, category, requirements, rarity, hidden)
VALUES
-- =====================================================================
-- CONSISTÊNCIA / SEQUÊNCIA (Streaks)
-- =====================================================================
('streak_3', 'Aquecimento', 'Complete exercícios por 3 dias seguidos', 50, 'Flame', 'streak', '{"type": "streak", "count": 3}', 'common', false),
('streak_7', 'Em Chamas', 'Complete exercícios por 7 dias seguidos', 150, 'Flame', 'streak', '{"type": "streak", "count": 7}', 'common', false),
('streak_14', 'Hábito Formado', 'Complete exercícios por 14 dias seguidos', 300, 'Zap', 'streak', '{"type": "streak", "count": 14}', 'rare', false),
('streak_30', 'Guerreiro Mensal', 'Complete exercícios por 30 dias seguidos', 1000, 'Crown', 'streak', '{"type": "streak", "count": 30}', 'epic', false),
('streak_60', 'Lenda Persistente', 'Complete exercícios por 60 dias seguidos', 2500, 'Sparkles', 'streak', '{"type": "streak", "count": 60}', 'legendary', false),
('streak_90', 'Trimestre Perfeito', 'Complete exercícios por 90 dias seguidos', 5000, 'Medal', 'streak', '{"type": "streak", "count": 90}', 'legendary', true),

-- =====================================================================
-- VOLUME / SESSÕES (Milestones)
-- =====================================================================
('sessions_1', 'Primeiro Passo', 'Complete sua primeira sessão de exercícios', 50, 'Footprints', 'milestone', '{"type": "sessions", "count": 1}', 'common', false),
('sessions_5', 'Pegando o Ritmo', 'Complete 5 sessões de exercícios', 100, 'Activity', 'milestone', '{"type": "sessions", "count": 5}', 'common', false),
('sessions_10', 'Comprometido', 'Complete 10 sessões de exercícios', 200, 'Target', 'milestone', '{"type": "sessions", "count": 10}', 'common', false),
('sessions_25', 'Veterano', 'Complete 25 sessões de exercícios', 500, 'Award', 'milestone', '{"type": "sessions", "count": 25}', 'rare', false),
('sessions_50', 'Mestre da Reabilitação', 'Complete 50 sessões de exercícios', 1000, 'Trophy', 'milestone', '{"type": "sessions", "count": 50}', 'epic', false),
('sessions_100', 'Centenário', 'Complete 100 sessões de exercícios', 2500, 'Gem', 'milestone', '{"type": "sessions", "count": 100}', 'legendary', true),

-- =====================================================================
-- TEMPO / HORÁRIOS (Timing)
-- =====================================================================
('early_bird', 'Madrugador', 'Complete uma sessão antes das 8:00', 75, 'Sunrise', 'timing', '{"type": "time_before", "hour": 8}', 'common', false),
('night_owl', 'Coruja Noturna', 'Complete uma sessão após as 20:00', 75, 'Moon', 'timing', '{"type": "time_after", "hour": 20}', 'common', false),
('weekend_warrior', 'Guerreiro de Fim de Semana', 'Complete uma sessão no sábado ou domingo', 100, 'Calendar', 'timing', '{"type": "weekend"}', 'common', false),
('lunch_break', 'Pausa Saudável', 'Complete uma sessão entre 12:00 e 14:00', 75, 'Coffee', 'timing', '{"type": "time_between", "start": 12, "end": 14}', 'common', false),

-- =====================================================================
-- RECUPERAÇÃO / DOR (Recovery)
-- =====================================================================
('pain_log_5', 'Monitoramento Constante', 'Registre sua dor por 5 dias', 100, 'Clipboard', 'recovery', '{"type": "pain_log_count", "count": 5}', 'common', false),
('pain_log_30', 'Diário de Recuperação', 'Registre sua dor por 30 dias', 500, 'Book', 'recovery', '{"type": "pain_log_count", "count": 30}', 'rare', false),
('pain_relief', 'Alívio Conquistado', 'Registre redução de dor após exercício', 150, 'Heart', 'recovery', '{"type": "pain_reduction"}', 'common', false),
('pain_free', 'Livre da Dor', 'Registre nível 0 de dor por 3 dias seguidos', 300, 'Smile', 'recovery', '{"type": "pain_free_streak", "count": 3}', 'rare', true),

-- =====================================================================
-- PROGRESSO / EVOLUÇÃO (Progress)
-- =====================================================================
('evolution_10', 'Melhora Visível', 'Atingir 10 pontos de evolução', 100, 'TrendingUp', 'progress', '{"type": "evolution_score", "count": 10}', 'common', false),
('evolution_50', 'Meio Caminho', 'Atingir 50 pontos de evolução', 400, 'BarChart', 'progress', '{"type": "evolution_score", "count": 50}', 'rare', false),
('evolution_100', 'Transformação Completa', 'Atingir 100 pontos de evolução', 1000, 'Rocket', 'progress', '{"type": "evolution_score", "count": 100}', 'epic', false),

-- =====================================================================
-- NÍVEIS (Level Milestones)
-- =====================================================================
('level_5', 'Nível 5', 'Chegue ao nível 5', 200, 'Star', 'level', '{"type": "level", "count": 5}', 'common', false),
('level_10', 'Nível 10', 'Chegue ao nível 10', 500, 'Star', 'level', '{"type": "level", "count": 10}', 'rare', false),
('level_20', 'Nível 20', 'Chegue ao nível 20', 1200, 'Star', 'level', '{"type": "level", "count": 20}', 'epic', false),
('level_50', 'Nível 50', 'Chegue ao nível 50 - Meio Caminho para Glória!', 3000, 'Crown', 'level', '{"type": "level", "count": 50}', 'legendary', true),

-- =====================================================================
-- EXERCÍCIOS ESPECÍFICOS (Exercise Types)
-- =====================================================================
('mobility_master', 'Mestre da Mobilidade', 'Complete 10 sessões de mobilidade', 200, 'Arm', 'exercise', '{"type": "exercise_category", "category": "mobility", "count": 10}', 'common', false),
('strength_hero', 'Herói da Força', 'Complete 10 sessões de fortalecimento', 200, 'Dumbbell', 'exercise', '{"type": "exercise_category", "category": "strength", "count": 10}', 'common', false),
('balance_guru', 'Guru do Equilíbrio', 'Complete 10 sessões de equilíbrio', 200, 'Scale', 'exercise', '{"type": "exercise_category", "category": "balance", "count": 10}', 'common', false),

-- =====================================================================
-- CONQUISTAS ESPECIAIS (Special)
-- =====================================================================
('perfectionist', 'Perfeccionista', 'Complete todos os exercícios prescritos em um dia', 300, 'CheckCircle', 'special', '{"type": "complete_all_daily"}', 'rare', false),
('speed_demon', 'Velocista', 'Complete uma sessão em menos de 5 minutos', 150, 'Zap', 'special', '{"type": "fast_session", "minutes": 5}', 'common', false),
('dedicated', 'Dedicado', 'Complete sessões por 7 dias consecutivos (independente do tipo)', 350, 'Heart', 'special', '{"type": "daily_activity", "count": 7}', 'rare', false),
('social_butterfly', 'Social', 'Compartilhe seu progresso pela primeira vez', 100, 'Share', 'special', '{"type": "share_progress"}', 'common', false)

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    xp_reward = EXCLUDED.xp_reward,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    requirements = EXCLUDED.requirements,
    rarity = COALESCE(EXCLUDED.rarity, achievements.rarity),
    hidden = COALESCE(EXCLUDED.hidden, achievements.hidden);

-- =====================================================================
-- 2. DAILY QUEST DEFINITIONS (Missões Diárias)
-- =====================================================================

-- Remover quests antigas para evitar duplicatas
DELETE FROM public.quest_definitions WHERE category = 'daily';

-- Inserir quests diárias com código único
INSERT INTO public.quest_definitions (code, title, description, xp_reward, icon, category, is_active, difficulty)
VALUES
-- Fáceis (15-30 XP)
('daily_stretch_easy', 'Alongamento Rápido', 'Faça um alongamento de 2 minutos', 15, 'Move', 'daily', true, 'easy'),
('daily_mood_log', 'Registro de Humor', 'Como você está se sentindo hoje?', 15, 'Smile', 'daily', true, 'easy'),
('daily_breathing', 'Respiração Profunda', 'Pratique 5 minutos de respiração', 20, 'Wind', 'daily', true, 'easy'),

-- Médias (30-50 XP)
('daily_walk', 'Caminhada Leve', 'Caminhe por 10 minutos', 30, 'Footprints', 'daily', true, 'medium'),
('daily_posture', 'Postura Correta', 'Faça 1 exercício de postura', 35, 'Person', 'daily', true, 'medium'),
('daily_hydration', 'Hidratação', 'Beba 8 copos de água', 40, 'Droplet', 'daily', true, 'medium'),

-- Difíceis (50-75 XP)
('daily_strength', 'Fortalecimento', 'Complete 1 sessão de fortalecimento', 50, 'Dumbbell', 'daily', true, 'hard'),
('daily_mobility', 'Mobilidade Completa', 'Complete 10 minutos de mobilidade', 55, 'Arm', 'daily', true, 'hard'),
('daily_balance', 'Equilíbrio', 'Pratique 5 minutos de exercícios de equilíbrio', 60, 'Scale', 'daily', true, 'hard');

-- =====================================================================
-- 3. WEEKLY CHALLENGES (Desafios Semanais)
-- =====================================================================

DELETE FROM public.quest_definitions WHERE category = 'weekly';

INSERT INTO public.quest_definitions (code, title, description, xp_reward, icon, category, is_active, difficulty)
VALUES
('week_sessions_5', 'Semana Ativa', 'Complete 5 sessões esta semana', 300, 'Calendar', 'weekly', true, 'medium'),
('week_streak_5', 'Sequência Semanal', '5 dias consecutivos de exercícios', 400, 'Flame', 'weekly', true, 'hard'),
('week_exercise_types', 'Variado é Bom', 'Complete 3 tipos diferentes de exercícios', 250, 'Grid', 'weekly', true, 'medium'),
('week_no_pain', 'Semana sem Dor', 'Mantenha dor nível 0-2 durante a semana', 500, 'Heart', 'weekly', true, 'hard'),
('week_early_bird', 'Semana Madrugadora', '3 sessões antes das 8h esta semana', 350, 'Sunrise', 'weekly', true, 'medium');

-- =====================================================================
-- 4. LEVEL REWARDS (Recompensas por Nível)
-- =====================================================================

-- Configurar curva de XP necessária por nível
-- Nível 1: 0 XP (início)
-- Nível 2: 100 XP
-- Nível 3: 250 XP (total)
-- Nível 4: 450 XP (total)
-- Nível 5: 700 XP (total)
-- Fórmula: XP(n) = 100 * n^1.5

-- Badges desbloqueados por nível
INSERT INTO public.achievements (code, title, description, xp_reward, icon, category, requirements, rarity, hidden)
VALUES
('novice', 'Novato', 'Iniciou sua jornada de reabilitação', 0, 'Seeding', 'level', '{"type": "level", "count": 1}', 'common', false),
('apprentice', 'Aprendiz', 'Aprendendo os exercícios básicos', 0, 'Sprout', 'level', '{"type": "level", "count": 5}', 'common', false),
('practitioner', 'Praticante', 'Exercícios tornaram-se hábito', 0, 'Leaf', 'level', '{"type": "level", "count": 10}', 'rare', false),
('expert', 'Especialista', 'Dominando sua recuperação', 0, 'Flower', 'level', '{"type": "level", "count": 20}', 'epic', false),
('master', 'Mestre', 'Jornada de recuperação completa', 0, 'Tree', 'level', '{"type": "level", "count": 50}', 'legendary', true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================================
-- 5. SEASONAL EVENTS (Eventos Sazonais)
-- =====================================================================

-- Verão 2026
INSERT INTO public.quest_definitions (code, title, description, xp_reward, icon, category, is_active, difficulty, starts_at, ends_at)
VALUES
('summer_2026_start', 'Desafio de Verão', 'Complete 20 sessões em janeiro', 1000, 'Sun', 'seasonal', true, 'hard', '2026-01-01', '2026-01-31'),
('summer_2026_streak', 'Verão Intenso', 'Sequência de 14 dias em janeiro', 1500, 'Flame', 'seasonal', true, 'epic', '2026-01-01', '2026-01-31')
ON CONFLICT (code) DO NOTHING;

-- =====================================================================
-- 6. GAMIFICATION SETTINGS (Configurações)
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
-- 7. SAMPLE USER PROGRESSION (Exemplo para teste)
-- =====================================================================

-- Criar alguns tiers de recompensa se não existirem
INSERT INTO public.reward_tiers (code, name, description, icon, required_level, benefits)
VALUES
('bronze', 'Bronze', 'Membro Bronze', '🥉', 1, '["daily_quest_x1.5", "custom_avatar"]'),
('silver', 'Prata', 'Membro Prata', '🥈', 5, '["daily_quest_x2", "exclusive_exercises", "priority_support"]'),
('gold', 'Ouro', 'Membro Ouro', '🥇', 10, '["daily_quest_x3", "monthly_badge", "early_access"]'),
('platinum', 'Platina', 'Membro Platina', '💎', 20, '["all_benefits", "consultant_access", "annual_reward"]')
ON CONFLICT (code) DO NOTHING;

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
