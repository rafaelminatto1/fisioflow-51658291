# Relatorio e plano: Neon DB, Neon Auth e Cloudflare

Data: 2026-04-12  
Escopo: Neon DB, Neon Auth, Cloudflare Workers/API, web/mobile auth clients, CI/CD, seguranca multi-tenant e plano de implementacao.

## Resumo executivo

O sistema ja esta na direcao certa: Cloudflare Workers como borda/API, Neon Postgres como banco principal, Neon Auth para identidade, R2 para midia, Queues/Workflows para tarefas e Neon preview branches no CI. O maior ganho agora nao vem de trocar tudo, mas de endurecer a fronteira de seguranca e eliminar ambiguidade entre Neon HTTP, Hyperdrive, RLS, tokens e branches.

Prioridade maxima:

1. Corrigir isolamento multi-tenant: o helper `createPoolForOrg` seta `app.org_id` em uma chamada SQL e roda a query em outra. Para RLS, isso deve acontecer na mesma transacao/conexao.
2. Remover fallback perigoso de organizacao: tokens sem `organizationId` caem no tenant padrao `00000000-0000-0000-0000-000000000001`.
3. Validar `issuer` e `audience` dos JWTs de Neon Auth de forma fechada, sem aceitar token parcial quando houver configuracao.
4. Unificar schema/migracoes: hoje existem caminhos paralelos em `drizzle/`, `src/server/db/migrations/`, `apps/api/migrations/` e `scripts/migration/`.
5. Corrigir automacao de backup Neon: o script usa um identificador que parece ser endpoint/host, enquanto `.neon` aponta outro `projectId`.
6. Completar hardening de Neon Auth em producao: dominios confiaveis, SMTP proprio, verificacao de email, OAuth proprio se aplicavel e localhost desativado.

Minha recomendacao de arquitetura: manter Cloudflare Worker como unico backend para dados clinicos/PHI, usar Neon Auth como identidade e sessao, usar Neon DB como fonte transacional, deixar Neon Data API apenas para areas sem PHI ou depois de RLS 100% auditado, e usar Cloudflare para cache, midia, filas, workflows, realtime e observabilidade.

## Status de implementacao local

Atualizado em 2026-04-12.

Implementado no repositorio:

- CORS da API passou a usar `ALLOWED_ORIGINS`; wildcard fica permitido apenas fora de producao.
- JWT do Neon Auth agora valida `issuer` e `audience` quando configurados.
- `NEON_AUTH_ISSUER` e `NEON_AUTH_AUDIENCE` no `wrangler.toml` foram alinhados ao `NEON_AUTH_URL` completo com `/neondb/auth`, que e o `BASE_URL` usado pelo Better Auth para issuer/audience por padrao.
- Cache de JWKS agora e separado por URL, evitando mistura entre producao, staging e preview branch.
- `verifyToken` nao injeta mais organizacao padrao. Ele prefere membership em `profiles`, aceita `organizationId` explicito do token/sessao como fallback, e rejeita token sem org/membership.
- `createPoolForOrg` passou a executar `set_config('app.org_id', ..., true)` e a query principal dentro da mesma transacao Neon HTTP.
- Signup, forgot password e reset password receberam rate limit e middleware Turnstile quando `TURNSTILE_SECRET_KEY` estiver configurado.
- Proxy de login deixou de retornar `organizationId` default quando o perfil/Neon Auth nao informam org.
- `scripts/neon-backup.ts` deixou de usar project id hardcoded, le `NEON_PROJECT_ID` ou `.neon`, resolve a branch pai por nome/id e usa retencao configuravel.
- `.github/workflows/ci.yml` agora solicita `auth_url` e `data_api_url` na preview branch Neon e executa setup antes da auditoria.
- `.github/workflows/db-backup.yml` foi alinhado para Node 22, pnpm 10.33.0, `--frozen-lockfile` e `NEON_PROJECT_ID`.
- `apps/api/.dev.vars` foi removido do indice do Git e `apps/api/.dev.vars` entrou no `.gitignore`.
- Testes adicionados para validação de `issuer`/`audience`, rejeição de token sem org/membership e fallback com org explicito.

Validado:

- `pnpm --filter @fisioflow/api type-check` passou.
- `pnpm --filter @fisioflow/api test:unit` passou com 75 testes.
- `pnpm --filter @fisioflow/api run build` passou com `wrangler deploy --dry-run --env production`.

Ainda depende de acao externa:

- Rotacionar segredos reais que possam ter sido expostos por `apps/api/.dev.vars`.
- Confirmar no console Neon se `purple-union-72678311` e o projeto de producao e se a branch pai se chama `main`.
- Criar roles `app_runtime`, `app_migration` e `analytics_readonly` no Neon e atualizar secrets/Hyperdrive.
- Conferir checklist Neon Auth em producao: trusted domains, SMTP proprio, email verification, OAuth proprio e localhost desativado.
- Aplicar migracoes completas de RLS para todas as tabelas multi-tenant depois do inventario autenticado.
- Deployar Workers/Web e validar login real com Playwright contra producao/staging.

## Evidencias locais

- Projeto Neon local: `.neon` aponta `projectId = purple-union-72678311` e `orgId = org-wandering-bush-64942963`.
- Neon CLI instalado: `neon --version` retornou `2.22.0`.
- Inventario remoto Neon nao foi concluido porque `neon projects list` abriu OAuth e `neon branches list` falhou por CSRF mismatch. Esta analise, portanto, combina codigo local, workflows e docs oficiais, mas nao confirmou recursos vivos no console.
- `apps/api/.dev.vars` esta rastreado pelo Git. Nao abri o arquivo por seguranca, mas isso deve ser tratado como possivel vazamento de segredo.
- Dependencias atuais: `@neondatabase/serverless@1.0.2`, `@neondatabase/neon-js@0.2.0-beta.1`, `better-auth@1.5.6`, `drizzle-orm@0.45.x`, `pg@8.18/8.20`.
- CI cria branch Neon em PR com `neondatabase/create-branch-action@v6`, mas nao solicita explicitamente `auth_url`/`data_api_url`.

## Estado atual do sistema

### Cloudflare

- API principal em `apps/api` com Hono + Workers.
- Hyperdrive configurado em `apps/api/wrangler.toml`.
- Bindings relevantes: R2, KV, D1, Analytics Engine, Vectorize, Pipelines, Workflows, Durable Objects, AI, Browser Rendering e Queues.
- O Worker ja esta em plano pago, entao podemos usar com mais confianca recursos como Workers AI, Browser Rendering, maior escala de Workers/Queues/Workflows e observabilidade.

### Neon DB

- `apps/api/src/lib/db.ts` prioriza `NEON_URL`, depois `DATABASE_URL`, depois `env.HYPERDRIVE.connectionString`.
- `createDb` usa Drizzle com `drizzle-orm/neon-http`.
- `createPool` cria um wrapper compativel com `pg.Pool.query`, mas por baixo usa Neon HTTP.
- `createPoolForOrg` tenta preparar RLS com `set_config('app.org_id', ..., true)`.
- Existe pgvector em migracoes, com indicios de dimensoes diferentes: `vector(1536)` em migracoes antigas e `vector(768)` em migracao mais nova.

### Neon Auth

- Web usa `@neondatabase/neon-js/auth` em `src/integrations/neon/auth.ts`.
- Patient app usa `@neondatabase/neon-js/auth` em `apps/patient-app/lib/neonAuth.ts`.
- Professional app usa proxy proprio `/api/auth/login` e armazena token via `SecureStore`.
- Worker verifica JWT via JWKS em `apps/api/src/lib/auth.ts`.
- Worker tambem aceita cookies Better Auth e fallback para tokens simples consultando `/get-session` e tabelas `neon_auth`.

### CI/CD e branches

- `.github/workflows/ci.yml` cria Neon preview branch para PRs.
- `.github/workflows/neon-cleanup.yml` remove branch ao fechar PR.
- `.github/workflows/db-backup.yml` roda backup diario via `scripts/neon-backup.ts`.
- A automacao de preview branch esta boa como base, mas ainda nao fecha o ciclo completo Cloudflare preview + Neon Auth branch + migracoes + seed + teste E2E.

## Achados criticos

### 1. RLS provavelmente nao esta sendo aplicado como esperado no helper atual

Evidencia local:

- `apps/api/src/lib/db.ts:90-98` executa `SELECT set_config('app.org_id', ..., true)` antes da query.
- `apps/api/src/lib/db.ts:105` executa a query principal em chamada separada.
- `apps/api/migrations/0033_rls_policies.sql:11-15` depende de `current_setting('app.org_id', true)`.

Problema: com Neon HTTP, chamadas separadas nao garantem o mesmo contexto transacional/sessao. O proprio driver Neon documenta o uso de `transaction()` para manter claims/JWT no contexto de RLS. O padrao correto e setar claims e executar a query dentro da mesma transacao ou usar um driver/conexao que preserve sessao.

Impacto: as policies podem falhar fechado, falhar aberto por uso de role bypass, ou simplesmente nao proteger o que achamos que protege. Para dados clinicos multi-tenant, este e o risco mais alto.

Acao recomendada:

- Para Neon HTTP: substituir `createPoolForOrg` por `sql.transaction([set_config, query])` ou helper equivalente.
- Para rotas com transacoes interativas: usar `pg` via Hyperdrive ou `Pool/Client` do driver Neon serverless, nao chamadas HTTP soltas.
- Usar role runtime sem `BYPASSRLS`; evitar `neondb_owner` no runtime.

### 2. Runtime parece usar role privilegiada

Evidencia local:

- `apps/api/wrangler.toml:18-19` mostra exemplo com `neondb_owner`.
- `apps/api/migrations/0033_rls_policies.sql:29-30` comenta que o Worker usa `neondb_owner`.
- Docs do Neon serverless driver alertam para evitar role com `BYPASSRLS` ao usar RLS.

Impacto: se o runtime usa owner ou role com bypass, RLS deixa de ser uma defesa real.

Acao recomendada:

- Criar roles separadas:
  - `app_runtime`: usado pelo Worker, sem `BYPASSRLS`, permissoes minimas.
  - `app_migration`: usado apenas no CI/migracoes.
  - `analytics_readonly`: usado para BI/relatorios.
- Atualizar `DATABASE_URL`, `NEON_URL` e Hyperdrive para o role correto.

### 3. Fallback de organizacao padrao e perigoso

Evidencia local:

- `apps/api/src/lib/auth.ts:12` define `DEFAULT_ORG_ID`.
- `apps/api/src/lib/auth.ts:80`, `108`, `142` caem nesse org default quando o token/sessao nao tem org.
- `apps/api/src/routes/auth.ts:106-109` tambem retorna org default no login.

Impacto: se um token valido nao trouxer claim de org, o usuario pode cair em tenant padrao. Isso cria risco de mistura de dados e comportamento dificil de auditar.

Acao recomendada:

- Remover org default de rotas protegidas.
- Depois de validar JWT, buscar `organization_id` e role no banco em tabela de membership/profile.
- Cachear membership por poucos minutos em KV/Durable Object, invalidando em mudancas de permissao.
- Se nao houver membership, responder 403.

### 4. JWT valida issuer, mas nao valida audience

Evidencia local:

- `apps/api/wrangler.toml:171` define `NEON_AUTH_AUDIENCE`.
- `apps/api/src/lib/auth.ts:125-131` passa `issuer`, mas nao `audience`, para `jwtVerify`.

Impacto: tokens emitidos para outro publico, mas assinados pelo mesmo provedor/chave, podem ser aceitos se a configuracao permitir.

Acao recomendada:

- Passar `audience: env.NEON_AUTH_AUDIENCE` quando configurado.
- Verificar se `NEON_AUTH_ISSUER` deve ser a URL base ou a URL com `/neondb/auth`. Hoje `apps/api/wrangler.toml:170` usa base sem path, enquanto `apps/api/dev.vars.example` sugere URL com `/neondb/auth`.
- Adicionar testes unitarios com token de issuer/audience incorretos.

Status local: implementado. O Better Auth documenta que issuer e audience usam o `BASE_URL` por padrao; no projeto, o `BASE_URL` de Neon Auth e a URL completa com `/neondb/auth`, igual ao endpoint usado por `NEON_AUTH_URL` e pelo `dev.vars.example`.

### 5. Fallback para tabela interna `neon_auth.session`

Evidencia local:

- `apps/api/src/lib/auth.ts:90-100` consulta `neon_auth.session` e `neon_auth.user` diretamente.

Impacto: acopla o Worker ao schema interno do Neon Auth/Better Auth. Tambem adiciona query de banco ao caminho de autentificacao quando o token nao e JWT.

Acao recomendada:

- Padronizar cliente web/mobile para obter JWT com `authClient.token()` ou via header `set-auth-jwt`.
- Manter fallback de `/get-session` apenas temporariamente.
- Remover fallback direto ao banco ou isolar em modulo com metricas, timeout e plano de descontinuacao.

### 6. Signup, forgot password e reset password nao tem a mesma protecao de login

Evidencia local:

- `apps/api/src/routes/auth.ts:55` aplica rate limit no login.
- `apps/api/src/routes/auth.ts:119`, `151`, `175` nao usam rate limit especifico.

Impacto: abuso de cadastro, enumeracao de email e spam de recuperacao de senha.

Acao recomendada:

- Rate limit por IP e por email normalizado em signup, forgot/reset e resend verification.
- Turnstile nas rotas publicas sensiveis.
- Respostas indistinguiveis para email existente vs inexistente em forgot password.

### 7. Neon Auth esta em beta e exige checklist de producao

Docs oficiais de Neon Auth indicam Beta e checklist antes de producao. Pontos obrigatorios:

- Dominios confiaveis.
- Provedor de email proprio.
- OAuth proprio se usar Google/GitHub.
- Verificacao de email recomendada.
- Desativar `Allow Localhost` em producao.

Acao recomendada:

- Conferir tudo no console Neon da branch de producao.
- Criar checklist versionado em `docs/runbooks/neon-auth-production-checklist.md`.
- Adicionar teste E2E real de login, reset e expiração de sessão em branch preview.

### 8. Preview branches Neon existem, mas ainda nao fecham auth/data/api end-to-end

Evidencia local:

- `.github/workflows/ci.yml:147-153` cria branch Neon.
- `.github/workflows/ci.yml:155-160` roda auditoria de schema.
- Nao ha `get_auth_url: true` nem `get_data_api_url: true`.

Docs do Neon recomendam injetar Auth URL da branch no preview para cada PR.

Acao recomendada:

- Adicionar `get_auth_url: true` e `get_data_api_url: true`.
- Propagar outputs para build web/API preview.
- Criar test users ou seed de branch.
- Rodar Playwright contra preview com Auth URL da branch.
- Comentar PR com URLs de app, API, Auth branch e branch DB.

### 9. Backup Neon provavelmente esta incorreto

Evidencia local:

- `.neon:2` tem `projectId = purple-union-72678311`.
- `scripts/neon-backup.ts:17` usa `PROJECT_ID = 'ep-wandering-bonus-acj4zwvo'`, que parece endpoint/host, nao project id.
- `scripts/neon-backup.ts:18` usa `PARENT_BRANCH_ID = 'main'`, mas APIs normalmente diferenciam branch name de branch id.

Impacto: backup pode estar falhando, criando snapshot no alvo errado ou nunca criando snapshot real.

Acao recomendada:

- Usar `NEON_PROJECT_ID` vindo de env/vars, nao hardcoded.
- Resolver branch principal via API antes de criar backup.
- Testar restore em branch separada mensalmente.
- Definir RPO/RTO por escrito.
- Considerar export logico criptografado para R2 alem de branch snapshots, se requisitos LGPD/clinicos exigirem retenção independente.

### 10. Migracoes e schema estao fragmentados

Evidencia local:

- Foram encontrados 86 arquivos SQL/TS/MJS com cara de migracao em `drizzle/`, `src/server/db/migrations/`, `apps/api/migrations/` e `scripts/migration/`.
- `drizzle.config.ts` aponta para `./src/server/db/schema/*`.
- `apps/api/src/lib/db.ts` importa schema de `@fisioflow/db`.

Impacto: risco de schema drift entre web/API, migracoes manuais fora do trilho e ambiente preview diferente da producao.

Acao recomendada:

- Eleger `packages/db` como fonte canonica de schema.
- Configurar `drizzle.config.ts` para usar o schema canonico.
- Migracoes novas apenas em uma pasta.
- Transformar scripts de hotfix em migracoes auditaveis ou arquivar com status.
- Adicionar CI que falha quando `drizzle-kit generate` produz diff nao commitado.

### 11. pgvector e Vectorize precisam de decisao clara

Evidencia local:

- Migracoes antigas indicam `vector(1536)`.
- Migracao mais nova cria/usa `vector(768)`.
- Cloudflare Vectorize esta configurado com dimensoes 768.

Impacto: embeddings de dimensoes/modelos diferentes quebram buscas ou degradam RAG sem erro obvio.

Acao recomendada:

- Escolher um modelo/dimensao oficial por indice. Para Workers AI BGE base, 768 faz sentido.
- Criar tabela `embedding_jobs`/`embedding_model_registry` com model id, dimensao, data e versao.
- Definir se a busca principal sera Neon pgvector ou Cloudflare Vectorize:
  - Recomendacao: Vectorize para busca operacional de conhecimento clinico no Worker; Neon guarda metadados e fonte.
  - pgvector fica para queries administrativas/analytics ou fallback, nao duas fontes divergentes.

### 12. Neon Data API deve esperar RLS completo

Docs atuais dizem que Neon RLS foi integrado ao Neon Data API para novas integracoes frontend. Isso e util, mas no nosso sistema dados clinicos exigem cuidado.

Acao recomendada:

- Nao expor PHI via Data API diretamente ao cliente agora.
- Usar Data API apenas para dados publicos/baixo risco ou quando:
  - Todas as tabelas expostas tiverem RLS.
  - Roles `anonymous`/`authenticated` tiverem grants minimos.
  - Testes cross-tenant validarem negative cases.
  - Logs nao vazarem payload sensivel.

## Arquitetura recomendada

### Fronteira de seguranca

Cliente web/mobile -> Cloudflare Worker API -> Neon DB.

Neon Auth emite identidade/sessao. O Worker verifica o token, resolve membership/role no Neon DB e aplica autorizacao. O cliente nao acessa Neon DB diretamente para dados clinicos.

### Autenticacao

- Neon Auth permanece como provedor principal.
- Web e mobile usam o SDK Neon Auth para login/sessao.
- Worker valida JWT via JWKS, issuer e audience.
- Worker nao confia em `role`/`organizationId` do token como fonte final. Ele resolve permissoes no DB.
- Sem org default em rotas protegidas.
- Sessao simples Better Auth e aceita apenas como fase de migracao.

### Banco transacional

- Neon DB e a fonte de verdade para pacientes, agenda, sessoes, financeiro, documentos e audit log.
- Runtime usa role limitada.
- Migracoes usam role separado.
- RLS cobre todas as tabelas multi-tenant sensiveis.
- Operacoes multi-query usam transacao real.

### Cloudflare

- Worker API e o unico ponto publico de dados clinicos.
- Hyperdrive para rotas com `pg`/transacoes/sessao.
- Neon HTTP para queries simples e sem dependencia de contexto de sessao.
- D1 apenas para rate limit, cache leve e dados de borda, nao como replica clinica.
- R2 para midia com binding nativo, URLs assinadas e politicas de acesso por tenant.
- Queues/Workflows para automacoes de paciente, NFSe, reminders, reengajamento e jobs longos.
- Durable Objects para realtime/presenca/sessoes colaborativas, nao banco relacional.
- Analytics Engine/Pipelines/R2/BigQuery para eventos e BI, evitando sobrecarregar Neon com analytics pesadas.

## Plano de implementacao

### Fase 0 - Preparacao e inventario (1 a 2 dias)

Objetivo: saber exatamente o que existe em Neon/Cloudflare antes de mexer em seguranca.

Tarefas:

- Autenticar Neon CLI ou configurar Neon MCP/API token para inventario sem OAuth interativo.
- Listar projetos, branches, endpoints, compute, pooler, Auth URLs, Data API e roles.
- Confirmar se `purple-union-72678311` e o projeto correto de producao.
- Verificar se `ep-wandering-bonus-acj4zwvo` e endpoint id, branch id ou host.
- Inventariar secrets de Cloudflare e GitHub sem expor valores.
- Abrir issue/checklist para rotacao de qualquer segredo que ja tenha sido commitado.

Entregaveis:

- `docs/runbooks/neon-inventory.md`
- Lista de branches e Auth URLs por ambiente.
- Matriz de secrets por ambiente.

### Fase 1 - Hardening imediato de Auth e secrets (3 a 5 dias)

Objetivo: reduzir risco de acesso indevido antes de refatorar banco.

Tarefas:

- Remover `apps/api/.dev.vars` do Git e adicionar `apps/api/.dev.vars` ao `.gitignore`.
- Rotacionar credenciais potencialmente expostas: Neon DB URL, R2 keys, Neon API key, tokens Cloudflare se aplicavel.
- Corrigir CORS do Worker para usar `ALLOWED_ORIGINS` em todas as respostas, sem `origin: "*"` com credenciais.
- Validar `issuer` e `audience` em `jwtVerify`.
- Remover fallback para org default em rotas protegidas.
- Implementar `resolveAuthContext(userId)` que busca membership/role no Neon DB.
- Rate limit e Turnstile para signup, forgot/reset e endpoints publicos sensiveis.
- Conferir checklist Neon Auth de producao no console: trusted domains, SMTP, email verification, OAuth proprio e localhost desativado.

Entregaveis:

- PR de hardening auth.
- Testes unitarios para issuer/audience, token sem org, membership ausente e role invalido.
- Checklist Neon Auth assinado.

### Fase 2 - RLS e roles de banco (1 a 2 semanas)

Objetivo: transformar isolamento multi-tenant em defesa real no banco.

Tarefas:

- Criar role `app_runtime` sem `BYPASSRLS`.
- Criar role `app_migration` para Drizzle/CI.
- Criar role `analytics_readonly`.
- Atualizar Hyperdrive/NEON_URL/DATABASE_URL runtime para `app_runtime`.
- Substituir `createPoolForOrg` por helper transacional:
  - Neon HTTP: `sql.transaction([set_config, query])`.
  - Rotas com transacao interativa: `pg` via Hyperdrive.
- Auditar todas as tabelas com `organization_id`, `tenant_id`, `patient_id` e dados clinicos.
- Aplicar RLS em todas as tabelas multi-tenant sensiveis.
- Criar suite de teste cross-tenant:
  - Usuario A nao le paciente de org B.
  - Usuario sem membership recebe 403.
  - Role viewer nao escreve.
  - Query sem `app.org_id` falha fechado.

Entregaveis:

- Migracoes de roles/grants/RLS.
- Testes de RLS automatizados em branch Neon preview.
- Runbook de emergencia para rollback de policy.

### Fase 3 - Unificacao de schema e migracoes (1 semana)

Objetivo: acabar com drift de banco.

Tarefas:

- Definir `packages/db` como schema canonico.
- Atualizar `drizzle.config.ts`.
- Mover migracoes novas para uma pasta canonica.
- Classificar migracoes antigas como:
  - aplicadas em producao,
  - superseded,
  - pendentes,
  - hotfix arquivado.
- Adicionar script `db:migration:status`.
- Adicionar CI que roda:
  - `pnpm db:audit:schema`
  - `pnpm db:migrate` em branch preview
  - schema diff entre branch base e PR

Entregaveis:

- Mapa de migracoes.
- CI falhando em drift.
- Documentacao de fluxo para criar migracao.

### Fase 4 - Preview environments completos (1 semana)

Objetivo: cada PR ter ambiente completo, isolado e testavel.

Tarefas:

- Atualizar `create-branch-action@v6` com `get_auth_url: true` e `get_data_api_url: true`.
- Injetar Auth URL da branch no build web/API preview.
- Aplicar migracoes automaticamente na branch.
- Criar seed minimo de usuarios de teste por perfil.
- Configurar Cloudflare preview/staging com bindings completos.
- Rodar Playwright com login real contra branch preview.
- Cleanup robusto em PR fechado e job agendado para branches orfas.

Entregaveis:

- PR preview com DB + Auth isolados.
- Comentario automatico no PR com URLs e status.
- Testes E2E de login/permissoes.

### Fase 5 - Performance, observabilidade e custo (1 a 2 semanas)

Objetivo: escalar com visibilidade e controle.

Tarefas:

- Habilitar/validar `pg_stat_statements` ou equivalente de query performance no Neon.
- Criar painel de slow queries por endpoint Worker.
- Adicionar correlation id por request.
- Medir latencia Neon HTTP vs Hyperdrive nas rotas principais.
- Revisar indexes reais com base em query plans.
- Corrigir extensoes necessarias como `pg_trgm`, se indices trigram forem usados.
- Separar queues por criticidade: reminders, NFSe, AI/media, analytics.
- Definir SLOs: p95 API, erro 5xx, login, DB query p95, queue lag.

Entregaveis:

- Dashboard de API + DB.
- Lista de indices mantidos/removidos.
- Alertas de erro, latencia, branch cleanup e backup.

### Fase 6 - Dados, IA e midia (1 a 2 semanas)

Objetivo: deixar a plataforma pronta para funcionalidades novas sem duplicar infraestrutura.

Tarefas:

- Escolher Vectorize como indice principal de RAG operacional ou pgvector como principal, nao ambos sem contrato.
- Padronizar dimensao 768 se o modelo oficial for Workers AI BGE base.
- Criar tabela de registry de embeddings.
- Migrar uploads R2 para binding nativo e URLs assinadas por tenant.
- Adicionar scanner/validacao de arquivos e metadata clinica.
- Usar Cloudflare Workflows para jobs duraveis de onboarding, discharge, reminders e NFSe.
- Enviar eventos de produto para Analytics Engine/Pipelines/R2/BigQuery.

Entregaveis:

- Contrato de embeddings.
- R2 access policy por tenant.
- Pipeline de eventos documentado.

## Tecnologias sugeridas

### Manter e aprofundar

- Neon DB: continuar como banco transacional principal.
- Neon Auth: continuar, pela vantagem de auth branch junto com DB branch, mas tratar como componente beta e seguir checklist de producao.
- Cloudflare Workers: manter como backend publico.
- Hyperdrive: usar onde ha `pg`, transacao, sessao ou latencia global.
- Cloudflare Queues/Workflows: padronizar automacoes duraveis.
- R2: midia e exports/backup complementares.
- Vectorize: busca vetorial operacional pro Worker.

### Adicionar ou formalizar

- Neon MCP ou automacao via API Neon: para inventario, branches, Auth URLs e manutencao sem depender de OAuth interativo da CLI.
- Sentry para Worker/API e frontend, ja que o repo tem `@sentry/react`; complementar com Cloudflare logs/Axiom.
- OpenTelemetry/correlation id: mesmo que a exportacao fique em Axiom/Sentry.
- 1Password, Infisical ou Doppler: se a equipe precisar governanca central de secrets alem de GitHub/Cloudflare/Neon.
- BigQuery/DuckDB sobre R2 para BI, deixando Neon para OLTP.

### Avaliar apenas se Neon Auth limitar produto

- Clerk, Stytch ou Auth0: melhores para enterprise SSO, MFA avancado, organizacoes maduras e dashboards de identity, mas perdem a vantagem de Auth branch nativo do Neon.
- Supabase Auth: bom se quiser stack mais integrada de auth/storage/realtime, mas seria uma migracao grande e menos alinhada ao investimento atual em Neon + Cloudflare.

Minha recomendacao: nao trocar Neon Auth agora. Harden, testar e criar plano B. Trocar auth antes de resolver RLS/migracoes aumentaria risco.

## Ordem de prioridade

P0:

- Secrets e `.dev.vars` rastreado.
- CORS fechado.
- JWT issuer/audience.
- Sem org default.
- Rate limit/Turnstile em auth publico.
- Backup Neon corrigido.

P1:

- Runtime DB role sem bypass.
- `createPoolForOrg` transacional.
- RLS completo para tabelas multi-tenant.
- Testes cross-tenant.

P2:

- Schema/migracoes canonicas.
- Preview branches com Auth URL.
- Staging Cloudflare completo.

P3:

- Observabilidade e slow queries.
- R2 binding nativo e upload assinado.
- Vectorize/pgvector unificado.
- Workflows/Queues por dominio.

## Checklist de validacao

- Um usuario sem membership recebe 403 em qualquer rota protegida.
- Token com issuer incorreto falha.
- Token com audience incorreto falha.
- Token valido sem organizationId nao cai em tenant padrao.
- Usuario da org A nao le/escreve dados da org B via API nem via query RLS.
- `app_runtime` nao tem `BYPASSRLS`.
- `neondb_owner` nao e usado pelo Worker em producao.
- Signup/forgot/reset tem rate limit e anti-bot.
- Branch preview cria DB branch, Auth branch, aplica migracoes e roda E2E.
- Backup cria branch no projeto correto e restore e testado.
- Embeddings tem uma dimensao/modelo oficial.
- Neon Data API nao expoe PHI antes de RLS completo.

## Referencias oficiais consultadas

- Neon Auth com Better Auth, branching e variaveis: https://neon.com/docs/auth/migrate/from-legacy-auth
- Neon Auth branching: https://neon.com/docs/auth/branching-authentication
- Neon Auth production checklist: https://neon.com/docs/auth/production-checklist
- Neon serverless driver e transacoes/RLS: https://neon.com/docs/serverless/serverless-driver
- Neon RLS/Data API troubleshooting: https://neon.com/docs/guides/neon-rls-authorize-troubleshooting
- Neon GitHub Actions branching: https://neon.com/docs/guides/branching-github-actions
- Better Auth JWT issuer/audience: https://better-auth.com/docs/plugins/jwt
- Cloudflare Workers + Postgres/Hyperdrive: https://developers.cloudflare.com/workers/tutorials/postgres/
- Cloudflare Hyperdrive: https://developers.cloudflare.com/hyperdrive/
