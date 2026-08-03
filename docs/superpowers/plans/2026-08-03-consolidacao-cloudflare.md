# Consolidação de Fornecedores na Cloudflare — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover Resend, Axiom, Grafana OTLP, os restos do Inngest e o quickchart.io do FisioFlow, movendo cada função para recursos já inclusos no plano Cloudflare Workers Paid.

**Architecture:** Cada fornecedor sai por trás de uma fachada interna já existente (`lib/axiom.ts`, `lib/inngest-client.ts`, `lib/email.ts`). O corpo das fachadas muda; as assinaturas não. Os 21 call sites de log e os 8 de evento de fundo permanecem intocados. O e-mail ganha uma camada de transporte nova porque hoje a fachada vaza — 4 arquivos chamam `resend.emails.send()` direto.

**Tech Stack:** Cloudflare Workers (Hono), TypeScript strict, Vitest (`@cloudflare/vitest-pool-workers`), wrangler.

**Spec:** `docs/superpowers/specs/2026-08-03-consolidacao-cloudflare-design.md`

## Global Constraints

- TypeScript strict; sem comentários supérfluos (CLAUDE.md)
- Testes rodam com `pnpm --dir apps/api exec vitest run <caminho>`; `testTimeout` já é 15s
- Testes ficam em `src/**/__tests__/*.test.ts`, projeto `node` do Vitest
- Mensagens de commit em PT-BR, formato `tipo(escopo): descrição`
- Nunca usar `git add -a` / `-A`: adicionar arquivos explicitamente (Rafael edita em paralelo na main)
- Toda alteração em `wrangler.toml` deve ser replicada nos três blocos: raiz, `[env.production]` e `[env.staging]`
- Deploy em produção é automático no push para `main` — não rodar deploy manual

## File Structure

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `apps/api/src/lib/backgroundEvents.ts` | Publicar evento de domínio na `BACKGROUND_QUEUE` | Renomeado de `inngest-client.ts` |
| `apps/api/src/lib/logger.ts` | Redigir PII e emitir log estruturado para Workers Logs | Renomeado de `axiom.ts` |
| `apps/api/src/lib/__tests__/logger.test.ts` | Cobrir `redactPII` e `logEvent` | Criar |
| `apps/api/src/lib/email/types.ts` | `EmailMessage`, tipo de retorno de transporte | Criar |
| `apps/api/src/lib/email/transports.ts` | `sendViaResend`, `sendViaCloudflare` | Criar |
| `apps/api/src/lib/email/dispatch.ts` | Escolher transporte conforme `EMAIL_TRANSPORT` | Criar |
| `apps/api/src/lib/email/__tests__/dispatch.test.ts` | Cobrir os 3 modos e a falha da sombra | Criar |
| `apps/api/src/lib/email.ts` | 6 funções `send*` de alto nível | Modificar |
| `apps/api/src/routes/reports.ts` | Relatórios | Remover rota `/chart` |

---

### Task 1: Remover Grafana e renomear o cliente Inngest

`triggerInngestEvent()` já publica na `BACKGROUND_QUEUE` — não há chamada ao Inngest no corpo. `GRAFANA_OTLP_TOKEN` não tem nenhuma referência no código. Esta task é renomeação e limpeza, sem mudança de comportamento.

**Files:**
- Create: `apps/api/src/lib/backgroundEvents.ts`
- Delete: `apps/api/src/lib/inngest-client.ts`
- Modify: `apps/api/src/routes/appointments.ts` (linhas 27, 372, 711, 725)
- Modify: `apps/api/src/cron.ts` (linhas 3, 391, 416)
- Modify: `apps/api/src/routes/exercisePlans.ts` (linhas 7, 87, 110)
- Modify: `apps/api/src/routes/patients.ts` (linhas 11, 1376)
- Modify: `apps/api/src/types/env.ts` (linha 161)

**Interfaces:**
- Consumes: nada
- Produces: `triggerBackgroundEvent(env: Env, ctx: ExecutionContext, eventName: string, data: Record<string, any>, user?: { id?: string; email?: string }, options?: { delaySeconds?: number }): Promise<void>`

- [ ] **Step 1: Confirmar que o Grafana é secret morto**

Run: `grep -ri "grafana\|otlp" apps/api/src --include=*.ts`
Expected: nenhuma saída. Se houver saída, PARE e reporte — o spec assume zero referências.

- [ ] **Step 2: Criar o novo módulo com o corpo idêntico**

Create `apps/api/src/lib/backgroundEvents.ts`:

```typescript
import type { Env } from "../types/env";

export async function triggerBackgroundEvent(
  env: Env,
  ctx: ExecutionContext,
  eventName: string,
  data: Record<string, any>,
  user?: { id?: string; email?: string },
  options?: { delaySeconds?: number },
) {
  if (!env.BACKGROUND_QUEUE) {
    console.warn("[Queue] BACKGROUND_QUEUE not bound. Skipping event:", eventName);
    return;
  }

  const payload = {
    type: eventName,
    data,
    user: user || {},
    timestamp: Date.now(),
  };

  ctx.waitUntil(
    env.BACKGROUND_QUEUE.send(payload, options).catch((err: Error) => {
      console.error("[Queue] Failed to send event:", eventName, err);
    }),
  );
}
```

- [ ] **Step 3: Atualizar os 8 call sites e os imports**

Run:
```bash
cd apps/api
grep -rl "inngest-client\|triggerInngestEvent" src --include=*.ts \
  | xargs sed -i 's|lib/inngest-client|lib/backgroundEvents|g; s|"./lib/inngest-client"|"./lib/backgroundEvents"|g; s|triggerInngestEvent|triggerBackgroundEvent|g'
rm src/lib/inngest-client.ts
```

- [ ] **Step 4: Remover o tipo morto do Env**

Em `apps/api/src/types/env.ts`, apagar a linha 161:

```typescript
  INNGEST_SIGNING_KEY?: string;
```

(`INNGEST_EVENT_KEY` não existe em `env.ts` — está apenas nos secrets do Worker, tratado no Step 7.)

- [ ] **Step 5: Verificar que não sobrou referência**

Run: `grep -ri "inngest" apps/api/src --include=*.ts`
Expected: apenas o comentário histórico em `src/queue.ts:1076`, que descreve a portabilidade e deve permanecer.

- [ ] **Step 6: Rodar a suíte e o typecheck**

Run: `pnpm --dir apps/api exec vitest run && pnpm --dir apps/api exec tsc --noEmit`
Expected: PASS, 0 erros de tipo.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/lib/backgroundEvents.ts apps/api/src/routes/appointments.ts \
  apps/api/src/cron.ts apps/api/src/routes/exercisePlans.ts \
  apps/api/src/routes/patients.ts apps/api/src/types/env.ts
git add -u apps/api/src/lib/inngest-client.ts
git commit -m "refactor(queue): renomeia triggerInngestEvent para triggerBackgroundEvent

O corpo já publicava na BACKGROUND_QUEUE desde a portabilidade de Jun/2026;
só o nome sobreviveu. Remove também o tipo INNGEST_SIGNING_KEY."
```

- [ ] **Step 8: Apagar os secrets mortos**

Run:
```bash
cd apps/api
for s in GRAFANA_OTLP_TOKEN INNGEST_EVENT_KEY INNGEST_SIGNING_KEY; do
  npx wrangler secret delete "$s" --env production
done
```
Expected: confirmação de remoção para cada um. Um "not found" é aceitável e significa que já não existia.

---

### Task 2: Axiom → Workers Logs

`logToAxiom` já cai em `console.log` quando não há token. Esta task inverte qual caminho é o principal e cobre `redactPII` com teste — ele passa a ser a única barreira entre dado de paciente e log persistido na conta.

**Files:**
- Create: `apps/api/src/lib/logger.ts`
- Create: `apps/api/src/lib/__tests__/logger.test.ts`
- Delete: `apps/api/src/lib/axiom.ts`
- Modify: `apps/api/src/index.ts`, `apps/api/src/middleware/errorHandler.ts`, `apps/api/src/routes/whatsapp-inbox.ts`, `apps/api/src/routes/ai/ai-audio.ts`, `apps/api/src/routes/ai/ai-chat.ts`, `apps/api/src/routes/ai/ai-clinical.ts`, `apps/api/src/queues/whatsapp-dlq.ts`
- Modify: `apps/api/src/routes/__tests__/aiFallback.test.ts:40`, `apps/api/src/routes/__tests__/ai.test.ts:46`
- Modify: `apps/api/src/types/env.ts` (linhas 309-311)
- Modify: `apps/api/wrangler.toml`

**Interfaces:**
- Consumes: nada
- Produces:
  - `redactPII(data: any): any`
  - `logEvent(env: Env, ctx: ExecutionContext, data: LogEvent): Promise<void>`
  - `interface LogEvent { level: "info" | "warn" | "error" | "debug"; message: string; [key: string]: any }`

- [ ] **Step 1: Escrever o teste que falha**

Create `apps/api/src/lib/__tests__/logger.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { redactPII, logEvent } from "../logger";
import type { Env } from "../../types/env";

describe("redactPII", () => {
  it("redige campos sensíveis no primeiro nível", () => {
    const result = redactPII({ cpf: "12345678900", level: "info" });
    expect(result.cpf).toBe("[REDACTED]");
    expect(result.level).toBe("info");
  });

  it("redige campos sensíveis aninhados", () => {
    const result = redactPII({
      context: { patientName: "Maria Silva", patientId: "abc-123", sessionId: "s-1" },
    });
    expect(result.context.patientName).toBe("[REDACTED]");
    expect(result.context.patientId).toBe("[REDACTED]");
    expect(result.context.sessionId).toBe("s-1");
  });

  it("redige dentro de arrays", () => {
    const result = redactPII([{ phone: "11999998888" }, { phone: "11999997777" }]);
    expect(result[0].phone).toBe("[REDACTED]");
    expect(result[1].phone).toBe("[REDACTED]");
  });

  it("não muta o objeto original", () => {
    const original = { cpf: "12345678900" };
    redactPII(original);
    expect(original.cpf).toBe("12345678900");
  });

  it("preserva valores não-objeto", () => {
    expect(redactPII("texto")).toBe("texto");
    expect(redactPII(null)).toBe(null);
  });
});

describe("logEvent", () => {
  const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext;
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it("emite JSON estruturado com nível, mensagem e ambiente", async () => {
    const env = { ENVIRONMENT: "production" } as Env;
    await logEvent(env, ctx, { level: "error", message: "falhou", route: "/api/x" });

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.level).toBe("error");
    expect(payload.message).toBe("falhou");
    expect(payload.environment).toBe("production");
    expect(payload.route).toBe("/api/x");
    expect(typeof payload._time).toBe("string");
  });

  it("redige PII antes de emitir", async () => {
    const env = { ENVIRONMENT: "production" } as Env;
    await logEvent(env, ctx, { level: "info", message: "ok", cpf: "12345678900" });

    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.cpf).toBe("[REDACTED]");
  });

  it("não faz chamada de rede", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const env = { ENVIRONMENT: "staging" } as Env;
    await logEvent(env, ctx, { level: "info", message: "ok" });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `pnpm --dir apps/api exec vitest run src/lib/__tests__/logger.test.ts`
Expected: FAIL — `Failed to resolve import "../logger"`.

- [ ] **Step 3: Criar `logger.ts`**

Create `apps/api/src/lib/logger.ts`:

```typescript
import type { Env } from "../types/env";

export interface LogEvent {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  [key: string]: any;
}

export function redactPII(data: any): any {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(redactPII);

  const sensitiveKeys = [
    "cpf",
    "phone",
    "email",
    "patientName",
    "fullName",
    "patientId",
    "name",
    "password",
  ];
  const redacted = { ...data };

  for (const key in redacted) {
    if (sensitiveKeys.includes(key) && redacted[key]) {
      redacted[key] = "[REDACTED]";
    } else if (typeof redacted[key] === "object") {
      redacted[key] = redactPII(redacted[key]);
    }
  }
  return redacted;
}

export async function logEvent(env: Env, _ctx: ExecutionContext, data: LogEvent) {
  console.log(
    JSON.stringify({
      _time: new Date().toISOString(),
      environment: env.ENVIRONMENT || "production",
      ...redactPII(data),
    }),
  );
}
```

O parâmetro `_ctx` é mantido para preservar a assinatura dos 21 call sites; não há mais trabalho de fundo a agendar.

- [ ] **Step 4: Rodar o teste para confirmar que passa**

Run: `pnpm --dir apps/api exec vitest run src/lib/__tests__/logger.test.ts`
Expected: PASS, 9 testes.

- [ ] **Step 5: Migrar os call sites**

Run:
```bash
cd apps/api
grep -rl "lib/axiom\|logToAxiom" src --include=*.ts \
  | xargs sed -i 's|lib/axiom|lib/logger|g; s|/axiom"|/logger"|g; s|logToAxiom|logEvent|g'
rm src/lib/axiom.ts
```

Isto cobre também os dois arquivos de teste que fazem `vi.mock("../../lib/axiom", ...)`.

- [ ] **Step 6: Remover as vars do Axiom do Env e do wrangler**

Em `apps/api/src/types/env.ts`, apagar as linhas 309-311:

```typescript
  AXIOM_TOKEN?: string;
  AXIOM_ORG_ID?: string;
  AXIOM_DATASET?: string;
```

Em `apps/api/wrangler.toml`, remover `AXIOM_ORG_ID` e `AXIOM_DATASET` dos três blocos `[vars]`, `[env.production.vars]` e `[env.staging.vars]`.

- [ ] **Step 7: Corrigir a amostragem (evita regressão silenciosa)**

Em `apps/api/wrangler.toml`, alterar `head_sampling_rate` de `0.1` para `1` **apenas** nos blocos de logs, mantendo os de traces em `0.05`. São três ocorrências:

```toml
[observability.logs]
head_sampling_rate = 1

[env.production.observability.logs]
head_sampling_rate = 1

[env.staging.observability.logs]
head_sampling_rate = 1
```

Sem isto, 90% dos eventos que hoje chegam íntegros ao Axiom seriam descartados.

- [ ] **Step 8: Rodar a suíte completa e o typecheck**

Run: `pnpm --dir apps/api exec vitest run && pnpm --dir apps/api exec tsc --noEmit`
Expected: PASS, 0 erros de tipo.

- [ ] **Step 9: Verificar que o Axiom sumiu**

Run: `grep -ri "axiom" apps/api/src apps/api/wrangler.toml`
Expected: nenhuma saída.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/lib/logger.ts apps/api/src/lib/__tests__/logger.test.ts \
  apps/api/src/types/env.ts apps/api/wrangler.toml
git add -u apps/api/src/
git commit -m "refactor(observabilidade): troca Axiom por Workers Logs

logToAxiom vira logEvent e emite JSON estruturado em vez de POST externo.
Sobe head_sampling_rate de logs para 1: o Axiom recebia 100% dos eventos
via fetch explícito e a amostragem de 0.1 descartaria 90% deles.
Cobre redactPII com teste — passa a ser a única barreira de PII no log."
```

- [ ] **Step 11: Apagar o secret do Axiom**

Run: `cd apps/api && npx wrangler secret delete AXIOM_TOKEN --env production`

- [ ] **Step 12: Confirmar em produção após o deploy automático**

Aguarde o deploy do push. Depois, no MCP de observabilidade, consulte os logs do Worker `fisioflow-api` e confirme que aparecem eventos com os campos `level`, `message` e `environment`, e que campos sensíveis constam como `[REDACTED]`.

---

### Task 3: Logpush → R2

Workers Logs retém 7 dias. Este job dá histórico longo dentro da própria conta.

**Files:**
- Modify: `apps/api/wrangler.toml`

**Interfaces:**
- Consumes: `logEvent` da Task 2 (os logs que serão despejados)
- Produces: nada consumido por código

- [ ] **Step 1: Habilitar logpush no Worker**

Em `apps/api/wrangler.toml`, adicionar `logpush = true` no nível raiz (junto de `workers_dev = true`) e dentro de `[env.production]`:

```toml
logpush = true
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/wrangler.toml
git commit -m "chore(observabilidade): habilita logpush no Worker de produção"
```

- [ ] **Step 3: Criar o job de Logpush**

Após o deploy, criar o job. Requer `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY` (já existem como secrets; use os valores do dashboard R2). Substitua os placeholders entre `<>` pelos valores reais:

```bash
curl "https://api.cloudflare.com/client/v4/accounts/32156f9a72a32d1ece28ab74bcd398fb/logpush/jobs" \
  --request POST \
  --header "Authorization: Bearer <CLOUDFLARE_API_TOKEN>" \
  --json '{
    "name": "fisioflow-workers-logs",
    "dataset": "workers_trace_events",
    "output_options": {
      "field_names": ["Event","EventTimestampMs","Outcome","Exceptions","Logs","ScriptName"],
      "timestamp_format": "rfc3339"
    },
    "destination_conf": "r2://fisioflow-db-backups/logs/{DATE}?account-id=32156f9a72a32d1ece28ab74bcd398fb&access-key-id=<R2_ACCESS_KEY_ID>&secret-access-key=<R2_SECRET_ACCESS_KEY>",
    "enabled": true
  }'
```

Expected: `"success": true` com um `id` numérico.

- [ ] **Step 4: Verificar a entrega**

Aguarde ~10 minutos de tráfego, depois:

Run: `cd apps/api && npx wrangler r2 object list fisioflow-db-backups --prefix logs/`
Expected: ao menos um objeto sob `logs/<data>/`.

Se nada aparecer após 30 minutos, verifique o job com `GET /accounts/.../logpush/jobs/<id>` e leia o campo `last_error`.

---

### Task 4: Isolar o transporte de e-mail (sem trocar de fornecedor)

Refatoração pura: introduz a camada de transporte com o Resend como único caminho, e fecha o vazamento da fachada — 4 arquivos chamam `resend.emails.send()` direto hoje. Comportamento idêntico ao final desta task.

**Files:**
- Create: `apps/api/src/lib/email/types.ts`
- Create: `apps/api/src/lib/email/transports.ts`
- Create: `apps/api/src/lib/email/dispatch.ts`
- Create: `apps/api/src/lib/email/__tests__/dispatch.test.ts`
- Modify: `apps/api/src/lib/email.ts`
- Modify: `apps/api/src/routes/briefing.ts:40-49`
- Modify: `apps/api/src/routes/webhooks.ts:178-...`
- Modify: `apps/api/src/lib/automation/actionHandlers.ts:20-28`
- Modify: `apps/api/src/lib/briefing/sendBriefing.ts:20-28`
- Modify: `apps/api/src/types/env.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `interface EmailMessage { to: string; subject: string; html: string }`
  - `sendEmail(env: Env, message: EmailMessage): Promise<boolean>` — `false` quando nenhum transporte está configurado
  - `resolveFrom(env: Env): string`

- [ ] **Step 1: Escrever o teste que falha**

Create `apps/api/src/lib/email/__tests__/dispatch.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail } from "../dispatch";
import type { Env } from "../../../types/env";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => send(...args) };
  },
}));

const message = { to: "paciente@example.com", subject: "Assunto", html: "<p>Oi</p>" };

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ data: { id: "re_1" }, error: null });
});

describe("sendEmail", () => {
  it("retorna false quando nenhum transporte está configurado", async () => {
    const env = {} as Env;
    expect(await sendEmail(env, message)).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("envia pelo Resend no modo padrão", async () => {
    const env = { RESEND_API_KEY: "re_test" } as Env;
    expect(await sendEmail(env, message)).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({
      to: "paciente@example.com",
      subject: "Assunto",
    });
  });

  it("usa RESEND_FROM_EMAIL quando definido", async () => {
    const env = { RESEND_API_KEY: "re_test", RESEND_FROM_EMAIL: "Clinica <x@y.com>" } as Env;
    await sendEmail(env, message);
    expect(send.mock.calls[0][0].from).toBe("Clinica <x@y.com>");
  });

  it("cai no remetente padrão quando RESEND_FROM_EMAIL não está definido", async () => {
    const env = { RESEND_API_KEY: "re_test" } as Env;
    await sendEmail(env, message);
    expect(send.mock.calls[0][0].from).toBe("FisioFlow <noreply@moocafisio.com.br>");
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `pnpm --dir apps/api exec vitest run src/lib/email/__tests__/dispatch.test.ts`
Expected: FAIL — `Failed to resolve import "../dispatch"`.

- [ ] **Step 3: Criar os tipos**

Create `apps/api/src/lib/email/types.ts`:

```typescript
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}
```

- [ ] **Step 4: Criar os transportes**

Create `apps/api/src/lib/email/transports.ts`:

```typescript
import { Resend } from "resend";
import type { Env } from "../../types/env";
import type { EmailMessage } from "./types";

const DEFAULT_FROM = "FisioFlow <noreply@moocafisio.com.br>";

export function resolveFrom(env: Env): string {
  return env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;
}

export async function sendViaResend(env: Env, message: EmailMessage): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: resolveFrom(env),
    to: message.to,
    subject: message.subject,
    html: message.html,
  });
  return true;
}
```

- [ ] **Step 5: Criar o dispatch**

Create `apps/api/src/lib/email/dispatch.ts`:

```typescript
import type { Env } from "../../types/env";
import type { EmailMessage } from "./types";
import { sendViaResend } from "./transports";

export async function sendEmail(env: Env, message: EmailMessage): Promise<boolean> {
  return sendViaResend(env, message);
}
```

- [ ] **Step 6: Rodar o teste para confirmar que passa**

Run: `pnpm --dir apps/api exec vitest run src/lib/email/__tests__/dispatch.test.ts`
Expected: PASS, 4 testes.

- [ ] **Step 7: Reescrever `email.ts` sobre o dispatch**

Em `apps/api/src/lib/email.ts`, substituir o topo do arquivo:

```typescript
import { Resend } from "resend";
import type { Env } from "../types/env";

export function createResend(env: Env) {
  if (!env.RESEND_API_KEY) return null;
  return new Resend(env.RESEND_API_KEY);
}

const FROM = (env: Env) => env.RESEND_FROM_EMAIL ?? "FisioFlow <noreply@moocafisio.com.br>";
```

por:

```typescript
import type { Env } from "../types/env";
import { sendEmail } from "./email/dispatch";
```

Depois, em cada uma das 6 funções `send*`, trocar o par
`const resend = createResend(env); if (!resend) return;` seguido de `await resend.emails.send({ from: FROM(env), to, subject, html })`
por uma única chamada `await sendEmail(env, { to, subject, html })`, preservando o `subject` e o `html` exatamente como estão hoje.

- [ ] **Step 8: Fechar o vazamento nos 4 call sites diretos**

`apps/api/src/routes/briefing.ts` (linhas 40-49):

```typescript
    const briefing = await getBriefing(c.env, user);
    const { subject, html } = formatBriefingEmail(briefing);
    const sent = await sendEmail(c.env, { to, subject, html });
    if (!sent) return c.json({ error: "Transporte de e-mail não configurado" }, 503);
    return c.json({ ok: true, to, summary: briefing.summary });
```

`apps/api/src/lib/briefing/sendBriefing.ts` (linhas 20-28):

```typescript
  const briefing = await getBriefing(env, { organizationId: orgId } as AuthUser);
  const { subject, html } = formatBriefingEmail(briefing);
  return sendEmail(env, { to, subject, html });
```

`apps/api/src/lib/automation/actionHandlers.ts` (linhas 20-28):

```typescript
      const sent = await sendEmail(env, {
        to,
        subject: String(params.subject ?? "Notificação FisioFlow"),
        html: String(params.html ?? params.message ?? ""),
      });
      if (!sent) return { skipped: "Transporte de e-mail não configurado" };
      return { sent: true, to };
```

`apps/api/src/routes/webhooks.ts` (a partir da linha 178): trocar o bloco `const resend = createResend(c.env); if (resend) { ... }` por `await sendEmail(c.env, { to: adminEmail, subject, html })`, mantendo o `subject` condicional e o `html` existentes. Ajustar os imports dos quatro arquivos para `import { sendEmail } from "<caminho>/lib/email/dispatch";` e remover os imports de `createResend`.

- [ ] **Step 9: Remover a exportação vazada**

Confirmar que `createResend` não é mais usado:

Run: `grep -rn "createResend" apps/api/src --include=*.ts`
Expected: nenhuma saída. Se houver, migrar o call site restante antes de seguir.

- [ ] **Step 10: Rodar a suíte completa e o typecheck**

Run: `pnpm --dir apps/api exec vitest run && pnpm --dir apps/api exec tsc --noEmit`
Expected: PASS, 0 erros de tipo.

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/lib/email/ apps/api/src/lib/email.ts apps/api/src/routes/briefing.ts \
  apps/api/src/routes/webhooks.ts apps/api/src/lib/automation/actionHandlers.ts \
  apps/api/src/lib/briefing/sendBriefing.ts
git commit -m "refactor(email): isola o transporte atrás de sendEmail

Fecha o vazamento da fachada: briefing, webhooks, actionHandlers e
sendBriefing chamavam resend.emails.send() direto. Comportamento
inalterado — o Resend segue como único transporte."
```

---

### Task 5: Adicionar o transporte Cloudflare em modo sombra

Cloudflare passa a receber uma cópia de cada e-mail numa caixa de monitoramento, enquanto o Resend continua atendendo o destinatário real. O paciente nunca recebe duplicidade.

**Files:**
- Modify: `apps/api/src/lib/email/transports.ts`
- Modify: `apps/api/src/lib/email/dispatch.ts`
- Modify: `apps/api/src/lib/email/__tests__/dispatch.test.ts`
- Modify: `apps/api/src/types/env.ts`
- Modify: `apps/api/wrangler.toml`

**Interfaces:**
- Consumes: `sendEmail`, `EmailMessage`, `resolveFrom` da Task 4
- Produces: `sendViaCloudflare(env: Env, message: EmailMessage): Promise<boolean>`

- [x] **Step 1: Pré-requisito — CONCLUÍDO em 03/08/2026**

Nada a fazer. Registrado aqui para quem executar o plano depois.

- Email Routing habilitado na zona `moocafisio.com.br` via API — `status: ready`
- `rafaelstarton@gmail.com` adicionado e **verificado** em `2026-08-03T19:39:32Z`
  (tag `1bba13f7ace74679b17e74738bfdee3a`)

O apex não tinha MX antes, então nenhum fluxo de inbound foi quebrado. Os registros de
envio do Resend em `send.moocafisio.com.br` (MX para `amazonses.com` e SPF próprio)
permaneceram intactos — Email Routing só escreve no apex.

**Onboarding de domínio NÃO é necessário para esta task.** Envio para endereço de destino
verificado é liberado em qualquer plano, inclusive com apenas Email Routing configurado.
Como o modo sombra escreve exclusivamente para `rafaelstarton@gmail.com`, a task roda
inteira sem isso. O onboarding em **Email Service → Domains** só é exigido no Step 12,
quando o binding passa a escrever para destinatário arbitrário.

**Por que o alvo da sombra é o Gmail e não `deliverability@moocafisio.com.br`:** o binding
`send_email` só aceita endereços **verificados como destino** no Email Routing. Um alias da
zona é endereço de *roteamento*, não de *destino* — tentar usá-lo em
`allowed_destination_addresses` falha com `2054: Destination address is not verified`
(verificado empiricamente em 03/08/2026). Se quiser o alias por estética, crie depois uma
regra `deliverability@moocafisio.com.br → rafaelstarton@gmail.com`; ela é opcional e não
participa do shadow-send.

- [ ] **Step 2: Adicionar o binding e as vars**

Em `apps/api/wrangler.toml`, nos blocos raiz, `[env.production]` e `[env.staging]`:

```toml
[[send_email]]
name = "EMAIL"
allowed_destination_addresses = [ "rafaelstarton@gmail.com" ]
```

E em cada bloco de `vars`:

```toml
EMAIL_TRANSPORT = "shadow"
EMAIL_SHADOW_TO = "rafaelstarton@gmail.com"
```

O `allowed_destination_addresses` é uma trava deliberada: enquanto o modo for sombra, o binding é incapaz de escrever para um paciente, mesmo que haja bug no dispatch.

- [ ] **Step 3: Declarar os tipos no Env**

Em `apps/api/src/types/env.ts`, junto das entradas de e-mail:

```typescript
  EMAIL: SendEmail;
  EMAIL_TRANSPORT?: "resend" | "shadow" | "cloudflare";
  EMAIL_SHADOW_TO?: string;
```

- [ ] **Step 4: Escrever os testes que falham**

Adicionar a `apps/api/src/lib/email/__tests__/dispatch.test.ts`:

```typescript
describe("sendEmail — modo sombra", () => {
  it("envia pelo Resend ao destinatário real e a cópia para a caixa sombra", async () => {
    const cfSend = vi.fn().mockResolvedValue({ messageId: "cf_1" });
    const env = {
      RESEND_API_KEY: "re_test",
      EMAIL_TRANSPORT: "shadow",
      EMAIL_SHADOW_TO: "rafaelstarton@gmail.com",
      EMAIL: { send: cfSend },
    } as unknown as Env;

    expect(await sendEmail(env, message)).toBe(true);

    expect(send.mock.calls[0][0].to).toBe("paciente@example.com");
    expect(cfSend).toHaveBeenCalledTimes(1);
    expect(cfSend.mock.calls[0][0].to).toBe("rafaelstarton@gmail.com");
  });

  it("não derruba o envio principal quando a sombra falha", async () => {
    const cfSend = vi.fn().mockRejectedValue(new Error("beta instável"));
    const env = {
      RESEND_API_KEY: "re_test",
      EMAIL_TRANSPORT: "shadow",
      EMAIL_SHADOW_TO: "rafaelstarton@gmail.com",
      EMAIL: { send: cfSend },
    } as unknown as Env;

    expect(await sendEmail(env, message)).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("no modo cloudflare envia ao destinatário real e não usa o Resend", async () => {
    const cfSend = vi.fn().mockResolvedValue({ messageId: "cf_2" });
    const env = {
      RESEND_API_KEY: "re_test",
      EMAIL_TRANSPORT: "cloudflare",
      EMAIL: { send: cfSend },
    } as unknown as Env;

    expect(await sendEmail(env, message)).toBe(true);
    expect(cfSend.mock.calls[0][0].to).toBe("paciente@example.com");
    expect(send).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Rodar os testes para confirmar que falham**

Run: `pnpm --dir apps/api exec vitest run src/lib/email/__tests__/dispatch.test.ts`
Expected: FAIL — os 3 novos falham; os 4 da Task 4 seguem passando.

- [ ] **Step 6: Implementar o transporte Cloudflare**

Adicionar a `apps/api/src/lib/email/transports.ts`:

```typescript
export async function sendViaCloudflare(env: Env, message: EmailMessage): Promise<boolean> {
  if (!env.EMAIL) return false;
  await env.EMAIL.send({
    from: resolveFrom(env),
    to: message.to,
    subject: message.subject,
    html: message.html,
  });
  return true;
}
```

- [ ] **Step 7: Implementar a decisão de transporte**

Substituir o corpo de `apps/api/src/lib/email/dispatch.ts`:

```typescript
import type { Env } from "../../types/env";
import type { EmailMessage } from "./types";
import { sendViaResend, sendViaCloudflare } from "./transports";

export async function sendEmail(env: Env, message: EmailMessage): Promise<boolean> {
  const mode = env.EMAIL_TRANSPORT ?? "resend";

  if (mode === "cloudflare") return sendViaCloudflare(env, message);

  if (mode === "shadow" && env.EMAIL_SHADOW_TO) {
    await sendViaCloudflare(env, { ...message, to: env.EMAIL_SHADOW_TO }).catch((err) => {
      console.error(JSON.stringify({ level: "warn", message: "shadow email falhou", err: String(err) }));
      return false;
    });
  }

  return sendViaResend(env, message);
}
```

A cópia sombra roda antes do envio principal e tem o erro engolido de propósito: uma falha do transporte em beta não pode impedir que a prescrição chegue ao paciente.

- [ ] **Step 8: Rodar os testes para confirmar que passam**

Run: `pnpm --dir apps/api exec vitest run src/lib/email/__tests__/dispatch.test.ts`
Expected: PASS, 7 testes.

- [ ] **Step 9: Rodar a suíte completa e o typecheck**

Run: `pnpm --dir apps/api exec vitest run && pnpm --dir apps/api exec tsc --noEmit`
Expected: PASS, 0 erros de tipo.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/lib/email/ apps/api/src/types/env.ts apps/api/wrangler.toml
git commit -m "feat(email): transporte Cloudflare em modo sombra

Resend segue atendendo o destinatário real; a Cloudflare recebe uma cópia
em deliverability@ para comparação de entregabilidade. allowed_destination_addresses
impede que o binding escreva para paciente enquanto o modo for sombra.
Falha da sombra não derruba o envio principal."
```

- [ ] **Step 11: Período de observação (~2 semanas)**

Verificar na caixa `rafaelstarton@gmail.com`: a cópia chega? Com que atraso em relação à do Resend? O HTML renderiza igual? Cai em spam?

**Critério de corte:** ao menos 2 semanas sem falha de entrega e sem classificação como spam. Só então prosseguir para o Step 12.

- [ ] **Step 12: Corte final (só após o critério do Step 11)**

Primeiro, onboardar `moocafisio.com.br` em **Email Service → Domains** no dashboard — só a
partir daí o binding pode escrever para destinatário arbitrário (DKIM/DMARC são gerados
automaticamente porque a zona já está na Cloudflare). Sem isso, o envio a paciente falha.

Depois: remover `allowed_destination_addresses` do bloco `[[send_email]]` (o binding precisa escrever para qualquer paciente), trocar `EMAIL_TRANSPORT` para `"cloudflare"` nos três blocos de vars, remover `sendViaResend` de `transports.ts`, remover a dependência `resend` do `apps/api/package.json` e apagar o secret:

```bash
cd apps/api && npx wrangler secret delete RESEND_API_KEY --env production
```

Rollback a qualquer momento: `EMAIL_TRANSPORT=resend`.

---

### Task 6: Remover o endpoint de gráfico e o quickchart.io

`GET /api/reports/chart` monta uma config Chart.js e busca um PNG em `quickchart.io`. A rota não tem consumidor: o front usa Recharts, e a única menção no repositório é `specs/professional-app-completion.md:28`.

**Files:**
- Modify: `apps/api/src/routes/reports.ts` (remover o handler que começa na linha 391)

**Interfaces:**
- Consumes: nada
- Produces: nada

- [ ] **Step 1: Reconfirmar que não há consumidor**

Run: `grep -rn "reports/chart" . --include=*.ts --include=*.tsx --include=*.json --exclude-dir=node_modules`
Expected: apenas `specs/professional-app-completion.md:28`. Qualquer outra ocorrência — em especial no app profissional React Native — significa PARE e reporte.

- [ ] **Step 2: Remover o handler**

Em `apps/api/src/routes/reports.ts`, apagar todo o bloco `app.get("/chart", requireAuth, async (c) => { ... });` que vai da linha 391 até imediatamente antes de `export { app as reportsRoutes };`. Remover também qualquer import que fique órfão após a remoção.

- [ ] **Step 3: Verificar que o quickchart sumiu**

Run: `grep -rn "quickchart" apps/api/src src --include=*.ts --include=*.tsx`
Expected: nenhuma saída.

- [ ] **Step 4: Rodar a suíte completa e o typecheck**

Run: `pnpm --dir apps/api exec vitest run && pnpm --dir apps/api exec tsc --noEmit`
Expected: PASS, 0 erros de tipo. Se algum teste referenciava `/chart`, remova-o junto.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/reports.ts
git commit -m "chore(relatorios): remove GET /chart e a dependência de quickchart.io

Rota sem consumidor: o front usa Recharts e a única menção no repo é um
spec antigo. Se voltar a ser necessário gráfico server-side, gerar SVG
no próprio Worker."
```

---

## Resultado esperado ao fim do plano

| Antes | Depois |
|---|---|
| Resend, Axiom, Grafana, Inngest (restos), quickchart, Sentry, PostHog | Sentry, PostHog |
| 5 secrets de fornecedor | 0 |
| 2 backends de log para o mesmo dado | Workers Logs (7d) + R2 (longo prazo) |
| Log seria amostrado a 10% após a migração | 100% |
| `redactPII` sem teste | 9 testes cobrindo PII e emissão |
| Fachada de e-mail vazando em 4 arquivos | Transporte único atrás de `sendEmail` |

**Ordem obrigatória:** Tasks 1-3 são independentes entre si e podem ir em qualquer ordem. A Task 5 depende da 4. A Task 6 é independente. O Step 12 da Task 5 só ocorre após ~2 semanas de observação.
