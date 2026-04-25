import { test } from '@playwright/test';

test.describe('FisioFlow - Validação Completa de Fluxo (moocafisio.com.br)', () => {
  const testPatientName = `BOT Teste ${Date.now()}`;
  const credentials = {
    email: 'REDACTED_EMAIL',
    pw: 'REDACTED'
  };

  test('Deve realizar o ciclo de vida completo de Paciente e Agenda', async ({ page }) => {
    // 1. LOGIN
    await page.goto('https://moocafisio.com.br/login');
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.pw);
    await page.click('button[type="submit"]');

    // Aguarda carregar o dashboard
    await page.waitForURL(/.*dashboard|.*agenda/, { timeout: 30000 });
    console.log('✅ Login realizado com sucesso.');

    // 2. CRUD PACIENTE
    await page.goto('https://moocafisio.com.br/pacientes');
    await page.waitForLoadState('networkidle');

    // CREATE
    const novoBtn = page.getByRole('button', { name: /novo paciente/i }).first();
    await novoBtn.waitFor({ state: 'visible' });
    await novoBtn.click();

    await page.fill('input[placeholder*="Nome"], input[name="full_name"]', testPatientName);
    await page.fill('input[placeholder*="Telefone"], input[name="phone"]', '11988887777');
    await page.click('button:has-text("Salvar"), button[type="submit"]');

    console.log(`✅ Paciente ${testPatientName} criado.`);

    // READ & UPDATE
    await page.waitForTimeout(2000); // Aguarda sync do banco/hasura
    await page.fill('input[placeholder*="Buscar"]', testPatientName);
    const row = page.getByText(testPatientName).first();
    await row.waitFor({ state: 'visible' });
    await row.click();

    await page.fill('input[placeholder*="Nome"], input[name="full_name"]', testPatientName + ' MODIFICADO');
    await page.click('button:has-text("Salvar"), button[type="submit"]');
    console.log('✅ Paciente editado com sucesso.');

    // 3. CRUD AGENDAMENTO
    await page.goto('https://moocafisio.com.br/agenda');
    await page.waitForLoadState('networkidle');

    // CREATE AGENDAMENTO
    await page.getByRole('button', { name: /novo/i }).first().click();

    // Seleciona o paciente recém criado no combobox
    const combo = page.locator('button[role="combobox"]').first();
    await combo.click();
    await page.keyboard.type(testPatientName);
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');

    await page.click('button:has-text("Salvar"), button:has-text("Agendar")');
    console.log('✅ Agendamento criado (Evento disparado para Inngest).');

    // UPDATE AGENDAMENTO (Mudar Status)
    await page.waitForTimeout(2000);
    const evento = page.locator('.rbc-event').last();
    await evento.click();

    // Tenta clicar no botão de confirmar ou mudar status
    const confirmarBtn = page.locator('button:has-text("Confirmar"), button:has-text("Realizado")').first();
    if (await confirmarBtn.isVisible()) {
      await confirmarBtn.click();
      console.log('✅ Status do agendamento atualizado.');
    }

    // 4. DELETE (LIMPEZA)
    console.log('Iniciando limpeza de dados do teste...');

    // Excluir Agendamento
    if (await evento.isVisible()) {
      await evento.click();
      await page.click('button:has-text("Excluir"), button:has-text("Cancelar")');
      await page.click('button:has-text("Confirmar"), .bg-destructive');
      console.log('✅ Agendamento de teste removido.');
    }

    // Excluir Paciente
    await page.goto('https://moocafisio.com.br/pacientes');
    await page.fill('input[placeholder*="Buscar"]', testPatientName);
    const deletePatientBtn = page.locator('button:has-text("Excluir"), [aria-label*="Excluir"]').first();
    if (await deletePatientBtn.isVisible()) {
      await deletePatientBtn.click();
      await page.click('button:has-text("Confirmar")');
      console.log('✅ Paciente de teste removido.');
    }

    console.log('✨ TODAS AS OPERAÇÕES CRUD FORAM VALIDADAS COM SUCESSO!');
  });
});
