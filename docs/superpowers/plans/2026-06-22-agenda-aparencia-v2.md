# Aparência da Agenda v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expandir a aba Aparência de `/agenda/settings` com presets, ajustes finos (fonte/espaçamento/opacidade por-visão), conteúdo do card e comportamento da grade (globais), refletindo tudo na agenda viva (FullCalendar).

**Architecture:** O estado por-visão já existe em `useAgendaAppearance` (`global/day/week/month`). Adicionamos um bloco **global** `display` (irmão) para C/D. A persistência (localStorage + PUT `/api/v1/user/agenda-appearance`) round-trippa o state inteiro; o schema Zod do backend precisa ganhar `display` senão o PUT descarta a chave. A UI vira 3 zonas (Presets / Por-visão / Global). O CSS da agenda passa a consumir os CSS vars já emitidos (`--agenda-font-scale`, `--agenda-card-padding`, `--agenda-card-opacity`). `ScheduleCalendar` consome `display` para `eventContent` (C) e props do FullCalendar (D).

**Tech Stack:** React 19 + TypeScript strict + Tailwind v4 + Shadcn; Vitest + Testing Library; FullCalendar; Hono + Zod 4 (Cloudflare Workers).

## Global Constraints

- TypeScript strict; sem comentários supérfluos.
- UI em PT-BR.
- Sem glassmorphism (sem backdrop-blur/transparências) — superfícies sólidas.
- Azul Activity (`blue-*`), nunca teal. Fonte Nunito.
- Per-view: chamar `useAgendaAppearancePersistence(view)` com view **fixa**; nunca condicionar a chamada do hook (contagem de hooks estável). Sub-componentes recebem `key={activeView}`.
- Auto-save client-side; contrato de save fica inerte via `useRegisterTabHandle`.
- Backend: PUT usa `zValidator` → chaves fora do schema são descartadas; todo campo novo persistido DEVE entrar no `AgendaAppearanceStateSchema`.
- Storage é coluna `jsonb` (`user_agenda_appearance.appearance_data`) — sem migração.

---

### Task 1: Bloco `display` no modelo (`useAgendaAppearance`)

**Files:**
- Modify: `src/hooks/useAgendaAppearance.ts`
- Modify: `src/types/agenda.ts` (adicionar `AgendaDisplayOptions`)
- Test: `src/hooks/__tests__/useAgendaAppearanceDisplay.test.ts` (Create)

**Interfaces:**
- Consumes: `AgendaAppearanceState` existente `{ global, day?, week?, month? }`.
- Produces:
  - `interface AgendaDisplayOptions { showDuration: boolean; showType: boolean; showPhone: boolean; nowIndicator: boolean; businessHours: boolean; hideSunday: boolean }`
  - `const DEFAULT_DISPLAY: AgendaDisplayOptions` (todos true exceto `showPhone:false`)
  - hook retorna `display: AgendaDisplayOptions` e `setDisplay: (patch: Partial<AgendaDisplayOptions>) => void`
  - state passa a ser `{ global, day?, week?, month?, display? }`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/hooks/__tests__/useAgendaAppearanceDisplay.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAgendaAppearance } from "@/hooks/useAgendaAppearance";

beforeEach(() => localStorage.clear());

describe("useAgendaAppearance — display", () => {
  it("usa DEFAULT_DISPLAY quando não há nada salvo", () => {
    const { result } = renderHook(() => useAgendaAppearance("week"));
    expect(result.current.display).toEqual({
      showDuration: true, showType: true, showPhone: false,
      nowIndicator: true, businessHours: true, hideSunday: true,
    });
  });

  it("setDisplay faz merge parcial e persiste", () => {
    const { result } = renderHook(() => useAgendaAppearance("week"));
    act(() => result.current.setDisplay({ showPhone: true, nowIndicator: false }));
    expect(result.current.display.showPhone).toBe(true);
    expect(result.current.display.nowIndicator).toBe(false);
    expect(result.current.display.showDuration).toBe(true);
    const saved = JSON.parse(localStorage.getItem("agenda_appearance_v2")!);
    expect(saved.display.showPhone).toBe(true);
  });

  it("retrocompat: state salvo sem display retorna DEFAULT_DISPLAY", () => {
    localStorage.setItem(
      "agenda_appearance_v2",
      JSON.stringify({ global: { cardSize: "medium", heightScale: 5, fontScale: 5, opacity: 100 } }),
    );
    const { result } = renderHook(() => useAgendaAppearance("week"));
    expect(result.current.display.showDuration).toBe(true);
    expect(result.current.display.showPhone).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/hooks/__tests__/useAgendaAppearanceDisplay.test.ts`
Expected: FAIL (`result.current.display` é `undefined`; `setDisplay` não existe).

- [ ] **Step 3: Adicionar o tipo em `src/types/agenda.ts`**

Depois de `AgendaViewAppearance` (após a linha 194), adicionar:

```ts
export interface AgendaDisplayOptions {
  showDuration: boolean;
  showType: boolean;
  showPhone: boolean;
  nowIndicator: boolean;
  businessHours: boolean;
  hideSunday: boolean;
}
```

- [ ] **Step 4: Implementar no `useAgendaAppearance.ts`**

No topo, importar o tipo e definir o default (após `DEFAULT_GLOBAL`):

```ts
import { AgendaView, AgendaViewAppearance, AgendaDisplayOptions } from "@/types/agenda";

const DEFAULT_DISPLAY: AgendaDisplayOptions = {
  showDuration: true,
  showType: true,
  showPhone: false,
  nowIndicator: true,
  businessHours: true,
  hideSunday: true,
};
```

Estender a interface do state:

```ts
interface AgendaAppearanceState {
  global: AgendaViewAppearance;
  day?: Partial<AgendaViewAppearance>;
  week?: Partial<AgendaViewAppearance>;
  month?: Partial<AgendaViewAppearance>;
  display?: Partial<AgendaDisplayOptions>;
}
```

Dentro do hook, derivar o display efetivo e o setter (antes do `return`):

```ts
const display: AgendaDisplayOptions = useMemo(
  () => ({ ...DEFAULT_DISPLAY, ...(state.display ?? {}) }),
  [state.display],
);
```

No objeto retornado, adicionar:

```ts
display,
setDisplay: (patch: Partial<AgendaDisplayOptions>) =>
  save({ ...state, display: { ...state.display, ...patch } }),
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `npx vitest run src/hooks/__tests__/useAgendaAppearanceDisplay.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useAgendaAppearance.ts src/types/agenda.ts src/hooks/__tests__/useAgendaAppearanceDisplay.test.ts
git commit -m "feat(agenda): bloco global display no modelo de aparência"
```

---

### Task 2: Round-trip de `display` na persistência

**Files:**
- Modify: `src/hooks/useAgendaAppearancePersistence.ts`
- Test: `src/hooks/__tests__/useAgendaAppearancePersistence.test.ts` (Modify — adicionar caso)

**Interfaces:**
- Consumes: `baseHook.display`, `baseHook.setDisplay` (Task 1).
- Produces: a persistência reexporta `display: AgendaDisplayOptions` e `setDisplay: (patch) => void` (este dispara `debouncedSave`).

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao final do `describe` principal em `useAgendaAppearancePersistence.test.ts`:

```ts
it("setDisplay atualiza display e dispara save debounced", async () => {
  const { result } = renderHook(() => useAgendaAppearancePersistence("week"), { wrapper });
  act(() => result.current.setDisplay({ showPhone: true }));
  expect(result.current.display.showPhone).toBe(true);
});
```

(`wrapper` = QueryClientProvider já usado no arquivo; reaproveitar o existente.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/hooks/__tests__/useAgendaAppearancePersistence.test.ts -t "setDisplay"`
Expected: FAIL (`result.current.display` / `setDisplay` undefined).

- [ ] **Step 3: Implementar**

No `useAgendaAppearancePersistence.ts`, criar o wrapper (junto aos outros setters):

```ts
const setDisplay = useCallback(
  (patch: Parameters<UseAgendaAppearanceResult["setDisplay"]>[0]) => {
    baseHook.setDisplay(patch);
    debouncedSave();
  },
  [baseHook, debouncedSave],
);
```

No objeto retornado, adicionar `display: baseHook.display,` e `setDisplay,`.

Atualizar a interface `UseAgendaAppearancePersistenceResult` (ela já estende `UseAgendaAppearanceResult`, que agora inclui `display`/`setDisplay` via `ReturnType` — confirmar que compila; se a interface lista campos manualmente, adicionar os dois).

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/hooks/__tests__/useAgendaAppearancePersistence.test.ts`
Expected: PASS (todos, incl. o novo).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAgendaAppearancePersistence.ts src/hooks/__tests__/useAgendaAppearancePersistence.test.ts
git commit -m "feat(agenda): persistência expõe display + setDisplay"
```

---

### Task 3: Schema do backend aceita `display`

**Files:**
- Modify: `apps/api/src/routes/agendaAppearance.ts`
- Test: `apps/api/src/__tests__/agendaAppearance.test.ts` (Modify — adicionar casos)

**Interfaces:**
- Consumes: `AgendaAppearanceStateSchema` existente.
- Produces: schema passa a aceitar `display?: { showDuration?, showType?, showPhone?, nowIndicator?, businessHours?, hideSunday? }` (booleans, todos opcionais); PUT persiste e GET devolve.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `agendaAppearance.test.ts` no describe do PUT:

```ts
it("persiste o bloco display e devolve no GET", async () => {
  const body = {
    global: { cardSize: "medium", heightScale: 5, fontScale: 5, opacity: 100 },
    display: { showPhone: true, hideSunday: false },
  };
  const put = await app.request("/api/v1/user/agenda-appearance", {
    method: "PUT",
    headers: authHeaders, // reaproveitar o helper do arquivo
    body: JSON.stringify(body),
  });
  expect(put.status).toBe(200);
  // o mock de pool deve refletir o JSON salvo; conferir o padrão já usado no arquivo
});
```

> Nota de implementação: seguir EXATAMENTE o padrão de mock de `pool.query` já presente no arquivo de teste (capturar o 3º parâmetro do INSERT e parsear). Se o arquivo valida via objeto retornado, asseverar que `JSON.parse(capturedArg).display.showPhone === true`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/api && npx vitest run src/__tests__/agendaAppearance.test.ts -t "display"`
Expected: FAIL (zValidator descarta `display` → não aparece no JSON salvo).

- [ ] **Step 3: Implementar o schema**

Em `agendaAppearance.ts`, após `PartialAgendaViewAppearanceSchema` (linha 38), adicionar:

```ts
const AgendaDisplaySchema = z
  .object({
    showDuration: z.boolean(),
    showType: z.boolean(),
    showPhone: z.boolean(),
    nowIndicator: z.boolean(),
    businessHours: z.boolean(),
    hideSunday: z.boolean(),
  })
  .partial();
```

Adicionar ao `AgendaAppearanceStateSchema`:

```ts
export const AgendaAppearanceStateSchema = z.object({
  global: AgendaViewAppearanceSchema,
  day: PartialAgendaViewAppearanceSchema.optional(),
  week: PartialAgendaViewAppearanceSchema.optional(),
  month: PartialAgendaViewAppearanceSchema.optional(),
  display: AgendaDisplaySchema.optional(),
});
```

Em `clampAppearanceState`, propagar `display` sem alterar (booleans não precisam de clamp):

```ts
return {
  global: { /* …igual… */ },
  day: state.day ? clampViewAppearance(state.day) : undefined,
  week: state.week ? clampViewAppearance(state.week) : undefined,
  month: state.month ? clampViewAppearance(state.month) : undefined,
  display: state.display,
};
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/api && npx vitest run src/__tests__/agendaAppearance.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/agendaAppearance.ts apps/api/src/__tests__/agendaAppearance.test.ts
git commit -m "feat(agenda): backend aceita e persiste bloco display"
```

---

### Task 4: CSS consome font/padding/opacity nos cards (balde A)

**Files:**
- Modify: `src/styles/schedule.css`

**Interfaces:**
- Consumes: CSS vars já emitidos por `cssVariables` no container (`--agenda-font-scale`, `--agenda-card-padding`, `--agenda-card-opacity`).
- Produces: cards do FullCalendar reagem a fonte/espaçamento/opacidade.

> CSS não tem teste unitário; a verificação é visual (Task 11). Mantemos a task isolada e pequena.

- [ ] **Step 1: Adicionar regras ao final de `schedule.css`**

```css
/* 8. Ajustes finos por-visão (fonte/espaçamento/opacidade) — CSS vars do hook */
.fc .fc-event-patient-name {
  font-size: calc(12px * var(--agenda-font-scale, 1)) !important;
}

.fc .fc-event-main .mt-auto {
  font-size: calc(10px * var(--agenda-font-scale, 1)) !important;
}

.fc .fc-timegrid-event-harness {
  padding: var(--agenda-card-padding, 2px) 4px !important;
}

.fc .fc-v-event {
  opacity: var(--agenda-card-opacity, 1) !important;
}
```

- [ ] **Step 2: Build sanity (sem quebrar CSS)**

Run: `npx vitest run src/hooks/__tests__/useAgendaAppearancePersistence.test.ts`
(Smoke rápido só para garantir que nada de TS quebrou no pacote; CSS em si valida-se na Task 11.)
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/styles/schedule.css
git commit -m "feat(agenda): cards consomem font/padding/opacity das CSS vars"
```

---

### Task 5: AparenciaTab — sliders de ajustes finos (balde A)

**Files:**
- Modify: `src/components/schedule/settings/tabs/AparenciaTab.tsx`
- Test: `src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx` (Create)

**Interfaces:**
- Consumes: `activeHook.setFontScale`, `activeHook.setPaddingScale`, `activeHook.setOpacity`, `activeHook.appearance` (já existem).
- Produces: bloco recolhível "Ajustes finos" dentro de `ViewControls` com 3 sliders (Fonte 1–10, Espaçamento 1–10, Opacidade 0–100).

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AparenciaTab } from "../AparenciaTab";

vi.mock("@/api/v2/base", () => ({ request: vi.fn().mockResolvedValue({ data: null }) }));

function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AparenciaTab registerHandle={() => {}} />
    </QueryClientProvider>,
  );
}

beforeEach(() => localStorage.clear());

describe("AparenciaTab — ajustes finos", () => {
  it("expande 'Ajustes finos' e mostra os sliders de Fonte/Espaçamento/Opacidade", () => {
    renderTab();
    fireEvent.click(screen.getByText(/Ajustes finos/i));
    expect(screen.getByLabelText(/Fonte/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Espaçamento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Opacidade/i)).toBeInTheDocument();
  });

  it("mover o slider de Fonte persiste fontScale na visão ativa", () => {
    renderTab();
    fireEvent.click(screen.getByText(/Ajustes finos/i));
    fireEvent.change(screen.getByLabelText(/Fonte/i), { target: { value: "8" } });
    const saved = JSON.parse(localStorage.getItem("agenda_appearance_v2")!);
    expect(saved.week.fontScale).toBe(8);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx`
Expected: FAIL (não existe "Ajustes finos").

- [ ] **Step 3: Implementar o bloco recolhível em `ViewControls`**

Adicionar um `useState` local `const [showAdvanced, setShowAdvanced] = useState(false);` em `ViewControls` e, abaixo do slider "Altura dos cards", inserir:

```tsx
<div>
  <button
    type="button"
    onClick={() => setShowAdvanced((v) => !v)}
    className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
  >
    {showAdvanced ? "▾" : "▸"} Ajustes finos
  </button>
  {showAdvanced && (
    <div className="mt-3 space-y-3">
      <FieldRow
        label="Fonte"
        description="Tamanho do texto dos cards"
        control={
          <input
            type="range" min={1} max={10}
            value={appearance.fontScale ?? 5}
            onChange={(e) => onFontScale(Number(e.target.value))}
            className="w-48 accent-blue-600" aria-label="Fonte"
          />
        }
      />
      <FieldRow
        label="Espaçamento"
        description="Respiro interno dos cards"
        control={
          <input
            type="range" min={1} max={10}
            value={appearance.paddingScale ?? 5}
            onChange={(e) => onPaddingScale(Number(e.target.value))}
            className="w-48 accent-blue-600" aria-label="Espaçamento"
          />
        }
      />
      <FieldRow
        label="Opacidade"
        description="Transparência dos cards"
        control={
          <input
            type="range" min={0} max={100}
            value={appearance.opacity ?? 100}
            onChange={(e) => onOpacity(Number(e.target.value))}
            className="w-48 accent-blue-600" aria-label="Opacidade"
          />
        }
      />
    </div>
  )}
</div>
```

Estender as props de `ViewControls` com `onFontScale`, `onPaddingScale`, `onOpacity` e passá-las do pai (`AparenciaTab`), ligando aos setters da visão ativa:

```tsx
// em AparenciaTab, dentro do JSX do <ViewControls>:
onFontScale={(v) => activeHook.setFontScale(v)}
onPaddingScale={(v) => activeHook.setPaddingScale(v)}
onOpacity={(v) => activeHook.setOpacity(v)}
```

E na assinatura/destructuring de `ViewControls` adicionar os três callbacks ao tipo de props.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/settings/tabs/AparenciaTab.tsx src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx
git commit -m "feat(agenda): ajustes finos (fonte/espaçamento/opacidade) por-visão na aba"
```

---

### Task 6: AparenciaTab — presets de 1 clique (balde B)

**Files:**
- Modify: `src/components/schedule/settings/tabs/AparenciaTab.tsx`
- Test: `src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx` (Modify)

**Interfaces:**
- Consumes: `activeHook.setAll(patch)` (já existe).
- Produces: `const APPEARANCE_PRESETS` (Denso/Confortável/Apresentação) + 3 botões no topo da aba.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao describe:

```tsx
it("clicar no preset Denso aplica os valores na visão ativa", () => {
  renderTab();
  fireEvent.click(screen.getByRole("button", { name: /Denso/i }));
  const saved = JSON.parse(localStorage.getItem("agenda_appearance_v2")!);
  expect(saved.week.cardSize).toBe("small");
  expect(saved.week.heightScale).toBe(2);
  expect(saved.week.fontScale).toBe(4);
  expect(saved.week.paddingScale).toBe(2);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx -t "preset Denso"`
Expected: FAIL (não há botão "Denso").

- [ ] **Step 3: Implementar presets**

No topo do arquivo (após `DENSITY_OPTIONS`):

```tsx
const APPEARANCE_PRESETS: Array<{
  key: string; label: string; hint: string;
  patch: { cardSize: CardSize; heightScale: number; fontScale: number; paddingScale: number };
}> = [
  { key: "denso", label: "Denso", hint: "Muitos pacientes/dia",
    patch: { cardSize: "small", heightScale: 2, fontScale: 4, paddingScale: 2 } },
  { key: "confortavel", label: "Confortável", hint: "Padrão",
    patch: { cardSize: "medium", heightScale: 5, fontScale: 5, paddingScale: 5 } },
  { key: "apresentacao", label: "Apresentação", hint: "Tela grande",
    patch: { cardSize: "large", heightScale: 9, fontScale: 9, paddingScale: 8 } },
];
```

Em `AparenciaTab`, antes do bloco "Auto adjust toggle", inserir a zona de presets:

```tsx
<div>
  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    Presets
  </p>
  <div className="grid gap-2 sm:grid-cols-3">
    {APPEARANCE_PRESETS.map((p) => {
      const active =
        activeHook.appearance.cardSize === p.patch.cardSize &&
        (activeHook.appearance.heightScale ?? 5) === p.patch.heightScale;
      return (
        <button
          key={p.key}
          type="button"
          onClick={() => { setAutoAdjust(false); localStorage.setItem(AUTO_ADJUST_KEY, "false"); activeHook.setAll(p.patch); }}
          className={cn(
            "rounded-lg border p-3 text-left transition",
            active
              ? "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
              : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-900",
          )}
        >
          <p className="text-sm font-semibold">{p.label}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{p.hint}</p>
        </button>
      );
    })}
  </div>
</div>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/settings/tabs/AparenciaTab.tsx src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx
git commit -m "feat(agenda): presets de 1 clique (Denso/Confortável/Apresentação)"
```

---

### Task 7: AparenciaTab — seção global Conteúdo do card + Comportamento (baldes C/D, UI)

**Files:**
- Modify: `src/components/schedule/settings/tabs/AparenciaTab.tsx`
- Test: `src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx` (Modify)

**Interfaces:**
- Consumes: `weekHook.display`, `weekHook.setDisplay` (usar o hook global já instanciado como `useAgendaAppearancePersistence("week")` — display é global, qualquer view serve).
- Produces: seção "Agenda toda" com 6 switches mapeados a `display`.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
it("alternar 'Mostrar telefone' persiste display.showPhone", () => {
  renderTab();
  const sw = screen.getByLabelText(/Mostrar telefone/i);
  fireEvent.click(sw);
  const saved = JSON.parse(localStorage.getItem("agenda_appearance_v2")!);
  expect(saved.display.showPhone).toBe(true);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx -t "telefone"`
Expected: FAIL.

- [ ] **Step 3: Implementar a seção global**

Pegar `display`/`setDisplay` do hook canônico já presente:

```tsx
const {
  appearance: weekAppearance,
  applyToAllViews, resetAll, isSyncing, lastSyncedAt,
  display, setDisplay,
} = useAgendaAppearancePersistence("week");
```

Após o `<ViewControls>`, adicionar a zona global (usar `SectionCard`/`FieldRow`/`Switch` já importados; criar um helper local para reduzir repetição):

```tsx
<div className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800">
  <div>
    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Conteúdo do card · agenda toda
    </p>
    <div className="space-y-2">
      <FieldRow label="Mostrar duração" description="Tempo de cada atendimento no card"
        control={<Switch checked={display.showDuration} onCheckedChange={(v) => setDisplay({ showDuration: v })} aria-label="Mostrar duração" />} />
      <FieldRow label="Mostrar tipo" description="Tipo de atendimento no card"
        control={<Switch checked={display.showType} onCheckedChange={(v) => setDisplay({ showType: v })} aria-label="Mostrar tipo" />} />
      <FieldRow label="Mostrar telefone" description="Telefone do paciente no card"
        control={<Switch checked={display.showPhone} onCheckedChange={(v) => setDisplay({ showPhone: v })} aria-label="Mostrar telefone" />} />
    </div>
  </div>
  <div>
    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Comportamento da grade · agenda toda
    </p>
    <div className="space-y-2">
      <FieldRow label="Destacar hora atual" description="Linha do horário atual"
        control={<Switch checked={display.nowIndicator} onCheckedChange={(v) => setDisplay({ nowIndicator: v })} aria-label="Destacar hora atual" />} />
      <FieldRow label="Sombrear fora do expediente" description="Realça horários de funcionamento"
        control={<Switch checked={display.businessHours} onCheckedChange={(v) => setDisplay({ businessHours: v })} aria-label="Sombrear fora do expediente" />} />
      <FieldRow label="Ocultar domingo" description="Esconde a coluna de domingo"
        control={<Switch checked={display.hideSunday} onCheckedChange={(v) => setDisplay({ hideSunday: v })} aria-label="Ocultar domingo" />} />
    </div>
  </div>
</div>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/settings/tabs/AparenciaTab.tsx src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx
git commit -m "feat(agenda): seção global conteúdo do card + comportamento da grade"
```

---

### Task 8: ScheduleCalendar consome `display` para a grade (balde D)

**Files:**
- Create: `src/components/schedule/scheduleBehavior.ts` (helper puro)
- Modify: `src/components/schedule/ScheduleCalendar.tsx`
- Test: `src/components/schedule/__tests__/scheduleBehavior.test.ts` (Create)

**Interfaces:**
- Consumes: `AgendaDisplayOptions` (Task 1); `appearance`/`display` de `useAgendaAppearancePersistence(viewType)`.
- Produces: `deriveCalendarBehavior(display, fcBusinessHours): { nowIndicator: boolean; businessHours: BusinessHoursInput | false; hiddenDays: number[] }`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/components/schedule/__tests__/scheduleBehavior.test.ts
import { describe, it, expect } from "vitest";
import { deriveCalendarBehavior } from "../scheduleBehavior";

const D = { showDuration: true, showType: true, showPhone: false, nowIndicator: true, businessHours: true, hideSunday: true };

describe("deriveCalendarBehavior", () => {
  it("hideSunday=true → hiddenDays inclui 0", () => {
    expect(deriveCalendarBehavior(D, []).hiddenDays).toEqual([0]);
  });
  it("hideSunday=false → hiddenDays vazio", () => {
    expect(deriveCalendarBehavior({ ...D, hideSunday: false }, []).hiddenDays).toEqual([]);
  });
  it("businessHours=false → retorna false", () => {
    expect(deriveCalendarBehavior({ ...D, businessHours: false }, [{ daysOfWeek: [1] }]).businessHours).toBe(false);
  });
  it("businessHours=true → repassa fcBusinessHours", () => {
    const bh = [{ daysOfWeek: [1], startTime: "07:00", endTime: "21:00" }];
    expect(deriveCalendarBehavior(D, bh).businessHours).toBe(bh);
  });
  it("repassa nowIndicator", () => {
    expect(deriveCalendarBehavior({ ...D, nowIndicator: false }, []).nowIndicator).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/schedule/__tests__/scheduleBehavior.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar o helper**

```ts
// src/components/schedule/scheduleBehavior.ts
import type { AgendaDisplayOptions } from "@/types/agenda";

export function deriveCalendarBehavior<T>(
  display: AgendaDisplayOptions,
  fcBusinessHours: T,
): { nowIndicator: boolean; businessHours: T | false; hiddenDays: number[] } {
  return {
    nowIndicator: display.nowIndicator,
    businessHours: display.businessHours ? fcBusinessHours : false,
    hiddenDays: display.hideSunday ? [0] : [],
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/components/schedule/__tests__/scheduleBehavior.test.ts`
Expected: PASS (5).

- [ ] **Step 5: Ligar no `ScheduleCalendar.tsx`**

Na linha 160, incluir `display` no destructuring:

```tsx
const { cssVariables, slotHeightPx, appearance, display } = useAgendaAppearancePersistence(viewType);
```

Importar o helper e derivar (perto de `fcBusinessHours`, ~linha 209+):

```tsx
import { deriveCalendarBehavior } from "./scheduleBehavior";
const behavior = useMemo(() => deriveCalendarBehavior(display, fcBusinessHours), [display, fcBusinessHours]);
```

Trocar as props hardcoded do `<FullCalendar>` (linhas ~541/554/555):

```tsx
hiddenDays={behavior.hiddenDays}
businessHours={behavior.businessHours}
nowIndicator={behavior.nowIndicator}
```

- [ ] **Step 6: Rodar typecheck do pacote**

Run: `npx tsc -p tsconfig.json --noEmit 2>&1 | grep -E "ScheduleCalendar|scheduleBehavior" || echo "sem erros nesses arquivos"`
Expected: "sem erros nesses arquivos".

- [ ] **Step 7: Commit**

```bash
git add src/components/schedule/scheduleBehavior.ts src/components/schedule/__tests__/scheduleBehavior.test.ts src/components/schedule/ScheduleCalendar.tsx
git commit -m "feat(agenda): grade respeita display (hora atual/expediente/domingo)"
```

---

### Task 9: Conteúdo do card respeita `display` (balde C)

**Files:**
- Modify: `src/components/schedule/ScheduleEventContent.tsx`
- Modify: `src/components/schedule/ScheduleCalendar.tsx` (passar dados + display ao card)
- Test: `src/components/schedule/__tests__/ScheduleEventContent.test.tsx` (Create)

**Interfaces:**
- Consumes: `display` (Task 1) no `ScheduleCalendar`.
- Produces: `ScheduleEventContent` ganha props `durationLabel?: string`, `typeLabel?: string`, `phone?: string` e `show?: { duration: boolean; type: boolean; phone: boolean }`; renderiza cada um condicionalmente.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// src/components/schedule/__tests__/ScheduleEventContent.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScheduleEventContent } from "../ScheduleEventContent";

const base = {
  title: "Ana Júlia", timeText: "08:00 - 09:00", isAllDay: false,
  isGroup: false, isTask: false,
  colors: { background: "transparent", accent: "#2563eb", text: "inherit" },
  isSelected: false,
};

describe("ScheduleEventContent — conteúdo condicional", () => {
  it("mostra telefone quando show.phone e phone presentes", () => {
    render(<ScheduleEventContent {...base} phone="11999990000" show={{ duration: false, type: false, phone: true }} />);
    expect(screen.getByText(/11999990000/)).toBeInTheDocument();
  });
  it("oculta telefone quando show.phone=false", () => {
    render(<ScheduleEventContent {...base} phone="11999990000" show={{ duration: false, type: false, phone: false }} />);
    expect(screen.queryByText(/11999990000/)).toBeNull();
  });
  it("mostra duração quando show.duration", () => {
    render(<ScheduleEventContent {...base} durationLabel="50min" show={{ duration: true, type: false, phone: false }} />);
    expect(screen.getByText(/50min/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/schedule/__tests__/ScheduleEventContent.test.tsx`
Expected: FAIL (props não existem).

- [ ] **Step 3: Estender `ScheduleEventContent`**

Adicionar à interface de props:

```ts
durationLabel?: string;
typeLabel?: string;
phone?: string;
show?: { duration: boolean; type: boolean; phone: boolean };
```

Default seguro no destructuring: `show = { duration: true, type: true, phone: false }`.

Na linha de meta (a `div` com `mt-auto`), após o `<span>` do `metaLabel`, inserir:

```tsx
{show.duration && durationLabel && (
  <span className="shrink-0 opacity-80">· {durationLabel}</span>
)}
{show.type && typeLabel && (
  <span className="min-w-0 truncate opacity-80">· {typeLabel}</span>
)}
{show.phone && phone && (
  <span className="shrink-0 tabular-nums opacity-70">· {phone}</span>
)}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/components/schedule/__tests__/ScheduleEventContent.test.tsx`
Expected: PASS (3).

- [ ] **Step 5: Passar dados + display do `ScheduleCalendar`**

Em `renderEventContent` (linha 490), montar os campos a partir de `props.original` (defensivo — `RawAppointment` tem index signature). Adicionar no `extendedProps` do appointment (linha 288) os campos derivados, ou ler direto de `original`:

```tsx
const original = (arg.event.extendedProps as { original?: RawAppointment }).original;
const durationLabel = original?.duration ? `${original.duration}min` : undefined;
const typeLabel = (original?.appointment_type_name as string) || (original?.type as string) || undefined;
const phone = (original?.patient_phone as string) || (original?.phone as string) || undefined;
```

E no `<ScheduleEventContent>` de appointment, passar:

```tsx
durationLabel={durationLabel}
typeLabel={typeLabel}
phone={phone}
show={{ duration: display.showDuration, type: display.showType, phone: display.showPhone }}
```

> Verificação de campo (flag do spec): confirmar o nome real do campo de telefone/tipo no objeto do appointment (`patient_phone`/`appointment_type_name` são os palpites). Se ausentes, mapear no builder de eventos a partir da fonte de dados (`useSchedulePageData`). Não inventar UI se o dado não existir — telefone só aparece se houver valor.

- [ ] **Step 6: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit 2>&1 | grep -E "ScheduleEventContent|ScheduleCalendar" || echo "sem erros"`
Expected: "sem erros".

- [ ] **Step 7: Commit**

```bash
git add src/components/schedule/ScheduleEventContent.tsx src/components/schedule/ScheduleCalendar.tsx src/components/schedule/__tests__/ScheduleEventContent.test.tsx
git commit -m "feat(agenda): card mostra duração/tipo/telefone conforme display"
```

---

### Task 10: Preview reflete fonte/espaçamento/opacidade

**Files:**
- Modify: `src/components/schedule/settings/tabs/AparenciaTab.tsx`
- Test: `src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx` (Modify)

**Interfaces:**
- Consumes: `appearance.fontScale`, `appearance.paddingScale`, `appearance.opacity` na `ViewControls`.
- Produces: o preview aplica esses valores via `style`.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
it("preview aplica opacidade da visão ativa", () => {
  localStorage.setItem("agenda_appearance_v2", JSON.stringify({
    global: { cardSize: "medium", heightScale: 5, fontScale: 5, opacity: 100 },
    week: { opacity: 40 },
  }));
  renderTab();
  const preview = screen.getByTestId("aparencia-preview");
  expect(preview).toHaveStyle({ opacity: "0.4" });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx -t "preview aplica"`
Expected: FAIL (sem `data-testid` / sem opacidade).

- [ ] **Step 3: Implementar**

No container do preview em `ViewControls`, adicionar `data-testid="aparencia-preview"` e estilo derivado:

```tsx
<div
  data-testid="aparencia-preview"
  className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40"
  style={{ opacity: (appearance.opacity ?? 100) / 100 }}
>
```

E nos cards internos do preview, escalar fonte/padding com os valores da visão:

```tsx
style={{
  minHeight: preview.minHeight,
  fontSize: preview.fontSize * ((appearance.fontScale ?? 5) / 5),
  padding: `${2 * ((appearance.paddingScale ?? 5) / 5)}px 8px`,
}}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/settings/tabs/AparenciaTab.tsx src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx
git commit -m "feat(agenda): preview reflete fonte/espaçamento/opacidade"
```

---

### Task 11: Suite cheia, typecheck, docs e validação em produção

**Files:**
- Modify: `docs/AGENDA.md` (§8.3 e nova subseção §8.6)

- [ ] **Step 1: Rodar a suíte dos arquivos tocados (web)**

Run: `npx vitest run src/hooks/__tests__/useAgendaAppearanceDisplay.test.ts src/hooks/__tests__/useAgendaAppearancePersistence.test.ts src/components/schedule/settings/tabs/__tests__/AparenciaTab.test.tsx src/components/schedule/__tests__/scheduleBehavior.test.ts src/components/schedule/__tests__/ScheduleEventContent.test.tsx`
Expected: PASS (todos).

- [ ] **Step 2: Rodar a suíte do backend**

Run: `cd apps/api && npx vitest run src/__tests__/agendaAppearance.test.ts`
Expected: PASS.

- [ ] **Step 3: Typecheck completo**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: 0 erros.

- [ ] **Step 4: Atualizar `docs/AGENDA.md`**

Em §8.3 acrescentar uma frase: "Ajustes finos (fonte/espaçamento/opacidade) são por-visão; conteúdo do card e comportamento da grade são **globais** (bloco `display`)." Adicionar §8.6 "Aparência v2" descrevendo: presets, bloco `display` (defaults + retrocompat), o gap de CSS fechado (vars consumidas em `schedule.css`), e que o backend `AgendaAppearanceStateSchema` precisa listar `display` (senão o PUT descarta).

- [ ] **Step 5: Commit docs**

```bash
git add docs/AGENDA.md
git commit -m "docs(agenda): documenta Aparência v2 (presets + display)"
```

- [ ] **Step 6: Validação visual em produção (após deploy do merge)**

Com chrome-devtools em `https://www.moocafisio.com.br/agenda/settings?tab=aparencia` (logado):
1. Aplicar preset "Apresentação" → conferir cards maiores na agenda (Semana).
2. "Ajustes finos" → baixar Opacidade → conferir cards mais translúcidos na agenda.
3. "Mostrar telefone" ON → conferir telefone no card (se houver dado).
4. "Ocultar domingo" OFF → conferir coluna de domingo aparecendo.
5. "Destacar hora atual" OFF → conferir linha do horário some.
6. Restaurar a config original do usuário ao final (ler/escrever `agenda_appearance_v2` e PUT, como nas validações anteriores).
Expected: cada toggle reflete na visão correspondente; nada quebra.

---

## Notas de execução

- **Ordem:** 1→2→3 (modelo→persistência→backend) destravam C/D; 4→5→6→7 (UI) podem vir após 1–3; 8→9 (calendário) dependem de 1; 10 depende de 5; 11 fecha.
- **Risco maior:** Task 9 (campo de telefone/tipo pode não existir no objeto do evento) — tratar defensivamente; telefone só aparece com dado real.
- **Não** reintroduzir `applyToAllViews`-only nem condicionar hooks por visão (constraints globais).
