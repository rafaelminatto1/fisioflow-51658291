# FisioFlow - Guia de Configuração e Deploy (Neon + Cloudflare)

## Visão Geral

O FisioFlow utiliza **Neon** (Banco de Dados e Autenticação) e **Cloudflare** (Workers e R2) como infraestrutura principal.

### Stack de Serviços

| Serviço | Uso | Tecnologia |
|---------|-----|------------|
| Neon Auth | Autenticação de usuários | Better Auth + Neon |
| Neon PostgreSQL | Banco de dados principal | PostgreSQL Serverless |
| Cloudflare R2 | Armazenamento de arquivos | S3-Compatible Storage |
| Cloudflare Workers | Funções serverless e API | Edge Computing |
| Cloudflare Pages | Hospedagem frontend | Static Hosting |
| Cloudflare Analytics | Monitoramento e tráfego | Web Analytics |
| OpenAI/Gemini API | IA e ML | LLM Integrations |

---

## Pré-requisitos

1. **Node.js** 20+ instalado
2. **pnpm** como package manager
3. Conta no **Neon.tech**
4. Conta na **Cloudflare**
5. **Wrangler CLI** instalado:
   ```bash
   npm install -g wrangler
   wrangler login
   ```

---

## 1. Configuração do Neon

### 1.1 Criar Projeto no Neon

1. Acesse: https://console.neon.tech/
2. Crie um novo projeto chamado `fisioflow`
3. Copie a `DATABASE_URL` (Connection String)

### 1.2 Configurar Neon Auth

1. No console do Neon, ative o **Neon Auth** (em Preview/Beta).
2. Configure o provedor de autenticação e obtenha as chaves necessárias.
3. Adicione a URL do endpoint de autenticação ao seu `.env`.

---

## 2. Configuração do Cloudflare

### 2.1 Cloudflare R2 (Storage)

1. No dashboard da Cloudflare, acesse **R2**.
2. Crie um bucket chamado `fisioflow-media`.
3. Configure as credenciais de acesso (Access Key e Secret Key) para uso local, se necessário.

### 2.2 Cloudflare Workers (API)

A API principal reside em `cloudflare-worker/` (ou `workers/` dependendo da versão).

```bash
cd cloudflare-worker
# Instalar dependências
pnpm install
# Deploy para staging/produção
wrangler deploy
```

---

## 3. Configuração de Variáveis de Ambiente

Crie um arquivo `.env` na raiz e nos apps:

```env
# Database
DATABASE_URL=postgresql://user:pass@ep-project.sa-east-1.aws.neon.tech/neondb?sslmode=require

# Auth
VITE_NEON_AUTH_URL=https://your-auth-endpoint.neonauth.aws.neon.tech

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your-account-id
R2_BUCKET_NAME=fisioflow-media
```

---

## 4. Banco de Dados e Migrações

O FisioFlow utiliza **Drizzle ORM**.

```bash
# Gerar arquivos de migração
npm run db:generate

# Aplicar migrações ao banco de dados (push direto para dev)
npm run db:push

# Rodar migrações em produção
npm run db:migrate
```

---

## 5. Deploy

### 5.1 Frontend (Cloudflare Pages)

```bash
# Build do projeto
pnpm build:prod

# Deploy via Wrangler ou integração direta com GitHub
wrangler pages deploy dist
```

### 5.2 Backend (Cloudflare Workers)

```bash
# Deploy da API
pnpm workers:deploy
```

---

## 6. Monitoramento e Logging

- **Sentry**: Para rastreamento de erros no frontend e backend.
- **Cloudflare Observability**: Logs em tempo real dos Workers.
- **Neon Console**: Monitoramento de queries e performance do banco.

---

## 7. CI/CD (GitHub Actions)

O deploy é automatizado via GitHub Actions. Verifique `.github/workflows/` para detalhes sobre o fluxo de build e deploy para Cloudflare.

---

## 8. Comandos Úteis

```bash
# Iniciar ambiente de desenvolvimento
npm run dev

# Studio do Drizzle para visualizar dados
npm run db:studio

# Limpar caches e reinstalar dependências
npm run clean:all
```

---

## 9. Suporte

- **Neon Docs**: https://neon.tech/docs
- **Cloudflare Developers**: https://developers.cloudflare.com/
- **Drizzle ORM**: https://orm.drizzle.team/
