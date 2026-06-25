# Tarefas: Context Menu (Clique Direito) no CRM·WhatsApp

## Fase 1 — Menu de Contexto na Lista de Conversas (Contato)

- [x] T001 [P] Adicionar estado `conversationMenu` e handler `openConversationMenu` em `src/pages/CrmWhatsApp.tsx`
 - [x] T002 [P] Adicionar `onContextMenu` no componente `ConversationCard` para abrir o menu de contato
 - [x] T003 [P] Criar componente `ConversationContextMenu` com ações: Fixar, Silenciar, Marcar como não lida, Excluir
- [ ] T004 Implementar ação "Fixar conversa" (pin) — atualizar `metadata.pinned` em `wa_conversations` via `updateConversationFields`
- [ ] T005 Implementar ação "Silenciar notificações" — atualizar `metadata.muted_until` em `wa_conversations`
- [ ] T006 Implementar ação "Marcar como não lida" — resetar `last_read_at` para null em `wa_conversations`
- [ ] T007 Implementar ação "Excluir conversa" — chamar `markConversationDeleted` já existente no backend

## Fase 2 — Menu de Contexto na Mensagem (Expandir)

- [ ] T008 Adicionar item "Editar mensagem" no menu de mensagem (visível apenas para outbound, dentro de 15min)
- [ ] T009 Adicionar item "Excluir mensagem" no menu de mensagem (visível apenas para outbound, dentro do prazo)
- [ ] T010 Implementar `handleEditMessage` — chama `editMessageContent` já existente no backend
- [ ] T011 Implementar `handleDeleteMessage` — chama `markMessageDeleted` já existente no backend
- [ ] T012 Adicionar badge "editada" na mensagem editada (renderização condicional em `MessageBubble`)
- [ ] T013 Adicionar confirmação antes de excluir mensagem (modal leve inline)

## Fase 3 — Funcionalidades Complementares

 - [x] T014 [P] Adicionar atalhos de teclado: `Ctrl+E` arquivar, `Ctrl+Shift+M` mute, `Ctrl+Backspace` deletar
 - [ ] T015 [P] Adicionar busca global `Ctrl+F` (filtrar conversas por conteúdo de mensagens)
 - [x] T016 Adicionar item "Copiar nome/telefone" no menu de contexto do contato
 - [ ] T017 Adicionar item "Criar/ver paciente" no menu de contexto do contato

## Dependências

- Fase 2 depende da Fase 1 (estrutura de menu já estabelecida)
- Fase 3 é independente, pode ser feita em paralelo

## Arquivos principais

- `src/pages/CrmWhatsApp.tsx` — Página principal do CRM
- `src/services/whatsapp-api.ts` — Cliente API (adicionar funções: `pinConversation`, `muteConversation`, `markConversationUnread`, `editMessage`, `deleteMessage`)
- `apps/api/src/lib/whatsapp-conversations.ts` — Backend (funções já existem: `editMessageContent`, `markMessageDeleted`, `updateConversationFields`)
