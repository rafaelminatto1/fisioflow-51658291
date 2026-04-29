import { test, expect } from "@playwright/test";

/**
 * @smoke — Suite executada em todo PR via job e2e-smoke no CI.
 * Foca em: páginas públicas, saúde da API e login.
 * Não faz mutações. Rápido (< 60s total).
 */

const BASE = process.env.BASE_URL || "http://localhost:5173";
const API = process.env.VITE_WORKERS_API_URL || "https://api-pro.moocafisio.com.br";

test.describe("@smoke — Páginas públicas", () => {
  for (const route of ["/", "/auth", "/pre-cadastro"]) {
    test(`${route} responde 200 e título FisioFlow`, async ({ page }) => {
      const res = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      expect(res?.ok(), `${route} deve responder com sucesso`).toBeTruthy();
      await expect(page).toHaveTitle(/FisioFlow/i);
    });
  }
});

test.describe("@smoke — Saúde da API", () => {
  test("GET /api/health retorna 200", async ({ request }) => {
    const res = await request.get(`${API}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("status");
  });
});

test.describe("@smoke — Login", () => {
  test("página de login renderiza formulário", async ({ page }) => {
    await page.goto(`${BASE}/auth`);
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("login com credenciais inválidas exibe erro", async ({ page }) => {
    await page.goto(`${BASE}/auth`);
    await page.fill('input[type="email"]', "nao-existe@teste.com");
    await page.fill('input[type="password"]', "senha-errada");
    await page.click('button[type="submit"]');
    // Deve aparecer alguma mensagem de erro (toast, alert ou texto)
    const erro = page.locator('[role="alert"], .text-destructive, [data-sonner-toast]').first();
    await expect(erro).toBeVisible({ timeout: 8000 });
  });
});
