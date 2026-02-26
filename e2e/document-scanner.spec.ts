import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

async function loginIfNeeded(page: any) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  if (!page.url().includes('/auth')) {
    return;
  }

  const emailInput = page.locator('input[name="email"], #login-email').first();
  const passwordInput = page.locator('input[name="password"], #login-password').first();
  await expect(emailInput).toBeVisible({ timeout: 15000 });
  await emailInput.fill(testUsers.rafael.email);
  await passwordInput.fill(testUsers.rafael.password);
  await passwordInput.press('Enter');

  const submitButton = page.locator('button[type="submit"]').first();
  if (await submitButton.isVisible().catch(() => false)) {
    await submitButton.click();
  }

  const fallbackButton = page.getByRole('button', { name: /entrar|login/i }).first();
  if (await fallbackButton.isVisible().catch(() => false)) {
    await fallbackButton.click();
  }
  await page.waitForURL((url: any) => !url.pathname.includes('/auth'), { timeout: 45000 });
}

test.describe('Document Scanner', () => {
  test('autocomplete de paciente aceita digitação e exibe resultados', async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto('/ai/scanner', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Digitalizador Inteligente de Laudos/i })).toBeVisible({ timeout: 15000 });

    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3+K4QAAAAASUVORK5CYII=',
      'base64'
    );
    await page.setInputFiles('input[type="file"]', {
      name: 'scanner-test.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    });

    const comboboxButton = page.getByTestId('patient-select');
    await comboboxButton.click();

    const searchInput = page.getByTestId('patient-search');
    await searchInput.fill('teste');
    await expect(searchInput).toHaveValue('teste');

    const resultsList = page.locator('[cmdk-list], [data-cmdk-list]');
    await expect(resultsList).toBeVisible();

    const emptyState = page.locator('text=/Nenhum paciente encontrado/i');
    const anyResult = page.locator('[role="option"]');
    await expect(emptyState.or(anyResult)).toBeVisible();
  });
});
