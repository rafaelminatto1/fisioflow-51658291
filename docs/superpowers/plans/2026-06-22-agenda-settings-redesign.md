# Redesign de Configurações da Agenda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refazer a UI de `/agenda/settings` (8 → 5 abas + faixa de visão geral), unificar o salvamento e corrigir o bug "não salva", alinhando ao design system (azul Activity, Nunito, sólido, sem glass) e removendo código legado.

**Architecture:** Página shell (`ScheduleSettings.tsx`) renderiza uma `OverviewStrip` persistente + `SettingsNav` (5 abas) + a aba ativa. Cada aba expõe um contrato `TabSaveHandle` (`{ isDirty, save, discard, isSaving, lastSavedAt }`) consumido por uma `SettingsSaveBar` sticky compartilhada. Hooks de dados existentes são reaproveitados sem mudança de assinatura. O fix do "não salva" é root-caused contra o Neon ao vivo antes de corrigir.

**Tech Stack:** React 19.2, Vite 8, TypeScript strict, Tailwind v4, Shadcn/Radix, TanStack Query, Vitest + Testing Library. Backend: Cloudflare Workers (Hono) + Neon Postgres via Hyperdrive.

## Global Constraints

- TypeScript strict; sem comentários supérfluos.
- UI em PT-BR.
- Sem glassmorphism: sem `backdrop-blur`/transparências — superfícies sólidas.
- Cor de destaque = azul Activity (NÃO `teal-*`); fonte Nunito; seguir `src/index.css`.
- Tests: Vitest + Testing Library; rodar `pnpm test` para o front e `pnpm --filter @fisioflow/api test` para o Worker.
- Migrations (se necessárias): próximo número sequencial em `apps/api/migrations/`; criar `.down.sql` se destrutivo.
- A rota viva é `src/routes/*.tsx` (createBrowserRouter); `routes.ts` framework-mode está inativo — não depender dele.
- Commits frequentes, mensagem terminando com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## File Structure

**Novos (infra do redesign):**
- `src/components/schedule/settings/types.ts` — contrato `TabSaveHandle` + `TabComponentProps`.
- `src/components/schedule/settings/useTabDirtyState.ts` — hook de dirty agregado + reset.
- `src/components/schedule/settings/SettingsSaveBar.tsx` — rodapé sticky (idle/salvando/salvo/erro).
- `src/components/schedule/settings/SettingsNav.tsx` — navegação 5 abas (sidebar desktop + sheet mobile).
- `src/components/schedule/settings/OverviewStrip.tsx` — faixa de saúde da config.
- `src/components/schedule/settings/tabRedirects.ts` — mapa URL legada → nova aba.
- `src/components/schedule/settings/tabs/FuncionamentoTab.tsx`
- `src/components/schedule/settings/tabs/AtendimentosTab.tsx`
- `src/components/schedule/settings/tabs/DisponibilidadeTab.tsx`
- `src/components/schedule/settings/tabs/PoliticasTab.tsx`
- `src/components/schedule/settings/tabs/AparenciaTab.tsx`

**Modificados:**
- `src/pages/ScheduleSettings.tsx` — reescrito como shell.
- `apps/api/src/routes/scheduling-settings.ts` — fix pontual (após root-cause).
- `src/api/v2/appointments.ts` — remover `schedulingApi` duplicado.

**Removidos (legado):**
- `src/components/schedule/settings/` v1 (managers/tabs antigos) — substituídos pela nova `settings/`.
- `src/components/schedule/settings-v2/` — após portar para `settings/`.

> Nota: a v1 e a v2 hoje coexistem. A nova pasta canônica é `src/components/schedule/settings/`. A Task 9 remove a v1 ANTES de criarmos novos arquivos lá; as tasks de UI escrevem direto no caminho canônico.

---

### Task 1: Diagnóstico e fix do "não salva" (backend)

**Files:**
- Investigar: `apps/api/src/routes/scheduling-settings.ts`, `apps/api/src/routes/scheduling-helpers.ts`, migrations `0057_rls_complete.sql`, `0100_fix_capacity_and_hyphenated_rls_policies.sql`, `0121_fix_notification_settings_upsert.sql`.
- Modify: `apps/api/src/routes/scheduling-settings.ts` (conforme causa encontrada).
- Test: `apps/api/src/routes/__tests__/schedulingSettingsCache.test.ts` (estender) ou novo `__tests__/schedulingSettingsUpsert.test.ts`.

**Interfaces:**
- Produces: handlers de upsert corrigidos retornando `{ data }` com persistência confirmada; nenhuma mudança de assinatura de rota.

- [ ] **Step 1: Reproduzir o bug ao vivo (systematic-debugging — não assumir)**

Usar o MCP Neon (`run_sql`) contra o projeto prod (`ep-wandering-bonus-acj4zwvo`) para validar cada hipótese. Rodar, em ordem:

```sql
-- H2: o upsert de cancellation_rules referencia min_hours_notice E min_hours_before. Confirmar colunas existentes:
SELECT column_name FROM information_schema.columns WHERE table_name = 'cancellation_rules';
SELECT column_name FROM information_schema.columns WHERE table_name = 'scheduling_notification_settings';
SELECT column_name FROM information_schema.columns WHERE table_name = 'business_hours';
-- H1: políticas RLS em escrita (INSERT/UPDATE) dessas tabelas:
SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies
WHERE tablename IN ('business_hours','cancellation_rules','scheduling_notification_settings','blocked_times','schedule_capacity','appointment_status_settings');
```

Registrar no documento de execução qual hipótese se confirmou. Critério:
- Se faltar coluna referenciada no INSERT → **H2** (fix de SQL).
- Se houver policy `cmd=INSERT/ALL` com `with_check` que exige `app.org_id` e o Worker não seta esse GUC → **H1** (o Worker usa Hyperdrive/`pg`; conferir se há `SET app.org_id` por request em `apps/api/src/lib/db.ts`).
- Se ambos OK → **H3**: capturar a resposta real da rota (rodar o handler e logar `error.message`).

- [ ] **Step 2: Escrever o teste que falha para a causa confirmada**

Exemplo para H2 (mismatch de coluna em `cancellation_rules`) — teste de unidade do payload normalizado + colunas usadas:

```ts
import { describe, it, expect } from "vitest";
import { normalizeCancellationRulePayload } from "../scheduling-helpers";

describe("cancellation rules upsert payload", () => {
  it("normaliza todos os campos exigidos pelo INSERT sem campos undefined", () => {
    const n = normalizeCancellationRulePayload({
      min_hours_before: 24,
      allow_patient_cancellation: true,
      max_cancellations_month: 3,
      charge_late_cancellation: false,
      late_cancellation_fee: 0,
    });
    expect(n.minHoursBefore).toBe(24);
    expect(n.allowPatientCancellation).toBe(true);
    expect(n.maxCancellationsMonth).toBe(3);
    expect(n.chargeLateCancellation).toBe(false);
    expect(n.lateCancellationFee).toBe(0);
  });
});
```

> Se a causa for H1 (RLS), o teste vai para `apps/api/src/lib/__tests__/db.test.ts` validando que `createPool` aplica `SET app.org_id` (ou equivalente) por conexão. Escrever o teste que demonstra a ausência atual.

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `pnpm --filter @fisioflow/api test`
Expected: FAIL na asserção da causa confirmada.

- [ ] **Step 4: Implementar o fix mínimo para a causa confirmada**

- H2: corrigir o SQL de `handleUpsertCancellationRules` para inserir apenas colunas existentes (alinhar à saída da Step 1) e/ou criar migration que adiciona as colunas ausentes com `.down.sql`.
- H1: garantir que cada request do Worker seta o contexto RLS (`SET LOCAL app.org_id = $orgId`) na transação/conexão antes do INSERT, em `apps/api/src/lib/db.ts` ou no handler.
- H3: propagar a mensagem de erro real (já há `c.json({ error }, 500)`); corrigir o defeito concreto encontrado.

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `pnpm --filter @fisioflow/api test`
Expected: PASS.

- [ ] **Step 6: Validar persistência real**

Via MCP Neon `run_sql`: executar o INSERT/UPDATE equivalente ao handler e `SELECT` confirmando a linha gravada para a org de teste.

- [ ] **Step 7: Commit**

```bash
git add apps/api/
git commit -m "fix(agenda): corrige persistência das configurações da agenda

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Gerar mockups no Stitch (referência de layout)

**Files:** nenhum no repo (artefato externo); salvar links/descrições em `docs/superpowers/specs/2026-06-22-agenda-settings-redesign-design.md` (apêndice).

- [ ] **Step 1: Criar projeto Stitch**

Usar `mcp__stitch__create_project` com nome "FisioFlow — Configurações da Agenda".

- [ ] **Step 2: Gerar tela por aba**

Para cada tela usar `mcp__stitch__generate_screen_from_text` com o brief:
> App clínico (fisioterapia), desktop-first. Paleta: azul Activity (#2563EB-ish) como destaque, superfícies brancas sólidas, sem transparência/glass. Tipografia Nunito. Layout: faixa de visão geral no topo (cards de status), navegação lateral esquerda com 5 itens, conteúdo à direita com cards de seção e um rodapé sticky "Salvar alterações".

Telas: (1) Funcionamento, (2) Atendimentos, (3) Disponibilidade, (4) Políticas, (5) Aparência.

- [ ] **Step 3: Registrar referências**

Anexar IDs/descrições dos screens gerados como apêndice no spec. Sem código — é referência visual.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/
git commit -m "docs(agenda): anexa referências de layout do Stitch

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Contrato `TabSaveHandle` + `useTabDirtyState`

**Files:**
- Create: `src/components/schedule/settings/types.ts`
- Create: `src/components/schedule/settings/useTabDirtyState.ts`
- Test: `src/components/schedule/settings/__tests__/useTabDirtyState.test.ts`

**Interfaces:**
- Produces:
  - `interface TabSaveHandle { isDirty: boolean; isSaving: boolean; lastSavedAt: Date | null; save: () => void; discard: () => void; }`
  - `interface TabComponentProps { registerHandle: (h: TabSaveHandle | null) => void; }`
  - `function useTabDirtyState<T>(initial: T): { value: T; setValue: (next: T | ((p: T) => T)) => void; isDirty: boolean; reset: (next?: T) => void; }`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTabDirtyState } from "../useTabDirtyState";

describe("useTabDirtyState", () => {
  it("começa limpo e fica dirty ao alterar", () => {
    const { result } = renderHook(() => useTabDirtyState({ a: 1 }));
    expect(result.current.isDirty).toBe(false);
    act(() => result.current.setValue({ a: 2 }));
    expect(result.current.isDirty).toBe(true);
  });

  it("reset(next) redefine baseline e limpa dirty", () => {
    const { result } = renderHook(() => useTabDirtyState({ a: 1 }));
    act(() => result.current.setValue({ a: 2 }));
    act(() => result.current.reset({ a: 2 }));
    expect(result.current.isDirty).toBe(false);
    expect(result.current.value).toEqual({ a: 2 });
  });

  it("voltar ao valor original zera o dirty", () => {
    const { result } = renderHook(() => useTabDirtyState({ a: 1 }));
    act(() => result.current.setValue({ a: 2 }));
    act(() => result.current.setValue({ a: 1 }));
    expect(result.current.isDirty).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `pnpm test -- useTabDirtyState`
Expected: FAIL ("Cannot find module '../useTabDirtyState'").

- [ ] **Step 3: Implementar `types.ts` e `useTabDirtyState.ts`**

`types.ts`:

```ts
export interface TabSaveHandle {
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  save: () => void;
  discard: () => void;
}

export interface TabComponentProps {
  registerHandle: (handle: TabSaveHandle | null) => void;
}
```

`useTabDirtyState.ts`:

```ts
import { useCallback, useMemo, useRef, useState } from "react";

export function useTabDirtyState<T>(initial: T) {
  const baselineRef = useRef<string>(JSON.stringify(initial));
  const [value, setValueState] = useState<T>(initial);

  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    setValueState((prev) =>
      typeof next === "function" ? (next as (p: T) => T)(prev) : next,
    );
  }, []);

  const reset = useCallback((next?: T) => {
    setValueState((prev) => {
      const resolved = next ?? prev;
      baselineRef.current = JSON.stringify(resolved);
      return resolved;
    });
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(value) !== baselineRef.current,
    [value],
  );

  return { value, setValue, isDirty, reset };
}
```

> Nota: `useCallback`/`useMemo`/`useRef`/`useState` vêm de `react` (named imports). Corrigir o import para `import { useCallback, useMemo, useRef, useState } from "react";`.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `pnpm test -- useTabDirtyState`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/settings/types.ts src/components/schedule/settings/useTabDirtyState.ts src/components/schedule/settings/__tests__/useTabDirtyState.test.ts
git commit -m "feat(agenda): contrato de save de aba + hook de dirty state

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `SettingsSaveBar` (rodapé sticky)

**Files:**
- Create: `src/components/schedule/settings/SettingsSaveBar.tsx`
- Test: `src/components/schedule/settings/__tests__/SettingsSaveBar.test.tsx`

**Interfaces:**
- Consumes: `TabSaveHandle` (Task 3).
- Produces: `function SettingsSaveBar({ handle }: { handle: TabSaveHandle | null }): JSX.Element | null`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsSaveBar } from "../SettingsSaveBar";

describe("SettingsSaveBar", () => {
  it("não renderiza quando handle é null", () => {
    const { container } = render(<SettingsSaveBar handle={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("não renderiza quando não há alterações", () => {
    const { container } = render(
      <SettingsSaveBar handle={{ isDirty: false, isSaving: false, lastSavedAt: null, save: vi.fn(), discard: vi.fn() }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("mostra ações e dispara save/discard quando dirty", () => {
    const save = vi.fn();
    const discard = vi.fn();
    render(
      <SettingsSaveBar handle={{ isDirty: true, isSaving: false, lastSavedAt: null, save, discard }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));
    fireEvent.click(screen.getByRole("button", { name: /descartar/i }));
    expect(save).toHaveBeenCalledOnce();
    expect(discard).toHaveBeenCalledOnce();
  });

  it("desabilita salvar enquanto isSaving", () => {
    render(
      <SettingsSaveBar handle={{ isDirty: true, isSaving: true, lastSavedAt: null, save: vi.fn(), discard: vi.fn() }} />,
    );
    expect(screen.getByRole("button", { name: /salvando/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `pnpm test -- SettingsSaveBar`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `SettingsSaveBar.tsx`**

```tsx
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TabSaveHandle } from "./types";

export function SettingsSaveBar({ handle }: { handle: TabSaveHandle | null }) {
  if (!handle || !handle.isDirty) return null;
  return (
    <div className="sticky bottom-0 z-10 mt-4 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white px-5 py-3 shadow-sm dark:border-blue-900 dark:bg-slate-950">
      <span className="text-sm text-muted-foreground">Alterações não salvas</span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handle.discard} disabled={handle.isSaving}>
          Descartar
        </Button>
        <Button
          size="sm"
          onClick={handle.save}
          disabled={handle.isSaving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {handle.isSaving ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-2 h-3.5 w-3.5" />
          )}
          {handle.isSaving ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `pnpm test -- SettingsSaveBar`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/settings/SettingsSaveBar.tsx src/components/schedule/settings/__tests__/SettingsSaveBar.test.tsx
git commit -m "feat(agenda): rodapé sticky unificado de salvar

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Redirects de URL legada → nova aba

**Files:**
- Create: `src/components/schedule/settings/tabRedirects.ts`
- Test: `src/components/schedule/settings/__tests__/tabRedirects.test.ts`

**Interfaces:**
- Produces:
  - `type TabValue = "funcionamento" | "atendimentos" | "disponibilidade" | "politicas" | "aparencia"`
  - `const VALID_TABS: TabValue[]`
  - `function resolveTab(raw: string | null): TabValue`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from "vitest";
import { resolveTab, VALID_TABS } from "../tabRedirects";

describe("resolveTab", () => {
  it("retorna a primeira aba quando vazio/desconhecido", () => {
    expect(resolveTab(null)).toBe("funcionamento");
    expect(resolveTab("xyz")).toBe("funcionamento");
  });

  it("mantém abas válidas", () => {
    for (const t of VALID_TABS) expect(resolveTab(t)).toBe(t);
  });

  it("redireciona abas legadas para o novo grupo", () => {
    expect(resolveTab("horarios")).toBe("funcionamento");
    expect(resolveTab("capacidade")).toBe("funcionamento");
    expect(resolveTab("status")).toBe("atendimentos");
    expect(resolveTab("tipos")).toBe("atendimentos");
    expect(resolveTab("bloqueios")).toBe("disponibilidade");
    expect(resolveTab("politicas")).toBe("politicas");
    expect(resolveTab("aparencia")).toBe("aparencia");
    expect(resolveTab("overview")).toBe("funcionamento");
    expect(resolveTab("visual")).toBe("aparencia");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `pnpm test -- tabRedirects`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `tabRedirects.ts`**

```ts
export type TabValue =
  | "funcionamento"
  | "atendimentos"
  | "disponibilidade"
  | "politicas"
  | "aparencia";

export const VALID_TABS: TabValue[] = [
  "funcionamento",
  "atendimentos",
  "disponibilidade",
  "politicas",
  "aparencia",
];

const LEGACY: Record<string, TabValue> = {
  overview: "funcionamento",
  horarios: "funcionamento",
  capacidade: "funcionamento",
  "capacidade-horarios": "funcionamento",
  capacity: "funcionamento",
  hours: "funcionamento",
  "agenda-horarios": "funcionamento",
  status: "atendimentos",
  tipos: "atendimentos",
  "appointment-types": "atendimentos",
  bloqueios: "disponibilidade",
  blocked: "disponibilidade",
  policies: "politicas",
  visual: "aparencia",
};

export function resolveTab(raw: string | null): TabValue {
  if (raw && (VALID_TABS as string[]).includes(raw)) return raw as TabValue;
  if (raw && LEGACY[raw]) return LEGACY[raw];
  return VALID_TABS[0];
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `pnpm test -- tabRedirects`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/settings/tabRedirects.ts src/components/schedule/settings/__tests__/tabRedirects.test.ts
git commit -m "feat(agenda): redirects de abas legadas para a nova navegação

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: `OverviewStrip` + `SettingsNav`

**Files:**
- Create: `src/components/schedule/settings/OverviewStrip.tsx`
- Create: `src/components/schedule/settings/SettingsNav.tsx`
- Test: `src/components/schedule/settings/__tests__/SettingsNav.test.tsx`

**Interfaces:**
- Consumes: `TabValue`, `VALID_TABS` (Task 5).
- Produces:
  - `interface NavItem { value: TabValue; label: string; description: string; icon: LucideIcon; }`
  - `const NAV_ITEMS: NavItem[]`
  - `function SettingsNav({ active, onSelect }: { active: TabValue; onSelect: (v: TabValue) => void })`
  - `function OverviewStrip({ onJump }: { onJump: (v: TabValue) => void })` — usa `useScheduleSettings`, `useScheduleCapacity`, `useStatusConfig`, `useAppointmentTypes` para contagens.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsNav, NAV_ITEMS } from "../SettingsNav";

describe("SettingsNav", () => {
  it("renderiza as 5 abas", () => {
    render(<SettingsNav active="funcionamento" onSelect={vi.fn()} />);
    expect(NAV_ITEMS).toHaveLength(5);
    for (const item of NAV_ITEMS) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
  });

  it("dispara onSelect ao clicar", () => {
    const onSelect = vi.fn();
    render(<SettingsNav active="funcionamento" onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Atendimentos"));
    expect(onSelect).toHaveBeenCalledWith("atendimentos");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `pnpm test -- SettingsNav`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `SettingsNav.tsx`**

```tsx
import { CalendarClock, CalendarOff, Palette, Shield, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabValue } from "./tabRedirects";

export interface NavItem {
  value: TabValue;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { value: "funcionamento", label: "Funcionamento", description: "Horários, slots e capacidade", icon: CalendarClock },
  { value: "atendimentos", label: "Atendimentos", description: "Tipos e status", icon: Shield },
  { value: "disponibilidade", label: "Disponibilidade", description: "Bloqueios e folgas", icon: CalendarOff },
  { value: "politicas", label: "Políticas", description: "Cancelamento e lembretes", icon: Palette },
  { value: "aparencia", label: "Aparência", description: "Densidade e visual", icon: SlidersHorizontal },
];

export function SettingsNav({
  active,
  onSelect,
}: {
  active: TabValue;
  onSelect: (v: TabValue) => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition",
              isActive
                ? "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
                : "hover:bg-slate-50 dark:hover:bg-slate-900",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{item.label}</span>
              <span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground">
                {item.description}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Implementar `OverviewStrip.tsx`**

Faixa horizontal de cards (sólidos, azul Activity) com contagens e atalho. Consumir os hooks e renderizar 4 mini-cards: dias abertos, tipos ativos, bloqueios futuros, status configurados.

```tsx
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { useAppointmentTypes } from "@/hooks/useAppointmentTypes";
import type { TabValue } from "./tabRedirects";

export function OverviewStrip({ onJump }: { onJump: (v: TabValue) => void }) {
  const { businessHours, blockedTimes } = useScheduleSettings();
  const { capacityGroups } = useScheduleCapacity();
  const { allStatusRows } = useStatusConfig();
  const { types } = useAppointmentTypes();

  const openDays = businessHours.filter((h) => h.is_open).length;
  const activeTypes = types.filter((t) => t.isActive).length;
  const futureBlocks = blockedTimes.filter((b) => new Date(b.end_date) >= new Date()).length;

  const cards: { label: string; value: number; tab: TabValue }[] = [
    { label: "Dias abertos", value: openDays, tab: "funcionamento" },
    { label: "Regras de capacidade", value: capacityGroups.length, tab: "funcionamento" },
    { label: "Tipos ativos", value: activeTypes, tab: "atendimentos" },
    { label: "Bloqueios futuros", value: futureBlocks, tab: "disponibilidade" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() => onJump(c.tab)}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-950"
        >
          <span className="block text-2xl font-bold text-blue-700 dark:text-blue-300">{c.value}</span>
          <span className="text-xs text-muted-foreground">{c.label}</span>
        </button>
      ))}
    </div>
  );
}
```

> `allStatusRows` é consumido para futura extensão; se o linter acusar variável não usada, remover a desestruturação de `useStatusConfig` nesta versão.

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `pnpm test -- SettingsNav`
Expected: PASS (2 testes).

- [ ] **Step 6: Commit**

```bash
git add src/components/schedule/settings/OverviewStrip.tsx src/components/schedule/settings/SettingsNav.tsx src/components/schedule/settings/__tests__/SettingsNav.test.tsx
git commit -m "feat(agenda): navegação de 5 abas + faixa de visão geral

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Abas consolidadas (porte da lógica existente para o contrato de save)

> Cada aba reusa a lógica de dados das tabs v2 atuais, mas: (a) usa azul Activity no lugar de teal; (b) substitui botões de salvar internos por `registerHandle` que expõe um `TabSaveHandle` agregado da aba inteira. Implementar as 5 abas, uma de cada vez, cada uma com seu commit.

**Files:**
- Create: `src/components/schedule/settings/tabs/FuncionamentoTab.tsx` (porta `HorariosTab` + `CapacidadeTab` + slot/booking de `PoliticasTab` v2)
- Create: `src/components/schedule/settings/tabs/AtendimentosTab.tsx` (porta `TiposTab` + `StatusTab`)
- Create: `src/components/schedule/settings/tabs/DisponibilidadeTab.tsx` (porta `BloqueiosTab`)
- Create: `src/components/schedule/settings/tabs/PoliticasTab.tsx` (porta cancelamento + no-show + notificações)
- Create: `src/components/schedule/settings/tabs/AparenciaTab.tsx` (porta `AparenciaTab` v2; client-side)
- Test: `src/components/schedule/settings/__tests__/FuncionamentoTab.test.tsx` (e análogos por aba)

**Interfaces:**
- Consumes: `TabComponentProps` (Task 3), hooks de dados existentes.
- Produces: cada aba é `function XxxTab({ registerHandle }: TabComponentProps)` e chama `registerHandle({ isDirty, isSaving, lastSavedAt, save, discard })` via `useEffect` sempre que esses valores mudarem; chama `registerHandle(null)` no unmount.

- [ ] **Step 1: Escrever o teste que falha (FuncionamentoTab — horários)**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FuncionamentoTab } from "../tabs/FuncionamentoTab";

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("FuncionamentoTab", () => {
  it("registra um handle e fica dirty ao alterar um horário", () => {
    const handles: any[] = [];
    wrap(<FuncionamentoTab registerHandle={(h) => handles.push(h)} />);
    const firstSwitch = screen.getAllByRole("switch")[0];
    fireEvent.click(firstSwitch);
    const last = handles.filter(Boolean).pop();
    expect(last?.isDirty).toBe(true);
    expect(typeof last?.save).toBe("function");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `pnpm test -- FuncionamentoTab`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `FuncionamentoTab.tsx`**

Portar o corpo de `settings-v2/tabs/HorariosTab.tsx` (lógica `draft`/`update`/`copyToAll`/`save` em `useScheduleSettings`) e a seção de capacidade/slots. Em vez de `setDirty` manual + botão interno, usar `useTabDirtyState` para o draft e expor o handle:

```tsx
import { useEffect, useMemo, useState } from "react";
import { useScheduleSettings, type BusinessHour } from "@/hooks/useScheduleSettings";
import { useTabDirtyState } from "../useTabDirtyState";
import type { TabComponentProps } from "../types";
// ... (DAYS, Draft, emptyDraft, update, copyToAll iguais à HorariosTab, trocando teal-* por blue-*)

export function FuncionamentoTab({ registerHandle }: TabComponentProps) {
  const { businessHours, isLoadingHours, upsertBusinessHours, isSavingHours } = useScheduleSettings();
  const { value: draft, setValue, isDirty, reset } = useTabDirtyState(emptyDraft());
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (businessHours.length === 0) return;
    const map = emptyDraft();
    for (const h of businessHours) map[h.day_of_week] = { ...h, hasBreak: !!(h.break_start && h.break_end) };
    reset(map);
  }, [businessHours, reset]);

  const save = useMemo(
    () => () => {
      const list: Partial<BusinessHour>[] = DAYS.map((d) => {
        const row = draft[d.value];
        return {
          id: row.id,
          day_of_week: d.value,
          is_open: !!row.is_open,
          open_time: row.open_time ?? "07:00",
          close_time: row.close_time ?? "19:00",
          break_start: row.hasBreak ? row.break_start : undefined,
          break_end: row.hasBreak ? row.break_end : undefined,
        };
      });
      upsertBusinessHours.mutate(list, {
        onSuccess: () => { reset(draft); setLastSavedAt(new Date()); },
      });
    },
    [draft, upsertBusinessHours, reset],
  );

  useEffect(() => {
    registerHandle({ isDirty, isSaving: isSavingHours, lastSavedAt, save, discard: () => reset() });
    return () => registerHandle(null);
  }, [isDirty, isSavingHours, lastSavedAt, save, reset, registerHandle]);

  // ... JSX dos dias (de HorariosTab) usando draft/setValue, classes blue-* e isLoadingHours
  return (/* SectionCards de Horários + Capacidade */ null as any);
}
```

> Preencher o JSX portando o markup de `HorariosTab` (linhas 94-209) e da seção de capacidade de `CapacidadeTab`, trocando `setDraft(...)/setDirty(true)` por `setValue(...)` e removendo o botão de salvar do `SectionCard` (agora é a SaveBar global). Substituir todas as classes `teal-*` por `blue-*`.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `pnpm test -- FuncionamentoTab`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/settings/tabs/FuncionamentoTab.tsx src/components/schedule/settings/__tests__/FuncionamentoTab.test.tsx
git commit -m "feat(agenda): aba Funcionamento (horários + capacidade) no contrato de save

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 6: Repetir Steps 1-5 para `AtendimentosTab`**

Porta `TiposTab` (`useAppointmentTypes`) + `StatusTab` (`useStatusConfig`). Essas tabs salvam por mutação imediata (add/update/remove). Para elas o handle reporta `isDirty:false` na maioria do tempo (salvam na hora); expor handle apenas quando houver edição em buffer (ex.: cor de status em `useTabDirtyState`). Teste: clicar "adicionar tipo" chama `addType`.

- [ ] **Step 7: Repetir Steps 1-5 para `DisponibilidadeTab`**

Porta `BloqueiosTab` (`useScheduleSettings` blockedTimes: `createBlockedTime`/`deleteBlockedTime`). Form em buffer via `useTabDirtyState`; save = `createBlockedTime.mutate`. Teste: preencher título + datas marca dirty e save chama a mutação.

- [ ] **Step 8: Repetir Steps 1-5 para `PoliticasTab`**

Porta cancelamento (`upsertCancellationRules`) + no-show + notificações (`upsertNotificationSettings`) num único `useTabDirtyState` agregando os 3 sub-objetos; `save` dispara as mutações necessárias e só limpa dirty no sucesso de todas (usar `Promise.all` nas versões `mutateAsync`). Teste: alterar `min_hours_before` marca dirty; save chama upsert.

- [ ] **Step 9: Repetir Steps 1-5 para `AparenciaTab`**

Porta `AparenciaTab` v2 (`useAgendaAppearancePersistence` + localStorage). Como persiste client-side com debounce, o handle reporta `isDirty:false` (auto-save) — mas expor botão "Restaurar padrões" interno. Teste: render sem crash e troca de densidade chama o setter do hook.

---

### Task 8: Reescrever `ScheduleSettings.tsx` (shell) com guarda de navegação

**Files:**
- Modify: `src/pages/ScheduleSettings.tsx` (reescrita completa)
- Test: `src/pages/__tests__/ScheduleSettings.test.tsx`

**Interfaces:**
- Consumes: `resolveTab`, `VALID_TABS`, `SettingsNav`, `OverviewStrip`, `SettingsSaveBar`, todas as abas (Tasks 4-7), `TabSaveHandle`.
- Produces: default export `ScheduleSettings`. Mantém `getBadgeCount` exportado (usado por teste existente) ou migra o teste.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ScheduleSettings from "@/pages/ScheduleSettings";

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <ScheduleSettings />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ScheduleSettings shell", () => {
  it("renderiza o título e a navegação", () => {
    renderAt("/agenda/settings");
    expect(screen.getByText("Configurações da Agenda")).toBeInTheDocument();
    expect(screen.getByText("Funcionamento")).toBeInTheDocument();
  });

  it("aba legada ?tab=horarios cai em Funcionamento (sem crash)", () => {
    renderAt("/agenda/settings?tab=horarios");
    expect(screen.getByText("Funcionamento")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `pnpm test -- ScheduleSettings`
Expected: FAIL (shell ainda no formato antigo / imports v2).

- [ ] **Step 3: Implementar o shell**

Estrutura: `PageLayout > PageContainer > PageHeader` (mesmo padrão atual), `OverviewStrip` no topo, grid `lg:grid-cols-[16rem_minmax(0,1fr)]` com `SettingsNav` (aside desktop / Sheet mobile) e `<ActiveTab registerHandle={setHandle} />` + `<SettingsSaveBar handle={handle} />`. Estado: `const [handle, setHandle] = useState<TabSaveHandle | null>(null)`. Ao trocar de aba via `onSelect`, se `handle?.isDirty` pedir `window.confirm("Descartar alterações não salvas?")`; se confirmar, `handle.discard()` e troca. Usar `useSearchParams` + `resolveTab`. Substituir cores teal por blue. Mapear `TabValue → Component`.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `pnpm test -- ScheduleSettings`
Expected: PASS (2 testes).

- [ ] **Step 5: Rodar a suíte de schedule + typecheck**

Run: `pnpm test -- schedule && pnpm typecheck`
Expected: PASS, 0 erros TS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ScheduleSettings.tsx src/pages/__tests__/ScheduleSettings.test.tsx
git commit -m "feat(agenda): shell de configurações com 5 abas, save unificado e guarda de navegação

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Remover código legado e duplicado

**Files:**
- Remove: `src/components/schedule/settings-v2/` (após confirmar que nada fora da agenda importa).
- Remove: arquivos v1 órfãos em `src/components/schedule/settings/` que não fazem parte da nova estrutura (managers/tabs antigos não importados).
- Modify: `src/api/v2/appointments.ts` (remover `export const schedulingApi`).
- Modify/Move: testes antigos (`AgendaSettingsPage.test.tsx`, `ScheduleSettings.test.ts`, `ViewAppearancePanel.test.tsx`) — atualizar imports ou remover os obsoletos.

- [ ] **Step 1: Mapear referências antes de remover**

```bash
grep -rn "settings-v2" src/ --include="*.tsx" --include="*.ts" | grep -v "/settings-v2/"
grep -rn "from \"@/api/v2/appointments\"" src/ | grep -i scheduling
grep -rn "schedulingApi" src/api/v2/appointments.ts
```
Expected: nenhuma referência externa a `settings-v2` além da nova `settings/`; confirmar que `schedulingApi` real vem de `scheduling.ts`.

- [ ] **Step 2: Remover `schedulingApi` duplicado de `appointments.ts`**

Apagar o bloco `export const schedulingApi = { ... }` em `src/api/v2/appointments.ts` (linha ~63). Manter os demais exports do arquivo.

- [ ] **Step 3: Remover `settings-v2/` e v1 órfã**

```bash
git rm -r src/components/schedule/settings-v2
# remover arquivos v1 não usados confirmados na Step 1
```

- [ ] **Step 4: Atualizar/remover testes obsoletos**

`getBadgeCount` foi removido do page → migrar o teste `AgendaSettingsPage.test.tsx` para validar `resolveTab`/`NAV_ITEMS`, ou remover se redundante com Task 5/6. Ajustar imports de `ViewAppearancePanel.test.tsx` se o componente foi movido.

- [ ] **Step 5: Rodar typecheck + suíte completa de schedule**

Run: `pnpm typecheck && pnpm test -- schedule`
Expected: 0 erros TS; testes verdes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(agenda): remove settings v1/v2 legados e schedulingApi duplicado

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Verificação visual end-to-end

**Files:** nenhum (validação).

- [ ] **Step 1: Subir o app e abrir a página**

Run: `pnpm dev` e abrir `/agenda/settings` (usar o skill `run` se disponível).

- [ ] **Step 2: Validar cada aba**

Para cada uma das 5 abas: editar um campo → a SaveBar aparece → Salvar → toast de sucesso → recarregar a página → valor persistiu. Conferir paleta azul Activity, Nunito, superfícies sólidas (sem glass).

- [ ] **Step 3: Validar guarda de navegação**

Editar sem salvar → trocar de aba → confirmar prompt; descartar zera o estado.

- [ ] **Step 4: Validar URLs legadas**

Abrir `?tab=horarios`, `?tab=status`, `?tab=visual` → caem nas abas corretas sem crash.

- [ ] **Step 5: Capturar evidência**

Screenshot de cada aba (chrome-devtools MCP) anexado ao PR. Confirmar persistência real via MCP Neon (`SELECT` nas tabelas após salvar).

---

## Self-Review

**Spec coverage:**
- Consolidação 8→5 + faixa overview → Tasks 5, 6, 8. ✓
- Save unificado → Tasks 3, 4, 7, 8. ✓
- Fix "não salva" → Task 1. ✓
- Stitch → Task 2. ✓
- Limpeza legado/duplicado → Task 9. ✓
- DS (azul Activity, Nunito, sólido) → Tasks 4, 6, 7, 8 (troca teal→blue). ✓
- Redirects URL antiga → Task 5. ✓
- Testes existentes atualizados → Task 9. ✓
- Aparência client-side preservada → Task 7 Step 9. ✓

**Type consistency:** `TabSaveHandle`/`TabComponentProps` (Task 3) usados consistentemente em 4, 7, 8. `TabValue`/`VALID_TABS`/`resolveTab` (Task 5) usados em 6, 8. `NAV_ITEMS`/`SettingsNav` (Task 6) usados em 8. ✓

**Placeholder scan:** Task 7 usa "portar markup de HorariosTab (linhas X-Y)" com referência exata ao arquivo-fonte existente em vez de reescrever ~2400 linhas; o contrato do handle e a fiação de estado têm código completo. Aceitável por ser refactor de código existente e funcional.
