---
name: fisioflow-exercise-prescription
description: Reference for the exercise library, AI search, protocols, and home exercise prescription flow in FisioFlow. Use when working on exercises, categories, embeddings, HEP, or prescription APIs and UI.
---

# FisioFlow Exercise Prescription & HEP

Reference for the exercise library, AI-powered search, protocol management, and home exercise prescription system.

---

## Architecture

### Route File

`apps/api/src/routes/exercises.ts` (~531 lines)

### Database Schema

#### `exercise_categories` — Hierarchical taxonomy

```
exercise_categories
├── id: uuid PK
├── slug: varchar (unique)
├── name, description, icon (emoji), color (hex), orderIndex
├── parentId → self-reference (subcategories)
├── organizationId (null = global platform category)
```

Self-referential relations with `relationName: "subcategories"`.

#### `exercises` — Full exercise library

```
exercises
├── id: uuid PK
├── slug: varchar (unique), name
├── categoryId → exercise_categories.id
├── difficulty: enum (iniciante/intermediario/avancado)
├── description, instructions, tips, precautions, benefits
├── musclesPrimary[], musclesSecondary[], bodyParts[] (text arrays)
├── equipment[], alternativeEquipment[]
├── setsRecommended, repsRecommended, durationSeconds, restSeconds
├── imageUrl, thumbnailUrl, videoUrl
├── pathologiesIndicated[], pathologiesContraindicated[], icd10Codes[], tags[]
├── references
├── embedding: vector(768) — pgvector for semantic similarity
├── embeddingSketch: vector(768) — sketch-based search
├── referencePose: jsonb — MediaPipe landmarks for pose comparison
├── isActive, isPublic, organizationId (null = platform default), createdBy
├── GIN index on name (portuguese tsvector for full-text search)
```

#### `exercise_protocols` — Evidence-based protocols

```
exercise_protocols
├── id: uuid PK
├── slug, name, conditionName
├── protocolType: enum (pos_operatorio/patologia/preventivo/esportivo/funcional/neurologico/respiratorio/conservador/geriatria)
├── evidenceLevel: enum (A/B/C/D)
├── description, objectives, contraindications
├── weeksTotal
├── phases: jsonb(Array<{ name, weekStart, weekEnd, goals[], precautions[], exerciseIds? }>)
├── milestones: jsonb(Array<{ week, title, criteria[], notes? }>)
├── restrictions: jsonb(Array<{ weekStart, weekEnd?, description, type }>)
├── progressionCriteria: jsonb(Array<{ phase, criteria[] }>)
├── references: jsonb(Array<{ title, authors, year, journal?, doi?, url? }>)
├── icd10Codes[], tags[], clinicalTests[]
├── embedding: vector(768)
├── isActive, isPublic, organizationId, wikiPageId, createdBy
```

#### `protocol_exercises` — Protocol ↔ Exercise pivot

```
protocol_exercises
├── id: uuid PK
├── protocolId → exercise_protocols.id
├── exerciseId: uuid (lazy ref, no FK)
├── phaseWeekStart, phaseWeekEnd
├── setsRecommended, repsRecommended, durationSeconds, frequencyPerWeek
├── progressionNotes, orderIndex
├── organizationId
```

#### `exercise_favorites` — Therapist favorites

```
exercise_favorites
├── id: uuid PK
├── exerciseId → exercises.id
├── userId: text (Neon Auth UID)
├── organizationId
```

#### `exercise_prescriptions` — Home Exercise Programs (HEP)

From `clinical.ts`:

```
exercise_prescriptions
├── id: uuid PK
├── patientId → patients.id
├── organizationId
├── therapistId: uuid
├── title, description
├── exercises: jsonb(Array<{ exerciseId, sets, reps, duration, frequency, side?, notes? }>)
├── frequencyPerWeek, durationWeeks
├── qrCodeUrl — QR code for patient to open in portal/app
├── status: enum (active/completed/cancelled)
├── startsAt, expiresAt
├── deletedAt, createdAt, updatedAt
```

#### `prescribed_exercises` — Individual exercise assignments

From `clinical.ts`:

```
prescribed_exercises
├── id: uuid PK
├── patientId → patients.id
├── organizationId
├── exerciseId: uuid, protocolId: uuid
├── sets, reps, holdDuration, frequencyPerWeek, durationWeeks
├── phase, weekNumber, dayOfWeek
├── instructions, precautions
├── status: enum (prescribed/in_progress/completed/skipped)
├── prescribedAt, startedAt, completedAt
```

---

## AI Search Capabilities

### Semantic Search (Vector Embeddings)

```ts
import { generateEmbedding } from "../lib/ai-native";

const queryEmbedding = await generateEmbedding(searchText);
const results = await db.execute(sql`
  SELECT *, embedding <=> ${queryEmbedding}::vector AS distance
  FROM exercises
  WHERE organization_id = ${orgId} AND is_active = true
  ORDER BY embedding <=> ${queryEmbedding}::vector
  LIMIT 20
`);
```

### Sketch-Based Search

```ts
import { generateTurboSketch } from "../lib/ai-native";

const sketchEmbedding = await generateTurboSketch(imageBuffer);
// Same vector similarity search using embeddingSketch column
```

### Full-Text Search (Portuguese)

```ts
// Uses GIN index on to_tsvector('portuguese', name)
WHERE to_tsvector('portuguese', name) @@ plainto_tsquery('portuguese', ${search})
```

### Pose Detection

`referencePose: jsonb` stores MediaPipe landmarks. The mobile apps compare real-time camera feed against these landmarks for form feedback.

---

## KV Caching Layer

```ts
const CACHE_PREFIX = "exercises:v1:";
const CACHE_TTL = 3600; // 1 hour

// Cache invalidation targets first 5 pages for common page sizes
const INVALIDATE_PAGES = [1, 2, 3, 4, 5];
const COMMON_PAGE_SIZES = [20, 50, 500];
```

Cache keys:

- `exercises:v1:categories` — Category tree
- `exercises:v1:list:{orgId}:{page}:{size}` — Paginated exercise lists
- `exercises:v1:detail:{exerciseId}` — Individual exercise detail

---

## Prescription Flow

1. Therapist selects exercises (via search, favorites, or protocol)
2. Creates `exercise_prescriptions` record with exercise array
3. System generates QR code URL (deep link to patient portal)
4. Patient scans QR or receives WhatsApp link
5. Patient views exercises in portal/app with video instructions
6. Patient logs completion in `patient_exercise_logs` (portal feature)

---

## Protocol Application Pattern

When applying a protocol to a patient:

```ts
const protocol = await db.query.exerciseProtocols.findFirst({
  where: eq(exerciseProtocols.id, protocolId),
  with: { exercises: true },
});

const currentWeek = getWeeksSinceInjury(patient.injuryDate);
const currentPhase = protocol.phases.find(
  (p) => currentWeek >= p.weekStart && currentWeek <= p.weekEnd,
);

const exercisesForPhase = protocol.exercises.filter(
  (e) => currentWeek >= e.phaseWeekStart && currentWeek <= e.phaseWeekEnd,
);
```
