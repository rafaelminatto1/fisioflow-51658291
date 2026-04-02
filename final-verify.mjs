import { chromium } from 'playwright';
import { testUsers } from './e2e/fixtures/test-data.ts';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://fisioflow-web.rafalegollas.workers.dev/login');
  await page.fill('input[type="email"]', testUsers.admin.email);
  await page.fill('input[type="password"]', testUsers.admin.password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/agenda**', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(10000); 

  const html = await page.$eval('.sx__view-container', el => el.innerHTML).catch(e => "CONTAINER NOT FOUND");
  const data = await page.evaluate(() => {
    return {
      classes: Array.from(document.querySelectorAll('*')).map(el => Array.from(el.classList)).flat().filter(c => c.startsWith('sx__')),
      url: window.location.href
    };
  });

  console.log('HTML DO GRID:', html.substring(0, 1000));
  console.log('CLASSES ENCONTRADAS:', [...new Set(data.classes)]);
  
  await page.screenshot({ path: 'final-agenda.png', fullPage: true });
  await browser.close();
})();
