-- ============================================================================
-- Correções e Melhorias no Sistema de Gamificação
-- ============================================================================

-- 1. Renomear função para compatibilidade
CREATE OR REPLACE FUNCTION refresh_daily_quests()
RETURNS void AS $$
BEGIN
    -- Chamar a função existente
    PERFORM daily_quest_refresh_job();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION refresh_daily_quests() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_daily_quests() TO service_role;

-- 2. Índices adicionais para performance
CREATE INDEX IF NOT EXISTS idx_patient_quests_patient_status_expires
    ON public.patient_quests(patient_id, status, expires_at)
    WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gamification_notifications_patient_read
    ON public.gamification_notifications(patient_id, read_at)
    WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_achievements_log_patient_unlocked
    ON public.achievements_log(patient_id, unlocked_at DESC);

-- 3. Configurações do sistema na tabela gamification_settings
INSERT INTO public.gamification_settings (key, value, description) VALUES
('streak_freeze_cost', '500', 'Custo em pontos do streak freeze'),
('streak_freeze_max_per_month', '2', 'Limite mensal de streak freeze'),
('notification_expires_days', '30', 'Dias até expiração de notificação'),
('level_base_xp', '1000', 'XP base para nível 1'),
('level_multiplier', '1.2', 'Multiplicador de XP por nível'),
('max_level', '100', 'Nível máximo do sistema'),
('quest_refresh_hour', '0', 'Hora diária para refresh de quests (0-23)'),
('xp_bonus_streak_7', '100', 'Bônus de XP por streak de 7 dias'),
('xp_bonus_streak_30', '500', 'Bônus de XP por streak de 30 dias'),
('xp_bonus_streak_90', '2000', 'Bônus de XP por streak de 90 dias')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description;

-- 4. Função para buscar configurações
CREATE OR REPLACE FUNCTION get_gamification_settings(p_keys TEXT[] DEFAULT NULL)
RETURNS TABLE(
    setting_key TEXT,
    setting_value JSONB,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        key as setting_key,
        value as setting_value,
        description
    FROM public.gamification_settings
    WHERE p_keys IS NULL OR key = ANY(p_keys);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_gamification_settings(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_gamification_settings(TEXT[]) TO service_role;

-- 5. Função melhorada para calcular nível baseado em configurações
CREATE OR REPLACE FUNCTION calculate_level_from_xp(p_total_xp INTEGER)
RETURNS TABLE(
    level INTEGER,
    current_level_xp INTEGER,
    xp_for_next_level INTEGER,
    progress_percent NUMERIC
) AS $$
DECLARE
    v_settings RECORD;
    v_base_xp INTEGER := 1000;
    v_multiplier NUMERIC := 1.2;
    v_max_level INTEGER := 100;
    v_level INTEGER := 1;
    v_accumulated_xp INTEGER := 0;
    v_xp_for_next_level INTEGER;
    v_current_level_xp INTEGER;
    v_progress_percent NUMERIC;
BEGIN
    -- Buscar configurações
    SELECT * INTO v_settings FROM get_gamification_settings(ARRAY['level_base_xp', 'level_multiplier', 'max_level']);

    IF v_settings.setting_key IS NOT NULL THEN
        v_base_xp := COALESCE((v_settings.setting_value->>'0')::INTEGER, 1000);
    END IF;

    -- Buscar multiplier
    SELECT * INTO v_settings FROM get_gamification_settings(ARRAY['level_multiplier']);
    IF v_settings.setting_key IS NOT NULL THEN
        v_multiplier := COALESCE((v_settings.setting_value->>'0')::NUMERIC, 1.2);
    END IF;

    -- Buscar max_level
    SELECT * INTO v_settings FROM get_gamification_settings(ARRAY['max_level']);
    IF v_settings.setting_key IS NOT NULL THEN
        v_max_level := COALESCE((v_settings.setting_value->>'0')::INTEGER, 100);
    END IF;

    -- Calcular nível
    v_xp_for_next_level := v_base_xp;

    WHILE v_level < v_max_level AND p_total_xp >= v_accumulated_xp + v_xp_for_next_level LOOP
        v_accumulated_xp := v_accumulated_xp + v_xp_for_next_level;
        v_level := v_level + 1;
        v_xp_for_next_level := FLOOR(v_xp_for_next_level * v_multiplier);
    END LOOP;

    v_current_level_xp := p_total_xp - v_accumulated_xp;
    v_progress_percent := CASE
        WHEN v_xp_for_next_level > 0 THEN ROUND((v_current_level_xp::NUMERIC / v_xp_for_next_level) * 100, 2)
        ELSE 100
    END;

    RETURN QUERY SELECT v_level, v_current_level_xp, v_xp_for_next_level, v_progress_percent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calculate_level_from_xp(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_level_from_xp(INTEGER) TO service_role;

-- 6. Função para adicionar XP com cálculo automático de nível
CREATE OR REPLACE FUNCTION add_xp_with_level_up(
    p_patient_id UUID,
    p_amount INTEGER,
    p_reason TEXT DEFAULT 'manual',
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE(
    old_level INTEGER,
    new_level INTEGER,
    leveled_up BOOLEAN,
    total_xp INTEGER
) AS $$
DECLARE
    v_old_level INTEGER;
    v_new_level INTEGER;
    v_current_total INTEGER;
    v_new_total INTEGER;
BEGIN
    -- Buscar nível atual
    SELECT level INTO v_old_level
    FROM public.patient_gamification
    WHERE patient_id = p_patient_id;

    IF v_old_level IS NULL THEN
        v_old_level := 1;
    END IF;

    -- Adicionar XP
    UPDATE public.patient_gamification
    SET
        total_points = COALESCE(total_points, 0) + p_amount,
        current_xp = COALESCE(current_xp, 0) + p_amount,
        last_activity_date = NOW()
    WHERE patient_id = p_patient_id
    RETURNING total_points INTO v_new_total;

    -- Calcular novo nível
    SELECT level INTO v_new_level
    FROM calculate_level_from_xp(v_new_total);

    -- Atualizar nível se mudou
    IF v_new_level > v_old_level THEN
        UPDATE public.patient_gamification
        SET level = v_new_level
        WHERE patient_id = p_patient_id;
    END IF;

    -- Registrar transação
    INSERT INTO public.xp_transactions (patient_id, amount, reason, description)
    VALUES (p_patient_id, p_amount, p_reason, p_description);

    -- Retornar resultado
    RETURN QUERY SELECT v_old_level, v_new_level, v_new_level > v_old_level, v_new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_xp_with_level_up(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_xp_with_level_up(UUID, INTEGER, TEXT, TEXT) TO service_role;

-- 7. Trigger para calcular nível automaticamente ao adicionar XP
CREATE OR REPLACE FUNCTION calculate_level_on_xp_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular novo nível
    UPDATE public.patient_gamification
    SET level = (
        SELECT level FROM calculate_level_from_xp(NEW.total_points)
    )
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS calculate_level_on_xp_add ON public.patient_gamification;
CREATE TRIGGER calculate_level_on_xp_add
    AFTER UPDATE OF total_points ON public.patient_gamification
    FOR EACH ROW
    WHEN (NEW.total_points IS DISTINCT FROM OLD.total_points)
    EXECUTE FUNCTION calculate_level_on_xp_trigger();

-- 8. Função para verificar e desbloquear achievements automaticamente
CREATE OR REPLACE FUNCTION check_and_unlock_achievement_batch(p_patient_id UUID)
RETURNS TABLE(
    achievement_code TEXT,
    achievement_title TEXT,
    unlocked BOOLEAN,
    xp_awarded INTEGER
) AS $$
DECLARE
    v_achievement RECORD;
    v_unlocked BOOLEAN;
BEGIN
    -- Buscar todos os achievements ativos
    FOR v_achievement IN
        SELECT code, title, xp_reward FROM public.achievements WHERE is_active IS NOT FALSE
    LOOP
        -- Tentar desbloquear
        SELECT check_and_unlock_achievement(p_patient_id, v_achievement.code)
        INTO v_unlocked;

        RETURN QUERY SELECT
            v_achievement.code,
            v_achievement.title,
            COALESCE(v_unlocked, false),
            v_achievement.xp_reward;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_and_unlock_achievement_batch(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_unlock_achievement_batch(UUID) TO service_role;

-- Relatório
DO $$
BEGIN
    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'Gamification System Improvements Applied!';
    RAISE NOTICE '';
    RAISE NOTICE 'New Functions:';
    RAISE NOTICE '- refresh_daily_quests()';
    RAISE NOTICE '- get_gamification_settings(keys[])';
    RAISE NOTICE '- calculate_level_from_xp(xp)';
    RAISE NOTICE '- add_xp_with_level_up(patient, amount, reason, description)';
    RAISE NOTICE '- check_and_unlock_achievement_batch(patient_id)';
    RAISE NOTICE '';
    RAISE NOTICE 'New Indexes:';
    RAISE NOTICE '- idx_patient_quests_patient_status_expires';
    RAISE NOTICE '- idx_gamification_notifications_patient_read';
    RAISE NOTICE '- idx_achievements_log_patient_unlocked';
    RAISE NOTICE '====================================================================';
END $$;
