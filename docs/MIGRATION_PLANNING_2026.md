# FisioFlow - Planejamento Completo de Migração
## Supabase + Vercel → Google Cloud Platform (Firebase)

> **Data**: Janeiro 2026
> **Status**: Migração Híbrida em Andamento (~60-70% concluído)
> **Objetivo**: Migração completa para Google Cloud Platform

---

## Sumário Executivo

### Estado Atual
O FisioFlow está em estado de **migração híbrida**, com:
- **Frontend**: ~70% migrado para Firebase
- **Backend**: Ainda dependente do Supabase (115+ arquivos)
- **Funções**: Supabase Functions (44) + Firebase Functions (16)
- **Hosting**: Vercel ativo + Firebase configurado
- **Workflows**: Inngest ativo (13 workflows)
- **Storage**: Híbrido (Vercel Blob + Supabase Storage + Firebase Storage)

### Serviços Ativos

| Serviço | Plataforma Atual | Plataforma Destino | Status Migração |
|---------|------------------|-------------------|-----------------|
| **Autenticação** | Supabase Auth | Firebase Auth | 70% - Contexto migrado, hooks pendentes |
| **Database Principal** | Supabase (PostgreSQL) | Firestore | 40% - Estrutura criada, dados parciais |
| **Database SQL** | Supabase SQL | Cloud SQL | 10% - Script de migração criado |
| **Storage** | Vercel Blob + Supabase Storage | Firebase Storage | 30% - Uploads híbridos |
| **Edge Functions** | Vercel Edge Functions | Firebase Functions | 30% - 16/44 funções |
| **Cron Jobs** | Vercel Crons (6) | Cloud Scheduler | 0% - Pendente |
| **Workflows** | Inngest | Cloud Tasks/PubSub | 0% - Pendente |
| **Cache Distribuído** | Vercel KV (Redis) | Firestore + Redis | 0% - Pendente |
| **Feature Flags** | Vercel Edge Config | Firebase Remote Config | 0% - Pendente |
| **Hosting Web** | Vercel | Firebase Hosting | 20% - Configurado, não ativo |
| **Analytics** | Vercel Analytics | Firebase Analytics | 50% - Ambos ativos |
| **AI/ML** | OpenAI (via Inngest) | Firebase AI Logic (Gemini) | 0% - Roadmap definido |

---

## Mapa de Dependências (Supabase)

### Arquivos que Ainda Usam Supabase (50+ arquivos)

```
src/
├── hooks/                           # 20+ hooks usando Supabase
│   ├── usePatientEvolution.ts       # Evolução do paciente
│   ├── useAuditLogs.ts              # Logs de auditoria
│   ├── useEventos.ts                # Eventos
│   ├── usePatientAnalytics.ts       # Analytics do paciente
│   ├── useSoapRecords.ts            # SOAP (prontuário)
│   ├── useUserProfile.ts            # Perfil de usuário
│   ├── useTarefas.ts                # Tarefas
│   ├── useStandardForms.ts          # Formulários padrão
│   ├── useOrganizations.ts          # Organizações
│   ├── useContasFinanceiras.ts      # Contas financeiras
│   ├── usePatientDocuments.ts       # Documentos do paciente
│   ├── useSessionPackages.ts        # Pacotes de sessões
│   ├── useMFASettings.ts            # MFA
│   ├── useNotificationPreferences.ts # Preferências de notificação
│   ├── useWaitlist.ts               # Lista de espera
│   ├── useLGPDConsents.ts           # Consentimentos LGPD
│   ├── useInvitations.ts            # Convites
│   ├── useQuests.ts                 # Gamification
│   ├── usePrescriptions.ts          # Prescrições
│   ├── useAppointmentData.ts        # Dados de agendamento
│   ├── useUsers.ts                  # Usuários
│   ├── useGamification.ts           # Gamificação
│   ├── usePagamentos.ts             # Pagamentos
│   ├── useDashboardStats.ts         # Estatísticas do dashboard
│   ├── useNotifications.ts          # Notificações
│   └── usePainMaps.ts               # Mapas de dor
│
├── lib/services/                    # Serviços usando Supabase
│   └── WhatsAppService.ts           # Integração WhatsApp
│
├── inngest/workflows/               # 13 workflows Inngest
│   ├── notifications.ts
│   ├── appointments.ts
│   ├── ai-insights.ts               # AI (OpenAI → Firebase AI)
│   ├── data-integrity.ts
│   ├── feedback.ts
│   ├── expiring-vouchers.ts
│   ├── cleanup.ts
│   ├── reactivation.ts
│   ├── weekly-summary.ts
│   ├── birthdays.ts
│   └── daily-reports.ts
│
└── integrations/
    └── supabase/
        ├── client.ts                # Cliente Supabase ativo
        └── types.ts                 # Tipos gerados

supabase/
└── functions/                       # 44 Edge Functions Supabase
    ├── api-appointments
    ├── api-patients
    ├── api-exercises
    ├── api-payments
    ├── webhook-stripe
    ├── webhook-whatsapp
    ├── webhook-clerk
    ├── ai-chat
    ├── ai-transcribe
    ├── ai-exercise-prescription
    ├── ai-treatment-assistant
    ├── schedule-notifications
    ├── send-notification
    ├── daily-metrics
    ├── backup-manager
    └── google-calendar-sync
```

---

## Plano de Migração Detalhado

---

## FASE 1: Infraestrutura e Configuração

**Duração Estimada**: 1-2 semanas
**Prioridade**: CRÍTICA
**Dependências**: Nenhuma

### 1.1 Configurar Cloud SQL para Google Cloud

**Objetivo**: Configurar instância Cloud SQL para migrar dados relacionais complexos

**Tarefas**:
- [ ] Criar instância Cloud SQL (PostgreSQL 14+)
- [ ] Configurar conexão segura (IP whitelist / Cloud SQL Proxy)
- [ ] Criar database `fisioflow_prod`
- [ ] Configurar backups automatizados
- [ ] Configurar replica de alta disponibilidade

**Comandos**:
```bash
# Usar gcloud ou Terraform
gcloud sql instances create fisioflow-prod \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-auto-increase \
  --availability-type=REGIONAL
```

### 1.2 Configurar Firestore para Dados NoSQL

**Objetivo**: Configurar Firestore para dados documentais e realtime

**Tarefas**:
- [ ] Configurar regras de segurança Firestore
- [ ] Configurar índices compostos
- [ ] Criar collections principais
- [ ] Configurar TTL para dados expiráveis

**Arquivos**:
- [firestore.rules](firestore.rules) - Já existe, revisar
- [firestore.indexes.json](firestore.indexes.json) - Já existe, revisar

### 1.3 Configurar Firebase Storage

**Objetivo**: Migrar todos os uploads para Firebase Storage

**Tarefas**:
- [ ] Configurar regras de segurança Storage
- [ ] Criar buckets separados (videos, documents, avatars)
- [ ] Configurar CDN
- [ ] Configurar transformações de imagem

**Arquivos**:
- [storage.rules](storage.rules) - Já existe, revisar

### 1.4 Configurar Remote Config e App Check

**Objetivo**: Substituir Vercel Edge Config e proteger APIs

**Tarefas**:
- [ ] Configurar Remote Config para feature flags
- [ ] Configurar App Check com reCAPTCHA v3
- [ ] Migrar configurações do Edge Config

---

## FASE 2: Migração de Autenticação

**Duração Estimada**: 2-3 semanas
**Prioridade**: CRÍTICA
**Dependências**: Fase 1

### 2.1 Migrar Contexto de Autenticação

**Status**: 70% completo (AuthContext usa Firebase, mas hooks usam Supabase)

**Arquivos a Migrar**:

| Arquivo | Descrição | Prioridade |
|---------|-----------|------------|
| [AuthContext.tsx](src/contexts/AuthContext.tsx) | Já Firebase ✅ | - |
| [useUserProfile.ts](src/hooks/useUserProfile.ts) | Supabase → Firebase | Alta |
| [useMFASettings.ts](src/hooks/useMFASettings.ts) | Supabase → Firebase | Alta |
| [useInvitations.ts](src/hooks/useInvitations.ts) | Supabase → Firebase | Média |

**Ações**:
```typescript
// ANTES (Supabase)
import { supabase } from '@/integrations/supabase/client';

// DEPOIS (Firebase)
import { auth, db } from '@/integrations/firebase/app';
import { doc, getDoc } from 'firebase/firestore';
```

### 2.2 Migrar Sessões e Tokens

**Tarefas**:
- [ ] Migrar refresh tokens (Supabase → Firebase)
- [ ] Implementar token refresh automático
- [ ] Migrar custom claims (roles, permissions)
- [ ] Implementar MFA com Firebase

### 2.3 Migrar Perfis de Usuário

**Tarefas**:
- [ ] Script de migração: `profiles` (Supabase) → `users` (Firestore)
- [ ] Migrar avatares para Firebase Storage
- [ ] Migrar configurações de notificação
- [ ] Migrar preferências do usuário

**Script de Migração**:
```typescript
// scripts/migrate-auth-to-firebase.ts
// Migrar usuários do Supabase Auth para Firebase Auth
// Migrar perfis do Supabase para Firestore
```

---

## FASE 3: Migração de Database

**Duração Estimada**: 4-6 semanas
**Prioridade**: CRÍTICA
**Dependências**: Fase 1, Fase 2

### 3.1 Migrar Dados Relacionais para Cloud SQL

**Tabelas a Migrar**:

| Tabela Supabase | Destino | Prioridade |
|-----------------|---------|------------|
| `patient_gamification` | Cloud SQL | Alta |
| `daily_quests` | Cloud SQL | Alta |
| `achievements` | Cloud SQL | Alta |
| `achievements_log` | Cloud SQL | Alta |
| `xp_transactions` | Cloud SQL | Alta |
| `shop_items` | Cloud SQL | Média |
| `user_inventory` | Cloud SQL | Média |
| `patient_surgeries` | Cloud SQL | Alta |
| `patient_goals` | Cloud SQL | Alta |
| `patient_pathologies` | Cloud SQL | Alta |
| `evolution_measurements` | Cloud SQL | Alta |
| `treatment_sessions` | Cloud SQL | Alta |
| `financial_transactions` | Cloud SQL | Alta |
| `event_registrations` | Cloud SQL | Alta |

**Script Existe**: [scripts/migrate-supabase-to-firebase.mjs](scripts/migrate-supabase-to-firebase.mjs) (atualizar)

### 3.2 Migrar Dados Documentais para Firestore

**Collections a Migrar**:

| Tabela Supabase | Collection Firestore | Prioridade |
|-----------------|---------------------|------------|
| `patients` | `patients` | Crítica |
| `appointments` | `appointments` | Crítica |
| `profiles` | `users` | Crítica |
| `organizations` | `organizations` | Alta |
| `exercises` | `exercises` | Alta |
| `prescriptions` | `prescriptions` | Alta |
| `soap_records` | `soap_records` | Alta |
| `pain_maps` | `pain_maps` | Média |
| `notifications` | `notifications` | Média |

### 3.3 Converter Queries SQL para Firestore Queries

**Hooks a Migrar** (20+):

| Hook | Query Type | Complexidade |
|------|------------|--------------|
| [usePatientEvolution.ts](src/hooks/usePatientEvolution.ts) | SQL complexo | Alta |
| [useAuditLogs.ts](src/hooks/useAuditLogs.ts) | SQL com joins | Alta |
| [useEventos.ts](src/hooks/useEventos.ts) | SQL agregado | Alta |
| [usePatientAnalytics.ts](src/hooks/usePatientAnalytics.ts) | Analytics SQL | Muito Alta |
| [useSoapRecords.ts](src/hooks/useSoapRecords.ts) | Simples | Média |
| [useStandardForms.ts](src/hooks/useStandardForms.ts) | Simples | Média |
| [useOrganizations.ts](src/hooks/useOrganizations.ts) | SQL com joins | Alta |
| [usePatientDocuments.ts](src/hooks/usePatientDocuments.ts) | Storage + SQL | Média |
| [useSessionPackages.ts](src/hooks/useSessionPackages.ts) | SQL complexo | Alta |
| [useGamification.ts](src/hooks/useGamification.ts) | SQL complexo | Muito Alta |
| [usePagamentos.ts](src/hooks/usePagamentos.ts) | SQL financeiro | Alta |
| [useDashboardStats.ts](src/hooks/useDashboardStats.ts) | Analytics | Alta |
| [usePainMaps.ts](src/hooks/usePainMaps.ts) | JSON + SQL | Média |

### 3.4 Implementar Realtime (Supabase Realtime → Firestore Realtime)

**Tarefas**:
- [ ] Converter `.on()` subscriptions para `onSnapshot()`
- [ ] Implementar presença online
- [ ] Implementar notificações push

---

## FASE 4: Migração de Storage

**Duração Estimada**: 1-2 semanas
**Prioridade**: ALTA
**Dependências**: Fase 1

### 4.1 Migrar Vercel Blob → Firebase Storage

**Arquivo**: [src/lib/storage/upload.ts](src/lib/storage/upload.ts)

**Estado Atual**:
```typescript
// HÍBRIDO: usa Vercel Blob para vídeos/imagens
export async function uploadToBlob(file: File, folder: string) {
  const newBlob = await upload(filename, file, {
    access: 'public',
    handleUploadUrl: '/api/upload', // Vercel API route
  });
  return newBlob.url;
}

export function getStorageStrategy(fileType: 'video' | 'image' | 'document') {
  if (fileType === 'video' || fileType === 'image') {
    return 'vercel-blob'; // ← MIGRAR
  }
  return 'firebase';
}
```

**Ações**:
- [ ] Remover dependência `@vercel/blob`
- [ ] Migrar todos os uploads para Firebase Storage
- [ ] Script de migração de arquivos existentes
- [ ] Atualizar URLs no banco de dados

### 4.2 Migrar Supabase Storage → Firebase Storage

**Buckets a Migrar**:

| Bucket Supabase | Bucket Firebase | Conteúdo |
|-----------------|-----------------|----------|
| `exerciseVideos` | `exercise-videos` | Vídeos de exercícios |
| `patientDocuments` | `patient-documents` | Documentos médicos |
| `medicalRequests` | `medical-requests` | Exames e laudos |
| `avatars` | `avatars` | Fotos de perfil |

**Script de Migração**:
```typescript
// scripts/migrate-storage-to-firebase.ts
// Listar todos os arquivos do Supabase Storage
// Download e upload para Firebase Storage
// Atualizar URLs nas collections
```

### 4.3 Configurar Transformações de Imagem

**Usar Firebase Image Resizer ou Cloud Functions**:
- [ ] Gerar thumbnails automaticamente
- [ ] Otimizar imagens no upload
- [ ] Configurar formato WebP/AVIF

---

## FASE 5: Migração de Funções

**Duração Estimada**: 4-5 semanas
**Prioridade**: ALTA
**Dependências**: Fase 1, Fase 3

### 5.1 Mapear Funções Supabase → Firebase Functions

**44 Funções Supabase a Migrar**:

| Função Supabase | Função Firebase | Status | Prioridade |
|-----------------|-----------------|--------|------------|
| `api-appointments` | `appointmentsApi` | ✅ Existe | - |
| `api-patients` | `patientsApi` | ✅ Existe | - |
| `api-exercises` | `exercisesApi` | ✅ Existe | - |
| `api-payments` | `financialApi` | ✅ Existe | - |
| `api-assessments` | `clinicalApi` | ✅ Existe | - |
| `webhook-stripe` | `stripeWebhook` | ❌ Criar | Alta |
| `webhook-whatsapp` | `whatsappWebhook` | ❌ Criar | Alta |
| `webhook-clerk` | (remover) | N/A | - |
| `ai-chat` | `aiChat` | ⚠️ Parcial | Alta |
| `ai-transcribe` | `aiTranscribe` | ❌ Criar | Média |
| `ai-exercise-prescription` | `aiExercisePrescription` | ❌ Criar | Alta |
| `ai-treatment-assistant` | `aiTreatmentAssistant` | ❌ Criar | Alta |
| `schedule-notifications` | `scheduleNotifications` | ❌ Criar | Alta |
| `send-notification` | `sendNotification` | ❌ Criar | Alta |
| `daily-metrics` | `dailyMetrics` | ❌ Criar | Média |
| `backup-manager` | `backupManager` | ❌ Criar | Média |
| `google-calendar-sync` | `googleCalendarSync` | ❌ Criar | Média |

**16 Firebase Functions já implementadas** (em `functions/src/`):
- ✅ Appointments
- ✅ Patients
- ✅ Exercises
- ✅ Payments/Financial
- ✅ Assessments/Clinical
- ✅ Communications
- ✅ Calendar
- ✅ Telemedicine
- ✅ LGPD

### 5.2 Migrar Vercel API Routes → Firebase Functions

**Vercel Cron Jobs (6)**:

| Vercel Cron | Firebase Scheduler | Status | Prioridade |
|-------------|-------------------|--------|------------|
| `/api/crons/daily-reports` | Cloud Scheduler | ❌ Criar | Alta |
| `/api/crons/expiring-vouchers` | Cloud Scheduler | ❌ Criar | Alta |
| `/api/crons/birthdays` | Cloud Scheduler | ❌ Criar | Média |
| `/api/crons/weekly-summary` | Cloud Scheduler | ❌ Criar | Média |
| `/api/crons/cleanup` | Cloud Scheduler | ❌ Criar | Média |
| `/api/crons/data-integrity` | Cloud Scheduler | ❌ Criar | Alta |

**Config Vercel**: [vercel.json](vercel.json:7-31)
```json
"crons": [
  { "path": "/api/crons/daily-reports", "schedule": "0 8 * * *" },
  { "path": "/api/crons/expiring-vouchers", "schedule": "0 10 * * *" },
  { "path": "/api/crons/birthdays", "schedule": "0 9 * * *" },
  { "path": "/api/crons/weekly-summary", "schedule": "0 9 * * 1" },
  { "path": "/api/crons/cleanup", "schedule": "0 3 * * *" },
  { "path": "/api/crons/data-integrity", "schedule": "0 1 * * *" }
]
```

### 5.3 Migrar Webhooks

**Tarefas**:
- [ ] Criar endpoints de webhook no Firebase Functions
- [ ] Implementar verificação de assinatura (Stripe)
- [ ] Implementar rate limiting
- [ ] Implementar retry logic

---

## FASE 6: Migração de Workflows (Inngest → Cloud Scheduler/PubSub)

**Duração Estimada**: 3-4 semanas
**Prioridade**: MÉDIA
**Dependências**: Fase 5

### 6.1 Mapear Workflows Inngest

**13 Workflows Ativos**:

| Workflow Inngest | Destino | Complexidade | Prioridade |
|------------------|---------|--------------|------------|
| [notifications.ts](src/inngest/workflows/notifications.ts) | PubSub + Cloud Tasks | Alta | Alta |
| [appointments.ts](src/inngest/workflows/appointments.ts) | PubSub + Cloud Tasks | Alta | Alta |
| [ai-insights.ts](src/inngest/workflows/ai-insights.ts) | PubSub + Vertex AI | Alta | Alta |
| [data-integrity.ts](src/inngest/workflows/data-integrity.ts) | Cloud Scheduler | Média | Média |
| [feedback.ts](src/inngest/workflows/feedback.ts) | PubSub | Baixa | Média |
| [expiring-vouchers.ts](src/inngest/workflows/expiring-vouchers.ts) | Cloud Scheduler | Média | Alta |
| [cleanup.ts](src/inngest/workflows/cleanup.ts) | Cloud Scheduler | Baixa | Média |
| [reactivation.ts](src/inngest/workflows/reactivation.ts) | Cloud Scheduler | Média | Média |
| [weekly-summary.ts](src/inngest/workflows/weekly-summary.ts) | Cloud Scheduler | Média | Média |
| [birthdays.ts](src/inngest/workflows/birthdays.ts) | Cloud Scheduler | Baixa | Baixa |
| [daily-reports.ts](src/inngest/workflows/daily-reports.ts) | Cloud Scheduler | Alta | Alta |
| [email.ts](src/inngest/workflows/email.ts) | PubSub | Baixa | Alta |
| [whatsapp.ts](src/inngest/workflows/whatsapp.ts) | PubSub | Média | Alta |

---

## FASE 7: Migração de Cache e Feature Flags

**Duração Estimada**: 1-2 semanas
**Prioridade**: MÉDIA
**Dependências**: Fase 1

### 7.1 Migrar Vercel KV (Redis) → Firestore + Redis

**Arquivo**: [src/lib/cache/KVCacheService.ts](src/lib/cache/KVCacheService.ts)

**Funcionalidades a Migrar**:
- [x] `getCache()` / `setCache()` / `deleteCache()`
- [x] `invalidatePattern()` - pattern matching
- [x] `rateLimit()` - rate limiting
- [x] Classes de cache: `PatientCache`, `AppointmentCache`, `ExerciseCache`, `ProtocolCache`
- [x] `SessionCache` - sessões de usuário

**Opções**:
1. **Firestore + Cliente Cache** (mais simples)
2. **Redis Memorystore** (mais performático)
3. **ElastiCache** (compatível com KV)

### 7.2 Migrar Vercel Edge Config → Firebase Remote Config

**Arquivo**: `src/lib/featureFlags/edgeConfig.ts`

**Ações**:
- [ ] Configurar Remote Config no Firebase Console
- [ ] Migrar feature flags existentes
- [ ] Implementar cache de feature flags
- [ ] Implementar A/B testing

---

## FASE 8: Migração de Hosting

**Duração Estimada**: 1 semana
**Prioridade**: BAIXA
**Dependências**: Fases anteriores

### 8.1 Migrar Vercel Hosting → Firebase Hosting

**Estado Atual**:
- [firebase.json](firebase.json) configurado com rewrites
- Build configurado
- Deploy script existe: `pnpm run deploy:web`

**Tarefas**:
- [ ] Remover configuração Vercel
- [ ] Ativar Firebase Hosting
- [ ] Configurar domínio customizado
- [ ] Configurar CDN
- [ ] Migrar ambientes (preview/production)

### 8.2 Configurar Headers e Cache

**Headers do Vercel** ([vercel.json](vercel.json:46-252)):
- Cache-Control para assets estáticos
- Headers de segurança (CSP, X-Frame-Options)
- Service Worker headers

**Converter para Firebase Hosting**:
```json
{
  "hosting": {
    "headers": [
      {
        "source": "/sw.js",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
        ]
      }
    ]
  }
}
```

---

## FASE 9: Limpeza e Remoção de Dependências

**Duração Estimada**: 1 semana
**Prioridade**: BAIXA
**Dependências**: Todas as fases anteriores

### 9.1 Remover Dependências do Supabase

**Dependências a Remover** ([package.json](package.json)):
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.91.1",  // ← REMOVER
    "supabase": "^2.72.8"                 // ← REMOVER
  }
}
```

**Comandos**:
```bash
pnpm remove @supabase/supabase-js supabase
rm -rf src/integrations/supabase/
rm -rf supabase/
rm -rf .supabase/
```

### 9.2 Remover Dependências do Vercel

**Dependências a Remover** ([package.json](package.json)):
```json
{
  "dependencies": {
    "@vercel/analytics": "^1.6.1",        // ← REMOVER
    "@vercel/blob": "^2.0.0",             // ← REMOVER
    "@vercel/edge-config": "^1.4.3",      // ← REMOVER
    "@vercel/kv": "^3.0.0",               // ← REMOVER
    "@vercel/speed-insights": "^1.3.1"    // ← REMOVER
  },
  "devDependencies": {
    "vercel": "^50.1.6"                   // ← REMOVER (opcional)
  }
}
```

**Comandos**:
```bash
pnpm remove @vercel/analytics @vercel/blob @vercel/edge-config @vercel/kv @vercel/speed-insights
rm vercel.json
rm -rf .vercel/
```

### 9.3 Remover Inngest

**Dependências a Remover** ([package.json](package.json)):
```json
{
  "dependencies": {
    "inngest": "^3.49.1"                  // ← REMOVER
  }
}
```

**Comandos**:
```bash
pnpm remove inngest
rm -rf src/inngest/
rm inngest.setup.sh
```

---

## Resumo das Fases

| Fase | Descrição | Duração | Dependências | Prioridade |
|------|-----------|---------|--------------|------------|
| **1** | Infraestrutura e Configuração | 1-2 sem | - | CRÍTICA |
| **2** | Autenticação (Supabase → Firebase) | 2-3 sem | 1 | CRÍTICA |
| **3** | Database (Supabase → Firestore/Cloud SQL) | 4-6 sem | 1, 2 | CRÍTICA |
| **4** | Storage (Blob/Supabase → Firebase) | 1-2 sem | 1 | ALTA |
| **5** | Funções (Supabase/Vercel → Firebase) | 4-5 sem | 1, 3 | ALTA |
| **6** | Workflows (Inngest → Cloud Scheduler) | 3-4 sem | 5 | MÉDIA |
| **7** | Cache/Feature Flags (Vercel → Firebase) | 1-2 sem | 1 | MÉDIA |
| **8** | Hosting (Vercel → Firebase) | 1 sem | - | BAIXA |
| **9** | Limpeza e Remoção | 1 sem | Todas | BAIXA |

**Total Estimado**: 18-27 semanas (4-7 meses)

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Perda de dados durante migração** | Baixa | Crítico | Backup completo antes de cada fase; testar em staging |
| **Downtime durante transição** | Média | Alto | Migração progressiva com feature flags; rollback planejado |
| **Incompatibilidade de queries SQL → Firestore** | Alta | Alto | Reescrever queries complexas; usar Cloud SQL para casos complexos |
| **Custos aumentados no Google Cloud** | Média | Médio | Monitorar custos; otimizar queries; usar quotas |
| **Problemas de performance no Firestore** | Média | Médio | Configurar índices corretos; usar cache distribuído |
| **Dependências circulares durante migração** | Alta | Médio | Planejar ordem de migração; usar abstração |
| **Integrações de terceiros (Stripe, WhatsApp)** | Baixa | Médio | Testar webhooks; atualizar endpoints |

---

## Próximos Passos Imediatos

### Esta Semana

1. **Setup Cloud SQL**:
   ```bash
   gcloud sql instances create fisioflow-prod --database-version=POSTGRES_14
   ```

2. **Testar migração de um hook simples**:
   ```bash
   # Escolher useSoapRecords.ts como piloto
   # Criar versão Firebase
   # Testar lado a lado
   ```

3. **Configurar Remote Config**:
   ```bash
   # Migrar feature flags do Edge Config
   # Implementar getFeatureFlags()
   ```

### Próximas 2 Semanas

1. **Migrar Auth completamente**:
   - Finalizar uso de Firebase Auth em todos os hooks
   - Testar MFA
   - Testar refresh tokens

2. **Migrar hooks críticos**:
   - `usePatientEvolution.ts`
   - `useDashboardStats.ts`
   - `usePagamentos.ts`

3. **Criar primeira Firebase Function**:
   - `dailyReports` (substituir cron Vercel)

---

## Documentação Relacionada

- [FIREBASE_AI_ROADMAP.md](docs/FIREBASE_AI_ROADMAP.md) - Planejamento de IA com Firebase
- [src/integrations/firebase/functions.ts](src/integrations/firebase/functions.ts) - APIs Firebase implementadas
- [scripts/migrate-supabase-to-firebase.mjs](scripts/migrate-supabase-to-firebase.mjs) - Script de migração de dados
- [firebase.json](firebase.json) - Configuração Firebase

---

**Documento versão 1.0**
**Data de criação**: 25 de Janeiro de 2026
**Última atualização**: 25 de Janeiro de 2026
