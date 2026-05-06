# Analise de custo Neon/Cloudflare - 2026-05-04

## Resumo executivo

A fatura alta deste mes nao parece vir de armazenamento nem de volume real de dados. O banco Neon `minatto` tem cerca de 30 MB, mas o compute da branch `production` ficou praticamente sempre ativo no inicio do ciclo de maio.

A causa mais provavel era o cron de health check a cada minuto:

- `apps/api/wrangler.toml` configurava `* * * * *`.
- `apps/api/src/cron.ts` chama `runHealthMonitor(env)`.
- `apps/api/src/lib/monitor.ts` chamava `https://api-pro.moocafisio.com.br/api/health/ready`.
- `apps/api/src/index.ts` em `/api/health/ready` executa `SELECT 1` no Neon.
- O Neon suspende o compute depois de 5 minutos sem atividade. Uma consulta por minuto impede o scale-to-zero.

Isso e especialmente caro para a regra de negocio atual: a clinica fecha as 21h e abre as 7h; de 22h ate 6h normalmente nao ha alteracoes. Nessa janela, o banco deveria dormir.

## Evidencias coletadas

### Neon

Projeto:

- Nome: `minatto`
- Project ID: `purple-union-72678311`
- Regiao: `aws-sa-east-1`
- Plano: `launch`
- Postgres: 17
- Autoscaling default: `0.25` a `1` CU
- Scale-to-zero: `300s`
- Retencao: 7 dias

Branch principal `production`:

- `active_time_seconds`: `320080` (~88,9 horas)
- `cpu_used_sec`: `82976` (~23,0 CU-h)
- `data_transfer_bytes`: `228950213` (~218 MB)
- `logical_size`: ~52,5 MB
- Banco consultado via Postgres: ~30 MB

Interpretacao: como o reset de quota e `2026-06-01T00:00:00Z`, esses numeros indicam quase 24/7 de atividade nos primeiros dias de maio.

### Cloudflare Hyperdrive

Binding `fisioflow-neon`:

- Origin: Neon pooler
- Usuario: `app_runtime`
- `origin_connection_limit`: 20
- Cache: ligado
- `max_age`: 300s
- `stale_while_revalidate`: 60s

O comentario no `wrangler.toml` fala em cache de 1h, mas o recurso real esta em 5 minutos.

### D1/cache de borda

D1 `fisioflow-edge-cache`:

- Tamanho: 45,1 kB
- `read_queries_24h`: 1
- `query_cache`: 0 linhas

D1 `fisioflow-db`:

- Tamanho: 61,4 kB
- `read_queries_24h`: 0
- `query_cache`: 0 linhas

Conclusao: existe helper `queryWithCache`, mas nao ha uso real no codigo e os caches D1 estao vazios.

### Postgres interno

O banco esta pequeno. Maiores tabelas:

- `exercises`: 356 linhas, ~3,1 MB
- `patients`: 129 linhas, ~712 kB
- `appointments`: 383 linhas, ~464 kB
- `neon_auth.session`: 287 linhas, ~400 kB

`pg_stat_statements` estava praticamente resetado ou sem historico util; apos a consulta, so havia as proprias queries de diagnostico. Para analise mais fina de endpoints caros, precisamos habilitar observabilidade por rota no Worker ou exportar metricas.

## Confirmacao com documentacao atual

Fontes verificadas em 2026-05-04:

- Neon Pricing: Launch cobra uso por CU-hora; formula: `CU-hours = media de CU * horas ativas`; Launch lista `$0.106/CU-hour`.
- Neon Scale to Zero: computacao suspende apos 5 minutos sem atividade e volta automaticamente quando recebe nova consulta.
- Neon Compute lifecycle: compute fica `Active` quando ha conexao/operacao; sem atividade por 5 minutos entra em idle se scale-to-zero estiver habilitado.
- Cloudflare Cron Triggers: crons rodam em UTC e `* * * * *` significa a cada minuto.
- Cloudflare Hyperdrive Query Caching: cacheia consultas read-only cacheaveis; funcoes volateis e queries mutantes nao sao cacheadas; default e 60s/15s, mas o recurso atual esta 300s/60s.
- Drizzle/Neon: Drizzle com `neon-http` suporta `db.batch` para reduzir round trips; `@neondatabase/serverless` recomenda `neon()` por HTTP para queries simples e Pool/WebSocket/TCP para transacoes ou compatibilidade.

## Estimativa de impacto

Com minimo de `0.25 CU`, manter o banco ativo 24/7 consome aproximadamente:

- `0.25 CU * 24h * 30 dias = 180 CU-h/mes`
- Em Launch a `$0.106/CU-h`, isso da cerca de `$19,08/mes` so de compute minimo.

Se a clinica permitir o banco dormir de 22h a 6h, sao 8h/dia de economia potencial:

- `0.25 CU * 8h * 30 dias = 60 CU-h/mes`
- Economia estimada: `60 * $0.106 = $6,36/mes`

Se tambem evitar checks constantes fora de horario e em fins de semana, o ganho aumenta. O custo de storage atual e irrelevante: dezenas de MB contra cobranca por GB-mes.

## Plano recomendado

### Prioridade 0 - corrigir o desperdiçador principal

Remover o health check de banco do cron de 1 minuto.

Opcoes:

1. Trocar `* * * * *` por `*/5 * * * *`, mantendo monitoramento 24/7 sem consulta ao Neon.
2. Trocar `/api/health/ready` por `/api/health` no monitor frequente.
3. Criar dois endpoints:
   - `/api/health/live`: sem DB, para monitoramento frequente.
   - `/api/health/ready`: com DB, para checks manuais, deploy gate e janelas de expediente.

Recomendacao: aplicar 2 e 3. O monitor de minuto deve ser liveness, nao readiness com banco.

### Prioridade 1 - respeitar horario da clinica

Usar a regra 7h-21h:

- Fora de 22h-6h, evitar qualquer rotina que acorde o Neon, exceto incidentes reais.
- Rodar prewarm somente perto de 6h55-7h00.
- Mover syncs pesados de 2h/3h para 6h-7h ou torna-los condicionais.

Hoje ha cron de WikiSync as 02h BRT e KnowledgeSync as 03h BRT. Eles podem acordar banco/AI/Vectorize quando ninguem esta usando.

### Prioridade 2 - ativar cache de verdade nos endpoints de leitura

O helper `queryWithCache` existe, mas nao e usado. Aplicar cache em:

- Protocolos/templates/exercicios/categorias: TTL 1h a 24h.
- Configuracoes de agenda/status/business hours: TTL 15min a 1h, invalidando em escrita.
- Analytics/dashboard financeiro: TTL 5min durante expediente; TTL ate 8h fora do expediente.
- Feriados nacionais e listas estaticas: mover integralmente para D1/KV.

### Prioridade 3 - ajustar Hyperdrive

O Hyperdrive real esta com cache 300s/60s. Para dados estaticos, considerar:

- `max_age=3600`
- `stale_while_revalidate=300`

Mas isso so ajuda queries que passam pelo Hyperdrive/TCP. Parte do codigo usa `createDb()` com `neon-http`; essas queries nao aproveitam o cache do Hyperdrive.

### Prioridade 4 - padronizar acesso ao banco

Hoje ha mistura de:

- `createDb()` com `neon-http`
- `createPool()`/`getRawSql()` com fallback TCP/Hyperdrive
- `pg` pool global para writes

Padronizar:

- Leituras cacheaveis e rotas de API: Hyperdrive quando cache fizer sentido.
- Queries simples sem cache e edge-safe: `neon-http`.
- Escritas/transacoes: pool/Hyperdrive, com `max` menor que 20 se houver baixa concorrencia real.

### Prioridade 5 - observabilidade por rota

Adicionar medicao por rota:

- rota normalizada
- metodo
- status
- tempo total
- numero aproximado de queries
- cache hit/miss
- organizacao anonimizada

Enviar para Analytics Engine ou Axiom. Sem isso, `pg_stat_statements` pode nao reter historico suficiente para saber quais telas causam custo.

## Perguntas de negocio resolvidas

Resolvidas em 2026-05-04:

1. A agenda nao precisa enviar lembretes/WhatsApp durante a madrugada. Janela permitida: 06h ate 22h BRT.
2. O monitoramento de madrugada nao precisa acordar o banco; basta monitorar Worker/API.
3. Pacientes podem receber dados cacheados entre 22h e 6h, pois dificilmente um profissional atualiza planos nesse horario.
4. Wiki/protocolos podem sincronizar quando a clinica abrir.
5. Telemedicina nao precisa estar disponivel 24/7; somente horario comercial.

## Implementacao aplicada

- Monitor frequente passou a consultar `/api/health`, sem `SELECT 1` no Neon.
- Cron de monitoramento mudou de a cada minuto para a cada 5 minutos.
- WikiSync mudou de 02h BRT para 07h BRT.
- KnowledgeSync mudou de 03h BRT segunda para 07h10 BRT segunda.
- O handler de cron deixou de criar pool de banco para o caso de monitoramento leve.
- Configuracoes estaveis de agenda passaram a usar cache D1 `EDGE_CACHE.query_cache`:
  business hours, regras de cancelamento, notificacoes, capacidade, statuses, booking window e slot config.
- TTL do cache de agenda: 15 minutos durante expediente, 8 horas entre 22h e 6h BRT.
- Escritas relacionadas invalidam a chave de cache da organizacao antes de responder.

## Infra aplicada em producao em 2026-05-04

- Endpoint Neon production `ep-wandering-bonus-acj4zwvo` ajustado para:
  - `autoscaling_limit_min_cu = 0.25`
  - `autoscaling_limit_max_cu = 0.25`
  - `suspend_timeout_seconds = 300`
- Worker Cloudflare `fisioflow-api` publicado em producao.
- Versao publicada: `c2771fca-dcce-403b-967a-46c00b4d8d42`.
- Smoke test de producao: `GET https://api-pro.moocafisio.com.br/api/health` retornou `{"status":"ok","env":"production"}`.

Observacao operacional: o `CLOUDFLARE_API_TOKEN` atual nao tem permissao `ai-search write`, entao o deploy falha se esse token estiver presente no ambiente. Para deploys com o binding `AI_SEARCH`, usar o OAuth do Wrangler com:

```bash
env -u CLOUDFLARE_API_TOKEN wrangler deploy --env production
```

## Revisao em 2026-05-05

Ao reavaliar os contadores do Neon em 2026-05-05 12:13 BRT, o compute ja estava limitado a `0.25 / 0.25`, mas os contadores ainda tinham subido mais do que o esperado durante a noite. A investigacao mostrou dois pontos de risco:

- O Hyperdrive estava apontando para o host `-pooler` do Neon. Para Hyperdrive + Neon, a documentacao da Cloudflare recomenda usar a connection string sem pooling no Neon, porque o Hyperdrive ja faz pooling.
- `apps/api/src/lib/db.ts` mantinha um `pg.Pool` global no Worker. A documentacao de Hyperdrive recomenda criar o cliente dentro do handler/invocacao, pois o pooling de origem ja e responsabilidade do Hyperdrive.

Correcoes aplicadas:

- Hyperdrive `fisioflow-neon` atualizado para o host direto `ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech`.
- `origin_connection_limit` reduzido de `20` para `5`.
- `sslmode=require` mantido.
- `apps/api/src/lib/db.ts` deixou de usar `pg.Pool` global e passou a criar/encerrar `pg.Client` por query/transacao TCP.
- API publicada novamente em producao.
- Versao publicada: `627820e5-51aa-4194-b49d-5b8a8cd1419d`.
- Smoke tests:
  - `GET /api/health`: `ok`
  - `GET /api/health/ready`: `ready`, com `db=ok` e `kv=ok`

Para avaliar o efeito real, comparar `cpu_used_sec`/`compute_time_seconds` no dia seguinte, sem chamar endpoints de readiness fora do horario.

## Protecao extra aplicada em 2026-05-05

- `/.git` e `/.git/*` agora respondem `403 Forbidden` no Worker, antes de chegar ao Hono.
- A rota raiz `/` nao tem handler explicito na API e responde `404 Not Found`.
- A request `GET /` vista no Analytics Engine parece ser um acesso de bot/probe ou visita ao dominio raiz da API, nao uma rota funcional do produto.

## Identificacao de bots

Nao foi possivel atribuir o probe a Codex, Cloudflare ou GitHub com os dados historicos disponiveis. O que foi feito para a proxima ocorrencia:

- Registrar `User-Agent`, `Referer`, `CF-Connecting-IP`, `CF-Ray`, `asn`, `asOrganization`, `country`, `colo`.
- Registrar `request.cf.botManagement.score` e `verifiedBot` quando Cloudflare disponibilizar esses campos.
- Manter bloqueio de `/.git/*` no edge.

Se o valor vier de um verificador conhecido, o `asOrganization` e o `User-Agent` tendem a denunciar rapidamente a origem. Se vier de bot verificado, `request.cf.botManagement.verifiedBot` ou um `botScore` alto ajudam a confirmar. Sem isso, o melhor classificador continua sendo `asn + user-agent + padrao de repeticao + horario`.
