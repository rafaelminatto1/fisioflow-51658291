import { chromium } from 'playwright';
import { testUsers } from './e2e/fixtures/test-data.ts';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('https://fisioflow-web.rafalegollas.workers.dev/login');
  await page.fill('input[type="email"]', testUsers.admin.email);
  await page.fill('input[type="password"]', testUsers.admin.password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/agenda**', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(15000); // 15s

  const data = await page.evaluate(() => {
    return {
      events: document.querySelectorAll('.sx__time-grid-event').length,
      calendarPresent: !!document.querySelector('.sx__calendar-wrapper'),
      viewContainer: !!document.querySelector('.sx__view-container'),
      url: window.location.href
    };
  });

  console.log('RESULTADO FINAL:', data);
  console.log('ERROS NO CONSOLE:', errors);
  await page.screenshot({ path: 'final-agenda.png', fullPage: true });
  await browser.close();
})();
