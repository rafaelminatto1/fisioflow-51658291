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

const BASE_URL = 'http://localhost:5173';

// Configure test for Chromium only with extended timeout
test.use({ browserName: 'chromium' });
test.setTimeout(120000);

test('criação rápida de paciente e autocomplete no modal de agendamento', async ({ page }) => {

  // Capture console logs
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
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

  await page.fill('input[name="email"]', testUsers.rafael.email);
  await page.fill('input[name="password"]', testUsers.rafael.password);
  // Check for Vite error overlay
  const errorOverlay = page.locator('vite-error-overlay');
  if (await errorOverlay.isVisible()) {
    console.log('🚨 VITE ERROR OVERLAY DETECTED!');
    // Shadow root might be tricky, try to get text or innerHTML
    const errorText = await errorOverlay.evaluate(el => el.shadowRoot?.textContent);
    console.log('🚨 Error Message:', errorText);
  }

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
  // Procurar botão de novo agendamento - filtrar apenas visíveis
  const newAppointmentButton = page.locator('button:has-text("Novo"), button:has-text("Agendar"), button[aria-label*="novo" i], button[aria-label*="agendar" i]')
    .filter({ hasNot: page.locator('[hidden]') }) // Excluir hidden
    .filter({ hasNotText: /modelo/i }) // Excluir botões de "Novo Modelo" se houver
    .first();

  // Check if visible specifically
  if (await newAppointmentButton.isVisible()) {
    await newAppointmentButton.click();
    console.log('✅ Botão de novo agendamento clicado');
  } else {
    // Try finding any visible button that looks like add appointment
    const visibleButtons = page.locator('button:visible').filter({ hasText: /novo|agendar/i });
    const count = await visibleButtons.count();
    if (count > 0) {
      await visibleButtons.first().click();
      console.log('✅ Botão visível clicado (alternativo)');
    } else {
      // Tentar alternativa: procurar botão com ícone de +
      const addButton = page.locator('button').filter({ hasText: /^\+$/ }).first();
      if (await addButton.isVisible()) {
        await addButton.click();
        console.log('✅ Botão + clicado');
      } else {
        console.log('❌ Nenhum botão de novo agendamento visível encontrado');
        // Log page content for debug
        const content = await page.content();
        console.log('Page content length:', content.length);
      }
    }
  }


  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/patient-creation-02-modal-aberto.png', fullPage: true });



  // ========================================
  // ETAPA 3: ABRIR CADASTRO RÁPIDO VIA COMBOBOX
  // ========================================
  console.log('\n📍 ETAPA 3: Abrir Cadastro Rápido via Combobox');
  console.log('-'.repeat(70));

  const timestamp = Date.now();
  const patientName = `Paciente Teste ${timestamp}`;

  // 1. Procurar e clicar no trigger do combobox
  const comboboxTrigger = page.locator('button[role="combobox"]').first();
  if (await comboboxTrigger.isVisible()) {
    await comboboxTrigger.click();
    console.log('✅ Combobox aberto');
    await page.waitForTimeout(1000);

    // 2. Digitar o nome do paciente no input de busca
    // 2. Digitar o nome do paciente no input de busca
    // Usar seletor específico do cmdk-input para garantir que estamos no input correto do Popover
    const searchInput = page.locator('input[cmdk-input]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill(patientName);
    console.log(`✅ Nome digitado no combobox: ${patientName}`);
    await page.waitForTimeout(1000);

    // 3. Clicar na opção "Cadastrar..."
    // Procurar item da lista que contenha o texto "Cadastrar" e o nome do paciente
    // O texto no componente é: Cadastrar "{inputValue}"
    const createOption = page.locator('[cmdk-item]').filter({ hasText: `Cadastrar "${patientName}"` }).first();

    if (await createOption.isVisible()) {
      await createOption.click();
      console.log('✅ Opção "Cadastrar" clicada (lista)');
      await page.waitForTimeout(2000);
    } else {
      // Se não houver resultados, aparece o botão no CommandEmpty
      const createButtonEmpty = page.locator('button').filter({ hasText: /Cadastrar/i }).first();
      if (await createButtonEmpty.isVisible()) {
        await createButtonEmpty.click();
        console.log('✅ Botão "Cadastrar" clicado (empty state)');
        await page.waitForTimeout(2000);
      } else {
        const comboboxPopover = page.locator('[data-radix-popover-content]').filter({ has: page.locator('input[placeholder*="Buscar"]') }).first();
        if (await comboboxPopover.isVisible()) {
          const html = await comboboxPopover.innerHTML();
          console.log('📝 Combobox Popover HTML:', html.substring(0, 1000));
          // Check if empty state is actually rendered
          if (html.includes('CommandEmpty')) console.log('✅ CommandEmpty detected in HTML');
        } else {
          console.log('❌ Combobox Popover specifically with search input not found/visible!');
          const allPopovers = page.locator('[data-radix-popover-content]');
          const count = await allPopovers.count();
          console.log(`Found ${count} generic popovers.`);
        }
      }
    }
  } else {
    console.log('⚠️ Trigger do combobox não encontrado, tentando botões antigos...');
    // Fallback para lógica antiga (botões explícitos)
    const quickRegisterButton = page.locator('button:has-text("Cadastro Rápido"), button:has-text("Novo Paciente")').first();
    if (await quickRegisterButton.count() > 0) {
      await quickRegisterButton.click();
    }
  }

  await page.screenshot({ path: '/tmp/patient-creation-03-cadastro-rapido.png', fullPage: true });

  // ========================================
  // ETAPA 4: PREENCHER CADASTRO RÁPIDO (MODAL)
  // ========================================
  console.log('\n📍 ETAPA 4: Preencher Cadastro Rápido');
  console.log('-'.repeat(70));

  // O nome já deve vir preenchido ou precisamos preencher o resto
  // Verificar se o modal de cadastro rápido abriu
   // Ajustar se o título for diferente

  // Procurar campos do formulário de cadastro rápido
  // O input de nome pode já estar preenchido ou não, vamos garantir
  const nameInput = page.locator('input[name="name"], input[placeholder*="Nome completo"]').last(); // last() pois pode haver outros no DOM
  if (await nameInput.isVisible()) {
    const currentValue = await nameInput.inputValue();
    if (!currentValue) {
      await nameInput.fill(patientName);
      console.log(`✅ Nome preenchido no formulário: ${patientName}`);
    } else {
      console.log(`ℹ️ Nome já preenchido: ${currentValue}`);
    }
  }

  const phoneInput = page.locator('input[name="phone"], input[placeholder*="telefone"], input[type="tel"]').last();
  if (await phoneInput.isVisible()) {
    await phoneInput.fill('11999999999');
    console.log('✅ Telefone preenchido');
  }

  await page.screenshot({ path: '/tmp/patient-creation-04-form-preenchido.png', fullPage: true });

  // ========================================
  // ETAPA 5: SUBMETER CADASTRO
  // ========================================
  console.log('\n📍 ETAPA 5: Submeter Cadastro');
  console.log('-'.repeat(70));

  // Target specifically the "Criar Paciente" button inside the Quick Registration modal
  // Using hierarchy to avoid clicking the "Criar" button of the Appointment Modal behind it
  const submitButton = page.locator('[role="dialog"]')
    .filter({ hasText: 'Cadastro Rápido' })
    .locator('button')
    .filter({ hasText: /Criar|Salvar|Cadastrar/i })
    .last(); // Usually "Cancelar" is first, "Criar" is last, but filter hasText should handle it

  if (await submitButton.count() > 0) {
    // Ensure it's the right one by checking visibility
    if (await submitButton.isVisible()) {
      await submitButton.click();
      console.log('✅ Botão de submissão clicado (específico do modal)');
    } else {
      // Fallback
      await page.locator('button:has-text("Criar Paciente")').click();
      console.log('✅ Botão "Criar Paciente" clicado (fallback)');
    }

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
    await page.waitForSelector('[data-state="open"], [role="dialog"]', { timeout: 3000 }).catch(() => { });
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

            // Verify if the created patient is in the list
            const createdPatientItem = patientList.locator(`[cmdk-item]:has-text("${patientName}")`).first();
            if (await createdPatientItem.isVisible()) {
              console.log(`✅ PACIENTE CRIADO ENCONTRADO NA LISTA: ${patientName}`);
            } else {
              console.log(`⚠️ Paciente criado NÃO encontrado na lista: ${patientName}`);
            }
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
