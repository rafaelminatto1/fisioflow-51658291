import { test, expect } from "@playwright/test";

/**
 * Chat com o ClinicAgent no Brain Dashboard. US9.
 *
 * Pré-requisitos para passar:
 * - app rodando (baseURL) + sessão autenticada (auth.setup.ts / storageState)
 * - binding CLINIC_AGENT + callAI configurados no Worker
 */
test.describe("Chat com o Agente da Clínica", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ai/brain-dashboard");
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/login")) {
      await page.fill('input[type="email"]', process.env.E2E_EMAIL || "admin@moocafisio.com.br");
      await page.fill('input[type="password"]', process.env.E2E_PASSWORD || "admin123");
      await page.click('button[type="submit"]');
      await page.waitForURL(/brain-dashboard/, { timeout: 20000 });
      await page.waitForLoadState("networkidle");
    }
  });

  test("envia uma pergunta e recebe resposta do agente", async ({ page }) => {
    const input = page.getByPlaceholder("Pergunte ao agente...");
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("Qual o resumo de hoje da clínica?");
    await input.press("Enter");

    // Resposta do agente (bolha com data-testid). callAI pode levar alguns segundos.
    await expect(page.getByTestId("clinic-chat-message").first()).toBeVisible({ timeout: 30000 });
  });
});
