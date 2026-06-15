import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:5173";

test.describe("Wiki RAG (Cmd+K) - T013", () => {
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

  test("deve responder pergunta e permitir clique na fonte", async ({ page }) => {
    // Abrir Command Palette (Cmd+K)
    await page.keyboard.press("Meta+k"); // Mac
    // Failsafe for Linux/Windows
    await page.keyboard.press("Control+k");

    // Digitar busca
    const searchInput = page.locator('input[placeholder*="Buscar paciente"]'); // GlobalCommandPalette input
    await expect(searchInput).toBeVisible();
    await searchInput.fill("protocolo LCA joelho");

    // Esperar a opção de Perguntar à Wiki
    const wikiTrigger = page.locator('[data-testid="wiki-ask-trigger"]');
    await expect(wikiTrigger).toBeVisible({ timeout: 10000 });
    await wikiTrigger.click();

    // Esperar pela resposta do RAG
    const answerBlock = page.locator('[data-testid="wiki-ask-answer"]');
    await expect(answerBlock).toBeVisible({ timeout: 15000 });

    // Verificar se renderizou texto na resposta
    const textContent = await answerBlock.textContent();
    expect(textContent?.length).toBeGreaterThan(10);

    // Verificar se as fontes apareceram e clicar na primeira
    const firstSource = page.locator("button:has(svg.lucide-book-open)").first();
    await expect(firstSource).toBeVisible();

    // Captura o href que vai navegar
    await firstSource.click();

    // Deve sair do command palette e ir para a página de conteúdo
    await expect(page).not.toHaveURL(/dashboard/); // Deve ir para /protocols/* ou /wiki/*
  });

  test("deve exibir estado vazio para perguntas sem resposta", async ({ page }) => {
    // Abrir Command Palette
    await page.keyboard.press("Meta+k");
    await page.keyboard.press("Control+k");

    const searchInput = page.locator('input[placeholder*="Buscar paciente"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill("como consertar um motor de aviao");

    const wikiTrigger = page.locator('[data-testid="wiki-ask-trigger"]');
    await expect(wikiTrigger).toBeVisible({ timeout: 10000 });
    await wikiTrigger.click();

    // Esperar pelo estado vazio
    const emptyBlock = page.locator('[data-testid="wiki-ask-empty"]');
    await expect(emptyBlock).toBeVisible({ timeout: 15000 });
    await expect(emptyBlock).toContainText("Não encontrei resposta na wiki para essa pergunta");
  });
});
