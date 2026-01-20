-- ============================================================================
-- Adicionar coluna is_active à tabela achievements se não existir
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'achievements') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'achievements' AND column_name = 'is_active'
        ) THEN
            ALTER TABLE public.achievements ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- Criar função para adicionar XP a um paciente (usada pelo sistema)
-- ============================================================================
CREATE OR REPLACE FUNCTION add_xp_to_patient(
    p_patient_id UUID,
    p_amount INTEGER
)
RETURNS void AS $$
BEGIN
    UPDATE public.patient_gamification
    SET
        total_points = total_points + p_amount,
        current_xp = current_xp + p_amount,
        last_activity_date = NOW()
    WHERE patient_id = p_patient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissão
GRANT EXECUTE ON FUNCTION add_xp_to_patient(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION add_xp_to_patient(UUID, INTEGER) TO service_role;

-- Ativar quests diárias para todos os pacientes
DO $$
DECLARE
    v_patient RECORD;
    v_daily_quest RECORD;
    v_count INTEGER := 0;
BEGIN
    -- Para cada paciente com gamificação ativa
    FOR v_patient IN
        SELECT patient_id FROM public.patient_gamification
    LOOP
        -- Buscar quests diárias ativas
        FOR v_daily_quest IN
            SELECT id FROM public.quest_definitions
            WHERE category = 'daily'
            AND is_active = true
            AND (start_date IS NULL OR start_date <= NOW())
            AND (end_date IS NULL OR end_date >= NOW())
        LOOP
            -- Inserir patient_quest se não existe
            INSERT INTO public.patient_quests (
                patient_id,
                quest_id,
                status,
                expires_at
            ) VALUES (
                v_patient.patient_id,
                v_daily_quest.id,
                'pending',
                DATE_TRUNC('day', NOW() + INTERVAL '1 day') - INTERVAL '1 second'
            )
            ON CONFLICT (patient_id, quest_id) DO NOTHING;

            v_count := v_count + 1;
        END LOOP;
    END LOOP;

    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'Daily Quests Activated!';
    RAISE NOTICE 'Total quests assigned: %', v_count;
    RAISE NOTICE '====================================================================';
END $$;

-- Criar função para ser executada diariamente (via cron ou pg_cron)
CREATE OR REPLACE FUNCTION daily_quest_refresh_job()
RETURNS void AS $$
BEGIN
    PERFORM refresh_daily_quests();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION daily_quest_refresh_job() TO service_role;

-- ============================================================================
-- Verificar e popular achievements com requisitos corretos
-- ============================================================================

-- Atualizar achievements existentes com requisitos padrão se não tiverem
UPDATE public.achievements
SET requirements = jsonb_build_object(
    'type', 'streak',
    'count', 7
)
WHERE code = 'streak_fire'
AND (requirements IS NULL OR requirements = '{}'::jsonb);

UPDATE public.achievements
SET requirements = jsonb_build_object(
    'type', 'sessions',
    'count', 20
)
WHERE code = 'precision_total'
AND (requirements IS NULL OR requirements = '{}'::jsonb);

UPDATE public.achievements
SET requirements = jsonb_build_object(
    'type', 'pain_free_streak',
    'count', 5
)
WHERE code = 'superacao'
AND (requirements IS NULL OR requirements = '{}'::jsonb);

UPDATE public.achievements
SET requirements = jsonb_build_object(
    'type', 'sessions',
    'count', 30
)
WHERE code = 'dedicacao'
AND (requirements IS NULL OR requirements = '{}'::jsonb);

UPDATE public.achievements
SET requirements = jsonb_build_object(
    'type', 'sessions',
    'count', 1
)
WHERE code = 'first_steps'
AND (requirements IS NULL OR requirements = '{}'::jsonb);

-- Criar achievements adicionais que estavam faltando
INSERT INTO public.achievements (code, title, description, xp_reward, icon, category, requirements, is_active)
VALUES
-- Streak Achievements
('streak_3', '3 Dias Seguidos', 'Complete exercícios por 3 dias seguidos', 50, 'Flame', 'streak', '{"type": "streak", "count": 3}', true),
('streak_7', 'Semana Perfeita', 'Complete exercícios por 7 dias seguidos', 100, 'Flame', 'streak', '{"type": "streak", "count": 7}', true),
('streak_14', 'Quinzena Inabalável', 'Complete exercícios por 14 dias seguidos', 200, 'Flame', 'streak', '{"type": "streak", "count": 14}', true),
('streak_30', 'Mês de Dedicação', 'Complete exercícios por 30 dias seguidos', 500, 'Flame', 'streak', '{"type": "streak", "count": 30}', true),
('streak_60', 'Bimestre de Foco', 'Complete exercícios por 60 dias seguidos', 1000, 'Flame', 'streak', '{"type": "streak", "count": 60}', true),
('streak_90', 'Trimestre Lendário', 'Complete exercícios por 90 dias seguidos', 2000, 'Flame', 'streak', '{"type": "streak", "count": 90}', true),

-- Session Achievements
('sessions_1', 'Primeiro Passo', 'Complete sua primeira sessão', 25, 'Footprints', 'sessions', '{"type": "sessions", "count": 1}', true),
('sessions_5', 'Começo Forte', 'Complete 5 sessões', 50, 'Activity', 'sessions', '{"type": "sessions", "count": 5}', true),
('sessions_10', 'Deca de Sessões', 'Complete 10 sessões', 100, 'Activity', 'sessions', '{"type": "sessions", "count": 10}', true),
('sessions_25', 'Quarter de Sessões', 'Complete 25 sessões', 200, 'Activity', 'sessions', '{"type": "sessions", "count": 25}', true),
('sessions_50', 'Meio Caminho', 'Complete 50 sessões', 400, 'Activity', 'sessions', '{"type": "sessions", "count": 50}', true),
('sessions_100', 'Centenário', 'Complete 100 sessões', 1000, 'Trophy', 'sessions', '{"type": "sessions", "count": 100}', true),

-- Level Achievements
('level_5', 'Aprendiz', 'Alcance o nível 5', 100, 'Star', 'level', '{"type": "level", "count": 5}', true),
('level_10', 'Praticante', 'Alcance o nível 10', 250, 'Star', 'level', '{"type": "level", "count": 10}', true),
('level_20', 'Experiente', 'Alcance o nível 20', 500, 'Star', 'level', '{"type": "level", "count": 20}', true),
('level_50', 'Mestre', 'Alcance o nível 50', 2000, 'Award', 'level', '{"type": "level", "count": 50}', true),

-- Pain Log Achievements
('pain_log_5', 'Registrador Iniciante', 'Registre sua dor por 5 dias', 50, 'Clipboard', 'pain_log', '{"type": "pain_log_count", "count": 5}', true),
('pain_log_30', 'Registrador Dedicado', 'Registre sua dor por 30 dias', 200, 'Clipboard', 'pain_log', '{"type": "pain_log_count", "count": 30}', true),
('pain_free', 'Livre de Dor', 'Registre nível 0 de dor', 100, 'Smile', 'recovery', '{"type": "pain_free_streak", "count": 1}', true),

-- Time-based Achievements
('early_bird', 'Madrugador', 'Complete uma sessão antes das 8:00', 75, 'Sunrise', 'special', '{"type": "time_before", "hour": 8}', true),
('night_owl', 'Noturno', 'Complete uma sessão após as 20:00', 75, 'Moon', 'special', '{"type": "time_after", "hour": 20}', true),
('weekend_warrior', 'Guerreiro do Fim de Semana', 'Complete uma sessão no fim de semana', 50, 'Calendar', 'special', '{"type": "weekend"}', true)

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    xp_reward = EXCLUDED.xp_reward,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    requirements = EXCLUDED.requirements,
    is_active = EXCLUDED.is_active;

-- Relatório final
DO $$
DECLARE
    v_achievements_count INTEGER;
    v_quests_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_achievements_count FROM public.achievements WHERE is_active = true;
    SELECT COUNT(*) INTO v_quests_count FROM public.quest_definitions WHERE is_active = true;

    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'Gamification System Setup Complete!';
    RAISE NOTICE '- Active Achievements: %', v_achievements_count;
    RAISE NOTICE '- Active Quests: %', v_quests_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Patients can now complete quests and unlock achievements';
    RAISE NOTICE '2. Notifications will appear automatically';
    RAISE NOTICE '3. Use SELECT refresh_daily_quests() to refresh daily quests';
    RAISE NOTICE '====================================================================';
END $$;
