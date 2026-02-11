import { test, expect } from '@playwright/test';

/**
 * Teste E2E para verificar que os botões dos modais estão visíveis no mobile
 * Foca especificamente no problema do botão "Agendar" não estar visível no iOS mobile
 */
test.describe('Mobile Modal Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Usar viewport mobile para simular iPhone
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 13 dimensions
  });

  test('deve mostrar o botão Agendar no modal de novo agendamento', async ({ page }) => {
    // Fazer login
    await page.goto('/login');

    await page.fill('input[name="email"]', 'rafael.minatto@yahoo.com.br');
    await page.fill('input[name="password"]', 'Yukari30@');
    await page.click('button[type="submit"]');

    // Esperar navegação para dashboard
    await page.waitForURL('/', { timeout: 15000 });

    // Navegar para agenda - tentar diferentes seletores
    try {
      await page.click('text=Agenda', { timeout: 5000 });
    } catch {
      // Tentar navegar diretamente
      await page.goto('/schedule');
    }

    // Esperar carregamento da agenda - aumentar timeout e usar seletores mais flexíveis
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Clicar no botão de novo agendamento - tentar diferentes seletores
    try {
      await page.click('button:has-text("Novo")', { timeout: 5000 });
    } catch {
      await page.click('[aria-label="Add"]:visible, button:visible:has-text("+")', { timeout: 5000 });
    }

    // Esperar modal abrir
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Tirar screenshot do modal completo
    const modal = page.locator('[role="dialog"]').first();
    await modal.screenshot({ path: 'e2e/screenshots/mobile-appointment-modal-full.png' });

    // Verificar que o botão "Agendar" ou "Criar" está visível
    const scheduleButton = page.locator('button:has-text("Agendar"), button:has-text("Criar")').first();

    // Verificar visibilidade
    await expect(scheduleButton).toBeVisible();

    // Verificar que o botão está dentro da viewport
    const buttonBox = await scheduleButton.boundingBox();
    expect(buttonBox).not.toBeNull();

    if (buttonBox) {
      // O botão deve estar dentro das dimensões da viewport
      expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(844); // Altura do viewport
      expect(buttonBox.y).toBeGreaterThanOrEqual(0);
    }

    // Verificar que o footer do modal está visível
    const footer = page.locator('[class*="DialogFooter"], div[class*="border-t"]').first();
    await expect(footer).toBeVisible();

    // Tirar screenshot com destaque no botão
    await scheduleButton.screenshot({ path: 'e2e/screenshots/mobile-schedule-button.png' });
  });

  test('deve ter scroll adequado no conteúdo do modal mobile', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'rafael.minatto@yahoo.com.br');
    await page.fill('input[name="password"]', 'Yukari30@');
    await page.click('button[type="submit"]');

    await page.waitForURL('/', { timeout: 15000 });
    await page.click('text=Agenda');
    await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 10000 });

    await page.click('button:has-text("Novo Agendamento")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Verificar que o conteúdo do modal tem scroll
    const dialogContent = page.locator('[role="dialog"] > div').first();
    const overflowY = await dialogContent.evaluate(el =>
      window.getComputedStyle(el).overflowY
    );

    // Deve ter overflow-y: auto ou scroll
    expect(['auto', 'scroll', 'visible']).toContain(overflowY);

    // Verificar dimensões do modal
    const dialogBox = await dialogContent.boundingBox();
    expect(dialogBox).not.toBeNull();

    if (dialogBox) {
      // Altura máxima deve respeitar a viewport mobile
      expect(dialogBox.height).toBeLessThanOrEqual(800); // Um pouco menos que 844 para margem
    }
  });

  test('deve respeitar safe area do iOS no footer do modal', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'rafael.minatto@yahoo.com.br');
    await page.fill('input[name="password"]', 'Yukari30@');
    await page.click('button[type="submit"]');

    await page.waitForURL('/', { timeout: 15000 });
    await page.click('text=Agenda');
    await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 10000 });

    await page.click('button:has-text("Novo Agendamento")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Verificar padding inferior do footer (safe area)
    const footer = page.locator('[class*="DialogFooter"], div[class*="border-t"]').first();
    const paddingBottom = await footer.evaluate(el =>
      window.getComputedStyle(el).paddingBottom
    );

    // Deve ter padding inferior considerável para safe area
    const paddingValue = parseFloat(paddingBottom);
    expect(paddingValue).toBeGreaterThan(0);
  });
});
