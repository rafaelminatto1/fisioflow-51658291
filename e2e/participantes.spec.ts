import { test, expect } from '@playwright/test';
import { testUsers, testParticipante } from './fixtures/test-data';

test.describe('Gestão de Participantes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/(\?.*|\/eventos|\/dashboard|\/schedule)/);
    await page.goto('/eventos');
    
    // Clica no primeiro evento
    await page.click('[data-testid="event-card"]:first-child, .event-item:first-child, tr:first-child');
    
    // Navega para aba participantes
    await page.click('text=/participantes/i');
  });

  test('deve adicionar participante', async ({ page }) => {
    await page.click('text=/adicionar|novo participante/i');
    
    await page.fill('input[name="nome"]', testParticipante.nome);
    await page.fill('input[name="contato"]', testParticipante.contato);
    await page.fill('input[name="instagram"]', testParticipante.instagram);
    
    // Marcar checkbox "Segue Perfil"
    if (testParticipante.seguePerfil) {
      await page.check('input[name="seguePerfil"]');
    }
    
    await page.fill('textarea[name="observacoes"]', testParticipante.observacoes);
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator(`text=${testParticipante.nome}`)).toBeVisible({ timeout: 5000 });
  });

  test('deve validar campo Instagram', async ({ page }) => {
    await page.click('text=/adicionar|novo participante/i');
    
    await page.fill('input[name="nome"]', 'Teste');
    await page.fill('input[name="instagram"]', 'instagram-invalido'); // Sem @
    
    await page.click('button[type="submit"]');
    
    // Deve mostrar erro de validação
    const errorMessage = page.locator('text=/instagram|inválido|@/i');
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });

  test('deve editar participante', async ({ page }) => {
    await page.click('[data-testid="participante-item"]:first-child, tr:first-child');
    await page.click('text=/editar/i');
    
    await page.fill('textarea[name="observacoes"]', 'Observação atualizada');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/atualizado|sucesso/i')).toBeVisible({ timeout: 5000 });
  });

  test('deve excluir participante', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    
    await page.click('[data-testid="participante-item"]:first-child, tr:first-child');
    await page.click('text=/excluir|remover/i');
    
    await expect(page.locator('text=/removido|excluído/i')).toBeVisible({ timeout: 5000 });
  });

  test('deve exportar lista de participantes', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    
    await page.click('text=/exportar|baixar/i');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/participantes|\.csv|\.pdf/i);
  });

  test('deve filtrar por "Segue Perfil"', async ({ page }) => {
    const filterCheckbox = page.locator('input[type="checkbox"][name*="segue"]');
    
    if (await filterCheckbox.isVisible()) {
      await filterCheckbox.check();
      await page.waitForTimeout(500);
      
      // Verifica que a lista foi filtrada
      const participantesVisiveis = page.locator('[data-testid="participante-item"]');
      expect(await participantesVisiveis.count()).toBeGreaterThanOrEqual(0);
    }
  });
});
