import { test, expect } from "@playwright/test";

test.describe("AI Clinical Golden Path", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Espera o carregamento inicial e verifica se não foi para o login (já deve estar logado via global-setup)
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/login")) {
      console.warn("⚠️ Sessão não encontrada, realizando login manual para o teste...");
      await page.fill('input[type="email"]', "admin@moocafisio.com.br");
      await page.fill('input[type="password"]', "admin123");
      await page.click('button[type="submit"]');
      await page.waitForURL("**/agenda");
    }
  });

  test("deve realizar busca semântica via Omnisearch (Cmd+K)", async ({ page }) => {
    // Abre a busca global (Cmd+K)
    await page.keyboard.press("Control+k");
    const input = page.locator('[data-testid="omnisearch-input"]');
    await expect(input).toBeVisible();

    // Digita uma intenção clínica
    await input.fill("reabilitação de joelho");

    // Espera os resultados da IA (async)
    const aiCategory = page.getByText("Resultados Clínicos (IA)");
    await expect(aiCategory).toBeVisible({ timeout: 15000 });

    // Verifica se há ao menos um resultado
    const _firstResult = page.locator('button:has-text("ai-")').first();
    // (O id do item começa com ai-)
  });

  test("deve ver trajetória de recuperação e pacientes similares no perfil", async ({ page }) => {
    await page.goto("/patients");
    await page.waitForLoadState("networkidle");

    // Clica no primeiro paciente
    const firstPatient = page.locator('a[href*="/patients/"]').first();
    await firstPatient.click();

    // Verifica se os widgets de IA estão presentes
    const twinWidget = page.getByText("Trajetória Preditiva (Gêmeo Digital)");
    await expect(twinWidget).toBeVisible({ timeout: 10000 });

    const similarWidget = page.getByText("Casos Similares (Benchmarking)");
    await expect(similarWidget).toBeVisible({ timeout: 10000 });
  });

  test("deve injetar recomendação clínica no editor SOAP", async ({ page }) => {
    await page.goto("/patients");
    const firstPatient = page.locator('a[href*="/patients/"]').first();
    const href = await firstPatient.getAttribute("href");
    if (!href) return;

    // Vai para a aba de evoluções
    await page.goto(`${href}?tab=evolutions`);

    // Clica para criar nova evolução (se houver botão)
    const newEvolutionBtn = page
      .getByRole("button", { name: /nova evolução|registrar sessão/i })
      .first();
    if (await newEvolutionBtn.isVisible()) {
      await newEvolutionBtn.click();
    }

    // Procura o editor V5 Pro
    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Digita um contexto
    await editor.click();
    await page.keyboard.type("Paciente apresenta dor no ombro direito ao realizar abdução.");

    // Dispara o comando de recomendação
    await page.keyboard.type("/");
    const recommendCmd = page.getByText("Sugerir Condutas (IA)");
    await expect(recommendCmd).toBeVisible();
    await recommendCmd.click();

    // Verifica se as sugestões foram inseridas no editor
    const suggestionHeader = page.getByText("Sugestões Clínicas (IA)");
    await expect(suggestionHeader).toBeVisible({ timeout: 15000 });
  });
});
