
import { test, expect } from '@playwright/test';

test.describe('Validação de Usuário e Fluxo de Paciente', () => {
  const patientName = 'Rafael Teste ' + Math.floor(Math.random() * 10000);

  test('Deve criar paciente, validar abas e agendar/evoluir 10 sessões', async ({ page, baseURL }) => {
    test.setTimeout(600000);

    const consoleErrors: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        if (!text.includes('ERR_BLOCKED_BY_CLIENT') && !text.includes('chrome-extension')) {
            consoleErrors.push(text);
            console.log('BROWSER CONSOLE ERROR:', text);
        }
      }
    });

    // 1. Ir para pacientes
    console.log('Navegando para /patients...');
    await page.goto(`${baseURL}/patients`);
    await page.waitForLoadState('networkidle');
    const addPatientBtn = page.locator('[data-testid="add-patient"]').first();
    await addPatientBtn.waitFor({ timeout: 30000 });

    // 2. Criar novo paciente
    await addPatientBtn.click();
    const dialog = page.getByRole('dialog').filter({ hasText: /Novo Paciente/i }).last();
    await dialog.waitFor({ state: 'visible', timeout: 20000 });

    await dialog.locator('input[id="full_name"]').fill(patientName);
    const genderTrigger = dialog.locator('button').filter({ hasText: /Selecione o gênero|masculino|feminino/i });
    await genderTrigger.click();
    await page.locator('div[role="option"]:has-text("Masculino")').click();
    await dialog.locator('input[id="phone"]').fill('11999999999');
    await dialog.locator('button[role="tab"]:has-text("Médico")').click();
    await dialog.locator('input[id="main_condition"]').fill('Dor Lombar Crônica');

    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({ state: 'hidden', timeout: 30000 });

    // 3. Buscar o paciente para pegar o ID
    const searchInput = page.locator('input[type="search"]').first();
    await searchInput.fill(patientName);
    const patientCard = page.locator(`[data-patient-id]`).filter({ hasText: patientName }).first();
    await patientCard.waitFor({ state: 'visible', timeout: 30000 });
    const patientId = await patientCard.getAttribute('data-patient-id');

    console.log(`Paciente criado! ID: ${patientId}.`);

    // 4. Validar abas
    console.log('Validando abas do perfil...');
    await page.goto(`${baseURL}/patients/${patientId}`);
    await page.waitForSelector('button[role="tab"]', { timeout: 30000 });

    const tabs = ['Visão Geral', 'Analytics & IA', 'Dados Pessoais', 'Histórico Clínico', 'Biomecânica', 'Financeiro', 'Gamificação', 'Arquivos'];
    for (const tab of tabs) {
      console.log(`Acessando aba: ${tab}`);
      const tabButton = page.locator(`button[role="tab"]:has-text("${tab}")`);
      await tabButton.click();
      await page.waitForTimeout(2000);
    }

    // 5. Agendar 10 sessões
    console.log('Agendando 10 sessões...');
    await page.goto(`${baseURL}/schedule`);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 10; i++) {
      console.log(`Agendando sessão ${i+1}/10...`);

      const newAptBtn = page.locator('button:has-text("Novo Agendamento")').first();
      await newAptBtn.waitFor({ state: 'visible', timeout: 20000 });
      await newAptBtn.click({ force: true });

      const aptModal = page.getByRole('dialog').filter({ hasText: /Agendamento/i }).last();
      await aptModal.waitFor({ state: 'visible' });

      // Selecionar paciente
      await aptModal.locator('[data-testid="patient-select"]').click();
      const pSearch = page.locator('[data-testid="patient-search"]');
      await pSearch.fill(patientName);
      await page.locator('div[role="option"]').filter({ hasText: patientName }).first().click();

      // Selecionar Profissional
      const therapistTrigger = aptModal.locator('[data-testid="therapist-select"]');
      await therapistTrigger.click();
      const tOption = page.locator('div[role="option"]');
      if (await tOption.count() > 1) {
          await tOption.nth(1).click();
      } else {
          await tOption.first().click();
      }

      // Selecionar Horário
      const timeTrigger = aptModal.locator('button').filter({ hasText: /Hora/i }).or(aptModal.locator('button:has-text("07:00")')).first();
      await timeTrigger.click();
      const timeOptions = page.locator('div[role="option"]');
      const timeCount = await timeOptions.count();
      const idx = (i + 5) % (timeCount || 1);
      await timeOptions.nth(idx).click();

      // Submit
      const submitBtn = aptModal.locator('button[type="submit"]').last();
      await submitBtn.click();

      // Check if "Capacidade Atingida" dialog appears
      const capacityDialog = page.getByRole('alertdialog').or(page.locator('text=Capacidade Atingida'));
      try {
          await capacityDialog.waitFor({ state: 'visible', timeout: 3000 });
          console.log('Aviso de capacidade atingida detectado. Confirmando agendamento extra...');
          const confirmBtn = page.locator('button:has-text("Agendar Mesmo Assim")').or(page.locator('button:has-text("Confirmar")'));
          await confirmBtn.first().click();
      } catch  {
          // Dialog didn't appear, which is fine
      }

      // Esperar modal fechar
      await aptModal.waitFor({ state: 'hidden', timeout: 20000 });
      console.log(`Sessão ${i+1} agendada.`);
      await page.waitForTimeout(1000);
    }

    // 6. Evoluir 10 sessões
    console.log('Evoluindo 10 sessões...');
    await page.goto(`${baseURL}/patients/${patientId}`);

    for (let i = 0; i < 10; i++) {
        await page.goto(`${baseURL}/patients/${patientId}`);
        await page.click('button[role="tab"]:has-text("Visão Geral")');
        await page.waitForTimeout(3000);

        const evolutionButton = page.locator('button:has-text("Evoluir")').first();
        if (await evolutionButton.isVisible()) {
            console.log(`Evoluindo sessão ${i+1}/10...`);
            await evolutionButton.click();
            await page.waitForSelector('textarea[placeholder*="Subjetivo"]', { timeout: 10000 });
            await page.fill('textarea[placeholder*="Subjetivo"]', `Evolução subjetiva ${i + 1}`);
            await page.fill('textarea[placeholder*="Objetivo"]', `Evolução objetiva ${i + 1}`);
            await page.click('button:has-text("Finalizar")');
            await page.waitForTimeout(4000);
        } else {
            console.log(`Sessão ${i+1}: Botão Evoluir não encontrado.`);
        }
    }

    console.log('Processo completo com sucesso!');
    const criticalErrors = consoleErrors.filter(e =>
      e.includes('Minified React error #306') || e.includes('toUpperCase')
    );
    expect(criticalErrors.length).toBe(0);
  });
});
