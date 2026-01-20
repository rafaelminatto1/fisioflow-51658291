# Analytics Estratégico - Guia Completo de Uso

## Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Arquivos](#estrutura-de-arquivos)
3. [Componentes Implementados](#componentes-implementados)
4. [Como Usar](#como-usar)
5. [Exemplos de Insights Gerados](#exemplos-de-insights-gerados)
6. [Configuração e Personalização](#configuração-e-personalização)
7. [Integração com o Sistema](#integração-com-o-sistema)
8. [Manutenção e Monitoramento](#manutenção-e-monitoramento)
9. [Troubleshooting](#troubleshooting)

---

## Visão Geral

O Sistema de Analytics Estratégico do FisioFlow fornece:

- **Identificação de Horários com Baixa Ocupação**: Descubra quais dias e horários têm menos agendamentos
- **Análise de Períodos de Baixa Captação**: Identifique momentos com poucos novos pacientes/avaliações
- **Forecasting com IA**: Previsões de consultas, receita e novos pacientes
- **Recomendações Estratégicas**: Sugestões automáticas de ações baseadas nos dados
- **Alertas Inteligentes**: Notificações configuráveis baseadas em KPIs

---

## Estrutura de Arquivos

### Database (Supabase)

```
supabase/migrations/
└── 20260120000001_strategic_analytics_infrastructure.sql
    └── Views materializadas, tabelas e funções para analytics
```

### Bibliotecas de Cálculo

```
src/lib/analytics/strategic/
├── types.ts                    # Tipos TypeScript
├── insights-calculator.ts      # Cálculos de insights
└── forecasting.ts              # Algoritmos de previsão
```

### React Hooks

```
src/hooks/analytics/
├── useStrategicInsights.ts     # Hooks para insights
└── useForecast.ts              # Hooks para forecasting
```

### Componentes de UI

```
src/components/analytics/strategic/
├── index.ts                    # Exportações
├── StrategicDashboard.tsx      # Dashboard principal
├── TimeSlotOpportunitiesCard.tsx   # Horários vagos
├── AcquisitionGapsCard.tsx     # Períodos baixa captação
├── ForecastChart.tsx           # Gráfico de previsão
├── InsightsTable.tsx           # Tabela detalhada
├── MetricsSummaryCards.tsx     # Cards de KPIs
├── SmartAlertsPanel.tsx        # Painel de alertas
├── WeeklyOccupancyHeatmap.tsx  # Mapa de calor
└── RecommendationsPanel.tsx    # Recomendações
```

### Edge Functions

```
supabase/functions/
├── ai-forecast-insights/
│   └── index.ts                # Forecasting com IA
└── ai-action-plan/
    └── index.ts                # Planos de ação
```

---

## Componentes Implementados

### 1. Dashboard Principal (StrategicDashboard)

Dashboard com abas para visualização completa:

```tsx
import { StrategicDashboard } from '@/components/analytics/strategic';

<StrategicDashboard organizationId={orgId} />
```

**Abas disponíveis:**
- Visão Geral: Cards de resumo e heatmap
- Oportunidades: Horários vagos e períodos de baixa captação
- Previsões: Gráficos de forecast
- Alertas: Histórico de alertas inteligentes
- Tabela Completa: Dados detalhados exportáveis

### 2. Horários com Baixa Ocupação

Exibe os horários com menor taxa de ocupação:

```tsx
import { TimeSlotOpportunitiesCard } from '@/components/analytics/strategic';

<TimeSlotOpportunitiesCard
  organizationId={orgId}
  viewMode="card"  // ou "table"
  minOccupancyThreshold={40}
  timeSlotsPerDay={12}
/>
```

### 3. Períodos de Baixa Captação

Analisa períodos com poucos novos pacientes:

```tsx
import { AcquisitionGapsCard } from '@/components/analytics/strategic';

<AcquisitionGapsCard
  organizationId={orgId}
  viewMode="card"
  periodType="weekly"
  minPatientsThreshold={3}
/>
```

### 4. Forecasting

Previsões com múltiplos horizontes:

```tsx
import { ForecastChart } from '@/components/analytics/strategic';

<ForecastChart
  organizationId={orgId}
  horizon="30d"  // "7d", "30d", "90d"
  metrics={['appointments', 'revenue', 'patients']}
  showConfidenceInterval={true}
/>
```

### 5. Tabela Detalhada Exportável

```tsx
import { InsightsTable } from '@/components/analytics/strategic';

<InsightsTable
  organizationId={orgId}
  onExport={(format) => console.log(`Exportando ${format}`)}
  enableFilters={true}
/>
```

---

## Como Usar

### Integração Básica

1. **Adicione o Dashboard a uma rota:**

```tsx
// app/dashboard/analytics/page.tsx
import { StrategicDashboard } from '@/components/analytics/strategic';

export default function AnalyticsPage() {
  return <StrategicDashboard />;
}
```

2. **Ou use componentes individuais:**

```tsx
import { MetricsSummaryCards, ForecastChart } from '@/components/analytics/strategic';

export default function CustomDashboard() {
  return (
    <div className="space-y-6">
      <MetricsSummaryCards />
      <ForecastChart horizon="30d" />
    </div>
  );
}
```

### Hooks Customizados

Para integrações mais flexíveis:

```tsx
import { useStrategicInsights, useForecast } from '@/hooks/analytics';

function MyComponent() {
  // Insights estratégicos
  const { data: insights, isLoading } = useStrategicInsights();

  // Forecasting
  const { data: forecast } = useForecast({
    horizon: '30d',
    metrics: ['appointments', 'revenue']
  });

  // Ações
  const { mutate: acknowledge } = useAcknowledgeInsight();

  return (
    // seu componente
  );
}
```

### Chamada de Edge Functions

```tsx
// Forecasting
const forecastResponse = await fetch(
  '/functions/v1/ai-forecast-insights',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      organization_id: orgId,
      horizon: '30d',
      metrics: ['appointments', 'revenue'],
      include_recommendations: true
    })
  }
);

// Action Plan
const actionPlanResponse = await fetch(
  '/functions/v1/ai-action-plan',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      focus_area: 'occupancy',
      time_horizon: 'short',
      constraints: {
        budget: 'low',
        team_size: 3
      }
    })
  }
);
```

---

## Exemplos de Insights Gerados

### Horário com Baixa Ocupação

```json
{
  "day_of_week": "Segunda-feira",
  "hour": 14,
  "occupancy_rate": 25.5,
  "total_appointments": 50,
  "occupied_slots": 12,
  "available_capacity": 38,
  "potential_revenue": 3800.00,
  "opportunity_score": 85,
  "recommendation": "Criar campanha 'Hora Feliz' com 15% de desconto"
}
```

### Período de Baixa Captação

```json
{
  "period_start": "2024-01-08",
  "period_end": "2024-01-14",
  "period_type": "weekly",
  "new_patients": 2,
  "new_evaluations": 1,
  "avg_patients": 8.5,
  "deviation_from_avg": -76.5,
  "severity": "critical",
  "recommendation": "Lançar campanha de avaliação gratuita urgente"
}
```

### Forecast

```json
{
  "metric": "appointments",
  "predictions": [
    { "date": "2024-02-01", "predicted": 45, "confidence_interval": { "lower": 38, "upper": 52 } },
    { "date": "2024-02-02", "predicted": 48, "confidence_interval": { "lower": 41, "upper": 55 } }
  ],
  "trend": 0.08,
  "confidence": 95
}
```

---

## Configuração e Personalização

### Ajustar Thresholds

Edite o arquivo de tipos ou os componentes:

```typescript
// Thresholds padrão
const THRESHOLDS = {
  low_occupancy: 50,      // % ocupação considerada baixa
  low_acquisition: 3,     // novos pacientes por período
  high_acquisition: 15,   // novos pacientes por período
  revenue_gap: 0.2,       // 20% abaixo da média
};
```

### Configurar Alertas

```typescript
// Criar configuração de alerta
const alertConfig = {
  name: "Baixa Ocupação Segunda",
  insight_type: "low_demand_slot",
  condition: {
    field: "occupancy_rate",
    operator: "lt",
    value: 40
  },
  severity: "warning",
  notification_channels: ["email", "in_app"],
  cooldown_minutes: 1440  // 24 horas
};
```

### Personalizar Dashboards

```tsx
<StrategicDashboard
  organizationId={orgId}
  defaultTab="forecast"
  showExportButton={true}
  dateRange={{
    from: subDays(new Date(), 90),
    to: new Date()
  }}
/>
```

---

## Integração com o Sistema

### 1. Aplicar a Migration

A migration já foi aplicada via Supabase MCP. Verifique:

```sql
-- Ver views criadas
SELECT * FROM pg_matviews WHERE matviewname LIKE '%strategic%';

-- Ver tabelas
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE '%strategic%' OR table_name LIKE '%alert%';
```

### 2. Deploy das Edge Functions

```bash
# Deploy forecast function
supabase functions deploy ai-forecast-insights

# Deploy action plan function
supabase functions deploy ai-action-plan
```

### 3. Configurar Cron Jobs

Os cron jobs são configurados na migration:

```sql
-- Refresh diário do snapshot (2h da manhã)
SELECT cron.schedule(
  'refresh-daily-metrics',
  '0 2 * * *',
  $$SELECT refresh_daily_metrics_snapshot();$$
);

-- Geração de insights (6h da manhã)
SELECT cron.schedule(
  'generate-insights',
  '0 6 * * *',
  $$SELECT generate_strategic_insights();$$
);
```

---

## Manutenção e Monitoramento

### Verificar Jobs Agendados

```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### Monitorar Performance

```sql
-- Ver tamanho das views materializadas
SELECT
  schemaname,
  matviewname,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
FROM pg_matviews
WHERE matviewname LIKE '%strategic%';
```

### Refresh Manual das Views

```sql
-- Snapshot diário
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_strategic_metrics_snapshot;

-- Oportunidades de horário
REFRESH MATERIALIZED VIEW CONCURRENTLY time_slot_opportunities;

-- Períodos de captação
REFRESH MATERIALIZED VIEW CONCURRENTLY patient_acquisition_periods;
```

---

## Troubleshooting

### Insights não aparecem

```sql
-- Verificar se existem insights
SELECT * FROM strategic_insights ORDER BY created_at DESC;

-- Gerar manualmente
SELECT generate_strategic_insights();

-- Ver last_refresh
SELECT max(last_refresh) FROM daily_strategic_metrics_snapshot;
```

### Forecast retorna erro

```typescript
// Verificar dados suficientes
const data = await fetchTimeSeriesData(supabase, orgId, 'appointments', 90);
if (data.length < 3) {
  console.error('Dados insuficientes para forecast');
}
```

### Views desatualizadas

```sql
-- Verificar última atualização
SELECT schemaname, matviewname, last_refresh
FROM pg_matviews
WHERE matviewname LIKE '%strategic%';
```

---

## Próximos Passos

1. **Testar o Dashboard**: Acesse a rota do analytics e verifique os dados
2. **Configurar Alertas**: Defina thresholds personalizados para sua clínica
3. **Exportar Relatórios**: Use a funcionalidade de export da tabela completa
4. **Ajustar Cron Jobs**: Modifique horários conforme necessidade
5. **Personalizar Visualizações**: Adicione/remova abas do dashboard

---

## Suporte

Para dúvidas ou problemas, consulte:
- Documentação do Supabase: https://supabase.com/docs
- Recharts: https://recharts.org
- React Query: https://tanstack.com/query/latest
