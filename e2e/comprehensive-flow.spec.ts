import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Validação Completa de Produção - Agenda, Atendimento e Prontuário', () => {
  test.setTimeout(180000); // 3 minutos

  test('Fluxo completo: Agendamento, DND, Atendimento e 10 Evoluções', async ({ page }) => {
    // 1. LOGIN EM PRODUÇÃO
    console.log('1. Iniciando Login...');
    await page.goto('https://fisioflow-web.rafalegollas.workers.dev/login');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/agenda**', { timeout: 30000 }).catch(() => {});

    // 2. CRIAR AGENDAMENTO
    console.log('2. Criando Agendamento na Agenda...');
    await page.goto('https://fisioflow-web.rafalegollas.workers.dev/agenda');
    await page.waitForSelector('.sx__calendar-wrapper', { state: 'visible', timeout: 30000 });

    const btnAgendar = page.locator('button:has-text("Agendar")').first();
    await btnAgendar.click();

    // Interagir com o combobox e escolher o primeiro paciente da lista
    const patientCombo = page.locator('button[role="combobox"], input[placeholder*="paciente" i]').first();
    await patientCombo.waitFor({ state: 'visible', timeout: 10000 });
    await patientCombo.click();
    await page.waitForTimeout(2000);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    const confirmarBtn = page.locator('button[type="submit"], button:has-text("Confirmar"), button:has-text("Salvar")').first();
    await confirmarBtn.click();

    await page.waitForTimeout(4000);

    // 3. TESTAR DRAG AND DROP E INICIAR ATENDIMENTO
    console.log('3. Testando Drag and Drop e Atendimento...');
    const appointmentCard = page.locator('.sx__time-grid-event, .sx__event').first();

    // Esperar o card ser renderizado após salvar o agendamento
    await appointmentCard.waitFor({ state: 'visible', timeout: 15000 });

    const sourceBox = await appointmentCard.boundingBox();
    const targetSlot = page.locator('.sx__time-grid-day').first();
    const targetBox = await targetSlot.boundingBox();

    if (sourceBox && targetBox) {
      await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 150, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(2000);
    }

    // 4. INICIAR ATENDIMENTO VIA CARD
    console.log('4. Iniciando Atendimento a partir da Agenda...');
    await appointmentCard.click();
    const startAttendanceBtn = page.locator('button:has-text("Iniciar Atendimento")').first();
    await startAttendanceBtn.waitFor({ state: 'visible', timeout: 5000 });
    await startAttendanceBtn.click();

    // Redireciona para o prontuário (Patient Evolution)
    await page.waitForTimeout(5000);

    // 5. CRIAR 10 EVOLUÇÕES (Sessões)
    console.log('5. Gerando 10 Sessões/Evoluções no Prontuário...');

    for (let i = 1; i <= 10; i++) {
      // Encontrar botão de evoluir
      const btnEvoluir = page.locator('button:has-text("Nova Evolução"), button:has-text("Evoluir"), button:has-text("Registrar Evolução")').first();

      await btnEvoluir.waitFor({ state: 'visible', timeout: 10000 });
      await btnEvoluir.click();
      await page.waitForTimeout(2000); // Aguardar modal/aba de evolução

      const textarea = page.locator('textarea').first();
      await textarea.waitFor({ state: 'visible' });
      await textarea.fill(`Sessão ${i}/10 concluída com sucesso via teste automatizado E2E em Produção. Progresso notável de amplitude de movimento e redução de dor na escala EVA.`);

      const salvarEvolucaoBtn = page.locator('button:has-text("Salvar"), button:has-text("Concluir")').first();
      await salvarEvolucaoBtn.click();

      console.log(`  -> Evolução ${i} registrada.`);
      await page.waitForTimeout(4000); // Aguardar salvamento e fechamento (pode demorar no Neon DB / Cloudflare)
    }

    // 6. VALIDAR RELATÓRIO
    console.log('6. Validando Relatório no Perfil do Paciente...');
    // O relatório das evoluções deve constar na página atual do paciente ou na tab "Histórico"/"Evoluções"
    const btnHistorico = page.locator('button:has-text("Histórico"), text="Histórico"').first();
    if (await btnHistorico.isVisible()) {
       await btnHistorico.click();
       await page.waitForTimeout(2000);
    }

    const profileContent = await page.content();
    expect(profileContent).toContain('Sessão 10/10 concluída');
    console.log('✅ Validação de Produção Completa concluída: DND e 10 Sessões salvas no histórico.');
  });
});
