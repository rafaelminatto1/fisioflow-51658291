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
