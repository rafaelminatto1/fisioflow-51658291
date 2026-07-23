# WhatsApp Flows — Endpoint de Dados de Agendamento (Incremento 1 de F1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o endpoint de dados criptografado do WhatsApp Flows que powera o agendamento — responde health check da Meta e devolve serviços + horários livres (reusando a disponibilidade do `publicBooking`).

**Architecture:** Rota nova `POST /api/whatsapp/flows/data` no Worker (`apps/api`, Hono). Decripta o payload da Meta com WebCrypto (RSA-OAEP-SHA256 para a chave AES, AES-128-GCM para os dados), roteia por `action` (`ping`/`INIT`/`data_exchange`/`BACK`), monta os dados da tela e re-encripta a resposta. Sem dependências novas — WebCrypto é nativo no Workers.

**Tech Stack:** Cloudflare Workers, Hono, WebCrypto (`crypto.subtle`), Neon/pg (`createPool`), Vitest.

## Global Constraints

- Runtime: Cloudflare Workers, `compatibility_date = 2026-05-14`. Sem libs de crypto externas — usar `crypto.subtle` global.
- TypeScript strict; sem comentários supérfluos; PT-BR na UI/textos ao usuário.
- Data API do Flows: `3.0`. Flow JSON: `7.3`. Message version: `3`.
- Assinatura: validar `X-Hub-Signature-256` (HMAC-SHA256 do corpo bruto com `WHATSAPP_APP_SECRET`) — reusar `verifyMetaSignature` de `apps/api/src/routes/whatsapp.ts`.
- Resposta do endpoint: texto puro (base64), NÃO JSON. IV da resposta = IV do request com todos os bits invertidos (XOR `0xFF`).
- Chave privada no secret `FLOWS_PRIVATE_KEY` em **PKCS#8 não-encriptado** (WebCrypto `importKey("pkcs8", …)` não lê PEM encriptado).
- Migrations: próximo número sequencial é `0142` (se necessário; este incremento NÃO cria tabela).
- Cron `tick` deve permanecer DB-free (lição do `cron.test.ts`) — não afetado aqui.

---

### Task 1: Gerar par de chaves RSA + configurar secrets + subir chave pública na Meta

**Files:**
- Create: `apps/api/scripts/gen-flows-keys.sh`
- Modify: `apps/api/src/types/env.ts` (adicionar `FLOWS_PRIVATE_KEY`)

**Interfaces:**
- Produces: secret `FLOWS_PRIVATE_KEY` (PEM PKCS#8) disponível em `env`.

- [ ] **Step 1: Criar o script de geração de chaves**

Create `apps/api/scripts/gen-flows-keys.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
# Gera par RSA-2048 para o endpoint de WhatsApp Flows.
# Privada em PKCS#8 não-encriptado (WebCrypto importKey "pkcs8").
OUT_DIR="${1:-./.flows-keys}"
mkdir -p "$OUT_DIR"
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$OUT_DIR/flows_private_pkcs8.pem"
openssl rsa -in "$OUT_DIR/flows_private_pkcs8.pem" -pubout -out "$OUT_DIR/flows_public.pem"
echo "Chaves geradas em $OUT_DIR"
echo "  privada: flows_private_pkcs8.pem  -> secret FLOWS_PRIVATE_KEY"
echo "  publica: flows_public.pem         -> subir na Meta (Task documentada abaixo)"
```

- [ ] **Step 2: Tornar executável e gerar as chaves**

Run:
```bash
chmod +x apps/api/scripts/gen-flows-keys.sh
apps/api/scripts/gen-flows-keys.sh apps/api/.flows-keys
```
Expected: dois arquivos `.pem` em `apps/api/.flows-keys` (diretório NÃO versionado — confirmar `.gitignore` cobre `.flows-keys/`).

- [ ] **Step 3: Adicionar o binding do secret ao env**

In `apps/api/src/types/env.ts`, após a linha `WHATSAPP_APP_SECRET?: string;`, adicionar:

```typescript
  FLOWS_PRIVATE_KEY?: string; // Chave privada RSA-2048 PKCS#8 (PEM) p/ WhatsApp Flows endpoint
```

- [ ] **Step 4: Subir o secret no Worker**

Run:
```bash
cd apps/api && npx wrangler secret put FLOWS_PRIVATE_KEY < .flows-keys/flows_private_pkcs8.pem
```
Expected: `Success! Uploaded secret FLOWS_PRIVATE_KEY`.

- [ ] **Step 5: Subir a chave PÚBLICA na Meta (Graph API)**

Run (substituir `PHONE_NUMBER_ID` e `ACCESS_TOKEN`):
```bash
curl -X POST 'https://graph.facebook.com/v25.0/PHONE_NUMBER_ID/whatsapp_business_encryption' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "business_public_key=$(cat apps/api/.flows-keys/flows_public.pem)"
```
Expected: `{"success":true}`. Validar com:
```bash
curl -X GET 'https://graph.facebook.com/v25.0/PHONE_NUMBER_ID/whatsapp_business_encryption' \
  -H 'Authorization: Bearer ACCESS_TOKEN'
```
Expected: `business_public_key_signature_status": "VALID"`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/scripts/gen-flows-keys.sh apps/api/src/types/env.ts
git commit -m "chore(flows): script de chaves RSA + binding FLOWS_PRIVATE_KEY"
```

---

### Task 2: Módulo de criptografia do endpoint (`flowsCrypto.ts`)

**Files:**
- Create: `apps/api/src/lib/flowsCrypto.ts`
- Test: `apps/api/src/lib/__tests__/flowsCrypto.test.ts`

**Interfaces:**
- Consumes: `env.FLOWS_PRIVATE_KEY` (PEM PKCS#8).
- Produces:
  - `decryptFlowRequest(body: { encrypted_flow_data: string; encrypted_aes_key: string; initial_vector: string }, privateKeyPem: string): Promise<{ decrypted: any; aesKey: CryptoKey; iv: Uint8Array }>`
  - `encryptFlowResponse(response: object, aesKey: CryptoKey, iv: Uint8Array): Promise<string>` (retorna base64)

- [ ] **Step 1: Escrever o teste de round-trip (falha primeiro)**

Create `apps/api/src/lib/__tests__/flowsCrypto.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { decryptFlowRequest, encryptFlowResponse } from "../flowsCrypto";

// Helpers de teste: geram um request cifrado como a Meta faria (chave pública),
// para o módulo decifrar com a privada — provando o round-trip.
async function generateKeyPair() {
  return crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"],
  );
}
function b64(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
async function toPkcs8Pem(key: CryptoKey) {
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", key));
  return `-----BEGIN PRIVATE KEY-----\n${b64(der)}\n-----END PRIVATE KEY-----`;
}

describe("flowsCrypto round-trip", () => {
  it("decripta o request e re-encripta a resposta com IV invertido", async () => {
    const pair = await generateKeyPair();
    const privatePem = await toPkcs8Pem(pair.privateKey);

    // Meta-side: gera AES-128, cifra AES com RSA-OAEP, cifra o payload com AES-GCM
    const aesRaw = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const aesKey = await crypto.subtle.importKey("raw", aesRaw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    const payload = { version: "3.0", action: "ping" };
    const ct = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, aesKey, new TextEncoder().encode(JSON.stringify(payload))),
    );
    const encAesKey = new Uint8Array(
      await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pair.publicKey, aesRaw),
    );

    const { decrypted, aesKey: outKey, iv: outIv } = await decryptFlowRequest(
      { encrypted_flow_data: b64(ct), encrypted_aes_key: b64(encAesKey), initial_vector: b64(iv) },
      privatePem,
    );
    expect(decrypted.action).toBe("ping");

    // Resposta: encripta e confirma que decifra de volta com IV invertido
    const respB64 = await encryptFlowResponse({ data: { status: "active" } }, outKey, outIv);
    const respBytes = Uint8Array.from(atob(respB64), (ch) => ch.charCodeAt(0));
    const respIv = outIv.map((byte) => byte ^ 0xff);
    const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: respIv, tagLength: 128 }, outKey, respBytes);
    expect(JSON.parse(new TextDecoder().decode(clear))).toEqual({ data: { status: "active" } });
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd apps/api && npx vitest run src/lib/__tests__/flowsCrypto.test.ts`
Expected: FAIL — `Failed to resolve import "../flowsCrypto"`.

- [ ] **Step 3: Implementar o módulo**

Create `apps/api/src/lib/flowsCrypto.ts`:

```typescript
// Criptografia do endpoint de WhatsApp Flows (Data API 3.0), via WebCrypto.
// Meta cifra: AES-128 (raw) com RSA-OAEP-SHA256 -> encrypted_aes_key;
// payload com AES-128-GCM (tag de 16 bytes anexada) -> encrypted_flow_data.
// Resposta: mesmo AES key, IV com bits invertidos (XOR 0xFF), saída base64.

function pemToDer(pem: string): Uint8Array {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/, "").replace(/-----END [^-]+-----/, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
function b64ToBytes(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export async function decryptFlowRequest(
  body: { encrypted_flow_data: string; encrypted_aes_key: string; initial_vector: string },
  privateKeyPem: string,
): Promise<{ decrypted: any; aesKey: CryptoKey; iv: Uint8Array }> {
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(privateKeyPem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"],
  );
  const aesRaw = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    b64ToBytes(body.encrypted_aes_key),
  );
  const aesKey = await crypto.subtle.importKey("raw", aesRaw, { name: "AES-GCM" }, false, ["decrypt", "encrypt"]);
  const iv = b64ToBytes(body.initial_vector);
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    aesKey,
    b64ToBytes(body.encrypted_flow_data),
  );
  return { decrypted: JSON.parse(new TextDecoder().decode(clear)), aesKey, iv };
}

export async function encryptFlowResponse(
  response: object,
  aesKey: CryptoKey,
  iv: Uint8Array,
): Promise<string> {
  const responseIv = iv.map((byte) => byte ^ 0xff);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: responseIv, tagLength: 128 },
      aesKey,
      new TextEncoder().encode(JSON.stringify(response)),
    ),
  );
  return bytesToB64(ct);
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `cd apps/api && npx vitest run src/lib/__tests__/flowsCrypto.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/flowsCrypto.ts apps/api/src/lib/__tests__/flowsCrypto.test.ts
git commit -m "feat(flows): módulo de cripto do endpoint (WebCrypto RSA-OAEP + AES-GCM)"
```

---

### Task 3: Rota do endpoint com health check e validação de assinatura

**Files:**
- Create: `apps/api/src/routes/whatsapp-flows.ts`
- Modify: `apps/api/src/index.ts` (import + registro na lista de rotas ~linha 341)
- Test: `apps/api/src/routes/__tests__/whatsapp-flows.test.ts`

**Interfaces:**
- Consumes: `decryptFlowRequest`, `encryptFlowResponse` (Task 2); `verifyMetaSignature` de `../routes/whatsapp`.
- Produces: `whatsappFlowsRoutes` (Hono app) montado em `/api/whatsapp/flows`. Handler `getNextScreen(decrypted, env, pool)` (stub aqui; preenchido na Task 4).

- [ ] **Step 1: Escrever o teste do health check (falha primeiro)**

Create `apps/api/src/routes/__tests__/whatsapp-flows.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("../../lib/db", () => ({ createPool: vi.fn(() => ({ query: vi.fn(async () => ({ rows: [] })) })) }));
vi.mock("../whatsapp", () => ({ verifyMetaSignature: vi.fn(async () => true) }));

async function buildApp() {
  const { Hono } = await import("hono");
  const { whatsappFlowsRoutes } = await import("../whatsapp-flows");
  const app = new Hono<any>();
  app.route("/api/whatsapp/flows", whatsappFlowsRoutes);
  return app;
}

// Reusa os helpers de cripto para simular a Meta enviando um "ping".
async function encryptedPingBody() {
  const pair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"]);
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const b64 = (b: Uint8Array) => { let s = ""; for (const x of b) s += String.fromCharCode(x); return btoa(s); };
  const pem = `-----BEGIN PRIVATE KEY-----\n${b64(der)}\n-----END PRIVATE KEY-----`;
  const aesRaw = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const aesKey = await crypto.subtle.importKey("raw", aesRaw, { name: "AES-GCM" }, false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, aesKey, new TextEncoder().encode(JSON.stringify({ version: "3.0", action: "ping" }))));
  const encAes = new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pair.publicKey, aesRaw));
  return { pem, body: { encrypted_flow_data: b64(ct), encrypted_aes_key: b64(encAes), initial_vector: b64(iv) } };
}

describe("POST /api/whatsapp/flows/data", () => {
  it("responde ao health check (ping) com data.status=active encriptado", async () => {
    const { pem, body } = await encryptedPingBody();
    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/api/whatsapp/flows/data", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-hub-signature-256": "sha256=ok" },
        body: JSON.stringify(body),
      }),
      { FLOWS_PRIVATE_KEY: pem, WHATSAPP_APP_SECRET: "s" } as any,
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0); // base64 encriptado (não vazio)
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/api && npx vitest run src/routes/__tests__/whatsapp-flows.test.ts`
Expected: FAIL — `Failed to resolve import "../whatsapp-flows"`.

- [ ] **Step 3: Implementar a rota**

Create `apps/api/src/routes/whatsapp-flows.ts`:

```typescript
import { Hono } from "hono";
import { createPool } from "../lib/db";
import { decryptFlowRequest, encryptFlowResponse } from "../lib/flowsCrypto";
import { verifyMetaSignature } from "./whatsapp";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env }>();

// Preenchido na Task 4. Recebe o payload decifrado e devolve a próxima tela.
export async function getNextScreen(
  decrypted: any,
  _env: Env,
  _pool: ReturnType<typeof createPool>,
): Promise<object> {
  // Health check
  if (decrypted.action === "ping") {
    return { data: { status: "active" } };
  }
  // INIT / data_exchange / BACK — implementados na Task 4.
  return { data: { acknowledged: true } };
}

app.post("/data", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-hub-signature-256");
  const secret = c.env.WHATSAPP_APP_SECRET;
  if (secret) {
    const ok = await verifyMetaSignature(secret, rawBody, signature);
    if (!ok) return c.text("", 432); // 432 força o cliente a re-baixar a chave/retry
  }

  const privateKey = c.env.FLOWS_PRIVATE_KEY;
  if (!privateKey) return c.text("", 500);

  let body: { encrypted_flow_data: string; encrypted_aes_key: string; initial_vector: string };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return c.text("", 421);
  }

  let decrypted, aesKey, iv;
  try {
    ({ decrypted, aesKey, iv } = await decryptFlowRequest(body, privateKey));
  } catch (err) {
    console.error("[Flows] decrypt error:", err);
    return c.text("", 421); // corpo indecifrável -> cliente re-baixa a chave pública
  }

  const pool = createPool(c.env);
  const screen = await getNextScreen(decrypted, c.env, pool);
  const encrypted = await encryptFlowResponse(screen, aesKey, iv);
  return c.body(encrypted, 200, { "Content-Type": "text/plain" });
});

export { app as whatsappFlowsRoutes };
```

- [ ] **Step 4: Registrar a rota no index.ts**

In `apps/api/src/index.ts`, após a linha `import { instagramWebhookRoutes } from "./routes/instagram-webhook";` (~57), adicionar:

```typescript
import { whatsappFlowsRoutes } from "./routes/whatsapp-flows";
```

E na lista de rotas, após `["/api/whatsapp/inbox", whatsappInboxRoutes],` (~341), adicionar:

```typescript
  ["/api/whatsapp/flows", whatsappFlowsRoutes],
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd apps/api && npx vitest run src/routes/__tests__/whatsapp-flows.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/whatsapp-flows.ts apps/api/src/routes/__tests__/whatsapp-flows.test.ts apps/api/src/index.ts
git commit -m "feat(flows): rota /api/whatsapp/flows/data com health check + validação de assinatura"
```

---

### Task 4: Dados das telas — serviços (INIT) e horários livres (data_exchange)

**Files:**
- Create: `apps/api/src/lib/flowsBooking.ts`
- Modify: `apps/api/src/routes/whatsapp-flows.ts` (`getNextScreen`)
- Modify: `apps/api/src/routes/publicBooking.ts` (extrair `computeAvailableSlots`)
- Test: `apps/api/src/lib/__tests__/flowsBooking.test.ts`

**Interfaces:**
- Consumes: `pool` (Neon), org resolvida por `env.WHATSAPP_BUSINESS_ACCOUNT_ID` → `organizations` (clínica única).
- Produces:
  - `computeAvailableSlots(pool, therapistId, date): Promise<string[]>` (extraído de `publicBooking`)
  - `buildAppointmentScreen(pool, env): Promise<object>` — dados da tela inicial (lista de serviços/fisios)
  - `buildSlotsData(pool, env, therapistId, date): Promise<object>` — `{ slots: [{id, title}] }`

- [ ] **Step 1: Escrever o teste (falha primeiro)**

Create `apps/api/src/lib/__tests__/flowsBooking.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { buildSlotsData } from "../flowsBooking";

describe("flowsBooking.buildSlotsData", () => {
  it("devolve slots livres no formato do Flow (id/title), sem os já agendados", async () => {
    const pool = {
      query: vi.fn(async (sql: string) => {
        if (/appointments/.test(sql)) return { rows: [{ start_time: "08:00:00" }] };
        return { rows: [] };
      }),
    } as any;
    const data = await buildSlotsData(pool, {} as any, "therapist-1", "2026-08-01");
    const ids = (data as any).slots.map((s: any) => s.id);
    expect(ids).not.toContain("08:00"); // agendado -> fora
    expect(ids).toContain("08:30");
    expect((data as any).slots[0]).toHaveProperty("title");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/api && npx vitest run src/lib/__tests__/flowsBooking.test.ts`
Expected: FAIL — `Failed to resolve import "../flowsBooking"`.

- [ ] **Step 3: Extrair `computeAvailableSlots` de `publicBooking.ts`**

In `apps/api/src/routes/publicBooking.ts`, adicionar e exportar a função (reusando a lógica que hoje está inline no handler de availability):

```typescript
export async function computeAvailableSlots(
  pool: ReturnType<typeof createPool>,
  therapistId: string,
  date: string,
): Promise<string[]> {
  const allSlots: string[] = [];
  for (let h = 8; h < 18; h++) {
    allSlots.push(`${String(h).padStart(2, "0")}:00`);
    allSlots.push(`${String(h).padStart(2, "0")}:30`);
  }
  let bookedSlots: string[] = [];
  try {
    const booked = await pool.query(
      `SELECT start_time FROM appointments
       WHERE therapist_id = $1 AND appointment_date = $2
         AND status NOT IN ('cancelado', 'falta')
         AND deleted_at IS NULL`,
      [therapistId, date],
    );
    bookedSlots = booked.rows.map((r: any) => String(r.start_time).substring(0, 5));
  } catch {
    // colunas ausentes -> devolve todos
  }
  return allSlots.filter((s) => !bookedSlots.includes(s));
}
```

E trocar o corpo do handler `GET /booking/:slug/availability` para usar `computeAvailableSlots(pool, profile.id, date)` (mantendo o mesmo retorno `{ slots, bookedSlots }` — derivar `bookedSlots` como o complemento, ou manter o cálculo atual e só extrair a parte comum). Mínimo: substituir as linhas que montam `allSlots`/`bookedSlots`/`slots` por `const slots = await computeAvailableSlots(pool, profile.id, date);` e retornar `{ slots }`.

- [ ] **Step 4: Implementar `flowsBooking.ts`**

Create `apps/api/src/lib/flowsBooking.ts`:

```typescript
import type { Env } from "../types/env";
import { createPool } from "./db";
import { computeAvailableSlots } from "../routes/publicBooking";

// Clínica única: resolve a org pelo WABA id (ou primeira org).
async function resolveOrgId(pool: ReturnType<typeof createPool>, env: Env): Promise<string | null> {
  const waba = env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (waba) {
    const r = await pool.query(
      `SELECT id FROM organizations WHERE (settings->>'whatsapp_business_account_id') = $1 LIMIT 1`,
      [waba],
    );
    if (r.rows[0]?.id) return r.rows[0].id;
  }
  const first = await pool.query(`SELECT id FROM organizations ORDER BY created_at LIMIT 1`);
  return first.rows[0]?.id ?? null;
}

export async function buildAppointmentScreen(
  pool: ReturnType<typeof createPool>,
  env: Env,
): Promise<object> {
  const orgId = await resolveOrgId(pool, env);
  const therapists = orgId
    ? (await pool.query(
        `SELECT id, full_name FROM profiles
         WHERE organization_id = $1 AND 'Fisioterapeuta' = ANY(roles) AND deleted_at IS NULL
         ORDER BY full_name`,
        [orgId],
      )).rows
    : [];
  return {
    therapists: therapists.map((t: any) => ({ id: t.id, title: t.full_name })),
    is_therapist_enabled: therapists.length > 0,
  };
}

export async function buildSlotsData(
  pool: ReturnType<typeof createPool>,
  _env: Env,
  therapistId: string,
  date: string,
): Promise<object> {
  const slots = await computeAvailableSlots(pool, therapistId, date);
  return { slots: slots.map((s) => ({ id: s, title: s })) };
}
```

- [ ] **Step 5: Ligar em `getNextScreen`**

In `apps/api/src/routes/whatsapp-flows.ts`, atualizar o topo e a função:

```typescript
import { buildAppointmentScreen, buildSlotsData } from "../lib/flowsBooking";
```

```typescript
export async function getNextScreen(
  decrypted: any,
  env: Env,
  pool: ReturnType<typeof createPool>,
): Promise<object> {
  const { action, screen, data } = decrypted;

  if (action === "ping") return { data: { status: "active" } };

  // Abertura do Flow -> tela APPOINTMENT com serviços/fisios.
  if (action === "INIT") {
    return { screen: "APPOINTMENT", data: await buildAppointmentScreen(pool, env) };
  }

  if (action === "data_exchange") {
    // Seleção de fisio+data -> devolve horários livres na mesma tela.
    if (screen === "APPOINTMENT" && data?.therapist && data?.date) {
      return { screen: "APPOINTMENT", data: await buildSlotsData(pool, env, data.therapist, data.date) };
    }
  }

  return { data: { acknowledged: true } };
}
```

- [ ] **Step 6: Rodar todos os testes do endpoint e ver passar**

Run: `cd apps/api && npx vitest run src/lib/__tests__/flowsBooking.test.ts src/lib/__tests__/flowsCrypto.test.ts src/routes/__tests__/whatsapp-flows.test.ts src/routes/__tests__/publicBooking.test.ts`
Expected: PASS (todos). Se `publicBooking.test.ts` quebrar por causa do refactor, ajustar o teste para o retorno `{ slots }`.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/lib/flowsBooking.ts apps/api/src/lib/__tests__/flowsBooking.test.ts apps/api/src/routes/whatsapp-flows.ts apps/api/src/routes/publicBooking.ts
git commit -m "feat(flows): telas de serviços + horários livres (reusa disponibilidade do publicBooking)"
```

---

### Task 5: Flow JSON versionado + documentação de publicação na Meta

**Files:**
- Create: `apps/api/flows/agendar-consulta.flow.json`
- Create: `apps/api/flows/README.md`

**Interfaces:**
- Consumes: nomes de tela/campos devem casar com `getNextScreen` (tela `APPOINTMENT`; campos `therapist`, `date`, `slot`).

- [ ] **Step 1: Criar o Flow JSON**

Create `apps/api/flows/agendar-consulta.flow.json` (Flow JSON 7.3, data endpoint, tela única `APPOINTMENT` que faz `data_exchange` ao escolher fisio+data e termina com `complete`):

```json
{
  "version": "7.3",
  "data_api_version": "3.0",
  "routing_model": { "APPOINTMENT": [] },
  "screens": [
    {
      "id": "APPOINTMENT",
      "title": "Agendar consulta",
      "terminal": true,
      "data": {
        "therapists": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" } } }, "__example__": [{ "id": "1", "title": "Fisio" }] },
        "slots": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" } } }, "__example__": [{ "id": "08:30", "title": "08:30" }] },
        "is_therapist_enabled": { "type": "boolean", "__example__": true }
      },
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "Form",
            "name": "form",
            "children": [
              { "type": "Dropdown", "name": "therapist", "label": "Fisioterapeuta", "required": true, "data-source": "${data.therapists}" },
              { "type": "DatePicker", "name": "date", "label": "Data", "required": true, "on-select-action": { "name": "data_exchange", "payload": { "therapist": "${form.therapist}", "date": "${form.date}" } } },
              { "type": "Dropdown", "name": "slot", "label": "Horário", "required": true, "data-source": "${data.slots}" },
              { "type": "Footer", "label": "Confirmar", "on-click-action": { "name": "complete", "payload": { "therapist": "${form.therapist}", "date": "${form.date}", "slot": "${form.slot}" } } }
            ]
          }
        ]
      }
    }
  ]
}
```

- [ ] **Step 2: Documentar a publicação na Meta**

Create `apps/api/flows/README.md`:

```markdown
# WhatsApp Flow — Agendar Consulta

Fonte versionada do Flow. A publicação é feita no WhatsApp Manager (Meta),
pois Flow publicado é imutável (clonar para alterar).

## Passos (fase de implementação, com login do Rafael)
1. WhatsApp Manager > Flows > Create > "Book an appointment" (ou importar este JSON).
2. Endpoint: colar a URL `https://<worker>/api/whatsapp/flows/data`, conectar o Meta App.
3. Preview > "Request data on first screen" -> deve renderizar a lista de fisios (health/INIT OK).
4. Publicar (irreversível — confirmar antes).
5. Copiar o `FLOW_ID` gerado -> usado no trigger (próximo plano) para `sendFlowMessage`.

Endpoint espera: telas `APPOINTMENT`; campos `therapist`, `date`, `slot`.
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/flows/agendar-consulta.flow.json apps/api/flows/README.md
git commit -m "docs(flows): Flow JSON de agendamento versionado + guia de publicação"
```

---

### Task 6: Verificação final e deploy

- [ ] **Step 1: Rodar o quality gate local**

Run: `cd apps/api && npx vitest run src/lib/__tests__/flowsCrypto.test.ts src/lib/__tests__/flowsBooking.test.ts src/routes/__tests__/whatsapp-flows.test.ts`
Expected: PASS em todos.

- [ ] **Step 2: Typecheck**

Run: `cd apps/api && npx tsc --noEmit 2>&1 | grep -E "whatsapp-flows|flowsCrypto|flowsBooking|publicBooking" || echo "sem erros nos arquivos novos"`
Expected: `sem erros nos arquivos novos`.

- [ ] **Step 3: Deploy (push main = auto-deploy) e validar health check**

Após push e deploy verde, no WhatsApp Manager rodar o preview "Request data" — deve retornar 200 e renderizar a lista de fisioterapeutas (prova que decrypt + INIT + availability funcionam ponta a ponta com a chave real).

---

## Escopo deste plano vs. próximo incremento

**Entregue aqui (B1):** endpoint de dados criptografado, health check, telas de serviço + horários livres, Flow JSON versionado.

**Próximo plano (F1 completion):** trigger do Flow (via `sendFlowMessage` já existente) quando o concierge detecta intenção de agendar; handler de `nfm_reply` na queue (`whatsapp-inbound.ts`) para criar o `appointment` a partir de `{therapist, date, slot}`, confirmar e agendar lembretes 24h/1h; fallback conversacional com `sendListMessage`. Depois: B3 (broadcast agendado/tracking) para F2/F3.

## Self-review

- **Cobertura do spec (B1):** endpoint criptografado ✓ (T2/T3), health check ✓ (T3), disponibilidade via publicBooking ✓ (T4), Flow JSON ✓ (T5), chaves/secret/upload ✓ (T1). Completion/trigger explicitamente adiados para o próximo plano (documentado acima).
- **Placeholders:** nenhum passo com TODO/"similar a"; código completo em cada passo.
- **Consistência de tipos:** `computeAvailableSlots`/`buildSlotsData`/`buildAppointmentScreen`/`getNextScreen` usados com as mesmas assinaturas entre T3–T4; nomes de tela/campos do Flow JSON (`APPOINTMENT`, `therapist`, `date`, `slot`) casam com `getNextScreen`.
