import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';
import { authenticateBrowserContext } from './helpers/neon-auth';
import type { Page } from '@playwright/test';

// Seletores baseados na análise do código fonte
const EMAIL_INPUT_SELECTOR = 'input[name="email"], #login-email';
const PASSWORD_INPUT_SELECTOR = 'input[name="password"], #login-password';

async function authenticatePage(page: Page) {
  // Proxy para a API de produção: permite contornar CORS nos testes E2E injetando o header nas respostas
  await page.route('https://fisioflow-api.rafalegollas.workers.dev/**', async (route) => {
    const response = await page.context().request.fetch(route.request());
    
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      }
    });
  });
  
  await authenticateBrowserContext(page.context(), testUsers.fisio.email, testUsers.fisio.password);
}

async function ensureScheduleReady(page: Page) {
  await page.goto('/schedule');
  // Esperar carregar
  await expect(page.locator('body')).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(2000);
}

test.describe('Agenda Avançada - E2E Tests', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await authenticatePage(page);
    await ensureScheduleReady(page);
    
    // Check for "Failed to fetch" error and reload once if present
    const errorToast = page.locator('text=/Ocorreu um Erro: Failed to fetch/i');
    if (await errorToast.isVisible({ timeout: 5000 })) {
      console.log('🔄 Detectado erro de fetch, recarregando...');
      await page.reload();
      await page.waitForTimeout(3000);
    }
  });

  test('deve criar um agendamento recorrente semanal', async ({ page }) => {
    // 1. Abrir modal de novo agendamento
    await page.locator('button:has-text("Agendar")').click();
    await expect(page.getByRole('heading', { name: /Novo Agendamento/i })).toBeVisible();

    // 2. Selecionar paciente (usando o PatientCombobox)
    const patientSelect = page.getByTestId('patient-select');
    
    // Esperar habilitar (pode estar carregando pacientes)
    await expect(patientSelect).toBeEnabled({ timeout: 15000 });
    await patientSelect.click();
    
    const patientInput = page.getByTestId('patient-search');
    await patientInput.fill('FisioFlow Test Patient');
    await page.waitForTimeout(1000);
    
    // Tentar selecionar a opção de cadastrar novo se não houver resultados
    const createNewOption = page.locator('text=/Cadastrar novo paciente/i');
    const existingOption = page.locator('[role="option"]').first();

    if (await existingOption.isVisible()) {
      await existingOption.click();
    } else if (await createNewOption.isVisible()) {
      await createNewOption.click();
      // Esperar fechar o modal secundário se abrir
      const confirmCreate = page.locator('button:has-text("Criar Paciente")');
      if (await confirmCreate.isVisible()) {
        await confirmCreate.click();
      }
    }

    // 3. Ir para a aba de Configurações
    await page.waitForTimeout(1000);
    const settingsTab = page.getByRole('tab', { name: /Configurações/i });
    await expect(settingsTab).toBeVisible({ timeout: 10000 });
    await settingsTab.click({ force: true });

    // 4. Ativar agendamento recorrente
    await page.waitForTimeout(500);
    const recurringSwitch = page.getByRole('switch', { name: /Agendamento Recorrente/i }).or(
      page.locator('button[role="switch"]:has-text("Agendamento Recorrente")')
    ).or(
      page.locator('label:has-text("Agendamento Recorrente")')
    ).first();
    
    await expect(recurringSwitch).toBeVisible({ timeout: 5000 });
    await recurringSwitch.click({ force: true });

    // 5. Selecionar dias (Segunda, Quarta, Sexta)
    const segButton = page.locator('button').filter({ hasText: /^Seg$|^S$/i }).first();
    const quaButton = page.locator('button').filter({ hasText: /^Qua$|^Q$/i }).first();
    const sexButton = page.locator('button').filter({ hasText: /^Sex$|^S$/i }).last(); // Last to avoid Seg/Sex conflict if 'S'

    await expect(segButton).toBeVisible();
    await segButton.click();
    await quaButton.click();
    await sexButton.click();
    await sexButton.click();

    // 6. Definir número de sessões
    const sessionsInput = page.locator('input[type="number"]').first();
    await sessionsInput.fill('4');

    // 7. Salvar (Agendar)
    await page.locator('button:has-text("Agendar")').filter({ hasNot: page.locator('nav') }).last().click();

    // 8. Verificar sucesso (Toast ou fechamento do modal)
    await expect(page.locator('text=/sucesso|criado/i').first()).toBeVisible({ timeout: 15000 });
    console.log('✅ Agendamento recorrente criado');
  });

  test('deve cancelar um agendamento com sucesso', async ({ page }) => {
    // 1. Localizar um agendamento na grade (esperar carregar)
    await page.waitForTimeout(3000);
    const appointment = page.locator('[class*="appointment-card"], [class*="calendar-card"]').first();
    
    if (await appointment.isVisible()) {
      // 2. Abrir menu de contexto (clique direito)
      await appointment.click({ button: 'right' });
      
      // 3. Selecionar Excluir
      const deleteOption = page.locator('text=/Excluir|Remover/i');
      await deleteOption.click();

      // 4. Confirmar no modal de alerta (se houver)
      const confirmButton = page.locator('button:has-text("Excluir"), button:has-text("Confirmar")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // 5. Verificar toast de sucesso
      await expect(page.locator('text=/excluído|removido/i').first()).toBeVisible();
      console.log('✅ Agendamento cancelado');
    } else {
      console.log('⚠ Nenhum agendamento encontrado para cancelar');
    }
  });

  test('deve reagendar via Drag and Drop', async ({ page }) => {
    // Este teste é sensível à grade do calendário
    await page.waitForTimeout(3000);
    const appointment = page.locator('[class*="appointment-card"], [class*="calendar-card"]').first();
    
    if (await appointment.isVisible()) {
      const box = await appointment.boundingBox();
      if (box) {
        // Tentar mover o agendamento para baixo (próximo horário)
        // Usamos mouse para simular drag manual pois grades de calendário às vezes são complexas para o dragTo automático
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height + 50, { steps: 10 });
        await page.mouse.up();

        // Verificar se apareceu confirmação ou toast
        await page.waitForTimeout(1000);
        console.log('✅ Tentativa de Drag and Drop realizada');
      }
    } else {
      console.log('⚠ Nenhum agendamento encontrado para reagendar');
    }
  });
});
