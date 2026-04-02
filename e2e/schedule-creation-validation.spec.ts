import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Agenda - Fluxo de Criação (Schedule-X) - Produção', () => {
  test.beforeEach(async ({ page }) => {
    // Acessar a URL de produção/staging
    await page.goto('https://fisioflow-web.rafalegollas.workers.dev/login');
    
    // Login
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');

    // Navegar para a agenda após o login
    await page.waitForURL('**/agenda**', { timeout: 30000 }).catch(() => {
      // Se não redirecionou automaticamente, forçamos a navegação
      page.goto('https://fisioflow-web.rafalegollas.workers.dev/agenda');
    });

    // Esperar o calendário carregar completamente
    await page.waitForSelector('.sx__calendar-wrapper', { state: 'visible', timeout: 30000 });
    // Dar um pequeno tempo para os eventos renderizarem no DOM
    await page.waitForTimeout(2000);
  });

  test('deve abrir modal de novo agendamento ao clicar em espaço vazio', async ({ page }) => {
    // 1. Localizar um slot de tempo vazio no grid
    const timeSlot = page.locator('.sx__time-grid-day').first();
    
    // 2. Clicar no slot
    await timeSlot.click({ position: { x: 50, y: 100 } });

    // 3. Validar se o modal de agendamento abriu
    const modal = page.locator('text=Novo Agendamento').first();
    await expect(modal).toBeVisible({ timeout: 10000 });
  });

  test('deve permitir interagir com um agendamento existente (iniciar atendimento e DND)', async ({ page }) => {
    // Procura por um agendamento (evento) no grid
    const appointment = page.locator('.sx__time-grid-event').first();
    
    // Verifica se há pelo menos um agendamento visível antes de testar
    if (await appointment.isVisible()) {
      // 1. Abrir o popover do agendamento
      await appointment.click();
      
      // 2. Localizar o botão "Iniciar Atendimento"
      const startButton = page.locator('button:has-text("Iniciar Atendimento")');
      await expect(startButton).toBeVisible();

      // Fechar popover
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Testar DND
      const sourceBox = await appointment.boundingBox();
      const targetSlot = page.locator('.sx__time-grid-day').first();
      const targetBox = await targetSlot.boundingBox();

      if (sourceBox && targetBox) {
        // Simular drag and drop
        await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 200, { steps: 10 });
        await page.mouse.up();

        // Validar toast de sucesso (Optimistic UI + API)
        await expect(page.locator('text=Horário atualizado com sucesso')).toBeVisible({ timeout: 5000 });
      }

    } else {
      console.log('Nenhum agendamento encontrado no dia atual para testar o card.');
    }
  });
});
