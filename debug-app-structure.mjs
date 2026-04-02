import { chromium } from 'playwright';
import { testUsers } from './e2e/fixtures/test-data.ts';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://fisioflow-web.rafalegollas.workers.dev/login');
  await page.fill('input[type="email"]', testUsers.admin.email);
  await page.fill('input[type="password"]', testUsers.admin.password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/agenda**', { timeout: 30000 }).catch(() => {
    return page.goto('https://fisioflow-web.rafalegollas.workers.dev/agenda');
  });

  await page.waitForSelector('.sx__calendar-wrapper', { state: 'visible', timeout: 30000 });
  await page.waitForTimeout(5000);

  const structure = await page.evaluate(() => {
    // Tentar encontrar a instância no elemento DOM (Schedule-X costuma guardar)
    const el = document.querySelector('.sx__calendar-wrapper');
    // Como não temos acesso direto ao state do React aqui, vamos tentar ver se há erros ou se o grid está populado
    const events = document.querySelectorAll('.sx__time-grid-event').length;
    return {
      eventsCount: events,
      containerVisible: !!el,
      html: el?.innerHTML.substring(0, 500)
    };
  });

  console.log('ESTRUTURA ENCONTRADA:', structure);
  await browser.close();
})();
