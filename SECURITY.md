# Segurança — FisioFlow

> Última revisão: 2026-04-28  
> Runbook de incidentes: `RUNBOOK_INCIDENTS.md`  
> Rotação de segredos: `PLAYBOOK_SECRETS_ROTATION.md`

---

## Stack de segurança atual

| Controle | Implementação | Status |
|---|---|---|
| Autenticação | Neon Auth (JWT EdDSA / JWKS) | ✅ Ativo |
| Autorização | RBAC por role + RLS Neon | ✅ Ativo |
| SAST | CodeQL (`javascript-typescript`, `security-and-quality`) | ✅ CI ativo |
| Secret scan | TruffleHog OSS `--only-verified` | ✅ CI ativo |
| Dependency audit | `pnpm audit --audit-level=high` | ✅ CI bloqueante |
| CORS | Validação contra `env.ALLOWED_ORIGINS` (CSV) | ✅ Ativo |
| Rate limiting | D1 `fisioflow-edge-cache` (upsert atômico) | ✅ Ativo |
| TLS | Cloudflare edge (1.2+) | ✅ Automático |

---

## RBAC — Roles definidos

| Role | Acesso |
|---|---|
| `admin` | Tudo — todas as rotas e dados |
| `fisioterapeuta` | Dados clínicos (pacientes, sessões, agendamentos, prescrições) — **sem** CRM, marketing, financeiro |
| `estagiario` | Mesmas permissões que fisioterapeuta (sem restrições adicionais neste ciclo) |
| `paciente` | Apenas próprios dados e sessões — sem agendamento próprio ainda |
| `viewer` | Fallback de segurança — acesso somente leitura mínimo |

**Implementação:** `apps/api/src/lib/auth.ts` — `requireAuth()` retorna 401 real (não 403 silencioso).  
Role fallback = `'viewer'` (nunca `'admin'`).

---

## Row-Level Security (RLS)

RLS ativo em todas as tabelas com dados de pacientes.  
Migration: `0057_rls_complete.sql` — confirmada aplicada em produção.

Tabelas protegidas: `appointments`, `sessions`, `patients`, `documents`, `exams`, `goals`, `exercise_plans`, `standardized_test_results`, e demais tabelas clínicas.

**Verificar RLS em produção:**

```sql
-- Via Neon Console → SQL Editor
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;
```

---

## Gestão de segredos

**Inventário completo:** `PLAYBOOK_SECRETS_ROTATION.md`

### Regras

- Nunca commitar segredos — usar `wrangler secret put` para Workers, GitHub Secrets para CI
- Arquivos `.dev.vars` e `.env` são gitignored — verificar com `git status` antes de commitar
- Rotação a cada 90 dias (60 dias para `WHATSAPP_ACCESS_TOKEN`)
- Após rotação: re-deploy do Worker afetado + verificar health check

### Secrets do Worker (produção)

```bash
# Listar secrets configurados
wrangler secret list --env production

# Adicionar/rotacionar
wrangler secret put DATABASE_URL --env production
```

---

## CI — Gates de segurança

Definidos em `.github/workflows/security-audit.yml`:

| Job | O que faz | Falha = |
|---|---|---|
| `secret-scan` | TruffleHog `--only-verified` em todo o histórico | Bloqueia merge |
| `dependency-audit` | `pnpm audit --audit-level=high` | Bloqueia merge |
| `lint-and-typecheck` | `pnpm lint` + `pnpm type-check` | Bloqueia merge |
| `analyze` (CodeQL) | SAST completo TypeScript | Alerta no GitHub Security |

---

## Proteção de dados (LGPD)

- CPF, dados clínicos, prontuários: nunca em logs — mascarar sempre
- TLS em trânsito: Cloudflare edge automático
- Criptografia em repouso: Neon PostgreSQL (gerenciado pelo provedor)
- Backups: PITR 7 dias configurado (`history_retention_seconds: 604800`)
- Branch de produção protegido (`br-dawn-block-acf1bzzv`, `protected: true`)

### Vazamento de dados — resposta imediata

Ver `RUNBOOK_INCIDENTS.md` Cenário 5 e `PLAYBOOK_SECRETS_ROTATION.md` seção "Rotação de Emergência".

Obrigações LGPD: notificar usuários afetados se dados clínicos foram expostos (Art. 48 LGPD — prazo de 2 dias úteis para notificação à ANPD).

---

## Webhook de autenticação

`POST /api/webhooks/neon-auth` — verifica assinatura EdDSA antes de processar.  
Cria perfil no evento `user.created`.

---

## Revisões periódicas

| Frequência | Ação |
|---|---|
| A cada PR | CodeQL + TruffleHog + pnpm audit (automático) |
| A cada 90 dias | Rotação de segredos (ver `PLAYBOOK_SECRETS_ROTATION.md`) |
| A cada release principal | Revisão deste documento + atualização do inventário de secrets |
| Anual | Revisar runbook + playbook de segredos e atualizar se necessário |
