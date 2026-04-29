import { test, expect } from '@playwright/test';

test('update saturday and check console errors', async ({ page }) => {
  const consoleLogs: any[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleLogs.push(`[Error] ${msg.text()}`);
    } else if (msg.type() === 'warn') {
      consoleLogs.push(`[Warn] ${msg.text()}`);
    } else {
      consoleLogs.push(`[Log] ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    consoleLogs.push(`[PageError] ${error.message}`);
  });

  page.on('response', async response => {
    if (response.url().includes('/api/scheduling/settings/business-hours')) {
        consoleLogs.push(`<< RESPONSE: ${response.status()} ${response.url()}`);
        try {
            const body = await response.json();
            consoleLogs.push(`BODY: ${JSON.stringify(body)}`);
        } catch (e) {}
    }
  });

  console.log('Navegando e fazendo login...');
  await page.goto('https://www.moocafisio.com.br/auth/login');
  await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
  await page.fill('input[type="password"]', 'Yukari30@');
  await page.click('button:has-text("Acessar Minha Conta")');

  await page.waitForURL('**/agenda');
  console.log('Indo para a página de configurações de agenda...');
  await page.goto('https://www.moocafisio.com.br/profile?tab=agenda');
  await page.waitForSelector('text=Sábado');

  const saturdayContainer = page.locator('div').filter({ hasText: /^Sábado$/ }).locator('..').locator('..');
  const inputs = saturdayContainer.locator('input[type="time"]');

  await inputs.nth(0).fill('07:00');
  await inputs.nth(1).fill('13:00');
  await inputs.nth(2).fill('11:00');
  await inputs.nth(3).fill('11:30');

  console.log('Clicando em Salvar...');
  await page.click('button:has-text("SALVAR HORÁRIOS")');

  await page.waitForTimeout(4000);

  console.log('--- LOGS COLETADOS DURANTE O PROCESSO ---');
  console.log(consoleLogs.join('\n'));
});
