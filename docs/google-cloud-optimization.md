# Google Cloud Free Tier - Guia de Implementação

Este documento descreve todas as otimizações e novos recursos implementados para o FisioFlow utilizando o Google Cloud Free Tier.

## 📊 Resumo das Otimizações

| Fase | Serviço | Status | Benefício Estimado |
|-------|-----------|---------|---------------------|
| 1 | Secret Manager | ✅ Completo | Segurança + Redução de custos |
| 2 | Cloud Build CI/CD | ✅ Completo | 2.500 min/mês grátis |
| 3 | Otimização de Custos | ✅ Completo | ~40% economia em storage |
| 4 | BigQuery Analytics | ✅ Completo | 1TB queries/mês grátis |
| 5 | Pub/Sub Notificações | ✅ Completo | 10GB/mês grátis |
| 6 | Cloud Run APIs | ✅ Completo | 2M requisições/mês grátis |
| 7 | Vision API Features | ✅ Completo | 1.000 imagens/mês grátis |

---

## FASE 1: Secret Manager

### Arquivos Criados
- `scripts/setup-secrets.sh` - Script interativo para gerenciar segredos
- `functions/src/lib/secret-manager.ts` - Já existente (aprimorado)

### Como Usar

```bash
# Executar script de setup
cd scripts
./setup-secrets.sh
```

### Segredos Gerenciados

- Database: DB_PASS, DB_USER, DB_NAME, DB_HOST_IP, CLOUD_SQL_CONNECTION_NAME
- Communication: RESEND_API_KEY, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
- AI Services: GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY
- Payments: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- Google: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALENDAR_WEBHOOK_SECRET
- Security: CRON_SECRET, API_SECRET_KEY, JWT_SECRET, ENCRYPTION_KEY

---

## FASE 2: Cloud Build CI/CD

### Arquivos Criados
- `cloudbuild.yaml` - Pipeline principal para web app
- `cloudbuild.functions.yaml` - Pipeline específico para Cloud Functions

### Como Usar

```bash
# Build com Cloud Build
gcloud builds submit --config cloudbuild.yaml .

# Build apenas das functions
gcloud builds submit --config cloudbuild.functions.yaml .
```

### Estágios do Pipeline
1. Setup e instalação de dependências
2. Lint e type checking
3. Unit tests
4. Build da web app
5. Build das functions
6. Build das apps mobile (opcional)
7. E2E tests (apenas main branch)
8. Deploy para Firebase Hosting
9. Deploy para Cloud Functions (apenas main branch)

---

## FASE 3: Otimização de Custos

### Arquivos Criados
- `functions/src/storage/image-optimization.ts` - Otimização automática de imagens
- `functions/src/lib/batching.ts` - Utility para processamento em batch
- `functions/src/crons/data-retention.ts` - Gerenciamento de TTL e retenção de dados

### Funcionalidades

#### Otimização de Imagens
```typescript
// Funções exportadas:
- optimizeImageOnUpload - Trigger ao upload de imagem
- cleanupOldImages - Remove originais após otimização
- cleanupOrphanThumbnails - Remove thumbnails sem originais
- getOptimizationStats - Estatísticas de economia
```

**Benefícios:**
- Compressão automática para WebP
- Geração automática de thumbnails
- Economia estimada: 60-80% no tamanho de imagens

#### Batching de Cloud Functions
```typescript
// Funções disponíveis:
- processInBatches() - Processa itens em batches
- processQueryInBatches() - Processa queries em chunks
- batchGet() - Gets múltiplos em batch
- batchDeleteByQuery() - Deleta em batch
- BatchingQueue - Classe para agregar requisições
- AggregationCache - Cache de resultados agregados
- bulkUpdate() - Updates em batch
- runTransactionWithRetry() - Transações com retry
```

**Benefícios:**
- Respeita limites do Firestore (500 operações/batch)
- Reduz chamadas de Cloud Functions
- Economiza invocações do free tier

#### Retenção de Dados
```typescript
// Funções exportadas:
- enforceDataRetention() - Enforce manual de retenção
- scheduledDataRetention() - Execução automática agendada
- setDocumentTTL() - Define TTL em documentos criados
- deleteExpiredDocuments() - Remove documentos expirados
- compactLogs() - Compacta logs antigos
- getDataRetentionStats() - Estatísticas de retenção
```

**Políticas de Retenção:**
| Collection | TTL | Archive |
|------------|-----|---------|
| notifications | 7 dias | Não |
| audit_logs | 90 dias | Sim |
| session_logs | 30 dias | Não |
| password_reset_tokens | 1 dia | Não |
| email_verification_tokens | 3 dias | Não |
| temp_cache | 1 dia | Não |
| analytics_events | 90 dias | Não |
| activity_logs | 60 dias | Não |
| messages | 180 dias | Não |

---

## FASE 4: BigQuery Analytics

### Arquivos Criados
- `functions/src/lib/bigquery.ts` - Biblioteca de integração BigQuery
- `functions/src/api/analytics-http.ts` - Endpoints HTTP para analytics

### Tabelas Criadas
- `patients` - Dados de pacientes
- `appointments` - Agendamentos
- `sessions` - Sessões de terapia
- `exercises` - Exercícios realizados
- `pain_maps` - Mapas de dor
- `financial` - Transações financeiras
- `gamification` - Eventos de gamificação

### Endpoints Disponíveis

```bash
# Setup inicial
POST /analytics/setup

# Dashboard de métricas
GET /analytics/dashboard?orgId=xxx

# Evolução do paciente
GET /analytics/patient/:patientId/evolution?days=90

# Estatísticas da organização
GET /analytics/organization/:orgId/stats?days=30

# Top exercícios prescritos
GET /analytics/exercises/top?orgId=xxx&limit=10

# Análise de mapas de dor
GET /analytics/pain-maps?orgId=xxx&days=30

# Estatísticas de gamificação
GET /analytics/gamification?orgId=xxx&days=30

# Previsão de churn
GET /analytics/predictions/churn?days=30

# Uso do BigQuery
GET /analytics/usage

# Query customizada
POST /analytics/query
Body: { query: string, params?: any[] }
```

### Como Usar no Frontend

```typescript
import { callFunction } from '@/lib/firebase';

// Dashboard de analytics
const dashboard = await fetch('/analytics/dashboard?orgId=MY_ORG');

// Evolução do paciente
const evolution = await fetch(`/analytics/patient/${patientId}/evolution?days=90`);

// Query customizada
const result = await fetch('/analytics/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        query: `SELECT * FROM \`fisioflow_analytics.sessions\` LIMIT 100`,
    }),
});
```

---

## FASE 5: Pub/Sub Notificações

### Arquivos Criados
- `functions/src/pubsub/notifications.ts` - Sistema de notificações Pub/Sub

### Tópicos Disponíveis

```typescript
enum Topic {
    NOTIFICATIONS = 'fisioflow-notifications',
    APPOINTMENT_REMINDERS = 'appointment-reminders',
    APPOINTMENT_CREATED = 'appointment-created',
    APPOINTMENT_UPDATED = 'appointment-updated',
    APPOINTMENT_CANCELLED = 'appointment-cancelled',
    PATIENT_REMINDERS = 'patient-reminders',
    PAYMENT_RECEIVED = 'payment-received',
    SESSION_COMPLETED = 'session-completed',
    EXERCISE_LOGGED = 'exercise-logged',
    SYSTEM_ALERTS = 'system-alerts',
    ANALYTICS_EVENTS = 'analytics-events',
}
```

### Como Publicar

```typescript
import {
    publishAppointmentReminder,
    publishAppointmentCreated,
    publishPaymentReceived,
    publishPatientReminder,
    publishAnalyticsEvent,
} from '@/services/pubsub';

// Publicar lembrete de agendamento
await publishAppointmentReminder({
    appointmentId: 'xxx',
    patientId: 'xxx',
    therapistId: 'xxx',
    organizationId: 'xxx',
    startTime: '2024-01-01T10:00:00',
    endTime: '2024-01-01T11:00:00',
    type: 'consulta',
});

// Publicar evento de analytics
await publishAnalyticsEvent('exercise_completed', {
    exerciseId: 'xxx',
    patientId: 'xxx',
    duration: 30,
});
```

---

## FASE 6: Cloud Run APIs

### Arquivos Criados
- `cloud-run/exercise-service/` - Serviço de exercícios em Cloud Run
  - `package.json` - Dependências
  - `src/index.ts` - Código principal
  - `tsconfig.json` - Configuração TypeScript

### Endpoints Disponíveis

```bash
# Health check
GET /health

# Recomendação de exercícios
POST /api/recommend
Body: {
    patientId?: string,
    symptoms: string[],
    affectedAreas: string[],
    contraindications?: string[],
    equipment?: string[],
    sessionDuration?: number,
    count?: number,
}

# Análise de imagem de exercício
POST /api/analyze-exercise-image
Body: {
    imageUrl?: string,
    base64Image?: string,
}

# Análise de postura
POST /api/analyze-posture
Body: {
    imageUrl?: string,
    base64Image?: string,
    exerciseType?: string,
}

# Recomendação em batch
POST /api/recommend-batch
Body: {
    requests: Array<ExerciseRecommendationRequest>,
}
```

### Como Deploy

```bash
cd cloud-run/exercise-service
npm install
npm run build

# Deploy para Cloud Run
gcloud run deploy exercise-service \
  --source . \
  --platform managed \
  --region southamerica-east1 \
  --allow-unauthenticated

# Ou usando npm script
npm run deploy
```

---

## FASE 7: Vision API e Features

### Arquivos Criados
- `functions/src/api/pain-mapping.ts` - Análise de mapas de dor com Vision API
- `functions/src/api/monitoring-http.ts` - Métricas customizadas do Cloud Monitoring

### Pain Mapping

```bash
# Analisar imagem de mapa de dor com Vision API
POST /api/pain-mapping/analyze
Body: {
    patientId: string,
    imageUrl?: string,
    base64Image?: string,
    notes?: string,
}

# Salvar mapa de dor manualmente
POST /api/pain-mapping/save
Body: {
    patientId: string,
    painAreas: Array<{
        region: string,
        level: number,  # 1-10
        type: string,  # 'aguda', 'crônica', 'pontada', etc
    }>,
    notes?: string,
}

# Histórico de mapas de dor
GET /api/pain-mapping/history/:patientId?limit=10&days=90
```

### Cloud Monitoring

```typescript
export enum CustomMetric {
    // Métricas de Negócio
    PATIENTS_ACTIVE = 'custom.googleapis.com/fisioflow/patients/active',
    APPOINTMENTS_BOOKED = 'custom.googleapis.com/fisioflow/appointments/booked',
    APPOINTMENTS_COMPLETED = 'custom.googleapis.com/fisioflow/appointments/completed',
    SESSIONS_COMPLETED = 'custom.googleapis.com/fisioflow/sessions/completed',
    EXERCISES_LOGGED = 'custom.googleapis.com/fisioflow/exercises/logged',
    PAYMENTS_RECEIVED = 'custom.googleapis.com/fisioflow/payments/received',

    // Métricas de Performance
    API_RESPONSE_TIME = 'custom.googleapis.com/fisioflow/api/response_time',
    API_ERROR_RATE = 'custom.googleapis.com/fisioflow/api/error_rate',
    CACHE_HIT_RATE = 'custom.googleapis.com/fisioflow/cache/hit_rate',

    // Métricas de Engajamento
    PATIENT_LOGIN = 'custom.googleapis.com/fisioflow/patients/login',
    PATIENT_EXERCISE_VIEW = 'custom.googleapis.com/fisioflow/patients/exercise_view',
    PATIENT_EVOLUTION_VIEW = 'custom.googleapis.com/fisioflow/patients/evolution_view',

    // Métricas de Sistema
    FUNCTION_INVOCATIONS = 'custom.googleapis.com/fisioflow/functions/invocations',
    FUNCTION_COLD_STARTS = 'custom.googleapis.com/fisioflow/functions/cold_starts',
    STORAGE_USAGE = 'custom.googleapis.com/fisioflow/storage/usage',
}
```

```bash
# Registrar métricas
POST /monitoring/metrics
Body: {
    metrics: Array<{
        metric: string,
        value: number,
        labels?: Record<string, string>,
        timestamp?: Date,
    }>,
}

# Buscar métrica
GET /monitoring/metrics/:metricName?startTime=...&endTime=...

# Dashboard de métricas
GET /monitoring/dashboard?hours=24

# Alertas ativos
GET /monitoring/alerts

# Relatório de SLA
GET /monitoring/sla?days=30
```

---

## 🚀 Como Deploy Todas as Funcionalidades

### 1. Configurar Segredos

```bash
cd scripts
./setup-secrets.sh
```

### 2. Deploy das Cloud Functions

```bash
# Deploy de todas as funções
cd functions
npm run build
firebase deploy --only functions

# Deploy específico
firebase deploy --only functions:optimizeImageOnUpload
firebase deploy --only functions:setupAnalytics
```

### 3. Deploy do Cloud Run Service

```bash
cd cloud-run/exercise-service
npm install
npm run build
gcloud run deploy exercise-service --source .
```

### 4. Setup do Cloud Build

```bash
# Habilitar Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# Criar trigger automático
gcloud builds triggers create github \
    --name=fisioflow-trigger \
    --repo-url=https://github.com/SEU_REPOSITORIO/fisioflow \
    --branch-pattern=main \
    --build-config=cloudbuild.yaml
```

### 5. Setup de Tópicos Pub/Sub

```bash
# Habilitar Pub/Sub API
gcloud services enable pubsub.googleapis.com

# Criar tópicos
gcloud pubsub topics create fisioflow-notifications
gcloud pubsub topics create appointment-reminders
gcloud pubsub topics create analytics-events
```

### 6. Setup do BigQuery

```bash
# Habilitar BigQuery API
gcloud services enable bigquery.googleapis.com

# Setup inicial via endpoint
POST https://fisioflow-migration.firebaseapp.com/api/analytics/setup
```

---

## 📊 Monitoramento e Custos

### Cloud Monitoring Dashboard

1. Acesse o Google Cloud Console
2. Navegue para Monitoring > Dashboards
3. O endpoint `/monitoring/dashboard` fornece dados para criar dashboards customizados

### Alertas Sugeridos

1. **Uso de Cloud Functions**: Alertar se > 1.8M invocações (90% do free tier)
2. **BigQuery Query Bytes**: Alertar se > 900GB (90% do free tier)
3. **Cloud Storage Usage**: Alertar se > 4.5GB (90% do free tier)
4. **API Error Rate**: Alertar se > 5%
5. **SLA Violation**: Alertar se uptime < 99.9%

---

## 🔧 Troubleshooting

### Segredos Não Encontrados

```bash
# Verificar se segredos existem
gcloud secrets list

# Verificar conteúdo de um segredo
gcloud secrets versions access latest --secret=SECRET_NAME
```

### Cloud Build Falhando

```bash
# Verificar logs de build
gcloud builds list --limit=10

# Ver logs específicos
gcloud builds log BUILD_ID
```

### Pub/Sub Não Processando

```bash
# Verificar subscriptions
gcloud pubsub subscriptions list

# Ver logs de delivery
gcloud logging read "resource.type=\"pubsub_subscription\"" \
    --limit=50 --freshness=1h
```

---

## 📚 Referências

- [Google Cloud Free Tier](https://cloud.google.com/free/docs)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Cloud Build](https://cloud.google.com/build/docs)
- [BigQuery](https://cloud.google.com/bigquery/docs)
- [Pub/Sub](https://cloud.google.com/pubsub/docs)
- [Cloud Run](https://cloud.google.com/run/docs)
- [Vision API](https://cloud.google.com/vision/docs)
- [Cloud Monitoring](https://cloud.google.com/monitoring/docs)

---

## 🎯 Próximos Passos

1. ✅ Implementar todas as otimizações
2. 🔄 Atualizar frontend para usar novos endpoints
3. 🔄 Configurar alertas de monitoramento
4. 🔄 Migrar notificações existentes para Pub/Sub
5. 🔄 Configurar scheduled tasks para retenção de dados
6. 🔄 Implementar dashboard de analytics no frontend
