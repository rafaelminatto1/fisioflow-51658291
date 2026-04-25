# Secrets & Variables para GitHub Actions

Configure em: **Settings → Secrets and variables → Actions**

> Stack: 100% Neon DB + Cloudflare. Sem Firebase, Firestore ou GCloud.

## Secrets (valores sensíveis)

| Secret                   | Descrição                                                    | Obrigatório |
| ------------------------ | ------------------------------------------------------------ | ----------- |
| `CF_API_TOKEN`           | Cloudflare API Token com permissão Workers:Edit              | ✅ Deploy   |
| `CF_ACCOUNT_ID`          | Cloudflare Account ID                                        | ✅ Deploy   |
| `NEON_API_KEY`           | Neon API Key (para criar/deletar branches de preview em PRs) | PRs         |
| `VITE_GOOGLE_AI_API_KEY` | Google AI / Gemini API Key (AI features)                     | Deploy      |

## Variables (valores públicos)

| Variable                 | Valor                                                                              | Descrição                 |
| ------------------------ | ---------------------------------------------------------------------------------- | ------------------------- |
| `NEON_PROJECT_ID`        | `purple-union-72678311`                                                            | ID do projeto Neon        |
| `VITE_NEON_AUTH_URL`     | `https://ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1.aws.neon.tech/neondb/auth` | Neon Auth URL             |
| `VITE_NEON_DATA_API_URL` | _(URL do Data API Neon, se habilitado)_                                            | Neon Data API (PostgREST) |

## Como obter CF_API_TOKEN

1. [dash.cloudflare.com](https://dash.cloudflare.com) → My Profile → API Tokens
2. Create Token → Edit Cloudflare Workers template
3. Scope: Account → sua conta

## Como obter NEON_API_KEY

1. [console.neon.tech](https://console.neon.tech) → Account → API Keys
2. Create key com permissão de leitura/escrita

## Migrações

Migrações **não rodam automaticamente** no CI. Para aplicar manualmente:

```bash
DATABASE_URL="postgresql://..." pnpm db:migrate
```
