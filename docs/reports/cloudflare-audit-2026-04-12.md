# Relatório de aprimoramentos Cloudflare - FisioFlow

Data da auditoria: 2026-04-12  
Escopo: Workers/API, Worker de assets web, staging/production, bindings Cloudflare e uso da conta paga de Workers.

## Resumo executivo

A arquitetura Cloudflare está bem avançada para uma aplicação clínica: `fisioflow-api` já usa Workers pagos, Smart Placement, Hyperdrive, R2, KV, D1, Analytics Engine, Vectorize, Pipelines, Workflows, Durable Objects, Workers AI, Browser Rendering, Queues e DLQ. O `wrangler deploy --dry-run --env production` validou o bundle e listou todos esses bindings em produção. O `pnpm --filter @fisioflow/api type-check` terminou sem erros.

Os maiores ganhos agora não são "adicionar mais produtos", mas endurecer produção, separar staging corretamente, reduzir superfície pública, controlar custo da conta paga e alinhar o código ao que já está configurado.

Prioridades recomendadas:

1. Corrigir staging: o dry-run de staging avisou que `d1_databases`, `vectorize`, `analytics_engine_datasets`, `pipelines`, `workflows`, `PATIENT_AGENT` e `TURNSTILE_SITE_KEY` não são herdados por `env.staging`.
2. Fechar CORS de produção: hoje o middleware principal usa `origin: "*"` com `credentials: true`, apesar de `ALLOWED_ORIGINS` existir.
3. Remover `apps/api/.dev.vars` do Git e rotacionar segredos caso contenha credenciais reais.
4. Reavaliar R2: o Worker usa credenciais S3 e bucket hard-coded onde poderia usar binding R2; isso reduz segurança e quebra staging.
5. Alinhar banco de dados: Hyperdrive está configurado, mas `lib/db.ts` prioriza `NEON_URL`/`process.env.DATABASE_URL` e usa Neon HTTP driver.
6. Melhorar observabilidade: `[observability] enabled = true` existe, mas sem sampling explícito de logs/traces e com muitos logs em string.
7. Adotar deploys versionados/gradual rollout: os deployments reais recentes estão 100% diretos, sem tag e sem mensagem.
8. Definir limites pagos de Workers: a conta paga permite limites maiores, mas também pede guardrails de `cpu_ms` e `subrequests`.

## Evidências coletadas

Comandos executados:

- `wrangler whoami`: conta `32156f9a72a32d1ece28ab74bcd398fb`, token com permissões para Workers, D1, Pages, AI, AI Search, Queues, Pipelines, Secrets Store, Containers e outros.
- `pnpm --filter @fisioflow/api type-check`: passou sem erros.
- `pnpm --filter @fisioflow/api run build`: executou `wrangler deploy --dry-run --env production`, bundle `6568.67 KiB`, gzip `1260.18 KiB`, com todos os bindings de produção.
- `wrangler deploy --dry-run --env staging`: passou, mas com avisos relevantes de bindings não herdados.
- `wrangler deploy --dry-run` no Worker web: passou, mas avisou para especificar explicitamente `--env`.
- `wrangler deployments list --env production` em `apps/api`: deployments recentes 100% diretos, sem tag/mensagem.
- `wrangler deployments list` na raiz: deployments web recentes 100% diretos, sem tag/mensagem.

Documentação consultada:

- Cloudflare Workers Best Practices: https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
- Limites Workers: https://developers.cloudflare.com/workers/platform/limits/
- Changelog de subrequests em Workers pagos: https://developers.cloudflare.com/changelog/post/2026-02-11-subrequests-limit/
- Gradual deployments: https://developers.cloudflare.com/workers/configuration/versions-and-deployments/gradual-deployments/
- Placement / Smart Placement: https://developers.cloudflare.com/workers/configuration/placement/

Observação sobre MCPs: nesta sessão não há um MCP Cloudflare dedicado exposto como ferramenta. Para Cloudflare usei Wrangler autenticado e documentação oficial; GitHub/Google Drive/Canva não foram usados porque não agregam evidência ao estado Cloudflare.

## Inventário atual

### Worker API: `fisioflow-api`

Arquivo: `apps/api/wrangler.toml`

Recursos configurados em produção:

- `compatibility_date = "2026-03-25"` e `compatibility_flags = ["nodejs_compat"]`.
- `workers_dev = true`.
- Smart Placement: `[placement] mode = "smart"`.
- Custom domains: `api-pro.moocafisio.com.br` e `api-paciente.moocafisio.com.br`.
- Hyperdrive: `HYPERDRIVE`.
- R2: `MEDIA_BUCKET`.
- KV: `FISIOFLOW_CONFIG`.
- D1: `DB` e `EDGE_CACHE`.
- Analytics Engine: `ANALYTICS`.
- Vectorize: `CLINICAL_KNOWLEDGE`.
- Pipeline: `EVENTS_PIPELINE`.
- Workflows: lembrete de consulta, onboarding, NFSe, HEP compliance, alta e reengajamento.
- Durable Objects: `ORGANIZATION_STATE`, `PATIENT_AGENT`.
- Workers AI e Browser Rendering.
- Queue: `BACKGROUND_QUEUE`, consumer com `max_batch_size = 10`, `max_retries = 3`, DLQ.
- Cron diário em `0 9 * * *` e `0 11 * * *` UTC.
- Observability habilitado.

### Worker web: `fisioflow-web`

Arquivo: `wrangler.toml`

- Usa Workers Static Assets com `run_worker_first = true`.
- Observability habilitado.
- Staging separado para `fisioflow-web-staging`.
- `asset-worker.ts` faz fallback de SPA corretamente.

### Jules bot

Arquivo: `apps/jules-bot/wrangler.toml`

- `compatibility_date = "2024-11-06"`.
- Não tem observability, staging, `nodejs_compat` nem ambiente separado.

## Achados e recomendações

### 1. Staging está incompleto

Severidade: alta

O dry-run de staging avisou explicitamente que várias configurações top-level não são herdadas por `env.staging`. O staging resultante só tem `ORGANIZATION_STATE`, KV, Queue, Hyperdrive, R2, Browser, AI e variáveis básicas. Faltam D1, `EDGE_CACHE`, Analytics Engine, Vectorize, Pipelines, Workflows, `PATIENT_AGENT` e `TURNSTILE_SITE_KEY`.

Impacto:

- Rotas que usam `EDGE_CACHE`, `DB`, Vectorize, Analytics ou Workflows podem funcionar diferente em staging.
- O staging perde valor como ambiente de validação real.
- Bugs de produção podem não aparecer antes do deploy.

Correção:

- Declarar em `[env.staging]` todos os bindings equivalentes, apontando para recursos staging quando existirem.
- Criar D1 staging para `fisioflow-db-staging` e `fisioflow-edge-cache-staging`.
- Criar Vectorize/Pipeline/Analytics staging ou deixar o código explicitamente degradar funcionalidade com feature flag.
- Adicionar `PATIENT_AGENT` em `[env.staging.durable_objects]`.
- Adicionar Workflows staging ou desabilitar rotas que os disparam em staging.

### 2. CORS de produção está aberto demais

Severidade: alta

Em `apps/api/src/index.ts`, o middleware principal usa:

- `origin: "*"`
- `credentials: true`

O arquivo `apps/api/wrangler.toml` define `ALLOWED_ORIGINS`, mas o middleware normal não usa essa lista. O `errorHandler` usa a allowlist só para respostas de erro, então o caminho feliz fica permissivo.

Impacto:

- Superfície maior para abuso de browser-origin.
- Inconsistência entre resposta normal e resposta de erro.
- A intenção de segurança declarada em `ALLOWED_ORIGINS` não é aplicada.

Correção:

- Trocar para função de origem que valide `Origin` contra `ALLOWED_ORIGINS`.
- Remover `workers.dev` da allowlist de produção quando os custom domains estiverem estáveis.
- Manter `localhost` apenas em desenvolvimento/staging.
- Adicionar teste de CORS para origem permitida e origem negada.

### 3. `apps/api/.dev.vars` está versionado

Severidade: alta

`git ls-files apps/api/.dev.vars` retorna o arquivo, ou seja, ele está sob versionamento. Não li o conteúdo para não expor segredos, mas `.dev.vars` normalmente contém credenciais locais.

Impacto:

- Risco de segredo versionado no repositório.
- Caso tenha token real, a rotação é obrigatória.

Correção:

- Adicionar `apps/api/.dev.vars` ao `.gitignore`.
- Remover do índice com `git rm --cached apps/api/.dev.vars`.
- Criar `apps/api/dev.vars.example`.
- Rotacionar qualquer segredo que tenha passado pelo Git.

### 4. R2 usa credenciais S3 dentro do Worker e bucket hard-coded

Severidade: alta

Em `apps/api/src/routes/media.ts`, o Worker cria `S3Client` com `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY`, e usa `Bucket: 'fisioflow-media'`. Em `apps/api/src/lib/storage/R2Service.ts`, `Bucket` usa `this.env.MEDIA_BUCKET.toString()`, que não é nome de bucket confiável.

Impacto:

- Mais segredos dentro do Worker do que o necessário.
- Staging aponta para `fisioflow-media-staging`, mas upload/delete usam `fisioflow-media`.
- O binding R2, que já existe, é subutilizado.
- `R2Service` provavelmente gera presigned URLs inválidas se chamado.

Correção:

- Para operações server-side, usar `c.env.MEDIA_BUCKET.put/get/delete`.
- Para upload direto do browser, escolher uma das opções:
  - Endpoint Worker que recebe upload e grava via binding R2.
  - Serviço de presign isolado, com credenciais R2 restritas e bucket por env em variável `R2_BUCKET_NAME`.
- Substituir bucket hard-coded por env var não-secreta, separada para prod/staging.
- Remover `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY` do `Env` principal se deixarem de ser necessários.

### 5. Hyperdrive está configurado, mas não é o caminho principal do código

Severidade: média-alta

`apps/api/wrangler.toml` configura Hyperdrive e Smart Placement, mas `apps/api/src/lib/db.ts` usa:

1. `env.NEON_URL`
2. `process.env.DATABASE_URL`
3. `env.HYPERDRIVE?.connectionString`

Além disso, o comentário diz que Hyperdrive é TCP-only e que o driver Neon HTTP é o recomendado. Isso pode ser uma decisão válida, mas então o binding Hyperdrive e a documentação operacional ficam ambíguos.

Impacto:

- O custo/benefício do Workers Paid + Hyperdrive pode não estar sendo capturado.
- Diagnóstico de latência fica confuso: não fica claro se as queries vão via Hyperdrive ou via Neon HTTP.
- Smart Placement fica menos mensurável se a conexão principal não usa o host esperado.

Correção:

- Decidir formalmente:
  - Usar Hyperdrive com driver compatível com conexão PostgreSQL.
  - Ou remover Hyperdrive do caminho principal e documentar que a decisão é Neon HTTP.
- Se mantiver Hyperdrive, medir p50/p95 antes/depois por rota e query.
- Considerar Placement Hint por `host` ou região próxima ao Neon `sa-east-1`, validando com analytics de `cf-placement`.

### 6. Observabilidade existe, mas ainda está básica

Severidade: média-alta

`[observability] enabled = true` está presente. A documentação da Cloudflare recomenda configurar logs/traces com `head_sampling_rate` e usar logs JSON estruturados. O código tem muitos `console.log("[Queue] ...")` e `console.error("[Media] ...")` em string, além de Analytics Engine próprio.

Impacto:

- Investigações em produção ficam mais difíceis.
- Sem sampling explícito, custo/volume podem ficar pouco previsíveis.
- Eventos clínicos, Queue, AI e PDF podem ficar sem correlação uniforme por `requestId`, `orgId`, rota e job id.

Correção:

- Adicionar:
  - `[observability.logs] head_sampling_rate = 1` inicialmente, ou menor em alto tráfego.
  - `[observability.traces] enabled = true` e sampling controlado.
- Padronizar logs em JSON: `message`, `requestId`, `orgId`, `route`, `status`, `latencyMs`, `queueMessageId`, `workflowId`.
- Criar consultas salvas para Analytics Engine: p95 por rota, erros 5xx por rota, AI calls por org, Queue retries, PDF failures.
- Garantir que Axiom e Workers Observability não dupliquem custo sem necessidade.

### 7. Deploys diretos sem tags, mensagens ou rollout gradual

Severidade: média-alta

`wrangler deployments list` para API e web mostra vários deployments recentes com:

- `Source: Unknown (deployment)`
- `Message: -`
- versão única com `100%`
- sem tags

Impacto:

- Rollback manual fica menos claro.
- Fica difícil associar deploy a commit, motivo e verificação.
- Mudanças críticas entram 100% de uma vez.

Correção:

- Usar `wrangler versions upload` e `wrangler versions deploy` para releases críticas.
- Incluir tag/mensagem com commit SHA.
- Para API clínica, adotar rollout gradual: 5% -> 25% -> 100% com janela de observação.
- Para Worker com assets, seguir cuidado específico de gradual deployment por possível incompatibilidade HTML/assets.

### 8. Falta definir limites pagos de CPU/subrequests

Severidade: média

A conta paga tem limite padrão maior de subrequests. Em 2026, a Cloudflare documenta 10.000 subrequests por invocação em plano pago, podendo aumentar via `limits.subrequests`, e também recomenda reduzir limites para proteger contra runaway code/custo.

Impacto:

- Rotas com RAG, AI, PDF, Queue ou integrações externas podem consumir mais que o esperado.
- Sem limite por Worker, bugs podem virar custo.

Correção:

- Definir `[limits]` para API com valores conscientes:
  - `cpu_ms` conforme perfil real.
  - `subrequests` maior para rotas legítimas se necessário, ou menor para proteger rotas simples.
- Separar Worker de AI/PDF se precisar de limites diferentes.

### 9. Queue mistura tipos de carga e lê objetos inteiros em memória

Severidade: média

`handleQueue` processa mensagens sequencialmente no batch. `processExamUpload` chama `object.arrayBuffer()` e converte tudo para base64 com spread em `String.fromCharCode(...new Uint8Array(arrayBuffer))`.

Impacto:

- Arquivos grandes podem estourar memória ou stack.
- AI, WhatsApp, TTS e Workflows têm perfis de retry/custo diferentes, mas compartilham uma fila.
- Erros permanentes podem ir para DLQ sem fluxo claro de reprocessamento/alerta.

Correção:

- Impor limite de tamanho por tipo antes de ler o objeto.
- Evitar spread em arrays grandes; usar chunking/streaming ou formato suportado direto pelo modelo.
- Separar filas por carga: `whatsapp`, `ai-exams`, `pdf/tts`, `workflows`.
- Criar consumer/relatório de DLQ e alerta para retries.
- Adicionar idempotency key por `r2Key`, WhatsApp appointment/template e workflow type.

### 10. Turnstile está fail-open e pouco aplicado

Severidade: média

`turnstileVerify` bypassa quando `TURNSTILE_SECRET_KEY` está ausente e também faz fail-open se a API do Turnstile falhar. Public booking usa o middleware, mas signup/forgot/reset não usam Turnstile, e `TURNSTILE_SITE_KEY` está vazio no `wrangler.toml`.

Impacto:

- Se o segredo não estiver setado em produção, a proteção anti-bot não existe.
- Fail-open pode ser aceitável para UX, mas precisa ser decisão explícita e monitorada.
- Rotas públicas de autenticação continuam expostas a abuso além do rate limit.

Correção:

- Em produção, falhar fechado se `TURNSTILE_SECRET_KEY` estiver ausente.
- Aplicar Turnstile em signup, forgot/reset e booking público.
- Logar/medir bypass e falhas do Turnstile.
- Preencher site key por ambiente.

### 11. `workers_dev = true` mantém endpoint público adicional

Severidade: média

`apps/api/wrangler.toml` deixa `workers_dev = true` na API. Há custom domains configurados.

Impacto:

- A API fica exposta também pelo domínio `workers.dev`.
- CORS e allowlist incluem endpoints `workers.dev`, aumentando superfície pública.

Correção:

- Quando os custom domains estiverem validados, usar `workers_dev = false` em produção.
- Manter `workers.dev` apenas para staging/dev, se necessário.

### 12. D1 cache usa binding possivelmente errado

Severidade: média

`queryWithCache` comenta cache D1, mas usa `env.DB`. No `wrangler.toml`, o comentário diz que `EDGE_CACHE` é para `query_cache` e `rate_limits`; `DB` é para `evolution_index` e `feriados`.

Impacto:

- Cache pode ir para o banco D1 errado.
- Migrações/tabelas podem divergir entre `DB` e `EDGE_CACHE`.

Correção:

- Alterar `queryWithCache` para usar `EDGE_CACHE`.
- Garantir migrations de `query_cache` e `rate_limits` no D1 correto.
- Adicionar teste simples de cache D1 com mock de binding.

### 13. Tipos de bindings são escritos manualmente

Severidade: média

`apps/api/src/types/env.ts` define `Env` manualmente, com vários `any` em `AI`, `BROWSER` e Workflow. A recomendação atual da Cloudflare é gerar tipos com `wrangler types`.

Impacto:

- Drift entre `wrangler.toml` e tipos TypeScript.
- Bindings novos/renomeados podem compilar mesmo incorretos.

Correção:

- Gerar `worker-configuration.d.ts` via `wrangler types`.
- Usar tipos gerados como fonte de verdade e estender apenas o que for app-specific.
- Colocar `wrangler types --check` no CI.

### 14. Worker API está crescendo e pode se beneficiar de decomposição

Severidade: média

O dry-run da API subiu `6568.67 KiB` antes de gzip e `1260.18 KiB` gzip. Está abaixo do limite pago de 10 MB gzip, mas a API concentra muitas responsabilidades: clínica, WhatsApp, PDF, AI, RAG, Workflows, media, analytics.

Impacto:

- Startup e cold path podem piorar com o crescimento.
- Falha em uma área pode afetar deploy da API inteira.
- Limites/custos não são diferenciados por tipo de carga.

Correção:

- Avaliar split em Workers com service bindings:
  - `fisioflow-api-core`
  - `fisioflow-ai`
  - `fisioflow-media`
  - `fisioflow-pdf`
  - `fisioflow-webhooks`
- Deixar o Worker principal apenas como gateway/autorização/roteamento onde fizer sentido.
- Remover dependências pesadas desnecessárias do bundle da API, por exemplo revisar uso de `@aws-sdk/*`, `pg` e `recharts`.

### 15. Web Worker está bom, mas faltam headers e script explícito

Severidade: baixa-média

O Worker web com Static Assets funciona no dry-run. Porém `wrangler deploy --dry-run` avisou que há múltiplos ambientes e o deploy deveria especificar `--env` explicitamente. O script raiz `deploy:web` já usa `--env=""`, mas o comando manual direto ainda avisa.

Correção:

- Manter scripts explícitos:
  - `deploy:web:prod = wrangler deploy --env=""`
  - `deploy:web:staging = wrangler deploy --env staging`
- Considerar adicionar headers de segurança/cache no `asset-worker.ts` ou via regras Cloudflare:
  - CSP
  - `X-Frame-Options`/`frame-ancestors`
  - cache forte para assets hashados
  - `no-store` para HTML se necessário

### 16. Jules bot está desatualizado para padrão atual de Workers

Severidade: baixa-média

`apps/jules-bot/wrangler.toml` usa `compatibility_date = "2024-11-06"` e não habilita observability.

Correção:

- Atualizar `compatibility_date`.
- Adicionar observability.
- Avaliar `nodejs_compat` se bibliotecas do bot exigirem Node APIs.
- Criar staging ou preview antes de prod.

## Plano de execução sugerido

### Sprint 1: segurança e paridade

1. Corrigir CORS para usar `ALLOWED_ORIGINS`.
2. Remover `apps/api/.dev.vars` do Git e rotacionar segredos.
3. Completar `env.staging` com D1, Vectorize, Analytics, Pipelines, Workflows, `PATIENT_AGENT` e Turnstile.
4. Trocar bucket hard-coded de R2 por variável/binding correto.
5. Garantir `workers_dev = false` em produção se os custom domains já estiverem prontos.

### Sprint 2: observabilidade e deploy seguro

1. Configurar `observability.logs` e `observability.traces`.
2. Padronizar logs JSON.
3. Criar dashboard de Analytics Engine/Axiom para p95, 5xx, Queue retries, AI calls e PDF failures.
4. Adotar deploy versionado com tags e mensagens.
5. Definir rollout gradual para API.

### Sprint 3: performance e custo

1. Decidir Hyperdrive vs Neon HTTP e medir p95 por rota.
2. Configurar `limits.cpu_ms` e `limits.subrequests`.
3. Separar filas por tipo de carga.
4. Evitar leitura inteira/base64 de arquivos grandes no Queue.
5. Auditar bundle da API e remover dependências não necessárias.

### Sprint 4: arquitetura paga/avançada

1. Avaliar split por service bindings para AI, media, PDF e webhooks.
2. Ativar AI Search/AutoRAG de forma consistente ou remover fallback morto.
3. Padronizar Secrets Store para segredos compartilhados entre Workers.
4. Formalizar runbook de rollback, DLQ e incidentes.

## Critérios de aceite

- `wrangler deploy --dry-run --env staging` sem avisos de bindings não herdados.
- `wrangler deploy --dry-run --env production` sem avisos e com bundle dentro dos limites.
- `pnpm --filter @fisioflow/api type-check` e testes críticos passando.
- CORS rejeita origem não permitida e aceita apenas origens configuradas.
- `.dev.vars` não aparece em `git ls-files`.
- Upload/delete R2 respeitam bucket de staging/produção.
- Deployments têm tag/mensagem e rollback documentado.
- Observability tem logs/traces com sampling explícito.
- Dashboard ou consulta operacional cobre p95, 5xx, Queue retries, AI/PDF errors e uso por organização.
