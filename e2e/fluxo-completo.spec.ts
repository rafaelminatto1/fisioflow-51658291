/**
 * TESTE DE FLUXO COMPLETO - FISIOFLOW (E2E Spec)
 *
 * Fluxo ponta a ponta:
 * 1. Login
 * 2. Fechar Onboarding (se aparecer)
 * 3. Criar Agendamento de Avaliação (criação dinâmica)
 * 4. Verificar redirecionamento automático para Evolução
 * 5. Preencher Evolução SOAP completa
 * 6. Salvar e validar sucesso
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8083';
const CREDENTIALS = {
  email: 'rafael.minatto@yahoo.com.br',
  password: 'Yukari30@'
};

// Configure test for Chromium only with extended timeout
test.use({ browserName: 'chromium' });
test.setTimeout(120000); // 2 minutes

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
  } catch (e) {
    console.log('ℹ️ Onboarding não detectado ou erro ao fechar');
  }

  // ========================================
  // ETAPA 2: CRIAR AGENDAMENTO DE AVALIAÇÃO
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
  // Assume que existe pelo menos um paciente ou usa um genérico
  // O componente usa cmbox, geralmente trigger -> input -> option
  const patientTrigger = page.locator('button[role="combobox"]').first();
  await patientTrigger.click();
  await page.waitForTimeout(500); // Animation

  // Tentar selecionar o primeiro paciente da lista
  const firstOption = page.locator('[role="listbox"] [role="option"]').first();
  // Se não encontrar, tenta digitar "Maria"
  if (await firstOption.isVisible()) {
    await firstOption.click();
    console.log('  ✓ Paciente selecionado da lista');
  } else {
    // Fallback: digitar e criar/selecionar
    await page.keyboard.type('Teste');
    await page.waitForTimeout(1000);
    await page.locator('[role="option"]').first().click();
    console.log('  ✓ Paciente "Teste" selecionado');
  }

  // Definir Status para "Avaliação" (Crítico para o redirecionamento)
  // Procura pelo Select de Status
  // O label é "Status *" e o select está próximo
  // Vamos tentar localizar pelo texto do valor atual ou label
  // Melhor abordagem: Clicar no Select que tem o status default (geralmente "Agendado")
  const statusSelect = page.locator('button[role="combobox"]:has-text("Agendado"), button[role="combobox"]:has-text("Avaliação")').first();
  // Nota: o Select do shadcn usa button role combobox. Pode ter conflito com paciente.
  // Vamos usar label locator se possível

  // Alternativa: Encontrar label "Status *" e pegar o button próximo
  // const statusLabel = page.locator('label:has-text("Status *")');
  // await statusLabel.click(); // Focus helps? No.

  // Vamos tentar achar todos os comboboxes e pegar o segundo (Paciente é o primeiro, Tipo o segundo, Status o terceiro?)
  // Na estrutura vista:
  // PatientSelectionSection -> Combobox
  // DateTimeSection -> Popover (Date), Select (Time), Select (Duration)
  // TypeAndStatusSection -> Select (Type), Select (Status)

  // Vamos pelo texto placeholder ou valor padrão
  // O valor padrão de Status é 'agendado' que mostra uma bolinha azul/cinza e o texto "Agendado"
  const statusTrigger = page.locator('div.space-y-1\\.5:has(label:has-text("Status")) button[role="combobox"]');
  await statusTrigger.click();
  await page.locator('[role="option"]:has-text("Avaliação")').click();
  console.log('  ✓ Status definido para Avaliação');

  // Selecionar Horário (obrigatório) - Pega o primeiro disponível na lista
  const timeTrigger = page.locator('div.space-y-1\\.5:has(label:has-text("Horário")) button[role="combobox"]');
  await timeTrigger.click();
  // Selecionar primeira opção (que não seja header/disabled se houver)
  await page.locator('[role="option"]').first().click();
  console.log('  ✓ Horário selecionado');

  // Clicar em "Iniciar Avaliação" (Botão de submit muda texto quando status é avaliacao)
  const submitBtn = page.locator('button[type="submit"]:has-text("Iniciar Avaliação")');
  await submitBtn.click();
  console.log('  ✓ Botão de criação clicado');

  // ========================================
  // ETAPA 3: VERIFICAR REDIRECIONAMENTO
  // ========================================
  console.log('\n📍 ETAPA 3: Verificar Redirecionamento para Evolução');

  // O redirecionamento pode levar para /patients/{id}/evaluations/new... ou /patient-evolution/...
  // Vamos esperar URL mudar
  await page.waitForURL(url => url.pathname.includes('/evaluations/') || url.pathname.includes('/patient-evolution/'), { timeout: 20000 });
  console.log(`  ✓ Redirecionado para: ${page.url()}`);
  await page.waitForTimeout(2000); // Esperar carregamento inicial
  await page.screenshot({ path: '/tmp/fluxo-03-redirecionamento.png' });

  // ========================================
  // ETAPA 4: PREENCHER EVOLUÇÃO SOAP
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
  // ETAPA 5: SALVAR
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
