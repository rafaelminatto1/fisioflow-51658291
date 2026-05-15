# Playbook de Rotação de Segredos — FisioFlow

> **Responsável:** Tech Lead  
> **Última revisão:** 2026-04-28  
> **Frequência recomendada:** A cada 90 dias ou imediatamente após suspeita de comprometimento

---

## Regras Gerais

- Nunca commitar segredos no código — usar `wrangler secret put` ou GitHub Secrets
- Arquivos `.dev.vars` e `.env` são gitignored — verificar com `git status` antes de commitar
- Após rotação de qualquer segredo, fazer re-deploy do Worker afetado
- Registrar data da rotação neste documento (não o valor)

---

## Inventário de Segredos

### Workers (Cloudflare) — via `wrangler secret put`

| Segredo                 | Serviço              | Usado em                       | Rotacionar a cada                |
| ----------------------- | -------------------- | ------------------------------ | -------------------------------- |
| `DATABASE_URL`          | Neon PostgreSQL      | `apps/api`                     | 90 dias ou se comprometido       |
| `NEON_AUTH_JWKS_URL`    | Neon Auth            | `apps/api`                     | Raro (muda só se endpoint mudar) |
| `CF_API_TOKEN`          | Cloudflare API       | CI/CD, `.env.cloudflare.local` | 90 dias                          |
| `AXIOM_TOKEN`           | Axiom Logging        | `apps/api`                     | 90 dias                          |
| `TURNSTILE_SECRET_KEY`  | Cloudflare Turnstile | `apps/api`                     | 90 dias                          |
| `INNGEST_EVENT_KEY`     | Inngest              | `apps/api`                     | 90 dias                          |
| `INNGEST_SIGNING_KEY`   | Inngest              | `apps/api`                     | 90 dias                          |
| `WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp        | `apps/api`                     | 60 dias                          |
| `LIVEKIT_API_SECRET`    | LiveKit              | `apps/api`                     | 90 dias                          |

### GitHub Actions — via GitHub Settings → Secrets → Actions

| Segredo                      | Usado em              |
| ---------------------------- | --------------------- |
| `CF_API_TOKEN`               | Deploy CI             |
| `CF_ACCOUNT_ID`              | Deploy CI             |
| `PROD_TEST_USER_EMAIL`       | Smoke test pós-deploy |
| `PROD_TEST_USER_PASSWORD`    | Smoke test pós-deploy |
| `STAGING_TEST_USER_EMAIL`    | E2E smoke em PRs      |
| `STAGING_TEST_USER_PASSWORD` | E2E smoke em PRs      |
| `VITE_GOOGLE_AI_API_KEY`     | Build web (Google AI) |

---

## Procedimento Padrão de Rotação

### 1. Rotacionar `DATABASE_URL` (Neon)

```bash
# 1. Neon Console → Project → Branches → production → Connection string
# 2. Gerar nova password: Neon Console → Settings → Roles → Reset password
# 3. Atualizar no Worker:
wrangler secret put DATABASE_URL --env production
# (colar nova connection string quando solicitado)

# 4. Atualizar no staging:
wrangler secret put DATABASE_URL --env staging

# 5. Re-deploy:
wrangler deploy --env production

# 6. Verificar:
curl https://api-pro.moocafisio.com.br/api/health/ready
```

---

### 2. Rotacionar `CF_API_TOKEN` (Cloudflare)

```bash
# 1. Cloudflare Dashboard → My Profile → API Tokens → Create Token
#    Permissões mínimas: Workers Scripts:Edit, Pages:Edit, Account:Read
# 2. Revogar token antigo na mesma tela
# 3. Atualizar no GitHub:
#    Repo → Settings → Secrets → Actions → CF_API_TOKEN → Update
# 4. Atualizar localmente em `.env.cloudflare.local` ou via `wrangler login` (se usar CLI)
# 5. Testar CI: acionar workflow_dispatch no GitHub Actions
```

---

### 3. Rotacionar `AXIOM_TOKEN` (Logging)

```bash
# 1. Axiom Console → Settings → API Tokens → Create new
# 2. Revogar token antigo
# 3. Atualizar no Worker:
wrangler secret put AXIOM_TOKEN --env production
wrangler secret put AXIOM_TOKEN --env staging
# 4. Re-deploy para ativar novo token:
wrangler deploy --env production
```

---

### 4. Rotacionar `WHATSAPP_ACCESS_TOKEN` (Meta)

```bash
# 1. Meta for Developers → App → WhatsApp → Configuration → Generate token
# 2. Atualizar:
wrangler secret put WHATSAPP_ACCESS_TOKEN --env production
# 3. Verificar webhook com uma mensagem de teste
```

---

### 5. Rotação de Emergência (segredo comprometido)

```bash
# Executar nesta ordem:
# 1. Revogar imediatamente o segredo no provedor (Neon, Cloudflare, Meta, etc.)
# 2. Gerar novo segredo no provedor
# 3. Atualizar no Worker/CI conforme procedimento específico acima
# 4. Re-deploy imediato do Worker afetado
# 5. Verificar health checks
# 6. Revisar logs das últimas 24h no Analytics Engine para detectar uso indevido:

# Query Analytics Engine (POST via CF API):
# SELECT blob3 AS orgId, blob1 AS route, count() AS requests
# FROM fisioflow_events
# WHERE timestamp > NOW() - INTERVAL '24' HOUR
# ORDER BY requests DESC

# 7. Registrar no RUNBOOK_INCIDENTS.md como Cenário 5
```

---

## Registro de Rotações

| Data       | Segredo    | Motivo               | Feito por |
| ---------- | ---------- | -------------------- | --------- |
| 2026-04-28 | (baseline) | Documentação inicial | Tech Lead |

> Atualizar esta tabela a cada rotação. Não registrar os valores, apenas metadados.

---

## Checklist Pré-Rotação

```
[ ] Identificar todos os serviços que usam o segredo
[ ] Garantir que o novo segredo foi gerado mas não ativado ainda
[ ] Planejar janela de manutenção se a rotação causar downtime
[ ] Ter rollback pronto (segredo antigo temporariamente disponível)
[ ] Comunicar ao time antes de rotacionar em produção
```

## Checklist Pós-Rotação

```
[ ] Revogar segredo antigo no provedor
[ ] Verificar health check: curl https://api-pro.moocafisio.com.br/api/health/ready
[ ] Verificar que CI ainda passa (acionar workflow_dispatch)
[ ] Atualizar tabela de Registro de Rotações acima
[ ] Atualizar .dev.vars local se necessário (nunca commitar)
```
