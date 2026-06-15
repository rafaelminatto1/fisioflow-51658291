import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:5173";

test.describe("ClinicAgentChat - Fluxo de Chat - T082", () => {
  const EMAIL = process.env.STAGING_TEST_USER_EMAIL || "admin@teste.com";
  const PASSWORD = process.env.STAGING_TEST_USER_PASSWORD || "senha123";

  test.beforeEach(async ({ page }) => {
    // Navigate and Login
    await page.goto(`${BASE}/auth`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);
  });

  test("deve enviar mensagem para o ClinicAgent e receber resposta", async ({ page }) => {
    // Acessar dashboard de AI
    await page.goto(`${BASE}/ai/brain-dashboard`);
    await expect(page.locator("text=FisioFlow Brain Dashboard")).toBeVisible();

    // Localizar o input do chat
    const chatInput = page.locator('input[placeholder="Pergunte ao agente..."]');
    await expect(chatInput).toBeVisible();

    // Digitar uma pergunta e enviar
    await chatInput.fill("Como acesso a agenda?");
    const sendButton = page.locator("button:has(svg.lucide-send-horizonal)");
    await sendButton.click();

    // Aguardar a mensagem do bot aparecer
    const botMessage = page.locator('[data-testid="clinic-chat-message"]').last();
    await expect(botMessage).toBeVisible({ timeout: 15000 });

    // Verificar que não está vazio
    const textContent = await botMessage.textContent();
    expect(textContent?.length).toBeGreaterThan(5);
  });
});
