import { test, expect } from '@playwright/test';

test('agenda em produção - carregar e testar', async ({ page }) => {
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

  page.on('response', response => {
    console.log('🌐 Response:', response.url(), response.status());
  });

  // Navegar para produção com timeout maior
  await page.goto('https://moocafisio.com.br/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log('📍 Navigated to production:', page.url());

  // Esperar a página carregar por mais tempo
  await page.waitForTimeout(10000);

  // Verificar se está na página de login ou agenda
  const currentUrl = page.url();
  console.log('📍 Current URL:', currentUrl);

  // Verificar elementos da agenda
  const bodyText = await page.locator('body').textContent() || '';
  const hasAgendaText = bodyText?.toLowerCase().includes('agenda') || bodyText?.toLowerCase().includes('calendário');
  const hasLoginButton = await page.locator('button:has-text("Acessar Minha Conta"), input[name="email"]').count() > 0;
  const hasNovoButton = await page.locator('button:has-text("Novo")').count() > 0;
  const hasCalendar = await page.locator('.calendar, [class*="calendar"]').count() > 0;
  const hasLoading = await page.locator('[class*="loading"], [class*="skeleton"]').count() > 0;

  console.log('📊 Agenda text:', hasAgendaText);
  console.log('📊 Login button:', hasLoginButton);
  console.log('📊 "Novo" button:', hasNovoButton);
  console.log('📊 Calendar:', hasCalendar);
  console.log('⏳ Loading:', hasLoading);
  console.log('📄 Page title:', await page.title());

  // Filtrar apenas erros críticos
  const criticalErrors = consoleErrors.filter(e =>
    !e.includes('CORS policy') &&
    !e.includes('Failed to load resource') &&
    !e.includes('server responded with a status of 500') &&
    !e.includes('WebSocket') &&
    !e.includes('@firebase/')
  );

  if (criticalErrors.length > 0) {
    console.log('❌ Critical errors:', criticalErrors);
  }

  // A agenda deve carregar com sucesso (ou tela de login deve estar visível)
  expect(hasAgendaText || hasLoginButton || hasNovoButton || hasCalendar).toBe(true);
  expect(hasLoading).toBe(false);
  expect(criticalErrors.length).toBe(0);
});
