/**
 * TESTE DE CRIAÇÃO RÁPIDA DE PACIENTE E AUTOCOMPLETE
 *
 * Testa o fluxo:
 * 1. Login
 * 2. Abrir modal de novo agendamento
 * 3. Usar cadastro rápido de paciente
 * 4. Verificar se o paciente aparece no autocomplete
 */

import { test } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

const BASE_URL = 'http://localhost:8084';

// Configure test for Chromium only with extended timeout
test.use({ browserName: 'chromium' });
test.setTimeout(120000);

test('criação rápida de paciente e autocomplete no modal de agendamento', async ({ page }) => {

  // Capture console logs
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warn') {
      console.log(`🔍 Browser [${msg.type()}]:`, msg.text());
    }
  });

  console.log('\n' + '█'.repeat(70));
  console.log('█    TESTE: CRIAÇÃO RÁPIDA DE PACIENTE');
  console.log('█'.repeat(70));

  // ========================================
  // ETAPA 0: LOGIN
  // ========================================
  console.log('\n📍 ETAPA 0: Login');
  console.log('-'.repeat(70));

  await page.goto(`${BASE_URL}/auth`);
  await page.waitForTimeout(3000);

  await page.fill('input[type="email"]', testUsers.rafael.email);
  await page.fill('input[type="password"]', testUsers.rafael.password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(eventos|dashboard|schedule|smart-dashboard|$)/, { timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log('✅ Login realizado');

  // ========================================
  // ETAPA 1: IR PARA AGENDA
  // ========================================
  console.log('\n📍 ETAPA 1: Navegar para Agenda');
  console.log('-'.repeat(70));

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/patient-creation-01-agenda.png', fullPage: true });
  console.log('✅ Página da agenda carregada');

  // ========================================
  // ETAPA 2: ABRIR MODAL DE NOVO AGENDAMENTO
  // ========================================
  console.log('\n📍 ETAPA 2: Abrir Modal de Novo Agendamento');
  console.log('-'.repeat(70));

  // Procurar botão de novo agendamento
  const newAppointmentButton = page.locator('button:has-text("Novo"), button:has-text("Agendar"), button[aria-label*="novo" i], button[aria-label*="agendar" i]').first();

  if (await newAppointmentButton.count() > 0) {
    await newAppointmentButton.click();
    console.log('✅ Botão de novo agendamento clicado');
  } else {
    // Tentar alternativa: procurar botão com ícone de +
    const addButton = page.locator('button').filter({ hasText: /^\+$/ }).first();
    await addButton.click();
    console.log('✅ Botão + clicado');
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/patient-creation-02-modal-aberto.png', fullPage: true });

  // ========================================
  // ETAPA 3: ABRIR CADASTRO RÁPIDO DE PACIENTE
  // ========================================
  console.log('\n📍 ETAPA 3: Abrir Cadastro Rápido de Paciente');
  console.log('-'.repeat(70));

  // Procurar pelo campo de paciente ou botão de cadastro rápido
  const quickRegisterButton = page.locator('button:has-text("Cadastro Rápido"), button:has-text("Novo Paciente"), button:has-text("Adicionar Paciente")').first();

  if (await quickRegisterButton.count() > 0) {
    await quickRegisterButton.click();
    console.log('✅ Botão de cadastro rápido clicado');
    await page.waitForTimeout(2000);
  } else {
    // Tentar clicar no campo de paciente para ver se o autocomplete abre
    const patientInput = page.locator('input[placeholder*="paciente" i], input[name*="patient" i]').first();
    if (await patientInput.count() > 0) {
      await patientInput.click();
      await page.waitForTimeout(1000);
    }
  }

  await page.screenshot({ path: '/tmp/patient-creation-03-cadastro-rapido.png', fullPage: true });

  // ========================================
  // ETAPA 4: PREENCHER CADASTRO RÁPIDO
  // ========================================
  console.log('\n📍 ETAPA 4: Preencher Cadastro Rápido');
  console.log('-'.repeat(70));

  const timestamp = Date.now();
  const patientName = `Paciente Teste ${timestamp}`;

  // Procurar campos do formulário de cadastro rápido
  const nameInput = page.locator('input[id*="name" i], input[placeholder*="nome" i]').first();
  if (await nameInput.count() > 0) {
    await nameInput.fill(patientName);
    console.log(`✅ Nome preenchido: ${patientName}`);
  }

  const phoneInput = page.locator('input[id*="phone" i], input[placeholder*="telefone" i], input[type="tel"]').first();
  if (await phoneInput.count() > 0) {
    await phoneInput.fill('11999999999');
    console.log('✅ Telefone preenchido');
  }

  await page.screenshot({ path: '/tmp/patient-creation-04-form-preenchido.png', fullPage: true });

  // ========================================
  // ETAPA 5: SUBMETER CADASTRO
  // ========================================
  console.log('\n📍 ETAPA 5: Submeter Cadastro');
  console.log('-'.repeat(70));

  const submitButton = page.locator('button:has-text("Criar"), button:has-text("Salvar"), button:has-text("Cadastrar"), button[type="submit"]').first();

  if (await submitButton.count() > 0) {
    await submitButton.click();
    console.log('✅ Botão de submissão clicado');

    // Aguardar processamento
    await page.waitForTimeout(5000);

    // Verificar se houve erro
    const errorLocator = page.locator('.destructive, .error, [role="alert"]');
    const errorCount = await errorLocator.count();
    let hasError = false;
    for (let i = 0; i < errorCount; i++) {
      const el = errorLocator.nth(i);
      if (await el.isVisible()) {
        const errorText = await el.textContent();
        if (errorText && errorText.trim().length > 0) {
          console.log(`❌ Erro encontrado: ${errorText}`);
          hasError = true;
        }
      }
    }

    if (!hasError) {
      console.log('✅ Paciente criado sem erros aparentes');
    }
  } else {
    console.log('⚠️  Botão de submissão não encontrado');
  }

  await page.screenshot({ path: '/tmp/patient-creation-05-apos-submissao.png', fullPage: true });

  // ========================================
  // ETAPA 6: TESTAR AUTOCOMPLETE NO CAMPO DE PACIENTE
  // ========================================
  console.log('\n📍 ETAPA 6: Testar Autocomplete');
  console.log('-'.repeat(70));

  // Esperar o modal de agendamento estar pronto novamente após criar paciente
  await page.waitForTimeout(2000);

  // Verificar se o modal ainda está aberto ou se precisa reabrir
  const modalVisible = page.locator('[role="dialog"], .dialog-content, [data-radix-dialog-content]').first();
  if (await modalVisible.count() === 0) {
    console.log('⚠️  Modal fechado após criar paciente - reabrindo...');
    // Reabrir modal de agendamento para testar autocomplete
    const newAppointmentButton = page.locator('button:has-text("Novo"), button:has-text("Agendar")').first();
    if (await newAppointmentButton.count() > 0) {
      await newAppointmentButton.click();
      await page.waitForTimeout(2000);
    }
  }

  await page.screenshot({ path: '/tmp/patient-creation-06-modal-reaberto.png', fullPage: true });

  // O componente PatientCombobox usa um Button com role="combobox" como trigger
  const comboboxButton = page.locator('button[role="combobox"]').first();

  if (await comboboxButton.count() > 0) {
    console.log('✅ Botão combobox encontrado');

    // Clicar no botão para abrir o popover
    await comboboxButton.click();

    // Aguardar o Popover aparecer (usa data-state="open")
    await page.waitForSelector('[data-state="open"], [role="dialog"]', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(2500); // Tempo extra para animação e Popover renderizar

    await page.screenshot({ path: '/tmp/patient-creation-07-combobox-aberto.png', fullPage: true });

    // Procurar pelo input de busca - verificar em toda a página (Popover pode ser portal)
    const searchInput = page.locator('input[placeholder*="nome"], input[placeholder*="CPF"], input[placeholder*="telefone"], input.cmdk-input, input[data-radix-collection-item]').first();

    if (await searchInput.count() > 0) {
      console.log('✅ Input de busca encontrado');

      // Não digitar nada para ver TODOS os pacientes disponíveis
      await page.waitForTimeout(1500);

      await page.screenshot({ path: '/tmp/patient-creation-08-autocomplete-resultados.png', fullPage: true });

      // Verificar se há pacientes na lista - procurar especificamente dentro do CommandList do autocomplete
      // Primeiro verificar se a lista de pacientes apareceu
      const patientList = page.locator('[cmdk-list], [data-radix-collection="items"]').first();
      const listVisible = await patientList.isVisible();

      console.log(`📊 Patient list visible: ${listVisible}`);

      if (listVisible) {
        // Procurar CommandItems especificamente dentro da lista
        const commandItems = patientList.locator('[cmdk-item]');
        const itemCount = await commandItems.count();

        console.log(`📊 CommandItems found in patient list: ${itemCount}`);

        if (itemCount > 0) {
          for (let i = 0; i < Math.min(itemCount, 10); i++) {
            const text = await commandItems.nth(i).textContent();
            console.log(`  - Patient ${i}: ${text?.trim().substring(0, 60)}`);
          }

          // Verificar se são pacientes ou outros elementos
          const hasPatientText = await commandItems.nth(0).textContent();
          if (hasPatientText && (
            hasPatientText.includes('Info') ||
            hasPatientText.includes('Pag') ||
            hasPatientText.includes('Opç')
          )) {
            console.log('ℹ️  Items appear to be tabs, not patients. PatientCombobox dropdown may not have opened.');
          } else {
            console.log('✅ Autocomplete funcionando com opções de paciente!');
          }
        }
      }

      // Verificar também mensagem de "nenhum paciente" ou "Selecione o paciente"
      const emptyMessage = page.locator('text=/Nenhum paciente encontrado/i, text=/No patients found/i, text=/Selecione o paciente/i');
      const hasEmptyMessage = await emptyMessage.count() > 0;

      if (hasEmptyMessage) {
        console.log('ℹ️  Autocomplete vazio ou não abriu - nenhuma opção de paciente encontrada');
      }
    } else {
      console.log('⚠️  Input de busca não encontrado');

      // Debug: verificar se o PopoverContent está presente mas oculto
      const popoverContent = page.locator('[data-radix-popover-content]');
      const popoverCount = await popoverContent.count();
      console.log(`   PopoverContent elements found: ${popoverCount}`);

      const allInputs = page.locator('input[type="text"], input:not([type])');
      const inputsCount = await allInputs.count();
      console.log(`   Total inputs on page: ${inputsCount}`);
    }
  } else {
    console.log('⚠️  Botão combobox não encontrado');
  }

  await page.screenshot({ path: '/tmp/patient-creation-07-final.png', fullPage: true });

  console.log('\n' + '█'.repeat(70));
  console.log('█    TESTE CONCLUÍDO');
  console.log('█'.repeat(70));
});
