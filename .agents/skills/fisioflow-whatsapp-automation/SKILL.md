---
name: fisioflow-whatsapp-automation
description: Reference for WhatsApp Business communication, reminders, automations, and inbox workflows in FisioFlow. Use when working on messaging routes, templates, conversation state, SLAs, opt-in or opt-out, or automation rules.
---

# FisioFlow WhatsApp Automation

WhatsApp Business integration for patient communication, appointment reminders, and shared inbox management.

---

## Architecture

### Route File

`apps/api/src/routes/whatsapp.ts` (~1,049 lines)

### Database Tables (from `src/server/db/schema/whatsapp-inbox.ts`)

- `whatsapp_contacts` — Patient-phone mapping with organizationId
- `wa_conversations` — Thread state (open/pending/resolved), assigned agent, SLA
- `wa_messages` — Inbound/outbound messages with status (sent/delivered/read/failed)
- `wa_raw_events` — Raw webhook payload storage for replay/debugging
- `wa_assignments` — Agent assignment history per conversation
- `wa_internal_notes` — Internal notes on conversations (not sent to patient)
- `wa_tags` / `wa_conversation_tags` — Tagging system for categorization
- `wa_quick_replies` — Saved reply templates per organization
- `wa_automation_rules` — Trigger/action rules (e.g., auto-reply, auto-assign)
- `wa_sla_config` / `wa_sla_tracking` — SLA policies (response time, resolution time)
- `wa_opt_in_out` — Consent tracking per contact (opt-in/opt-out with timestamp)

### RLS

All tables use `withOrganizationPolicy` — strict tenant isolation.

---

## Message Templates

6 default templates shipped in code, loadable from `settings.whatsapp_templates` (organization settings):

| Template Key              | Category    | Variables                                              | Purpose                          |
| ------------------------- | ----------- | ------------------------------------------------------ | -------------------------------- |
| `confirmacao_agendamento` | appointment | `{{name}}`, `{{therapist}}`, `{{date}}`, `{{time}}`    | Appointment confirmation         |
| `lembrete_sessao`         | reminder    | `{{time}}`, `{{therapist}}`                            | Session reminder                 |
| `cancelamento`            | appointment | `{{date}}`                                             | Cancellation notice              |
| `prescricao`              | clinical    | `{{link}}`                                             | Exercise prescription link       |
| `solicitar_confirmacao`   | appointment | `{{name}}`, `{{date}}`, `{{time}}`                     | Request appointment confirmation |
| `oferta_vaga`             | waitlist    | `{{date}}`, `{{time}}`, `{{therapist}}`, `{{expires}}` | Waitlist spot offer              |

Template categories: `appointment`, `reminder`, `clinical`, `waitlist`.

Variables are extracted with `{{variable}}` placeholder pattern.

---

## Automation Rules Schema

`wa_automation_rules` supports:

- **Triggers:** keyword_match, new_conversation, no_response_after, appointment_status_change, session_finalized
- **Actions:** auto_reply, auto_assign, add_tag, send_template, trigger_webhook, escalate
- **Conditions:** time_range, contact_tag, patient_status, conversation_count

---

## SLA Configuration

Per-organization SLA policies via `wa_sla_config`:

- `firstResponseMinutes` — Max minutes for first agent response
- `resolutionMinutes` — Max minutes to resolve conversation
- `businessHoursOnly` — Only count SLA during configured business hours
- `escalationAction` — What happens on breach (notify, auto-assign, tag)

Tracked in `wa_sla_tracking` with `startedAt`, `firstResponseAt`, `resolvedAt`, `breachedAt`.

---

## Integration Points

### Cloudflare Queues

Use `c.executionCtx.waitUntil()` to enqueue WhatsApp messages for reliable delivery:

```ts
c.executionCtx.waitUntil(
  c.env.WHATSAPP_QUEUE.send({
    type: "send_template",
    to: patient.phone,
    template: "confirmacao_agendamento",
    variables: { name, therapist, date, time },
    organizationId: user.organizationId,
  }),
);
```

### Appointment Integration

- On `appointment.created` → send confirmation template
- On `appointment.status_change` to `presenca_confirmada` → send reminder
- On `appointment.cancelled` → send cancellation template
- On `waitlist.spot_available` → send `oferta_vaga` template with expiry

### Session Integration

- On `session.finalized` → send prescription link via `prescricao` template
- Link points to patient portal exercise view (when implemented)

---

## Webhook Handler Pattern

```ts
app.post("/webhook", async (c) => {
  const body = await c.req.json();
  const entry = body.entry?.[0]?.changes?.[0]?.value;

  if (entry?.messages) {
    const message = entry.messages[0];
    c.executionCtx.waitUntil(processIncomingMessage(c.env, message));
  }

  return c.json({ status: "ok" });
});
```

Process incoming messages: store in `wa_messages`, create/update `wa_conversations`, evaluate `wa_automation_rules`, track SLA, emit WebSocket event for real-time inbox.

---

## Shared Inbox Features

- **Real-time:** WebSocket broadcast to org members on new messages
- **Assignment:** Manual or auto-assign conversations to therapists
- **Internal notes:** Team collaboration without patient visibility
- **Tags:** Categorize conversations (urgente, duvida, reagendamento, etc.)
- **Quick replies:** Per-org saved responses for common questions
- **Opt-in/out:** LGPD-compliant consent tracking with audit trail
