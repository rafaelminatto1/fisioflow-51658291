import { chromium } from 'playwright';
import { testUsers } from './e2e/fixtures/test-data.ts';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('1. Acessando login...');
  await page.goto('https://fisioflow-web.rafalegollas.workers.dev/login');
  await page.fill('input[type="email"]', testUsers.admin.email);
  await page.fill('input[type="password"]', testUsers.admin.password);
  await page.click('button[type="submit"]');

  console.log('2. Esperando redirecionamento...');
  await page.waitForTimeout(10000); // 10s fixos para garantir auth

  console.log('3. Indo para agenda...');
  await page.goto('https://fisioflow-web.rafalegollas.workers.dev/agenda');
  await page.waitForTimeout(10000); 

  const data = await page.evaluate(() => {
    const grid = document.querySelector('.sx__view-container');
    const events = document.querySelectorAll('.sx__event, .sx__time-grid-event, [class*="event"]');
    return {
      eventsCount: events.length,
      gridPresent: !!grid,
      gridHtml: grid?.innerHTML.substring(0, 200),
      url: window.location.href,
      bodyClasses: document.body.className
    };
  });

  console.log('RESULTADO:', data);
  await page.screenshot({ path: 'final-check.png', fullPage: true });
  await browser.close();
})();
