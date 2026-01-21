-- ============================================================================
-- FISIOFLOW STRATEGIC ANALYTICS - INFRAESTRUTURA COMPLETA
-- ============================================================================
-- Migration: 20260120000001_strategic_analytics_infrastructure.sql
-- Description: Sistema completo de analytics estratégicos com views materializadas,
--              insights calculados, e configurações de alertas inteligentes
-- ============================================================================

-- ============================================================================
-- 1. VIEWS MATERIALIZADAS PARA PERFORMANCE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Snapshot Diário de Métricas por Organização
-- ----------------------------------------------------------------------------
-- Esta view materializada armazena snapshots diários de todas as métricas
-- importantes para análise estratégica. Atualizada a cada hora.
DROP MATERIALIZED VIEW IF EXISTS daily_strategic_metrics_snapshot CASCADE;

CREATE MATERIALIZED VIEW daily_strategic_metrics_snapshot AS
SELECT
    -- Identificação
    d.date,
    a.organization_id,
    -- Dia da semana e hora para análise de padrões
    EXTRACT(DOW FROM d.date) as day_of_week,
    EXTRACT(ISODOW FROM d.date) as iso_day_of_week, -- 1=Segunda, 7=Domingo
    TO_CHAR(d.date, 'Day') as day_name,
    -- Semana do mês (1, 2, 3, 4, 5)
    CEIL(EXTRACT(DAY FROM d.date) / 7.0) as week_of_month,

    -- === AGENDAMENTOS ===
    -- Total de agendamentos
    COUNT(*) as total_appointments,
    -- Por status
    COUNT(*) FILTER (WHERE a.status = 'concluido') as appointments_completed,
    COUNT(*) FILTER (WHERE a.status = 'cancelado') as appointments_cancelled,
    COUNT(*) FILTER (WHERE a.status = 'agendado') as appointments_scheduled,
    COUNT(*) FILTER (WHERE a.status = 'confirmado') as appointments_confirmed,
    COUNT(*) FILTER (WHERE a.confirmation_status = 'no_show') as appointments_noshow,

    -- Taxas calculadas
    ROUND(
        CASE
            WHEN COUNT(*) > 0 THEN
                100.0 * COUNT(*) FILTER (WHERE a.status = 'concluido') / COUNT(*)
            ELSE 0
        END, 2
    ) as completion_rate,
    ROUND(
        CASE
            WHEN COUNT(*) > 0 THEN
                100.0 * COUNT(*) FILTER (WHERE a.status = 'cancelado') / COUNT(*)
            ELSE 0
        END, 2
    ) as cancellation_rate,

    -- === PACIENTES ===
    COUNT(DISTINCT a.patient_id) as unique_patients,
    COUNT(DISTINCT a.patient_id) FILTER (
        WHERE a.patient_id IN (
            SELECT p.id FROM patients p
            WHERE DATE(p.created_at) = d.date
        )
    ) as new_patients,

    -- Pacientes retornando vs primeira consulta
    COUNT(DISTINCT a.patient_id) FILTER (
        WHERE a.patient_id IN (
            SELECT a2.patient_id
            FROM appointments a2
            WHERE a2.appointment_date < d.date
            GROUP BY a2.patient_id
            HAVING COUNT(*) > 0
        )
    ) as returning_patients,

    -- === RECEITA ===
    COALESCE(SUM(a.payment_amount) FILTER (WHERE a.payment_status = 'paid'), 0) as revenue_collected,
    COALESCE(SUM(a.payment_amount) FILTER (WHERE a.payment_status = 'pending'), 0) as revenue_pending,
    COALESCE(SUM(a.payment_amount) FILTER (WHERE a.payment_status = 'overdue'), 0) as revenue_overdue,
    COALESCE(SUM(a.payment_amount), 0) as revenue_total,

    -- Ticket médio
    ROUND(
        COALESCE(
            SUM(a.payment_amount) / NULLIF(COUNT(*) FILTER (WHERE a.payment_amount > 0), 0),
            0
        ), 2
    ) as average_ticket,

    -- === HORÁRIOS ===
    -- Distribuição por hora (para identificar picos e vales)
    EXTRACT(HOUR FROM a.start_time) as hour,
    COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM a.start_time) = EXTRACT(HOUR FROM a.start_time)) as appointments_at_hour,

    -- Metadados
    NOW() as snapshot_generated_at
FROM appointments a, (
    SELECT CURRENT_DATE - INTERVAL '1 day' as date
) d
WHERE a.appointment_date = d.date
GROUP BY
    d.date,
    a.organization_id,
    EXTRACT(DOW FROM d.date),
    EXTRACT(ISODOW FROM d.date),
    TO_CHAR(d.date, 'Day'),
    CEIL(EXTRACT(DAY FROM d.date) / 7.0),
    EXTRACT(HOUR FROM a.start_time);

-- Índices para performance
CREATE UNIQUE INDEX idx_daily_strategic_metrics_unique
    ON daily_strategic_metrics_snapshot(organization_id, date, hour);
CREATE INDEX idx_daily_strategic_metrics_date
    ON daily_strategic_metrics_snapshot(date DESC);
CREATE INDEX idx_daily_strategic_metrics_org_date
    ON daily_strategic_metrics_snapshot(organization_id, date DESC);

-- ----------------------------------------------------------------------------
-- View de Oportunidades de Horários (Slot Analysis)
-- ----------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS time_slot_opportunities CASCADE;

CREATE MATERIALIZED VIEW time_slot_opportunities AS
WITH business_hours AS (
    -- Definir horário comercial (ajustável por organização)
    SELECT 8 as start_hour, 19 as end_hour
),
all_possible_slots AS (
    SELECT
        organization_id,
        day_of_week,
        hour,
        -- Total possível de slots = (end_hour - start_hour) * slots_per_hour
        -- Assumindo 1 slot por hora (ajustável)
        COUNT(*) OVER (PARTITION BY organization_id, day_of_week) * 1.0 as total_possible_slots
    FROM (
        SELECT DISTINCT
            organization_id,
            EXTRACT(ISODOW FROM appointment_date) as day_of_week,
            EXTRACT(HOUR FROM start_time) as hour
        FROM appointments
        WHERE appointment_date >= CURRENT_DATE - INTERVAL '90 days'
    ) distinct_slots
    CROSS JOIN business_hours bh
    WHERE hour >= bh.start_hour AND hour < bh.end_hour
),
slot_occupancy AS (
    SELECT
        organization_id,
        EXTRACT(ISODOW FROM appointment_date) as day_of_week,
        EXTRACT(HOUR FROM start_time) as hour,
        COUNT(*) FILTER (WHERE status = 'concluido') as occupied_slots,
        COUNT(*) as total_attempts
    FROM appointments
    WHERE appointment_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY organization_id, EXTRACT(ISODOW FROM appointment_date), EXTRACT(HOUR FROM start_time)
)
SELECT
    apo.organization_id,
    apo.day_of_week::integer,
    CASE apo.day_of_week::integer
        WHEN 1 THEN 'Segunda-feira'
        WHEN 2 THEN 'Terça-feira'
        WHEN 3 THEN 'Quarta-feira'
        WHEN 4 THEN 'Quinta-feira'
        WHEN 5 THEN 'Sexta-feira'
        WHEN 6 THEN 'Sábado'
        WHEN 7 THEN 'Domingo'
    END as day_name,
    apo.hour::integer,
    -- Métricas de ocupação
    COALESCE(so.occupied_slots, 0) as occupied_slots,
    ROUND(apo.total_possible_slots, 0) as total_possible_slots,
    ROUND(
        CASE
            WHEN apo.total_possible_slots > 0 THEN
                100.0 * COALESCE(so.occupied_slots, 0) / apo.total_possible_slots
            ELSE 0
        END, 2
    ) as occupancy_rate,
    -- Classificação da oportunidade
    CASE
        WHEN COALESCE(so.occupied_slots, 0) / NULLIF(apo.total_possible_slots, 0) < 0.3 THEN 'high'    -- <30% = Alta oportunidade
        WHEN COALESCE(so.occupied_slots, 0) / NULLIF(apo.total_possible_slots, 0) < 0.5 THEN 'medium' -- <50% = Média oportunidade
        WHEN COALESCE(so.occupied_slots, 0) / NULLIF(apo.total_possible_slots, 0) < 0.7 THEN 'low'     -- <70% = Baixa oportunidade
        ELSE 'none'                                                                                             -- >=70% = Sem oportunidade
    END as opportunity_level,
    -- Score de oportunidade (0-100, maior = melhor)
    ROUND(
        CASE
            WHEN apo.total_possible_slots > 0 THEN
                (1.0 - COALESCE(so.occupied_slots, 0) / apo.total_possible_slots) * 100
            ELSE 0
        END, 1
    ) as opportunity_score,
    -- Tendência recente (comparando últimos 30 dias com 30-60 dias atrás)
    ROUND(
        COALESCE(
            so.occupied_slots / NULLIF(apo.total_possible_slots, 0),
            0
        ) -
        COALESCE(
            LAG(so.occupied_slots, 1, 0) OVER (PARTITION BY apo.organization_id, apo.day_of_week, apo.hour ORDER BY apo.day_of_week, apo.hour) / NULLIF(apo.total_possible_slots, 0),
            0
        ), 3
    ) as trend_delta,
    NOW() as calculated_at
FROM all_possible_slots apo
LEFT JOIN slot_occupancy so ON
    so.organization_id = apo.organization_id AND
    so.day_of_week = apo.day_of_week AND
    so.hour = apo.hour;

CREATE INDEX idx_time_slot_opportunities_org
    ON time_slot_opportunities(organization_id, opportunity_score DESC);
CREATE INDEX idx_time_slot_opportunities_day_hour
    ON time_slot_opportunities(day_of_week, hour);

-- ----------------------------------------------------------------------------
-- View de Períodos de Baixa Captação de Pacientes
-- ----------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS patient_acquisition_periods CASCADE;

CREATE MATERIALIZED VIEW patient_acquisition_periods AS
WITH date_ranges AS (
    -- Gerar ranges de datas para análise
    SELECT
        organization_id,
        DATE_TRUNC('month', date) as month_start,
        DATE_TRUNC('month', date + INTERVAL '1 month') - INTERVAL '1 day' as month_end,
        EXTRACT(YEAR FROM date) as year,
        EXTRACT(MONTH FROM date) as month,
        CEIL(EXTRACT(DAY FROM date) / 7.0) as week_of_month,
        -- Primeira/segunda quinzena
        CASE
            WHEN EXTRACT(DAY FROM date) <= 15 THEN 'first'
            ELSE 'second'
        END as fortnight,
    DATE_TRUNC('week', date) as week_start,
    DATE_TRUNC('week', date + INTERVAL '7 days') - INTERVAL '1 day' as week_end
    FROM (
        SELECT DISTINCT DATE(appointment_date) as date, organization_id
        FROM appointments
        WHERE appointment_date >= CURRENT_DATE - INTERVAL '12 months'
    ) dates
),
new_patients_by_period AS (
    SELECT
        dr.organization_id,
        dr.month_start,
        dr.week_start,
        COUNT(DISTINCT p.id) as new_patients_count,
        COUNT(DISTINCT a.id) FILTER (WHERE a.type = 'avaliacao') as new_evaluations_count
    FROM date_ranges dr
    LEFT JOIN patients p ON
        DATE(p.created_at)::date = dr.month_start::date OR
        DATE(p.created_at)::date BETWEEN dr.week_start::date AND dr.week_end::date
    LEFT JOIN appointments a ON
        a.patient_id = p.id AND
        DATE(a.appointment_date) BETWEEN dr.week_start::date AND dr.week_end::date
    GROUP BY dr.organization_id, dr.month_start, dr.week_start
),
averages AS (
    SELECT
        organization_id,
        AVG(new_patients_count) as avg_new_patients,
        STDDEV(new_patients_count) as stddev_new_patients,
        AVG(new_evaluations_count) as avg_evaluations,
        STDDEV(new_evaluations_count) as stddev_evaluations
    FROM new_patients_by_period
    GROUP BY organization_id
)
SELECT
    nbp.organization_id,
    nbp.week_start as period_start,
    nbp.week_start + INTERVAL '6 days' as period_end,
    EXTRACT(ISODOW FROM nbp.week_start) as start_day_of_week,
    'Semana ' || CEIL(EXTRACT(DAY FROM nbp.week_start) / 7.0) as period_label,
    nbp.new_patients_count,
    nbp.new_evaluations_count,
    -- Comparação com a média
    ROUND(
        CASE
            WHEN a.avg_new_patients > 0 THEN
                100.0 * (nbp.new_patients_count - a.avg_new_patients) / a.avg_new_patients
            ELSE 0
        END, 1
    ) as new_patients_vs_avg_pct,
    ROUND(
        CASE
            WHEN a.avg_evaluations > 0 THEN
                100.0 * (nbp.new_evaluations_count - a.avg_evaluations) / a.avg_evaluations
            ELSE 0
        END, 1
    ) as evaluations_vs_avg_pct,
    -- Z-score para detectar anomalias
    ROUND(
        CASE
            WHEN a.stddev_new_patients > 0 THEN
                (nbp.new_patients_count - a.avg_new_patients) / a.stddev_new_patients
            ELSE 0
        END, 2
    ) as new_patients_z_score,
    -- Classificação do período
    CASE
        WHEN a.stddev_new_patients > 0 AND
             (nbp.new_patients_count - a.avg_new_patients) / a.stddev_new_patients < -1.5 THEN 'critical_low'
        WHEN a.stddev_new_patients > 0 AND
             (nbp.new_patients_count - a.avg_new_patients) / a.stddev_new_patients < -1 THEN 'low'
        WHEN a.stddev_new_patients > 0 AND
             (nbp.new_patients_count - a.avg_new_patients) / a.stddev_new_patients > 1 THEN 'high'
        WHEN a.stddev_new_patients > 0 AND
             (nbp.new_patients_count - a.avg_new_patients) / a.stddev_new_patients > 1.5 THEN 'exceptional'
        ELSE 'normal'
    END as period_classification,
    NOW() as calculated_at
FROM new_patients_by_period nbp
JOIN averages a ON a.organization_id = nbp.organization_id;

CREATE INDEX idx_patient_acquisition_periods_org
    ON patient_acquisition_periods(organization_id, period_start DESC);
CREATE INDEX idx_patient_acquisition_periods_classification
    ON patient_acquisition_periods(period_classification);

-- ============================================================================
-- 2. TABELAS DE INSIGHTS E ALERTAS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabela de Insights Estratégicos Calculados
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS strategic_insights CASCADE;

CREATE TABLE strategic_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Tipo de insight
    insight_type TEXT NOT NULL CHECK (insight_type IN (
        'low_demand_slot',         -- Horário com baixa demanda
        'low_acquisition_period',  -- Período com baixa captação
        'revenue_opportunity',     -- Oportunidade de receita
        'retention_risk',          -- Risco de perda de pacientes
        'seasonal_pattern',        -- Padrão sazonal identificado
        'operational_inefficiency' -- Ineficiência operacional
    )),

    -- Dados do insight (JSONB flexível)
    data JSONB NOT NULL,

    -- Prioridade e scoring
    priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
    impact_score NUMERIC CHECK (impact_score BETWEEN 0 AND 100) DEFAULT 50,
    confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 100) DEFAULT 50,

    -- Status do insight
    status TEXT CHECK (status IN ('detected', 'acknowledged', 'addressed', 'dismissed')) DEFAULT 'detected',

    -- Data do insight (pode ser passado, presente ou futuro)
    insight_date DATE NOT NULL,
    valid_until DATE,

    -- Recomendações (suggestions do sistema ou IA)
    recommendations TEXT[],
    suggested_actions JSONB, -- Ações estruturadas: [{title, description, effort, impact}]

    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    addressed_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,

    -- Vínculo com outros insights
    parent_insight_id UUID REFERENCES strategic_insights(id) ON DELETE SET NULL,

    -- Dados de auditoria
    generated_by TEXT DEFAULT 'system', -- 'system', 'ai', 'user'
    generation_method TEXT, -- 'time_series_analysis', 'ml_model', 'rule_based'

    UNIQUE(organization_id, insight_type, insight_date, data)
);

CREATE INDEX idx_strategic_insights_org_date
    ON strategic_insights(organization_id, insight_date DESC);
CREATE INDEX idx_strategic_insights_type_status
    ON strategic_insights(insight_type, status);
CREATE INDEX idx_strategic_insights_priority
    ON strategic_insights(priority, impact_score DESC);

-- ----------------------------------------------------------------------------
-- Tabela de Configurações de Alertas Inteligentes
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS smart_alert_configurations CASCADE;

CREATE TABLE smart_alert_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Configuração do alerta
    alert_name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true,

    -- Condições de disparo
    metric_name TEXT NOT NULL, -- 'occupancy_rate', 'cancellation_rate', 'new_patients', etc.
    threshold_value NUMERIC NOT NULL,
    comparison_operator TEXT CHECK (comparison_operator IN ('>', '<', '>=', '<=', '=', '!=')) NOT NULL,
    time_window TEXT CHECK (time_window IN ('1h', '24h', '7d', '30d', '90d')) DEFAULT '7d',

    -- Severidade
    severity TEXT CHECK (severity IN ('critical', 'warning', 'info')) DEFAULT 'warning',

    -- Canais de notificação
    notification_channels TEXT[] DEFAULT ARRAY['dashboard'] CHECK (
        notification_channels <@ ARRAY['email', 'whatsapp', 'push', 'dashboard', 'webhook']
    ),

    -- Configurações avançadas
    cooldown_minutes INTEGER DEFAULT 60, -- Mínimo de minutos entre alertas repetidos
    requires_confirmation BOOLEAN DEFAULT false,
    auto_dismiss_after TEXT, -- '1h', '24h', '7d', etc.

    -- Template de mensagem
    message_template TEXT,

    -- Ações sugeridas automaticamente
    suggested_actions JSONB,

    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),

    UNIQUE(organization_id, alert_name, metric_name)
);

CREATE INDEX idx_smart_alert_configs_org
    ON smart_alert_configurations(organization_id, enabled);
CREATE INDEX idx_smart_alert_configs_severity
    ON smart_alert_configurations(severity);

-- ----------------------------------------------------------------------------
-- Tabela de Histórico de Alertas Disparados
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS smart_alert_history CASCADE;

CREATE TABLE smart_alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    configuration_id UUID NOT NULL REFERENCES smart_alert_configurations(id) ON DELETE CASCADE,

    -- Dados do alerta disparado
    metric_value NUMERIC NOT NULL,
    threshold_value NUMERIC NOT NULL,
    severity TEXT CHECK (severity IN ('critical', 'warning', 'info')) NOT NULL,

    -- Contexto
    alert_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    context_data JSONB,

    -- Status
    status TEXT CHECK (status IN ('triggered', 'acknowledged', 'resolved', 'dismissed', 'false_positive')) DEFAULT 'triggered',
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,

    -- Resolução
    resolution_notes TEXT,
    resolved_by UUID REFERENCES profiles(id),

    -- Notificações enviadas
    notifications_sent JSONB, -- [{channel: 'email', status: 'sent', sent_at: ...}]

    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_smart_alert_history_org_date
    ON smart_alert_history(organization_id, alert_date DESC);
CREATE INDEX idx_smart_alert_history_status
    ON smart_alert_history(status);
CREATE INDEX idx_smart_alert_history_config
    ON smart_alert_history(configuration_id, alert_date DESC);

-- ============================================================================
-- 3. FUNÇÕES HELPER PARA CÁLCULOS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função: Atualizar view materializada de métricas diárias
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_daily_metrics_snapshot()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_strategic_metrics_snapshot;
    REFRESH MATERIALIZED VIEW CONCURRENTLY time_slot_opportunities;
    REFRESH MATERIALIZED VIEW CONCURRENTLY patient_acquisition_periods;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Função: Detectar e criar insights automaticamente
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_strategic_insights(
    p_organization_id UUID DEFAULT NULL,
    p_insight_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    insight_type TEXT,
    priority TEXT,
    data JSONB
) AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Se não especificado, processa todas as organizações
    IF p_organization_id IS NULL THEN
        FOR v_org_id IN SELECT id FROM organizations WHERE active = true LOOP
            RETURN QUERY SELECT * FROM generate_strategic_insights(v_org_id, p_insight_types);
        END LOOP;
        RETURN;
    END IF;

    v_org_id := p_organization_id;

    -- === INSIGHT 1: Horários com baixa demanda ===
    IF p_insight_types IS NULL OR 'low_demand_slot' = ANY(p_insight_types) THEN
        RETURN QUERY INSERT INTO strategic_insights (organization_id, insight_type, data, priority, impact_score, insight_date, recommendations)
        SELECT
            v_org_id,
            'low_demand_slot',
            jsonb_build_object(
                'day_of_week', tso.day_of_week::integer,
                'day_name', tso.day_name,
                'hour', tso.hour::integer,
                'occupancy_rate', tso.occupancy_rate,
                'opportunity_score', tso.opportunity_score,
                'occupied_slots', tso.occupied_slots,
                'total_possible_slots', tso.total_possible_slots
            ),
            CASE
                WHEN tso.opportunity_score > 70 THEN 'critical'
                WHEN tso.opportunity_score > 50 THEN 'high'
                ELSE 'medium'
            END,
            tso.opportunity_score,
            CURRENT_DATE,
            ARRAY[
                'Oferecer desconto de 10-20% para horários com baixa ocupação',
                'Lançar campanha de marketing específica para este horário',
                'Considerar reduzir número de fisioterapeutas disponíveis',
                'Enviar SMS para paciente inativos para este horário'
            ]
        FROM time_slot_opportunities tso
        WHERE
            tso.organization_id = v_org_id AND
            tso.opportunity_level IN ('high', 'medium')
        ON CONFLICT (organization_id, insight_type, insight_date, data) DO NOTHING
        RETURNING id, insight_type, priority, data;
    END IF;

    -- === INSIGHT 2: Períodos de baixa captação ===
    IF p_insight_types IS NULL OR 'low_acquisition_period' = ANY(p_insight_types) THEN
        RETURN QUERY INSERT INTO strategic_insights (organization_id, insight_type, data, priority, impact_score, insight_date, recommendations)
        SELECT
            v_org_id,
            'low_acquisition_period',
            jsonb_build_object(
                'period_start', pap.period_start,
                'period_end', pap.period_end,
                'period_label', pap.period_label,
                'new_patients_count', pap.new_patients_count,
                'vs_average_pct', pap.new_patients_vs_avg_pct,
                'z_score', pap.new_patients_z_score,
                'classification', pap.period_classification
            ),
            CASE
                WHEN pap.period_classification = 'critical_low' THEN 'critical'
                WHEN pap.period_classification = 'low' THEN 'high'
                ELSE 'medium'
            END,
            LEAST(100, GREATEST(0, 50 + ABS(pap.new_patients_vs_avg_pct) * 0.5))::NUMERIC,
            pap.period_start,
            CASE
                WHEN pap.new_patients_vs_avg_pct < -30 THEN ARRAY[
                    'Lançar campanha agressiva de captação',
                    'Oferecer avaliação gratuita',
                    'Parceria com empresas locais',
                    'Campanha de indicação com bônus'
                ]
                WHEN pap.new_patients_vs_avg_pct < -15 THEN ARRAY[
                    'Aumentar investimentos em marketing',
                    'Oferecer desconto para primeira consulta',
                    'Recuperar pacientes inativos'
                ]
                ELSE ARRAY[
                    'Monitorar tendência',
                    'Ajustar estratégias de marketing'
                ]
            END
        FROM patient_acquisition_periods pap
        WHERE
            pap.organization_id = v_org_id AND
            pap.period_classification IN ('critical_low', 'low') AND
            pap.period_start >= CURRENT_DATE - INTERVAL '3 months'
        ON CONFLICT (organization_id, insight_type, insight_date, data) DO NOTHING
        RETURNING id, insight_type, priority, data;
    END IF;

    -- === INSIGHT 3: Padrões Sazonais ===
    IF p_insight_types IS NULL OR 'seasonal_pattern' = ANY(p_insight_types) THEN
        -- Analisar padrões por dia da semana
        RETURN QUERY INSERT INTO strategic_insights (organization_id, insight_type, data, priority, impact_score, insight_date, recommendations, suggested_actions)
        SELECT
            v_org_id,
            'seasonal_pattern',
            jsonb_build_object(
                'pattern_type', 'weekly',
                'day_of_week', dw.day_of_week::integer,
                'day_name', dw.day_name,
                'avg_occupancy', dw.avg_occupancy,
                'avg_new_patients', dw.avg_new_patients,
                'vs_weekly_avg_pct', dw.vs_weekly_avg_pct,
                'consistent_pattern', dw.weeks_analyzed >= 4
            ),
            CASE
                WHEN ABS(dw.vs_weekly_avg_pct) > 30 THEN 'high'
                WHEN ABS(dw.vs_weekly_avg_pct) > 15 THEN 'medium'
                ELSE 'low'
            END,
            LEAST(100, GREATEST(0, 50 + ABS(dw.vs_weekly_avg_pct) * 0.3))::NUMERIC,
            CURRENT_DATE,
            CASE
                WHEN dw.vs_weekly_avg_pct < -20 THEN ARRAY[
                    'Dia consistentemente fraco - considerar folga ou redução de equipe',
                    'Oferecer promoções especiais neste dia',
                    'Focar campanhas de marketing para este dia'
                ]
                WHEN dw.vs_weekly_avg_pct > 20 THEN ARRAY[
                    'Dia consistentemente forte - maximizar disponibilidade',
                    'Considerar aumentar capacidade',
                    'Priorizar agendamentos neste dia'
                ]
                ELSE ARRAY['Padrão identificado - monitorar evolução']
            END,
            jsonb_build_array(
                jsonb_build_object(
                    'title', 'Ajustar disponibilidade da equipe',
                    'description', CASE
                        WHEN dw.vs_weekly_avg_pct < -20 THEN
                            'Considerar reduzir número de fisioterapeutas neste dia ou oferecer folgas'
                        ELSE
                            'Aumentar disponibilidade de fisioterapeutas neste dia'
                    END,
                    'effort', 'medium',
                    'impact', 'high',
                    'timeline', '1-2 semanas'
                ),
                jsonb_build_object(
                    'title', 'Campanha direcionada',
                    'description', 'Criar promoção específica para este dia da semana',
                    'effort', 'low',
                    'impact', 'medium',
                    'timeline', 'Imediato'
                )
            )::jsonb
        FROM (
            SELECT
                EXTRACT(ISODOW FROM date)::integer as day_of_week,
                TO_CHAR(date, 'Day') as day_name,
                ROUND(AVG(100.0 * occupied_slots / NULLIF(total_possible_slots, 0)), 1) as avg_occupancy,
                ROUND(AVG(new_patients), 1) as avg_new_patients,
                COUNT(DISTINCT date) as weeks_analyzed,
                ROUND(
                    100.0 * (
                        AVG(100.0 * occupied_slots / NULLIF(total_possible_slots, 0)) -
                        (SELECT AVG(100.0 * occupied_slots / NULLIF(total_possible_slots, 0))
                         FROM daily_strategic_metrics_snapshot
                         WHERE organization_id = v_org_id)
                    ) / NULLIF(
                        (SELECT AVG(100.0 * occupied_slots / NULLIF(total_possible_slots, 0))
                         FROM daily_strategic_metrics_snapshot
                         WHERE organization_id = v_org_id), 0
                ), 1
            ) as vs_weekly_avg_pct
            FROM daily_strategic_metrics_snapshot
            WHERE
                organization_id = v_org_id AND
                date >= CURRENT_DATE - INTERVAL '90 days'
            GROUP BY EXTRACT(ISODOW FROM date), TO_CHAR(date, 'Day')
        ) dw
        WHERE dw.weeks_analyzed >= 2  -- Pelo menos 2 semanas de dados
        ON CONFLICT (organization_id, insight_type, insight_date, data) DO NOTHING
        RETURNING id, insight_type, priority, data;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. TRIGGERS E JOBS AGENDADOS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger para atualizar updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_strategic_insights_updated_at
    BEFORE UPDATE ON strategic_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_smart_alert_configurations_updated_at
    BEFORE UPDATE ON smart_alert_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Job agendado: Atualizar snapshots a cada hora
-- ----------------------------------------------------------------------------
SELECT cron.schedule(
    'refresh-strategic-analytics-snapshots',
    '0 * * * *', -- Cada hora
    $$SELECT refresh_daily_metrics_snapshot();$$
);

-- ----------------------------------------------------------------------------
-- Job agendado: Gerar insights automaticamente (diariamente às 6h)
-- ----------------------------------------------------------------------------
SELECT cron.schedule(
    'generate-strategic-insights-daily',
    '0 6 * * *', -- 6h da manhã todos os dias
    $$SELECT * FROM generate_strategic_insights();$$
);

-- ============================================================================
-- 5. POLICIES DE SEGURANÇA (RLS)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE strategic_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_alert_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_alert_history ENABLE ROW LEVEL SECURITY;

-- Policy: strategic_insights
CREATE POLICY "Users can view insights for their organization"
    ON strategic_insights FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can insert insights"
    ON strategic_insights FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND organization_id = strategic_insights.organization_id
            AND role = 'admin'
        )
    );

CREATE POLICY "Users can update insights status for their organization"
    ON strategic_insights FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: smart_alert_configurations
CREATE POLICY "Users can view alert configs for their organization"
    ON smart_alert_configurations FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage alert configs"
    ON smart_alert_configurations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND organization_id = smart_alert_configurations.organization_id
            AND role = 'admin'
        )
    );

-- Policy: smart_alert_history
CREATE POLICY "Users can view alert history for their organization"
    ON smart_alert_history FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "System can insert alert history"
    ON smart_alert_history FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- 6. VIEWS HELPER PARA CONSULTAS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: Insights ativos e não resolvidos
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW active_insights AS
SELECT
    si.*,
    o.name as organization_name
FROM strategic_insights si
JOIN organizations o ON o.id = si.organization_id
WHERE
    si.status IN ('detected', 'acknowledged') AND
    (si.valid_until IS NULL OR si.valid_until >= CURRENT_DATE);

-- ----------------------------------------------------------------------------
-- View: Oportunidades priorizadas (dashboard)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW prioritized_opportunities AS
SELECT
    tso.*,
    '["Oferecer desconto de 10-20%", "Lançar campanha específica", "Enviar SMS para inativos"]'::jsonb as recommendations
FROM time_slot_opportunities tso
WHERE
    tso.opportunity_level IN ('high', 'medium')
ORDER BY tso.opportunity_score DESC;

-- ============================================================================
-- 7. DADOS INICIAIS (SEED)
-- ============================================================================

-- Inserir configurações de alerta padrão
INSERT INTO smart_alert_configurations (organization_id, alert_name, description, metric_name, threshold_value, comparison_operator, time_window, severity, notification_channels, message_template, suggested_actions)
SELECT
    o.id,
    'Taxa de Ocupação Baixa',
    'Alerta quando a taxa de ocupação da agenda estiver abaixo do threshold',
    'occupancy_rate',
    60,
    '<',
    '7d',
    'warning',
    ARRAY['dashboard', 'email'],
    'A taxa de ocupação da agenda está em {{metric_value}}%, abaixo do threshold de {{threshold_value}}%.',
    jsonb_build_array(
        jsonb_build_object('title', 'Revisar estratégias de captação', 'description', 'Considerar lançar promoções ou aumentar marketing', 'effort', 'medium', 'impact', 'high'),
        jsonb_build_object('title', 'Oferecer desconto', 'description', 'Criar promoção para horários vazios', 'effort', 'low', 'impact', 'medium')
    )
FROM organizations o
WHERE o.active = true
ON CONFLICT (organization_id, alert_name, metric_name) DO NOTHING;

INSERT INTO smart_alert_configurations (organization_id, alert_name, description, metric_name, threshold_value, comparison_operator, time_window, severity, notification_channels, message_template, suggested_actions)
SELECT
    o.id,
    'Alta Taxa de Cancelamento',
    'Alerta quando a taxa de cancelamento estiver acima do threshold',
    'cancellation_rate',
    15,
    '>',
    '7d',
    'warning',
    ARRAY['dashboard', 'whatsapp'],
    'A taxa de cancelamento está em {{metric_value}}%, acima do threshold de {{threshold_value}}%.',
    jsonb_build_array(
        jsonb_build_object('title', 'Revisar políticas de confirmação', 'description', 'Aumentar lembretes 24h antes', 'effort', 'low', 'impact', 'high'),
        jsonb_build_object('title', 'Ligar para confirmar', 'description', 'Ligar pessoalmente para pacientes com histórico de no-show', 'effort', 'high', 'impact', 'high')
    )
FROM organizations o
WHERE o.active = true
ON CONFLICT (organization_id, alert_name, metric_name) DO NOTHING;

INSERT INTO smart_alert_configurations (organization_id, alert_name, description, metric_name, threshold_value, comparison_operator, time_window, severity, notification_channels, message_template, suggested_actions)
SELECT
    o.id,
    'Baixa Captação de Pacientes',
    'Alerta quando o número de novos pacientes estiver abaixo da média',
    'new_patients_vs_avg',
    -20,
    '<',
    '7d',
    'warning',
    ARRAY['dashboard', 'email'],
    'A captação de novos pacientes está {{metric_value}}% abaixo da média.',
    jsonb_build_array(
        jsonb_build_object('title', 'Lançar campanha de marketing', 'description', 'Investir em ads ou marketing local', 'effort', 'medium', 'impact', 'high'),
        jsonb_build_object('title', 'Oferecer avaliação gratuita', 'description', 'Promoção de primeira consulta gratuita', 'effort', 'low', 'impact', 'medium'),
        jsonb_build_object('title', 'Programa de indicação', 'description', 'Oferecer bônus para pacientes que indicarem novos', 'effort', 'low', 'impact', 'high')
    )
FROM organizations o
WHERE o.active = true
ON CONFLICT (organization_id, alert_name, metric_name) DO NOTHING;

-- ============================================================================
-- COMMENTS PARA DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON MATERIALIZED VIEW daily_strategic_metrics_snapshot IS
'Snapshot diário de todas as métricas estratégicas da clínica. Atualizado a cada hora.';
COMMENT ON MATERIALIZED VIEW time_slot_opportunities IS
'Análise de ocupação por dia da semana e hora, identificando oportunidades de preenchimento de agenda.';
COMMENT ON MATERIALIZED VIEW patient_acquisition_periods IS
'Análise de períodos com baixa captação de novos pacientes, identificando sazonalidades.';
COMMENT ON TABLE strategic_insights IS
'Insights estratégicos gerados automaticamente pelo sistema ou manualmente por usuários.';
COMMENT ON TABLE smart_alert_configurations IS
'Configurações de alertas inteligentes personalizados por organização.';
COMMENT ON TABLE smart_alert_history IS
'Histórico de todos os alertas disparados pelo sistema.';
COMMENT ON FUNCTION refresh_daily_metrics_snapshot() IS
'Atualiza todas as views materializadas de analytics de forma concorrente.';
COMMENT ON FUNCTION generate_strategic_insights(uuid, text[]) IS
'Gera insights estratégicos automaticamente baseado nos dados de métricas.';

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
