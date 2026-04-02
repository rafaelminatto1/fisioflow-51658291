import { test, expect } from '@playwright/test';

test.describe('Agenda - Fluxo de Criação (Schedule-X)', () => {
  test.beforeEach(async ({ page }) => {
    // Acessar a URL de produção/staging
    await page.goto('https://fisioflow-web.rafalegollas.workers.dev/agenda');
    
    // Se redirecionar para login, precisamos lidar com isso (assumindo que já existe um estado de storage ou precisamos logar)
    if (page.url().includes('/auth')) {
      // Implementar login rápido aqui se necessário
    }

    // Esperar o calendário carregar
    await page.waitForSelector('.sx__calendar-wrapper', { timeout: 15000 });
  });

  test('deve abrir modal de novo agendamento ao clicar em espaço vazio', async ({ page }) => {
    // 1. Localizar um slot de tempo vazio no grid (ex: 09:00)
    // No Schedule-X, os slots costumam ter classes como .sx__time-grid-day
    const timeSlot = page.locator('.sx__time-grid-day').first();
    
    // 2. Clicar em uma posição específica do slot
    await timeSlot.click({ position: { x: 50, y: 100 } });

    // 3. Validar se o modal de agendamento abriu
    const modal = page.locator('text=Novo Agendamento');
    await expect(modal).toBeVisible();

    // 4. Validar se os campos de data/hora foram preenchidos (opcional, dependendo da implementação)
    // const timeInput = page.locator('input[type="time"]');
    // await expect(timeInput).not.toHaveValue('');
  });

  test('deve criar um novo agendamento via botão principal', async ({ page }) => {
    // 1. Clicar no botão de criar
    await page.click('button:has-text("Novo Agendamento")');

    // 2. Preencher dados básicos
    await page.click('text=Selecionar Paciente');
    await page.keyboard.type('Paciente Teste');
    await page.keyboard.press('Enter');

    // 3. Salvar
    await page.click('button:has-text("Confirmar")');

    // 4. Validar toast de sucesso ou fechamento do modal
    await expect(page.locator('text=Agendamento criado')).toBeVisible();
  });
});
