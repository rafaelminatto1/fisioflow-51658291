# CRM WhatsApp Context Menu And Contact Avatar Design

## Objective

Bring the CRM WhatsApp conversation experience closer to WhatsApp Web by:

1. Adding a contextual message menu on desktop and touch devices.
2. Showing the real contact photo for WhatsApp and Instagram conversations when available.

## Scope

In scope:

- Right-click on desktop messages.
- Long-press on mobile and tablet messages.
- Initial contextual actions:
  - `Copiar`
  - `Responder`
  - `Adicionar nota`
  - `Criar tarefa`
- Real contact avatar in:
  - conversation list
  - active conversation header
  - CRM side panel
- Fallback to current initials and gradient when no image exists.

Out of scope for this iteration:

- Forwarding messages
- Deleting messages
- Pinning messages
- Reactions
- Media-specific context actions
- Audio-specific context actions
- Backend schema changes unless avatar data is proven missing from the inbox payload

## Current State

The page lives in `src/pages/CrmWhatsApp.tsx`.

Current behavior:

- Messages render as plain bubbles with no contextual actions.
- Avatars use initials and a generated gradient.
- The CRM adapter already exposes an `avatarUrl` field in the view model type, but `toCrmConversationViewModel()` currently forces `avatarUrl: null`.
- The inbox service model already supports `avatarUrl`.

## Recommended Approach

Implement a single message-selection interaction model that supports both desktop and touch:

- Desktop opens the contextual menu via `contextmenu`.
- Mobile/tablet opens the same menu via long press.
- Both flows share the same selected-message state and action handlers.

Use existing avatar primitives already present in the codebase so photo rendering is consistent with the rest of the app.

## UX Design

### Message Context Menu

When a user interacts with a message:

- Desktop:
  - right-click opens a floating context menu near the cursor
- Touch devices:
  - long press opens the same action menu anchored to the message

Menu items:

1. `Copiar`
   - Copies the resolved text content of the message.
2. `Responder`
   - Stores the selected message as reply context.
   - Shows a reply preview above the composer.
3. `Adicionar nota`
   - Opens the existing note modal.
   - Pre-fills the draft with a reference to the selected message text.
4. `Criar tarefa`
   - Opens a lightweight task-creation modal.
   - Includes the selected message as source context.

### Reply UX

Reply state should be lightweight and familiar:

- composer shows a small reply preview block
- preview contains:
  - contact/message direction label if useful
  - truncated original text
  - dismiss action
- sending a new message clears the reply state

### Contact Avatar UX

For `whatsapp` and `instagram` channels:

- if `avatarUrl` exists, render the real image
- if `avatarUrl` is absent or fails to load, fall back to initials with the current gradient

For `webchat`:

- keep the current initials-and-gradient presentation by default

## Technical Design

### Files To Change

- `src/pages/CrmWhatsApp.tsx`
- `src/features/whatsapp/crmWhatsAppAdapter.ts`

Potential additional UI reuse:

- `src/components/ui/avatar.tsx`

### Adapter Changes

Update `toCrmConversationViewModel()` to preserve avatar data from the base conversation model instead of hardcoding `null`.

Expected outcome:

- `avatarUrl` is passed through into the CRM view model
- existing gradient and initials remain available as fallback presentation

### Conversation UI Changes

In `CrmWhatsApp.tsx`:

- introduce selected message state
- introduce context menu open state and anchor position
- add long-press handling for touch devices
- add reply-context state for the composer
- add task-modal open state and selected-message payload
- replace raw avatar circles with `Avatar`, `AvatarImage`, and `AvatarFallback` in the three CRM contact locations

### Note Flow

Reuse the current note dialog.

When launched from a message action:

- prefill note text with a structured reference to the message
- allow the user to edit before saving

### Task Flow

Use a small modal in the CRM page for the first version.

Minimum fields:

- title
- optional description
- selected message context preview

If an existing task creation primitive is easy to reuse locally, prefer reuse over custom task wiring. Otherwise, keep the first version intentionally narrow and UI-only until the task integration surface is confirmed.

## Error Handling

- If clipboard write fails, keep the UI stable and surface a minimal failure feedback.
- If avatar image fails to load, automatically render the fallback avatar.
- If the selected message has no resolvable text, disable or soften actions that require text content.
- If long-press is interrupted by scroll or pointer cancel, do not open the menu.

## Testing

Manual validation:

1. Right-click inbound text message on desktop.
2. Right-click outbound text/template message on desktop.
3. Long-press a message on a touch device or touch emulator.
4. Copy action writes the message text.
5. Reply action shows preview and clears after send/cancel.
6. Add note opens prefilled note modal.
7. Create task opens modal with selected message context.
8. WhatsApp conversation with `avatarUrl` renders the image in list, header, and side panel.
9. Instagram conversation with `avatarUrl` renders the image in the same three places.
10. Conversations without image keep current initials fallback.

Suggested automated coverage:

- adapter test for avatar pass-through
- UI tests for reply-state rendering and context-action availability

## Risks

- Touch long-press can conflict with scroll behavior if the delay is too short.
- Task creation may need a clearer integration point if there is no existing lightweight task API hook available in this page.
- Avatar availability depends on the inbox payload actually containing usable `avatarUrl` values in production.

## Acceptance Criteria

- Users can open a contextual action menu from messages on desktop and touch devices.
- The first menu version includes `Copiar`, `Responder`, `Adicionar nota`, and `Criar tarefa`.
- Reply context is visible in the composer and can be dismissed.
- WhatsApp and Instagram contacts show real photos where available.
- Missing photos safely fall back to the current initials-based avatar.
