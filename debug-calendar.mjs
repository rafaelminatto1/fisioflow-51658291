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

  const html = await page.$eval('.sx__calendar-wrapper', el => el.innerHTML);
  
  const classes = new Set();
  const regex = /class="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    match[1].split(' ').forEach(c => classes.add(c));
  }
  
  console.log(Array.from(classes).filter(c => c.startsWith('sx__')).join('\n'));
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.waitForTimeout(2000);
  console.log('Erros no console:', errors);

  await browser.close();
})();
