import { test, expect } from '@playwright/test';
import { testUsers, testChecklistItem } from './fixtures/test-data';

test.describe('Gestão de Checklist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/(\?.*|\/eventos|\/dashboard|\/schedule)/);
    await page.goto('/eventos');
    
    // Clica no primeiro evento
    await page.click('[data-testid="event-card"]:first-child, .event-item:first-child, tr:first-child');
    
    // Navega para aba checklist
    await page.click('text=/checklist/i');
  });

  test('deve adicionar item ao checklist', async ({ page }) => {
    await page.click('text=/adicionar|novo item/i');
    
    await page.fill('input[name="titulo"]', testChecklistItem.titulo);
    await page.selectOption('select[name="tipo"]', testChecklistItem.tipo);
    await page.fill('input[name="quantidade"]', testChecklistItem.quantidade.toString());
    await page.fill('input[name="custoUnitario"]', testChecklistItem.custoUnitario.toString());
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator(`text=${testChecklistItem.titulo}`)).toBeVisible({ timeout: 5000 });
  });

  test('deve marcar item como concluído', async ({ page }) => {
    const firstItem = page.locator('[data-testid="checklist-item"]:first-child, tr:first-child');
    
    if (await firstItem.isVisible()) {
      await firstItem.click();
      await page.click('text=/marcar como concluído|concluir/i');
      
      await expect(page.locator('text=/OK|concluído|sucesso/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('deve visualizar totais por tipo', async ({ page }) => {
    // Verifica se há cards ou resumo de totais
    const totalsSection = page.locator('text=/total|levar|alugar|comprar/i');
    await expect(totalsSection.first()).toBeVisible();
  });

  test('deve editar item do checklist', async ({ page }) => {
    await page.click('[data-testid="checklist-item"]:first-child, tr:first-child');
    await page.click('text=/editar/i');
    
    await page.fill('input[name="quantidade"]', '10');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/atualizado|sucesso/i')).toBeVisible({ timeout: 5000 });
  });

  test('deve excluir item do checklist', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept()); // Auto-aceita confirmação
    
    await page.click('[data-testid="checklist-item"]:first-child, tr:first-child');
    await page.click('text=/excluir|remover/i');
    
    await expect(page.locator('text=/removido|excluído/i')).toBeVisible({ timeout: 5000 });
  });
});
