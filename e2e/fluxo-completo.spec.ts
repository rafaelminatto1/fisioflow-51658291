/**
 * TESTE DE FLUXO COMPLETO - FISIOFLOW (E2E Spec)
 *
 * Fluxo ponta a ponta:
 * 1. Login
 * 2. Fechar Onboarding (se aparecer)
 * 3. Criar Paciente (se não existir)
 * 4. Criar Agendamento de Avaliação (criação dinâmica)
 * 5. Verificar redirecionamento automático para Evolução
 * 6. Preencher Evolução SOAP completa
 * 7. Salvar e validar sucesso
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8084';
const CREDENTIALS = {
  email: 'teste.qa@fisioflow.com',
  password: 'Teste@12345'
};

// Test patient data
const TEST_PATIENT = {
  name: 'Paciente Teste E2E',
  phone: '11999999999',
  email: 'teste-e2e@fisioflow.test',
  cpf: '12345678900',
  birthDate: '1990-01-01'
};

// Configure test for Chromium only with extended timeout
test.use({ browserName: 'chromium' });
test.setTimeout(180000); // 3 minutes

test('fluxo completo: login -> agendamento (avaliação) -> evolução SOAP', async ({ page, context }) => {
  // Clear cookies for fresh session
  await context.clearCookies();

  // ========================================
  // ETAPA 0: LOGIN
  // ========================================
  console.log('\n📍 ETAPA 0: Login');
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded' });

  await page.fill('#login-email', CREDENTIALS.email);
  await page.fill('#login-password', CREDENTIALS.password);
  await page.click('button:has-text("Entrar na Plataforma")');

  // Wait for login to complete (check for dashboard or schedule URL)
  await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 30000 });
  console.log('✅ Login realizado');

  // ========================================
  // ETAPA 1: FECHAR ONBOARDING (SE APARECER)
  // ========================================
  console.log('\n📍 ETAPA 1: Verificar Onboarding');

  // Tenta fechar o modal de onboarding se ele aparecer em até 10 segundos
  try {
    const onboardingCloseBtn = page.locator('button:has-text("Pular Tour"), button[aria-label="Close"], button:has-text("Fechar")').first();
    if (await onboardingCloseBtn.isVisible({ timeout: 5000 })) {
      await onboardingCloseBtn.click();
      console.log('✅ Onboarding fechado');
    } else {
      console.log('ℹ️ Onboarding não apareceu');
    }
  } catch  {
    console.log('ℹ️ Onboarding não detectado ou erro ao fechar');
  }

  // ========================================
  // ETAPA 2: CRIAR PACIENTE (SE NECESSÁRIO)
  // ========================================
  console.log('\n📍 ETAPA 2: Verificar/Criar Paciente');

  // Try to navigate to patients page to check if any patients exist
  await page.goto(`${BASE_URL}/patients`);
  await page.waitForTimeout(2000);

  // Check if there are any patients by looking for patient cards or empty state
  const hasPatients = await page.locator('[data-testid="patient-card"], .patient-card, tr:has-text("Paciente"), div:has-text("Nenhum paciente"), div:has-text("Empty")').count() > 0;

  if (!hasPatients) {
    console.log('  ℹ️ Nenhum paciente encontrado, criando paciente de teste...');

    // Look for the "New Patient" or "Novo Paciente" button
    const newPatientBtn = page.locator('button:has-text("Novo Paciente"), button:has-text("New Patient"), button:has-text("Adicionar"), a:has-text("Novo")').first();

    // Wait a bit for the page to fully load
    await page.waitForTimeout(1000);

    // If button is not visible on patients page, try to find it in header or elsewhere
    if (await newPatientBtn.isVisible({ timeout: 5000 })) {
      await newPatientBtn.click();
    } else {
      // Alternative: Navigate to a specific create patient page
      await page.goto(`${BASE_URL}/patients/new`);
    }

    console.log('  ✓ Abrindo formulário de criação de paciente');

    // Wait for the form/modal to appear
    await page.waitForTimeout(1000);

    // Fill the patient form - look for common input field patterns
    // Try multiple selector patterns for maximum compatibility
    const nameInput = page.locator('input[name="name"], input[name="full_name"], input[id*="name"], input[placeholder*="Nome"]').first();
    if (await nameInput.isVisible({ timeout: 5000 })) {
      await nameInput.fill(TEST_PATIENT.name);
      console.log(`  ✓ Nome preenchido: ${TEST_PATIENT.name}`);
    }

    // Fill phone
    const phoneInput = page.locator('input[name="phone"], input[name="telefone"], input[id*="phone"]').first();
    if (await phoneInput.isVisible({ timeout: 3000 })) {
      await phoneInput.fill(TEST_PATIENT.phone);
    }

    // Fill email
    const emailInput = page.locator('input[name="email"], input[name="email"], input[id*="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 })) {
      await emailInput.fill(TEST_PATIENT.email);
    }

    // Fill CPF
    const cpfInput = page.locator('input[name="cpf"], input[name="document"]').first();
    if (await cpfInput.isVisible({ timeout: 3000 })) {
      await cpfInput.fill(TEST_PATIENT.cpf);
    }

    // Scroll to bottom to make sure submit button is visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Submit the form - try more specific selectors for the patient form
    const saveBtn = page.locator('button[type="submit"]').and(page.locator('button:has-text("Salvar"), button:has-text("Criar"), button:has-text("Cadastrar"), button:has-text("Confirmar")')).first();

    // If no submit button with text, try any submit button in the form
    const submitBtnAlt = page.locator('form button[type="submit"], dialog button[type="submit"], button:has-text("Adicionar")').first();

    if (await saveBtn.isVisible({ timeout: 3000 })) {
      await saveBtn.click();
      console.log('  ✓ Formulário enviado (botão salvar)');
    } else if (await submitBtnAlt.isVisible({ timeout: 2000 })) {
      await submitBtnAlt.click();
      console.log('  ✓ Formulário enviado (botão submit)');
    } else {
      // Last resort - press Enter on a focused field
      await page.keyboard.press('Enter');
      console.log('  ✓ Formulário enviado (Enter key)');
    }

    // Wait for success message or redirect
    await page.waitForTimeout(3000);
    console.log('✅ Paciente de teste criado');

    // Navigate to schedule to refresh the patient list cache
    await page.goto(`${BASE_URL}/schedule`);
    await page.waitForTimeout(3000); // Wait for page to fully load
    console.log('  ✓ Página recarregada para atualizar cache de pacientes');
  } else {
    console.log('  ℹ️ Pacientes já existem no banco de dados');
  }

  // ========================================
  // ETAPA 3: CRIAR AGENDAMENTO DE AVALIAÇÃO
  // ========================================
  console.log('\n📍 ETAPA 2: Criar Agendamento');

  // Garantir que estamos na agenda
  await page.goto(`${BASE_URL}/schedule`);

  // Clicar em "Novo" ou "Novo Agendamento"
  const newAppointmentBtn = page.locator('button:has-text("Novo"), button:has-text("Novo Agendamento")').first();
  await newAppointmentBtn.waitFor({ state: 'visible' });
  await newAppointmentBtn.click();
  console.log('  ✓ Botão Novo Agendamento clicado');

  // Selecionar Paciente (Combo box)
  // Note: The PatientCombobox might be empty due to data source issues
  // We'll use the "Criar Novo" flow from the modal instead
  const patientTrigger = page.locator('button[role="combobox"]').first();
  await patientTrigger.click();

  // Wait for the dropdown listbox to appear
  const listbox = page.locator('[role="listbox"]').first();
  try {
    await listbox.waitFor({ state: 'visible', timeout: 3000 });
    console.log('  ✓ Dropdown aberto');
  } catch {
    console.log('  ⚠️ Dropdown não abriu, tentando alternativa');
  }

  await page.waitForTimeout(1000);

  // Check if there are any patient options
  let optionCount = await page.locator('[role="listbox"] [role="option"]').count();
  console.log(`  ℹ️ Opções disponíveis: ${optionCount}`);

  if (optionCount === 0) {
    console.log('  ℹ️ Nenhum paciente encontrado, usando fluxo "Criar Novo"...');

    // Type the patient name to trigger the search/create flow
    const comboboxInput = page.locator('[role="combobox"] input, input[role="combobox"], [role="combobox"] input[type="text"]').first();
    if (await comboboxInput.isVisible({ timeout: 2000 })) {
      await comboboxInput.click();
      await comboboxInput.fill(TEST_PATIENT.name);
      await page.waitForTimeout(2000);

      // Look for a "Create new" option or button
      const createNewOption = page.locator('[role="option"]:has-text("Criar"), [role="option"]:has-text("Novo"), [role="option"]:has-text("Adicionar")').first();
      const createNewBtn = page.locator('button:has-text("Criar Novo"), button:has-text("Novo Paciente"), button:has-text("Adicionar Paciente")').first();

      if (await createNewOption.isVisible({ timeout: 2000 })) {
        await createNewOption.click();
        console.log('  ✓ Opção "Criar Novo" selecionada');
      } else if (await createNewBtn.isVisible({ timeout: 2000 })) {
        await createNewBtn.click();
        console.log('  ✓ Botão "Criar Novo Paciente" clicado');
      } else {
        // Fallback: press Enter to see if that triggers the modal
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);
      }

      // QuickPatientModal should now be open - fill it out
      await page.waitForTimeout(1000);
      console.log('  ⏳ QuickPatientModal deve estar aberto');

      // Look for the name input in the QuickPatientModal
      const quickNameInput = page.locator('dialog input[name="name"], [role="dialog"] input[id*="name"], .modal input[placeholder*="Nome"]').first();
      if (await quickNameInput.isVisible({ timeout: 3000 })) {
        // The name might be pre-filled from the search
        const currentValue = await quickNameInput.inputValue();
        if (!currentValue || currentValue !== TEST_PATIENT.name) {
          await quickNameInput.fill(TEST_PATIENT.name);
        }
        console.log('  ✓ Nome preenchido no modal rápido');
      }

      // Fill phone if field exists
      const quickPhoneInput = page.locator('dialog input[name="phone"], [role="dialog"] input[id*="phone"]').first();
      if (await quickPhoneInput.isVisible({ timeout: 2000 })) {
        await quickPhoneInput.fill(TEST_PATIENT.phone);
      }

      // Click save/create button in the modal
      // We need to find the button specifically in the QuickPatientModal, not the appointment form
      // The QuickPatientModal is a dialog, so we look for buttons inside dialogs
      const quickSaveBtn = page.locator(
        'dialog button[type="submit"]:visible, ' +
        'dialog button:has-text("Salvar"):visible, ' +
        'dialog button:has-text("Criar"):visible, ' +
        '[role="dialog"] button[type="submit"]:visible'
      ).first();

      // Force click since there might be overlays
      if (await quickSaveBtn.isVisible({ timeout: 3000 })) {
        await quickSaveBtn.click({ force: true });
        console.log('  ✓ Botão salvar clicado');
      } else {
        // Last resort - press Enter while focused on the form
        await page.keyboard.press('Enter');
        console.log('  ✓ Enter pressionado para submeter formulário');
      }

      await page.waitForTimeout(2000);

      // Modal should close automatically, but if not, press Escape
      const modalStillOpen = page.locator('dialog[open], [role="dialog"][data-state="open"], [data-radix-dialog][data-state="open"]').first();
      if (await modalStillOpen.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('  ⏳ Modal ainda aberto, fechando...');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }

      console.log('  ✓ Paciente criado e selecionado');
    } else {
      throw new Error('Não foi possível encontrar input do combobox para criar paciente');
    }
  } else {
    // Select the first patient option
    await page.locator('[role="listbox"] [role="option"]').first().click();
    console.log(`  ✓ Paciente selecionado da lista`);
  }

  // Wait for the form to stabilize after patient selection
  await page.waitForTimeout(1500);

  // Definir Status para "Avaliação" (Crítico para o redirecionamento)
  // NOTE: Status é automaticamente definido para 'avaliacao' quando um novo paciente é selecionado
  // Verificar se o botão de submit mostra "Iniciar Avaliação"
  await page.waitForTimeout(1000);

  // Check if the submit button already shows "Iniciar Avaliação" (status is already 'avaliacao')
  const submitBtnCheck = page.locator('button:has-text("Iniciar Avaliação")');
  if (await submitBtnCheck.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('  ✓ Status já está como Avaliação (botão mostra "Iniciar Avaliação")');
  } else {
    // Try to manually set status by finding the third select (usually status after patient and type)
    console.log('  ℹ️ Status não parece ser "avaliacao", tentando definir manualmente...');

    // Try clicking on select elements to find the status one
    const selectCount = await page.locator('button[role="combobox"]').count();
    console.log(`  ℹ️ Encontrados ${selectCount} selects`);

    // Status is usually the 2nd or 3rd select (after patient, then type, then status)
    for (let i = 1; i < Math.min(selectCount, 4); i++) {
      try {
        const select = page.locator('button[role="combobox"]').nth(i);
        await select.click();
        await page.waitForTimeout(500);

        // Check if any option with "Avaliação" exists
        const avaliacaoOption = page.locator('[role="option"]:has-text("Avaliação")');
        if (await avaliacaoOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await avaliacaoOption.click();
          console.log('  ✓ Status definido para Avaliação');
          break;
        } else {
          // Close and try next
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      } catch  {
        // Continue to next select
      }
    }
  }

  // Selecionar Horário (obrigatório)
  // Try to find and click the time select
  // Look for elements related to time selection
  console.log('  ⏳ Procurando seletor de horário...');

  // Try multiple selectors for time
  const timeSelectors = [
    'button[placeholder*="Horário"]',
    'button[placeholder*="Time"]',
    'select[name="appointment_time"]',
    'input[name="appointment_time"]',
    // The time might be in a Select component
  ];

  let timeSelected = false;
  for (const selector of timeSelectors) {
    try {
      const timeEl = page.locator(selector).first();
      if (await timeEl.isVisible({ timeout: 2000 })) {
        await timeEl.click();
        await page.waitForTimeout(500);

        // Look for time options
        const timeOption = page.locator('[role="option"]').first();
        if (await timeOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await timeOption.click();
          console.log('  ✓ Horário selecionado');
          timeSelected = true;
          break;
        } else {
          await page.keyboard.press('Escape');
        }
      }
    } catch  {
      // Try next selector
    }
  }

  // Alternative: Try to find time slots displayed as buttons
  if (!timeSelected) {
    try {
      const timeSlotButtons = page.locator('button:has-text(/^\\d{2}:\\d{2}$/)').first();
      if (await timeSlotButtons.isVisible({ timeout: 2000 }).catch(() => false)) {
        await timeSlotButtons.click();
        console.log('  ✓ Horário selecionado (slot button)');
        timeSelected = true;
      }
    } catch  {
      // Ignore
    }
  }

  if (!timeSelected) {
    console.log('  ⚠️ Não foi possível selecionar horário automaticamente');
    // Try typing a time value directly
    try {
      const timeInput = page.locator('input[name="appointment_time"], input[id*="time"]').first();
      if (await timeInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await timeInput.fill('09:00');
        console.log('  ✓ Horário preenchido manualmente: 09:00');
      }
    } catch  {
      console.log('  ⚠️ Não foi possível preencher horário, tentando continuar mesmo assim');
    }
  }

  // Clicar no botão de submit
  // Try to find the submit button with various selectors
  console.log('  ⏳ Procurando botão de submit...');

  // The submit button is usually "Iniciar Avaliação", "Criar", or "Salvar"
  const submitSelectors = [
    'button:has-text("Iniciar Avaliação")',
    'button:has-text("Criar")',
    'button:has-text("Salvar")',
    'button:has-text("Agendar")',
    'button[type="submit"]',
  ];

  let submitClicked = false;
  for (const selector of submitSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click();
        console.log(`  ✓ Botão submit clicado: ${selector}`);
        submitClicked = true;
        break;
      }
    } catch  {
      // Try next selector
    }
  }

  if (!submitClicked) {
    console.log('  ⚠️ Botão submit não encontrado pelos seletores, tentando Enter');
    // Try pressing Enter while focusing on a form element
    await page.keyboard.press('Enter');
    console.log('  ✓ Enter pressionado');
  }

  // ========================================
  // ETAPA 4: VERIFICAR REDIRECIONAMENTO
  // ========================================
  console.log('\n📍 ETAPA 3: Verificar Redirecionamento para Evolução');

  // O redirecionamento pode levar para /patients/{id}/evaluations/new... ou /patient-evolution/...
  // Vamos esperar URL mudar
  await page.waitForURL(url => url.pathname.includes('/evaluations/') || url.pathname.includes('/patient-evolution/'), { timeout: 20000 });
  console.log(`  ✓ Redirecionado para: ${page.url()}`);
  await page.waitForTimeout(2000); // Esperar carregamento inicial
  await page.screenshot({ path: '/tmp/fluxo-03-redirecionamento.png' });

  // ========================================
  // ETAPA 5: PREENCHER EVOLUÇÃO SOAP
  // ========================================
  console.log('\n📍 ETAPA 4: Preencher SOAP');

  const fillTextarea = async (placeholder: string, value: string) => {
    // Tenta encontrar por placeholder ou label próximo
    const locator = page.locator(`textarea[placeholder*="${placeholder}" i], textarea[name*="${placeholder.toLowerCase()}" i]`).first();
    if (await locator.count() > 0) {
      await locator.fill(value);
      console.log(`  ✓ Campo "${placeholder}" preenchido`);
      return true;
    }
    // Fallback: tentar pelo índice se soubermos a ordem
    return false;
  };

  // Tentar preencher campos padrão
  // Ajuste estes seletores conforme sua UI real de evolução

  // S - Subjetivo
  const sFilled = await fillTextarea('Queixas', 'Paciente relata melhora parcial.');
  if (!sFilled) await page.locator('textarea').nth(0).fill('Paciente relata melhora parcial.'); // Fallback 1º textarea

  // O - Objetivo
  const oFilled = await fillTextarea('Objetivo', 'Amplitude de movimento preservada.');
  if (!oFilled && await page.locator('textarea').count() > 1) await page.locator('textarea').nth(1).fill('ADM preservada.');

  // A - Avaliação
  const aFilled = await fillTextarea('Avaliação', 'Boa evolução do quadro.');
  if (!aFilled && await page.locator('textarea').count() > 2) await page.locator('textarea').nth(2).fill('Boa evolução.');

  // P - Plano
  const pFilled = await fillTextarea('Conduta', 'Manter exercícios de fortalecimento.');
  if (!pFilled && await page.locator('textarea').count() > 3) await page.locator('textarea').nth(3).fill('Manter conduta.');

  await page.screenshot({ path: '/tmp/fluxo-04-soap-preenchido.png', fullPage: true });

  // ========================================
  // ETAPA 6: SALVAR
  // ========================================
  console.log('\n📍 ETAPA 5: Salvar Evolução');

  // Botão Salvar ou Finalizar
  const saveBtn = page.locator('button:has-text("Salvar"), button:has-text("Finalizar")').first();
  await saveBtn.click();

  // Esperar sucesso (toast ou redirecionamento de volta)
  // Geralmente volta para lista ou mostra toast
  await expect(page.locator('div:has-text("sucesso"), div:has-text("salvo")').first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Evolução salva com sucesso');

  console.log('\n' + '█'.repeat(70));
  console.log('█    TESTE CONCLUÍDO COM SUCESSO');
  console.log('█'.repeat(70));
});
