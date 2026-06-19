# CRM WhatsApp Unified Design

## Context

The handoff bundle `FisioFlow Design System-handoff.zip` includes the target screen `fisioflow-design-system/project/ui_kits/web/crm-whatsapp.html` described as:

- `UI Kit · CRM + WhatsApp (web)`
- `Inbox unificado: funil de leads + conversa WhatsApp + painel de contexto CRM`

The current codebase already has a working WhatsApp inbox domain with:

- page routes in [src/routes/whatsapp.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/routes/whatsapp.tsx:1)
- a partially implemented visual stub in [src/pages/CrmWhatsApp.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/CrmWhatsApp.tsx:1)
- an operational inbox page in [src/pages/WhatsAppInbox.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/WhatsAppInbox.tsx:1)
- existing data/hooks/services for conversations, messages, tags, notes, assignment, and status changes

The user approved a single unified implementation rather than maintaining separate experiences for `/crm-whatsapp` and `/whatsapp/inbox`.

## Goal

Deliver one canonical CRM WhatsApp inbox experience that:

- matches the handoff layout and visual hierarchy closely
- uses real conversation and message data from the current inbox stack
- preserves operational actions already supported by the backend
- serves both `/crm-whatsapp` and `/whatsapp/inbox` without duplicated UI code

## Non-Goals

- redesigning the WhatsApp backend or conversation schema
- implementing a new lead pipeline backend model in this phase
- creating a new scheduling or patient-creation backend flow
- changing Meta Business configuration as part of this UI delivery
- rebuilding unrelated WhatsApp dashboard, automations, or templates screens

## Recommended Approach

Use `src/pages/CrmWhatsApp.tsx` as the single canonical page and point both routes to the same implementation.

Rationale:

- avoids UI duplication
- preserves old entry points
- keeps product terminology aligned with the handoff
- lets the existing inbox data model power the new interface with minimal backend risk

## Route Strategy

- `/crm-whatsapp` remains the primary route
- `/whatsapp/inbox` renders the same page component as an alias
- `src/pages/WhatsAppInbox.tsx` should be reduced to a thin wrapper or removed from route use

## Screen Structure

The screen will remain a 3-column inbox:

1. left column: lead funnel chips, search, conversation list
2. center column: WhatsApp-style thread with header, messages, quick replies, composer
3. right column: CRM context with patient/lead actions, stage, details, next action, tags

The existing authenticated app shell and page layout remain in use.

## Left Column Design

The left column should follow the handoff structure:

- search field at top
- funnel chips:
  - `Todos`
  - `Novos leads`
  - `Aguardando`
  - `Avaliação`
  - `Em tratamento`
- vertically scrolling conversation list

Each conversation row should show:

- avatar initials
- contact name
- last activity time
- preview text or icon + preview
- unread count
- stage chip

The row styling should follow the handoff:

- active row highlight
- left accent bar on selection
- compact density
- clinical neutral palette with restrained blue accent

## Center Column Design

The center column should recreate the handoff thread layout while preserving real send behavior.

### Header

Show:

- contact initials/avatar
- contact name
- phone number
- availability subtitle when reliable, otherwise neutral status
- quick actions such as call, schedule, and more actions

### Messages

Map real messages into UI-specific bubble variants:

- inbound: white bubble aligned left
- outbound: green-tinted bubble aligned right
- template: outbound bubble with template label treatment
- note or system event: center or system-style informational block

The message renderer should support current message types without inventing unsupported states.

### Composer

The composer should keep current real actions where supported:

- send text message
- quick reply prefill
- attachment action when already supported by the current flow
- voice/microphone action only as a visual affordance unless already supported

## Right Column Design

The right column should be a CRM context panel driven by existing conversation data plus safe fallbacks.

### Hero Block

Show:

- contact avatar
- contact name
- phone number
- quick actions:
  - `Criar paciente`
  - `Agendar`
  - `Nota`

These actions may deep-link into existing routes using the selected conversation context.

### Funnel Stage

Show:

- current stage pill
- visual progress track
- stage labels from lead to alta

If stage editing is enabled, it should use existing conversation update capability instead of introducing a new endpoint.

### Lead Details

Attempt to derive:

- origem
- campanha
- convênio
- interesse
- primeiro contato
- responsável

These fields should come from known metadata keys when available, otherwise display a stable fallback such as `Não informado`.

### Next Action

Show one deterministic next-action card derived from:

- current status
- last inbound/outbound message timing
- tags
- stage
- SLA indicators when present

This should be rule-based, not AI-dependent.

### Tags

Use the real existing tag operations:

- show current tags
- allow add tag
- allow remove tag

## View-Model Adapter

Introduce a local adapter layer for this screen instead of spreading heuristics through presentational components.

The adapter should derive UI-facing fields such as:

- `stage`
- `stageLabel`
- `stageTone`
- `displayTime`
- `preview`
- `leadSource`
- `campaign`
- `insurance`
- `interest`
- `firstContactLabel`
- `ownerLabel`
- `nextAction`
- `presenceLabel`

This adapter should consume current `Conversation` and `Message` types and return a stable UI model for the new page.

## Funnel Stage Derivation

Because the current backend does not expose a formal CRM funnel model, stage derivation should follow this order:

1. explicit metadata value if present
2. known semantic tags if present
3. existing conversation status and related contextual hints
4. conservative fallback to a default lead-stage bucket

This phase should not require a schema migration.

If conversation partial updates already support metadata persistence safely, stage selection can write back through the current update flow. If not, the stage selector should remain visually present but degrade gracefully to read-only behavior until the backend is expanded.

## Data Compatibility Rules

- do not assume all conversations have CRM metadata
- do not claim presence such as `online agora` without a reliable source
- do not block rendering when optional lead fields are absent
- prefer neutral copy over guessed clinical or sales context

## Component Strategy

Reuse existing inbox logic where it helps, but do not force the old component structure onto the new design.

Expected direction:

- keep existing hooks and service calls
- replace or heavily reshape the current visual components for:
  - sidebar/list
  - thread shell
  - CRM context panel
- centralize shared mapping in a feature-local adapter utility

## Error Handling

The page should:

- keep rendering with partial CRM data
- show empty or neutral placeholders instead of crashing on absent metadata
- preserve current error behavior for conversation/message fetch failures
- avoid optimistic claims for unsupported actions

## Validation and Tests

Implementation validation should include:

- typecheck for the affected frontend files
- route verification for both `/crm-whatsapp` and `/whatsapp/inbox`
- smoke verification of:
  - search
  - selecting a conversation
  - sending a text message
  - adding a note
  - adding/removing tags
  - changing status
  - stage rendering and fallback behavior

If feasible, add focused tests around the adapter logic because that is where most compatibility heuristics will live.

## Risks

- the handoff assumes richer lead metadata than the current backend consistently provides
- stage derivation may be imperfect until the backend adopts a first-class funnel model
- some visual actions from the prototype may remain partial wrappers over existing flows rather than end-to-end product features

## Acceptance Criteria

- both `/crm-whatsapp` and `/whatsapp/inbox` use one shared canonical implementation
- the rendered page matches the handoff layout at a high level: left funnel/list, center thread, right CRM context
- conversation list, thread, and tag operations use real inbox data
- message send continues working through the existing inbox flow
- missing CRM metadata does not break the page
- no duplicated independent inbox UI remains for these two routes
