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

  const containerHtml = await page.$eval('.sx__view-container', el => el.innerHTML).catch(e => "Error getting container: " + e.message);
  console.log("CONTEÚDO DO VIEW CONTAINER:");
  console.log(containerHtml);

  await browser.close();
})();
