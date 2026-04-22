# FisioFlow Database Schema Reference

Neon PostgreSQL + Drizzle ORM. Schema files at `src/server/db/schema/`. All tables re-exported from `src/server/db/schema/index.ts`.

## Multi-Tenant Architecture

Every table has an `organizationId: uuid("organization_id")` column. Row-Level Security enforces isolation using a session variable:

```ts
import { withOrganizationPolicy, withPublicOrOrganizationPolicy, withPublicWriteOrganizationPolicy } from "./rls_helper";
```

Three RLS policies exist:

| Policy | Helper | Behavior |
|--------|--------|----------|
| Strict tenant isolation | `withOrganizationPolicy(tableName, table.organizationId)` | All operations scoped to `current_setting('app.org_id')::uuid` |
| Hybrid (public OR org) | `withPublicOrOrganizationPolicy(...)` | Visible when `organizationId IS NULL` OR matches session org. Used by wiki, dictionary, templates |
| Public write + org read | `withPublicWriteOrganizationPolicy(...)` | Anyone can INSERT; SELECT/UPDATE/DELETE scoped to org. Used by `precadastros` |

Before querying, set the session variable:

```sql
SET LOCAL app.org_id = '<uuid>';
```

## Column Conventions

- **Primary keys**: `uuid("id").primaryKey().defaultRandom()`
- **Foreign keys**: `uuid("xxx_id").references(() => otherTable.id)` — camelCase in TS, snake_case in DB
- **Soft delete**: `deletedAt: timestamp("deleted_at")` (nullable). Filter with `where(isNull(table.deletedAt))`
- **Timestamps**: `createdAt: timestamp("created_at").defaultNow().notNull()`, `updatedAt: timestamp("updated_at").defaultNow().notNull()`
- **Money**: `numeric("field", { precision: 12, scale: 2 })`
- **Flexible data**: `jsonb("field").$type<SomeType>()` for structured metadata
- **Arrays**: `text("field").array().default([])` for tags, ICD codes, muscles
- **Enums**: `pgEnum("name", [...values])` — some tables use inline `text("field", { enum: [...] })` instead

## Core Tables & Relationships

### organizations (root tenant)

```
organizations
├── id: uuid PK
├── name: varchar(255)
├── slug: varchar(255)
└── createdAt: timestamp
```

### profiles (therapist/staff)

```
profiles
├── id: uuid PK
├── userId: text (Neon Auth UID)
├── name, email, fullName, role: varchar
├── crefito: varchar(50) — professional license
├── specialties: jsonb
├── organizationId: uuid
├── avatarUrl, phone, bio, address, birthDate
└── isActive, emailVerified
```

### patients → central entity

```
patients
├── id: uuid PK
├── fullName, socialName, nickname: varchar
├── cpf (unique, masked), rg, gender (enum M/F/O)
├── phone, phoneSecondary, email
├── photoUrl, profession
├── address: jsonb({ cep, street, number, complement, neighborhood, city, state })
├── emergencyContact: jsonb({ name, phone, relationship })
├── insurance: jsonb({ provider, plan, cardNumber, validUntil })
├── organizationId, profileId, userId, professionalId
├── origin, referredBy, professionalName
├── isActive, alerts: jsonb(string[]), observations, notes
├── bloodType, weightKg, heightCm, maritalStatus, educationLevel
├── incompleteRegistration, consentData, consentImage
├── weight, progress, legacyDateOfBirth, archived, mainCondition, status, sessionValue (legacy)
├── deletedAt, createdAt, updatedAt
└── INDEXES: organizationId, profileId, userId, cpf, isActive, fullName
```

**Relations from patients:**
```
patients 1:N medicalRecords
patients 1:N appointments
patients 1:N sessions
patients 1:N patientPackages
```

### medicalRecords (Prontuario/Anamnese)

```
medical_records
├── id: uuid PK
├── patientId → patients.id
├── organizationId
├── recordDate, chiefComplaint, medicalHistory, currentMedications
├── previousSurgeries, lifestyleHabits, currentHistory, pastHistory, familyHistory
├── medications: jsonb(Array<{ name, dosage?, frequency?, startDate? }>)
├── allergies: jsonb(Array<{ allergen, reaction?, severity? }>)
├── lifestyle: jsonb({ smoking?, alcohol?, sleepQuality?, stressLevel? })
├── physicalExam: jsonb({ inspection?, palpation?, posture?, gait?, rangeOfMotion?, muscleStrength?, specialTests? })
├── diagnosis, icd10Codes: jsonb(string[])
├── createdBy, deletedAt, createdAt, updatedAt
```

**Relations from medicalRecords:**
```
medicalRecords N:1 patients
medicalRecords 1:N pathologies
medicalRecords 1:N surgeries
medicalRecords 1:N goals
```

### pathologies

```
pathologies
├── id: uuid PK
├── medicalRecordId → medicalRecords.id
├── organizationId
├── name, icdCode, status (enum: active/treated/monitoring)
├── diagnosedAt, treatedAt, notes
└── deletedAt, createdAt
```

### surgeries

```
surgeries
├── id: uuid PK
├── medicalRecordId → medicalRecords.id
├── organizationId
├── name, surgeryDate, surgeon, hospital, postOpProtocol, notes
└── deletedAt, createdAt
```

### goals (treatment goals)

```
goals
├── id: uuid PK
├── medicalRecordId → medicalRecords.id
├── organizationId
├── description, targetDate, priority (integer), status (enum: pending/in_progress/achieved/abandoned)
├── achievedAt, notes
└── deletedAt, createdAt
```

### appointments (RF02 Scheduling)

```
appointments
├── id: uuid PK
├── patientId → patients.id
├── therapistId: uuid (NOT FK, references auth users)
├── organizationId
├── date, startTime, endTime, durationMinutes (default 60)
├── status: appointmentStatusEnum (agendado/atendido/avaliacao/cancelado/faltou/faltou_com_aviso/faltou_sem_aviso/nao_atendido/nao_atendido_sem_cobranca/presenca_confirmada/remarcar)
├── type: appointmentTypeEnum (evaluation/session/reassessment/group/return)
├── isGroup, maxParticipants, currentParticipants, groupId, additionalNames, isUnlimited
├── roomId
├── confirmedAt, confirmedVia, reminderSentAt
├── paymentStatus: paymentStatusEnum (pending/paid/partial/refunded)
├── paymentAmount, paidAt, packageId
├── notes, cancellationReason, cancelledAt, cancelledBy
├── rescheduledFrom, rescheduledTo
├── isRecurring, recurrencePattern, recurrenceGroupId
├── createdBy, deletedAt, createdAt, updatedAt
└── INDEXES: organizationId, patientId, (therapistId, date), status, roomId
```

**Relations:**
```
appointments N:1 patients
appointments 1:1 sessions (via sessions.appointmentId)
```

### sessions (SOAP Evolution - RF01.3)

```
sessions
├── id: uuid PK
├── patientId → patients.id
├── appointmentId → appointments.id (ON DELETE SET NULL)
├── therapistId: uuid
├── organizationId
├── sessionNumber, date, durationMinutes
├── subjective: jsonb({ complaints?, painScale?, painLocation?, painCharacter?, perceivedEvolution?, sleepQuality?, medicationChanges?, notes? })
├── objective: jsonb({ vitalSigns?, physicalExam?, measurements[], specialTests[], muscleStrength?, edema?, wounds?, notes? })
├── assessment: jsonb({ diagnosis?, icd10?, evolutionAnalysis?, prognosis?, goalsProgress[], notes? })
├── plan: jsonb({ conduct?, techniques[], exercises[], orientations?, homeExercises?, nextSessionGoals?, nextSessionDate?, referrals?, notes? })
├── status: sessionStatusEnum (draft/finalized/cancelled)
├── lastAutoSaveAt, finalizedAt, finalizedBy
├── replicatedFromId, pdfUrl, pdfGeneratedAt
├── requiredTests: jsonb(string[]), alertsAcknowledged
├── Activity Lab (dynamometry): timeToPeak, totalReps, avgPeakForce, peakForceNkg, bodyWeight, rfd50, rfd100, rfd200, peakForceN, rawForceData, peakForce, avgForce, rateOfForceDevelopment, sensitivity, deviceBattery, sampleRate, isSimulated, repetitions, side, deviceFirmware, measurementMode, deviceModel, protocolName, bodyPart, activityLabDuration, activityLabNotes
├── deletedAt, createdAt, updatedAt
└── INDEXES: patientId, appointmentId, therapistId, organizationId, date
```

**Relations:**
```
sessions N:1 patients
sessions N:1 appointments
sessions 1:N sessionAttachments
```

### sessionAttachments (RF01.4 Files)

```
session_attachments
├── id: uuid PK
├── sessionId → sessions.id (nullable — can be patient-level doc)
├── patientId → patients.id
├── organizationId
├── fileName, originalName, fileUrl, thumbnailUrl
├── fileType: enum (pdf/jpg/png/docx/other)
├── category: fileCategoryEnum (exam/imaging/document/before_after/other)
├── mimeType, sizeBytes, description, uploadedBy, uploadedAt
```

## Exercises & Protocols

### exerciseCategories (hierarchical)

```
exercise_categories
├── id: uuid PK
├── slug (unique), name, description, icon, color, orderIndex
├── parentId → self-reference (subcategories)
├── organizationId (null = global)
```

Self-referential relations with `relationName: "subcategories"`.

### exercises

```
exercises
├── id: uuid PK
├── slug (unique), name
├── categoryId → exerciseCategories.id
├── subcategory, difficulty (iniciante/intermediario/avancado)
├── description, instructions, tips, precautions, benefits
├── musclesPrimary[], musclesSecondary[], bodyParts[] (text arrays)
├── equipment[], alternativeEquipment[]
├── setsRecommended, repsRecommended, durationSeconds, restSeconds
├── imageUrl, thumbnailUrl, videoUrl
├── pathologiesIndicated[], pathologiesContraindicated[], icd10Codes[], tags[]
├── references, embedding (vector(768)), embeddingSketch, referencePose
├── isActive, isPublic, organizationId (null = platform default), createdBy
└── GIN index on name (portuguese tsvector)
```

**Relations:** `exercises N:1 exerciseCategories`, `exercises 1:N protocolExercises`

### exerciseProtocols

```
exercise_protocols
├── id: uuid PK
├── slug, name, conditionName
├── protocolType (pos_operatorio/patologia/preventivo/esportivo/funcional/neurologico/respiratorio/conservador/geriatria)
├── evidenceLevel (A/B/C/D)
├── description, objectives, contraindications
├── weeksTotal
├── phases: jsonb(Array<{ name, weekStart, weekEnd, goals[], precautions[], exerciseIds? }>)
├── milestones: jsonb(Array<{ week, title, criteria[], notes? }>)
├── restrictions: jsonb(Array<{ weekStart, weekEnd?, description, type }>)
├── progressionCriteria: jsonb(Array<{ phase, criteria[] }>)
├── references: jsonb(Array<{ title, authors, year, journal?, doi?, url? }>)
├── icd10Codes[], tags[], clinicalTests[]
├── isActive, isPublic, organizationId, wikiPageId
├── embedding (vector(768)), embeddingSketch, createdBy
```

**Relations:** `exerciseProtocols 1:N protocolExercises`

### protocolExercises (pivot)

```
protocol_exercises
├── id: uuid PK
├── protocolId → exerciseProtocols.id
├── exerciseId: uuid (lazy reference, no FK constraint)
├── phaseWeekStart, phaseWeekEnd
├── setsRecommended, repsRecommended, durationSeconds, frequencyPerWeek
├── progressionNotes, orderIndex
├── organizationId, createdAt
```

### exerciseFavorites

```
exercise_favorites
├── id: uuid PK
├── exerciseId → exercises.id
├── userId: text (Neon Auth UID)
├── organizationId, createdAt
```

## Financial

Tables in `financial.ts`. Most use Portuguese column names.

| Table | Purpose |
|-------|---------|
| `transacoes` | Revenue/expense transactions |
| `contas_financeiras` | Bills payable/receivable |
| `centros_custo` | Cost centers |
| `convenios` | Health insurance providers |
| `pagamentos` | Payment records |
| `empresas_parceiras` | Partner companies |
| `fornecedores` | Suppliers |
| `formas_pagamento` | Payment methods config |
| `sessionPackageTemplates` | Package templates (N sessions for price) |
| `patientPackages` | Packages sold to patients |
| `packageUsage` | Package consumption log |
| `vouchers` | Voucher definitions |
| `userVouchers` | Vouchers purchased by users |
| `voucherCheckoutSessions` | Stripe checkout for vouchers |
| `nfse` | NFS-e (municipal tax invoices) |
| `nfseConfig` | NFS-e configuration per org (PK = organizationId) |

### patientPackages (key financial relation)

```
patient_packages
├── id: uuid PK
├── organizationId → organizations.id
├── patientId → patients.id
├── packageTemplateId → sessionPackageTemplates.id
├── name, totalSessions, usedSessions, remainingSessions
├── price, paymentMethod, status (active/expired/used/cancelled)
├── purchasedAt, expiresAt, lastUsedAt, createdBy
└── deletedAt, createdAt, updatedAt
```

**Relations:** `patientPackages N:1 patients`

## Clinical (clinical.ts)

Simpler clinical tables, some with Portuguese column names:

| Table | Purpose |
|-------|---------|
| `patient_goals` | Goals linked to patient directly (status: em_andamento/concluido/cancelado) |
| `patient_pathologies` | Pathologies linked to patient directly (status: ativo/resolvido/cronico) |
| `patient_session_metrics` | Before/after metrics per session (pain, functional score, mood, satisfaction) |
| `prescribed_exercises` | Exercise prescriptions for patients |
| `generated_reports` | AI-generated clinical reports |
| `conduct_library` | Reusable clinical conduct templates |
| `clinical_test_templates` | Special test definitions with fields_definition |
| `standardized_test_results` | Standardized test/scale results |
| `pain_maps` + `pain_map_points` | Body pain mapping with coordinates |
| `evolution_templates` | SOAP evolution templates |
| `exercise_prescriptions` | Home exercise programs with QR codes |
| `patient_objectives` + `patient_objective_assignments` | Objective library and patient assignments |

## Additional Modules

### Wiki (`wiki.ts`)

`wikiPages` — hierarchical (parentId self-ref), versioned (`wikiPageVersions`), with vector(768) embeddings. Uses `withPublicOrOrganizationPolicy`.

`wikiDictionary` — bilingual medical terms (pt/en). Also public+org.

### Gamification (`gamification.ts`)

`patientGamification` (unique per patient), `xpTransactions`, `achievements`, `achievementsLog`, `dailyQuests`.

### Tasks (`tasks.ts`)

`taskBoards` → `taskColumns` → `tasks` → `taskAssignments`, `taskAcknowledgments`, `taskVisibility`, `taskAuditLogs`. Kanban-style with accountability.

### WhatsApp Inbox (`whatsapp-inbox.ts`)

`whatsappContacts` → `waConversations` → `waMessages`. Plus `waRawEvents`, `waAssignments`, `waInternalNotes`, `waTags`/`waConversationTags`, `waQuickReplies`, `waAutomationRules`, `waSlaConfig`/`waSlaTracking`, `waOptInOut`.

### Biomechanics (`biomechanics.ts`)

`biomechanicsAssessments` — posture/gait analysis with `analysisData: jsonb({ landmarks[], angles, metrics })` and media URLs.

### Pre-cadastro (`precadastro.ts`)

`precadastroTokens` (invite tokens) → `precadastros` (submissions). Uses `withPublicWriteOrganizationPolicy` for public form submission.

### AI Studio (`ai_studio.ts`)

`clinicalScribeLogs` — AI SOAP section formatting logs.

### Templates (`templates.ts`)

`exerciseTemplates` → `exerciseTemplateItems`. Templates have `templateType` ("system"/"custom") and CHECK constraints for patient profiles, difficulty, treatment phase. Uses `withPublicOrOrganizationPolicy`.

`exerciseTemplateCategories` — lookup table for template categories.

### Evaluation Templates (`evaluation_templates.ts`)

`evaluationTemplates` — customizable physical exam templates with `content: jsonb` containing sections with typed fields.

## Enums Reference

| Enum Name | Values |
|-----------|--------|
| `gender` | M, F, O |
| `pathology_status` | active, treated, monitoring |
| `goal_status` | pending, in_progress, achieved, abandoned |
| `appointment_status` | agendado, atendido, avaliacao, cancelado, faltou, faltou_com_aviso, faltou_sem_aviso, nao_atendido, nao_atendido_sem_cobranca, presenca_confirmada, remarcar |
| `appointment_type` | evaluation, session, reassessment, group, return |
| `payment_status` | pending, paid, partial, refunded |
| `session_status` | draft, finalized, cancelled |
| `exercise_difficulty` | iniciante, intermediario, avancado |
| `protocol_type` | pos_operatorio, patologia, preventivo, esportivo, funcional, neurologico, respiratorio, conservador, geriatria |
| `evidence_level` | A, B, C, D |
| `package_status` | active, expired, used, cancelled |
| `task_priority` | low, medium, high, urgent |
| `file_type` | pdf, jpg, png, docx, other |
| `file_category` | exam, imaging, document, before_after, other |
| `biomechanics_assessment_type` | static_posture, gait_analysis, running_analysis, functional_movement |

## Query Patterns

### Basic filtered query

```ts
const result = await db
  .select()
  .from(patients)
  .where(and(
    eq(patients.organizationId, orgId),
    isNull(patients.deletedAt),
    eq(patients.isActive, true),
  ));
```

### Relational query with joins (Drizzle `.with()`)

```ts
const patientWithRecords = await db.query.patients.findFirst({
  where: and(
    eq(patients.id, patientId),
    eq(patients.organizationId, orgId),
    isNull(patients.deletedAt),
  ),
  with: {
    medicalRecords: {
      with: {
        pathologies: true,
        surgeries: true,
        goals: true,
      },
    },
    appointments: true,
    sessions: true,
    packages: true,
  },
});
```

### Insert with organizationId

```ts
await db.insert(patients).values({
  fullName: "Joao Silva",
  organizationId: orgId,
  phone: "11999999999",
});
```

### Soft delete pattern

```ts
await db
  .update(patients)
  .set({ deletedAt: new Date() })
  .where(eq(patients.id, patientId));
```

### Filter active (non-deleted) records

```ts
.where(and(
  eq(table.organizationId, orgId),
  isNull(table.deletedAt),
))
```

### JSONB field access

```ts
.where(sql`${patients.alerts}::jsonb @> '["diabetes"]'::jsonb`)
```

### Appointment conflict detection

```ts
const conflicts = await db
  .select()
  .from(appointments)
  .where(and(
    eq(appointments.organizationId, orgId),
    eq(appointments.therapistId, therapistId),
    eq(appointments.date, dateStr),
    isNull(appointments.deletedAt),
    notInArray(appointments.status, ["cancelado"]),
    lt(appointments.startTime, endTime),
    gt(appointments.endTime, startTime),
  ));
```

### Session with SOAP data and attachments

```ts
const session = await db.query.sessions.findFirst({
  where: and(
    eq(sessions.id, sessionId),
    eq(sessions.organizationId, orgId),
    isNull(sessions.deletedAt),
  ),
  with: {
    patient: { columns: { id: true, fullName: true } },
    appointment: true,
    attachments: true,
  },
});
```

### Package usage check

```ts
const pkg = await db.query.patientPackages.findFirst({
  where: and(
    eq(patientPackages.patientId, patientId),
    eq(patientPackages.organizationId, orgId),
    eq(patientPackages.status, "active"),
    isNull(patientPackages.deletedAt),
    gt(patientPackages.remainingSessions, 0),
  ),
});
```

### Set RLS session variable (Neon serverless)

```ts
await db.execute(sql`SET LOCAL app.org_id = ${orgId}`);
```

## Schema File Map

```
src/server/db/schema/
├── index.ts              Re-exports all schema modules
├── rls_helper.ts         RLS policy helpers
├── organizations.ts      organizations, profiles
├── patients.ts           patients, medicalRecords, pathologies, surgeries, goals
├── appointments.ts       appointments, rooms, blockedSlots
├── sessions.ts           sessions, sessionAttachments, sessionTemplates
├── exercises.ts          exercises, exerciseCategories, exerciseFavorites
├── protocols.ts          exerciseProtocols, protocolExercises
├── templates.ts          exerciseTemplates, exerciseTemplateItems, exerciseTemplateCategories
├── financial.ts          transacoes, contasFinanceiras, centrosCusto, convenios, pagamentos, empresasParceiras, fornecedores, formasPagamento, sessionPackageTemplates, patientPackages, packageUsage, vouchers, userVouchers, voucherCheckoutSessions, nfse, nfseConfig
├── clinical.ts           patientGoals, patientPathologies, patientSessionMetrics, prescribedExercises, generatedReports, conductLibrary, clinicalTestTemplates, standardizedTestResults, painMaps, painMapPoints, evolutionTemplates, exercisePrescriptions, patientObjectives, patientObjectiveAssignments
├── wiki.ts               wikiPages, wikiPageVersions, wikiDictionary
├── gamification.ts       patientGamification, xpTransactions, achievements, achievementsLog, dailyQuests
├── tasks.ts              taskBoards, taskColumns, tasks, taskAssignments, taskAcknowledgments, taskVisibility, taskAuditLogs
├── whatsapp-inbox.ts     whatsappContacts, waConversations, waMessages, waRawEvents, waAssignments, waInternalNotes, waTags, waConversationTags, waQuickReplies, waAutomationRules, waSlaConfig, waSlaTracking, waOptInOut
├── biomechanics.ts       biomechanicsAssessments
├── evaluation_templates.ts evaluationTemplates
├── precadastro.ts        precadastroTokens, precadastros
├── ai_studio.ts          clinicalScribeLogs
├── announcements.ts      (corporate announcements)
└── jules.ts              (AI PR reviews)
```

## Entity Relationship Summary

```
organizations ──────────────────────────────────────────────
  │                                                          │
  ├── profiles (staff/therapists, via userId)                │
  │                                                          │
  ├── patients ◄─────────────────────────────────────────────┤
  │     ├── medicalRecords                                    │
  │     │     ├── pathologies                                 │
  │     │     ├── surgeries                                   │
  │     │     └── goals                                       │
  │     ├── appointments ──► sessions                        │
  │     │                    ├── sessionAttachments           │
  │     │                    └── sessionTemplates             │
  │     ├── patientPackages ──► packageUsage                  │
  │     ├── patientGoals                                      │
  │     ├── patientPathologies                                │
  │     ├── patientSessionMetrics                             │
  │     ├── prescribedExercises                               │
  │     ├── exercisePrescriptions                             │
  │     ├── standardizedTestResults                           │
  │     ├── painMaps ──► painMapPoints                        │
  │     ├── patientGamification ──► xpTransactions            │
  │     ├── achievementsLog                                   │
  │     ├── dailyQuests                                       │
  │     ├── biomechanicsAssessments                           │
  │     ├── clinicalScribeLogs                                │
  │     └── (WhatsApp: whatsappContacts → waConversations)   │
  │                                                          │
  ├── exercises ◄─── protocolExercises ──► exerciseProtocols │
  │     └── exerciseFavorites                                 │
  │                                                          │
  ├── exerciseCategories (self-ref hierarchy)                 │
  ├── exerciseTemplates ──► exerciseTemplateItems             │
  ├── evaluationTemplates                                    │
  ├── conductLibrary                                         │
  ├── clinicalTestTemplates                                  │
  ├── patientObjectives ──► patientObjectiveAssignments       │
  ├── evolutionTemplates                                     │
  │                                                          │
  ├── rooms, blockedSlots                                    │
  ├── taskBoards → taskColumns → tasks → taskAssignments     │
  │                                     → taskAcknowledgments │
  │                                     → taskVisibility     │
  │                                     → taskAuditLogs      │
  │                                                          │
  ├── transacoes, contasFinanceiras, pagamentos               │
  ├── convenios, fornecedores, empresasParceiras              │
  ├── centrosCusto, formasPagamento                           │
  ├── sessionPackageTemplates, vouchers, userVouchers         │
  ├── nfse, nfseConfig                                       │
  │                                                          │
  ├── wikiPages (self-ref) → wikiPageVersions                 │
  ├── wikiDictionary                                          │
  │                                                          │
  └── precadastroTokens → precadastros                        │
```
