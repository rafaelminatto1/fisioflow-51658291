# Observabilidade — FisioFlow

> Stack: Cloudflare Analytics Engine + Workers built-in logs  
> Última revisão: 2026-04-28  
> Dashboard operacional completo: `docs/OBSERVABILITY_DASHBOARD.md`

---

## Stack atual (sem Grafana/OTEL)

| Camada | Ferramenta | Status |
|---|---|---|
| Métricas e eventos | Cloudflare Analytics Engine | ✅ Ativo |
| Logs de Workers | `[observability] enabled = true` (wrangler.toml) | ✅ Ativo |
| Health checks | `/api/health` (liveness) + `/api/health/ready` (readiness) | ✅ Ativo |
| Alertas | Cloudflare Notifications (3 alertas — configurar manualmente) | ⏳ Pendente configuração |
| Tracing distribuído | Não implementado — não é necessário neste ciclo | — |

---

## Analytics Engine — eventos instrumentados

**Dataset:** `fisioflow_events`  
**Helper:** `src/lib/analytics.ts` — `writeEvent()` + `analyticsMiddleware()`

| Campo | Conteúdo |
|---|---|
| `blob1` | Rota normalizada (ex: `/api/appointments/:id`) |
| `blob2` | Método HTTP |
| `blob3` | `organization_id` do usuário |
| `blob4` | Tipo do evento (`request`, `whatsapp_sent`, `ai_call`) |
| `double1` | Latência em ms |
| `double2` | HTTP status code |
| `double3` | Valor extra (tokens, etc.) |

`analyticsMiddleware()` é aplicado globalmente no `apps/api/src/index.ts` — todos os requests são instrumentados automaticamente.

---

## Health checks

### Liveness — `GET /api/health`

Retorna `200` enquanto o Worker estiver de pé. Não verifica dependências.

### Readiness — `GET /api/health/ready`

Verifica DB (Neon/Hyperdrive) e KV (`FISIOFLOW_CONFIG`).

```json
// 200 — tudo ok
{ "status": "ready", "checks": { "db": "ok", "kv": "ok" }, "time": "..." }

// 503 — dependência degradada
{ "status": "degraded", "checks": { "db": "error", "kv": "ok" }, "time": "..." }
```

---

## SLOs definidos

| Métrica | Alvo | Medição |
|---|---|---|
| Latência p95 (fluxos críticos) | < 300 ms | Analytics Engine Query #1 |
| Taxa de erro 5xx | < 0,5% | Analytics Engine Query #2 |
| Disponibilidade mensal | > 99,9% | Analytics Engine Query #4 |
| Cold start Neon (p95) | < 3s | Latência de `/api/health/ready` após inatividade |

---

## Queries operacionais rápidas

Ver queries SQL completas em `docs/OBSERVABILITY_DASHBOARD.md`.

```bash
# Executar query via cURL
curl -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/analytics_engine/sql" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT blob1, count() FROM fisioflow_events WHERE timestamp > NOW() - INTERVAL '\''1'\'' HOUR GROUP BY blob1 ORDER BY count() DESC LIMIT 10"}'

# Durante incidente — rotas lentas (últimos 30 min)
# Ver Query #5 em docs/OBSERVABILITY_DASHBOARD.md
```

---

## Alertas a configurar (Cloudflare Dashboard → Notifications)

| Alerta | Trigger | Janela |
|---|---|---|
| Workers alto erro | Error rate > 1% | 5 min |
| Workers alta latência | P95 CPU > 50ms | 5 min |
| Disponibilidade | Health check `/api/health/ready` != 200 | > 2 min |

Setup detalhado em `docs/OBSERVABILITY_DASHBOARD.md`.

---

## Logs sensíveis — regras

- Nunca logar `DATABASE_URL`, tokens JWT, CPF, dados de prontuário
- Logar apenas: rota, método, status, latência, `organization_id` (nunca `user_id` em texto claro)
- Stack traces de erros internos: apenas em `wrangler tail --env production` (nunca no response body)
- Endpoint `/api/health/db` não expõe `stack` no response (removido na Fase 4)

---

## Baselining

Execute as Queries #1 e #4 de `docs/OBSERVABILITY_DASHBOARD.md` durante 2 semanas antes de ajustar os thresholds dos alertas. Os SLOs acima são metas iniciais — calibrar com dados reais após 14 dias de produção estável.
