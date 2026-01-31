# FisioFlow - Arquitetura Backend Completa

> **Status**: Produção
> **Versão**: 2.0.0
> **Data**: Janeiro 2026
> **Projeto Firebase**: `fisioflow-migration`
> **Região**: `southamerica-east1`

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Infraestrutura Google Cloud](#infraestrutura-google-cloud)
3. [Firebase Configuration](#firebase-configuration)
4. [Cloud Functions](#cloud-functions)
5. [Cloud SQL - PostgreSQL](#cloud-sql---postgresql)
6. [Firestore Database](#firestore-database)
7. [Firebase Storage](#firebase-storage)
8. [Autenticação & Autorização](#autenticação--autorização)
9. [Integrações Externas](#integrações-externas)
10. [Middleware & Segurança](#middleware--segurança)
11. [Real-time & Events](#real-time--events)
12. [AI/ML Features](#aiml-features)
13. [Jobs Agendados](#jobs-agendados)
14. [Monitoramento & Observabilidade](#monitoramento--observabilidade)
15. [LGPD & Compliance](#lgpd--compliance)

---

## Visão Geral

O FisioFlow é um sistema completo de gestão para clínicas de fisioterapia, construído com arquitetura serverless na Google Cloud Platform.

### Stack Tecnológico

| Componente | Tecnologia | Versão |
|------------|-----------|--------|
| Runtime | Node.js | 20 |
| Linguagem | TypeScript | 5.7.2 |
| Database Primária | Cloud SQL (PostgreSQL) | - |
| Database em Tempo Real | Firestore | - |
| Storage | Firebase Storage | - |
| Autenticação | Firebase Auth | - |
| Hosting | Firebase Hosting | - |
| Funções | Firebase Functions (Gen 2) | 7.0.3 |
| Real-time | Ably | 2.17.0 |
| AI/ML | Google Vertex AI (Gemini) | 1.5.0 |
| Pagamentos | Stripe | 17.3.1 |
| SMS | Twilio | 5.3.5 |
| Error Tracking | Sentry | 10.38.0 |

### Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTE (React/Next.js)                      │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                    Firebase Auth (JWT)
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Firebase      │   │ Cloud         │   │ Cloud         │
│ Functions     │   │ SQL           │   │ Storage       │
│ (Gen 2)       │◄──┤ (PostgreSQL)  │   │ (Videos/Docs) │
│ southam-      │   │ RLS Enabled   │   │               │
│ east1         │   │               │   │               │
└───────┬───────┘   └───────────────┘   └───────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    INTEGRAÇÕES                                │
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────┤
│ Ably    │ Vertex  │ Stripe  │ WhatsApp│ Twilio  │ Sentry  │
│ Realtime│ AI      │ Payments│ API     │ SMS     │ Errors  │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

---

## Infraestrutura Google Cloud

### Serviços Utilizados

| Serviço | Uso | Configuração |
|---------|-----|-------------|
| **Firebase Auth** | Autenticação de usuários | Email/Senha, MFA TOTP |
| **Cloud Firestore** | Database em tempo real, cache, sessões | Native mode |
| **Cloud Functions** | Backend serverless | Node.js 20, Gen 2 |
| **Cloud SQL** | Database relacional principal | PostgreSQL, southamerica-east1 |
| **Firebase Storage** | Armazenamento de arquivos | Videos, PDFs, Imagens |
| **Firebase Hosting** | Hosting do frontend | SPA com rewrites |
| **Cloud Secret Manager** | Secrets management | Integração via Firebase params |

### IP do Cloud SQL

```
DB_HOST_IP_PUBLIC: 34.68.209.73
Porta: 5432
SSL: Ativado (rejectUnauthorized: false para certificados auto-assinados)
```

---

## Firebase Configuration

### firebase.json

```json
{
  "functions": {
    "source": "functions",
    "codebase": "default",
    "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"],
    "env": [
      {
        "variables": {
          "DB_HOST": "34.68.209.73",
          "DB_SOCKET_PATH": "/cloudsql",
          "ABLY_API_KEY": "zmqcyQ.hjud3A:UFQTNkXMSS17eJawRzhNP0cg-qBhn6Rp3vdJkib-c30",
          "NODE_ENV": "production",
          "WHATSAPP_BUSINESS_ACCOUNT_ID": "806225345331804",
          "WHATSAPP_PHONE_NUMBER": "+551158749885"
        }
      }
    ]
  },
  "hosting": {
    "public": "dist",
    "headers": [...],  // Security headers
    "rewrites": [{"source": "**", "destination": "/index.html"}]
  },
  "storage": {
    "rules": "storage.rules"
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true }
  }
}
```

### CORS Origins Permitidas

- `https://moocafisio.com.br`
- `https://fisioflow-migration.web.app`
- `https://fisioflow-migration.firebaseapp.com`
- `http://localhost:5173` (dev)
- `http://localhost:5000` (dev)

---

## Cloud Functions

### Estrutura de Diretórios

```
functions/src/
├── index.ts                    # Entry point, exportações de todas as funções
├── init.ts                     # Inicialização Firebase Admin, Cloud SQL pool
├── api/                        # API Callable Functions
│   ├── patients.ts            # CRUD de pacientes
│   ├── appointments.ts        # Gestão de agendamentos
│   ├── exercises.ts           # Biblioteca de exercícios
│   ├── assessments.ts         # Avaliações clínicas
│   ├── profile.ts             # Perfis de usuário
│   ├── financial.ts           # Transações financeiras
│   ├── payments.ts            # Pagamentos
│   ├── medical-records.ts     # Prontuários
│   ├── upload.ts              # Upload de arquivos
│   ├── users.ts               # Gestão de usuários
│   ├── patient-stats.ts       # Estatísticas de pacientes
│   ├── health.ts              # Health check
│   └── evaluate.ts            # API HTTP de avaliações
├── middleware/                 # Middlewares
│   ├── auth.ts                # Autorização, RLS context
│   ├── app-check.ts           # Firebase App Check
│   ├── rate-limit.ts          # Rate limiting
│   ├── audit-log.ts           # Audit logging
│   ├── api-key.ts             # API key validation
│   └── sentry-error-handler.ts# Sentry error tracking
├── ai/                         # AI/ML Functions
│   ├── exercise-suggestion.ts # Recomendação de exercícios (Gemini)
│   ├── soap-generation.ts     # Geração de SOAP (AI)
│   ├── clinical-analysis.ts   # Análise clínica (AI)
│   ├── movement-analysis.ts   # Análise de movimento (AI)
│   └── suggestions.ts         # Sugestões gerais
├── crons/                      # Scheduled Functions
│   ├── reminders.ts           # Lembretes diários
│   ├── daily-reports.ts       # Relatórios diários e semanais
│   └── additional-crons.ts    # Vouchers, birthdays, cleanup
├── workflows/                  # Workflows (substituem Inngest)
│   ├── appointments.ts        # Workflow de agendamentos
│   ├── notifications.ts       # Workflow de notificações
│   ├── reactivation.ts        # Reativação de pacientes
│   └── types.ts               # Tipos compartilhados
├── realtime/                   # Real-time
│   └── publisher.ts           # Publicador Ably
├── communications/             # Comunicações
│   ├── whatsapp.ts            # WhatsApp Business API
│   └── email.ts               # Email (Nodemailer/SES)
├── stripe/                     # Stripe Integration
│   ├── vouchers.ts            # Gestão de vouchers
│   └── webhook.ts             # Stripe webhooks
├── auth/                       # Auth Triggers
│   └── user-created.ts        # On user created
├── lgpd/                       # LGPD Compliance
│   ├── delete-account.ts      # Direito ao esquecimento
│   ├── export-data.ts         # Direito de portabilidade
│   └── consent.ts             # Gestão de consentimentos
├── medical/                    # Medical
│   └── records.ts             # Registros médicos
├── integrations/               # Integrações
│   ├── telemedicine.ts        # Telemedicina
│   └── calendar.ts            # Google Calendar
├── lib/                        # Bibliotecas
│   ├── logger.ts              # Structured logging
│   ├── sentry.ts              # Sentry init
│   ├── cloud-monitoring.ts    # Cloud Monitoring
│   ├── cloud-trace.ts         # Cloud Trace
│   ├── metrics.ts             # Custom metrics
│   └── migrations/            # Database migrations
├── types/                      # TypeScript Types
│   └── models.ts              # Domain models
├── migrations/                 # Migrations
│   └── create-performance-indexes.ts
└── admin/                      # Admin Functions
    └── create-user.ts         # Criação de admin
```

### Funções Exportadas

#### API Functions (Callable)

| Função | Descrição | Arquivo |
|--------|----------|--------|
| `listPatients` | Lista pacientes com filtros | `api/patients.ts` |
| `createPatient` | Cria novo paciente | `api/patients.ts` |
| `updatePatient` | Atualiza paciente | `api/patients.ts` |
| `getPatient` | Busca paciente por ID | `api/patients.ts` |
| `deletePatient` | Soft delete de paciente | `api/patients.ts` |
| `listAppointments` | Lista agendamentos | `api/appointments.ts` |
| `createAppointment` | Cria agendamento | `api/appointments.ts` |
| `updateAppointment` | Atualiza agendamento | `api/appointments.ts` |
| `getAppointment` | Busca agendamento | `api/appointments.ts` |
| `cancelAppointment` | Cancela agendamento | `api/appointments.ts` |
| `checkTimeConflict` | Verifica conflito de horário | `api/appointments.ts` |
| `listExercises` | Lista exercícios | `api/exercises.ts` |
| `getExercise` | Busca exercício | `api/exercises.ts` |
| `searchSimilarExercises` | Busca exercícios similares | `api/exercises.ts` |
| `getExerciseCategories` | Lista categorias | `api/exercises.ts` |
| `getPrescribedExercises` | Exercícios prescritos | `api/exercises.ts` |
| `logExercise` | Registra execução | `api/exercises.ts` |
| `createExercise` | Cria exercício | `api/exercises.ts` |
| `updateExercise` | Atualiza exercício | `api/exercises.ts` |
| `deleteExercise` | Deleta exercício | `api/exercises.ts` |
| `mergeExercises` | Fundiona exercícios duplicados | `api/exercises.ts` |
| `listAssessments` | Lista avaliações | `api/assessments.ts` |
| `getAssessment` | Busca avaliação | `api/assessments.ts` |
| `createAssessment` | Cria avaliação | `api/assessments.ts` |
| `updateAssessment` | Atualiza avaliação | `api/assessments.ts` |
| `listAssessmentTemplates` | Lista templates | `api/assessments.ts` |
| `getAssessmentTemplate` | Busca template | `api/assessments.ts` |
| `getProfile` | Busca profile | `api/profile.ts` |
| `updateProfile` | Atualiza profile | `api/profile.ts` |
| `getPatientStats` | Estatísticas do paciente | `api/patient-stats.ts` |
| `listPayments` | Lista pagamentos | `api/payments.ts` |
| `createPayment` | Cria pagamento | `api/payments.ts` |
| `listTransactions` | Lista transações | `api/financial.ts` |
| `createTransaction` | Cria transação | `api/financial.ts` |
| `updateTransaction` | Atualiza transação | `api/financial.ts` |
| `deleteTransaction` | Deleta transação | `api/financial.ts` |
| `findTransactionByAppointmentId` | Busca transação por agendamento | `api/financial.ts` |
| `getEventReport` | Relatório de eventos | `api/financial.ts` |
| `getPatientRecords` | Busca prontuário | `api/medical-records.ts` |
| `getPainRecords` | Busca registros de dor | `api/medical-records.ts` |
| `savePainRecord` | Salva registro de dor | `api/medical-records.ts` |
| `createMedicalRecord` | Cria registro médico | `api/medical-records.ts` |
| `updateMedicalRecord` | Atualiza registro médico | `api/medical-records.ts` |
| `listTreatmentSessions` | Lista sessões | `api/medical-records.ts` |
| `createTreatmentSession` | Cria sessão | `api/medical-records.ts` |
| `updateTreatmentSession` | Atualiza sessão | `api/medical-records.ts` |
| `generateUploadToken` | Gera token de upload | `api/upload.ts` |
| `confirmUpload` | Confirma upload | `api/upload.ts` |
| `deleteStorageFile` | Deleta arquivo | `api/upload.ts` |
| `listUserFiles` | Lista arquivos | `api/upload.ts` |
| `listUsers` | Lista usuários | `api/users.ts` |
| `updateUserRole` | Atualiza role | `api/users.ts` |

#### AI Functions

| Função | Descrição | Modelo |
|--------|----------|--------|
| `aiExerciseSuggestion` | Recomendação de exercícios | Gemini 2.5 Flash-Lite |
| `aiSoapGeneration` | Geração de SOAP | Gemini AI |
| `aiClinicalAnalysis` | Análise clínica | Gemini AI |
| `aiMovementAnalysis` | Análise de movimento | Gemini AI |

#### Scheduled Functions (Cron)

| Função | Schedule | Descrição |
|--------|----------|-----------|
| `dailyReminders` | `every day 08:00` | Lembretes diários |
| `dailyReports` | `every day 23:00` | Relatórios diários |
| `weeklySummary` | `every monday 08:00` | Resumo semanal |
| `expiringVouchers` | `every day 10:00` | Vouchers expirando |
| `birthdays` | `every day 09:00` | Aniversariantes do dia |
| `cleanup` | `every sunday 03:00` | Limpeza de dados |
| `dataIntegrity` | `every day 04:00` | Verificação de integridade |

#### Background Triggers

| Trigger | Evento | Descrição |
|---------|--------|-----------|
| `onPatientCreated` | `patients/{patientId}` - onCreate | Cria resumo financeiro |
| `onAppointmentCreated` | `appointments/{appointmentId}` - onCreate | Publica no Ably |
| `onAppointmentUpdated` | `appointments/{appointmentId}` - onWrite | Publica no Ably |
| `onUserCreated` | `auth.user().onCreate` | Cria profile no SQL |

#### Workflow Functions

| Função | Descrição |
|--------|----------|
| `sendNotification` | Envia notificação |
| `sendNotificationBatch` | Envio em lote |
| `processNotificationQueue` | Processa fila de notificações |
| `emailWebhook` | Webhook de email |
| `appointmentReminders` | Lembretes de agendamento |
| `onAppointmentCreatedWorkflow` | Workflow ao criar agendamento |
| `onAppointmentUpdatedWorkflow` | Workflow ao atualizar agendamento |
| `patientReactivation` | Reativação de pacientes |

#### Communication Functions

| Função | Descrição |
|--------|----------|
| `sendWhatsAppAppointmentConfirmation` | Confirmação via WhatsApp |
| `sendWhatsAppAppointmentReminder` | Lembrete via WhatsApp |
| `sendWhatsAppWelcome` | Mensagem de boas-vindas |
| `sendWhatsAppCustomMessage` | Mensagem personalizada |
| `sendWhatsAppExerciseAssigned` | Notificação de exercício |
| `testWhatsAppMessage` | Teste de envio |
| `testWhatsAppTemplate` | Teste de template |
| `getWhatsAppHistory` | Histórico de mensagens |

#### Admin/Utility Functions

| Função | Descrição |
|--------|----------|
| `createAdminUser` | Cria usuário admin |
| `runMigration` | Executa migração |
| `runMigrationHttp` | Executa migração via HTTP |
| `createPerformanceIndexes` | Cria índices de performance |
| `setupMonitoring` | Configura monitoramento |
| `healthCheck` | Health check endpoint |

---

## Cloud SQL - PostgreSQL

### Tabelas Principais

#### Tabela: `organizations`

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  address JSONB,
  settings JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Tabela: `profiles`

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,  -- Firebase Auth UID
  organization_id UUID REFERENCES organizations(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL,  -- admin, fisioterapeuta, estagiario, paciente
  crefito TEXT,
  specialties TEXT[],
  bio TEXT,
  birth_date DATE,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  email_verified BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Tabela: `patients`

```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  cpf TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  gender TEXT,
  address JSONB,
  emergency_contact JSONB,
  medical_history TEXT,
  main_condition TEXT,
  status TEXT DEFAULT 'Inicial',  -- Inicial, Em_tratamento, Alta, Inativo
  progress INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  incomplete_registration BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Tabela: `appointments`

```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  patient_id UUID REFERENCES patients(id),
  professional_id UUID REFERENCES profiles(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration INTEGER DEFAULT 60,  -- minutos
  status TEXT DEFAULT 'agendado',  -- agendado, confirmado, concluido, cancelado, falta
  type TEXT,  -- avaliacao, follow_up, alta
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Tabela: `treatment_sessions`

```sql
CREATE TABLE treatment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  patient_id UUID REFERENCES patients(id),
  therapist_id UUID REFERENCES profiles(id),
  appointment_id UUID REFERENCES appointments(id),
  pain_level_before INTEGER CHECK (pain_level_before BETWEEN 0 AND 10),
  pain_level_after INTEGER CHECK (pain_level_after BETWEEN 0 AND 10),
  observations TEXT,
  evolution TEXT,
  next_session_goals TEXT,
  session_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Tabela: `pain_records`

```sql
CREATE TABLE pain_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  patient_id UUID REFERENCES patients(id),
  created_by UUID REFERENCES profiles(id),
  pain_level INTEGER NOT NULL CHECK (pain_level BETWEEN 0 AND 10),
  pain_type TEXT,
  body_part TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Tabela: `patient_financial_summaries`

```sql
CREATE TABLE patient_financial_summaries (
  patient_id UUID PRIMARY KEY REFERENCES patients(id),
  organization_id UUID REFERENCES organizations(id),
  total_paid_cents BIGINT DEFAULT 0,
  individual_sessions_paid INTEGER DEFAULT 0,
  package_sessions_total INTEGER DEFAULT 0,
  package_sessions_used INTEGER DEFAULT 0,
  package_sessions_available INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Tabela: `transactions`

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES profiles(id),
  tipo TEXT NOT NULL,  -- receita, despesa
  descricao TEXT,
  valor NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pendente',  -- pendente, confirmado, cancelado
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Tabela: `whatsapp_messages`

```sql
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  patient_id UUID REFERENCES patients(id),
  from_phone TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,  -- text, template
  template_name TEXT,
  message_id TEXT,
  status TEXT DEFAULT 'sent',  -- sent, delivered, read, failed
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabelas de Suporte

#### Tabela: `notification_queue`

```sql
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,  -- email, sms, push, whatsapp
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 5,  -- 1=highest, 10=lowest
  title TEXT,
  body TEXT,
  data JSONB,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Tabela: `feature_flags`

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  allowed_users UUID[],
  allowed_organizations UUID[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Tabela: `background_jobs`

```sql
CREATE TABLE background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  payload JSONB,
  result JSONB,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Row Level Security (RLS)

Todas as tabelas possuem RLS habilitado para isolamento multi-tenant:

```sql
-- Exemplo de política RLS
CREATE POLICY "Users can see their own organization data"
ON patients FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  )
);
```

### Funções SQL Úteis

```sql
-- Verificar se feature flag está ativa
check_feature_flag(feature_name TEXT, user_id UUID) RETURNS BOOLEAN

-- Enfileirar notificação
enqueue_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB,
  p_scheduled_for TIMESTAMPTZ
) RETURNS UUID

-- Configurar contexto RLS
SELECT set_config('app.organization_id', $1, true)
```

---

## Firestore Database

### Coleções Principais

| Coleção | Descrição | Uso |
|---------|-----------|-----|
| `patients` | Dados de pacientes | Cache, sincronização |
| `appointments` | Agendamentos | Cache, sincronização |
| `exercises` | Biblioteca de exercícios | Principal |
| `evaluations` | Avaliações clínicas | Principal |
| `evolutions` | Evoluções/SOAP | Principal |
| `profiles` | Perfis de usuário | Sincronização com SQL |
| `users` | Dados do usuário auth | Complemento ao Auth |
| `notifications` | Push notifications | FCM |
| `audit_logs` | Logs de auditoria | Compliance |
| `settings` | Configurações do sistema | Global |
| `organizations` | Organizações | Multi-tenant |
| `onboarding_progress` | Progresso de onboarding | UX |
| `user_roles` | Roles customizadas | RBAC |
| `ai_usage_records` | Registro de uso de AI | Billing/Monitoring |
| `patient_financial_summaries` | Resumo financeiro | Cache |
| `soap_records` | Registros SOAP | Subcoleção de patients |
| `whatsapp_messages` | Mensagens WhatsApp | Cache |

### Índices Compostos

```json
{
  "indexes": [
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "user_id", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### Subcoleções

- `patients/{patientId}/soap_records` - Registros SOAP do paciente
- `patients/{patientId}/pain_records` - Registros de dor
- `patients/{patientId}/exercises` - Exercícios prescritos

---

## Firebase Storage

### Estrutura de Buckets

```
gs://fisioflow-migration.appspot.com/
├── users/
│   └── {userId}/
│       └── avatars/
│           └── {filename}
├── patients/
│   └── {patientId}/
│       ├── evolutions/
│       │   └── {evolutionId}/
│       │       └── {filename}
│       └── documents/
│           └── {documentId}/
│               └── {filename}
├── exercises/
│   └── {exerciseId}/
│       └── {filename}  (videos, imagens)
├── reports/
│   └── {reportId}/
│       └── {filename}
├── backups/
│   └── {filename}
├── temp/
│   └── {userId}/
│       └── {filename}  (uploads temporários)
└── public/
    └── {filename}  (assets públicos)
```

### Regras de Segurança

- **Tamanho máximo**: 10MB por arquivo
- **Tipos permitidos**: `image/*`, `application/pdf`, `video/mp4`, `video/quicktime`
- **Acesso**: Baseado em roles e ownership

---

## Autenticação & Autorização

### Firebase Auth

- **Provider**: Email/Senha
- **MFA**: TOTP (Google Authenticator)
- **Custom Claims**: Role no token
- **Session Management**: Firebase Auth sessions

### Roles do Sistema

| Role | Descrição | Permissões |
|------|-----------|------------|
| `admin` | Administrador do sistema | Acesso total |
| `fisioterapeuta` | Fisioterapeuta | Gestão de pacientes, agendamentos |
| `estagiario` | Estagiário | Acesso limitado |
| `paciente` | Paciente | Acesso aos próprios dados |
| `recepcionista` | Recepcionista | Agendamentos, recepção |

### Middleware de Autenticação

```typescript
// Contexto de autenticação
interface AuthContext {
  userId: string;        // Firebase Auth UID
  organizationId: string; // ID da organização
  role: string;           // Papel do usuário
  email: string;          // Email
  profileId: string;      // ID do profile no SQL
}

// Uso em Cloud Functions
export const myFunction = onCall(async (request) => {
  const auth = await authorizeRequest(request.auth.token);
  // auth.organizationId, auth.role, etc.
});
```

### App Check

Proteção contra abuso de APIs usando Firebase App Check.

### Rate Limiting

```typescript
const RATE_LIMITS = {
  callable: { max: 100, window: 60000 },    // 100/minuto
  http: { max: 200, window: 60000 },        // 200/minuto
  ai: { max: 20, window: 3600000 },         // 20/hora
};
```

---

## Integrações Externas

### WhatsApp Business API

- **Account ID**: 806225345331804
- **Phone Number**: +551158749885
- **Templates Aprovados**:
  - `appointment_confirmation`
  - `appointment_reminder`
  - `appointment_reminder_24h`
  - `welcome_message`
  - `appointment_cancelled`
  - `precadastro_confirmation`
  - `birthday_greeting`
  - `patient_reactivation`
  - `payment_confirmation`
  - `exercise_assigned`

### Ably Realtime

- **Uso**: Atualizações em tempo real
- **Canais**:
  - `appointments:{orgId}` - Atualizações de agendamentos
  - `patients:{orgId}` - Atualizações de pacientes
  - `patient:{patientId}` - Atualizações de paciente específico
  - `presence:{orgId}` - Presença de usuários
  - `user:{userId}` - Notificações de usuário

### Stripe

- **Uso**: Processamento de pagamentos
- **Features**: Vouchers, assinaturas, pagamentos únicos

### Google Vertex AI

- **Modelo Principal**: Gemini 2.5 Flash-Lite
- **Uso**: Recomendação de exercícios, geração de SOAP
- **Rate Limiting**: 20 requisições/hora por usuário

### Twilio

- **Uso**: SMS (backup para WhatsApp)
- **Status**: Configurado como alternativa

### Sentry

- **Uso**: Error tracking e performance monitoring
- **Environment**: Production

---

## Middleware & Segurança

### Middlewares Disponíveis

| Middleware | Descrição |
|------------|-----------|
| `auth.ts` | Verificação de token e contexto RLS |
| `app-check.ts` | Validação de App Check |
| `rate-limit.ts` | Rate limiting |
| `audit-log.ts` | Logging de auditoria |
| `api-key.ts` | Validação de API key |
| `sentry-error-handler.ts` | Error tracking |

### Security Headers (Hosting)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=self, microphone=self, geolocation=self
```

### Firestore Security Rules

- **Helper Functions**: Role checking, authentication
- **Collection-level**: Rules para cada coleção
- **Size limits**: 1MB por documento
- **Bootstrap admin**: rafael.minatto@yahoo.com.br

---

## Real-time & Events

### Ably Integration

Canais de eventos publicados:

```typescript
// Atualização de agendamento
publishAppointmentEvent(organizationId, {
  event: 'INSERT' | 'UPDATE' | 'DELETE',
  new: appointmentData,
  old: previousData
});

// Atualização de paciente
publishPatientEvent(organizationId, {
  event: 'INSERT' | 'UPDATE' | 'DELETE',
  new: patientData,
  old: previousData
});

// Notificação
publishNotification(userId, {
  title: 'Título',
  body: 'Corpo da mensagem',
  type: 'info',
  link: '/path',
  data: { /* ... */ }
});
```

### Firestore Triggers

```typescript
// On patient created
onPatientCreated = functions.firestore.onDocumentCreated('patients/{patientId}')

// On appointment created
onAppointmentCreated = functions.firestore.onDocumentCreated('appointments/{appointmentId}')

// On appointment updated
onAppointmentUpdated = functions.firestore.onDocumentWritten('appointments/{appointmentId}')
```

---

## AI/ML Features

### Exercise Suggestion (Gemini 2.5 Flash-Lite)

**Endpoint**: `aiExerciseSuggestion`

**Input**:
```typescript
{
  patientId: string;
  goals: string[];
  availableEquipment?: string[];
  treatmentPhase?: 'initial' | 'progressive' | 'advanced' | 'maintenance';
  painMap?: Record<string, number>;  // bodyPart -> intensity (0-10)
}
```

**Output**:
```typescript
{
  success: true;
  data: {
    exercises: [...],
    programRationale: string,
    expectedOutcomes: string[],
    progressionCriteria: string[],
    redFlags?: string[],
    alternatives?: [...],
    estimatedDuration: number
  };
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}
```

**Custos** (Flash-Lite):
- Input: $0.075 por milhão de tokens
- Output: $0.15 por milhão de tokens

### SOAP Generation

**Endpoint**: `aiSoapGeneration`

Gera notas SOAP (Subjective, Objective, Assessment, Plan) baseadas em dados da sessão.

### Clinical Analysis

**Endpoint**: `aiClinicalAnalysis`

Análise clínica baseada em histórico do paciente.

---

## Jobs Agendados

### Schedule

| Job | Schedule | Descrição |
|-----|----------|-----------|
| Daily Reminders | `every day 08:00` | Lembretes de agendamentos do dia |
| Daily Reports | `every day 23:00` | Relatórios diários |
| Weekly Summary | `every monday 08:00` | Resumo semanal |
| Expiring Vouchers | `every day 10:00` | Notificação de vouchers expirando |
| Birthdays | `every day 09:00` | Mensagens de aniversário |
| Cleanup | `every sunday 03:00` | Limpeza de dados antigos |
| Data Integrity | `every day 04:00` | Verificação de integridade |

---

## Monitoramento & Observabilidade

### Tools

| Tool | Uso |
|------|-----|
| **Sentry** | Error tracking, performance |
| **Cloud Logging** | Structured logs |
| **Cloud Monitoring** | Métricas customizadas |
| **Cloud Trace** | Distributed tracing |
| **Firestore** | Audit logs |

### Métricas Coletadas

- AI usage (tokens, custo)
- API latency
- Error rates
- User activity
- Database performance

---

## LGPD & Compliance

### Direitos do Titular

| Direito | Função |
|---------|--------|
| Direito ao esquecimento | `deleteAccount` |
| Direito de portabilidade | `exportData` |
| Consentimento | `consent` |

### Audit Logs

Todos as operações sensíveis são registradas em `audit_logs`.

### Data Retention

- **Logs**: 90 dias
- **Dados de pacientes**: conforme contrato
- **Dados financeiros**: 5 anos (obrigação fiscal)

---

## Variáveis de Ambiente (Secrets)

### Google Secret Manager

```bash
# Database
DB_PASS
DB_USER
DB_NAME
CLOUD_SQL_CONNECTION_NAME
DB_HOST_IP
DB_HOST_IP_PUBLIC

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_ACCESS_TOKEN

# Stripe (se aplicável)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET

# Sentry
SENTRY_DSN

# Ably
ABLY_API_KEY  # (também no firebase.json)
```

---

## Comandos Úteis

### Deployment

```bash
# Deploy de todas as functions
firebase deploy --only functions

# Deploy de função específica
firebase deploy --only functions:listPatients

# Deploy com código de região específica
gcloud functions deploy listPatients --region=southamerica-east1
```

### Development

```bash
# Emuladores locais
firebase emulators:start

# Build TypeScript
npm run build

# Build em watch mode
npm run build:watch

# Testar função localmente
firebase functions:shell
```

### Database

```bash
# Conectar ao Cloud SQL
gcloud sql connect fisioflow-db --user=postgres --region=southamerica-east1

# Executar migration
curl -X POST https://southamerica-east1-fisioflow-migration.cloudfunctions.net/runMigrationHttp
```

---

## Links Úteis

- **Firebase Console**: https://console.firebase.google.com/project/fisioflow-migration
- **Cloud Console**: https://console.cloud.google.com/project/fisioflow-migration
- **Sentry**: [Dashboard do projeto]
- **Stripe Dashboard**: [Dashboard do projeto]
- **WhatsApp Business**: [Meta Business Suite]

---

## Próximos Passos

1. **Performance**:
   - Adicionar cache Redis
   - Otimizar queries complexas
   - Implementar query deduplication

2. **Segurança**:
   - Implementar rate limiting por IP
   - Adicionar CSRF protection
   - Implementar web Application Firewall (WAF)

3. **Observabilidade**:
   - Dashboards customizados no Cloud Monitoring
   - Alertas automatizados
   - Anomaly detection

4. **Features**:
   - Telemedicina completa
   - Integração com Google Calendar
   - Exportação para sistemas externos

---

**Documento gerado em**: Janeiro 2026
**Versão**: 2.0.0
** Mantenedor**: Equipe FisioFlow
