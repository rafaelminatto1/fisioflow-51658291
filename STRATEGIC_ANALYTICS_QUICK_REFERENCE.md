# Analytics Estratégico - Guia de Referência Rápida

## 📋 Índice

1. [Funções Auxiliares do Banco](#funções-auxiliares-do-banco)
2. [Views Administrativas](#views-administrativas)
3. [Funções de Manutenção](#funções-de-manutenção)
4. [Edge Functions](#edge-functions)
5. [Queries Comuns](#queries-comuns)
6. [Alertas Configurados](#alertas-configurados)
7. [Componentes React](#componentes-react)
8. [Troubleshooting Rápido](#troubleshooting-rápido)

---

## 1. Funções Auxiliares do Banco

### `get_top_low_occupancy_slots`
Retorna os horários com menor ocupação e recomendações de ação.

```sql
SELECT * FROM get_top_low_occupancy_slots(
  'org-uuid',    -- organization_id
  5,              -- limite de resultados
  50              -- taxa máxima de ocupação
);
```

**Retorna:**
- `day_name`: Dia da semana
- `hour`: Hora do dia
- `occupancy_rate`: Taxa de ocupação
- `opportunity_score`: Score de oportunidade
- `recommendation`: Ação recomendada

---

### `get_acquisition_trend`
Analisa tendência de captação de novos pacientes.

```sql
SELECT * FROM get_acquisition_trend(
  'org-uuid',    -- organization_id
  8               -- número de semanas
);
```

**Retorna:**
- `period_start`: Início do período
- `new_patients_count`: Número de novos pacientes
- `deviation_percent`: Desvio da média (%)
- `trend`: UP, DOWN ou STABLE
- `severity`: critical, warning ou normal

---

### `get_daily_revenue_summary`
Resumo diário de receita e appointments.

```sql
SELECT * FROM get_daily_revenue_summary(
  'org-uuid',    -- organization_id
  30              -- número de dias
);
```

**Retorna:**
- `date`: Data
- `total_appointments`: Total de agendamentos
- `revenue_total`: Receita total
- `avg_revenue_per_appointment`: Ticket médio

---

### `generate_quick_recommendations`
Gera recomendações de ação baseadas nos insights atuais.

```sql
SELECT * FROM generate_quick_recommendations('org-uuid');
```

**Retorna:**
- `priority`: critical, high, medium
- `category`: tipo de insight
- `recommendation`: Ação recomendada
- `expected_impact`: Impacto esperado

---

### `get_best_performing_slots`
Identifica os melhores dias e horários.

```sql
SELECT * FROM get_best_performing_slots(
  'org-uuid',    -- organization_id
  75,             -- taxa mínima de ocupação
  10              -- limite de resultados
);
```

---

### `get_patient_retention_metrics`
Calcula métricas de retenção de pacientes.

```sql
SELECT * FROM get_patient_retention_metrics(
  'org-uuid',    -- organization_id
  90              -- período em dias
);
```

---

### `get_strategic_dashboard_summary`
Resumo completo para dashboard principal.

```sql
SELECT get_strategic_dashboard_summary('org-uuid');
```

**Retorna JSON com:**
- `total_insights`: Total de insights
- `critical_insights`: Insights críticos
- `opportunities`: Resumo de oportunidades
- `alerts`: Resumo de alertas
- `weekly_metrics`: Métricas semanais

---

### `refresh_strategic_analytics_views`
Atualiza todas as views materializadas.

```sql
SELECT * FROM refresh_strategic_analytics_views();
```

---

## 2. Views Administrativas

### `executive_dashboard_summary`
Dashboard executivo com visão gerencial consolidada.

```sql
SELECT * FROM executive_dashboard_summary
WHERE organization_id = 'org-uuid';
```

**Retorna:**
- `total_insights`: Total de insights
- `critical_insights_active`: Insights críticos ativos
- `avg_impact_score`: Score médio de impacto
- `high_value_opportunities`: Oportunidades de alto valor
- `avg_occupancy_rate`: Taxa média de ocupação
- `total_new_patients_4weeks`: Novos pacientes em 4 semanas
- `revenue_last_week`: Receita da última semana
- `critical_alerts_enabled`: Alertas críticos habilitados
- `last_opportunities_update`: Última atualização das oportunidades

---

### `strategic_insights_by_category`
Insights agrupados por tipo e prioridade.

```sql
SELECT * FROM strategic_insights_by_category
WHERE organization_id = 'org-uuid'
ORDER BY priority, avg_impact_score DESC;
```

**Retorna:**
- `insight_type`: Tipo do insight
- `priority`: Prioridade (critical, high, medium, low)
- `total_insights`: Quantidade de insights
- `avg_impact_score`: Score médio de impacto
- `active_insights`: Insights ativos (detected)
- `acknowledged_insights`: Insights reconhecidos

---

### `improvement_opportunities_consolidated`
Oportunidades de melhoria consolidadas.

```sql
SELECT * FROM improvement_opportunities_consolidated
WHERE organization_id = 'org-uuid'
ORDER BY impact_score DESC
LIMIT 20;
```

**Retorna:**
- `opportunity_type`: Tipo de oportunidade (low_occupancy, low_acquisition)
- `description`: Descrição da oportunidade
- `impact_score`: Score de impacto
- `current_value`: Valor atual
- `improvement_potential`: Potencial de melhoria
- `suggested_action`: Ação sugerida

---

## 3. Funções de Manutenção

### `strategic_analytics_maintenance()`
Executa manutenção completa (VACUUM ANALYZE + REFRESH).

```sql
SELECT * FROM strategic_analytics_maintenance();
```

**Retorna:**
- `table_name`: Nome da tabela/view
- `operation`: Operação executada
- `status`: Status da operação
- `execution_time_ms`: Tempo de execução em ms

---

### `cleanup_old_strategic_insights(days, dry_run)`
Limpa insights antigos (resolvidos/dispensados).

```sql
-- Simular (mostra o que seria deletado)
SELECT * FROM cleanup_old_strategic_insights(90, true);

-- Executar limpeza real
SELECT * FROM cleanup_old_strategic_insights(90, false);
```

**Parâmetros:**
- `p_days_to_keep`: Dias para manter (padrão: 90)
- `p_dry_run`: Simular se true, executar se false

---

### `regenerate_insights(org_id, insight_type, priority)`
Regenera insights para uma organização.

```sql
-- Regenerar todos os insights
SELECT * FROM regenerate_insights('org-uuid');

-- Regenerar apenas insights de ocupação
SELECT * FROM regenerate_insights('org-uuid', 'low_demand_slot');

-- Regenerar apenas insights críticos
SELECT * FROM regenerate_insights('org-uuid', NULL, 'critical');
```

---

### `export_insights_to_csv(org_id, status)`
Exporta insights para formato CSV.

```sql
SELECT export_insights_to_csv('org-uuid');

-- Exportar apenas insights ativos
SELECT export_insights_to_csv('org-uuid', 'detected');
```

---

### `update_strategic_index_statistics()`
Atualiza estatísticas de índices para o otimizador.

```sql
CALL update_strategic_index_statistics();
```

---

### `diagnose_strategic_performance()`
Diagnóstico de performance do sistema.

```sql
SELECT * FROM diagnose_strategic_performance();
```

**Retorna:**
- Tamanho das tabelas
- Índices não utilizados
- Atualidade das views materializadas
- Recomendações de otimização

---

### `get_strategic_usage_metrics(days)`
Métricas de uso do sistema.

```sql
SELECT * FROM get_strategic_usage_metrics(30);
```

**Retorna:**
- Total de insights gerados no período
- Insights críticos ativos
- Oportunidades de alta prioridade
- Taxa média de ocupação
- Alertas ativos

---

## 4. Edge Functions

### `ai-forecast-insights`
Forecasting de métricas com IA.

```bash
curl -X POST https://your-project.supabase.co/functions/v1/ai-forecast-insights \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "org-uuid",
    "horizon": "30d",
    "metrics": ["appointments", "revenue", "patients"],
    "include_recommendations": true
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "appointments": {
      "predictions": [...],
      "trend": 0.08,
      "confidence": 95
    }
  }
}
```

---

### `ai-action-plan`
Gera planos de ação estratégicos.

```bash
curl -X POST https://your-project.supabase.co/functions/v1/ai-action-plan \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "focus_area": "occupancy",
    "time_horizon": "short",
    "constraints": {
      "budget": "low",
      "team_size": 3
    }
  }'
```

**Áreas disponíveis:** `occupancy`, `acquisition`, `retention`, `revenue`, `all`

**Horizontes:** `immediate`, `short`, `medium`, `long`

---

## 5. Queries Comuns

### Insights Críticos Não Resolvidos

```sql
SELECT
  id,
  insight_type,
  priority,
  data->>'recommendation' as recommendation,
  created_at
FROM strategic_insights
WHERE organization_id = 'org-uuid'
  AND priority = 'critical'
  AND status = 'detected'
ORDER BY impact_score DESC
LIMIT 10;
```

### Horários com Oportunidade Alta

```sql
SELECT
  day_name,
  hour,
  opportunity_score,
  occupancy_rate,
  occupied_slots,
  total_possible_slots
FROM time_slot_opportunities
WHERE organization_id = 'org-uuid'
  AND opportunity_score > 70
ORDER BY opportunity_score DESC;
```

### Semanas com Baixa Captação

```sql
SELECT
  period_start,
  period_end,
  new_patients_count,
  avg_new_patients,
  ROUND((new_patients_count::numeric / avg_new_patients - 1) * 100, 1) as deviation_percent
FROM patient_acquisition_periods
WHERE organization_id = 'org-uuid'
  AND new_patients_count < avg_new_patients * 0.7
ORDER BY period_start DESC;
```

### Alertas Ativos por Severidade

```sql
SELECT
  severity,
  COUNT(*) as total,
  ARRAY_AGG(alert_name) as alerts
FROM smart_alert_configurations
WHERE organization_id = 'org-uuid'
  AND enabled = true
GROUP BY severity
ORDER BY
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'warning' THEN 2
    WHEN 'info' THEN 3
  END;
```

### Exportar Dados Completos

```sql
SELECT * FROM strategic_analytics_export
WHERE organization_id = 'org-uuid'
ORDER BY tipo_registro, created_at DESC;
```

---

## 6. Alertas Configurados

### Severidade: CRITICAL

| Alerta | Condição | Ação Sugerida |
|--------|----------|---------------|
| Super Oportunidade | opportunity_score > 85 | Campanha imediata com desconto agressivo |
| Captação ZERO | 0 novos pacientes na semana | Lançar avaliação gratuita urgente |
| Aumento de Cancelamentos | Taxa > 25% | Contatar pacientes imediatamente |
| Horário de Pico Vazio | Ocupação < 30% em horário de pico | Verificar configurações e oferta |

### Severidade: WARNING

| Alerta | Condição | Ação Sugerida |
|--------|----------|---------------|
| Tendência de Queda | Ocupação caindo > 10% | Revisar estratégia de marketing |
| Pacientes em Risco de Churn | Sem visita há 30+ dias | Contato pessoal para reativação |
| Paciente Novo Sem Retorno | Sem retorno após avaliação | Follow-up com incentivo |
| Avaliações em Baixa | Abaixo da média | Campanha de captação |
| Queda de Receita | Receita < 85% da média | Promoção relâmpago |

### Severidade: INFO

| Alerta | Condição | Ação Sugerida |
|--------|----------|---------------|
| Ocupação Excelente | Ocupação > 85% | Expandir horários |
| Receita Recuperada | Recuperação após queda | Documentar estratégias |

---

## 7. Componentes React

### StrategicDashboard

```tsx
import { StrategicDashboard } from '@/components/analytics/strategic';

<StrategicDashboard organizationId={orgId} />
```

**Props:**
- `organizationId`: UUID da organização (obrigatório)
- `defaultTab?: string`: Aba inicial ('overview', 'opportunities', 'forecast', 'alerts', 'table')

### TimeSlotOpportunitiesCard

```tsx
import { TimeSlotOpportunitiesCard } from '@/components/analytics/strategic';

<TimeSlotOpportunitiesCard
  organizationId={orgId}
  viewMode="card"
  minOccupancyThreshold={40}
/>
```

### ForecastChart

```tsx
import { ForecastChart } from '@/components/analytics/strategic';

<ForecastChart
  organizationId={orgId}
  horizon="30d"
  metrics={['appointments', 'revenue', 'patients']}
/>
```

### Hooks

```tsx
import {
  useStrategicInsights,
  useForecast,
  useActionPlan
} from '@/hooks/analytics';

// Insights
const { data: insights, isLoading } = useStrategicInsights(orgId);

// Forecast
const { data: forecast } = useForecast({
  organizationId: orgId,
  horizon: '30d'
});

// Action Plan
const { mutate: generatePlan } = useActionPlan();
```

---

## 8. Troubleshooting Rápido

### Views desatualizadas

```sql
-- Atualizar todas as views
SELECT * FROM refresh_strategic_analytics_views();

-- Ver última atualização
SELECT schemaname, matviewname, last_refresh
FROM pg_matviews
WHERE matviewname LIKE '%strategic%';
```

### Insights não aparecem

```sql
-- Verificar se existem insights
SELECT COUNT(*) FROM strategic_insights;

-- Gerar insights manualmente
SELECT generate_strategic_insights();

-- Ver configuração do cron
SELECT * FROM cron.job WHERE jobname LIKE '%strategic%';
```

### Performance lenta

```sql
-- Ver índices criados
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
WHERE tablename LIKE '%strategic%'
  OR tablename LIKE '%insight%'
ORDER BY idx_scan DESC;

-- Analisar query lenta
EXPLAIN ANALYZE
SELECT * FROM strategic_insights
WHERE organization_id = 'org-uuid'
  AND priority = 'critical'
LIMIT 10;
```

### Reset do sistema

```sql
-- Recriar views materializadas
REFRESH MATERIALIZED VIEW CONCURRENTLY time_slot_opportunities;
REFRESH MATERIALIZED VIEW CONCURRENTLY patient_acquisition_periods;
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_strategic_metrics_snapshot;

-- Recriar insights
TRUNCATE strategic_insights;
SELECT generate_strategic_insights();

-- Verificar resultados
SELECT
  'strategic_insights' as table_name, COUNT(*) as row_count
FROM strategic_insights
UNION ALL
SELECT
  'time_slot_opportunities', COUNT(*)
FROM time_slot_opportunities
UNION ALL
SELECT
  'patient_acquisition_periods', COUNT(*)
FROM patient_acquisition_periods;
```

---

### Diagnóstico completo do sistema

```sql
-- Ver status geral
SELECT * FROM diagnose_strategic_performance();

-- Ver métricas de uso
SELECT * FROM get_strategic_usage_metrics(30);

-- Ver dashboard executivo
SELECT * FROM executive_dashboard_summary
WHERE organization_id = 'org-uuid';
```

### Manutenção programada

```sql
-- Executar manutenção completa
SELECT * FROM strategic_analytics_maintenance();

-- Atualizar estatísticas de índices
CALL update_strategic_index_statistics();

-- Limpar insights antigos (simular primeiro)
SELECT * FROM cleanup_old_strategic_insights(90, true);

-- Confirmar e executar limpeza
SELECT * FROM cleanup_old_strategic_insights(90, false);
```

---

## 9. Exemplos Práticos do Dia a Dia

### Cenário 1: Gerente quer relatório executivo semanal

```sql
-- Resumo executivo completo
SELECT
  organization_name,
  total_insights,
  critical_insights_active,
  high_value_opportunities,
  ROUND(avg_occupancy_rate::numeric, 1) || '%' as ocupacao_media,
  'R$ ' || ROUND(revenue_last_week::numeric, 2) as receita_semana,
  critical_alerts_enabled
FROM executive_dashboard_summary
WHERE organization_id = 'org-uuid';
```

### Cenário 2: Identificar horários para campanha promocional

```sql
-- Top 5 horários com menor ocupação
SELECT
  day_name,
  hour,
  opportunity_score,
  occupancy_rate,
  recommendation
FROM get_top_low_occupancy_slots('org-uuid', 5, 50);

-- Ver oportunidades consolidadas
SELECT
  description,
  impact_score,
  improvement_potential,
  suggested_action
FROM improvement_opportunities_consolidated
WHERE organization_id = 'org-uuid'
  AND opportunity_type = 'low_occupancy'
ORDER BY impact_score DESC
LIMIT 10;
```

### Cenário 3: Analisar queda de captação

```sql
-- Ver tendência de captação
SELECT
  period_start,
  new_patients_count,
  avg_new_patients,
  deviation_percent,
  trend,
  severity
FROM get_acquisition_trend('org-uuid', 8);

-- Ver insights de baixa captação
SELECT
  created_at,
  priority,
  data->>'period_start' as period,
  data->>'recommendation' as recommendation
FROM strategic_insights
WHERE organization_id = 'org-uuid'
  AND insight_type = 'acquisition_gap'
  AND status = 'detected'
ORDER BY impact_score DESC;
```

### Cenário 4: Previsão de receita para próximo mês

```sql
-- Via Edge Function
curl -X POST https://your-project.supabase.co/functions/v1/ai-forecast-insights \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "org-uuid",
    "horizon": "30d",
    "metrics": ["revenue"],
    "include_recommendations": true
  }'

-- Ou via dados históricos
SELECT
  date,
  revenue_total,
  AVG(revenue_total) OVER (ORDER BY date ROWS 6 PRECEDING) as moving_avg_7days
FROM get_daily_revenue_summary('org-uuid', 90)
ORDER BY date DESC
LIMIT 30;
```

### Cenário 5: Plano de ação para ocupação

```sql
-- Gerar plano de ação estratégico
curl -X POST https://your-project.supabase.co/functions/v1/ai-action-plan \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "focus_area": "occupancy",
    "time_horizon": "short",
    "constraints": {
      "budget": "low",
      "team_size": 3
    }
  }'

-- Recomendações rápidas locais
SELECT
  priority,
  category,
  recommendation,
  expected_impact,
  effort
FROM generate_quick_recommendations('org-uuid')
WHERE category IN ('low_demand_slot', 'occupancy_drop')
LIMIT 10;
```

### Cenário 6: Análise de retenção de pacientes

```sql
-- Métricas de retenção
SELECT
  metric_name,
  metric_value::TEXT || CASE
    WHEN metric_name LIKE '%%' THEN ''
    ELSE ''
  END as value,
  metric_description
FROM get_patient_retention_metrics('org-uuid', 90);

-- Insights de retenção
SELECT
  created_at,
  priority,
  data->>'retention_rate' as retention_rate,
  recommendations[1] as action
FROM strategic_insights
WHERE organization_id = 'org-uuid'
  AND insight_type = 'retention_risk'
  AND status = 'detected'
ORDER BY impact_score DESC;
```

### Cenário 7: Exportar relatório mensal

```sql
-- Exportar insights para CSV (para Excel)
SELECT export_insights_to_csv('org-uuid', 'detected');

-- Ou query completa para export
SELECT
  'INSIGHTS' as tipo,
  created_at::date as data,
  insight_type,
  priority,
  impact_score,
  data->>'day_name' as dia,
  data->>'hour' as hora,
  recommendations[1] as recomendacao
FROM strategic_insights
WHERE organization_id = 'org-uuid'
  AND created_at >= DATE_TRUNC('month', CURRENT_DATE)

UNION ALL

SELECT
  'OPORTUNIDADES' as tipo,
  calculated_at::date as data,
  'low_occupancy' as insight_type,
  CASE WHEN opportunity_score > 85 THEN 'critical' ELSE 'high' END as priority,
  opportunity_score as impact_score,
  day_name as dia,
  hour::TEXT as hora,
  'Campanha ' || CASE WHEN opportunity_score > 85 THEN 'agressiva' ELSE 'moderada' END as recomendacao
FROM time_slot_opportunities
WHERE organization_id = 'org-uuid'
  AND opportunity_score > 70
  AND calculated_at >= DATE_TRUNC('month', CURRENT_DATE)

ORDER BY data DESC, priority DESC;
```

### Cenário 8: Monitoramento diário rápido

```sql
-- Dashboard matinal em uma query
WITH daily AS (
  SELECT
    CURRENT_DATE as hoje,
    COUNT(*) FILTER (WHERE priority = 'critical' AND status = 'detected') as criticos,
    COUNT(*) FILTER (WHERE status = 'detected') as total_ativos,
    ROUND(AVG(impact_score), 1) as score_medio
  FROM strategic_insights
  WHERE organization_id = 'org-uuid'
    AND created_at >= CURRENT_DATE
),
opps AS (
  SELECT COUNT(*) as oportunidades
  FROM time_slot_opportunities
  WHERE organization_id = 'org-uuid'
    AND opportunity_score > 80
),
revenue AS (
  SELECT COALESCE(SUM(revenue_total), 0) as receita_hoje
  FROM daily_strategic_metrics_snapshot
  WHERE organization_id = 'org-uuid'
    AND date = CURRENT_DATE
)
SELECT
  'Resumo Diário ' || TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY') as titulo,
  d.criticos as insights_criticos,
  d.total_ativos as insights_ativos,
  d.score_medio as impacto_medio,
  o.oportunidades as oportunidades_alta_prioridade,
  'R$ ' || ROUND(r.receita_hoje::numeric, 2) as receita_hoje
FROM daily d
CROSS JOIN opps o
CROSS JOIN revenue r;
```

---

## 10. Índices de Performance

Os seguintes índices foram criados para otimizar queries:

- `idx_strategic_insights_org_priority`: Organização + prioridade
- `idx_strategic_insights_impact`: Score de impacto
- `idx_strategic_insights_critical`: Insights críticos
- `idx_time_slot_opportunities_org_score`: Score de oportunidade
- `idx_time_slot_opportunities_high_value`: Oportunidades > 80
- `idx_acquisition_periods_org_trends`: Tendências de captação
- `idx_smart_alerts_org_enabled`: Alertas ativos
- `idx_daily_metrics_org_date`: Métricas diárias
- `idx_strategic_insights_data_gin`: Busca JSONB
- `idx_smart_alerts_actions_gin`: Ações JSONB

---

## 11. Cron Jobs

Jobs agendados configurados:

| Job | Schedule | Função |
|-----|----------|--------|
| `refresh-daily-metrics` | 0 2 * * * | Atualiza snapshot diário |
| `generate-insights` | 0 6 * * * | Gera insights estratégicos |

---

## 12. Resumo de Funcionalidades v2

### Novidades na Versão 2

**Views Administrativas (3):**
- `executive_dashboard_summary` - Dashboard executivo consolidado
- `strategic_insights_by_category` - Insights agrupados por categoria
- `improvement_opportunities_consolidated` - Oportunidades consolidadas

**Funções de Manutenção (7):**
- `strategic_analytics_maintenance()` - Manutenção completa
- `cleanup_old_strategic_insights()` - Limpeza de insights antigos
- `regenerate_insights()` - Regeneração de insights
- `export_insights_to_csv()` - Exportação CSV
- `update_strategic_index_statistics()` - Atualização de estatísticas
- `diagnose_strategic_performance()` - Diagnóstico de performance
- `get_strategic_usage_metrics()` - Métricas de uso

**Total de Objetos no Sistema:**
- 24+ índices de performance
- 8 funções auxiliares de análise
- 7 funções de manutenção/admin
- 3 views administrativas
- 2 edge functions
- 32+ alertas configurados
- 2 cron jobs

---

## Suporte

Para dúvidas ou problemas:
1. Consulte o guia completo: `ANALYTICS_ESTRATEGICO_GUIA_COMPLETO.md`
2. Verifique os logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
3. Teste as funções: `SELECT * FROM get_strategic_dashboard_summary('org-uuid');`
