/**
 * TESTE COMPLETO: CRIAR PACIENTE E VERIFICAR AUTOCOMPLETE
 *
 * Fluxo completo:
 * 1. Login
 * 2. Abrir modal de agendamento
 * 3. Usar cadastro rápido de paciente
 * 4. Verificar se o novo paciente aparece no autocomplete
 */

import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

const BASE_URL = 'http://localhost:8081';

test.use({ browserName: 'chromium' });
test.setTimeout(120000);

test('fluxo completo: criar paciente e verificar autocomplete', async ({ page }) => {
  console.log('\n' + '█'.repeat(70));
  console.log('█    TESTE: CRIAÇÃO DE PACIENTE + AUTOCOMPLETE');
  console.log('█'.repeat(70));

  // ========================================
  // LOGIN
  // ========================================
  console.log('\n📍 Login');
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForTimeout(2000);

  await page.fill('input[type="email"]', testUsers.rafael.email);
  await page.fill('input[type="password"]', testUsers.rafael.password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(eventos|dashboard|schedule|smart-dashboard|$)/, { timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log('✅ Login realizado');

  // ========================================
  // ABRIR MODAL DE AGENDAMENTO
  // ========================================
  console.log('\n📍 Abrir Modal de Agendamento');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const newAppointmentButton = page.locator('button:has-text("Novo"), button:has-text("Agendar")').first();
  await newAppointmentButton.click();
  await page.waitForTimeout(2000);
  console.log('✅ Modal aberto');

  // ========================================
  // ABRIR COMBOBOX DE PACIENTE
  // ========================================
  console.log('\n📍 Abrir Combobox de Paciente');

  const comboboxTrigger = page.locator('button[role="combobox"]').first();
  await comboboxTrigger.click();
  await page.waitForTimeout(1000);

  const commandInput = page.locator('input[placeholder*="Buscar" i]').first();
  expect(await commandInput.count()).toBeGreaterThan(0);

  // ========================================
  // CRIAR NOVO PACIENTE
  // ========================================
  console.log('\n📍 Criar Novo Paciente');

  const timestamp = Date.now();
  const newPatientName = `Teste Autocomplete ${timestamp}`;

  // Digitar nome do novo paciente
  await commandInput.fill(newPatientName);
  await page.waitForTimeout(1500);

  await page.screenshot({ path: '/tmp/e2e-01-busca-paciente.png', fullPage: true });

  // Procurar e clicar no botão "Cadastrar"
  const createButton = page.locator('button:has-text("Cadastrar")').first();

  if (await createButton.count() > 0) {
    console.log(`✅ Botão de cadastro encontrado para: "${newPatientName}"`);
    await createButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/tmp/e2e-02-modal-cadastro.png', fullPage: true });

    // Aguardar o modal de cadastro rápido aparecer (Dialog)
    // O QuickPatientModal usa Dialog com DialogTitle contendo "Cadastro Rápido"
    const dialogTitle = page.locator('h2:has-text("Cadastro Rápido"), [role="dialog"]:has-text("Cadastro")').first();

    // Esperar até 5 segundos pelo modal aparecer
    await dialogTitle.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
      console.log('   Modal não encontrado com seletor de título, tentando alternativa...');
    });

    const isModalVisible = await dialogTitle.isVisible();

    if (isModalVisible) {
      console.log('✅ Modal de cadastro rápido aberto');

      // O input tem id="name" e placeholder específico
      const nameInput = page.locator('input#name, input[placeholder*="João"]').first();

      if (await nameInput.count() > 0) {
        // Limpar e preencher o nome
        await nameInput.fill('');
        await nameInput.fill(newPatientName);

        const phoneInput = page.locator('input#phone, input[type="tel"]').first();
        await phoneInput.fill('11999999999');

        await page.screenshot({ path: '/tmp/e2e-03-cadastro-preenchido.png', fullPage: true });

        // Encontrar o botão DENTRO do modal de cadastro rápido
        const dialogLocator = page.locator('[role="dialog"]:has-text("Cadastro"), h2:has-text("Cadastro Rápido")').first();
        const submitButton = dialogLocator.locator('button:has-text("Criar Paciente")').first();

        // Verificar se o botão está habilitado
        const isEnabled = await submitButton.isEnabled().catch(() => false);
        console.log(`   Botão de criar habilitado: ${isEnabled}`);

        if (!isEnabled) {
          console.log('⚠️  Botão desabilitado, tentando clique forçado...');
        }

        // Tentar clique normal ou forçado
        try {
          await submitButton.click({ timeout: 5000, force: !isEnabled });
        } catch (e) {
          console.log('⚠️  Clique normal falhou, tentando JavaScript...');
          await submitButton.evaluate((btn: any) => btn.click());
        }

        await page.waitForTimeout(5000);

        // Verificar se houve erro
        const errorElements = await page.locator('.destructive, .error, [role="alert"], [data-state="open"]:has-text("erro")').all();
        let hasError = false;
        for (const el of errorElements) {
          if (await el.isVisible()) {
            const errorText = await el.textContent();
            if (errorText && errorText.trim().length > 0) {
              console.log(`❌ Erro encontrado: ${errorText.trim()}`);
              hasError = true;
            }
          }
        }

        if (!hasError) {
          console.log('✅ Paciente criado (sem erros visíveis)');
        }

        // Aguardar o modal fechar
        await page.waitForTimeout(3000);

        const modalStillOpen = await page.locator('h2:has-text("Cadastro Rápido")').isVisible().catch(() => false);

        if (modalStillOpen) {
          console.log('⚠️  Modal ainda está aberto, tentando fechar...');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(2000);
        }
      } else {
        console.log('⚠️  Input de nome não encontrado no modal');
      }
    } else {
      console.log('⚠️  Modal de cadastro rápido não apareceu');
    }

    await page.screenshot({ path: '/tmp/e2e-04-apos-criar.png', fullPage: true });
  } else {
    console.log('⚠️  Botão de cadastro não encontrado');
  }

  // ========================================
  // VERIFICAR AUTOCOMPLETE COM NOVO PACIENTE
  // ========================================
  console.log('\n📍 Verificar Autocomplete com Novo Paciente');

  // Verificar se o paciente foi criado e está no combobox
  const comboboxTrigger2 = page.locator('button[role="combobox"]').first();
  const currentText = await comboboxTrigger2.textContent();

  let patientFound = false;

  if (currentText && currentText.includes(newPatientName)) {
    console.log('✅ Paciente já está selecionado no combobox!');
    patientFound = true;
  } else {
    // Se não estiver visível no combobox, abrir dropdown e buscar
    console.log('   Abrindo dropdown para verificar paciente...');
    await comboboxTrigger2.click({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // Digitar parte do nome do paciente criado
    const commandInput2 = page.locator('input[placeholder*="Buscar" i]').first();
    if (await commandInput2.count() > 0) {
      await commandInput2.fill('Teste Autocomplete');
      await page.waitForTimeout(1500);
    }

    // Verificar se aparece no dropdown
    const patientTextElements = page.locator(`text=/${newPatientName}/i`);
    patientFound = await patientTextElements.count() > 0;
  }

  await page.screenshot({ path: '/tmp/e2e-06-final.png', fullPage: true });

  // ========================================
  // RESULTADO
  // ========================================
  console.log('\n' + '█'.repeat(70));
  console.log('█    RESULTADO');
  console.log('█'.repeat(70));

  if (patientFound) {
    console.log('✅ SUCESSO: Paciente criado e encontrado!');
    console.log(`   Nome: ${newPatientName}`);
  } else {
    console.log('⚠️  AVISO: Paciente pode não ter aparecido');
    console.log(`   Nome esperado: ${newPatientName}`);
    console.log(`   Texto no combobox: ${currentText || '(vazio)'}`);
  }

  console.log('\n' + '█'.repeat(70));
  console.log('█    TESTE CONCLUÍDO');
  console.log('█'.repeat(70));

  // Assert
  expect(patientFound, `Paciente "${newPatientName}" deve ser encontrado`).toBeTruthy();
});
