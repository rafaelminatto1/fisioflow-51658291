# 🏥 FisioFlow - Gestão Inteligente para Fisioterapia (2026)

Plataforma de alta performance para clínicas de fisioterapia, utilizando a stack de ponta: **Neon DB + Cloudflare Workers**.

O FisioFlow é um monorepo focado em latência ultra-baixa, operando na borda (Edge Computing) e utilizando banco de dados serverless PostgreSQL.

## 🛠 Stack Tecnológica

- **Frontend**: React 19, Vite 8, Tailwind CSS, shadcn/ui.
- **Backend**: Cloudflare Workers (Hono.js).
- **Banco de Dados**: Neon PostgreSQL (Serverless).
- **Autenticação**: Neon Auth (JWKS).
- **Storage**: Cloudflare R2 (S3-Compatible).
- **ORM**: Drizzle ORM.
- **Runtime**: Node.js v20.12.0+.

## 🚀 Configuração de Desenvolvimento

### 1. Requisitos

- **Node.js v20.12.0+**
- **pnpm v9+**
- Cloudflare Wrangler CLI (`pnpm install -g wrangler`)
- Conta no Neon.tech

### 2. Variáveis de Ambiente

Crie um arquivo `.env` no root e nas pastas dos apps:

```env
# Database
DATABASE_URL=postgresql://user:pass@ep-project.sa-east-1.aws.neon.tech/neondb?sslmode=require

# Auth
VITE_NEON_AUTH_URL=https://your-auth-endpoint.neonauth.aws.neon.tech
```

### 3. Scripts Principais (TurboRepo)

```bash
# Instalar dependências
pnpm install

# Iniciar ambiente completo (Web + API)
pnpm dev

# Migrações de Banco de Dados
pnpm db:push
```

## 📁 Estrutura do Projeto

- `apps/web`: Frontend principal (Cloudflare Pages).
- `apps/api`: API Serverless (Hono / Cloudflare Workers).
- `apps/patient-app`: Aplicativo mobile do paciente (Expo/Capacitor).
- `packages/db`: Schema centralizado e cliente do Drizzle.
- `docs/`: Documentação técnica detalhada.

## 🔐 Segurança e Privacidade (LGPD)

- **Tenant Isolation**: Isolamento de clínicas via context injection no Drizzle.
- **Edge Security**: Verificação de tokens JWT via JWKS local nos Workers.
- **Privacy First**: URLs assinadas para mídia no R2 e proibição de indexação SEO.

## 🧭 Workflow de Especificação

Este repositório agora usa GitHub Spec Kit para documentar novos recursos em `specs/`.
- Arquivos principais: `constitution.md`, `specs/<feature>/spec.md`, `specs/<feature>/plan.md`, `specs/<feature>/tasks.md`
- Comandos: `specify init --here`, `/speckit.constitution`, `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.analyze`, `/speckit.checklist`
- Leia também `docs/guides/developer_guide.md` para mais detalhes.

---

Desenvolvido para transformar a fisioterapia brasileira com tecnologia de ponta.
