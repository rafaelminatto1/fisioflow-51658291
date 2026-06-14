import { test, expect } from "@playwright/test";

/**
 * Valida o autosave das Observações Clínicas (editor TipTap) em produção.
 *
 * Estratégia robusta (espelha a validação manual que funcionou):
 *  1. Login (credenciais via env — NÃO hardcode senha no repo).
 *  2. Captura o Bearer token de uma chamada à API do Worker.
 *  3. Busca um appointment real pela API e abre /patient-evolution/:id.
 *  4. Digita no contenteditable `.ProseMirror` (não é mais <textarea>).
 *  5. Confirma POST /api/sessions/autosave 2xx e persistência após reload.
 *
 * Requer: E2E_EMAIL e E2E_PASSWORD no ambiente.
 */

const BASE = process.env.E2E_BASE_URL || "https://www.moocafisio.com.br";
const API = process.env.E2E_API_URL || "https://fisioflow-api.rafalegollas.workers.dev";
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test("autosave das observações clínicas persiste em produção", async ({ page }) => {
  test.setTimeout(120000);
  test.skip(!EMAIL || !PASSWORD, "Defina E2E_EMAIL e E2E_PASSWORD para rodar contra produção.");

  // Captura o Authorization header que o app envia ao Worker.
  let bearer: string | null = null;
  page.on("request", (req) => {
    const auth = req.headers()["authorization"];
    if (auth && req.url().includes(".workers.dev")) bearer = auth;
  });

  // 1. Login
  await page.goto(`${BASE}/auth`);
  await page.waitForSelector('input[type="email"]', { state: "visible" });
  await page.fill('input[type="email"]', EMAIL!);
  await page.fill('input[type="password"]', PASSWORD!);
  await Promise.all([
    page.waitForURL(/\/(agenda|dashboard)/, { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);

  // 2. Espera o token aparecer
  await expect.poll(() => bearer, { timeout: 15000 }).not.toBeNull();

  // 3. Pega um appointment real e abre a evolução
  const apptRes = await page.request.get(`${API}/api/appointments?limit=5`, {
    headers: { Authorization: bearer! },
  });
  expect(apptRes.ok()).toBeTruthy();
  const apptJson = await apptRes.json();
  const list = Array.isArray(apptJson) ? apptJson : apptJson.data || [];
  expect(list.length).toBeGreaterThan(0);
  const appointmentId = list[0].id;

  await page.goto(`${BASE}/patient-evolution/${appointmentId}`);
  await page.waitForSelector(".ProseMirror", { state: "visible", timeout: 20000 });

  // 4. Digita no editor TipTap
  const marker = `E2E autosave ${Date.now()}`;
  const editor = page.locator(".ProseMirror").first();
  await editor.click();
  await page.keyboard.type(marker);

  // 5a. Confirma o POST de autosave
  const autosaveResp = await page.waitForResponse(
    (r) => r.url().includes("/api/sessions/autosave") && r.request().method() === "POST",
    { timeout: 10000 },
  );
  expect(autosaveResp.status()).toBeGreaterThanOrEqual(200);
  expect(autosaveResp.status()).toBeLessThan(300);

  // 5b. Recarrega e confirma persistência (vindo do servidor)
  await page.reload();
  await page.waitForSelector(".ProseMirror", { state: "visible", timeout: 20000 });
  await expect(page.locator(".ProseMirror").first()).toContainText(marker, { timeout: 15000 });
});
