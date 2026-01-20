-- ============================================================================
-- Performance Optimization for Gamification System
-- Índices para otimizar queries de gamificação
-- ============================================================================

-- ============================================================================
-- 1. Índices para patient_gamification
-- ============================================================================

-- Ranking queries: ordenar por level e XP
CREATE INDEX IF NOT EXISTS idx_gamification_level_xp
    ON public.patient_gamification(level DESC, total_points DESC);

-- Leaderboard por período (verificar se coluna existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'patient_gamification' AND column_name = 'last_activity_date'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_gamification_last_activity
            ON public.patient_gamification(last_activity_date DESC)
            WHERE last_activity_date IS NOT NULL;
    END IF;
END $$;

-- Streak queries
CREATE INDEX IF NOT EXISTS idx_gamification_streak
    ON public.patient_gamification(current_streak DESC, longest_streak DESC);

-- Busca por paciente
CREATE INDEX IF NOT EXISTS idx_gamification_patient_id
    ON public.patient_gamification(patient_id);

-- ============================================================================
-- 2. Índices para xp_transactions
-- ============================================================================

-- Queries por período de data (para dashboard/stats)
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at
    ON public.xp_transactions(created_at DESC);

-- Queries por paciente e data
CREATE INDEX IF NOT EXISTS idx_xp_transactions_patient_date
    ON public.xp_transactions(patient_id, created_at DESC);

-- Queries por motivo/razão
CREATE INDEX IF NOT EXISTS idx_xp_transactions_reason
    ON public.xp_transactions(reason);

-- Queries por período (para dashboard admin)
-- Nota: Não podemos usar índice parcial com NOW() porque não é IMMUTABLE
CREATE INDEX IF NOT EXISTS idx_xp_transactions_date_range
    ON public.xp_transactions(created_at DESC);

-- Suporte para colunas xp_amount e amount
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'xp_transactions' AND column_name = 'xp_amount'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_xp_transactions_amount
            ON public.xp_transactions(patient_id, xp_amount DESC)
            WHERE xp_amount IS NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- 3. Índices para achievements_log
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'achievements_log') THEN
        -- Queries por paciente
        CREATE INDEX IF NOT EXISTS idx_achievements_log_patient
            ON public.achievements_log(patient_id, unlocked_at DESC);

        -- Queries por achievement (para estatísticas de popularidade)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'achievements_log' AND column_name = 'achievement_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_achievements_log_achievement_popularity
                ON public.achievements_log(achievement_id)
                WHERE achievement_id IS NOT NULL;
        END IF;

        -- Queries por período (para relatórios)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'achievements_log' AND column_name = 'unlocked_at'
        ) THEN
            -- Nota: índice simples sem filtro NOW() pois não é IMMUTABLE
            CREATE INDEX IF NOT EXISTS idx_achievements_log_date
                ON public.achievements_log(unlocked_at DESC);
        END IF;

        -- Busca por achievement_title (compatibilidade com dados antigos)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'achievements_log' AND column_name = 'achievement_title'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_achievements_log_title
                ON public.achievements_log(achievement_title)
                WHERE achievement_id IS NULL;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 4. Índices para tarefas (queries de gamificação)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tarefas') THEN
        -- Verificar se a tabela tem patient_id ou responsavel_id
        DECLARE
            v_column_name TEXT;
        BEGIN
            -- Descobrir nome da coluna do paciente
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'tarefas' AND column_name = 'patient_id'
            ) THEN
                v_column_name := 'patient_id';
            ELSIF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'tarefas' AND column_name = 'responsavel_id'
            ) THEN
                v_column_name := 'responsavel_id';
            ELSE
                v_column_name := NULL;
            END IF;

            IF v_column_name IS NOT NULL THEN
                -- Queries de sessões completadas por paciente
                EXECUTE format('
                    CREATE INDEX IF NOT EXISTS idx_tarefas_patient_status
                        ON public.tarefas(%I, status)
                        WHERE status = ''concluida''
                ', v_column_name);

                -- Queries por data de conclusão (para streaks e quests)
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'tarefas' AND column_name = 'data_conclusao'
                ) THEN
                    EXECUTE format('
                        CREATE INDEX IF NOT EXISTS idx_tarefas_conclusion_date
                            ON public.tarefas(%I, data_conclusao DESC)
                            WHERE status = ''concluida'' AND data_conclusao IS NOT NULL
                    ', v_column_name);

                    -- Queries de contagem de sessões por dia
                    EXECUTE format('
                        CREATE INDEX IF NOT EXISTS idx_tarefas_daily_count
                            ON public.tarefas(%I, (DATE(data_conclusao)))
                            WHERE status = ''concluida'' AND data_conclusao IS NOT NULL
                    ', v_column_name);
                END IF;
            END IF;
        END;
    END IF;
END $$;

-- ============================================================================
-- 5. Índices para pain_logs
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pain_logs') THEN
        -- Queries por paciente
        CREATE INDEX IF NOT EXISTS idx_pain_logs_patient
            ON public.pain_logs(patient_id, data_registro DESC);

        -- Queries de contagem por dia (para pain_free_streak)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'pain_logs' AND column_name = 'nivel_dor'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_pain_logs_daily_count
                ON public.pain_logs(patient_id, nivel_dor, (DATE(data_registro)));

            -- Queries de nível 0 (pain free)
            CREATE INDEX IF NOT EXISTS idx_pain_logs_pain_free
                ON public.pain_logs(patient_id, data_registro DESC)
                WHERE nivel_dor = 0;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 6. Índices para weekly_challenges
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weekly_challenges') THEN
        -- Buscar desafios ativos
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'weekly_challenges' AND column_name = 'is_active'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_weekly_challenges_active
                ON public.weekly_challenges(is_active)
                WHERE is_active = true;
        END IF;

        -- Buscar por período
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'weekly_challenges' AND column_name = 'start_date'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_weekly_challenges_period
                ON public.weekly_challenges(start_date, end_date);
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 7. Índices para patient_challenges
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_challenges') THEN
        -- Queries por paciente e status
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'patient_challenges' AND column_name = 'status'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_patient_challenges_status
                ON public.patient_challenges(patient_id, status);

            -- Queries de progresso
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'patient_challenges' AND column_name = 'progress'
            ) THEN
                CREATE INDEX IF NOT EXISTS idx_patient_challenges_progress
                    ON public.patient_challenges(status, progress)
                    WHERE status IN ('in_progress', 'not_started');
            END IF;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 8. Índices para evolution_logs
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evolution_logs') THEN
        -- Queries por paciente
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'evolution_logs' AND column_name = 'created_at'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_evolution_logs_patient
                ON public.evolution_logs(patient_id, created_at DESC);
        END IF;

        -- Soma de pontuação
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'evolution_logs' AND column_name = 'pontuacao_evolucao'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_evolution_logs_score
                ON public.evolution_logs(patient_id, pontuacao_evolucao)
                WHERE pontuacao_evolucao > 0;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 9. Índices compostos para queries complexas do dashboard
-- ============================================================================

-- Leaderboard geral: level + xp + streak
CREATE INDEX IF NOT EXISTS idx_gamification_leaderboard
    ON public.patient_gamification(level DESC, total_points DESC, current_streak DESC);

-- Pacientes em risco e engajados (sem filtros NOW pois não é IMMUTABLE)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'patient_gamification' AND column_name = 'last_activity_date'
    ) THEN
        -- Nota: índices simples sem filtros NOW()
        CREATE INDEX IF NOT EXISTS idx_gamification_at_risk
            ON public.patient_gamification(patient_id, last_activity_date);

        CREATE INDEX IF NOT EXISTS idx_gamification_engaged
            ON public.patient_gamification(patient_id, last_activity_date DESC);
    END IF;
END $$;

-- ============================================================================
-- 10. Partial indexes para tabelas grandes
-- ============================================================================

-- XP transactions recentes (últimos 30 dias)
-- Nota: índice simples sem filtro NOW() pois não é IMMUTABLE
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'xp_transactions' AND column_name = 'amount'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_xp_recent
            ON public.xp_transactions(patient_id, created_at DESC, amount);
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'xp_transactions' AND column_name = 'xp_amount'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_xp_recent
            ON public.xp_transactions(patient_id, created_at DESC, xp_amount);
    ELSE
        -- Fallback sem coluna de amount
        CREATE INDEX IF NOT EXISTS idx_xp_recent
            ON public.xp_transactions(patient_id, created_at DESC);
    END IF;
END $$;

-- Achievements desbloqueados recentemente
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'achievements_log') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'achievements_log' AND column_name = 'unlocked_at'
        ) THEN
            -- Nota: índice simples sem filtro NOW() pois não é IMMUTABLE
            CREATE INDEX IF NOT EXISTS idx_achievements_recent
                ON public.achievements_log(patient_id, unlocked_at DESC);
        END IF;
    END IF;
END $$;

-- Sessões completadas recentemente (últimas 2 semanas)
-- Nota: índice simples sem filtro NOW() pois não é IMMUTABLE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tarefas') THEN
        DECLARE
            v_column_name TEXT;
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'tarefas' AND column_name = 'patient_id'
            ) THEN
                v_column_name := 'patient_id';
            ELSIF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'tarefas' AND column_name = 'responsavel_id'
            ) THEN
                v_column_name := 'responsavel_id';
            ELSE
                v_column_name := NULL;
            END IF;

            IF v_column_name IS NOT NULL AND EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'tarefas' AND column_name = 'data_conclusao'
            ) THEN
                EXECUTE format('
                    CREATE INDEX IF NOT EXISTS idx_tarefas_recent
                        ON public.tarefas(%I, data_conclusao DESC)
                        WHERE status = ''concluida''
                ', v_column_name);
            END IF;
        END;
    END IF;
END $$;

-- ============================================================================
-- 11. Índices para busca textual (se necessário)
-- ============================================================================

-- Busca de pacientes por nome no leaderboard
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'patients' AND column_name = 'full_name'
        ) THEN
            -- Verificar se deleted_at existe antes de usar no WHERE
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'patients' AND column_name = 'deleted_at'
            ) THEN
                CREATE INDEX IF NOT EXISTS idx_patients_search_name
                    ON public.patients(full_name, id)
                    WHERE deleted_at IS NULL;
            ELSE
                CREATE INDEX IF NOT EXISTS idx_patients_search_name
                    ON public.patients(full_name, id);
            END IF;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 12. Índices para notificações de gamificação
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gamification_notifications') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_patient_unread
            ON public.gamification_notifications(patient_id, read_at)
            WHERE read_at IS NULL;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'gamification_notifications' AND column_name = 'type'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_notifications_type
                ON public.gamification_notifications(type);
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'gamification_notifications' AND column_name = 'created_at'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_notifications_created
                ON public.gamification_notifications(created_at DESC);
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 13. Índices para patient_quests
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_quests') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'patient_quests' AND column_name = 'status'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_patient_quests_status
                ON public.patient_quests(patient_id, status);
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'patient_quests' AND column_name = 'expires_at'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_patient_quests_expires
                ON public.patient_quests(expires_at)
                WHERE expires_at IS NOT NULL;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'patient_quests' AND column_name = 'completed_at'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_patient_quests_completed
                ON public.patient_quests(completed_at)
                WHERE completed_at IS NOT NULL;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 14. Função para verificar índices não usados
-- ============================================================================

CREATE OR REPLACE FUNCTION get_unused_gamification_indexes()
RETURNS TABLE(
    schemaname TEXT,
    tablename TEXT,
    indexname TEXT,
    idx_scan BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pg_stat_user_indexes.schemaname,
        pg_stat_user_indexes.relname::TEXT,
        pg_stat_user_indexes.indexrelname::TEXT,
        pg_stat_user_indexes.idx_scan
    FROM pg_stat_user_indexes
    JOIN pg_index ON pg_stat_user_indexes.indexrelid = pg_index.indexrelid
    JOIN pg_class ON pg_stat_user_indexes.relid = pg_class.oid
    WHERE pg_stat_user_indexes.idx_scan = 0
    AND pg_index.indisunique = false
    AND pg_class.relname LIKE ANY(ARRAY[
        'patient_gamification', 'xp_transactions', 'achievements_log',
        'tarefas', 'patient_quests', 'gamification_notifications',
        'quest_definitions', 'weekly_challenges', 'patient_challenges'
    ])
    ORDER BY pg_stat_user_indexes.schemaname, pg_stat_user_indexes.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Relatório
-- ============================================================================

DO $$
DECLARE
    v_index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename LIKE ANY(ARRAY[
        'patient_gamification', 'xp_transactions', 'achievements_log',
        'tarefas', 'patient_quests', 'gamification_notifications',
        'quest_definitions', 'weekly_challenges', 'patient_challenges',
        'gamification_notifications'
    ]);

    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'Performance Optimization Complete!';
    RAISE NOTICE 'Indexes created for gamification tables: %', v_index_count;
    RAISE NOTICE '';
    RAISE NOTICE 'To check unused indexes, run:';
    RAISE NOTICE '  SELECT * FROM get_unused_gamification_indexes();';
    RAISE NOTICE '';
    RAISE NOTICE 'To analyze query performance, run:';
    RAISE NOTICE '  EXPLAIN ANALYZE <your_query>';
    RAISE NOTICE '====================================================================';
END $$;

-- ============================================================================
-- Vacuum e Analyze para atualizar estatísticas
-- ============================================================================

DO $$
BEGIN
    -- Analisar tabelas de gamificação
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_gamification') THEN
        ANALYZE public.patient_gamification;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'xp_transactions') THEN
        ANALYZE public.xp_transactions;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'achievements_log') THEN
        ANALYZE public.achievements_log;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tarefas') THEN
        ANALYZE public.tarefas;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_quests') THEN
        ANALYZE public.patient_quests;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gamification_notifications') THEN
        ANALYZE public.gamification_notifications;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quest_definitions') THEN
        ANALYZE public.quest_definitions;
    END IF;
END $$;
