-- ============================================================================
-- Achievement Unlocking System
-- Sistema automático de desbloqueio de achievements com triggers
-- ============================================================================

-- Verificar e adicionar colunas necessárias à tabela achievements_log se não existirem
DO $$
BEGIN
    -- Verificar se a tabela achievements_log tem a coluna achievement_id (UUID)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'achievements_log'
    ) THEN
        -- Adicionar achievement_id (UUID) se não existe e achievement_title já existe
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'achievements_log' AND column_name = 'achievement_title'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'achievements_log' AND column_name = 'achievement_id'
        ) THEN
            ALTER TABLE public.achievements_log ADD COLUMN achievement_id UUID REFERENCES public.achievements(id);
        END IF;
    ELSE
        -- Criar tabela achievements_log se não existe
        CREATE TABLE public.achievements_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
            achievement_id UUID REFERENCES public.achievements(id) ON DELETE SET NULL,
            achievement_title TEXT,
            unlocked_at TIMESTAMPTZ DEFAULT NOW(),
            xp_awarded INTEGER DEFAULT 0,
            metadata JSONB DEFAULT '{}'
        );

        -- RLS Policies
        ALTER TABLE public.achievements_log ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view own achievements"
            ON public.achievements_log FOR SELECT
            USING (auth.uid() = patient_id);

        CREATE POLICY "Therapists can view all achievements"
            ON public.achievements_log FOR SELECT
            USING (EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'fisioterapeuta'
            ));

        CREATE POLICY "System can insert achievements"
            ON public.achievements_log FOR INSERT
            WITH CHECK (true);

        -- Grant permissions
        GRANT ALL ON public.achievements_log TO authenticated;
        GRANT ALL ON public.achievements_log TO service_role;

        -- Índices
        CREATE INDEX idx_achievements_log_patient ON public.achievements_log(patient_id);
        CREATE INDEX idx_achievements_log_achievement ON public.achievements_log(achievement_id);
        CREATE INDEX idx_achievements_log_unlocked_at ON public.achievements_log(unlocked_at);
    END IF;
END $$;

-- ============================================================================
-- Função para verificar e desbloquear achievements
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_unlock_achievement(
    p_patient_id UUID,
    p_achievement_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_achievement RECORD;
    v_already_unlocked BOOLEAN;
    v_requirements JSONB;
    v_requirement_type TEXT;
    v_unlocked BOOLEAN := FALSE;
BEGIN
    -- Buscar o achievement
    SELECT * INTO v_achievement
    FROM public.achievements
    WHERE code = p_achievement_code;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Verificar se já foi desbloqueado
    SELECT EXISTS(
        SELECT 1 FROM public.achievements_log
        WHERE patient_id = p_patient_id
        AND (achievement_id = v_achievement.id OR achievement_title = v_achievement.title)
    ) INTO v_already_unlocked;

    IF v_already_unlocked THEN
        RETURN FALSE;
    END IF;

    -- Obter tipo de requisito
    v_requirements := v_achievement.requirements;
    v_requirement_type := v_requirements->>'type';

    -- Verificar requisitos baseado no tipo
    CASE v_requirement_type
        -- Streak: verificar sequência de dias
        WHEN 'streak' THEN
            DECLARE
                v_required_count INTEGER := (v_requirements->>'count')::INTEGER;
                v_current_streak INTEGER;
            BEGIN
                SELECT current_streak INTO v_current_streak
                FROM public.patient_gamification
                WHERE patient_id = p_patient_id;

                IF v_current_streak >= v_required_count THEN
                    v_unlocked := TRUE;
                END IF;
            END;

        -- Sessions: contar sessões completadas
        WHEN 'sessions' THEN
            DECLARE
                v_required_count INTEGER := (v_requirements->>'count')::INTEGER;
                v_session_count INTEGER;
            BEGIN
                SELECT COUNT(*) INTO v_session_count
                FROM public.tarefas
                WHERE patient_id = p_patient_id
                AND status = 'concluida'
                AND data_conclusao IS NOT NULL;

                IF v_session_count >= v_required_count THEN
                    v_unlocked := TRUE;
                END IF;
            END;

        -- Level: verificar nível atual
        WHEN 'level' THEN
            DECLARE
                v_required_level INTEGER := (v_requirements->>'count')::INTEGER;
                v_current_level INTEGER;
            BEGIN
                SELECT level INTO v_current_level
                FROM public.patient_gamification
                WHERE patient_id = p_patient_id;

                IF v_current_level >= v_required_level THEN
                    v_unlocked := TRUE;
                END IF;
            END;

        -- Pain log count: registrar dor por N dias
        WHEN 'pain_log_count' THEN
            DECLARE
                v_required_count INTEGER := (v_requirements->>'count')::INTEGER;
                v_pain_log_count INTEGER;
            BEGIN
                SELECT COUNT(DISTINCT DATE(data_registro)) INTO v_pain_log_count
                FROM public.pain_logs
                WHERE patient_id = p_patient_id;

                IF v_pain_log_count >= v_required_count THEN
                    v_unlocked := TRUE;
                END IF;
            END;

        -- Evolution score: atingir pontuação de evolução
        WHEN 'evolution_score' THEN
            DECLARE
                v_required_score INTEGER := (v_requirements->>'count')::INTEGER;
                v_evolution_score INTEGER;
            BEGIN
                SELECT COALESCE(SUM(pontuacao_evolucao), 0) INTO v_evolution_score
                FROM public.evolution_logs
                WHERE patient_id = p_patient_id;

                IF v_evolution_score >= v_required_score THEN
                    v_unlocked := TRUE;
                END IF;
            END;

        -- Pain free streak: dias sem dor
        WHEN 'pain_free_streak' THEN
            DECLARE
                v_required_count INTEGER := (v_requirements->>'count')::INTEGER;
                v_pain_free_streak INTEGER;
            BEGIN
                -- Contar dias consecutivos com nível 0 de dor
                WITH pain_free_days AS (
                    SELECT DISTINCT DATE(data_registro) as dia
                    FROM public.pain_logs
                    WHERE patient_id = p_patient_id
                    AND nivel_dor = 0
                    ORDER BY dia DESC
                ),
                streak_calc AS (
                    SELECT dia, dia - (ROW_NUMBER() OVER (ORDER BY dia DESC))::INTEGER as grp
                    FROM pain_free_days
                )
                SELECT COUNT(*) INTO v_pain_free_streak
                FROM streak_calc
                WHERE grp = (SELECT grp FROM streak_calc ORDER BY dia DESC LIMIT 1);

                IF v_pain_free_streak >= v_required_count THEN
                    v_unlocked := TRUE;
                END IF;
            END;

        -- Time before: completar antes de determinada hora
        WHEN 'time_before' THEN
            DECLARE
                v_target_hour INTEGER := (v_requirements->>'hour')::INTEGER;
                v_has_session BOOLEAN;
            BEGIN
                SELECT EXISTS(
                    SELECT 1 FROM public.tarefas
                    WHERE patient_id = p_patient_id
                    AND status = 'concluida'
                    AND EXTRACT(HOUR FROM data_conclusao) < v_target_hour
                ) INTO v_has_session;

                IF v_has_session THEN
                    v_unlocked := TRUE;
                END IF;
            END;

        -- Time after: completar após determinada hora
        WHEN 'time_after' THEN
            DECLARE
                v_target_hour INTEGER := (v_requirements->>'hour')::INTEGER;
                v_has_session BOOLEAN;
            BEGIN
                SELECT EXISTS(
                    SELECT 1 FROM public.tarefas
                    WHERE patient_id = p_patient_id
                    AND status = 'concluida'
                    AND EXTRACT(HOUR FROM data_conclusao) >= v_target_hour
                ) INTO v_has_session;

                IF v_has_session THEN
                    v_unlocked := TRUE;
                END IF;
            END;

        -- Weekend: completar no fim de semana
        WHEN 'weekend' THEN
            DECLARE
                v_has_weekend_session BOOLEAN;
            BEGIN
                SELECT EXISTS(
                    SELECT 1 FROM public.tarefas
                    WHERE patient_id = p_patient_id
                    AND status = 'concluida'
                    AND EXTRACT(ISODOW FROM data_conclusao) IN (6, 7)
                ) INTO v_has_weekend_session;

                IF v_has_weekend_session THEN
                    v_unlocked := TRUE;
                END IF;
            END;

        -- Daily activity: atividade por N dias consecutivos
        WHEN 'daily_activity' THEN
            DECLARE
                v_required_count INTEGER := (v_requirements->>'count')::INTEGER;
                v_activity_streak INTEGER;
            BEGIN
                WITH active_days AS (
                    SELECT DISTINCT DATE(data_conclusao) as dia
                    FROM public.tarefas
                    WHERE patient_id = p_patient_id
                    AND status = 'concluida'
                    ORDER BY dia DESC
                ),
                streak_calc AS (
                    SELECT dia, dia - (ROW_NUMBER() OVER (ORDER BY dia DESC))::INTEGER as grp
                    FROM active_days
                )
                SELECT COUNT(*) INTO v_activity_streak
                FROM streak_calc
                WHERE grp = (SELECT grp FROM streak_calc ORDER BY dia DESC LIMIT 1);

                IF v_activity_streak >= v_required_count THEN
                    v_unlocked := TRUE;
                END IF;
            END;
    END CASE;

    -- Se desbloqueado, inserir no log e conceder XP
    IF v_unlocked THEN
        -- Inserir no log de achievements
        INSERT INTO public.achievements_log (
            patient_id,
            achievement_id,
            achievement_title,
            xp_awarded,
            metadata
        ) VALUES (
            p_patient_id,
            v_achievement.id,
            v_achievement.title,
            v_achievement.xp_reward,
            jsonb_build_object(
                'achievement_code', v_achievement.code,
                'unlocked_at', NOW()
            )
        );

        -- Adicionar XP ao paciente
        UPDATE public.patient_gamification
        SET
            total_points = total_points + v_achievement.xp_reward,
            current_xp = current_xp + v_achievement.xp_reward,
            last_activity_date = NOW()
        WHERE patient_id = p_patient_id;

        -- Registrar transação de XP
        INSERT INTO public.xp_transactions (
            patient_id,
            amount,
            reason,
            description
        ) VALUES (
            p_patient_id,
            v_achievement.xp_reward,
            'achievement_unlocked',
            'Achievement desbloqueado: ' || v_achievement.title
        );

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Triggers para verificação automática de achievements
-- ============================================================================

-- Trigger ao completar uma tarefa/sessão
CREATE OR REPLACE FUNCTION check_session_achievements()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar achievements relacionados a sessões
    PERFORM check_and_unlock_achievement(
        NEW.patient_id,
        'sessions_1'::TEXT
    ) WHERE NEW.status = 'concluida';

    PERFORM check_and_unlock_achievement(
        NEW.patient_id,
        'sessions_5'::TEXT
    ) WHERE NEW.status = 'concluida';

    PERFORM check_and_unlock_achievement(
        NEW.patient_id,
        'sessions_10'::TEXT
    ) WHERE NEW.status = 'concluida';

    PERFORM check_and_unlock_achievement(
        NEW.patient_id,
        'sessions_25'::TEXT
    ) WHERE NEW.status = 'concluida';

    PERFORM check_and_unlock_achievement(
        NEW.patient_id,
        'sessions_50'::TEXT
    ) WHERE NEW.status = 'concluida';

    PERFORM check_and_unlock_achievement(
        NEW.patient_id,
        'sessions_100'::TEXT
    ) WHERE NEW.status = 'concluida';

    PERFORM check_and_unlock_achievement(
        NEW.patient_id,
        'daily_complete_any'::TEXT
    ) WHERE NEW.status = 'concluida';

    PERFORM check_and_unlock_achievement(
        NEW.patient_id,
        'daily_complete_3'::TEXT
    ) WHERE NEW.status = 'concluida';

    PERFORM check_and_unlock_achievement(
        NEW.patient_id,
        'daily_5_sessions'::Text
    ) WHERE NEW.status = 'concluida';

    -- Verificar horários
    IF NEW.status = 'concluida' AND NEW.data_conclusao IS NOT NULL THEN
        -- Early bird
        IF EXTRACT(HOUR FROM NEW.data_conclusao) < 8 THEN
            PERFORM check_and_unlock_achievement(
                NEW.patient_id,
                'early_bird'::TEXT
            );
        END IF;

        -- Night owl
        IF EXTRACT(HOUR FROM NEW.data_conclusao) >= 20 THEN
            PERFORM check_and_unlock_achievement(
                NEW.patient_id,
                'night_owl'::TEXT
            );
        END IF;

        -- Weekend warrior
        IF EXTRACT(ISODOW FROM NEW.data_conclusao) IN (6, 7) THEN
            PERFORM check_and_unlock_achievement(
                NEW.patient_id,
                'weekend_warrior'::TEXT
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para tarefas
DROP TRIGGER IF EXISTS tarefas_achievement_check ON public.tarefas;
CREATE TRIGGER tarefas_achievement_check
    AFTER INSERT OR UPDATE ON public.tarefas
    FOR EACH ROW
    WHEN (NEW.status = 'concluida')
    EXECUTE FUNCTION check_session_achievements();

-- Trigger ao atualizar gamification profile (streak, level)
CREATE OR REPLACE FUNCTION check_gamification_achievements()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar achievements de streak
    IF TG_OP = 'UPDATE' THEN
        -- Streak achievements
        PERFORM check_and_unlock_achievement(
            NEW.patient_id,
            'streak_3'::TEXT
        ) WHERE NEW.current_streak >= 3 AND OLD.current_streak < 3;

        PERFORM check_and_unlock_achievement(
            NEW.patient_id,
            'streak_7'::TEXT
        ) WHERE NEW.current_streak >= 7 AND OLD.current_streak < 7;

        PERFORM check_and_unlock_achievement(
            NEW.patient_id,
            'streak_14'::TEXT
        ) WHERE NEW.current_streak >= 14 AND OLD.current_streak < 14;

        PERFORM check_and_unlock_achievement(
            NEW.patient_id,
            'streak_30'::TEXT
        ) WHERE NEW.current_streak >= 30 AND OLD.current_streak < 30;

        PERFORM check_and_unlock_achievement(
            NEW.patient_id,
            'streak_60'::TEXT
        ) WHERE NEW.current_streak >= 60 AND OLD.current_streak < 60;

        PERFORM check_and_unlock_achievement(
            NEW.patient_id,
            'streak_90'::TEXT
        ) WHERE NEW.current_streak >= 90 AND OLD.current_streak < 90;

        -- Level achievements
        PERFORM check_and_unlock_achievement(
            NEW.patient_id,
            'level_5'::TEXT
        ) WHERE NEW.level >= 5 AND OLD.level < 5;

        PERFORM check_and_unlock_achievement(
            NEW.patient_id,
            'level_10'::TEXT
        ) WHERE NEW.level >= 10 AND OLD.level < 10;

        PERFORM check_and_unlock_achievement(
            NEW.patient_id,
            'level_20'::TEXT
        ) WHERE NEW.level >= 20 AND OLD.level < 20;

        PERFORM check_and_unlock_achievement(
            NEW.patient_id,
            'level_50'::TEXT
        ) WHERE NEW.level >= 50 AND OLD.level < 50;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para gamification profile
DROP TRIGGER IF EXISTS gamification_achievement_check ON public.patient_gamification;
CREATE TRIGGER gamification_achievement_check
    AFTER INSERT OR UPDATE ON public.patient_gamification
    FOR EACH ROW
    EXECUTE FUNCTION check_gamification_achievements();

-- Trigger ao registrar pain log
CREATE OR REPLACE FUNCTION check_pain_log_achievements()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar achievements de pain log
    PERFORM check_and_unlock_achievement(
        NEW.patient_id,
        'pain_log_5'::TEXT
    );

    PERFORM check_and_unlock_achievement(
        NEW.patient_id,
        'pain_log_30'::TEXT
    );

    -- Pain free (nível 0)
    IF NEW.nivel_dor = 0 THEN
        PERFORM check_and_unlock_achievement(
            NEW.patient_id,
            'pain_free'::TEXT
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para pain_logs (se tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pain_logs') THEN
        DROP TRIGGER IF EXISTS pain_log_achievement_check ON public.pain_logs;
        CREATE TRIGGER pain_log_achievement_check
            AFTER INSERT ON public.pain_logs
            FOR EACH ROW
            EXECUTE FUNCTION check_pain_log_achievements();
    END IF;
END $$;

-- ============================================================================
-- Função helper para verificar achievements manualmente
-- ============================================================================

CREATE OR REPLACE FUNCTION check_all_achievements_for_patient(p_patient_id UUID)
RETURNS TABLE(unlocked_code TEXT, unlocked_title TEXT) AS $$
DECLARE
    v_achievement RECORD;
    v_was_unlocked BOOLEAN;
BEGIN
    -- Verificar todos os achievements ativos
    FOR v_achievement IN
        SELECT code, title FROM public.achievements WHERE is_active IS NOT FALSE
    LOOP
        SELECT check_and_unlock_achievement(p_patient_id, v_achievement.code)
        INTO v_was_unlocked;

        IF v_was_unlocked THEN
            unlocked_code := v_achievement.code;
            unlocked_title := v_achievement.title;
            RETURN NEXT;
        END IF;
    END LOOP;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Relatório
DO $$
BEGIN
    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'Achievement Unlocking System Installed!';
    RAISE NOTICE '- Triggers: tarefas, patient_gamification, pain_logs';
    RAISE NOTICE '- Function: check_and_unlock_achievement';
    RAISE NOTICE '- Function: check_all_achievements_for_patient';
    RAISE NOTICE '====================================================================';
END $$;
