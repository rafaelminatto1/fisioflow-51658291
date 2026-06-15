# R2 Data Catalog Sink — Provisioning (S6.2 Fase 3)

## Status atual (2026-05-19) — INFRA PROVISIONADA ✅

| Recurso                                                    | Prod                                 | Staging                                   |
| ---------------------------------------------------------- | ------------------------------------ | ----------------------------------------- |
| Bucket R2                                                  | `fisioflow-archive`                  | `fisioflow-archive-staging`               |
| Data Catalog                                               | enabled                              | enabled                                   |
| Sink Iceberg                                               | `fisioflow_sessions_archive_sink`    | `fisioflow_sessions_archive_sink_staging` |
| Pipeline (SQL `INSERT INTO sink SELECT value FROM stream`) | `fisioflow_archive_pipeline`         | `fisioflow_archive_pipeline_staging`      |
| Tabela Iceberg destino                                     | `fisioflow_archive.sessions_archive` | `fisioflow_archive.sessions_archive`      |

**Token usado** (Workers R2 Storage:Edit + Workers R2 Data Catalog:Write) — guardado no `.env.cloudflare.local` localmente (gitignored). Para refazer/rotacionar, criar novo no dashboard com essas 2 permissões Account-level.

**Próximo passo**: deploy do Worker (`pnpm deploy:api:staging`) + validar:

```bash
curl -X POST https://fisioflow-api-staging.rafalegollas.workers.dev/api/admin/trigger-session-archive \
  -H "Authorization: Bearer <JWT>"
# espera resposta com status=success e rowsSent > 0
```

A doc abaixo é a referência caso precise refazer (DR, conta nova, etc.).

---

## Pré-requisitos

- Conta CF com R2 Data Catalog habilitado (gratuito, beta GA 2026-05-14)
- `wrangler` autenticado (`wrangler login` ou `CLOUDFLARE_API_TOKEN` no env)
- R2 bucket existente: `fisioflow-archive` (criar antes se não existe)

## Passo 1 — Criar bucket R2 (se não existe)

```bash
wrangler r2 bucket create fisioflow-archive
# staging:
wrangler r2 bucket create fisioflow-archive-staging
```

## Passo 2 — Habilitar Data Catalog no bucket

```bash
wrangler r2 bucket catalog enable fisioflow-archive
wrangler r2 bucket catalog enable fisioflow-archive-staging
```

Retorna `WAREHOUSE` (formato `<account_id>_<bucket>`) — anotar.

## Passo 3 — Criar token de catálogo (escopo R2)

Via dashboard CF → API Tokens → Create → use template "Edit R2 Storage" (cobre Data Catalog).
Anotar como `WRANGLER_R2_SQL_AUTH_TOKEN`.

## Passo 4 — Criar sink Iceberg apontado ao bucket

```bash
export WRANGLER_R2_SQL_AUTH_TOKEN="cfut_..."

# Produção
wrangler pipelines sinks create fisioflow-sessions-archive-sink \
  --type r2-data-catalog \
  --bucket fisioflow-archive \
  --namespace fisioflow_archive \
  --table sessions_archive \
  --catalog-token "$WRANGLER_R2_SQL_AUTH_TOKEN"

# Staging
wrangler pipelines sinks create fisioflow-sessions-archive-sink-staging \
  --type r2-data-catalog \
  --bucket fisioflow-archive-staging \
  --namespace fisioflow_archive \
  --table sessions_archive \
  --catalog-token "$WRANGLER_R2_SQL_AUTH_TOKEN"
```

O sink cria namespace + tabela Iceberg automaticamente. Schema inferido dos primeiros eventos enviados.

## Passo 5 — Apontar o pipeline `EVENTS_PIPELINE` ao sink

Verifique o pipeline atual (em `apps/api/wrangler.toml`):

- staging: `cbf62503169e4dadacbcb72b0534100f`
- produção: configurado em `[[env.production.pipelines]]`

Adicione o sink ao pipeline:

```bash
wrangler pipelines update <PIPELINE_ID> \
  --sink fisioflow-sessions-archive-sink
```

(Sintaxe exata pode variar — checar `wrangler pipelines update --help`.)

## Passo 6 — Validar com trigger manual

Após deploy do Worker com migration 0095:

```bash
# Como admin autenticado
curl -X POST https://fisioflow-api-staging.rafalegollas.workers.dev/api/admin/trigger-session-archive \
  -H "Authorization: Bearer $NEON_AUTH_JWT"
```

Resposta esperada:

```json
{
  "data": {
    "runId": 1,
    "rowsEligible": 12,
    "rowsSent": 12,
    "rowsMarked": 12,
    "status": "success"
  }
}
```

## Passo 7 — Verificar dados no R2 SQL

```bash
wrangler r2 sql query "SELECT count() FROM fisioflow_archive.sessions_archive" \
  --warehouse "<WAREHOUSE>"
```

Deve retornar a soma das linhas enviadas.

## Rollback

Se algo der errado:

```sql
-- Marcar sessoes como nao arquivadas (vai re-enviar no proximo run)
UPDATE public.sessions SET archived_at = NULL WHERE archived_at IS NOT NULL;
-- Limpar audit
TRUNCATE public.session_archive_runs;
```

Deletar sink:

```bash
wrangler pipelines sinks delete fisioflow-sessions-archive-sink
```

Bucket R2 pode ser purgado via `wrangler r2 bucket delete`.

## Notas

- **Schema evolution**: ao adicionar coluna em `sessions`, próximo batch propaga via Iceberg automaticamente.
- **Custo**: R2 Storage $0.015/GB-mês + classe A $4.50/M ops. Para 100K sessões/mês com ~5KB cada = ~500MB/mês = praticamente zero.
- **Retenção**: 20 anos sem job de purga. Manualmente, após esse prazo:
  ```sql
  DELETE FROM public.sessions WHERE archived_at < now() - interval '20 years';
  ```
  Tabela Iceberg suporta `DELETE FROM` via R2 SQL.
