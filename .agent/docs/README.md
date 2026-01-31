# FisioFlow - Documentação Backend

> **Sistema de Gestão para Clínicas de Fisioterapia**
> **Versão**: 2.0.0
> **Projeto Firebase**: `fisioflow-migration`
> **Região**: `southamerica-east1`

---

## Documentação Disponível

### 📋 [Arquitetura Backend](./BACKEND_ARCHITECTURE.md)

Documentação completa da arquitetura do sistema backend.

**Conteúdo**:
- Visão geral da infraestrutura Google Cloud
- Estrutura de Cloud Functions
- Schema do Cloud SQL (PostgreSQL)
- Coleções Firestore
- Firebase Storage
- Autenticação e Autorização
- Integrações externas (WhatsApp, Ably, Stripe, Vertex AI)
- AI/ML Features
- Jobs agendados
- Monitoramento e observabilidade
- LGPD e compliance

**Para quem**: Desenvolvedores, Arquitetos, DevOps

---

### 📖 [API Reference](./API_REFERENCE.md)

Referência completa de todas as APIs do sistema.

**Conteúdo**:
- Autenticação
- Endpoints de Pacientes
- Endpoints de Agendamentos
- Endpoints de Exercícios
- Endpoints de Avaliações
- Endpoints Financeiros
- Endpoints de Prontuário
- Upload de Arquivos
- AI Functions
- Códigos de erro

**Para quem**: Desenvolvedores Frontend/Backend

---

### 🚀 [Deployment Guide](./DEPLOYMENT_GUIDE.md)

Guia completo de deployment e operações.

**Conteúdo**:
- Pré-requisitos
- Setup local
- Deploy de Cloud Functions
- Configuração de Secrets
- Database Migrations
- Firebase Hosting
- Monitoring
- Troubleshooting básico
- Comandos úteis

**Para quem**: DevOps, Engenheiros de Deployment

---

### 🔧 [Troubleshooting](./TROUBLESHOOTING.md)

Guia de resolução de problemas.

**Conteúdo**:
- Cloud Functions (timeouts, cold starts)
- Cloud SQL (conexões, queries lentas)
- Firebase Auth (tokens, MFA)
- Firestore (permissions, índices)
- Storage (CORS, uploads)
- Integrações (WhatsApp, Stripe, Ably, AI)
- Performance
- Segurança

**Para quem**: Todos os desenvolvedores

---

## Resumo da Arquitetura

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

## Stack Tecnológico

| Componente | Tecnologia |
|------------|-----------|
| Runtime | Node.js 20 |
| Linguagem | TypeScript 5.7.2 |
| Database | Cloud SQL (PostgreSQL) |
| Cache/Real-time | Firestore |
| Storage | Firebase Storage |
| Auth | Firebase Auth (MFA TOTP) |
| Functions | Firebase Functions Gen 2 |
| Real-time | Ably |
| AI/ML | Google Vertex AI (Gemini) |
| Pagamentos | Stripe |
| WhatsApp | Meta Business API |
| Error Tracking | Sentry |

---

## Secrets Principais

```bash
# Database
DB_PASS                  # Senha PostgreSQL
DB_USER                  # Usuário PostgreSQL
DB_NAME                  # Nome database
CLOUD_SQL_CONNECTION_NAME
DB_HOST_IP_PUBLIC        # 34.68.209.73 (us-central1-c)

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_ACCESS_TOKEN

# Ably
ABLY_API_KEY             # zmqcyQ.hjud3A:...

# Outros
STRIPE_SECRET_KEY
SENTRY_DSN
```

---

## Links Rápidos

| Serviço | Link |
|---------|------|
| Firebase Console | https://console.firebase.google.com/project/fisioflow-migration |
| Cloud Console | https://console.cloud.google.com/project/fisioflow-migration |
| Cloud Functions | https://console.cloud.google.com/functions/list |
| Cloud SQL | https://console.cloud.google.com/sql/instances |
| Firestore | https://console.firebase.google.com/project/fisioflow-migration/firestore |
| Storage | https://console.firebase.google.com/project/fisioflow-migration/storage |

---

## Comandos Rápidos

```bash
# Setup
npm install
firebase login
firebase use fisioflow-migration

# Development
npm run build
firebase emulators:start

# Deploy
firebase deploy --only functions
firebase deploy --only hosting
firebase deploy

# Logs
firebase functions:log

# Database
gcloud sql connect fisioflow-db --user=postgres --region=southamerica-east1

# Secrets
gcloud secrets list
gcloud secrets versions access latest --secret DB_PASS
```

---

## Estrutura do Projeto

```
fisioflow-51658291/
├── functions/                 # Cloud Functions
│   ├── src/
│   │   ├── api/              # API endpoints
│   │   ├── middleware/       # Auth, rate-limit, etc.
│   │   ├── ai/               # AI/ML functions
│   │   ├── crons/            # Scheduled jobs
│   │   ├── workflows/        # Workflow functions
│   │   ├── realtime/         # Ably publisher
│   │   ├── communications/   # WhatsApp, email
│   │   ├── stripe/           # Stripe integration
│   │   ├── lib/              # Utils, logger, migrations
│   │   └── types/            # TypeScript types
│   └── package.json
├── firebase.json             # Firebase config
├── firestore.rules           # Firestore security
├── storage.rules             # Storage security
├── firestore.indexes.json    # Firestore indexes
├── supabase/migrations/      # SQL migrations
└── .agent/docs/              # Esta documentação
```

---

## API Endpoints (Principais)

### Callable Functions

```
# Pacientes
listPatients
createPatient
updatePatient
getPatient
deletePatient
getPatientStats

# Agendamentos
listAppointments
createAppointment
updateAppointment
cancelAppointment
checkTimeConflict

# Exercícios
listExercises
getExercise
createExercise
getPrescribedExercises

# AI
aiExerciseSuggestion
aiSoapGeneration
aiClinicalAnalysis
```

### HTTP Endpoints

```
# Base URL
https://southamerica-east1-fisioflow-migration.cloudfunctions.net

# Endpoints
/api/evaluate          # Avaliações HTTP
/api/health           # Health check
realtimePublish       # Ably publish
whatsappWebhookHttp   # WhatsApp webhook
```

---

## Contribuindo

Para contribuir com a documentação:

1. Edite os arquivos `.md` em `.agent/docs/`
2. Mantenha o formato Markdown
3. Adicione exemplos quando aplicável
4. Atualize a data de atualização

---

## Suporte

Para dúvidas ou problemas:

1. Consulte o [Troubleshooting](./TROUBLESHOOTING.md)
2. Verifique os [Logs](https://console.cloud.google.com/logs)
3. Abra um issue no GitHub

---

**Documentação gerada em**: Janeiro 2026
**Versão**: 2.0.0
** Mantido por**: Equipe FisioFlow
