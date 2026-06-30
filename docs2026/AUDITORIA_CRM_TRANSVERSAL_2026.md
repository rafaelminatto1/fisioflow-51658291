# Auditoria CRM + Varredura Transversal — Plano (Jun/2026)

Continuação do trabalho do CRM-WhatsApp. Esta sessão corrigiu uma família de bugs;
este plano usa os **padrões recorrentes** encontrados para caçar bugs equivalentes
em outras áreas. Tudo com TDD + depuração sistemática, deploy automático no push.

## Contexto: o que já foi corrigido (não refazer)
Regressões do refactor da Cloudflare Queue (commit `9b6e7fa8a`) + bugs de UI, todos em prod:
- IG inbound, status WhatsApp (delivered/read/failed), auto-reply real (envia via Meta + await antes do ack), loop infinito `GET /conversations`, service worker `cache.get→match`, aviso+template de janela 24h.
- Dedup de contato por número (E.164 + canônico) com merge; reabertura de conversa soft-deletada; "Nova conversa" estilo WhatsApp; layout `fillViewport` (sem scroll de página); telefone por canal.
- Ingestão+espelhamento de mídia no R2 (WA/IG) + backfill de avatares; envio de mídia pelo inbox; remoção de ~660 linhas de código morto; poll visibility-aware.
- Detalhe em `memory/project_ig_inbound_regression_jun2026.md`.

## Padrões de bug a procurar (o "ouro")
1. **Handler correto virou código morto** após refactor de fila/webhook (POST só enfileira; lógica real não é chamada). Ex.: `processInstagram`, `processWebhook`.
2. **Polling sem visibility-check** (`setInterval`+refetch rodando em aba oculta / com WS ativo) → chatter.
3. **`findOrCreate*` reusando linha soft-deletada** (status ativo mas `metadata.deleted_at`/`deleted_at` setado) → registro recebe dados mas some das listagens.
4. **Telefone sem normalização E.164** → contatos/leads/pacientes duplicados.
5. **`SELECT DISTINCT` + `ORDER BY <col não no select>`** → 500 em runtime (não pega no typecheck).
6. **URL efêmera de CDN (Meta/IG/terceiros) salva direto** → 403 quando expira (espelhar no R2).
7. **Trabalho assíncrono com `void` após `ack()`/resposta** em Workers → cortado pelo runtime (usar `await`/`waitUntil`).

## Áreas priorizadas

### P1 — Varredura transversal (rápida, espalhada, alto retorno)
- `grep` por `setInterval` em `src/hooks/**` e adicionar visibility-check onde faz poll.
- `grep` por `findOrCreate`/`SELECT ... status IN (...)` sem filtro de soft-delete (pacientes, leads, tarefas, conversas de outros canais).
- `grep` por `SELECT DISTINCT` com `ORDER BY` em `apps/api/src/**` e validar colunas.
- `grep` por números de telefone gravados sem E.164 (pacientes/leads) — comparar com `toE164Brazil`/`canonicalBrazilPhone` em `apps/api/src/lib/whatsapp-identity.ts`.
- `grep` por `lookaside`/`cdninstagram`/`graph.facebook` salvos em colunas de URL.
- `grep` por `void ` antes de `ack()`/`return c.json` em consumidores/handlers.

### P2 — Agenda (FullCalendar) — tela mais usada
- Mesma lente do padrão #1 em handlers de agendamento; conflito de horário; fuso/`parseAnyDate` (já teve off-by-one em `src/lib/date-utils.ts`); confirmar correção do flicker de drag-drop (memória `project_agenda_fullcalendar_jun2026`).

### P3 — Evolução clínica / autosave (TipTap)
- Revalidar ciclo salvar→editar→salvar (bug antigo de autosave parar) e drenagem da fila offline (IndexedDB).

### P4 — Webhooks/filas irmãos
- Google Calendar, automação `send_webhook`, Inngest: handler correto virou código morto? shape errado?

### P5 — Resto do CRM (pontas soltas)
- Testar envio de mídia outbound com arquivo real (WA/IG, limite 16MB).
- Concierge: saudar 1x por conversa/janela (hoje repete a cada msg).
- Tipos `location`/`contacts`/`interactive`/reações renderizam? Senão, tratar.
- Checar aprovação do template `reengajamento` e travar envio até `APPROVED`.

## Convenções e gotchas (OBRIGATÓRIO seguir)
- **Deploy é automático no push p/ `main`** (`.github/workflows/production.yml`: gate→deploy api+web→smoke). NÃO rodar deploy manual junto (corrida de hashes). Só push.
- **TDD** (`superpowers:test-driven-development`) + **systematic-debugging** antes de qualquer fix. Teste RED→GREEN.
- **Testes**: API roda de `apps/api/` (`cd apps/api && npx vitest run`); o vitest da raiz **exclui** `apps/api/**`. Typecheck: `npx tsc --noEmit` em cada pacote.
- **cron tick `*/5` deve ser DB-free** senão `cron.test.ts` falha o Quality Gate e **bloqueia TODOS os deploys** silenciosamente.
- Migrations: próximo número sequencial em `apps/api/migrations/` + `.down.sql` se destrutivo.
- NÃO hardcode strings `@cf/...` (usar registry em `apps/api/src/lib/workersAi.ts`).
- PT-BR na UI; sem glassmorphism (superfícies sólidas).
- **NÃO** mexer em `src/components/automation/builder/{parts,nodes}.tsx` (scaffolding WIP, ~120 warnings de lint não relacionados).
- Secrets do Worker via `wrangler` (não dá p/ ler valor local). Validar endpoint autenticado em prod via console do navegador logado: `fetch('/__neon-auth/get-session',{credentials:'include',headers:{Accept:'application/json'}})` → header `set-auth-jwt` → `Bearer`.
- Neon prod: projeto `purple-union-72678311`, org `00000000-0000-0000-0000-000000000001`. Usar MCP Neon p/ SQL.
- Espelhamento R2: helper `apps/api/src/lib/media-mirror.ts` (`mirrorToR2`/`mirrorWhatsAppMedia`); bucket binding `MEDIA_BUCKET`, domínio `R2_PUBLIC_URL` (media.moocafisio.com.br).

## Critério de pronto por fix
RED→GREEN com teste, typecheck limpo nos 2 pacotes, suite passando (API 437+/437+), commit + push (deploy automático), e validação em prod (SQL via MCP Neon e/ou navegador). Atualizar `memory/` ao final.
