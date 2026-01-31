# FisioFlow - Deployment Guide

> **Versão**: 2.0.0
> **Projeto Firebase**: `fisioflow-migration`
> **Região**: `southamerica-east1`

---

## Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Setup Local](#setup-local)
3. [Deploy de Cloud Functions](#deploy-de-cloud-functions)
4. [Configuração de Secrets](#configuração-de-secrets)
5. [Database Migrations](#database-migrations)
6. [Firebase Hosting](#firebase-hosting)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

### Ferramentas Necessárias

```bash
# Node.js 20
node --version  # v20.x.x

# Firebase CLI
npm install -g firebase-tools
firebase --version  # >= 13.0.0

# Google Cloud CLI (opcional, para Cloud SQL)
gcloud --version

# Git
git --version
```

### Permissões Necessárias

- **Firebase Admin**: Editor ou Owner
- **Cloud Functions**: Cloud Functions Developer
- **Cloud SQL**: Cloud SQL Client/Admin
- **Secret Manager**: Secret Manager Viewer/Accessor

---

## Setup Local

### 1. Clone o Repositório

```bash
git clone <repository-url>
cd fisioflow-51658291
```

### 2. Instale Dependências

```bash
# Frontend
npm install

# Cloud Functions
cd functions
npm install
cd ..
```

### 3. Configure o Firebase CLI

```bash
firebase login
firebase projects:list
```

### 4. Configure Variáveis de Ambiente Locais

```bash
# Crie o arquivo functions/.env
cp functions/.env.example functions/.env

# Edite com suas credenciais locais
nano functions/.env
```

**Exemplo de `.env`**:
```env
# Database (local)
DB_HOST=localhost
DB_PORT=5432
DB_USER=fisioflow
DB_PASS=fisioflow2024
DB_NAME=fisioflow

# Cloud SQL (produção, para testes locais com cloud_sql_proxy)
CLOUD_SQL_CONNECTION_NAME=fisioflow-migration:southamerica-east1:fisioflow-db

# Ably
ABLY_API_KEY=your_ably_key

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_access_token
```

### 5. Inicie os Emuladores

```bash
# Em um terminal, inicie todos os emuladores
firebase emulators:start

# Ou em segundo plano
firebase emulators:start --only functions,firestore,auth,storage
```

Acesse o Emulator UI em: http://localhost:4000

---

## Deploy de Cloud Functions

### Deploy de Todas as Funções

```bash
# Build + Deploy
firebase deploy --only functions

# Deploy com código de região específica
firebase deploy --only functions --region southamerica-east1
```

### Deploy de Função Específica

```bash
# Deploy única função
firebase deploy --only functions:listPatients

# Deploy múltiplas funções
firebase deploy --only functions:listPatients,functions:createPatient
```

### Deploy com Logs Detalhados

```bash
# Debug mode
firebase deploy --only functions --debug

# Com força (força redeploys)
firebase deploy --only functions --force
```

### Deploy Apenas de Código (sem configurar)

```bash
# Deploy sem atualizar configurações do Firebase
firebase deploy --only functions --json
```

---

## Configuração de Secrets

### Via Google Secret Manager

```bash
# Criar um secret
echo "my_secret_value" | \
  gcloud secrets create DB_PASS --data-file=-

# Listar secrets
gcloud secrets list

# Acessar um secret
gcloud secrets versions access latest --secret DB_PASS

# Adicionar secret ao Firebase
firebase functions:secrets:access DB_PASS
```

### Via Firebase Console

1. Acesse: https://console.firebase.google.com/project/fisioflow-migration/functions/secrets
2. Clique em "Add Secret"
3. Nomeie e cole o valor
4. Adicione às funções desejadas

### Secrets Configurados

```bash
# Database
DB_PASS                # Senha do PostgreSQL
DB_USER                # Usuário do PostgreSQL
DB_NAME                # Nome do database
CLOUD_SQL_CONNECTION_NAME  # Nome da conexão Cloud SQL
DB_HOST_IP             # IP privado do Cloud SQL
DB_HOST_IP_PUBLIC      # IP público do Cloud SQL

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID  # ID do número de telefone
WHATSAPP_ACCESS_TOKEN     # Token de acesso

# Outros (opcional)
STRIPE_SECRET_KEY      # Chave secreta do Stripe
STRIPE_WEBHOOK_SECRET  # Segredo do webhook Stripe
SENTRY_DSN             # DSN do Sentry
```

---

## Database Migrations

### Via Cloud Function

```bash
# Executa migration via HTTP
curl -X POST \
  "https://southamerica-east1-fisioflow-migration.cloudfunctions.net/runMigrationHttp"
```

### Via psql direto

```bash
# Conecte ao Cloud SQL via proxy
gcloud sql connect fisioflow-db --user=postgres --region=southamerica-east1

# Ou via IP público
psql -h 34.68.209.73 -U fisioflow -d fisioflow

# Execute migration scripts
\i supabase/migrations/20260129000012_create_missing_tables.sql
```

### Via Cloud SQL Proxy

```bash
# 1. Inicie o proxy
gcloud sql connect fisioflow-db --user=postgres --region=southamerica-east1

# 2. Em outro terminal, execute migrations
psql -h 127.0.0.1 -U fisioflow -d fisioflow < migration.sql
```

### Migrations Disponíveis

```
supabase/migrations/
├── 20260129000012_create_missing_tables.sql
├── 20260128000000_fix_user_roles_recursive_rls.sql
├── 20260127000000_fix_profiles_rls_policy.sql
├── 20260114150004_mfa_enforcement.sql
└── ...
```

---

## Firebase Hosting

### Build do Frontend

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Output em: dist/
```

### Deploy do Hosting

```bash
# Deploy hosting apenas
firebase deploy --only hosting

# Deploy hosting + functions
firebase deploy --only hosting,functions

# Deploy com canal específico (preview)
firebase hosting:channel:deploy preview
```

### Configuração de Domínio Customizado

```bash
# Adicionar domínio customizado
firebase hosting:sites:create

# Configure DNS no seu provedor
# A: firebase-project.web.app -> IP do Firebase
# CNAME: www.seudominio.com.br -> firebase-project.web.app
```

---

## Monitoring

### Cloud Functions Logs

```bash
# Ver logs em tempo real
firebase functions:log

# Logs de função específica
firebase functions:log --only listPatients

# Logs com filtro
firebase functions:log --filter listPatients
```

### Google Cloud Console

1. **Logging**: https://console.cloud.google.com/logs
2. **Monitoring**: https://console.cloud.google.com/monitoring
3. **Cloud Functions**: https://console.cloud.google.com/functions/list
4. **Cloud SQL**: https://console.cloud.google.com/sql/instances

### Sentry

Acesse o dashboard do Sentry para erros e performance:
- URL: [Seu dashboard Sentry]
- Configuração: `functions/src/lib/sentry.ts`

### Métricas Customizadas

As Cloud Functions registram métricas no Cloud Monitoring:
- Latência de cada função
- Taxa de erro
- Uso de AI (tokens, custo)
- Atividade de usuários

---

## Troubleshooting

### Erro: "Database connection failed"

**Sintoma**: Funções retornam erro de conexão com o banco.

**Solução**:
1. Verifique se o Cloud SQL está rodando
2. Verifique as secrets (`DB_PASS`, `DB_USER`, `DB_NAME`)
3. Teste conexão via `gcloud sql connect`
4. Verifique regras de firewall (se usando IP público)

```bash
# Testar conexão
gcloud sql connect fisioflow-db --user=postgres --region=southamerica-east1

# Ver status da instância
gcloud sql instances describe fisioflow-db --region=southamerica-east1
```

### Erro: "Permission denied"

**Sintoma**: `HttpsError: permission-denied`

**Solução**:
1. Verifique se o usuário tem o role correto no perfil
2. Verifique se `organization_id` está correto
3. Verifique as políticas RLS

### Erro: "Rate limit exceeded"

**Sintoma**: `HttpsError: resource-exhausted`

**Solução**:
1. Aguarde o reset do rate limit
2. Implemente backoff exponencial no cliente
3. Para AI, aguarde 1 hora ou use outro usuário

### Erro: "App Check token invalid"

**Sintoma**: Erro de validação do App Check

**Solução**:
1. Configure o App Check no frontend
2. Verifique se o token está válido
3. Em desenvolvimento, use o debug token

### Deploy Falha

**Sintoma**: Deploy retorna erro

**Solução**:
```bash
# Verifique erros de compilação
cd functions
npm run build

# Verifique TypeScript errors
npx tsc --noEmit

# Limpe e reinstale
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Funções Lentas

**Sintoma**: Funções demoram para responder

**Solução**:
1. Aumente memória/CPU:
```typescript
export const myFunction = onCall({
  memory: '1GiB',
  cpu: 2,
  maxInstances: 10,
}, handler);
```

2. Configure connection pooling adequado
3. Adicione índices no banco de dados
4. Use cache quando possível

### Cold Starts

**Sintoma**: Primeira chamada demora muito

**Solução**:
1. Configure `minInstances` para funções críticas:
```typescript
export const criticalFunction = onCall({
  minInstances: 1,
}, handler);
```

2. Use um agendador para "aquecer" as funções
3. Considere usar Cloud Run para APIs de alto volume

---

## Rollback

### Reverter para Versão Anterior

```bash
# Listar versões anteriores
gcloud functions describe listPatients \
  --region=southamerica-east1 \
  --gen2

# Reverter para versão específica
gcloud functions deploy listPatients \
  --region=southamerica-east1 \
  --source=<previous-version-url>
```

### Revert Rápido (via Firebase)

```bash
# Redeploy com commit anterior
git checkout <previous-commit>
firebase deploy --only functions
```

---

## Boas Práticas

### 1. Sempre teste localmente

```bash
# Teste com emuladores antes do deploy
firebase emulators:start
npm run test
```

### 2. Use ambientes separados

```bash
# Projeto de desenvolvimento
firebase use development

# Projeto de produção
firebase use production
```

### 3. Configure alertas

- Budget alerts no Google Cloud
- Error rate no Sentry
- Custom metrics no Cloud Monitoring

### 4. Documente mudanças

- Mantenha CHANGELOG atualizado
- Documente breaking changes
- Comunique com a equipe

---

## Comandos Rápidos

```bash
# Setup
firebase login
firebase init
firebase use fisioflow-migration

# Development
npm install
npm run build
firebase emulators:start

# Deploy
firebase deploy --only functions
firebase deploy --only hosting
firebase deploy

# Logs
firebase functions:log
firebase functions:log --only listPatients

# Database
gcloud sql connect fisioflow-db --user=postgres --region=southamerica-east1

# Secrets
gcloud secrets list
gcloud secrets versions access latest --secret DB_PASS
```

---

**Documento atualizado**: Janeiro 2026
