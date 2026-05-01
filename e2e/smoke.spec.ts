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

test.describe("@smoke — Autenticado", () => {
  const EMAIL = process.env.STAGING_TEST_USER_EMAIL || "admin@teste.com";
  const PASSWORD = process.env.STAGING_TEST_USER_PASSWORD || "senha123";

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/auth`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);
  });

  test("fluxo completo: paciente -> agendamento -> evolução", async ({ page }) => {
    // 1. Criar Paciente
    await page.goto(`${BASE}/pacientes`);
    await page.click('button:has-text("Novo Paciente")');
    const patientName = `Paciente Teste ${Date.now()}`;
    await page.fill('input[name="full_name"]', patientName);
    await page.fill('input[name="phone"]', "11999999999");
    await page.click('button[type="submit"]');
    await expect(page.locator(`text=${patientName}`)).toBeVisible({ timeout: 10000 });

    // 2. Criar Agendamento
    await page.goto(`${BASE}/agenda`);
    await page.click('button:has-text("Novo Agendamento")');
    await page.fill('input[placeholder*="Buscar paciente"]', patientName);
    await page.click(`text=${patientName}`);
    await page.click('button:has-text("Confirmar Agendamento")');
    await expect(page.locator(`text=${patientName}`)).toBeVisible();

    // 3. Registrar Evolução SOAP
    await page.click(`text=${patientName}`); // Abre o card na agenda
    await page.click('button:has-text("Iniciar Atendimento")');
    await page.fill('textarea[placeholder*="Subjetivo"]', "Paciente relata melhora.");
    await page.fill('textarea[placeholder*="Objetivo"]', "ADM aumentada.");
    await page.click('button:has-text("Finalizar Evolução")');
    await expect(page.locator('text="Evolução salva com sucesso"')).toBeVisible();
  });

  test("logout remove acesso", async ({ page }) => {
    await page.click('button[aria-label*="perfil"], .avatar-trigger');
    await page.click('text="Sair"');
    await expect(page).toHaveURL(/auth/);
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/auth/);
  });
});
