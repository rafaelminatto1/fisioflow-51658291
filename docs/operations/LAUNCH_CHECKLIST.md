# Launch Checklist — FisioFlow

> Gate de qualidade para próxima release de produção  
> Versão: 1.1 | Data: 2026-04-30  
> **Todos os itens devem estar ✅ antes de liberar para novos beta testers ou tráfego significativo**

---

## 1. CI/CD e Build

| Item                                                          | Como verificar                           | Status |
| ------------------------------------------------------------- | ---------------------------------------- | ------ |
| Pipeline CI verde no branch `main`                            | GitHub Actions → todos os jobs verdes    | ✅     |
| Pipeline staging verde no branch `staging`                    | GitHub Actions → `Staging Deploy` verde  | ✅     |
| `pnpm lint` sem erros                                         | `CI: lint-and-typecheck` passando        | ✅     |
| `pnpm type-check` sem erros TypeScript                        | `CI: lint-and-typecheck` passando        | ✅     |
| Build de produção sem warnings críticos                       | `CI: build-api` + `CI: build-web` verdes | ✅     |
| TruffleHog — zero segredos detectados                         | `CI: secret-scan` verde                  | ✅     |
| `pnpm audit --audit-level=high` — zero vulnerabilidades HIGH+ | `CI: dependency-audit` verde             | ✅     |
| CodeQL — sem alertas de segurança abertos                     | GitHub → Security → Code scanning alerts | ✅     |

---

## 2. Banco de Dados

| Item                                                          | Como verificar                                                          | Status |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| Todas as migrations aplicadas em staging                      | `apps/api/migrations/MIGRATIONS_STATUS.md` — coluna Staging             | ✅     |
| Todas as migrations aplicadas em prod                         | `apps/api/migrations/MIGRATIONS_STATUS.md` — coluna Prod                | ✅     |
| Scripts `.down.sql` existem para todas as migrations recentes | `ls apps/api/migrations/*.down.sql`                                     | ✅     |
| RLS ativo em tabelas clínicas                                 | `SELECT tablename, rowsecurity FROM pg_tables WHERE rowsecurity = true` | ✅     |
| Branch de prod protegida                                      | Neon Console → Branch `br-dawn-block-acf1bzzv` → protected: true        | ✅     |
| PITR configurado (7 dias)                                     | Neon Console → Project Settings → `history_retention_seconds: 604800`   | ✅     |
| Validador de migrations passando                              | `bash scripts/check-migrations.sh` — exit 0                             | ✅     |

---

## 3. Saúde da API

| Item                               | Como verificar                                                                   | Status |
| ---------------------------------- | -------------------------------------------------------------------------------- | ------ |
| Liveness OK                        | `curl https://api-pro.moocafisio.com.br/api/health` → 200                        | ✅     |
| Readiness OK (DB + KV)             | `curl https://api-pro.moocafisio.com.br/api/health/ready` → `{"status":"ready"}` | ✅     |
| Zero erros 5xx nas últimas 24h     | Analytics Engine Query #2 (`docs/OBSERVABILITY_DASHBOARD.md`)                    | ✅     |
| Latência p95 < 300ms (últimas 24h) | Analytics Engine Query #1                                                        | ✅     |

---

## 4. Autenticação e Segurança

| Item                                           | Como verificar                                                                                                | Status |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ |
| Login funcional (Neon Auth)                    | Acesso manual em produção — login + dashboard carrega                                                         | ✅     |
| Logout funcional                               | Cookie `__Secure-neon-auth.session_token` removido após logout                                                | ✅     |
| JWKS endpoint respondendo                      | `curl https://ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1.aws.neon.tech/neondb/auth/.well-known/jwks.json` | ✅     |
| RBAC — fisioterapeuta sem acesso a rotas admin | Teste manual ou unit test passando                                                                            | ✅     |
| Nenhum segredo em `git log`                    | TruffleHog CI verde                                                                                           | ✅     |
| `.dev.vars` não commitado                      | `git status` — arquivo não listado                                                                            | ✅     |
| Secrets do Worker configurados em prod         | `wrangler secret list --env production` — todos os segredos listados                                          | ✅     |

---

## 5. Testes

| Item                                          | Como verificar                                                        | Status |
| --------------------------------------------- | --------------------------------------------------------------------- | ------ |
| Unit tests API — todos passando               | `pnpm --filter @fisioflow/api test:unit` — 0 falhas                   | ✅     |
| Unit tests Web — todos passando               | `pnpm --filter fisioflow-web test:unit` — 0 falhas                    | ✅     |
| Smoke staging — endpoints ativos após deploy  | `pnpm smoke:staging`                                                  | ✅     |
| Smoke produção — endpoints ativos após deploy | `pnpm smoke:production`                                               | ✅     |
| Smoke e2e — todos passando                    | `pnpm --filter fisioflow-web test:e2e:ci --grep "@smoke"` — 5/5 verde | ✅     |

---

## 6. Observabilidade e Alertas

| Item                                              | Como verificar                                                                            | Status |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------ |
| Analytics Engine recebendo eventos                | Query: `SELECT count() FROM fisioflow_events WHERE timestamp > NOW() - INTERVAL '1' HOUR` | ✅     |
| Alerta de erro rate configurado (> 1%)            | Cloudflare Dashboard → Notifications                                                      | ✅     |
| Alerta de latência configurado (P95 CPU > 50ms)   | Cloudflare Dashboard → Notifications                                                      | ✅     |
| Alerta de health check configurado (down > 2 min) | Cloudflare Dashboard → Traffic → Health Checks                                            | ✅     |
| Workers built-in logs ativos                      | `wrangler.toml` → `[observability] enabled = true`                                        | ✅     |

---

## 7. Infraestrutura Cloudflare

| Item                                | Como verificar                                                         | Status |
| ----------------------------------- | ---------------------------------------------------------------------- | ------ |
| Hyperdrive ativo                    | `wrangler hyperdrive list` — `12b9fefcfbc04074a63342a9212e1b4f` listed | ✅     |
| KV namespace configurado            | `wrangler kv namespace list` — `FISIOFLOW_CONFIG` presente             | ✅     |
| R2 bucket configurado               | `wrangler r2 bucket list` — `fisioflow-media` presente                 | ✅     |
| D1 databases configurados           | `wrangler d1 list` — `fisioflow-db` e `fisioflow-edge-cache` presentes | ✅     |
| Queue configurada                   | `wrangler queues list` — `fisioflow-background-tasks` presente         | ✅     |
| ALLOWED_ORIGINS configurado em prod | `wrangler secret list --env production` inclui `ALLOWED_ORIGINS`       | ✅     |

---

## 8. Design System e Frontend

| Item                                          | Como verificar                                            | Status |
| --------------------------------------------- | --------------------------------------------------------- | ------ |
| Nenhum erro de console em produção (homepage) | DevTools → Console → zero erros vermelhos                 | ✅     |
| Dark mode funcional                           | Toggle no app → sem elementos com cor hardcoded quebrando | ✅     |
| Responsividade mobile                         | DevTools → Device → iPhone 390px → layout intacto         | ✅     |
| Fonts carregando (Figtree + Noto Sans)        | Network → verificar carregamento do Google Fonts          | ✅     |

---

## 9. Operações

| Item                                                | Como verificar                                           | Status |
| --------------------------------------------------- | -------------------------------------------------------- | ------ |
| `RUNBOOK_INCIDENTS.md` atualizado e acessível       | Arquivo presente na raiz do repo                         | ✅     |
| `PLAYBOOK_SECRETS_ROTATION.md` com datas de rotação | Tabela de registro atualizada                            | ✅     |
| Canal de incidentes definido                        | `RUNBOOK_INCIDENTS.md` → Canal de Alertas preenchido     | ✅     |
| Backup de segredos em local seguro (offline)        | Verificar com responsável técnico                        | ✅     |
| Runbook de incidentes revisado e atualizado         | `RUNBOOK_INCIDENTS.md` — cenários e contatos atualizados | ✅     |

---

## 10. Assinaturas (gate final)

> Todos os owners devem confirmar antes da release

| Owner          | Área          | Confirmação | Data       |
| -------------- | ------------- | ----------- | ---------- |
| Rafael Minatto | Tech Lead     | ✅          | 2026-04-30 |
| Rafael Minatto | Frontend Lead | ✅          | 2026-04-30 |
| Rafael Minatto | PM            | ✅          | 2026-04-30 |

---

## Como usar este checklist

1. Marcar cada item com ✅ conforme verificado
2. Checklist finalizado e aprovado para release de produção.
