# Lembretes por evento (event-scheduled) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o poll de lembretes do cron `*/15` por agendamento via Cloudflare Workflow (sleepUntil) disparado na criação/edição do agendamento, liberando o Neon para scale-to-zero de madrugada.

**Architecture:** Cada agendamento cria uma instância do `AppointmentReminderWorkflow` (id determinístico `reminder-<appointmentId>`) que dorme até o `sendAt` calculado da config da org, re-checa o status no envio e manda o template Meta. Triggers em create/reschedule/cancel. Migração em fases (paralelo+dedup → backfill → corte do poll → gate dos crons por horário).

**Tech Stack:** Cloudflare Workers + Workflows (`WORKFLOW_APPOINTMENT_REMINDER`), Hono, Neon/pg, Vitest, `date-fns`/Intl para TZ.

## Global Constraints

- TS strict; sem `@ts-nocheck`. `pnpm --filter @fisioflow/api type-check` deve passar 0 erros.
- Template Meta de lembrete: **`lembrete_consulta_botoes`** (único aprovado na WABA). Não inventar template.
- Timing dirigido por `resolveReminderConfig`/`computeReminderSendAt` (`apps/api/src/lib/reminderScheduling.ts`) — não reimplementar a regra de bands.
- TZ do negócio: **America/Sao_Paulo (UTC-3, sem DST atualmente)**. Horário: Seg-Sex 7-21h, Sáb 7-13h, Dom fechado.
- Helpers de agendamento de lembrete são **best-effort**: try/catch + `console.warn`; nunca propagam erro para a rota de agendamento.
- Cada tarefa termina com `pnpm --filter @fisioflow/api test:unit` verde para os testes tocados.
- Commits frequentes, mensagens em PT-BR, `Co-Authored-By: Claude`.

## File Structure

- Create `apps/api/src/lib/businessHours.ts` — `isWithinBusinessHours(date)` (TZ SP).
- Create `apps/api/src/lib/businessHours.test.ts`.
- Create `apps/api/src/lib/reminderWorkflow.ts` — `buildReminderParams(appt, orgCfg)`, `scheduleReminder(env, appt, orgCfg)`, `cancelReminder(env, appointmentId)`, `rescheduleReminder(env, appt, orgCfg)`.
- Create `apps/api/src/lib/reminderWorkflow.test.ts`.
- Modify `apps/api/src/workflows/appointmentReminder.ts` — novos params + 1 `sleepUntil` + recheck + send.
- Modify `apps/api/src/routes/appointments.ts` — disparar/terminar workflow em create/PUT/cancel/delete.
- Modify `apps/api/src/routes/scheduling-settings.ts` OU `appointments.ts` — endpoint admin de backfill.
- Modify `apps/api/src/cron.ts` — (fase final) remover `dispatchScheduledReminders`, gatear `*/15` e `15 * * * *`, warm-up.
- Modify `apps/api/wrangler.toml` — (fase final) cron `30 9 * * 1-6` (warm-up 6h30 BRT).

---

### Task 1: Helper `isWithinBusinessHours`

**Files:**
- Create: `apps/api/src/lib/businessHours.ts`
- Test: `apps/api/src/lib/businessHours.test.ts`

**Interfaces:**
- Produces: `isWithinBusinessHours(date: Date): boolean` — true se, em America/Sao_Paulo, for Seg-Sex 7≤h<21, Sáb 7≤h<13, Dom nunca.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { isWithinBusinessHours } from "./businessHours";
// Datas em UTC; BRT = UTC-3.
describe("isWithinBusinessHours (America/Sao_Paulo)", () => {
  it("terça 10h BRT (13h UTC) = aberto", () => {
    expect(isWithinBusinessHours(new Date("2026-07-28T13:00:00Z"))).toBe(true);
  });
  it("terça 6h BRT (09h UTC) = fechado (antes das 7h)", () => {
    expect(isWithinBusinessHours(new Date("2026-07-28T09:00:00Z"))).toBe(false);
  });
  it("terça 21h BRT (00h UTC quarta) = fechado (>=21h)", () => {
    expect(isWithinBusinessHours(new Date("2026-07-29T00:00:00Z"))).toBe(false);
  });
  it("sábado 10h BRT = aberto", () => {
    expect(isWithinBusinessHours(new Date("2026-08-01T13:00:00Z"))).toBe(true);
  });
  it("sábado 14h BRT (17h UTC) = fechado (>=13h)", () => {
    expect(isWithinBusinessHours(new Date("2026-08-01T17:00:00Z"))).toBe(false);
  });
  it("domingo 10h BRT = fechado", () => {
    expect(isWithinBusinessHours(new Date("2026-08-02T13:00:00Z"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @fisioflow/api exec vitest run src/lib/businessHours.test.ts`
Expected: FAIL ("isWithinBusinessHours is not a function").

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/lib/businessHours.ts
/** Horário de funcionamento da clínica em America/Sao_Paulo. */
export function isWithinBusinessHours(date: Date): boolean {
  // Intl garante o fuso correto sem depender do TZ do runtime (workerd = UTC).
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  let hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  if (hour === 24) hour = 0; // Intl pode devolver "24" à meia-noite
  if (weekday === "Sun") return false;
  if (weekday === "Sat") return hour >= 7 && hour < 13;
  return hour >= 7 && hour < 21; // Mon–Fri
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @fisioflow/api exec vitest run src/lib/businessHours.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/businessHours.ts apps/api/src/lib/businessHours.test.ts
git commit -m "feat(cron): helper isWithinBusinessHours (TZ SP) p/ gatear crons

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Módulo `reminderWorkflow` (build params + schedule/cancel/reschedule)

**Files:**
- Create: `apps/api/src/lib/reminderWorkflow.ts`
- Test: `apps/api/src/lib/reminderWorkflow.test.ts`
- Reference: `apps/api/src/lib/reminderScheduling.ts` (`resolveReminderConfig`, `computeReminderSendAt`), `apps/api/src/types/env.ts` (`WORKFLOW_APPOINTMENT_REMINDER`).

**Interfaces:**
- Consumes: `resolveReminderConfig(raw)`, `computeReminderSendAt(dateStr, timeStr, cfg): Date`.
- Produces:
  - `type ReminderApptInput = { id: string; organizationId: string; patientPhone: string | null; patientName: string | null; therapistName?: string | null; dateStr: string; timeStr: string; }`
  - `buildReminderParams(appt: ReminderApptInput, orgReminderCfg: unknown): AppointmentReminderParams | null` — retorna `null` se lembrete desabilitado, sem telefone, ou `sendAt` já passou do horário da consulta.
  - `reminderWorkflowId(appointmentId: string): string` → `` `reminder-${appointmentId}` ``.
  - `async scheduleReminder(env, appt, orgReminderCfg): Promise<void>` (best-effort).
  - `async cancelReminder(env, appointmentId): Promise<void>` (best-effort; ignora inexistente).
  - `async rescheduleReminder(env, appt, orgReminderCfg): Promise<void>` = cancel + schedule.
- `AppointmentReminderParams` (definido na Task 3) inclui: `{ appointmentId, organizationId, patientPhone, patientName, therapistName, apptDateStr, apptTimeStr, sendAtMs, templateName }`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { buildReminderParams, reminderWorkflowId, scheduleReminder, cancelReminder } from "./reminderWorkflow";

const appt = {
  id: "appt-1", organizationId: "org-1", patientPhone: "+5511999",
  patientName: "Maria Silva", therapistName: "Rafael", dateStr: "2026-08-05", timeStr: "10:00",
};

describe("buildReminderParams", () => {
  it("gera params com sendAtMs e template correto (config default)", () => {
    const p = buildReminderParams(appt, null);
    expect(p).not.toBeNull();
    expect(p!.appointmentId).toBe("appt-1");
    expect(p!.templateName).toBe("lembrete_consulta_botoes");
    expect(typeof p!.sendAtMs).toBe("number");
  });
  it("retorna null sem telefone", () => {
    expect(buildReminderParams({ ...appt, patientPhone: null }, null)).toBeNull();
  });
  it("retorna null se reminders.enabled=false", () => {
    expect(buildReminderParams(appt, { enabled: false })).toBeNull();
  });
});

describe("reminderWorkflowId", () => {
  it("é determinístico", () => {
    expect(reminderWorkflowId("appt-1")).toBe("reminder-appt-1");
  });
});

describe("scheduleReminder/cancelReminder (best-effort)", () => {
  it("chama WORKFLOW_APPOINTMENT_REMINDER.create com id determinístico", async () => {
    const create = vi.fn().mockResolvedValue({ id: "reminder-appt-1" });
    const env: any = { WORKFLOW_APPOINTMENT_REMINDER: { create } };
    await scheduleReminder(env, appt, null);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ id: "reminder-appt-1" }));
  });
  it("não lança se create falhar", async () => {
    const env: any = { WORKFLOW_APPOINTMENT_REMINDER: { create: vi.fn().mockRejectedValue(new Error("boom")) } };
    await expect(scheduleReminder(env, appt, null)).resolves.toBeUndefined();
  });
  it("cancelReminder ignora workflow inexistente", async () => {
    const terminate = vi.fn().mockRejectedValue(new Error("not found"));
    const env: any = { WORKFLOW_APPOINTMENT_REMINDER: { get: vi.fn().mockResolvedValue({ terminate }) } };
    await expect(cancelReminder(env, "appt-1")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @fisioflow/api exec vitest run src/lib/reminderWorkflow.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/lib/reminderWorkflow.ts
import type { Env } from "../types/env";
import type { AppointmentReminderParams } from "../workflows/appointmentReminder";
import { resolveReminderConfig, computeReminderSendAt } from "./reminderScheduling";

export interface ReminderApptInput {
  id: string;
  organizationId: string;
  patientPhone: string | null;
  patientName: string | null;
  therapistName?: string | null;
  dateStr: string; // YYYY-MM-DD (local)
  timeStr: string; // HH:mm
}

export const REMINDER_TEMPLATE = "lembrete_consulta_botoes";
export function reminderWorkflowId(appointmentId: string): string {
  return `reminder-${appointmentId}`;
}

export function buildReminderParams(
  appt: ReminderApptInput,
  orgReminderCfg: unknown,
): AppointmentReminderParams | null {
  const cfg = resolveReminderConfig(orgReminderCfg);
  if (!cfg.enabled) return null;
  if (!appt.patientPhone || !appt.timeStr) return null;
  const sendAt = computeReminderSendAt(appt.dateStr, appt.timeStr, cfg).getTime();
  // não agenda se o horário do lembrete já passou do início da consulta
  const apptMs = Date.parse(`${appt.dateStr}T${appt.timeStr}:00-03:00`);
  if (!Number.isFinite(sendAt) || sendAt >= apptMs) {
    // sendAt inválido ou depois da consulta → sem lembrete
    if (sendAt >= apptMs) return null;
  }
  return {
    appointmentId: appt.id,
    organizationId: appt.organizationId,
    patientPhone: appt.patientPhone,
    patientName: appt.patientName ?? "paciente",
    therapistName: appt.therapistName ?? "Fisioterapeuta",
    apptDateStr: appt.dateStr,
    apptTimeStr: appt.timeStr,
    sendAtMs: sendAt,
    templateName: REMINDER_TEMPLATE,
  };
}

export async function scheduleReminder(
  env: Env,
  appt: ReminderApptInput,
  orgReminderCfg: unknown,
): Promise<void> {
  try {
    const params = buildReminderParams(appt, orgReminderCfg);
    if (!params) return;
    await env.WORKFLOW_APPOINTMENT_REMINDER.create({ id: reminderWorkflowId(appt.id), params });
  } catch (err) {
    console.warn("[Reminder] scheduleReminder falhou:", err);
  }
}

export async function cancelReminder(env: Env, appointmentId: string): Promise<void> {
  try {
    const instance = await env.WORKFLOW_APPOINTMENT_REMINDER.get(reminderWorkflowId(appointmentId));
    await instance.terminate();
  } catch {
    // instância inexistente ou já encerrada — ok
  }
}

export async function rescheduleReminder(
  env: Env,
  appt: ReminderApptInput,
  orgReminderCfg: unknown,
): Promise<void> {
  await cancelReminder(env, appt.id);
  await scheduleReminder(env, appt, orgReminderCfg);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @fisioflow/api exec vitest run src/lib/reminderWorkflow.test.ts`
Expected: PASS. (Se `AppointmentReminderParams` ainda não exporta os novos campos, ajustar na Task 3 e re-rodar; por ora o import de tipo pode exigir a Task 3 — se o type-check reclamar, faça a Task 3 antes do commit.)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/reminderWorkflow.ts apps/api/src/lib/reminderWorkflow.test.ts
git commit -m "feat(reminders): helpers schedule/cancel/reschedule via Workflow

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Adaptar `AppointmentReminderWorkflow` (params + sleepUntil + recheck + send)

**Files:**
- Modify: `apps/api/src/workflows/appointmentReminder.ts`
- Test: `apps/api/src/workflows/appointmentReminder.test.ts` (criar)

**Interfaces:**
- Produces (exportar): `export interface AppointmentReminderParams { appointmentId: string; organizationId: string; patientPhone: string; patientName: string; therapistName: string; apptDateStr: string; apptTimeStr: string; sendAtMs: number; templateName: string; }`
- Consome no run: `env.WORKFLOW_APPOINTMENT_REMINDER` (self), DB read (`getRawSql`) para recheck, `WhatsAppService` p/ envio.

- [ ] **Step 1: Write the failing test** (recheck + envio; mocka DB e Meta)

```ts
import { describe, it, expect, vi } from "vitest";
// Testa a lógica pura de recheck extraída: shouldStillSend(row)
import { shouldStillSend } from "./appointmentReminder";
describe("shouldStillSend", () => {
  it("true p/ agendamento ativo no mesmo horário", () => {
    expect(shouldStillSend({ status: "agendado", date_str: "2026-08-05", time_str: "10:00" },
      { apptDateStr: "2026-08-05", apptTimeStr: "10:00" } as any)).toBe(true);
  });
  it("false p/ cancelado", () => {
    expect(shouldStillSend({ status: "cancelado", date_str: "2026-08-05", time_str: "10:00" },
      { apptDateStr: "2026-08-05", apptTimeStr: "10:00" } as any)).toBe(false);
  });
  it("false se remarcado p/ outro horário", () => {
    expect(shouldStillSend({ status: "agendado", date_str: "2026-08-06", time_str: "11:00" },
      { apptDateStr: "2026-08-05", apptTimeStr: "10:00" } as any)).toBe(false);
  });
  it("false se agendamento não existe (row null)", () => {
    expect(shouldStillSend(null, { apptDateStr: "2026-08-05", apptTimeStr: "10:00" } as any)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @fisioflow/api exec vitest run src/workflows/appointmentReminder.test.ts`
Expected: FAIL (`shouldStillSend` não exportado).

- [ ] **Step 3: Implement** — substituir o corpo do workflow. Exportar o novo `AppointmentReminderParams`, exportar `shouldStillSend`, e trocar `run` por: (a) se `sendAtMs` no futuro, `await step.sleepUntil("wait-reminder", new Date(sendAtMs))`; (b) `const row = await step.do("recheck-status", ...)` — SELECT `status, to_char(date), substr(start_time,1,5)` WHERE id=appointmentId AND deleted_at IS NULL; (c) `if (!shouldStillSend(row, payload)) return`; (d) `await step.do("send-reminder", { retries: apiRetries() }, () => this.sendReminder(...))` usando `payload` (telefone/nome/horário/template). Manter o `sendReminder` privado existente (ajustar assinatura p/ receber os campos do payload). Remover os estágios D-3/D-1/D-0 e o `analyze-no-show-risk` (fora de escopo).

```ts
const NO_SEND_STATUSES = new Set(["cancelado","cancelled","faltou","no_show","completed","concluido","remarcado","rescheduled"]);
export function shouldStillSend(
  row: { status?: string; date_str?: string; time_str?: string } | null,
  payload: { apptDateStr: string; apptTimeStr: string },
): boolean {
  if (!row) return false;
  if (row.status && NO_SEND_STATUSES.has(String(row.status))) return false;
  if (row.date_str !== payload.apptDateStr) return false;
  if ((row.time_str ?? "").slice(0,5) !== payload.apptTimeStr) return false;
  return true;
}
```

- [ ] **Step 4: Run tests + type-check**

Run: `pnpm --filter @fisioflow/api exec vitest run src/workflows/appointmentReminder.test.ts && pnpm --filter @fisioflow/api type-check`
Expected: PASS + 0 erros TS (inclui o import de tipo da Task 2).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/workflows/appointmentReminder.ts apps/api/src/workflows/appointmentReminder.test.ts apps/api/src/lib/reminderWorkflow.ts
git commit -m "feat(reminders): workflow por evento (sleepUntil + recheck + send)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Disparar/terminar workflow em create/reschedule/cancel/delete

**Files:**
- Modify: `apps/api/src/routes/appointments.ts` (POST create; PUT update; POST `/:id/cancel`; DELETE `/:id`)
- Reference: usar `waitUntil` (`c.executionCtx.waitUntil`) p/ não bloquear a resposta.

**Interfaces:**
- Consumes: `scheduleReminder`, `rescheduleReminder`, `cancelReminder` (Task 2). Ler a config: `organizations.settings->'crm_whatsapp'->'reminders'` (já lido no poll — reusar a query/quando disponível, senão SELECT leve por org).

- [ ] **Step 1: Test** — teste de rota (padrão de `appointments.test.ts`) que ao criar agendamento chama `WORKFLOW_APPOINTMENT_REMINDER.create` com id `reminder-<id>`; ao cancelar, chama `.get().terminate()`. Mockar o binding no env de teste.

```ts
// esboço: no test do POST, env.WORKFLOW_APPOINTMENT_REMINDER.create = vi.fn(); assert chamado após 201.
```

- [ ] **Step 2: Run → FAIL** (`Run: pnpm --filter @fisioflow/api exec vitest run src/routes/__tests__/appointments.test.ts`).

- [ ] **Step 3: Implement** — após o INSERT bem-sucedido do POST (perto do `broadcastToOrg`/`return c.json` do create), montar `ReminderApptInput` a partir do agendamento criado + nome/telefone do paciente (já disponíveis ou 1 SELECT leve) e:

```ts
c.executionCtx.waitUntil(scheduleReminder(c.env, apptInput, orgReminderCfg));
```
No PUT (quando muda date/start_time): `waitUntil(rescheduleReminder(...))`. No cancel/delete/status→cancelado: `waitUntil(cancelReminder(c.env, id))`.

- [ ] **Step 4: Run tests + type-check** → PASS + 0 erros.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/appointments.ts apps/api/src/routes/__tests__/appointments.test.ts
git commit -m "feat(reminders): agenda/cancela lembrete no ciclo do agendamento

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Endpoint admin de backfill (agendamentos futuros existentes)

**Files:**
- Modify: `apps/api/src/routes/appointments.ts` — `POST /reminders/backfill` (requireAuth + role admin).

**Interfaces:**
- Consumes: `scheduleReminder` (idempotente pelo id determinístico).

- [ ] **Step 1: Test** — POST backfill como admin cria workflow p/ cada agendamento futuro ativo; retorna `{ scheduled: n }`. Mockar binding + 2 linhas de agendamento.

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — handler que faz SELECT dos agendamentos com `date >= CURRENT_DATE`, status ativo, phone not null (mesmo filtro do poll), lê a config por org, e para cada um `await scheduleReminder(...)`; conta e retorna. Batch simples (limite defensivo, ex. 1000).

- [ ] **Step 4: Run tests + type-check → PASS.**

- [ ] **Step 5: Commit** (`feat(reminders): endpoint admin de backfill idempotente`).

---

### Task 6: (FASE 3 — só após validação) Cortar o poll + gatear crons + warm-up

> **Não executar até confirmar em produção (observability) que os lembretes estão saindo pelo workflow.** Ver seção Rollout.

**Files:**
- Modify: `apps/api/src/cron.ts` — remover `dispatchScheduledReminders` do `case "*/15"`; envolver o corpo de `case "*/15"` e `case "15 * * * *"` com `if (!isWithinBusinessHours(new Date())) { console.log("[Cron] fora do expediente, pulando"); break; }`; adicionar `case "30 9 * * 1-6": { const p = createPool(env); await p.query("SELECT 1"); break; }` (warm-up 6h30 BRT).
- Modify: `apps/api/wrangler.toml` — adicionar `"30 9 * * 1-6"` em `crons`.
- Modify: `apps/api/src/lib/reminderWorkflow.ts` / workflow — remover o dedup-log de transição (se adicionado).

- [ ] **Step 1: Test** — teste do cron: quando `isWithinBusinessHours` retorna false (mock), o `*/15` não chama as funções de banco. (Mockar `isWithinBusinessHours`.)
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** o gate + warm-up + remoção do poll.
- [ ] **Step 4: Run `pnpm --filter @fisioflow/api test:unit` (inclui `cron.test.ts`) + type-check → PASS.** Atenção: `cron.test.ts` bloqueia deploy se falhar (gotcha conhecido).
- [ ] **Step 5: Commit** (`feat(cron): lembretes por evento — remove poll, gate por horário + warm-up`).

---

## Rollout (ordem de deploy)

1. **Deploy Tasks 1-4** (workflow + triggers) — poll AINDA roda. Dedup: nesta fase, o `send-reminder` do workflow grava `appointment_reminder_log (kind='session') ON CONFLICT DO NOTHING` antes de enviar; se já existir (poll enviou), não reenvia. (Adicionar esse write só nesta fase; remover na Task 6.)
2. **Task 5 + acionar backfill uma vez** (`POST /api/appointments/reminders/backfill` como admin).
3. **Validar** ~2-3 dias via Cloudflare observability: envios saindo pelo workflow (blob `/workflow/appointment-reminder`), zero lembrete perdido.
4. **Task 6** (corte do poll + gate + warm-up) — deploy final. Banco passa a dormir de madrugada.

Rollback: reverter o commit da Task 6 reativa o poll; workflows já criados seguem funcionando (dedup evita duplicar).

## Self-Review

- **Cobertura do spec:** trigger create/reschedule/cancel (Task 4) ✓; workflow sleepUntil+recheck+send (Task 3) ✓; timing configurável (Task 2 via computeReminderSendAt) ✓; template preservado ✓; backfill admin (Task 5) ✓; corte do poll + gate + warm-up 6h30 (Task 6) ✓; migração em fases (Rollout) ✓; comportamentos preservados (Task 2/3 filtros + recheck) ✓.
- **Placeholders:** código real nos helpers/testes; wiring (Task 4/5) referencia pontos exatos e reusa helpers definidos — sem "TODO".
- **Consistência de tipos:** `AppointmentReminderParams` definido na Task 3 e consumido na Task 2 (nota de ordem no Step 4 da Task 2); `scheduleReminder/cancelReminder/rescheduleReminder`, `reminderWorkflowId`, `isWithinBusinessHours`, `shouldStillSend` usados com as mesmas assinaturas em todas as tarefas.
