# ADR-0006 — API, eventos e confiabilidade

**Status:** Proposta forte

## API

- Prefixo `/api/v1`.
- OpenAPI 3.1 como contrato revisado; SDKs gerados.
- JSON em `camelCase`; datas ISO 8601; dinheiro decimal como string.
- erros compatíveis com Problem Details, `traceId` e códigos estáveis.
- paginação por cursor opaco, sem PII, vinculado a tenant, filtros e ordenação, com validade limitada; limite máximo server-side.
- `Idempotency-Key` em mutações reenviáveis, adquirido atomicamente. Requests concorrentes com a mesma chave e conteúdo recebem o mesmo resultado; mesma chave com hash diferente falha de forma estável.
- `version`/ETag para concorrência otimista; o ETag representa o recurso retornado, não uma versão agregada sem relação com a representação.
- respostas autenticadas/sensíveis usam `Cache-Control: private, no-store`; nenhuma PHI entra em cache compartilhado por padrão.
- mutações autenticadas por cookie exigem defesa CSRF e validação de `Origin`/`Host`. Tokens bearer mantêm proteção contra replay por idempotência e expiração.
- permissão ausente para recurso conhecido retorna `403`; recurso inexistente ou pertencente a outro tenant retorna `404` para evitar enumeração.
- cada operação OpenAPI declara a permission exigida, permitindo teste e geração de SDK coerentes.
- depreciação com janela e telemetria antes de remoção.

## Eventos

- Mutação + outbox na mesma transação.
- O runtime de request somente grava a outbox. Um dispatcher no Worker de jobs, com role própria, publica na Queue e atualiza seu estado; retenção de outbox é separada do domínio.
- Todo handler é idempotente e possui retry limitado, backoff, DLQ e replay auditável. O recibo único `(consumer, eventId)` é persistido na mesma transação do efeito.
- Envelope versionado com `eventId`, `type`, `occurredAt`, identidade/versão do aggregate quando houver promessa de ordenação, `organizationId`, actor/subject tipados e anuláveis, `correlationId`, `causationId` e `data` mínimo.
- Nenhum evento transporta prontuário completo quando um ID e fetch autorizado bastam.
- Contract/integration tests cobrem duplicação, reordenação, concorrência e replay após falha parcial.

## Uso de primitivas

- `waitUntil`: efeitos curtos e não críticos.
- Queue: efeitos desacoplados e tolerantes a atraso.
- Workflow: saga longa, espera externa ou retomada multi-etapa.
- Durable Object: coordenação/realtime com identidade estável.
- Cron: somente disparador; lógica vive em caso de uso idempotente.
