-- ============================================================================
-- Quest Refresh and Notification System
-- Sistema de refresh diário de quests e notificações de gamificação
-- ============================================================================

-- ============================================================================
-- 1. Tabela de Notificações
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gamification_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('achievement', 'level_up', 'quest_complete', 'streak_milestone', 'reward_unlocked')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- RLS para notifications
ALTER TABLE public.gamification_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON public.gamification_notifications FOR SELECT
    USING (auth.uid() = patient_id);

CREATE POLICY "Users can update own notifications"
    ON public.gamification_notifications FOR UPDATE
    USING (auth.uid() = patient_id);

CREATE POLICY "System can insert notifications"
    ON public.gamification_notifications FOR INSERT
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.gamification_notifications TO authenticated;
GRANT ALL ON public.gamification_notifications TO service_role;

-- Índices
CREATE INDEX idx_notifications_patient_unread ON public.gamification_notifications(patient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_type ON public.gamification_notifications(type);
CREATE INDEX idx_notifications_created ON public.gamification_notifications(created_at DESC);

-- ============================================================================
-- 2. Função para criar notificação
-- ============================================================================

CREATE OR REPLACE FUNCTION create_gamification_notification(
    p_patient_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.gamification_notifications (
        patient_id,
        type,
        title,
        message,
        metadata
    ) VALUES (
        p_patient_id,
        p_type,
        p_title,
        p_message,
        p_metadata
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Trigger para notificar ao desbloquear achievement
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_achievement_unlocked()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_gamification_notification(
        NEW.patient_id,
        'achievement',
        'Conquista Desbloqueada!',
        'Parabéns! Você desbloqueou: ' || COALESCE(NEW.achievement_title, 'Nova Conquista'),
        jsonb_build_object(
            'achievement_id', NEW.achievement_id,
            'xp_awarded', NEW.xp_awarded,
            'unlocked_at', NEW.unlocked_at
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS achievement_unlocked_notify ON public.achievements_log;
CREATE TRIGGER achievement_unlocked_notify
    AFTER INSERT ON public.achievements_log
    FOR EACH ROW
    EXECUTE FUNCTION notify_achievement_unlocked();

-- ============================================================================
-- 4. Trigger para notificar ao subir de nível
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_level_up()
RETURNS TRIGGER AS $$
BEGIN
    -- Notificar apenas quando o nível aumenta
    IF NEW.level > OLD.level THEN
        PERFORM create_gamification_notification(
            NEW.patient_id,
            'level_up',
            'Subiu de Nível!',
            'Você alcançou o nível ' || NEW.level || '! Continue assim!',
            jsonb_build_object(
                'old_level', OLD.level,
                'new_level', NEW.level,
                'total_xp', NEW.total_points
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS level_up_notify ON public.patient_gamification;
CREATE TRIGGER level_up_notify
    AFTER UPDATE OF level ON public.patient_gamification
    FOR EACH ROW
    WHEN (NEW.level > OLD.level)
    EXECUTE FUNCTION notify_level_up();

-- ============================================================================
-- 5. Trigger para notificar marcos de streak
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_streak_milestone()
RETURNS TRIGGER AS $$
BEGIN
    -- Notificar marcos de streak (7, 14, 30, 60, 90 dias)
    IF NEW.current_streak IN (7, 14, 30, 60, 90) AND NEW.current_streak > COALESCE(OLD.current_streak, 0) THEN
        PERFORM create_gamification_notification(
            NEW.patient_id,
            'streak_milestone',
            'Sequência Incrível!',
            'Você mantém uma sequência de ' || NEW.current_streak || ' dias! Você está no caminho certo.',
            jsonb_build_object(
                'streak_days', NEW.current_streak,
                'longest_streak', NEW.longest_streak
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS streak_milestone_notify ON public.patient_gamification;
CREATE TRIGGER streak_milestone_notify
    AFTER UPDATE OF current_streak ON public.patient_gamification
    FOR EACH ROW
    EXECUTE FUNCTION notify_streak_milestone();

-- ============================================================================
-- 6. Função para atribuir quests diárias automaticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_daily_quests()
RETURNS void AS $$
DECLARE
    v_patient RECORD;
    v_daily_quest RECORD;
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
                DATE_TRUNC('day', NOW() + INTERVAL '1 day') - INTERVAL '1 second'  -- Fim do dia atual
            )
            ON CONFLICT (patient_id, quest_id) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Função para atualizar progresso de quests
-- ============================================================================

CREATE OR REPLACE FUNCTION update_quest_progress(
    p_patient_id UUID,
    p_quest_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_quest_def RECORD;
    v_patient_quest RECORD;
    v_requirements JSONB;
    v_requirement_type TEXT;
    v_progress JSONB;
    v_is_complete BOOLEAN := FALSE;
BEGIN
    -- Buscar definição da quest
    SELECT * INTO v_quest_def
    FROM public.quest_definitions
    WHERE code = p_quest_code;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Buscar ou criar patient_quest
    SELECT * INTO v_patient_quest
    FROM public.patient_quests
    WHERE patient_id = p_patient_id
    AND quest_id = v_quest_def.id;

    IF NOT FOUND THEN
        -- Criar nova quest
        INSERT INTO public.patient_quests (
            patient_id,
            quest_id,
            status,
            progress,
            started_at,
            expires_at
        ) VALUES (
            p_patient_id,
            v_quest_def.id,
            'in_progress',
            '{}',
            NOW(),
            CASE v_quest_def.category
                WHEN 'daily' THEN DATE_TRUNC('day', NOW() + INTERVAL '1 day') - INTERVAL '1 second'
                WHEN 'weekly' THEN DATE_TRUNC('week', NOW() + INTERVAL '1 week') - INTERVAL '1 second'
                ELSE NULL
            END
        )
        RETURNING * INTO v_patient_quest;
    END IF;

    v_requirements := v_quest_def.requirements;
    v_requirement_type := v_requirements->>'type';
    v_progress := v_patient_quest.progress;

    -- Atualizar progresso baseado no tipo
    CASE v_requirement_type
        WHEN 'complete_any_session' THEN
            DECLARE
                v_target_count INTEGER := (v_requirements->>'count')::INTEGER;
                v_current_count INTEGER;
            BEGIN
                SELECT COUNT(*) INTO v_current_count
                FROM public.tarefas
                WHERE patient_id = p_patient_id
                AND status = 'concluida'
                AND DATE(data_conclusao) = CURRENT_DATE;

                v_progress := jsonb_build_object(
                    'current', v_current_count,
                    'target', v_target_count
                );

                IF v_current_count >= v_target_count THEN
                    v_is_complete := TRUE;
                END IF;
            END;

        WHEN 'log_pain' THEN
            DECLARE
                v_has_log BOOLEAN;
            BEGIN
                SELECT EXISTS(
                    SELECT 1 FROM public.pain_logs
                    WHERE patient_id = p_patient_id
                    AND DATE(data_registro) = CURRENT_DATE
                ) INTO v_has_log;

                v_progress := jsonb_build_object(
                    'logged', v_has_log
                );

                IF v_has_log THEN
                    v_is_complete := TRUE;
                END IF;
            END;
    END CASE;

    -- Atualizar progresso
    UPDATE public.patient_quests
    SET progress = v_progress
    WHERE id = v_patient_quest.id;

    -- Se completo, marcar como completado
    IF v_is_complete AND v_patient_quest.status != 'completed' THEN
        UPDATE public.patient_quests
        SET
            status = 'completed',
            completed_at = NOW()
        WHERE id = v_patient_quest.id;

        -- Dar recompensas
        UPDATE public.patient_gamification
        SET
            total_points = total_points + v_quest_def.xp_reward,
            current_xp = current_xp + v_quest_def.xp_reward,
            last_activity_date = NOW()
        WHERE patient_id = p_patient_id;

        -- Registrar transação
        INSERT INTO public.xp_transactions (
            patient_id,
            amount,
            reason,
            description
        ) VALUES (
            p_patient_id,
            v_quest_def.xp_reward,
            'daily_quest',
            'Quest completada: ' || v_quest_def.title
        );

        -- Notificar
        PERFORM create_gamification_notification(
            p_patient_id,
            'quest_complete',
            'Quest Completada!',
            'Você completou: ' || v_quest_def.title || ' (+ ' || v_quest_def.xp_reward || ' XP)',
            jsonb_build_object(
                'quest_id', v_quest_def.id,
                'quest_code', v_quest_def.code,
                'xp_reward', v_quest_def.xp_reward
            )
        );

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. Trigger para atualizar progresso de quests ao completar tarefa
-- ============================================================================

CREATE OR REPLACE FUNCTION update_quest_progress_on_task()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'concluida' THEN
        -- Atualizar quests relacionadas a sessões
        PERFORM update_quest_progress(NEW.patient_id, 'daily_complete_any');
        PERFORM update_quest_progress(NEW.patient_id, 'daily_complete_3');
        PERFORM update_quest_progress(NEW.patient_id, 'daily_5_sessions');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quest_progress_task_check ON public.tarefas;
CREATE TRIGGER quest_progress_task_check
    AFTER INSERT OR UPDATE ON public.tarefas
    FOR EACH ROW
    EXECUTE FUNCTION update_quest_progress_on_task();

-- ============================================================================
-- 9. Trigger para atualizar progresso ao registrar pain
-- ============================================================================

CREATE OR REPLACE FUNCTION update_quest_progress_on_pain_log()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_quest_progress(NEW.patient_id, 'daily_log_pain');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pain_logs') THEN
        DROP TRIGGER IF EXISTS quest_progress_pain_check ON public.pain_logs;
        CREATE TRIGGER quest_progress_pain_check
            AFTER INSERT ON public.pain_logs
            FOR EACH ROW
            EXECUTE FUNCTION update_quest_progress_on_pain_log();
    END IF;
END $$;

-- ============================================================================
-- 10. Função para limpar notificações antigas
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM public.gamification_notifications
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND read_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Relatório
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'Quest Refresh and Notification System Installed!';
    RAISE NOTICE '- Table: gamification_notifications';
    RAISE NOTICE '- Function: create_gamification_notification';
    RAISE NOTICE '- Function: refresh_daily_quests';
    RAISE NOTICE '- Function: update_quest_progress';
    RAISE NOTICE '- Function: cleanup_old_notifications';
    RAISE NOTICE '- Triggers: achievement, level_up, streak, quests';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'Para ativar quests diárias, execute:';
    RAISE NOTICE '  SELECT refresh_daily_quests();';
    RAISE NOTICE '====================================================================';
END $$;
