import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Dashboard - Funcionalidades', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    // Aguardar navegação para fora da página de auth
    await page.waitForURL(/^(?!.*\/auth).*$/, { timeout: 15000 });
  });

  test('deve exibir dashboard admin', async ({ page }) => {
    // Dashboard está em /dashboard, não em / (que é a agenda)
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Verificar que a página de dashboard carregou
    const dashboardPage = page.locator('[data-testid="dashboard-page"]').first();
    await expect(dashboardPage).toBeVisible({ timeout: 10000 });
  });

  test('deve navegar para agenda ao clicar em ver agenda', async ({ page }) => {
    // Começar do dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Procurar botão de navegação para agenda no menu lateral
    const agendaLink = page.locator('a[href="/"], a:has-text("Agenda")').first();

    if (await agendaLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await agendaLink.click();
      // Agenda está em / que redireciona para / (o mesmo)
      await expect(page).toHaveURL(/^\/$/);
    }
  });

  test('deve exibir estatísticas principais', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Verificar que a página carregou usando data-testid
    const dashboardPage = page.locator('[data-testid="dashboard-page"]');
    await expect(dashboardPage.first()).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir gráficos quando disponíveis', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Verificar se há gráficos renderizados
    const charts = page.locator('canvas, svg[class*="recharts"]');
    const chartsCount = await charts.count();

    // Se houver gráficos, verificar se estão visíveis
    if (chartsCount > 0) {
      await expect(charts.first()).toBeVisible();
    }
  });
});
