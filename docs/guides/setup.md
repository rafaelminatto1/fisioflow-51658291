# FisioFlow - Guia de Configuração e Deploy (Neon + Cloudflare)

## Visão Geral

O FisioFlow utiliza **Neon** (Banco de Dados e Autenticação) e **Cloudflare** (Workers e R2) como infraestrutura principal de produção em 2026.

### Stack de Serviços

| Serviço            | Uso                      | Tecnologia            |
| ------------------ | ------------------------ | --------------------- |
| Neon Auth          | Autenticação de usuários | Better Auth + Neon    |
| Neon PostgreSQL    | Banco de dados principal | PostgreSQL Serverless |
| Cloudflare R2      | Armazenamento de mídia   | S3-Compatible Storage |
| Cloudflare Workers | API Backend (Hono)       | Edge Computing        |
| Cloudflare Pages   | Hospedagem Frontend      | Static Hosting        |

---

## Pré-requisitos de Desenvolvimento

1. **Node.js v22.12.0+** instalado (obrigatório para Vite 8/Vitest 4).
2. **pnpm v10.0.0+** como package manager do monorepo.
3. **Wrangler CLI v4.85.0+** configurado:
   ```bash
   pnpm install -g wrangler
   wrangler login
   ```

---

## 1. Configuração do Ambiente Local

### 1.1 Clonando e Instalando

```bash
git clone <repo-url>
cd fisioflow
pnpm install
```

### 1.2 Variáveis de Ambiente

Renomeie `.env.example` para `.env` no root e em `apps/api` e `apps/web`.

**Principais variáveis (Apps/API):**

- `DATABASE_URL`: Connection string do Neon PostgreSQL.
- `NEON_AUTH_URL`: Endpoint do seu projeto de autenticação Neon.
- `HYPERDRIVE_ID`: ID da configuração de pooling na Cloudflare.

---

## 2. Banco de Dados (Drizzle ORM v0.45.2)

O sistema utiliza Drizzle para gerenciamento de schema e migrações.

```bash
# Gerar arquivos de migração baseados no schema
pnpm db:generate

# Sincronizar schema com o banco de desenvolvimento
pnpm db:push

# Aplicar migrações pendentes ao banco de produção
pnpm db:migrate
```

---

## 3. Desenvolvimento e Deploy

### 3.1 Desenvolvimento Local

Rodar o monorepo com Turbo v2.8+:

```bash
pnpm dev
```

### 3.2 Deploy Backend (Workers)

```bash
cd apps/api
pnpm run deploy
```

### 3.3 Deploy Frontend (Pages)

```bash
cd apps/web
pnpm run build
wrangler pages deploy dist
```

---

## 4. Troubleshooting e Ferramentas

- **Drizzle Studio:** `pnpm db:studio` para visualizar o banco em uma interface web.
- **Node Version:** Se observar erro de execução, verifique se está usando Node 22.12+. Rodar `node -v` para conferir.

---

**Última atualização**: Abril 2026  
**Status**: ✅ Baseline v4.0.0 (Production Ready)
