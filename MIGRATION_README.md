# FisioFlow - Migração para Firebase + Cloud SQL

## Estrutura Criada

### Configuração Firebase
- `firebase.json` - Configuração principal do Firebase
- `dataconnect/connector/postgresql/schema/` - Schemas GraphQL para Data Connect
- `dataconnect/connector/postgresql/connector.yaml` - Configuração do conector

### Cloud Functions
- `functions/src/index.ts` - Entry point com todas as funções exportadas
- `functions/src/middleware/auth.ts` - Middleware de autenticação
- `functions/src/api/` - Endpoints de API (pacientes, agendamentos, etc.)
- `functions/src/realtime/publisher.ts` - Publisher Ably para realtime

### Frontend (src/)
- `src/integrations/firebase/app.ts` - Inicialização do Firebase
- `src/integrations/firebase/auth.ts` - Autenticação Firebase
- `src/lib/realtime/ably-client.ts` - Cliente Ably Realtime
- `src/lib/storage/firebase-storage.ts` - Cliente Firebase Storage

### Scripts de Migração
- `scripts/migration/backup-supabase.ts` - Backup completo do Supabase
- `scripts/migration/migrate-to-cloudsql.ts` - Migração para Cloud SQL
- `scripts/migration/seed-exercises.ts` - Seed de exercícios
- `scripts/data/exercises.json` - 10 exercícios de fisioterapia

## Passos para Completar a Migração

### 1. Instalar Dependências

```bash
# Frontend
npm install firebase@^11.0.0 ably@^1.2.0

# Backend (Cloud Functions)
cd functions
npm install
```

### 2. Criar Projeto Firebase

```bash
# Acessar console.firebase.google.com
# Criar projeto "fisioflow-migration"
firebase login
firebase init
```

### 3. Criar Instância Cloud SQL

```bash
gcloud sql instances create fisioflow-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=southamerica-east1 \
  --storage-auto-increase \
  --storage-size=10GB
```

### 4. Configurar Variáveis de Ambiente

Copie as variáveis do Firebase Console para o `.env.local`:

```bash
# Firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...

# Cloud SQL
CLOUD_SQL_CONNECTION_STRING=...

# Ably
VITE_ABLY_API_KEY=...
```

### 5. Backup do Supabase

```bash
npm run tsx scripts/migration/backup-supabase.ts
```

### 6. Migrar Dados

```bash
npm run tsx scripts/migration/migrate-to-cloudsql.ts
```

### 7. Seed de Exercícios

```bash
npm run tsx scripts/migration/seed-exercises.ts
```

### 8. Deploy

```bash
# Hosting + Functions
firebase deploy

# Ou separadamente
firebase deploy --only hosting
firebase deploy --only functions
```

## Arquivos Modificados

### Principais mudanças necessárias no frontend:

1. **AuthContext.tsx** - Substituir Supabase Auth por Firebase Auth
2. **RealtimeContext.tsx** - Substituir Supabase Realtime por Ably
3. **Todas as queries de API** - Usar Cloud Functions em vez de Supabase client

## Suporte a Apps iOS

A estrutura já está preparada para iOS com:
- Capacitor configurado
- Firebase Authentication para iOS
- Firebase Cloud Messaging para notificações
- Firebase Performance Monitoring
- Firebase Crashlytics

Plugins Capacitor necessários:
```bash
npm install @capacitor-firebase/authentication
npm install @capacitor-firebase/performance
npm install @capacitor-firebase/crashlytics
npm install @capacitor-firebase/analytics
npm install @capacitor-firebase/messaging
```

## Custo Estimado

| Serviço | Custo Mensal |
|---------|--------------|
| Cloud SQL (db-f1-micro) | ~R$ 90 |
| Firebase Blaze | ~R$ 40 |
| Ably | ~R$ 20 |
| Cloud Functions | ~R$ 30 |
| Cloudflare R2 | ~R$ 4 |
| **TOTAL** | **R$ 184/mês** |
