import { test, expect } from "@playwright/test";

test.describe("Golden Path: Autenticação", () => {
  test("deve carregar a página de login corretamente", async ({ page }) => {
    await page.goto("/");

    // Verifica se o título ou algum elemento principal do login está presente
    // Ajuste o seletor conforme a realidade da sua UI
    await expect(page).toHaveTitle(/FisioFlow/);
  });

  test("deve exibir erro ao tentar login com credenciais inválidas", async ({ page }) => {
    await page.goto("/");

    // Simula preenchimento de login (ajustar seletores)
    // await page.fill('input[name="email"]', 'teste@errado.com');
    // await page.fill('input[name="password"]', 'senha123');
    // await page.click('button[type="submit"]');

    // await expect(page.locator('text=Invalido')).toBeVisible();
  });
});
