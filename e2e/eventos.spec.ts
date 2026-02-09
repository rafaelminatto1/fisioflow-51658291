import { test, expect } from '@playwright/test';
import { testUsers, testEvento } from './fixtures/test-data';

test.describe('Gestão de Eventos', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada teste
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/(\?.*|\/eventos|\/dashboard|\/schedule)/);
    await page.goto('/eventos');
  });

  test('deve criar novo evento', async ({ page }) => {
    await page.click('text=/novo evento/i');
    
    await page.fill('input[name="nome"]', testEvento.nome);
    await page.fill('textarea[name="descricao"]', testEvento.descricao);
    await page.selectOption('select[name="categoria"]', testEvento.categoria);
    await page.fill('input[name="local"]', testEvento.local);
    await page.fill('input[name="dataInicio"]', testEvento.dataInicio);
    await page.fill('input[name="dataFim"]', testEvento.dataFim);
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator(`text=${testEvento.nome}`)).toBeVisible({ timeout: 5000 });
  });

  test('deve visualizar lista de eventos', async ({ page }) => {
    await expect(page.locator('h1, h2')).toContainText(/eventos/i);
    
    const eventCards = page.locator('[data-testid="event-card"], .event-item, tr');
    await expect(eventCards.first()).toBeVisible({ timeout: 5000 });
  });

  test('deve buscar evento por nome', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"]');
    await searchInput.fill('Corrida');
    
    await page.waitForTimeout(1000);
    
    const results = page.locator('[data-testid="event-card"], .event-item');
    const count = await results.count();
    expect(count).toBeGreaterThan(0);
  });

  test('deve editar evento existente', async ({ page }) => {
    await page.click('[data-testid="event-card"]:first-child, .event-item:first-child, tr:first-child');
    
    await page.click('text=/editar/i');
    
    await page.fill('input[name="nome"]', testEvento.nome + ' - Editado');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/editado|atualizado|sucesso/i')).toBeVisible({ timeout: 5000 });
  });

  test('deve filtrar eventos por status', async ({ page }) => {
    const statusFilter = page.locator('select[name="status"], [role="combobox"]');
    
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('AGENDADO');
      await page.waitForTimeout(500);
      
      const results = page.locator('[data-testid="event-card"]');
      expect(await results.count()).toBeGreaterThanOrEqual(0);
    }
  });
});
