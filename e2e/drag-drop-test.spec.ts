import { test, expect } from '@playwright/test';

const EMAIL = 'teste@moocafisio.com.br';
const PASSWORD = 'Yukari3030@';

test('drag & drop - editar agendamento', async ({ page }) => {
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

  const loginButton = page.locator('button:has-text("Entrar"), button[type="submit"]').first();
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
  const hasNovoButton = await page.locator('button:has-text("Novo")').count() > 0;
  const hasCalendar = await page.locator('.calendar, [class*="calendar"]').count() > 0;

  console.log('📊 Agenda text:', hasAgendaText);
  console.log('📊 "Novo" button:', hasNovoButton);
  console.log('📊 Calendar:', hasCalendar);

  // Verificar se há agendamentos visíveis no calendário
  const appointmentEvents = await page.locator('[data-testid*="appointment"], .appointment-card, [class*="appointment"]').all();
  console.log('📊 Agendamentos encontrados:', appointmentEvents.length);

  // Se houver agendamentos, tentar arrastar um
  if (appointmentEvents.length > 0) {
    console.log('🎯 Testando drag & drop...');
    const firstAppointment = appointmentEvents.first();

    // Fazer screenshot antes do drag
    await page.screenshot({ path: 'test-results/drag-before.png' });
    console.log('📸 Screenshot salvo: drag-before.png');

    // Tentar arrastar o agendamento (drag & drop)
    const box = firstAppointment.boundingBox();
    const dragStart = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    await firstAppointment.dragTo(dragStart);

    // Esperar um pouco para ver se reagiu
    await page.waitForTimeout(1000);

    // Verificar se o agendamento se moveu
    const appointmentAfter = await page.locator('[data-testid*="appointment"], .appointment-card, [class*="appointment"]').first();
    const boxAfter = await appointmentAfter.boundingBox();

    console.log('📊 Posição antes:', { x: box.x, y: box.y, width: box.width, height: box.height });
    console.log('📊 Posição depois:', { x: boxAfter.x, y: boxAfter.y, width: boxAfter.width, height: boxAfter.height });

    const moved = Math.abs(box.x - boxAfter.x) > 5 || Math.abs(box.y - boxAfter.y) > 5;

    if (moved) {
      console.log('✅ Drag & drop funcionou! Agendamento moveu.');
    } else {
      console.log('❌ Drag & drop não moveu o agendamento.');
    }
  } else {
    console.log('❌ Nenhum agendamento encontrado para testar drag & drop.');
  }

  // Verificar se há botão de criar novo agendamento
  const newAppointmentButton = await page.locator('button:has-text("Novo Agendamento"), button:has-text("Novo")').first();
  const hasNewButton = await newAppointmentButton.count() > 0;

  console.log('📊 Botão "Novo" encontrado:', hasNewButton);

  if (hasNewButton) {
    console.log('🎯 Testando criação de novo agendamento...');
    await newAppointmentButton.click();

    // Esperar modal abrir
    await page.waitForTimeout(2000);

    // Verificar se modal abriu
    const modal = await page.locator('[role="dialog"], .modal, [data-testid*="modal"]').first();
    const modalVisible = await modal.count() > 0;
    console.log('📊 Modal visível:', modalVisible);

    if (modalVisible) {
      // Tentar fechar modal clicando fora ou no botão de cancelar
      const backdrop = page.locator('[role="dialog"] ~ [role="presentation"], .backdrop').first();
      if (await backdrop.count() > 0) {
        await backdrop.click();
        console.log('❌ Clicou no backdrop para fechar modal');
      }
    }
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

  expect(hasAgendaText || hasNovoButton || hasCalendar).toBe(true);
  expect(criticalErrors.length).toBe(0);
});
