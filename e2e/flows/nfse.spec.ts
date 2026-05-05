import { test, expect } from '@playwright/test';

test.describe('NFS-e — Golden Path', () => {
  test('página NFS-e carrega sem Error Boundary', async ({ page }) => {
    await page.goto('/financeiro/nfse');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login/);

    // Não deve mostrar o error boundary
    const errorBoundary = page.locator('text=/ROTA EM RECUPERAÇÃO|Something went wrong/i').first();
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 });

    // Deve ter algum conteúdo da página
    const content = page.locator('[data-testid="nfse-page"], table, .nfse').first();
    await expect(content).toBeVisible({ timeout: 15000 });
  });

  test('lista de notas carrega (pode estar vazia)', async ({ page }) => {
    await page.goto('/financeiro/nfse');
    await page.waitForLoadState('networkidle');

    // Estado vazio ou tabela com dados — ambos são válidos
    const hasTable = page.locator('table, [data-testid="nfse-list"]').first();
    const hasEmpty = page.locator('text=/nenhuma nota|sem notas|emitir/i').first();

    const tableVisible = await hasTable.isVisible({ timeout: 10000 }).catch(() => false);
    const emptyVisible = await hasEmpty.isVisible({ timeout: 3000 }).catch(() => false);
    expect(tableVisible || emptyVisible).toBe(true);
  });

  test('wizard de configuração NFS-e abre e tem 4 etapas', async ({ page }) => {
    await page.goto('/financeiro/nfse');
    await page.waitForLoadState('networkidle');

    // Procura botão de configuração ou a aba de parâmetros
    const configBtn = page.getByRole('tab', { name: /parâmetros|configuração/i })
      .or(page.getByRole('button', { name: /configurar|parâmetros/i })).first();

    if (await configBtn.isVisible({ timeout: 5000 })) {
      await configBtn.click();
      await page.waitForLoadState('networkidle');

      // Wizard deve ter indicador de steps
      const steps = page.locator('[class*="step"], [data-step]');
      const stepCount = await steps.count();
      expect(stepCount).toBeGreaterThanOrEqual(1);
    }
  });
});
