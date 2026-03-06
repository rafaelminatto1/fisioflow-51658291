# Plano de Fechamento da Migracao Cloudflare + Neon (2026)

> Data de referencia: 5 de marco de 2026
> Escopo: consolidar migracao para Cloudflare Pages + Workers + Neon Auth/JWT + Neon PostgreSQL

## Atualizacao (6 de marco de 2026)

- Corrigido risco de `401` generalizado no Worker por mismatch de `issuer` JWT Neon:
  - `workers/src/lib/auth.ts` agora valida token com fallback entre `NEON_AUTH_ISSUER` e issuer derivado da JWKS.
  - `workers/wrangler.toml` atualizado para issuer completo (`.../neondb/auth`).
- Corrigido risco de loop infinito por chunks com MIME invalido:
  - `public/sw.js` nao cacheia mais resposta HTML para requests `.js/.css/font`.
  - `CACHE_VERSION` incrementada para invalidar cache antigo.
  - `src/main.tsx` ganhou guard de reload unico em erro de chunk dinâmico.
- Politica de cache para Pages adicionada:
  - `public/_headers` com `index.html` e `sw.js` sem cache e assets com cache imutavel.

Status geral pos-atualizacao: `ESTABILIZACAO EM PRODUCAO (em validacao final)`.

## 1) Estado Atual (confirmado)

- Frontend em Cloudflare Pages com `VITE_NEON_AUTH_URL` embutida no bundle de producao.
- API em Cloudflare Workers com `NEON_AUTH_JWKS_URL` configurada.
- Endpoints protegidos (`/api/patients`, `/api/appointments`) exigem JWT Neon.
- Migration `0003_patients_appointments.sql` ja existe no projeto e tabela/rotas estao ativas no Worker.

## 2) Objetivo de Fechamento

- Encerrar dependencias operacionais de Firebase para fluxos core de autenticacao, pacientes e agenda.
- Finalizar migracao de midia para Cloudflare R2.
- Reduzir suite E2E para pacote critico de deploy.
- Publicar runbook unico de verificacao pos-deploy.

## 3) Plano por Fases

### Fase A - Hardening de Deploy (0-1 dia)

- Padronizar verificacao com comando unico:
  - `pnpm migration:verify`
- Validar em toda release:
  - frontend no ar
  - bundle com host Neon Auth
  - healthcheck da API
  - rota protegida respondendo `401` sem token

Status: `EM ANDAMENTO` (script adicionado nesta entrega).

### Fase B - Midia para R2 (1-2 dias)

- Rodar dry-run:
  - `node scripts/migrate-images-to-r2.mjs --dry-run --limit=50`
- Rodar lote real por tabela:
  - `--table=exercises`
  - `--table=patients`
  - `--table=session_attachments`
  - `--table=sessions`
- Validar amostra de URLs apos update no Neon.

Status: `CONCLUIDO (dry-run em 5/3/2026 sem registros pendentes)`.
Dependencias: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL`.

### Fase C - Fluxos legados Firestore (2-4 dias)

- Migrar workflows Inngest que ainda leem colecoes Firestore:
  - `src/inngest/workflows/appointments.ts`
  - `src/inngest/workflows/reactivation.ts`
  - `src/inngest/workflows/daily-reports.ts`
  - `src/inngest/workflows/birthdays.ts`
  - `src/inngest/workflows/data-integrity.ts`
  - `src/inngest/workflows/feedback.ts`
  - `src/inngest/workflows/ai-insights.ts`
  - `src/inngest/workflows/weekly-summary.ts`
- Trocar consultas `db.collection(...)` por leitura Neon (via Worker ou acesso SQL controlado).

Status: `CONCLUIDO (5/3/2026)`.

Backlog confirmado (5/3/2026): 15 pontos de leitura Firestore para `patients/appointments` em 8 arquivos de workflow.
Backlog remanescente apos execucao: `0` referencias em `src/inngest/workflows`.

### Fase D - Suite E2E critica (1-2 dias)

- Definir suite enxuta para deploy:
  - Auth
  - Patients CRUD basico
  - Appointments CRUD basico
  - Upload em R2
- Publicar comando oficial de gate:
  - `pnpm test:e2e:critical`
  - `pnpm test:e2e:deploy-gate` (suite minima de deploy)

Status: `CONCLUIDO (suite minima validada em producao em 5/3/2026)`.

## 4) Definicao de Pronto da Migracao

A migracao sera considerada encerrada quando:

1. `pnpm migration:verify` passar em producao.
2. 100% das URLs de midia ativas estiverem em R2.
3. Workflows Inngest criticos nao dependerem de `patients/appointments` no Firestore.
4. Gate E2E critico for executado em toda release de producao.

## 5) Comandos Operacionais

- Verificacao rapida:
  - `pnpm migration:verify`
- Build frontend:
  - `pnpm build`
- Deploy Worker:
  - `pnpm workers:deploy`
- Deploy Pages:
  - `npx wrangler pages deploy . --cwd dist --project-name=fisioflow --branch main --commit-dirty=true`
