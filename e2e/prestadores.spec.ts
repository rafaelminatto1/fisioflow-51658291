import { test, expect } from '@playwright/test';
import { testUsers, testPrestador } from './fixtures/test-data';

test.describe('Gestão de Prestadores', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/(\?.*|\/eventos|\/dashboard|\/schedule)/);
    await page.goto('/eventos');
    
    // Clica no primeiro evento para ver detalhes
    await page.click('[data-testid="event-card"]:first-child, .event-item:first-child, tr:first-child');
    
    // Navega para aba de prestadores
    await page.click('text=/prestadores/i');
  });

  test('deve adicionar prestador a evento', async ({ page }) => {
    await page.click('text=/adicionar|novo prestador/i');
    
    await page.fill('input[name="nome"]', testPrestador.nome);
    await page.fill('input[name="contato"]', testPrestador.contato);
    await page.fill('input[name="cpfCnpj"]', testPrestador.cpfCnpj);
    await page.fill('input[name="valorAcordado"]', testPrestador.valorAcordado.toString());
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator(`text=${testPrestador.nome}`)).toBeVisible({ timeout: 5000 });
  });

  test('deve marcar pagamento como pago', async ({ page }) => {
    // Encontra o primeiro prestador PENDENTE
    const pendingRow = page.locator('text=/PENDENTE/i').first();
    
    if (await pendingRow.isVisible()) {
      await pendingRow.click();
      await page.click('text=/marcar como pago|pagar/i');
      
      await expect(page.locator('text=/PAGO|sucesso/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('deve editar prestador', async ({ page }) => {
    await page.click('[data-testid="prestador-item"]:first-child, tr:first-child');
    await page.click('text=/editar/i');
    
    await page.fill('input[name="valorAcordado"]', '300');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/atualizado|sucesso/i')).toBeVisible({ timeout: 5000 });
  });

  test('deve exportar lista de prestadores', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    
    await page.click('text=/exportar|baixar/i');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv|\.pdf/i);
  });
});
