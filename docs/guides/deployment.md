# FisioFlow - Guia de Deploy (Arquitetura 2026)

## 📋 Visão Geral

Este documento contém as instruções atualizadas para o deploy do FisioFlow usando a infraestrutura moderna baseada em Cloudflare e Neon DB.

## 🏗️ Arquitetura Atualizada (Vanguarda 2026)

- **Frontend Principal**: Cloudflare Pages (`fisioflow.pages.dev`)
- **App do Paciente**: Cloudflare Pages (`fisioflow-patient.pages.dev`)
- **Backend (API)**: Cloudflare Workers (`fisioflow-api`)
- **Processamento R2**: Cloudflare Workers (`r2-presigned-url-worker`)
- **Database**: Neon DB (PostgreSQL Serverless)
- **Auth**: Neon Auth (OIDC / JWT)
- **Storage**: Cloudflare R2 (`fisioflow-exams`, `fisioflow-media`)
- **Runtime**: Cloudflare Workers (V8) + Vite 8 + Rolldown

## 🚀 Fluxo de Deploy

O projeto utiliza **Environments** do Cloudflare para separar Staging de Production sem duplicar projetos no dashboard.

### 1. Deploy da API (Backend)
Localizado em `apps/api`.

```bash
# Deploy para Staging
cd apps/api && npx wrangler deploy --env staging

# Deploy para Produção
cd apps/api && npx wrangler deploy --env production
```

### 2. Deploy do Frontend (Web)
Localizado na raiz ou `apps/web`.

```bash
# Build do projeto
npm run build

# Deploy para Produção (Asset Worker)
npx wrangler deploy
```

## 🔧 Configuração de Ambientes

As variáveis de ambiente e segredos são gerenciados via `wrangler.toml` e `wrangler secret`.

| Ambiente | URL API | Dashboard |
| :--- | :--- | :--- |
| **Production** | `api-pro.moocafisio.com.br` | Principal |
| **Staging** | `fisioflow-api-staging.rafalegollas.workers.dev` | Staging |

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
