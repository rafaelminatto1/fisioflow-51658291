---
name: fisioflow-soap-evolution
description: Clinical evolution and SOAP note patterns for FisioFlow. Use when creating, modifying, or reviewing evolution-related components, routes, types, editors, AI generation, or persistence.
---

# FisioFlow SOAP Evolution Skill

Clinical evolution (SOAP notes) patterns for the FisioFlow physiotherapy clinic system. Use this skill when creating, modifying, or reviewing evolution-related components, routes, types, AI generation, or data persistence.

---

## 1. SOAP Method

FisioFlow uses the standard SOAP clinical documentation method. Each treatment session produces a structured record with four sections.

### Section Breakdown

| Section | Portuguese | Purpose | Example Content |
|---------|-----------|---------|-----------------|
| **S** (Subjective) | Subjetivo | Patient-reported symptoms, pain level, complaints, functional limitations | "Paciente relata dor lombar há 2 semanas, EVA 7/10, piora ao sentar" |
| **O** (Objective) | Objetivo | Therapist observations, measurements, ROM, special tests, palpation, gait | Stored as JSONB with structured fields: inspection, palpation, movement_tests, special_tests, posture_analysis, gait_analysis |
| **A** (Assessment) | Avaliação | Clinical reasoning, diagnosis, progress evaluation, prognosis | "Lombalgia mecânica com diminuição de ADM em flexão. Progresso satisfatório desde sessão anterior." |
| **P** (Plan) | Plano | Treatment plan, exercises, frequency, home program, precautions | "Continuar com alongamento de isquiotibiais 3x/semana. Adicionar fortalecimento de core." |

### Three Filling Modes

The evolution form supports three modes (`FillingMode` type):

```typescript
type FillingMode = "SOAP" | "Notion" | "Tiptap";
```

- **SOAP** — Four separate text fields for S/O/A/P
- **Notion** — Single free-text block (stored in `assessment` column)
- **Tiptap** — Rich text block editor with slash commands (stored as HTML)

Mode selection happens in `FillingStyleToggle`. The form component is at `apps/professional-app/app/evolution-form.tsx`.

---

## 2. Data Model

### Core Tables

#### `treatment_sessions` (Worker API — `apps/api/src/routes/evolution.ts`)

```sql
CREATE TABLE treatment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id TEXT REFERENCES profiles(user_id),
  appointment_id UUID REFERENCES appointments(id),
  exercise_plan_id UUID REFERENCES exercise_plans(id),
  session_date DATE DEFAULT CURRENT_DATE,
  start_time TIME DEFAULT NOW(),
  end_time TIME,
  duration_minutes INTEGER,
  session_type TEXT DEFAULT 'tratamento',
  subjective TEXT,
  objective JSONB,
  assessment TEXT,
  plan TEXT,
  procedures JSONB,
  exercises_performed JSONB,
  evolution TEXT,
  treatment_response TEXT,
  pain_level_before INTEGER,
  pain_level_after INTEGER,
  observations TEXT,
  next_session_goals TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Key points:
- `appointment_id` is nullable — sessions can be standalone (no appointment)
- `objective` is **JSONB** (structured), while `subjective`, `assessment`, `plan` are plain **TEXT**
- `pain_level_before` and `pain_level_after` are integers 0-10
- `exercises_performed` is JSONB array
- Upsert by `appointment_id` when present; always INSERT when standalone

#### `soap_records` (Web app — full SOAP lifecycle)

```sql
CREATE TABLE soap_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  session_number INTEGER,
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  status soap_status NOT NULL DEFAULT 'draft',
  pain_level INTEGER,
  pain_location TEXT,
  pain_character TEXT,
  duration_minutes INTEGER,
  last_auto_save_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  finalized_by TEXT REFERENCES profiles(user_id),
  record_date DATE DEFAULT CURRENT_DATE,
  created_by TEXT NOT NULL REFERENCES profiles(user_id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  signed_at TIMESTAMPTZ,
  signature_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Status lifecycle: `draft` → `finalized` → `signed`

#### `evolution_measurements`

```sql
CREATE TABLE evolution_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  soap_record_id UUID,
  measurement_type TEXT NOT NULL,
  measurement_name TEXT NOT NULL,
  value NUMERIC,
  unit TEXT,
  notes TEXT,
  custom_data JSONB,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Measurement types include: `circumference`, `range_of_motion`, `strength`, `vital_sign`, `other`.

#### `evolution_versions`

```sql
CREATE TABLE evolution_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soap_record_id UUID REFERENCES soap_records(id) ON DELETE CASCADE,
  saved_by TEXT NOT NULL,
  change_type TEXT DEFAULT 'auto',
  content JSONB NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);
```

Max 25 versions per record. Change types: `auto`, `manual`, `restore`.

#### `patient_pain_records`

```sql
CREATE TABLE patient_pain_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pain_level INTEGER NOT NULL,
  pain_type TEXT,
  body_part TEXT,
  notes TEXT,
  created_by TEXT REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `exercise_plans` and `exercise_plan_items`

```sql
CREATE TABLE exercise_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  target_end_date DATE,
  actual_end_date DATE,
  status TEXT DEFAULT 'ativo',
  created_by TEXT NOT NULL REFERENCES profiles(user_id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exercise_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES exercise_plans(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  "order" INTEGER DEFAULT 0 NOT NULL,
  sets INTEGER,
  reps TEXT,
  duration_seconds INTEGER,
  rest_seconds INTEGER,
  load TEXT,
  notes TEXT,
  frequency_weekly INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

`treatment_sessions.exercise_plan_id` links a session to an exercise plan.

### TypeScript Types

Core types live in `src/types/evolution.ts`:

```typescript
interface SessionEvolution {
  id: string;
  session_id: string;
  patient_id: string;
  session_date: string;
  session_number: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  pain_level?: number;
  evolution_notes?: string;
  test_results?: TestResult[];
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

Key types to know:
- `SessionExerciseData` — exercise performed within a session (sets, reps, weight, difficulty, side)
- `MeasurementData` — single measurement with type/unit/value
- `VitalSigns` — blood pressure, heart rate, respiratory rate, temperature, O2 saturation, pain
- `TimelineEvent` / `SessionEventData` — timeline view data with SOAP + vitals + exercises + measurements
- `EvolutionHeaderPatient` — patient info for the evolution header
- `EvolutionAlertData` — alerts (overdue goal, pain increase, plateau, improvement)

### API Routes

Worker API (`apps/api/src/routes/evolution.ts`):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/evolution/treatment-sessions?patientId=...&limit=N` | List sessions for patient |
| POST | `/evolution/treatment-sessions` | Create or upsert session |
| PATCH | `/evolution/treatment-sessions/:id` | Update existing session |
| GET | `/evolution/measurements?patientId=...` | List measurements |
| POST | `/evolution/measurements` | Create measurement |
| GET | `/evolution/required-measurements?pathologies=...` | Get required measurements for pathologies |

Version API (`apps/api/src/routes/evolutionVersions.ts`):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/evolution-versions?soapRecordId=...` | List versions (max 25) |
| POST | `/evolution-versions` | Save a new version |

Client API (`apps/professional-app/lib/api/evolutions.ts`):

```typescript
getEvolutions(patientId: string): Promise<ApiEvolution[]>
getEvolutionById(id: string): Promise<ApiEvolution | null>
createEvolution(data: Partial<ApiEvolution>): Promise<ApiEvolution>
updateEvolution(id: string, data: Partial<ApiEvolution>): Promise<ApiEvolution>
deleteEvolution(id: string): Promise<{ ok: boolean }>
duplicateEvolution(id: string): Promise<ApiEvolution>
```

### Auto-save Pattern

The evolution form auto-saves with a 2-second debounce. Draft key stored in `savedEvolutionId` ref:

```typescript
const triggerAutoSave = useCallback(() => {
  if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
  autoSaveTimer.current = setTimeout(async () => {
    const body = {
      patient_id: patientId,
      appointment_id: appointmentId ?? null,
      record_date: new Date().toISOString().split("T")[0],
      subjective: mode === "SOAP" ? subjective.trim() : "",
      objective: mode === "SOAP" ? objective.trim() : "",
      assessment: mode === "SOAP" ? assessment.trim() : freeContent.trim(),
      plan: mode === "SOAP" ? plan.trim() : "",
      pain_level: painLevel,
    };
    if (savedEvolutionId.current) body.recordId = savedEvolutionId.current;
    const res = await fetchApi("/api/sessions/autosave", { method: "POST", data: body });
    savedEvolutionId.current = res.data?.id ?? savedEvolutionId.current;
  }, 2000);
}, [mode, subjective, objective, assessment, plan, freeContent, patientId, appointmentId, painLevel]);
```

---

## 3. Pain Assessment Scales

### Visual Analog Scale (VAS / EVA) — 0-10

FisioFlow uses the 0-10 numeric scale (EVA — Escala Visual Analógica). Implementation in `src/components/evolution/PainScaleInput.tsx`.

```typescript
interface PainScaleData {
  level: number;
  location?: string;
  character?: string;
}

const PAIN_DESCRIPTIONS: Record<number, { text: string; color: string }> = {
  0: { text: "Sem dor", color: "bg-green-500" },
  1: { text: "Dor mínima", color: "bg-green-400" },
  2: { text: "Dor leve", color: "bg-lime-400" },
  3: { text: "Dor leve", color: "bg-lime-400" },
  4: { text: "Dor moderada", color: "bg-yellow-400" },
  5: { text: "Dor moderada", color: "bg-yellow-400" },
  6: { text: "Dor forte", color: "bg-orange-400" },
  7: { text: "Dor forte", color: "bg-orange-400" },
  8: { text: "Dor muito forte", color: "bg-red-500" },
  9: { text: "Dor insuportável", color: "bg-red-600" },
  10: { text: "A pior dor possível", color: "bg-red-700" },
};
```

Color bands: green (0-1) → lime (2-3) → yellow (4-5) → orange (6-7) → red (8-10).

Pain characteristics available as datalist suggestions:
- Aguda/Faca, Queimação, Pulsátil, Cólica, Pressão/Peso, Fadiga/Cansaço, Latejante, Amortecimento/Formigamento, Pontada, Cócegas/irritação

Pain is captured twice per session: `pain_level_before` (pre-treatment) and `pain_level_after` (post-treatment).

### Body Pain Map

Interactive anatomical diagram for marking pain regions. Types in `src/types/painMap.ts`.

```typescript
type PainIntensity = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

type PainType =
  | "aguda" | "cronica" | "latejante" | "queimacao"
  | "formigamento" | "dormencia" | "peso" | "pontada"
  | "sharp" | "throbbing" | "burning" | "tingling"
  | "numbness" | "stiffness";

type BodyRegion =
  | "cabeca_frente_direita" | "cabeca_frente_esquerda"
  | "cabeca_nuca_direita" | "cabeca_nuca_esquerda"
  | "pescoco_frontal_direito" | "pescoco_frontal_esquerdo"
  | "ombro_direito" | "ombro_esquerdo"
  | "braco_direito" | "braco_esquerdo"
  | "joelho_direito" | "joelho_esquerdo"
  | "lombar_esquerda" | "lombar_direita"
  | "quadril_direito" | "quadril_esquerdo"
  | "pe_direito" | "pe_esquerdo"
  /* ... 40+ regions total */;

interface PainMapPoint {
  region: BodyRegion;
  intensity: PainIntensity;
  painType: PainType;
  description?: string;
  x: number;
  y: number;
}

interface PainMapRecord {
  id: string;
  patient_id: string;
  session_id?: string;
  appointment_id?: string;
  recorded_at: string;
  pain_points: PainMapPoint[];
  global_pain_level: PainIntensity;
  notes?: string;
  created_by: string;
}

interface PainEvolutionData {
  date: string;
  globalPainLevel: number;
  regionCount: number;
  mostAffectedRegion?: BodyRegion;
  painPoints: PainMapPoint[];
}

interface PainStatistics {
  averagePainLevel: number;
  painReduction: number;
  mostFrequentRegion: BodyRegion;
  painFreeRegionsCount: number;
  improvementTrend: "improving" | "stable" | "worsening";
}
```

Components: `PainMapCanvas`, `PainMapManager`, `PainMapHistory`, `PainEvolutionChart`, `BodyMapRealistic`.

---

## 4. Exercise Protocol Integration

### Session Exercises

Exercises are tracked within each treatment session via the `exercises_performed` JSONB column. UI component: `SessionExercisesPanel`.

```typescript
interface SessionExercise {
  id: string;
  exerciseId: string;
  name: string;
  sets: number;
  repetitions: number;
  weight?: string;
  observations?: string;
  completed: boolean;
  image_url?: string;
  thumbnail_url?: string;
  video_url?: string;
}
```

Exercises are added via `ExerciseAutocomplete` or `ExerciseLibraryModal`. Each exercise has a completion toggle.

### Exercise Plans (HEP — Home Exercise Program)

```typescript
interface ExercisePlan {
  id: string;
  patient_id: string;
  name: string;
  description?: string;
  start_date: string;
  target_end_date?: string;
  actual_end_date?: string;
  status: "ativo" | "pausado" | "concluido" | "cancelado";
  created_by: string;
  notes?: string;
}

interface ExercisePlanItem {
  id: string;
  plan_id: string;
  exercise_id: string;
  order: number;
  sets?: number;
  reps?: string;
  duration_seconds?: number;
  rest_seconds?: number;
  load?: string;
  notes?: string;
  frequency_weekly: number;
}
```

`treatment_sessions.exercise_plan_id` links a session to its exercise plan. The plan items define the prescribed exercises; `exercises_performed` tracks what was actually done.

### Required Measurements per Pathology

Pathologies can mandate specific measurements at defined intervals:

```typescript
interface PathologyRequiredMeasurement {
  id: string;
  pathology_name: string;
  measurement_name: string;
  measurement_unit?: string;
  alert_level: "critico" | "importante" | "leve";
  instructions?: string;
}
```

API: `GET /evolution/required-measurements?pathologies=name1,name2`

### Exercise Adherence

The `patient_progress` table tracks `home_exercise_compliance` as a NUMERIC(10,4) percentage. The patient app (`apps/patient-app/services/evolutionService.ts`) exposes evolution data to patients.

---

## 5. Tiptap Rich Text Patterns

### V5 Pro Block Editor (`src/components/evolution/V5ProBlockEditor.tsx`)

The web app uses Tiptap (tiptap.dev) as a rich text editor. Extensions loaded:

```typescript
const editor = useEditor({
  extensions: [
    StarterKit.configure({ history: true, link: false }),
    Image.configure({
      HTMLAttributes: {
        class: "rounded-lg border border-gray-200 shadow-md max-w-full h-auto cursor-zoom-in hover:opacity-95 transition-opacity",
      },
    }),
    PdfEmbed,
    Link.configure({ openOnClick: false }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Mention.configure({
      HTMLAttributes: {
        class: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded-md font-bold text-xs",
      },
    }),
    Placeholder.configure({
      placeholder: "Digite '/' para comandos clínicos, '[[ ' para vincular sessões ou arraste um exame para cá...",
    }),
    Commands,
    Backlinks,
  ],
  content: initialContent,
  onUpdate: ({ editor }) => {
    const html = editor.getHTML();
    set(DRAFT_KEY, html);
  },
});
```

Custom extensions:
- **`Commands`** (`src/components/evolution/suggestion/commands.ts`) — Slash command menu for clinical shortcuts
- **`Backlinks`** (`src/components/evolution/suggestion/backlinks.ts`) — `[[` trigger to link to other sessions/records
- **`PdfEmbed`** (`src/components/evolution/extensions/PdfEmbed.ts`) — Inline PDF preview

### SOAP-to-Tiptap Migration

When SOAP data exists but Tiptap content is empty, the editor auto-migrates:

```typescript
useEffect(() => {
  if (editor && (!editor.getHTML() || editor?.getHTML() === "<p></p>")) {
    if (soapData && (soapData.subjective || soapData.objective || soapData.assessment || soapData.plan)) {
      const migratedContent = `
        <h2 class="text-blue-600 dark:text-blue-400 border-b pb-1">Subjetivo</h2>
        <p>${soapData.subjective || "<em>Sem registro</em>"}</p>
        <h2 class="text-blue-600 dark:text-blue-400 border-b pb-1">Objetivo</h2>
        <p>${soapData.objective || "<em>Sem registro</em>"}</p>
        <h2 class="text-blue-600 dark:text-blue-400 border-b pb-1">Avaliação</h2>
        <p>${soapData.assessment || "<em>Sem registro</em>"}</p>
        <h2 class="text-blue-600 dark:text-blue-400 border-b pb-1">Plano</h2>
        <p>${soapData.plan || "<em>Sem registro</em>"}</p>
      `;
      editor.commands.setContent(migratedContent);
    }
  }
}, [editor, soapData]);
```

### Draft Persistence

Drafts are saved to IndexedDB via `idb-keyval` with key `evolution_draft_${evolutionId}`:

```typescript
import { set, get, del } from "idb-keyval";

const DRAFT_KEY = `evolution_draft_${evolutionId}`;

set(DRAFT_KEY, html);
get(DRAFT_KEY).then((draft) => { if (draft) editor.commands.setContent(draft); });
```

### Mobile Tiptap Form (`apps/professional-app/components/evolution/TiptapForm.tsx`)

On mobile (React Native), the Tiptap editor is replaced with a plain `TextInput` that supports slash commands via a custom `SlashMenu`. Triggers:
- `/` — Opens slash command menu
- Command options: exercises, procedures, clinical tests

```typescript
const handleTextChange = (text: string) => {
  if (text[text.length - 1] === '/') setShowMenu(true);
  onChangeContent(text);
};
```

---

## 6. AI-Assisted SOAP Notes

### Architecture

AI SOAP generation uses **Google Gemini 2.5 Pro** via `@google/generative-ai`. Implementation: `src/lib/ai/soap-assistant.ts`.

```typescript
const SOAP_AI_CONFIG = {
  model: "gemini-2.5-pro",
  transcriptionModel: "gemini-2.5-pro",
  temperature: 0.3,
  maxTokens: 8192,
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
};
```

### Patient Context Provided to AI

```typescript
interface PatientSOAPContext {
  patient: Pick<Patient, "id" | "name" | "birthDate" | "gender" | "mainCondition" | "medicalHistory"> & { age: number };
  previousSOAP?: Array<Pick<SOAPRecord, "sessionNumber" | "subjective" | "objective" | "assessment" | "plan">>;
  sessionNumber: number;
  sessionType?: "initial" | "follow-up" | "reassessment" | "discharge";
  language?: "pt" | "en" | "es";
}
```

The builder includes the last 2 SOAP sessions as history:

```typescript
function buildPatientSOAPContext(
  patient: Patient,
  sessionNumber: number,
  previousSOAP?: SOAPRecord[],
  sessionType?: PatientSOAPContext["sessionType"],
): PatientSOAPContext {
  return {
    patient: {
      id: patient.id,
      name: patient.name,
      birthDate: patient.birthDate,
      gender: patient.gender,
      mainCondition: patient.mainCondition,
      medicalHistory: patient.medicalHistory,
      age: calculatePatientAge(patient.birthDate),
    },
    previousSOAP: previousSOAP?.map((soap) => ({
      sessionNumber: soap.sessionNumber,
      subjective: soap.subjective,
      objective: soap.objective,
      assessment: soap.assessment,
      plan: soap.plan,
    })),
    sessionNumber,
    sessionType,
    language: "pt",
  };
}
```

### SOAP Generation Output Schema

Zod-validated output schema:

```typescript
const SOAPGenerationSchema = z.object({
  soap: z.object({
    subjective: z.string().describe("Patient reported symptoms and complaints in Portuguese"),
    objective: z.object({
      inspection: z.string().optional(),
      palpation: z.string().optional(),
      movement_tests: z.record(z.string()).optional(),
      special_tests: z.record(z.string()).optional(),
      posture_analysis: z.string().optional(),
      gait_analysis: z.string().optional(),
    }).optional(),
    assessment: z.string().describe("Clinical assessment and diagnosis in Portuguese"),
    plan: z.object({
      short_term_goals: z.array(z.string()).optional(),
      long_term_goals: z.array(z.string()).optional(),
      interventions: z.array(z.string()).optional(),
      frequency: z.string().optional(),
      duration: z.string().optional(),
      home_exercises: z.array(z.string()).optional(),
      precautions: z.array(z.string()).optional(),
    }).optional(),
  }),
  keyFindings: z.array(z.string()),
  recommendations: z.array(z.string()),
  redFlags: z.array(z.string()).optional(),
  suggestedCodes: z.array(z.string()).optional(),
});
```

### System Prompt Pattern

The system prompt instructs Gemini to act as a Brazilian PT documentation assistant:

```
You are an expert physical therapist clinical documentation assistant specializing in SOAP note format for Brazilian healthcare.

Guidelines for SOAP format:
- Subjective (S): Patient's reported symptoms, complaints, and concerns in their own words.
- Objective (O): Measurable findings from physical examination.
- Assessment (A): Clinical evaluation including diagnosis, prognosis, and response to treatment.
- Plan (P): Evidence-based treatment plan with specific goals, interventions, frequency, and home exercises.

Quality Standards:
- Use professional Portuguese physical therapy terminology
- Be concise but complete
- Focus on function and outcomes
- Include measurable goals when possible
- Note any red flags or contraindications
- Align with Brazilian physical therapy best practices
- Use ICD-10 codes when relevant

Response Format:
Return ONLY valid JSON matching the provided schema. Do not include markdown code blocks.
```

### Generation Flow

```typescript
const assistant = new SOAPAssistant(apiKey);

const result = await assistant.generateSOAPFromText(
  consultationText,
  patientContext,
);

if (result.success && result.data) {
  const { soap, keyFindings, recommendations, redFlags, suggestedCodes } = result.data;
}
```

### Voice Transcription + SOAP

Audio consultation → transcription → SOAP generation in a single flow:

```typescript
const result = await assistant.generateSOAPFromAudio(
  audioBuffer,
  "audio/mp3",
  patientContext,
);
```

Supported audio formats: `audio/mp3`, `audio/mp4`, `audio/wav`, `audio/webm`, `audio/mpeg`, `audio/x-wav`.

### Mobile AI Integration

The mobile app calls the Workers AI endpoint:

```typescript
const handleGenerateWithAI = async () => {
  const data = await fetchApi("/api/ai/soap-suggestions", {
    method: "POST",
    data: {
      patientId,
      appointmentId,
      painLevel,
      mode,
      context: mode === "SOAP"
        ? { subjective, objective, assessment, plan }
        : { freeContent },
    },
  });
  if (mode === "SOAP" && data.soap) {
    setSubjective(data.soap.subjective || subjective);
    setObjective(data.soap.objective || objective);
    setAssessment(data.soap.assessment || assessment);
    setPlan(data.soap.plan || plan);
  }
};
```

### AI Scribe Modal (Web)

The web editor has an AI Scribe feature (`AIScribeModal`) triggered by `Alt+S` or the tiptap-ai-assist event:

```typescript
window.addEventListener("tiptap-ai-assist", () => {
  onAiAssist();
});
```

### Translation Support

SOAP notes can be translated between Portuguese, English, and Spanish:

```typescript
const translated = await assistant.translateSOAP(soapNote, "en");
```

### Singleton Pattern

```typescript
import { getSOAPAssistant, createSOAPAssistant } from "@/lib/ai/soap-assistant";

const assistant = getSOAPAssistant();
```

---

## Key File Locations

| File | Purpose |
|------|---------|
| `src/types/evolution.ts` | All evolution-related TypeScript types |
| `src/types/painMap.ts` | Pain map types (BodyRegion, PainMapPoint, etc.) |
| `src/lib/ai/soap-assistant.ts` | AI SOAP generation (Gemini) |
| `src/lib/export/evolutionPdfExport.ts` | PDF export with SOAP table |
| `apps/api/src/routes/evolution.ts` | Worker API for treatment sessions & measurements |
| `apps/api/src/routes/evolutionVersions.ts` | Version history API |
| `apps/professional-app/app/evolution-form.tsx` | Mobile evolution form |
| `apps/professional-app/lib/api/evolutions.ts` | Mobile API client |
| `apps/professional-app/components/evolution/SOAPForm.tsx` | SOAP mode form |
| `apps/professional-app/components/evolution/TiptapForm.tsx` | Tiptap mode form (mobile) |
| `apps/professional-app/components/evolution/PainLevelSlider.tsx` | Pain slider (mobile) |
| `apps/professional-app/components/evolution/SlashMenu.tsx` | Slash commands (mobile) |
| `src/components/evolution/V5ProBlockEditor.tsx` | Web Tiptap editor |
| `src/components/evolution/PainScaleInput.tsx` | VAS pain scale (web) |
| `src/components/evolution/PainMapCanvas.tsx` | Body pain map canvas |
| `src/components/evolution/SessionExercisesPanel.tsx` | Exercise tracking per session |
| `src/components/evolution/EvolutionVersionHistory.tsx` | Version history UI (Sheet) |
| `src/components/evolution/EvolutionTimeline.tsx` | Timeline view of all events |
| `src/components/evolution/SOAPFormPanel.tsx` | SOAP form panel (web) |
| `src/components/evolution/MeasurementCharts.tsx` | Measurement visualization |
| `src/components/evolution/TestEvolutionPanel.tsx` | Standardized test results over time |
| `src/components/evolution/ConductReplication.tsx` | Copy conduct from previous session |
| `src/components/evolution/EvolutionAlerts.tsx` | Smart alerts (pain increase, plateau, etc.) |
