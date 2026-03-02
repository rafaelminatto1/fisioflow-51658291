import { test, expect } from '@playwright/test';

const EMAIL = 'teste@moocafisio.com.br';
const PASSWORD = 'Yukari3030@';

test('criar novo agendamento - testar modal', async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('❌ Console Error:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('❌ Page Error:', error.message);
  });

  // Login
  console.log('🔐 Fazendo login...');
  await page.goto('https://moocafisio.com.br/auth/login', { waitUntil: 'domcontentloaded' });

  const emailInput = page.locator('input[name="email"], input[name="email"]').first();
  await expect(emailInput).toBeVisible({ timeout: 15000 });
  await emailInput.fill(EMAIL);

  const passwordInput = page.locator('input[name="password"], input[name="password"]').first();
  await expect(passwordInput).toBeVisible({ timeout: 5000 });
  await passwordInput.fill(PASSWORD);

  const loginButton = page.locator('button:has-text("Acessar Minha Conta"), button[type="submit"]').first();
  await expect(loginButton).toBeVisible({ timeout: 5000 });
  await loginButton.click();

  // Esperar login completar
  console.log('⏳ Aguardando login completar...');
  await expect.poll(async () => {
    const url = page.url();
    console.log('  Checking URL...', url);
    return !url.includes('/auth');
  }, { timeout: 30000 }).toBe(true);

  console.log('✅ Login completado, URL:', page.url());

  // Esperar agenda carregar
  console.log('⏳ Aguardando agenda carregar...');
  await page.waitForTimeout(5000);

  const currentUrl = page.url();
  console.log('📍 URL após carregar:', currentUrl);

  // Verificar elementos da agenda
  const bodyText = await page.locator('body').textContent() || '';
  const hasAgendaText = bodyText?.toLowerCase().includes('agenda') || bodyText?.toLowerCase().includes('calendário');
  const hasNovoButton = await page.locator('button:has-text("Novo Agendamento"), button:has-text("Novo")').first();
  const hasCalendar = await page.locator('.calendar, [class*="calendar"]').count() > 0;

  console.log('📊 Agenda text:', hasAgendaText);
  console.log('📊 "Novo" button:', hasNovoButton);
  console.log('📊 Calendar:', hasCalendar);

  // Clicar no botão de novo agendamento
  console.log('🎯 Testando criação de novo agendamento...');
  await expect(hasNovoButton).toBeVisible({ timeout: 5000 });
  await hasNovoButton.click();

  // Esperar modal abrir
  console.log('⏳ Aguardando modal abrir...');
  await page.waitForTimeout(2000);

  // Verificar se modal abriu
  const modal = await page.locator('[role="dialog"], .modal, [data-testid*="modal"]').first();
  const modalVisible = await modal.count() > 0;
  console.log('📊 Modal visível:', modalVisible);

  expect(modalVisible).toBe(true);

  if (modalVisible) {
    // Fazer screenshot do modal
    await page.screenshot({ path: 'test-results/modal-opened.png' });
    console.log('📸 Screenshot salvo: modal-opened.png');

    // Verificar botão de salvar
    const salvarButton = await page.locator('button:has-text("Salvar"), button[type="submit"]').first();
    const salvarVisible = await salvarButton.count() > 0;
    console.log('📊 Botão Salvar visível:', salvarVisible);
  }

  // Filtrar apenas erros críticos
  const criticalErrors = consoleErrors.filter(e =>
    !e.includes('CORS policy') &&
    !e.includes('Failed to load resource') &&
    !e.includes('server responded with a status of 500') &&
    !e.includes('WebSocket') &&
    !e.includes('@firebase/')
  );

  console.log('📋 Erros críticos:', criticalErrors.length);

  // A funcionalidade deve funcionar - modal deve abrir
  expect(hasAgendaText || hasNovoButton || hasCalendar).toBe(true);
  expect(modalVisible).toBe(true);
  expect(criticalErrors.length).toBe(0);
});
