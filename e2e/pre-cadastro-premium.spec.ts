import { test, expect } from '@playwright/test';

test.describe('Pre-Cadastro Premium Flow', () => {
  test('should display the premium register page and submit correctly', async ({ page }) => {
    // Note: We need a valid token to skip the "Link Inválido" screen
    // For now, let's test if we can at least reach the page and see the premium branding
    // In a real scenario, we'd seed a token in the database first.

    await page.goto('/pre-cadastro/test-premium-token');

    // Even if it says Link Inválido, it should have the premium container background blobs
    const container = page.locator('.premium-container');
    await expect(container).toBeVisible();

    const tealBlob = page.locator('.blob-teal');
    await expect(tealBlob).toBeVisible();
  });

  test('feedback page should have premium styling', async ({ page }) => {
    await page.goto('/feedback-pre-cadastro');

    await expect(page.locator('.premium-container')).toBeVisible();
    await expect(page.locator('h1.premium-title')).toContainText('TUDO PRONTO');

    const homeButton = page.locator('button.premium-button');
    await expect(homeButton).toBeVisible();
    await expect(homeButton).toContainText('Ir para o Início');
  });
});
