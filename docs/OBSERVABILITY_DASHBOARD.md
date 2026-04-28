# Observabilidade — Dashboard e Alertas FisioFlow

> Analytics Engine dataset: `fisioflow_events`  
> Retenção: 3 meses | Limite gratuito: 100K eventos/dia  
> API endpoint: `POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/analytics_engine/sql`

---

## Layout dos Campos (Analytics Engine)

| Campo | Tipo | Conteúdo |
|---|---|---|
| `blob1` | string | Rota normalizada (ex: `/api/appointments/:id`) |
| `blob2` | string | Método HTTP (GET, POST, etc.) |
| `blob3` | string | `organization_id` do usuário autenticado |
| `blob4` | string | Tipo do evento (`request`, `whatsapp_sent`, `ai_call`) |
| `double1` | number | Latência em ms |
| `double2` | number | HTTP status code |
| `double3` | number | Valor extra (ex: tokens usados) |
| `indexes` | string | `organization_id` (para particionamento) |

---

## Queries SQL Operacionais

### 1. Latência p95 por rota (últimas 24h)

```sql
SELECT
  blob1 AS route,
  blob2 AS method,
  count() AS requests,
  quantileWeighted(0.50)(double1, 1) AS p50_ms,
  quantileWeighted(0.95)(double1, 1) AS p95_ms,
  quantileWeighted(0.99)(double1, 1) AS p99_ms
FROM fisioflow_events
WHERE timestamp > NOW() - INTERVAL '24' HOUR
  AND blob4 = 'request'
GROUP BY route, method
ORDER BY p95_ms DESC
LIMIT 30
```

**SLO alvo:** p95 < 300ms para fluxos críticos

---

### 2. Taxa de erro 5xx por rota (últimas 1h)

```sql
SELECT
  blob1 AS route,
  count() AS total_requests,
  countIf(double2 >= 500) AS errors_5xx,
  round(countIf(double2 >= 500) / count() * 100, 2) AS error_rate_pct
FROM fisioflow_events
WHERE timestamp > NOW() - INTERVAL '1' HOUR
  AND blob4 = 'request'
GROUP BY route
HAVING errors_5xx > 0
ORDER BY error_rate_pct DESC
```

**SLO alvo:** taxa 5xx < 0,5% (global)

---

### 3. Volume de requests por organização (últimas 24h)

```sql
SELECT
  blob3 AS org_id,
  count() AS requests,
  countIf(double2 >= 500) AS errors,
  quantileWeighted(0.95)(double1, 1) AS p95_ms
FROM fisioflow_events
WHERE timestamp > NOW() - INTERVAL '24' HOUR
  AND blob4 = 'request'
  AND blob3 != ''
GROUP BY org_id
ORDER BY requests DESC
LIMIT 20
```

---

### 4. Disponibilidade geral (últimos 7 dias)

```sql
SELECT
  toDate(timestamp) AS day,
  count() AS total,
  countIf(double2 < 500) AS success,
  round(countIf(double2 < 500) / count() * 100, 3) AS availability_pct
FROM fisioflow_events
WHERE timestamp > NOW() - INTERVAL '7' DAY
  AND blob4 = 'request'
GROUP BY day
ORDER BY day DESC
```

**SLO alvo:** disponibilidade > 99,9% (mensal)

---

### 5. Rotas mais lentas (últimos 30 min — usar durante incidentes)

```sql
SELECT
  blob1 AS route,
  count() AS requests,
  quantileWeighted(0.95)(double1, 1) AS p95_ms,
  max(double1) AS max_ms
FROM fisioflow_events
WHERE timestamp > NOW() - INTERVAL '30' MINUTE
GROUP BY route
HAVING p95_ms > 500
ORDER BY p95_ms DESC
```

---

### 6. Eventos WhatsApp e AI (últimas 24h)

```sql
SELECT
  blob4 AS event_type,
  count() AS total,
  quantileWeighted(0.95)(double1, 1) AS p95_ms
FROM fisioflow_events
WHERE timestamp > NOW() - INTERVAL '24' HOUR
  AND blob4 IN ('whatsapp_sent', 'ai_call', 'appointment_booked')
GROUP BY event_type
ORDER BY total DESC
```

---

## Como Executar Queries

### Via cURL

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/analytics_engine/sql" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT blob1, count() FROM fisioflow_events WHERE timestamp > NOW() - INTERVAL '\''1'\'' HOUR GROUP BY blob1 ORDER BY count() DESC LIMIT 10"}'
```

### Via Cloudflare Dashboard

1. Cloudflare Dashboard → Account → Analytics Engine
2. Selecionar dataset `fisioflow_events`
3. Colar query SQL no editor

---

## Configuração de Alertas no Cloudflare

> Cloudflare Dashboard → Notifications → Add Notification

### Alerta 1 — Workers alto erro (5xx)

| Campo | Valor |
|---|---|
| **Tipo** | Workers Usage |
| **Trigger** | Error rate > 1% |
| **Janela** | 5 minutos |
| **Canal** | Email / Webhook |

### Alerta 2 — Workers alta latência

| Campo | Valor |
|---|---|
| **Tipo** | Workers Usage |
| **Trigger** | P95 CPU Time > 50ms (proxy para latência alta) |
| **Janela** | 5 minutos |
| **Canal** | Email / Webhook |

### Alerta 3 — Disponibilidade abaixo do SLO

| Campo | Valor |
|---|---|
| **Tipo** | Health Check Alert |
| **Endpoint** | `https://api-pro.moocafisio.com.br/api/health/ready` |
| **Trigger** | Status != 200 por > 2 minutos |
| **Canal** | Email / Webhook |

> **Setup:** Cloudflare Dashboard → Traffic → Health Checks → Create  
> Method: GET | Path: `/api/health/ready` | Interval: 60s | Threshold: 2 failures

---

## SLOs Definidos

| Métrica | Alvo | Como medir |
|---|---|---|
| Latência p95 (fluxos críticos) | < 300ms | Query #1 acima |
| Taxa de erro 5xx | < 0,5% | Query #2 acima |
| Disponibilidade mensal | > 99,9% | Query #4 acima |
| Cold start Neon (p95) | < 3s | Latência de `/api/health/db` após inatividade |

---

## Baselining (Medir Antes de Definir Alertas)

Execute a Query #1 e #4 durante 2 semanas para estabelecer o baseline real antes de ajustar os thresholds dos alertas.
