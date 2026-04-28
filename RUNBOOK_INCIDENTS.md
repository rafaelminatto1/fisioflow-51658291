# Runbook de Resposta a Incidentes — FisioFlow

> **Responsável:** Tech Lead  
> **Última revisão:** 2026-04-28  
> **Canal de incidentes:** WhatsApp grupo tech (definir canal formal em D7 do TECHNICAL_PLAN.md)

---

## Severidades

| Nível | Descrição | Tempo de resposta inicial | Tempo de resolução alvo |
|---|---|---|---|
| **P1 — Crítico** | Sistema indisponível ou dados de pacientes expostos | < 15 min | < 2 h |
| **P2 — Alto** | Feature crítica quebrada (agendamento, prontuário, auth) | < 30 min | < 4 h |
| **P3 — Médio** | Feature não-crítica degradada, lentidão parcial | < 2 h | < 24 h |
| **P4 — Baixo** | Bug cosmético, feature menor | < 24 h | Próximo sprint |

---

## Checklist de Resposta Inicial (T0 — primeiros 15 min)

```
[ ] 1. Confirmar o incidente (não é falso positivo)
[ ] 2. Classificar severidade (P1/P2/P3/P4)
[ ] 3. Notificar canal de incidentes com: o que, quando, impacto estimado
[ ] 4. Verificar health checks:
        curl https://api-pro.moocafisio.com.br/api/health
        curl https://api-pro.moocafisio.com.br/api/health/ready
[ ] 5. Verificar Cloudflare dashboard: Workers / Pages / DNS
[ ] 6. Verificar Neon Console: endpoint status, conexões ativas
[ ] 7. Abrir ticket de incidente (GitHub Issue com label `incident`)
```

---

## Cenários Comuns e Playbooks

### Cenário 1 — API retornando 5xx em todas as rotas

**Sintomas:** `/api/health` retorna 503 ou timeout.

```bash
# 1. Verificar logs do Worker
wrangler tail --env production --format pretty

# 2. Verificar deploy recente
git log --oneline -5

# 3. Rollback se deploy causou o problema
wrangler deploy --env production  # reverter para commit anterior
# OU via Cloudflare dashboard: Workers > fisioflow-api > Deployments > Rollback

# 4. Verificar Neon DB
# Neon Console → Project → Endpoints → verificar se endpoint está ativo
# Se suspended: aguardar wake (< 30s) ou aumentar suspend_timeout_seconds
```

---

### Cenário 2 — Falha de autenticação (401 em todas as rotas protegidas)

**Sintomas:** Usuários relatam "sessão expirada", loop de login.

```bash
# 1. Verificar JWKS endpoint do Neon Auth
curl https://ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1.aws.neon.tech/neondb/auth/.well-known/jwks.json

# 2. Verificar variáveis de ambiente do Worker
wrangler secret list --env production

# 3. Se NEON_AUTH_JWKS_URL mudou, atualizar via:
wrangler secret put NEON_AUTH_JWKS_URL --env production

# 4. Forçar re-deploy para recarregar variáveis
wrangler deploy --env production
```

---

### Cenário 3 — Banco de dados lento (latência > 2s nas queries)

**Sintomas:** p95 > 2s no Analytics Engine, usuários relatam lentidão.

```bash
# 1. Query Analytics Engine para identificar rotas lentas
# POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/analytics_engine/sql
# Authorization: Bearer {CF_API_TOKEN}
# Body:
SELECT blob1 AS route, quantileWeighted(0.95)(double1,1) AS p95_ms, count() AS requests
FROM fisioflow_events
WHERE timestamp > NOW() - INTERVAL '1' HOUR
GROUP BY blob1
ORDER BY p95_ms DESC
LIMIT 20

# 2. Verificar Neon Console → Monitoring → slow queries

# 3. Se cold start: pg_prewarm manual
# Neon Console → SQL Editor:
SELECT pg_prewarm('appointments');
SELECT pg_prewarm('patients');
SELECT pg_prewarm('sessions');

# 4. Se problema de connection pool:
# Verificar Hyperdrive status no Cloudflare dashboard
# Recriar conexão se necessário: wrangler hyperdrive update {ID}
```

---

### Cenário 4 — Deploy falhou no CI

**Sintomas:** GitHub Actions CI vermelho, `deploy-api` ou `deploy-web` com erro.

```bash
# 1. Ver logs do job no GitHub Actions

# 2. Erro de typecheck:
pnpm type-check  # rodar localmente para ver erros

# 3. Erro de lint:
pnpm lint

# 4. Erro de testes:
pnpm --filter @fisioflow/api test:unit

# 5. Erro de wrangler deploy:
wrangler deploy --env production --dry-run  # testar localmente

# 6. Verificar secrets do CI:
# GitHub → Settings → Secrets → Actions → verificar CF_API_TOKEN, CF_ACCOUNT_ID
```

---

### Cenário 5 — Vazamento de dados / segurança

**Sintomas:** Acesso não autorizado, dados de outro tenant visíveis, secret exposto.

```
[ ] 1. IMEDIATAMENTE: rotacionar o secret comprometido (ver PLAYBOOK_SECRETS_ROTATION.md)
[ ] 2. Revogar tokens de API afetados no Neon Console e Cloudflare
[ ] 3. Verificar logs de acesso para determinar escopo do vazamento:
        - Analytics Engine: queries por orgId nas últimas 24h
        - Neon Console: connection logs
[ ] 4. Notificar usuários afetados se dados clínicos foram expostos (LGPD)
[ ] 5. Documentar no postmortem: causa raiz, dados afetados, ações tomadas
[ ] 6. Abrir GitHub Issue com label `security` e `incident` (conteúdo privado)
```

---

## Pós-Incidente (T3 — até 24h após resolução)

```
[ ] Postmortem escrito e compartilhado com o time
[ ] Causa raiz identificada
[ ] Runbook atualizado com novo cenário se necessário
[ ] Ticket de melhoria criado para prevenir recorrência
[ ] GitHub Issue do incidente fechado com link para postmortem
```

### Template de Postmortem

```markdown
## Postmortem — [Título do Incidente] — YYYY-MM-DD

**Duração:** HH:MM – HH:MM (X minutos)
**Severidade:** P1/P2/P3
**Impacto:** [Quem foi afetado e como]

### Linha do Tempo
- HH:MM — Incidente iniciado
- HH:MM — Detectado por [quem/como]
- HH:MM — Resposta iniciada
- HH:MM — Causa raiz identificada
- HH:MM — Resolução aplicada
- HH:MM — Sistema estabilizado

### Causa Raiz
[Descrição técnica objetiva]

### O que foi feito
[Ações de mitigação e resolução]

### O que evitar
[Mudanças de processo ou código para prevenir recorrência]

### Itens de ação
- [ ] [Tarefa] — Owner: [Nome] — Prazo: [Data]
```

---

## Contatos e Recursos

| Recurso | URL / Comando |
|---|---|
| Cloudflare Dashboard | `https://dash.cloudflare.com` |
| Neon Console | `https://console.neon.tech` |
| Workers Tail (prod) | `wrangler tail --env production` |
| Analytics Engine (SQL) | Ver `docs/OBSERVABILITY_DASHBOARD.md` |
| Health API (liveness) | `curl https://api-pro.moocafisio.com.br/api/health` |
| Health API (readiness) | `curl https://api-pro.moocafisio.com.br/api/health/ready` |
| GitHub Actions | `https://github.com/{org}/{repo}/actions` |
