import { test, expect } from "@playwright/test";

/**
 * Pergunte à Wiki (Cmd+K → WikiAskView). US2.
 *
 * Pré-requisitos para passar:
 * - app rodando (baseURL) + sessão autenticada (auth.setup.ts / storageState)
 * - instância AI Search `fisioflow-rag` com conteúdo indexado
 * Sem índice, o fluxo cai no estado "não encontrei" (data-testid=wiki-ask-empty),
 * que o teste também aceita como caminho válido da feature.
 */
test.describe("Pergunte à Wiki (Cmd+K)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/login")) {
      await page.fill('input[type="email"]', process.env.E2E_EMAIL || "admin@moocafisio.com.br");
      await page.fill('input[type="password"]', process.env.E2E_PASSWORD || "admin123");
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|agenda)/, { timeout: 20000 });
    }
  });

  test("abre a paleta, pergunta e mostra resposta ou estado sem-resultado", async ({ page }) => {
    await page.keyboard.press("Control+k");

    const input = page.getByPlaceholder(/Buscar paciente/i);
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill("reabilitação de joelho pós-operatório");

    const askTrigger = page.getByTestId("wiki-ask-trigger");
    await expect(askTrigger).toBeVisible({ timeout: 5000 });
    await askTrigger.click();

    // A resposta gerada (com fontes) OU o estado "não encontrei" — ambos válidos.
    const answer = page.getByTestId("wiki-ask-answer");
    const empty = page.getByTestId("wiki-ask-empty");
    await expect(answer.or(empty)).toBeVisible({ timeout: 20000 });
  });

  test("não expõe 'Perguntar à wiki' para query muito curta", async ({ page }) => {
    await page.keyboard.press("Control+k");
    const input = page.getByPlaceholder(/Buscar paciente/i);
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill("ab");
    await expect(page.getByTestId("wiki-ask-trigger")).toHaveCount(0);
  });
});
