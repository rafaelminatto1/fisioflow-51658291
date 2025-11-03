import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Dashboard - Funcionalidades', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(eventos|dashboard|schedule)/);
  });

  test('deve exibir dashboard admin', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verificar elementos principais
    await expect(page.locator('h1, h2').filter({ hasText: /Dashboard|Bem-vindo/ })).toBeVisible();
  });

  test('deve navegar para agenda ao clicar em ver agenda', async ({ page }) => {
    await page.goto('/');
    
    // Procurar botão de navegação para agenda
    const agendaButton = page.locator('button:has-text("Ver Agenda"), a:has-text("Agenda")').first();
    
    if (await agendaButton.isVisible()) {
      await agendaButton.click();
      await expect(page).toHaveURL(/\/schedule/);
    }
  });

  test('deve exibir estatísticas principais', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verificar presença de cards de estatísticas
    const statsCards = page.locator('[class*="CardContent"], [class*="stat"]');
    await expect(statsCards.first()).toBeVisible();
  });

  test('deve exibir gráficos quando disponíveis', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verificar se há gráficos renderizados
    const charts = page.locator('canvas, svg[class*="recharts"]');
    const chartsCount = await charts.count();
    
    // Se houver gráficos, verificar se estão visíveis
    if (chartsCount > 0) {
      await expect(charts.first()).toBeVisible();
    }
  });
});
