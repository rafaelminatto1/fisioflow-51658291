# Reindex resiliente da base de conhecimento — design

**Data:** 2026-07-22
**Status:** aprovado para plano
**Contexto:** correção de confiabilidade do reindex assíncrono (feature entregue no mesmo dia, commit `150e24c37`).

## Problema

A validação em produção do primeiro reindex assíncrono (560 itens enfileirados) expôs três defeitos:

1. **Falhas não re-tentadas.** ~30/560 itens falharam no upload ao AI Search (503 sob o pico) e **não foram re-tentados**: os syncs per-item (`syncProtocol/Exercise/WikiToIndex`) capturam e engolem o erro (`console.error` + `return`, sem `throw`). Como `reindexKbItem` não relança, o `handleQueue` executa `message.ack()` → a fila descarta a mensagem.
2. **Ruído/fragilidade de limpeza.** ~400 warnings `chunk cleanup failed`. Causa: `deleteChunkFiles` usa `items.list({ search: prefix, per_page: 100 })`, mas na Items API do AI Search **`search` é busca por conteúdo** (não por chave/nome) e **`per_page` máximo é 50**. A limpeza raramente encontra os chunks certos e frequentemente erra a chamada. Também deixa **chunks órfãos** quando um doc encolhe.
3. **Sem verificação confiável.** Não há fonte de verdade para "quantos/quais itens indexaram". Os logs de observability são amostrados; a `items.list` estava sendo mal usada.

## Princípios (docs Cloudflare, jul/2026)

- **Queues é a ferramenta certa** para N itens independentes e idempotentes (Workflows seria overkill e mais caro — reservado a passos dependentes com checkpoint).
- Consumidores devem ser **idempotentes** (entrega at-least-once). `reindexKbItem` já é (upsert por chave determinística).
- **Backoff exponencial por `message.attempts`** em retries; distinguir transitório (retry) de permanente (deixar ir à DLQ). `max_retries=3` + DLQ.
- **Built-in storage indexa na hora** e **não** re-tenta uploads que falharam (a auto-retry-no-próximo-sync é só para fontes R2/website). Logo, falha no upload é nossa responsabilidade → retry na fila.
- A **Items API é a fonte de verdade**: `items.list({ status })` aceita `queued | running | completed | error | skipped | outdated`; `per_page` máx. 50; há filtro `key` (chave exata) e `source`.

## Decisão

Manter Queues. Tornar o reindex **auto-curável** e **verificável** via capacidades nativas do AI Search, com limpeza determinística. Sem migrar para pgvector; sem Workflows.

### 1. Auto-cura (retry + DLQ + backoff)

- Extrair um **core que lança erro** por item. Refatorar `contentIndexing`: funções internas `indexProtocol/indexExercise/indexWiki` que **propagam** exceções; as públicas `syncXToIndex` (usadas nos hooks de create/update) mantêm o `try/catch` que engole (comportamento atual preservado).
- `reindexKbItem` chama o core que **lança** → em falha, o `handleQueue` cai no `catch` e faz `message.retry(...)`.
- Adicionar **backoff exponencial** no `catch` do `handleQueue`: `message.retry({ delaySeconds: Math.min(2 ** message.attempts * 5, 300) })`. Aplica-se a todos os tipos de task (melhoria geral). Após `max_retries` (3) → DLQ `fisioflow-tasks-dlq` (já configurada como `dead_letter_queue` do `fisioflow-background-tasks`).

### 2. Limpeza determinística (fim do ruído + órfãos)

- Nova tabela `kb_index_chunks(doc_key TEXT PRIMARY KEY, source TEXT, chunk_count INT NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())`. Migração **0141** (+ `.down.sql`).
- No index de um doc: ler `chunk_count` anterior; subir os novos chunks `{base}--0..newN-1` (upsert por chave = overwrite); se `oldN > newN`, apagar **por chave exata** `{base}--newN..oldN-1` via `items.delete`; gravar `chunk_count = newN`. **Sem `items.list`.**
- Remover a `deleteChunkFiles` baseada em `search`. Remoção total de um doc (`removeXFromIndex`) apaga `{base}--0..count-1` (pelo count salvo) + o doc legado single-file, e limpa a linha da tabela.
- Docs sem linha ainda (indexados antes desta mudança): tratados como `oldN = 0` (nenhum delete) — o overwrite cobre; eventuais órfãos do formato antigo são raros e inofensivos; um segundo reindex já registra o count e normaliza.

### 3. Verificável (status nativo)

- `GET /api/ai-search/reindex/status` (interno/admin): retorna contagem por status via `items.list({ status })` (`completed`, `running`/`queued`, `error`), agregando páginas (`per_page: 50`). Opcionalmente por origem.
- Corrigir `per_page` para `≤ 50` no endpoint `GET /items` existente.
- O botão "Reindexar base" no front passa a, após enfileirar, exibir o status real (ex.: "512 indexados, 40 processando, 8 com erro") consultando o endpoint de status. Sem polling contínuo — uma consulta ao abrir/curtir; refresh manual.

### Fora de escopo (evolução futura)

Barra de progresso ao vivo, listagem clicável de itens com erro, botão "reprocessar só as falhas". Mitigação atual: re-clicar "Reindexar" é idempotente e cobre stragglers; o endpoint de status revela erros; a DLQ retém falhas persistentes por 4 dias (visíveis no dashboard).

## Componentes e limites

| Unidade | Responsabilidade | Depende de |
|---|---|---|
| `contentIndexing` (core `index*` + público `syncX`) | montar chunks, upsert por chave, limpeza determinística por delta | `sectionChunker`, `kb_index_chunks`, AI Search Items API |
| `kbReindex` | enfileirar por item; `reindexKbItem` chama o core que lança | `contentIndexing`, `BACKGROUND_QUEUE` |
| `handleQueue` | ack/retry por mensagem + backoff exponencial | Queues |
| rota `reindex` / `reindex/status` | enfileirar (admin) + status via Items API | `kbReindex`, AI Search |
| `KnowledgeAsk` (front) | botão + resumo de status | `aiSearchApi` |

## Testes

- `kb_index_chunks` upsert/leitura; cálculo do delta de chunks a apagar (função pura testável: `chunksToDelete(base, oldN, newN)`).
- `reindexKbItem` **relança** em falha (mock do core lançando).
- `handleQueue`: em falha do REINDEX_KB_ITEM, chama `retry` com `delaySeconds` de backoff (não `ack`).
- backoff: `backoffDelay(attempts)` pura.
- status endpoint: agrega contagens de `items.list({status})` (mock do binding).

## Dados de produção (verificados via Neon/Sentry MCP)

- **DB de produção:** projeto Neon `purple-union-72678311` (`minatto`, us... sa-east-1, pg17). É a que o Worker usa (contagens batem).
- **Contagens (jul/2026):** `exercise_protocols` públicos = **104**, `exercises` públicos+ativos = **394**, `wiki_pages` públicos = **62** → total **560** (bate exatamente com os "560 itens" enfileirados).
- `kb_index_chunks` **não existe** ainda → migração 0141 a cria.
- **Sentry limpo** (orgs `activity-fisioterapia` e `-rg`, 24h): as falhas de sync não aparecem porque são engolidas — reforça o valor de relançar o erro (retry + visibilidade).
- A migração 0141 deve ser aplicada em `purple-union-72678311`. **Não aplicar autonomamente** — pedir confirmação (padrão do projeto: migrations via CI/deploy).

## Verificação end-to-end

Deploy → re-disparar reindex → `GET /reindex/status` mostra `error` caindo a zero ao longo dos retries; `items.list({status:"error"})` vazio ao fim; nenhuma nova ocorrência de `chunk cleanup failed` nos logs; query RAG retorna com fontes.
