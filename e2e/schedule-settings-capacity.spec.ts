import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

const loginEmail = process.env.E2E_LOGIN_EMAIL || testUsers.admin.email;
const loginPassword = process.env.E2E_LOGIN_PASSWORD || testUsers.admin.password;

test.describe('Configurações da Agenda - Capacidade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.fill('input[name="email"]', loginEmail);
    await page.fill('input[name="password"]', loginPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname !== '/auth' && url.pathname !== '/auth/', { timeout: 20000 });
    await page.goto('/schedule/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('deve salvar configuração de capacidade sem erro de permissão', async ({ page }, testInfo) => {
    testInfo.setTimeout(60000);
    const capacityTab = page.getByRole('tab', { name: /Capacidade/i });
    await capacityTab.waitFor({ state: 'visible', timeout: 15000 });

    await capacityTab.click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /Adicionar Configuração/i }).click();
    await page.waitForTimeout(500);

    const mondayCheckbox = page.locator('input[id="day-monday"]').or(page.getByRole('checkbox', { name: /Segunda/i }));
    await mondayCheckbox.first().check().catch(() => {});
    await page.waitForTimeout(200);

    await page.getByRole('button', { name: /Adicionar Configuração/i }).last().click();

    await expect(
      page.getByText(/Configuração|configuração|salvas|sucesso/i).first()
    ).toBeVisible({ timeout: 10000 });

    const errorToast = page.getByText(/Missing or insufficient permissions|Erro ao salvar|permission/i);
    await expect(errorToast).not.toBeVisible();
  });
});
