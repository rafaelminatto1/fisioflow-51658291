-- Migration: Add Level System Settings for Gamification
-- Date: 2025-01-25
-- Description: Adds configuration options for the level progression system

-- Insert level system settings
INSERT INTO public.gamification_settings (key, value, description) VALUES
('level_progression_type', '"linear"', 'Tipo de progressão de nível: linear, exponential, custom'),
('level_base_xp', '1000', 'XP base necessário para subir de nível (progressão linear)'),
('level_multiplier', '1.5', 'Multiplicador de XP para progressão exponencial'),
('level_titles', '[]', 'Títulos personalizados por nível (array de strings)'),
('level_rewards', '[]', 'Recompensas por nível atingido (array de objetos)'),
('leaderboard_default_period', '"all"', 'Período padrão do leaderboard: week, month, all'),
('leaderboard_default_category', '"level"', 'Categoria padrão de ordenação: level, xp, streak, achievements')
ON CONFLICT (key) DO NOTHING;

-- Add comment to document the settings
COMMENT ON TABLE public.gamification_settings IS 'Configurações do sistema de gamificação';

-- Update existing descriptions for better clarity
UPDATE public.gamification_settings
SET description = 'Multiplicador global aplicado ao ganho de XP'
WHERE key = 'xp_multiplier';

UPDATE public.gamification_settings
SET description = 'XP base necessário para o nível 1 (usado na progressão)'
WHERE key = 'level_base_xp';

UPDATE public.gamification_settings
SET description = 'XP bônus por atingir a meta diária de missões'
WHERE key = 'daily_goal_xp';

UPDATE public.gamification_settings
SET description = 'XP base por dia de sequência consecutiva'
WHERE key = 'streak_bonus_base';
