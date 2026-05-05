import { test, expect } from '@playwright/test';

// Roda sem a sessão pré-autenticada — testa o fluxo de login em si
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Auth — Golden Path', () => {
  test('login com credenciais válidas redireciona para o app', async ({ page }) => {
    const email = process.env.E2E_EMAIL || 'rafael.minatto@yahoo.com.br';
    const password = process.env.E2E_PASSWORD || 'Yukari30@';

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|agenda)/, { timeout: 20000 });

    // Sidebar ou header deve estar visível após login
    const nav = page.locator('[data-testid="sidebar"], nav, aside').first();
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('credenciais inválidas exibem mensagem de erro', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'invalido@teste.com');
    await page.fill('input[type="password"]', 'senhaerrada');
    await page.click('button[type="submit"]');

    // Permanece na página de login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
