# DLQ and Workflow Operations Runbook

**Created**: 2026-04-28  
**Scope**: `BACKGROUND_QUEUE`, `fisioflow-tasks-dlq`, Cloudflare Workflows, and future operator replay.

## Replay Eligibility

| Task Type | Replayable | Required Guard |
|-----------|------------|----------------|
| `SEND_WHATSAPP` | Yes, with caution | Message/provider idempotency key and patient communication audit |
| `R2_OBJECT_CREATED` | Yes | R2 key + event action idempotency |
| `PROCESS_EXAM` | Yes | Exam ID + processing version |
| `GENERATE_TTS` | Yes | R2 key must be overwrite-safe or versioned |
| `TRIGGER_WORKFLOW` | Yes | Workflow type + business entity id + workflow instance id |
| `PROCESS_BACKUP` | No-op today | No replay needed |
| `CLEANUP_LOGS` | No-op today | No replay needed |

## Redaction Rules

Operator views must not show:

- Full message text for patient communications by default.
- Full clinical notes, exam content, transcription text, or AI prompts.
- CPF/CNPJ, phone, email, tokens, certificate material, or webhook secrets.
- Raw queue payload unless an admin explicitly requests a secure diagnostic export.

Safe default fields:

- Task type.
- Organization ID.
- Patient/appointment/invoice/media IDs.
- R2 key prefix and filename extension.
- Attempt count.
- Error class and short error message.
- Created/updated timestamps.

## Replay Flow

1. Operator opens DLQ item summary.
2. System verifies admin/operator role.
3. System checks task type replay eligibility.
4. System derives or requires an idempotency key.
5. Operator confirms replay.
6. System writes an audit event.
7. System re-enqueues redacted payload with replay metadata.
8. System records result: queued, failed validation, or replay failed.

## Idempotency Key Format

Recommended:

```text
queue:{taskType}:{organizationId}:{businessEntityId}:{payloadVersion}
```

Examples:

- `queue:SEND_WHATSAPP:org123:appointment456:lembrete_sessao`
- `queue:PROCESS_EXAM:org123:exam789:v1`
- `queue:TRIGGER_WORKFLOW:org123:patient456:reengagement`

## Workflow Status Fields

For workflow operations, expose:

- Workflow binding/type.
- Instance ID.
- Status.
- Error class/message when present.
- Business entity references.
- Created/last checked timestamp.

## Implementation Gate

Do not expose a DLQ replay route until:

- Admin role checks are confirmed.
- Audit event is written for view and replay.
- Redacted summary helper has test coverage.
- Staging replay proves no duplicate WhatsApp/NFS-e side effects.

