# Legacy Import Design

## Context

FisioFlow precisa receber dados históricos extraídos do sistema legado via RPA.
O ambiente atual não possui dados reais, então a importação pode ser tratada como bootstrap da organização autenticada, com limpeza prévia dos pacientes e dados clínicos atuais.

O requisito mais urgente é um endpoint de importação em lote que:

- receba pacientes com evoluções legadas
- grave o texto livre legado em `sessions.observacao`
- gere relatório por registro
- permita limpar a base atual antes da carga

## Goal

Implementar `POST /api/import/legacy-data` como fluxo de bootstrap de dados legados, com:

- validação estrita de payload com Zod
- autorização explícita para operação destrutiva
- limpeza explícita da base atual da organização
- importação isolada por paciente usando transações Drizzle
- resposta com sumário agregado e resultado por item

## Non-Goals

- conciliação incremental entre sistema legado e dados atuais
- deduplicação por CPF, e-mail ou telefone
- persistência de todos os campos livres do legado no schema clínico atual
- execução assíncrona por fila nesta primeira versão

## Recommended Approach

Criar uma nova rota em `apps/api/src/routes/import.ts`, registrada em `apps/api/src/index.ts` como `/api/import`.

O endpoint `POST /api/import/legacy-data` será um bootstrap explícito:

- exige `replaceExisting: true`
- aceita `dryRun?: true` para validar sem gravar
- aceita apenas usuários autorizados para importação destrutiva
- apaga os dados atuais da organização antes da carga real
- cria todos os pacientes do payload como novos registros
- importa as evoluções como sessões finalizadas

Rationale:

- o usuário confirmou que a base atual pode ser apagada
- não há identificadores legados confiáveis além do nome completo
- evitar reconciliação reduz risco clínico e acelera a migração

## Route Contract

Request shape:

```json
{
  "replaceExisting": true,
  "dryRun": false,
  "patients": [
    {
      "fullName": "Maria da Silva",
      "socialName": "Maria",
      "phone": "11999999999",
      "email": null,
      "gender": "F",
      "birthDate": "1988-04-01",
      "notes": "Paciente migrada",
      "observations": "Observações gerais",
      "legacyId": "ZF-123",
      "evolutions": [
        {
          "date": "2025-01-10",
          "observacao": "Paciente refere melhora da dor lombar.",
          "painScale": 4,
          "status": "finalized",
          "therapistId": "00000000-0000-0000-0000-000000000000",
          "durationMinutes": 50
        }
      ]
    }
  ]
}
```

Response shape:

```json
{
  "success": true,
  "dryRun": false,
  "replaceExisting": true,
  "warnings": [],
  "summary": {
    "totalPatients": 1,
    "importedPatients": 1,
    "failedPatients": 0,
    "totalSessions": 1,
    "importedSessions": 1,
    "failedSessions": 0
  },
  "results": [
    {
      "index": 0,
      "fullName": "Maria da Silva",
      "status": "imported",
      "patientId": "uuid",
      "sessionsImported": 1,
      "sessionsFailed": 0,
      "errors": [],
      "warnings": []
    }
  ]
}
```

Dry-run result statuses:

- `wouldImport`
- `wouldFail`

Real import result statuses:

- `imported`
- `failed`

## Validation Rules

Top-level schema:

- `replaceExisting: z.literal(true)`
- `dryRun: z.boolean().optional().default(false)`
- `patients: z.array(patientSchema).min(1)`

Patient schema:

- `fullName: z.string().trim().min(1)`
- `socialName?: z.string().trim().optional()`
- `phone?: z.string().trim().optional()`
- `email?: z.string().trim().optional().nullable()`
- `gender?: z.string().trim().optional()`
- `birthDate?: z.string().trim().optional()`
- `notes?: z.string().trim().optional()`
- `observations?: z.string().trim().optional()`
- `legacyId?: z.string().trim().optional()`
- `evolutions: z.array(evolutionSchema).min(1)`

Evolution schema:

- `date?: z.string().trim().optional()`
- `observacao: z.string().trim().min(1)`
- `painScale?: z.number().min(0).max(10).optional()`
- `status?: z.string().trim().optional()`
- `therapistId?: z.string().trim().optional()`
- `durationMinutes?: z.number().int().positive().optional()`

Unknown fields should be stripped instead of persisted.

## Authorization Rules

This route is destructive and must not be available to every authenticated user.

Minimum authorization contract:

- require authenticated user
- require `user.organizationId`
- require role in `["admin", "super_admin", "owner"]`
- reject all other roles with `403`

If the current auth model does not expose `owner`, implementation should use the highest privileged clinic roles already recognized by the codebase and document the final allowlist in the route tests.

## Import Flow

1. Authenticate user, derive `organizationId`, and enforce destructive-import role gating.
2. Parse and validate payload with Zod.
3. Resolve therapist fallback viability before any write.
   Validate any UUID-shaped therapist identifier against `profiles.id` within the authenticated organization.
4. If `dryRun === true`, return the projected report without mutating the database.
5. In `dryRun`, validate cleanup scope syntactically but do not execute deletions.
6. If `replaceExisting !== true`, reject with `400`.
7. Execute organization-scoped cleanup once.
8. Import each patient in its own Drizzle transaction.
9. Build aggregated report from per-patient outcomes.

Dry-run rules:

- no database mutation
- no `patientId` in results
- result item status must be `wouldImport` or `wouldFail`
- therapist fallback validity is still checked
- date parsing and status normalization are still checked
- cleanup readiness is reported only as configuration readiness, never by running deletes

Patient transaction flow:

1. Create patient row.
2. Create zero appointments in this first version.
3. Insert each legacy evolution as a `sessions` row linked to the new patient.
4. Commit only that patient if all inserts for that patient succeed.
5. If one patient fails, continue with the next patient and capture the error in `results`.

## Cleanup Scope

Cleanup is restricted to the authenticated organization and must be implemented through a dedicated helper, for example `wipeOrganizationLegacyImportData(db, organizationId)`.

The helper must own an exact deletion list rather than an ad hoc per-route sequence.

Initial required scope:

- `session_attachments`
- `sessions`
- `appointments`
- `pain_map_points`
- `pain_maps`
- `standardized_test_results`
- `patient_session_metrics`
- `generated_reports`
- `prescribed_exercises`
- `package_usage`
- `patient_packages`
- `patient_goals`
- `patient_pathologies`
- `medical_records`
- `patient_portal_users`
- `patient_exercise_logs`
- `patient_gamification`
- `xp_transactions`
- `achievements_log`
- `daily_quests`
- `patient_longitudinal_summary`
- `patient_streaks`
- `exercise_favorites`
- `biomechanics_review_actions`
- `biomechanics_annotations`
- `biomechanics_events`
- `biomechanics_frames`
- `biomechanics_jobs`
- `biomechanics_media`
- `biomechanics_metrics`
- `biomechanics_assessments`
- `patients`

This list includes both Drizzle-managed schema tables and currently known migration-owned tables that may not yet be fully represented in `packages/db/src/schema`.

If implementation discovers additional patient-linked tables with blocking foreign keys in the current tenant schema, they must be added to the helper and covered by tests before the route is considered complete.

The route must not affect records from other organizations.

## Data Mapping

Patient mapping:

- `patients.fullName <- fullName`
- `patients.socialName <- socialName ?? null`
- `patients.phone <- phone ?? null`
- `patients.email <- email ?? null`
- `patients.gender <- normalized gender or null`
- `patients.legacyDateOfBirth <- parsed birthDate or null`
- `patients.notes <- notes ?? null`
- `patients.observations <- observations ?? null`
- `patients.organizationId <- authenticated org`
- `patients.isActive <- true`

Session mapping:

- `sessions.patientId <- created patient id`
- `sessions.organizationId <- authenticated org`
- `sessions.therapistId <- valid payload therapistId or authenticated profileId`
- `sessions.date <- normalized evolution timestamp`
- `sessions.observacao <- legacy free-text`
- `sessions.painScale <- painScale ?? null`
- `sessions.duration <- durationMinutes ?? null`
- `sessions.status <- normalized legacy status`
- `sessions.sessionNumber <- sequential number within imported patient payload`
- session-level `warnings[]` records every fallback or coercion applied during import

## Identity Rules

This version does not perform upsert or matching against current patients.

Behavior:

- the route always creates new patients after the bootstrap wipe
- duplicate names inside the same payload are allowed
- if two payload items have the same normalized full name, both are imported as separate patients

This is intentional because the environment is being replaced and the legacy source does not provide stable identifiers.

## Therapist Attribution

Therapist attribution is clinically sensitive.

Approved bootstrap behavior for this migration:

- if payload `therapistId` is a valid UUID and resolves to `profiles.id` in the authenticated organization, use it
- else if authenticated `profileId` is a valid UUID and resolves to `profiles.id` in the authenticated organization, use it as fallback
- else fail that patient record

Audit requirement:

- when fallback to authenticated `profileId` happens, append a warning in the patient result
- when payload `therapistId` is UUID-shaped but does not resolve to a local profile, append a warning that the source therapist could not be matched
- the warning text must clearly indicate that historical authorship was reassigned during migration
- the route should log the fallback event with organization, patient index, and imported session count

This makes the reassignment explicit instead of silently masking source gaps.

## Date Normalization

Accepted input formats:

- full ISO-8601 timestamp with timezone
- `YYYY-MM-DD`

Rejected input formats:

- locale-dependent strings such as `10/01/2025`
- timestamps without valid calendar date

Normalization rules:

- full ISO timestamps are preserved as absolute instants if valid
- `YYYY-MM-DD` is normalized to `YYYY-MM-DDT12:00:00.000Z` before persistence to avoid timezone drift when rendered in negative UTC offsets
- missing evolution date falls back to the import execution timestamp
- invalid date strings fail the patient record in real import and mark `wouldFail` in dry-run

## Legacy Session Status Rules

Supported canonical outputs:

- `draft`
- `finalized`
- `cancelled`

Accepted legacy aliases:

- finalized: `finalized`, `finalizado`, `completed`, `concluido`, `concluído`
- cancelled: `cancelled`, `canceled`, `cancelado`, `cancelada`
- draft: `draft`, `rascunho`

Normalization behavior:

- known aliases are converted to canonical enum values
- missing status defaults to `finalized` with a warning
- unsupported status strings also fallback to `finalized` with a warning

Every coercion must be reflected in `results[].warnings`.

## Fallback Rules

- `fullName` is normalized with trim and whitespace collapse before persistence and reporting
- unknown payload fields are stripped
- therapist fallback, missing date fallback, and status coercion must emit warnings in the report

## Error Handling

The route should distinguish:

- request-level validation errors: return `400`
- authorization failures: return `403`
- cleanup execution failure: return `500` and abort import
- patient-level import failure: continue import and mark that item as `failed`
- if cleanup succeeds but zero patients import successfully, return `200` with `success: false` and a top-level warning indicating the organization was wiped but the import produced no usable records

Each result item should include:

- `index`
- `fullName`
- `status`
- `patientId?`
- `sessionsImported`
- `sessionsFailed`
- `errors: string[]`
- `warnings: string[]`

## Testing

Implementation should include:

- route test rejecting payloads without `replaceExisting: true`
- route test rejecting unauthorized roles with `403`
- route test for `dryRun` confirming no writes occur
- route test importing one patient with multiple evolutions
- route test showing partial success when one patient fails and another succeeds
- route test proving cleanup is scoped to the authenticated organization
- route test proving duplicate full names are imported as separate patients
- route test rejecting UUID-shaped `therapistId` values that do not resolve to `profiles.id` in the authenticated organization
- route test for therapist fallback to authenticated `profileId`
- route test for therapist failure when neither payload nor auth provides a valid UUID
- route test for missing evolution date fallback
- route test for unsupported status normalization plus warning emission
- route test confirming unknown payload fields are ignored
- helper tests for:
  - name normalization
  - date parsing
  - session status normalization

If the surrounding test harness allows it, add one integration-style test covering cleanup plus a minimal successful import.

## Risks

- deleting current organization data is intentionally destructive and must remain gated behind `replaceExisting: true`
- very large payloads may stress Worker execution time; per-patient transactions limit blast radius but do not solve total runtime
- fallback therapist resolution depends on authenticated profile data being present and UUID-shaped
- cleanup followed by broad import failure can leave the organization partially rebuilt; the API response must make that state explicit

## Acceptance Criteria

- only authorized high-privilege clinic roles can call `POST /api/import/legacy-data`
- the route rejects imports without `replaceExisting: true`
- `dryRun` validates payload and returns a projected report without persistence
- real imports wipe current organization patient data before recreating the legacy base
- each imported evolution persists its legacy free-text into `sessions.observacao`
- the response returns both summary totals and per-patient results, including warnings for every fallback or coercion
- one patient failure does not roll back previously imported successful patients
