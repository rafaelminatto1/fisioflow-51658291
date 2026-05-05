import { test, expect } from '@playwright/test';

test.describe('Pacotes de Sessão — Golden Path', () => {
  test('página financeira carrega sem erros', async ({ page }) => {
    await page.goto('/financeiro/contas');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login/);

    const errorBoundary = page.locator('text=/ROTA EM RECUPERAÇÃO|Something went wrong/i');
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 });
  });

  test('acesso a pacotes de paciente via perfil', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    const firstPatient = page.locator('a[href*="/patients/"]').first();
    await expect(firstPatient).toBeVisible({ timeout: 15000 });
    const href = await firstPatient.getAttribute('href');
    if (!href) return;

    await page.goto(href);
    await page.waitForLoadState('networkidle');

    // Procura aba ou seção de pacotes
    const packagesTab = page.getByRole('tab', { name: /pacote|financeiro/i }).first();
    if (await packagesTab.isVisible({ timeout: 5000 })) {
      await packagesTab.click();
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(/\/login/);
    }
  });

  test('dashboard financeiro mostra dados sem travar', async ({ page }) => {
    await page.goto('/financeiro/fluxo-caixa');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login/);

    const errorBoundary = page.locator('text=/ROTA EM RECUPERAÇÃO/i');
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 });
  });
});
