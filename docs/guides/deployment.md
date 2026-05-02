# FisioFlow - Guia de Deploy (Arquitetura 2026)

## 📋 Visão Geral

Este documento contém as instruções atualizadas para o deploy do FisioFlow usando a infraestrutura moderna baseada em Cloudflare e Neon DB.

## 🏗️ Arquitetura Atualizada (Vanguarda 2026)

- **Frontend Principal**: Cloudflare Pages (`fisioflow.pages.dev`)
- **App do Paciente**: Cloudflare Pages (`fisioflow-patient.pages.dev`)
- **Backend (API)**: Cloudflare Workers v4 (`fisioflow-api`)
- **Processamento R2**: Cloudflare Workers (`r2-presigned-url-worker`)
- **Database**: Neon DB (PostgreSQL Serverless)
- **Auth**: Neon Auth (OIDC / JWT)
- **Storage**: Cloudflare R2 (`fisioflow-exams`, `fisioflow-media`)
- **Runtime**: Cloudflare Workers (V8) + Vite 8.0.7 + Rolldown

## 🚀 Fluxo de Deploy

O projeto utiliza **Environments** do Cloudflare para separar Staging de Production sem duplicar projetos no dashboard.

### Comandos principais

```bash
# Gate local antes de abrir PR ou deploy
bash scripts/predeploy-check.sh

# Dry-run / deploy da API
pnpm --dir apps/api exec wrangler deploy --dry-run --env staging
pnpm --dir apps/api exec wrangler deploy --env production

# Build + deploy do Web Asset Worker
pnpm deploy:web:staging
pnpm deploy:web:production

# Smoke tests pós-deploy
pnpm smoke:staging
pnpm smoke:production
```

### GitHub Actions

- `pull_request` e `main` passam pelo gate de qualidade via `scripts/predeploy-check.sh`
- `staging` dispara o workflow `Staging Deploy`
- `main` mantém o deploy de produção e o smoke test final

### 1. Deploy da API (Backend)

Localizado em `apps/api`.

```bash
# Deploy para Staging
cd apps/api && npx wrangler deploy --env staging

# Deploy para Produção
cd apps/api && npx wrangler deploy --env production
```

### 2. Deploy do Frontend (Web)

O frontend é publicado como **Asset Worker** usando o `wrangler.toml` da raiz.

```bash
# Build do projeto
pnpm --filter fisioflow-web build

# Deploy para Staging ou Produção
pnpm deploy:web:staging
pnpm deploy:web:production
```

## 🔧 Configuração de Ambientes

As variáveis de ambiente e segredos são gerenciados via `wrangler.toml` e `wrangler secret`.

| Ambiente       | URL API                                          | Dashboard |
| :------------- | :----------------------------------------------- | :-------- |
| **Production** | `api-pro.moocafisio.com.br`                      | Principal |
| **Staging**    | `fisioflow-api-staging.rafalegollas.workers.dev` | Staging   |

| Ambiente       | URL Web                                          |
| :------------- | :----------------------------------------------- |
| **Production** | `www.moocafisio.com.br`                          |
| **Staging**    | `fisioflow-web-staging.rafalegollas.workers.dev` |

### Segredos Necessários

Configure os segredos para cada ambiente no worker canonico de `apps/api`:

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put NEON_URL
npx wrangler secret put RESEND_API_KEY
```

## 🗄️ Banco de Dados (Neon)

- **Migrations**: Gerenciadas via Drizzle ORM.
- **Conexão**: A API utiliza o driver HTTP do Neon para máxima performance em ambientes serverless (Edge).

## 📊 Monitoramento e Logs

- **Logs em tempo real**: `npx wrangler tail fisioflow-api`
- **Observability**: Ativado nativamente no Cloudflare Dashboard.

---

**Última atualização**: Março 2026 (Pós-Limpeza de Infraestrutura)  
**Status**: Ativo e Otimizado ✅
