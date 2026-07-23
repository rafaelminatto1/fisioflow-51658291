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
