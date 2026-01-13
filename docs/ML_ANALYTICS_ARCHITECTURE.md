# Arquitetura do Sistema de Analytics e Machine Learning

## Visão Geral

O sistema de analytics e ML do FisioFlow fornece análise preditiva, rastreamento de progresso do paciente e insights baseados em dados para melhorar os resultados clínicos.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ Analytics Dashboard│  │ Lifecycle Chart │  │Insights Panel │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘ │
│           │                     │                    │          │
│           └─────────────────────┴────────────────────┘          │
│                             │                                  │
│                    ┌────────▼─────────┐                       │
│                    │  Error Boundary  │                       │
│                    └────────┬─────────┘                       │
│                             │                                  │
└─────────────────────────────┼──────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Custom Hooks (React Query)                   │
├─────────────────────────────────────────────────────────────────┤
│  usePatientAnalytics       │  useMLDataCollection              │
│  usePatientPredictions     │  useAnalyticsExport               │
└─────────────┬───────────────┴──────────────┬───────────────────┘
              │                              │
              ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Supabase PostgreSQL)                │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Database Tables                          │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  • patient_lifecycle_events  • patient_session_metrics     │ │
│  │  • patient_outcome_measures   • patient_predictions        │ │
│  │  • patient_risk_scores        • patient_goal_tracking       │ │
│  │  • ml_training_data           • patient_insights            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    SQL Functions                            │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  • calculate_patient_risk()    • update_patient_risk_score()│ │
│  │  • get_patient_progress_summary()                           │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ML Services (Future Integration)               │
├─────────────────────────────────────────────────────────────────┤
│  • Dropout Prediction Model      • Outcome Prediction Model    │
│  • Recovery Timeline Model       • Risk Stratification Model   │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes Principais

### 1. Analytics Dashboard (`PatientAnalyticsDashboard`)
**Arquivo**: `src/components/patients/analytics/PatientAnalyticsDashboard.tsx`

Exibe visualizações completas do progresso do paciente:
- Cards de métricas principais (sessões, redução de dor, objetivos)
- Gráficos de evolução clínica (Recharts)
- Análise de tendências de dor e função
- Predições de ML com intervalos de confiança
- Análise de fatores de risco (radar chart)

### 2. Lifecycle Chart (`PatientLifecycleChart`)
**Arquivo**: `src/components/patients/analytics/PatientLifecycleChart.tsx`

Visualização da jornada do paciente na clínica:
- Timeline de estágios (lead → tratamento → alta)
- Duração em cada estágio
- Estatísticas do ciclo de vida

### 3. Insights Panel (`PatientInsightsPanel`)
**Arquivo**: `src/components/patients/analytics/PatientInsightsPanel.tsx`

Painel de insights gerados automaticamente:
- Alertas de tendência
- Marcos alcançados
- Riscos detectados
- Recomendações de ação

### 4. Error Boundary (`AnalyticsErrorBoundary`)
**Arquivo**: `src/components/patients/analytics/AnalyticsErrorBoundary.tsx`

Captura erros nos componentes de analytics e fornece UI de fallback.

## Hooks de Dados

### Hooks Principais (`usePatientAnalytics.ts`)

| Hook | Descrição |
|------|-----------|
| `usePatientProgressSummary` | Resumo do progresso do paciente |
| `usePatientLifecycleEvents` | Eventos do ciclo de vida |
| `usePatientOutcomeMeasures` | Medidas de resultado (PROMs) |
| `usePatientSessionMetrics` | Métricas por sessão |
| `usePatientPredictions` | Predições de ML |
| `usePatientRiskScore` | Score de risco |
| `usePatientGoals` | Objetivos de tratamento |
| `usePatientInsights` | Insights gerados |

### Hooks de ML (`useMLDataCollection.ts`)

| Hook | Descrição |
|------|-----------|
| `collectPatientTrainingData` | Coleta dados anonimizados para ML |
| `useCollectPatientMLData` | Coleta e salva dados de ML |
| `useBatchCollectMLData` | Coleta em lote para múltiplos pacientes |
| `useGeneratePatientPredictions` | Gera predições baseadas em ML |

### Hooks de Exportação (`useAnalyticsExport.ts`)

| Hook | Descrição |
|------|-----------|
| `useAnalyticsExport` | Exporta analytics em CSV/JSON |
| `useBatchAnalyticsExport` | Exportação em lote |

## Schema do Banco de Dados

### Tabelas Principais

#### `patient_lifecycle_events`
Rastreia eventos do ciclo de vida do paciente.

```sql
event_type: lead_created | first_contact | first_appointment_scheduled |
            first_appointment_completed | treatment_started | treatment_paused |
            treatment_resumed | treatment_completed | discharged | follow_up_scheduled |
            reactivation | churned
```

#### `patient_session_metrics`
Métricas coletadas durante cada sessão.

- `pain_level_before/after`: Nível de dor (0-10)
- `functional_score_before/after`: Pontuação funcional (0-100)
- `pain_reduction`: Calculado automaticamente
- `functional_improvement`: Calculado automaticamente

#### `patient_predictions`
Armazena predições de ML.

- `prediction_type`: outcome_success | dropout_risk | recovery_timeline | optimal_session_frequency
- `predicted_value`: Valor numérico da predição
- `confidence_score`: Confiança do modelo (0-1)
- `model_version`: Versão do modelo que gerou a predição

#### `ml_training_data`
Dados anonimizados para treinamento de ML.

- `patient_hash`: ID do paciente anonimizado (SHA256)
- `age_group`: Faixa etária (0-17, 18-30, 31-50, 51-65, 65+)
- `outcome_category`: success | partial | poor

## Funções SQL

### `calculate_patient_risk(patient_id)`
Calcula scores de risco para um paciente.

**Retorna**:
- `dropout_risk`: Risco de abandono (0-100)
- `no_show_risk`: Risco de não comparecimento (0-100)
- `poor_outcome_risk`: Risco de desfecho pobre (0-100)
- `overall_risk`: Risco geral (0-100)
- `risk_level`: low | medium | high | critical

### `get_patient_progress_summary(patient_id)`
Resumo completo do progresso do paciente.

**Retorna**:
- `total_sessions`: Número total de sessões
- `avg_pain_reduction`: Redução média da dor
- `goals_achieved`: Objetivos alcançados
- `overall_progress_percentage`: Progresso geral (0-100)

## Integração de ML (Futuro)

### Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────┐
│                    ML Pipeline                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Data Collection  ──►  2. Preprocessing  ──►  3. Training│
│     (postgres)              (python)            (sklearn)    │
│                                                             │
│  4. Model Evaluation  ──►  5. Deployment  ──►  6. Monitoring│
│     (mlflow)              (fastapi)          (prometheus)  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Modelos Planejados

1. **Dropout Prediction**
   - Features: attendance_rate, days_since_last_session, cancellation_rate
   - Target: dropout (yes/no)
   - Algorithm: Random Forest ou XGBoost

2. **Recovery Timeline**
   - Features: baseline_pain, pathology, session_frequency
   - Target: sessions_to_discharge (número)
   - Algorithm: Regressão Linear ou Gradient Boosting

3. **Outcome Prediction**
   - Features: demographics, baseline_metrics, treatment adherence
   - Target: outcome_category (success/partial/poor)
   - Algorithm: Multiclass Classification

## Segurança e Privacidade

### Anonimização de Dados

```typescript
// Hash SHA256 para anonimização
function hashPatientId(patientId: string): string {
  return crypto
    .createHash('sha256')
    .update(patientId + process.env.VITE_ML_SALT)
    .digest('hex')
    .substring(0, 16);
}
```

### Políticas de RLS

- Apenas administradores e fisioterapeutas podem ver analytics
- Dados de ML são completamente anonimizados
- Audit trail para todas as predições geradas

## Melhorias Futuras

### Short-term
- [ ] Implementar exportação PDF (jsPDF)
- [ ] Implementar exportação Excel (xlsx)
- [ ] Adicionar testes unitários para hooks
- [ ] Adicionar testes de integração para funções SQL

### Medium-term
- [ ] Integração com modelo de ML real (API)
- [ ] Sistema de recomendações automático
- [ ] Análise de cohortes
- [ ] Dashboards administrativos

### Long-term
- [ ] AutoML para retreinamento de modelos
- [ ] Feature importance e explainability
- [ ] Experimentação A/B de modelos
- [ ] Tempo real com WebSockets

## Troubleshooting

### Erro: "function calculate_patient_risk does not exist"
Execute a migration novamente ou verifique se a função foi criada corretamente.

### Erro: "Nenhum dado disponível para gráfico"
Isso acontece quando o paciente não tem métricas de sessão registradas. Registre algumas sessões primeiro.

### Predições retornam valores baixos
As predições atuais são baseadas em regras simples. Valores mais precisos requerem integração com modelo de ML real.
