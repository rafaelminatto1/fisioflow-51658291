# Postman — FisioFlow API

Workspace Postman: `My Workspace` (`aeaca0d3-1d38-4f49-8769-53072bb670cf`).

## Conteúdo

- `collections/fisioflow-api.postman_collection.json` — coleção da API (Cloudflare Worker / Hono).
  Auth de coleção = `Bearer {{jwt}}`; base = `{{baseUrl}}`. 39 requests em 16 folders: Health,
  Patients, Appointments, Sessions, Exercises, Boards & Tarefas, Clinical, Financial, Packages,
  Reports, Commissions, NFS-e, CRM, Marketing, Gamification, AI. Paths derivados de `apps/api/src/routes/*`.
- `collections/fisioflow-health.postman_collection.json` — coleção enxuta (3 health checks) usada pelo monitor.
- `environments/FisioFlow — Prod.environment.yaml` — `baseUrl=https://fisioflow-api.rafalegollas.workers.dev`
- `environments/FisioFlow — Local.environment.yaml` — `baseUrl=http://localhost:8787` (`pnpm workers:dev`)

Cada request tem testes herdados da coleção: `status < 500` e `resposta < 5s`.

## Monitor de uptime

`FisioFlow API — Health (6h)` — roda a coleção de health a cada 6h (cron `0 */6 * * *`,
TZ America/Sao_Paulo) contra o env Prod, com alerta por email em falha/erro. Criado via API
(o token OAuth do MCP não tem escopo de monitor; use a PMAK p/ gerenciar monitores).

## Como usar

### App Postman

1. Selecione o workspace e o environment **FisioFlow — Prod** (ou Local).
2. Cole seu JWT do Neon Auth na variável `jwt` (tipo _secret_).
3. Rode os requests. Os de `Health` são públicos (sem auth).

### CLI (Postman CLI já logado)

```bash
# roda contra o environment na nuvem (por UID), publica resultado no Postman
postman collection run 55899690-56a0b57d-874f-4a21-9e6b-865078e8dfc3 \
  -e 55899690-0c638ab8-9628-4f8b-9c5f-f0cd96227925

# roda a partir dos arquivos versionados (sem JWT → protegidos retornam 401, que é esperado)
postman collection run postman/collections/fisioflow-api.postman_collection.json
```

> Para exercitar endpoints autenticados via CLI, exporte o JWT na env e use um environment
> com `jwt` preenchido (não comite o token).

## Pegar um JWT

O token é o access token do Neon Auth (mesmo usado pelo dashboard). Em DevTools do app logado:
`authClient.token()` ou o header `Authorization: Bearer ...` de qualquer chamada à API.

## Spec (Spec Hub)

Existe um Spec `FisioFlow API` (OpenAPI 3.1) no workspace, criado a partir de
`src/docs/openapi.yaml` (40 operations, 16 tags, server URLs reais do Worker, `bearerAuth` JWT).
Mantenha os dois em sincronia ao adicionar rotas. Para gerar uma collection a partir do Spec,
use _Generate collection_ no Spec Hub (ou o MCP `generateCollection`).

## Sync com a nuvem

O MCP do Postman (Claude Code) e a CLI editam o mesmo workspace. `.postman/resources.yaml`
mapeia os recursos locais para versionamento. A CLI mantém environments em `.environment.yaml`.
