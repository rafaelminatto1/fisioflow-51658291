# Guia de Deploy — Cloudflare Pages + Workers + Hyperdrive

## Pré-requisitos

1. Conta Cloudflare (gratuita serve para começar)
2. Wrangler CLI instalado: `pnpm --filter @fisioflow/api dev`
3. Autenticado: `npx wrangler login`

---

## Passo 1: Criar o Hyperdrive (uma vez)

O Hyperdrive é o pool de conexões edge que torna o Neon 10x mais rápido.

```bash
cd apps/api
npx wrangler hyperdrive create fisioflow-neon \
  --connection-string="postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
```

O comando vai retornar algo como:
```
✅ Created Hyperdrive config "fisioflow-neon" (id: abc123def456...)
```

**Copie o ID** e substitua no `apps/api/wrangler.toml`:
```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "abc123def456..."   # ← cole aqui
```

---

## Passo 2: Deploy do Worker

```bash
# Dev local (sem Hyperdrive real — usa Neon direto)
pnpm workers:dev

# Deploy production
pnpm workers:deploy
```

A URL ficará tipo: `https://fisioflow-api.workers.dev`

Teste: `curl https://fisioflow-api.workers.dev/api/health`

---

## Passo 3: Deploy do Frontend (Cloudflare Pages)

### Opção A: Via CLI (manual)
```bash
pnpm build
cd apps/api
npx wrangler pages deploy ../dist --project-name=fisioflow
```

### Opção B: Via GitHub Actions (automático)

Configure os secrets no repositório GitHub:
```
CF_API_TOKEN       → Cloudflare API Token (permissão: Workers Scripts, Pages)
CF_ACCOUNT_ID      → Seu Account ID do Cloudflare (dashboard > sidebar)
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Após isso, cada push para `main` faz deploy automático.

---

## Passo 4: Atualizar o frontend com a URL do Worker

Atualize `.env` (dev) e as variáveis de build:
```env
VITE_WORKERS_API_URL=https://fisioflow-api.workers.dev
```

---

## Domínio Customizado

No painel Cloudflare Pages > Custom Domains:
- Adicione `moocafisio.com.br` (ou subdomínio)
- DNS aponta automaticamente

Para o Worker (API):
- Em Workers > fisioflow-api > Triggers > Custom Domains
- Adicione `api.moocafisio.com.br`

---

## Teste Local Completo

```bash
# Terminal 1: Worker (porta 8787)
pnpm workers:dev

# Terminal 2: Frontend (porta 5173)
pnpm dev

# O frontend chama localhost:8787/api/* automaticamente
```

---

## Custos Estimados (Free Tier Cloudflare)

| Serviço             | Free Tier                | Custo ao ultrapassar |
|---------------------|--------------------------|----------------------|
| Workers             | 100K req/dia             | $0.50/M req          |
| Workers Hyperdrive  | 1M req/mês               | Incluído no Workers  |
| Pages               | Ilimitado                | Gratuito sempre      |
| Neon (PostgreSQL)   | 512MB + 0.5 vCPU         | $19/mês (Pro)        |

**Para começar: tudo GRÁTIS.**
