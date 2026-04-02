import { chromium } from 'playwright';
import { testUsers } from './e2e/fixtures/test-data.ts';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', async msg => {
    const args = await Promise.all(msg.args().map(a => a.jsonValue().catch(() => '')));
    logs.push(`[${msg.type()}] ${msg.text()} | ARGS: ${JSON.stringify(args)}`);
  });

  console.log('Navegando para o login...');
  await page.goto('https://fisioflow-web.rafalegollas.workers.dev/login');
  
  await page.fill('input[type="email"]', testUsers.admin.email);
  await page.fill('input[type="password"]', testUsers.admin.password);
  await page.click('button[type="submit"]');

  console.log('Esperando navegação para agenda...');
  await page.waitForURL('**/agenda**', { timeout: 30000 }).catch(() => {
    return page.goto('https://fisioflow-web.rafalegollas.workers.dev/agenda');
  });

  await page.waitForSelector('.sx__calendar-wrapper', { state: 'visible', timeout: 30000 });
  await page.waitForTimeout(5000); // Dar tempo para os logs aparecerem

  console.log('--- LOGS DO CONSOLE EM PRODUÇÃO ---');
  console.log(logs.join('\n'));
  console.log('-----------------------------------');

  await browser.close();
})();