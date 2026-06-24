# WhatsApp Unread Message Tracking & Real-time Badge

Implement true unread message tracking for CRM·WhatsApp, counting inbound messages that arrived since the conversation was last read by an agent. Shows a red badge in the Sidebar with real-time updates across sessions.

## User Stories

### US1 — Backend: Track Read State per Conversation
**Priority: P1**

As a backend system, I need to track when each conversation was last read so I can calculate the true unread count.

**Acceptance Criteria:**
- Migration `0129_wa_conversation_read_tracking` adds `last_read_at timestamptz` column to `wa_conversations`
- Index `idx_wa_messages_inbound_conv_created` on `wa_messages(conversation_id, created_at) WHERE direction = 'inbound'`
- `getInboxConversations` returns `unread_count` per conversation (subselect: inbound messages where `created_at > last_read_at` or `last_read_at IS NULL`)
- `getConversationWithMessages` returns `unread_count` for the selected conversation

### US2 — Backend: Mark as Read on Fetch + Broadcast
**Priority: P1**

As an agent opening a conversation, I want it to be marked as read so my badge clears immediately.

**Acceptance Criteria:**
- `GET /conversations/:id` updates `last_read_at = NOW()` before returning
- Broadcasts `whatsapp_read` event to the organization via WebSocket
- Returns updated `unread_count` (0 after marking read)

### US3 — Backend: Unread Count Endpoint
**Priority: P1**

As the frontend, I need a lightweight endpoint to fetch the total unread count for the badge.

**Acceptance Criteria:**
- `GET /api/whatsapp/inbox/unread-count` returns `{ data: { unread: number } }`
- Counts inbound messages where `created_at > last_read_at` or `last_read_at IS NULL`
- Excludes deleted conversations (`metadata->>'deleted_at' IS NULL`)
- Excludes closed conversations

### US4 — Frontend: Real-time Badge Invalidation
**Priority: P2**

As an agent, I want the badge to update in real-time when messages arrive or conversations are read by others.

**Acceptance Criteria:**
- `RealtimeContext` invalidates `["whatsapp", "unread-count"]` on `whatsapp_message`, `whatsapp_read`, `whatsapp_assignment`, `whatsapp_transfer`, `whatsapp_status_update`
- `useWhatsAppConversation` invalidates `["whatsapp", "unread-count"]` after loading a conversation
- `useWhatsAppUnreadCount` hook polls every 30s and revalidates on window focus

## Technical Context

### Stack
- Neon Postgres 17 + Drizzle ORM
- Cloudflare Workers (Hono) — `apps/api/`
- React 19 + TanStack Query — `apps/web/`
- WebSocket realtime via `broadcastToOrg`

### Key Files
- `apps/api/src/lib/whatsapp-conversations.ts` — query functions
- `apps/api/src/routes/whatsapp-inbox.ts` — HTTP endpoints
- `src/contexts/RealtimeContext.tsx` — WebSocket event handling
- `src/hooks/useWhatsApp.ts` — conversation state
- `src/hooks/useWhatsAppUnreadCount.ts` — badge count
- `src/components/layout/Sidebar.tsx` — badge UI

### Dependencies
- Migration must be applied before deploying code (code reads `last_read_at`)
- `broadcastToOrg` already exists in `apps/api/src/lib/realtime.ts`
