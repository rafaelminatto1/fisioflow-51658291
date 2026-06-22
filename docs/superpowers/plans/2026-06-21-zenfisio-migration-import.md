# ZenFisio Migration Import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar 976 pacientes / 13.897 registros do export ZenFisio para Neon, preservando o status de cada atendimento (incluindo faltas) como `appointments` e o texto clínico como `sessions`.

**Architecture:** Um script de transform puro converte os JSONs do scraper + CSV de demografia num payload `legacyImportSchema`. O endpoint `POST /import/legacy-data` é estendido para inserir `appointments` (status = tipo legado) além de `sessions` (ligadas via `appointmentId` quando há texto). Dry-run valida antes do import real em produção.

**Tech Stack:** TypeScript, Zod, Drizzle ORM (node-postgres), Hono (Cloudflare Workers), Vitest, tsx.

## Global Constraints

- TypeScript strict; sem comentários supérfluos; PT-BR em mensagens de usuário.
- Datas legadas no formato `dd/MM/yyyy HH:mm` (campo `data_completa`) ou `dd/MM/yyyy` (campo `data`).
- `appointment_status` válidos: `agendado, atendido, avaliacao, cancelado, faltou, faltou_com_aviso, faltou_sem_aviso, nao_atendido, nao_atendido_sem_cobranca, presenca_confirmada, remarcar`.
- `session_status` válidos: `draft, under_review, finalized, cancelled`. Sessões importadas = `finalized`.
- `appointment_type` válidos: `evaluation, session, reassessment, group, return`.
- Join scraper↔CSV por `paciente_id` == `Código` (976/976 batem).
- Import roda com `replaceExisting: true` (apaga toda a org) — **só rodar real após dry-run limpo**. Alvo: produção direto (decisão do usuário).
- Rodar testes da API: `cd apps/api && pnpm test`. Rodar script: `pnpm tsx scripts/zenfisio-scraper/build-import-payload.ts`.

---

### Task 1: Funções puras de transform (status, tipo, data)

**Files:**
- Create: `scripts/zenfisio-scraper/lib/transform.ts`
- Test: `scripts/zenfisio-scraper/lib/transform.test.ts`

**Interfaces:**
- Produces:
  - `mapTipoToAppointmentStatus(tipo: string): { status: string; createsSession: boolean }`
  - `mapTipoToAppointmentType(tipo: string): "evaluation" | "session"`
  - `parseZenfisioDateTime(dataCompleta: string | undefined, dataFallback: string | undefined): { date: string; startTime: string | null } | null` — retorna ISO `yyyy-MM-dd` + `HH:mm`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import {
  mapTipoToAppointmentStatus,
  mapTipoToAppointmentType,
  parseZenfisioDateTime,
} from "./transform";

describe("mapTipoToAppointmentStatus", () => {
  it("mapeia Evolução para atendido + cria sessão", () => {
    expect(mapTipoToAppointmentStatus("Evolução")).toEqual({ status: "atendido", createsSession: true });
  });
  it("mapeia Faltou para faltou sem sessão", () => {
    expect(mapTipoToAppointmentStatus("Faltou")).toEqual({ status: "faltou", createsSession: false });
  });
  it("mapeia Avaliação para avaliacao + cria sessão", () => {
    expect(mapTipoToAppointmentStatus("Avaliação")).toEqual({ status: "avaliacao", createsSession: true });
  });
  it("mapeia Presença para presenca_confirmada + cria sessão", () => {
    expect(mapTipoToAppointmentStatus("Presença")).toEqual({ status: "presenca_confirmada", createsSession: true });
  });
  it("tipo desconhecido cai em nao_atendido sem sessão", () => {
    expect(mapTipoToAppointmentStatus("Xpto")).toEqual({ status: "nao_atendido", createsSession: false });
  });
});

describe("mapTipoToAppointmentType", () => {
  it("Avaliação => evaluation", () => {
    expect(mapTipoToAppointmentType("Avaliação")).toBe("evaluation");
  });
  it("Evolução => session", () => {
    expect(mapTipoToAppointmentType("Evolução")).toBe("session");
  });
});

describe("parseZenfisioDateTime", () => {
  it("parseia data_completa dd/MM/yyyy HH:mm", () => {
    expect(parseZenfisioDateTime("30/08/2024 15:00", undefined)).toEqual({ date: "2024-08-30", startTime: "15:00" });
  });
  it("usa fallback data sem hora", () => {
    expect(parseZenfisioDateTime(undefined, "03/04/2024")).toEqual({ date: "2024-04-03", startTime: null });
  });
  it("retorna null quando ambos ausentes/inválidos", () => {
    expect(parseZenfisioDateTime(undefined, undefined)).toBeNull();
    expect(parseZenfisioDateTime("data-ruim", undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/rafael/Documents/fisioflow/fisioflow-51658291 && pnpm vitest run scripts/zenfisio-scraper/lib/transform.test.ts`
Expected: FAIL — "Cannot find module './transform'".

- [ ] **Step 3: Write minimal implementation**

```ts
const STATUS_MAP: Record<string, { status: string; createsSession: boolean }> = {
  "evolução": { status: "atendido", createsSession: true },
  "evolucao": { status: "atendido", createsSession: true },
  "avaliação": { status: "avaliacao", createsSession: true },
  "avaliacao": { status: "avaliacao", createsSession: true },
  "atendido": { status: "atendido", createsSession: true },
  "presença": { status: "presenca_confirmada", createsSession: true },
  "presenca": { status: "presenca_confirmada", createsSession: true },
  "faltou": { status: "faltou", createsSession: false },
  "não atendido": { status: "nao_atendido", createsSession: false },
  "nao atendido": { status: "nao_atendido", createsSession: false },
  "agendado": { status: "agendado", createsSession: false },
  "cancelado": { status: "cancelado", createsSession: false },
  "remarcar": { status: "remarcar", createsSession: false },
};

export function mapTipoToAppointmentStatus(tipo: string): { status: string; createsSession: boolean } {
  return STATUS_MAP[(tipo ?? "").trim().toLowerCase()] ?? { status: "nao_atendido", createsSession: false };
}

export function mapTipoToAppointmentType(tipo: string): "evaluation" | "session" {
  const t = (tipo ?? "").trim().toLowerCase();
  return t === "avaliação" || t === "avaliacao" ? "evaluation" : "session";
}

export function parseZenfisioDateTime(
  dataCompleta: string | undefined,
  dataFallback: string | undefined,
): { date: string; startTime: string | null } | null {
  const source = (dataCompleta ?? dataFallback ?? "").trim();
  if (!source) return null;
  const match = source.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, min] = match;
  const day = Number(dd), month = Number(mm);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return {
    date: `${yyyy}-${mm}-${dd}`,
    startTime: hh && min ? `${hh}:${min}` : null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/rafael/Documents/fisioflow/fisioflow-51658291 && pnpm vitest run scripts/zenfisio-scraper/lib/transform.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add scripts/zenfisio-scraper/lib/transform.ts scripts/zenfisio-scraper/lib/transform.test.ts
git commit -m "feat(import): funções puras de transform ZenFisio (status/tipo/data)"
```

---

### Task 2: Builders de paciente + CSV de demografia

**Files:**
- Modify: `scripts/zenfisio-scraper/lib/transform.ts`
- Test: `scripts/zenfisio-scraper/lib/transform.test.ts`

**Interfaces:**
- Consumes: `mapTipoToAppointmentStatus`, `mapTipoToAppointmentType`, `parseZenfisioDateTime` (Task 1).
- Produces:
  - `type ScraperPatient = { paciente_nome: string; paciente_id: string; historico: ScraperRecord[] }`
  - `type ScraperRecord = { data?: string; data_completa?: string; tipo: string; conteudo_texto?: string; appointment_id?: string }`
  - `type CsvDemographics = Map<string, { birthDate?: string; gender?: string; phone?: string }>` (keyed por Código)
  - `parseCsvDemographics(csvText: string): CsvDemographics`
  - `buildLegacyPatient(p: ScraperPatient, demo?: { birthDate?: string; gender?: string; phone?: string }): LegacyPatientPayload | null` — null se nenhuma evolução válida.
  - `type LegacyPatientPayload` (formato do `legacyPatientSchema` estendido — Task 3).

- [ ] **Step 1: Write the failing test**

```ts
import { parseCsvDemographics, buildLegacyPatient } from "./transform";

describe("parseCsvDemographics", () => {
  const csv = `﻿"Código";"Nome";"Data de nascimento";"Sexo";"Celular"
"2658699";"Yasmin Barros";"15/05/1990";"Feminino";"11999998888"
"2658706";"Andre Luiz";"";"";""`;
  it("indexa por Código e extrai campos preenchidos", () => {
    const demo = parseCsvDemographics(csv);
    expect(demo.get("2658699")).toEqual({ birthDate: "15/05/1990", gender: "Feminino", phone: "11999998888" });
    expect(demo.get("2658706")).toEqual({ birthDate: undefined, gender: undefined, phone: undefined });
  });
});

describe("buildLegacyPatient", () => {
  const patient = {
    paciente_nome: "Yasmin Barros",
    paciente_id: "2658699",
    historico: [
      { data_completa: "30/08/2024 15:00", tipo: "Evolução", conteudo_texto: "texto clínico" },
      { data_completa: "13/09/2024 14:00", tipo: "Faltou", conteudo_texto: "" },
    ],
  };
  it("monta paciente com 2 evoluções (1 com sessão, 1 falta sem texto)", () => {
    const result = buildLegacyPatient(patient, { birthDate: "15/05/1990", gender: "Feminino", phone: "11999998888" })!;
    expect(result.fullName).toBe("Yasmin Barros");
    expect(result.legacyId).toBe("2658699");
    expect(result.birthDate).toBe("15/05/1990");
    expect(result.evolutions).toHaveLength(2);
    expect(result.evolutions[0]).toMatchObject({
      date: "2024-08-30", startTime: "15:00", observacao: "texto clínico",
      appointmentStatus: "atendido", appointmentType: "session",
    });
    expect(result.evolutions[1]).toMatchObject({ appointmentStatus: "faltou", appointmentType: "session" });
    expect(result.evolutions[1].observacao).toBeUndefined();
  });
  it("retorna null quando nenhuma data é parseável", () => {
    expect(buildLegacyPatient({ paciente_nome: "X", paciente_id: "1", historico: [{ tipo: "Faltou" }] })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/rafael/Documents/fisioflow/fisioflow-51658291 && pnpm vitest run scripts/zenfisio-scraper/lib/transform.test.ts`
Expected: FAIL — "parseCsvDemographics is not a function".

- [ ] **Step 3: Write minimal implementation**

Append to `transform.ts`:

```ts
export type ScraperRecord = {
  data?: string;
  data_completa?: string;
  tipo: string;
  conteudo_texto?: string;
  appointment_id?: string;
};
export type ScraperPatient = { paciente_nome: string; paciente_id: string; historico: ScraperRecord[] };

export type LegacyEvolutionPayload = {
  date: string;
  startTime?: string;
  observacao?: string;
  appointmentStatus: string;
  appointmentType: "evaluation" | "session";
};
export type LegacyPatientPayload = {
  fullName: string;
  legacyId: string;
  birthDate?: string;
  gender?: string;
  phone?: string;
  evolutions: LegacyEvolutionPayload[];
};

function splitCsvLine(line: string): string[] {
  return line.split(";").map((cell) => cell.replace(/^"|"$/g, "").trim());
}

export function parseCsvDemographics(csvText: string): Map<string, { birthDate?: string; gender?: string; phone?: string }> {
  const lines = csvText.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const header = splitCsvLine(lines[0]);
  const idx = (name: string) => header.indexOf(name);
  const iCode = idx("Código"), iBirth = idx("Data de nascimento"), iSexo = idx("Sexo"), iCel = idx("Celular");
  const map = new Map<string, { birthDate?: string; gender?: string; phone?: string }>();
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const code = cells[iCode];
    if (!code) continue;
    map.set(code, {
      birthDate: cells[iBirth] || undefined,
      gender: cells[iSexo] || undefined,
      phone: cells[iCel] || undefined,
    });
  }
  return map;
}

export function buildLegacyPatient(
  p: ScraperPatient,
  demo?: { birthDate?: string; gender?: string; phone?: string },
): LegacyPatientPayload | null {
  const evolutions: LegacyEvolutionPayload[] = [];
  for (const rec of p.historico ?? []) {
    const dt = parseZenfisioDateTime(rec.data_completa, rec.data);
    if (!dt) continue;
    const { status, createsSession } = mapTipoToAppointmentStatus(rec.tipo);
    const text = (rec.conteudo_texto ?? "").trim();
    evolutions.push({
      date: dt.date,
      startTime: dt.startTime ?? undefined,
      observacao: createsSession && text ? text : undefined,
      appointmentStatus: status,
      appointmentType: mapTipoToAppointmentType(rec.tipo),
    });
  }
  if (evolutions.length === 0) return null;
  return {
    fullName: p.paciente_nome.trim(),
    legacyId: p.paciente_id,
    birthDate: demo?.birthDate,
    gender: demo?.gender,
    phone: demo?.phone,
    evolutions,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/rafael/Documents/fisioflow/fisioflow-51658291 && pnpm vitest run scripts/zenfisio-scraper/lib/transform.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/zenfisio-scraper/lib/transform.ts scripts/zenfisio-scraper/lib/transform.test.ts
git commit -m "feat(import): builders de paciente legado + parser CSV demografia"
```

---

### Task 3: CLI build-import-payload.ts

**Files:**
- Create: `scripts/zenfisio-scraper/build-import-payload.ts`

**Interfaces:**
- Consumes: `parseCsvDemographics`, `buildLegacyPatient`, `ScraperPatient` (Task 2).
- Produces: arquivo `scripts/zenfisio-scraper/payload.json` no formato `legacyImportSchema`.

- [ ] **Step 1: Write the script**

```ts
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsvDemographics, buildLegacyPatient, type ScraperPatient } from "./lib/transform";

const here = dirname(fileURLToPath(import.meta.url));
const exportDir = join(here, "data", "zenfisio-export-20260620-v2");
const csvPath = join(here, "..", "..", "Pacientes - Activity Fisioterapia - 6a35aff1a2cd6.csv");
const outPath = join(here, "payload.json");

const demo = parseCsvDemographics(readFileSync(csvPath, "utf-8"));

const files = readdirSync(exportDir).filter((f) => f.startsWith("paciente_") && f.endsWith(".json"));
const patients = [];
let skipped = 0;
let totalEvolutions = 0;
for (const file of files) {
  const raw = JSON.parse(readFileSync(join(exportDir, file), "utf-8")) as ScraperPatient;
  const built = buildLegacyPatient(raw, demo.get(raw.paciente_id));
  if (!built) { skipped++; continue; }
  patients.push(built);
  totalEvolutions += built.evolutions.length;
}

const payload = { replaceExisting: true as const, dryRun: true, patients };
writeFileSync(outPath, JSON.stringify(payload, null, 2));

console.log(`Arquivos lidos: ${files.length}`);
console.log(`Pacientes no payload: ${patients.length} (pulados sem evolução válida: ${skipped})`);
console.log(`Total de evoluções/atendimentos: ${totalEvolutions}`);
console.log(`Payload salvo em: ${outPath}`);
```

- [ ] **Step 2: Run the script**

Run: `cd /home/rafael/Documents/fisioflow/fisioflow-51658291 && pnpm tsx scripts/zenfisio-scraper/build-import-payload.ts`
Expected: imprime ~976 pacientes, ~13.000 evoluções, gera `payload.json`. (Contagem exata depende de quantos registros têm data parseável.)

- [ ] **Step 3: Sanity-check do payload**

Run: `cd /home/rafael/Documents/fisioflow/fisioflow-51658291 && node -e "const p=require('./scripts/zenfisio-scraper/payload.json'); console.log('pacientes',p.patients.length); const s=new Set(); p.patients.forEach(x=>x.evolutions.forEach(e=>s.add(e.appointmentStatus))); console.log('status presentes',[...s]); console.log('faltas', p.patients.reduce((a,x)=>a+x.evolutions.filter(e=>e.appointmentStatus==='faltou').length,0));"`
Expected: lista de status inclui `faltou`, `atendido`, `avaliacao`; contagem de faltas ~1.900.

- [ ] **Step 4: Commit (script apenas; payload.json fica gitignored)**

```bash
echo "scripts/zenfisio-scraper/payload.json" >> .gitignore
git add scripts/zenfisio-scraper/build-import-payload.ts .gitignore
git commit -m "feat(import): CLI build-import-payload (scraper+CSV -> payload.json)"
```

---

### Task 4: Estender schema do endpoint (observacao opcional + campos de appointment)

**Files:**
- Modify: `apps/api/src/routes/import.ts:31-58` (schemas)
- Test: `apps/api/src/routes/__tests__/import.test.ts` (criar se não existir)

**Interfaces:**
- Consumes: nada novo.
- Produces: `legacyEvolutionSchema` com `observacao` opcional + `appointmentStatus`, `startTime`, `appointmentType`; refine "exige observacao OU appointmentStatus".

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { legacyImportSchema } from "../import";

describe("legacyImportSchema (estendido)", () => {
  const base = { replaceExisting: true as const, patients: [] as unknown[] };
  it("aceita evolução só com appointmentStatus (sem observacao)", () => {
    const r = legacyImportSchema.safeParse({
      ...base,
      patients: [{ fullName: "X", legacyId: "1", evolutions: [{ date: "2024-08-30", appointmentStatus: "faltou", appointmentType: "session" }] }],
    });
    expect(r.success).toBe(true);
  });
  it("aceita evolução com observacao e status atendido", () => {
    const r = legacyImportSchema.safeParse({
      ...base,
      patients: [{ fullName: "X", legacyId: "1", evolutions: [{ date: "2024-08-30", observacao: "texto", appointmentStatus: "atendido", appointmentType: "session" }] }],
    });
    expect(r.success).toBe(true);
  });
  it("rejeita evolução sem observacao e sem appointmentStatus", () => {
    const r = legacyImportSchema.safeParse({
      ...base,
      patients: [{ fullName: "X", legacyId: "1", evolutions: [{ date: "2024-08-30", appointmentType: "session" }] }],
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api && pnpm vitest run src/routes/__tests__/import.test.ts`
Expected: FAIL — `legacyImportSchema` não exportado ou refine ausente.

- [ ] **Step 3: Implement schema change**

Em `apps/api/src/routes/import.ts`, exportar e estender:

```ts
const APPOINTMENT_STATUSES = [
  "agendado","atendido","avaliacao","cancelado","faltou","faltou_com_aviso",
  "faltou_sem_aviso","nao_atendido","nao_atendido_sem_cobranca","presenca_confirmada","remarcar",
] as const;

const legacyEvolutionSchema = z
  .object({
    date: z.string().trim().optional(),
    startTime: z.string().trim().regex(/^\d{2}:\d{2}$/).optional(),
    observacao: z.string().trim().min(1).optional(),
    appointmentStatus: z.enum(APPOINTMENT_STATUSES).optional(),
    appointmentType: z.enum(["evaluation", "session", "reassessment", "group", "return"]).default("session"),
    painScale: z.number().min(0).max(10).optional(),
    status: z.string().trim().optional(),
    therapistId: z.string().trim().optional(),
    durationMinutes: z.number().int().positive().optional(),
  })
  .refine((e) => Boolean(e.observacao) || Boolean(e.appointmentStatus), {
    message: "Evolução precisa de observacao ou appointmentStatus.",
  });

export const legacyImportSchema = z.object({
  replaceExisting: z.literal(true),
  dryRun: z.boolean().optional().default(false),
  patients: z.array(legacyPatientSchema).min(1),
});
```

(Manter `legacyPatientSchema` como está, mas adicionar nada novo — `birthDate`/`gender`/`phone` já existem.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api && pnpm vitest run src/routes/__tests__/import.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/import.ts apps/api/src/routes/__tests__/import.test.ts
git commit -m "feat(import): observacao opcional + appointmentStatus/type no schema legado"
```

---

### Task 5: Inserir appointments e ligar sessions

**Files:**
- Modify: `apps/api/src/routes/import.ts` (`PreparedSessionRow`, `preparePatientImport`, bloco de insert ~480-500, `wipeOrganizationLegacyImportData`)
- Test: `apps/api/src/routes/__tests__/importPrepare.test.ts`

**Interfaces:**
- Consumes: schema da Task 4.
- Produces:
  - `type PreparedAppointmentRow = { date: string; startTime: string; endTime: string; status: string; type: string; therapistId: string; durationMinutes: number; sessionObservacao: string | null; painScale: number | null; sessionNumber: number | null }`
  - `preparePatientImport` retorna também `appointmentsToInsert: PreparedAppointmentRow[]`.
  - helper exportado `computeEndTime(startTime: string, durationMinutes: number): string`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { computeEndTime } from "../import";

describe("computeEndTime", () => {
  it("soma duração ao horário inicial", () => {
    expect(computeEndTime("15:00", 60)).toBe("16:00");
    expect(computeEndTime("23:30", 60)).toBe("00:30");
    expect(computeEndTime("14:15", 45)).toBe("15:00");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api && pnpm vitest run src/routes/__tests__/importPrepare.test.ts`
Expected: FAIL — `computeEndTime` não exportado.

- [ ] **Step 3: Implement computeEndTime + appointment rows**

Adicionar helper em `import.ts`:

```ts
export function computeEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = (h * 60 + m + durationMinutes) % (24 * 60);
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
```

Em `preparePatientImport`, dentro do loop de evoluções (após resolver `therapistId`), construir uma linha de appointment e, quando houver `observacao`, marcar para sessão ligada:

```ts
const startTime = evolution.startTime ?? "08:00";
const durationMinutes = evolution.durationMinutes ?? 60;
appointmentsToInsert.push({
  date: parsedDate.date!.toISOString().slice(0, 10),
  startTime,
  endTime: computeEndTime(startTime, durationMinutes),
  status: evolution.appointmentStatus ?? "atendido",
  type: evolution.appointmentType ?? "session",
  therapistId,
  durationMinutes,
  sessionObservacao: evolution.observacao?.trim() ?? null,
  painScale: evolution.painScale ?? null,
  sessionNumber: index + 1,
});
```

Atualizar o tipo de retorno e a desestruturação para incluir `appointmentsToInsert`.

- [ ] **Step 4: Implement the insert (appointments first, then linked sessions)**

Substituir o bloco de insert (~480-500) por:

```ts
const created = await db.transaction(async (tx) => {
  const [createdPatient] = await tx
    .insert(patients)
    .values(prepared.patientValues as any)
    .returning({ id: patients.id });

  for (const appt of prepared.appointmentsToInsert) {
    const [createdAppt] = await tx
      .insert(appointments)
      .values({
        patientId: createdPatient.id,
        organizationId: user.organizationId,
        therapistId: appt.therapistId,
        date: appt.date,
        startTime: appt.startTime,
        endTime: appt.endTime,
        durationMinutes: appt.durationMinutes,
        status: appt.status,
        type: appt.type as any,
      } as any)
      .returning({ id: appointments.id });

    if (appt.sessionObservacao) {
      await tx.insert(sessions).values({
        patientId: createdPatient.id,
        organizationId: user.organizationId,
        therapistId: appt.therapistId,
        appointmentId: createdAppt.id,
        date: new Date(`${appt.date}T${appt.startTime}:00`),
        observacao: appt.sessionObservacao,
        painScale: appt.painScale,
        duration: appt.durationMinutes,
        status: "finalized",
        sessionNumber: appt.sessionNumber,
      } as any);
    }
  }

  return createdPatient;
});
```

Garantir `import { appointments } from "@fisioflow/db";` no topo. Atualizar contadores do relatório (`sessionsImported` = nº de appointments com observacao; adicionar `appointmentsImported` = total de appointments) em `ImportPatientResult`, `ImportSummary` e `buildSummary`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api && pnpm test`
Expected: PASS (incluindo testes existentes de import).

- [ ] **Step 6: Type-check**

Run: `cd /home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api && pnpm type-check`
Expected: 0 erros.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/import.ts apps/api/src/routes/__tests__/importPrepare.test.ts
git commit -m "feat(import): inserir appointments por registro + sessions ligadas via appointmentId"
```

---

### Task 6: Dry-run e import real em produção

**Files:** nenhum (operação). Gerar payload, chamar endpoint.

**Interfaces:** consome o endpoint `POST /import/legacy-data` (Tasks 4-5) e `payload.json` (Task 3).

- [ ] **Step 1: Regenerar payload com dados frescos**

Run: `cd /home/rafael/Documents/fisioflow/fisioflow-51658291 && pnpm tsx scripts/zenfisio-scraper/build-import-payload.ts`
Expected: `payload.json` atualizado.

- [ ] **Step 2: Dry-run contra a API**

Obter um JWT de admin (login no app, copiar `Authorization` do DevTools, ou via `getNeonAccessToken`). Então:

```bash
curl -sS -X POST "https://fisioflow-api.rafalegollas.workers.dev/api/import/legacy-data" \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  --data-binary @scripts/zenfisio-scraper/payload.json | tee /tmp/dryrun.json | python3 -m json.tool | head -40
```

(O `payload.json` tem `dryRun:true`.) Expected: `summary.importedPatients` ~976, `failedPatients` baixo/zero, warnings revisáveis.

- [ ] **Step 3: Revisar relatório**

Run: `python3 -c "import json; d=json.load(open('/tmp/dryrun.json')); print(d['summary']); print('falhas:',[r for r in d['results'] if r['status']=='wouldFail'][:5])"`
Expected: relatório limpo. **Se houver falhas inesperadas, parar e corrigir o transform/schema antes de prosseguir.**

- [ ] **Step 4: Import real (PRODUÇÃO — destrutivo, irreversível)**

Editar `payload.json` para `"dryRun": false` (ou regenerar com flag), confirmar com o usuário, então repetir o `curl` da Step 2.
Expected: `summary` com `importedPatients` ~976, `importedSessions` ~11.500, `appointmentsImported` ~13.000.

- [ ] **Step 5: Verificar risco de falta**

```bash
curl -sS "https://fisioflow-api.rafalegollas.workers.dev/api/appointments?date=<hoje>" -H "Authorization: Bearer $JWT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('com risco:', sum(1 for a in d if a.get('risk_of_no_show')))"
```
Expected: ≥1 agendamento com `risk_of_no_show:true` para pacientes com 2 faltas recentes.

---

## Self-Review

**Spec coverage:**
- Transform script (spec §Componentes 1) → Tasks 1-3. ✓
- Estender import.ts: observacao opcional + appointmentStatus (spec §2a,c) → Task 4. ✓
- Inserir appointments + ligar sessions (spec descoberta arquitetural) → Task 5. ✓
- Demografia do CSV (spec §2e, decisão 2) → Tasks 2-3 (`buildLegacyPatient` + CLI). ✓
- Testes (spec §Componentes 3) → Tasks 1,2,4,5. ✓
- Dry-run → import real em prod (spec §Fluxo, decisão 3) → Task 6. ✓
- Critério: risco de falta com dados reais → Task 6 Step 5. ✓

**Placeholder scan:** Nenhum TODO/TBD; todo passo de código tem código real.

**Type consistency:** `LegacyPatientPayload`/`LegacyEvolutionPayload` (Task 2) alimentam `legacyImportSchema` estendido (Task 4 — campos `appointmentStatus`, `startTime`, `appointmentType`, `observacao` opcional batem). `PreparedAppointmentRow` (Task 5) consome esses campos. `computeEndTime` consistente entre Steps. `mapTipoToAppointmentStatus` retorna `{status, createsSession}` usado em `buildLegacyPatient`. ✓

**Nota de risco:** `legacyPatientSchema` precisa já aceitar `birthDate/gender/phone` (confirmado no código atual, linhas 40-52). Se não aceitasse, Task 4 incluiria adicioná-los.
