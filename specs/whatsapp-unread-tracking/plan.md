# Plan: WhatsApp Unread Message Tracking & Real-time Badge

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend  │     │   Cloudflare     │     │   Neon Postgres  │
│  React +    │────▶│   Worker (Hono)  │────▶│                  │
│  TanStack   │◀────│                  │◀────│  wa_conversations│
│  Query      │     │  broadcastToOrg  │     │  wa_messages     │
└─────────────┘     └──────────────────┘     └─────────────────┘
       │                     │
       │    WebSocket        │
       └─────────────────────┘
```

## Data Model Changes

### Migration 0129: `wa_conversations.last_read_at`

```sql
ALTER TABLE wa_conversations
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_wa_messages_inbound_conv_created
  ON wa_messages (conversation_id, created_at)
  WHERE direction = 'inbound';
```

### Unread Count Calculation

```sql
-- Per conversation (used in getInboxConversations and getConversationWithMessages)
SELECT COUNT(*)::int
FROM wa_messages m
WHERE m.conversation_id = c.id
  AND m.direction = 'inbound'
  AND (c.last_read_at IS NULL OR m.created_at > c.last_read_at)

-- Total per organization (used in /unread-count endpoint)
SELECT COUNT(*)::int
FROM wa_messages m
JOIN wa_conversations c ON c.id = m.conversation_id
WHERE c.organization_id = $1
  AND (c.metadata->>'deleted_at') IS NULL
  AND c.status <> 'closed'
  AND m.direction = 'inbound'
  AND (c.last_read_at IS NULL OR m.created_at > c.last_read_at)
```

## API Endpoints

### Modified: `GET /conversations/:id`
- Add `UPDATE wa_conversations SET last_read_at = NOW()` before fetch
- Broadcast `whatsapp_read` event to organization
- Refetch conversation to return updated `unread_count`

### Modified: `GET /unread-count`
- Fix query to count inbound messages with `created_at > last_read_at`
- Exclude deleted and closed conversations

## Real-time Events

| Event | Trigger | Frontend Action |
|-------|---------|-----------------|
| `whatsapp_message` | New message sent/received | Invalidate badge + inbox |
| `whatsapp_read` | Conversation opened | Invalidate badge + inbox |
| `whatsapp_assignment` | Conversation assigned | Invalidate inbox |
| `whatsapp_transfer` | Conversation transferred | Invalidate inbox |
| `whatsapp_status_update` | Status changed | Invalidate inbox |

## Frontend State Management

- **Hook**: `useWhatsAppUnreadCount` — polls `/unread-count` every 30s, revalidates on window focus
- **Invalidation triggers**:
  - `RealtimeContext` on WebSocket events
  - `useWhatsAppConversation` after loading a conversation
- **UI**: Red badge on Sidebar "CRM · WhatsApp" item (already implemented)

## Technical Constraints

- Migration must be applied before code deploy (code reads `last_read_at`)
- `broadcastToOrg` already exists in `apps/api/src/lib/realtime.ts`
- Uses existing TanStack Query infrastructure
- No new dependencies

## Constitution Check

- ✅ TypeScript strict mode maintained
- ✅ No hardcoded AI model strings
- ✅ RLS pattern preserved (organization_id filtering)
- ✅ Migration has rollback (.down.sql)
- ✅ No glassmorphism in badge UI (solid red)
