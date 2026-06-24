# Tasks: WhatsApp Unread Message Tracking & Real-time Badge

**Input**: Design documents from `/specs/whatsapp-unread-tracking/`
**Prerequisites**: spec.md

**Status**: 🟡 In Progress — US1 e US2 backend completos, US3 endpoint corrigido, US4 frontend parcial

## Contexto

Feature de rastreamento de mensagens não lidas no CRM·WhatsApp. Conta inbound messages que chegaram desde a última vez que o atendente leu a conversa, exibe badge vermelho no Sidebar e atualiza em tempo real via WebSocket.

---

## Phase 1: Setup — Migration 0129 (✅ Completa)

**Purpose**: Adicionar `last_read_at` em `wa_conversations` e índice para contagem eficiente.

- [x] T001 Criar migration `0129_wa_conversation_read_tracking.sql` com `ADD COLUMN last_read_at` + `CREATE INDEX idx_wa_messages_inbound_conv_created`
- [x] T002 Criar migration down `0129_wa_conversation_read_tracking.down.sql`

**Checkpoint**: Migration pronta para aplicação no banco.

---

## Phase 2: User Story 1 — Backend: Track Read State per Conversation (Priority: P1) ✅ Completa

**Goal**: Queries de inbox e conversa retornam `unread_count` real baseado em `last_read_at`.

**Independent Test**: Chamar `getInboxConversations` e verificar que `unread_count` retorna o número correto de inbound messages não lidas.

- [x] T003 [US1] Atualizar `getInboxConversations` em `apps/api/src/lib/whatsapp-conversations.ts` para incluir subselect de `unread_count` (inbound onde `created_at > last_read_at` ou `last_read_at IS NULL`)
- [x] T004 [US1] Atualizar `getConversationWithMessages` em `apps/api/src/lib/whatsapp-conversations.ts` para incluir o mesmo subselect de `unread_count`

**Checkpoint**: Ambas as queries retornam `unread_count` correto.

---

## Phase 3: User Story 2 — Backend: Mark as Read on Fetch + Broadcast (Priority: P1) ✅ Completa

**Goal**: Ao abrir uma conversa, marca como lida e broadcasta evento para atualização em tempo real.

**Independent Test**: Chamar `GET /conversations/:id` e verificar que `last_read_at` foi atualizado e evento `whatsapp_read` foi broadcastado.

- [x] T005 [US2] Adicionar `UPDATE wa_conversations SET last_read_at = NOW()` no `GET /conversations/:id` em `apps/api/src/routes/whatsapp-inbox.ts`
- [x] T006 [US2] Adicionar `broadcastToOrg` com tipo `whatsapp_read` após marcar lido
- [x] T007 [US2] Refetch da conversa após marcar lido para retornar `unread_count` atualizado (0)

**Checkpoint**: Abrir conversa marca como lida e notifica outros usuários.

---

## Phase 4: User Story 3 — Backend: Unread Count Endpoint (Priority: P1) ✅ Completa

**Goal**: Endpoint leve `/unread-count` para o badge do Sidebar.

**Independent Test**: Chamar `GET /api/whatsapp/inbox/unread-count` e verificar que retorna o total de inbound não lidas da organização.

- [x] T003 [US3] Corrigir query do `/unread-count` em `apps/api/src/routes/whatsapp-inbox.ts` — trocar `SUM(unread_count)` (coluna inexistente) por `COUNT(*)` de mensagens inbound com `created_at > last_read_at`

**Checkpoint**: Endpoint retorna contagem real e performática (custo ~5.3 no plano de execução).

---

## Phase 5: User Story 4 — Frontend: Real-time Badge Invalidation (Priority: P2) 🟡 Parcial

**Goal**: Badge atualiza em tempo real quando mensagens chegam ou conversas são lidas por outros.

**Independent Test**: Com duas sessões abertas, marcar lido em uma e verificar que o badge da outra atualiza sem refresh.

- [x] T009 [US4] Adicionar handling de eventos WhatsApp no `RealtimeContext.tsx` — invalidar `["whatsapp", "unread-count"]` e `["whatsapp", "inbox"]` em `whatsapp_message`, `whatsapp_read`, `whatsapp_assignment`, `whatsapp_transfer`, `whatsapp_status_update`
- [x] T010 [US4] Adicionar invalidação no `useWhatsAppConversation` — invalidar `["whatsapp", "unread-count"]` após carregar conversa
- [x] T011 [US4] Criar hook `useWhatsAppUnreadCount` em `src/hooks/useWhatsAppUnreadCount.ts` com polling 30s e revalidação no foco
- [x] T004 [US4] Adicionar `fetchUnreadCount()` em `src/services/whatsapp-api.ts`
- [x] T005 [US4] Conectar hook no Sidebar e renderizar badge vermelho (já implementado no commit anterior)
- [ ] T012 [US4] Testar fluxo completo com duas sessões simultâneas (manual)

**Checkpoint**: Badge atualiza em tempo real em todas as sessões ativas.

---

## Phase 6: Consolidação de Rotas (✅ Completa — commit anterior)

**Goal**: Eliminar duplicidade `/whatsapp/inbox` vs `/crm-whatsapp`.

- [x] T013 Transformar `/whatsapp/inbox` em `<Navigate to="/crm-whatsapp" replace />`
- [x] T014 Remover `src/pages/WhatsAppInbox.tsx` (re-export)
- [x] T015 Atualizar itens de menu no Sidebar e MobileHeader para apontar a `/crm-whatsapp`
- [x] T016 Corrigir referência em `src/routes.ts` (framework-mode)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validação final, testes e deploy.

- [ ] T017 Aplicar migration 0129 no Neon de produção
- [ ] T018 Typecheck final (frontend + API) — sem erros
- [ ] T019 Testar redirect `/whatsapp/inbox` → `/crm-whatsapp` com bookmark antigo
- [ ] T020 Validar badge com dados reais (mensagens inbound na org de produção)
- [ ] T021 Validar real-time com duas sessões simultâneas

---

## Dependency Graph

```
Phase 1 (Migration)
    ↓
Phase 2 (US1: unread_count nas queries)
    ↓
Phase 3 (US2: marcar lido + broadcast) ←→ Phase 4 (US3: /unread-count)
    ↓
Phase 5 (US4: real-time badge)
    ↓
Phase 6 (Consolidação de rotas) — independente, já feito
    ↓
Phase 7 (Polish)
```

## Parallel Opportunities

- US2 e US3 podem ser implementados em paralelo (dependem só de US1)
- US4 (frontend) é independente de US2/US3 (só precisa do endpoint existir)
- Phase 6 (rotas) é independente de todas as outras

## Implementation Strategy

**MVP atual**: US1 + US2 + US3 + Phase 6 (commits 1 e 2) — já implementados.
**Incremento restante**: Validação manual (T012, T020, T021) + aplicação da migração em produção (T017).
