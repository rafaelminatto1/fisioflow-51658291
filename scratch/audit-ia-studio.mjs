import { chromium } from 'playwright';

const BASE_URL = 'https://moocafisio.com.br';
const EMAIL = 'REDACTED_EMAIL';
const PASS = 'REDACTED';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[CONSOLE ERROR] [${page.url()}] ${msg.text()}`);
  });

  try {
    console.log('--- Logging in ---');
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/agenda', { timeout: 60000 });
    
    console.log('--- Checking /ia-studio ---');
    await page.goto(`${BASE_URL}/ia-studio`);
    await page.waitForTimeout(5000);
    
    console.log('--- Opening Scribe Drawer ---');
    await page.click('text=FisioAmbient');
    await page.waitForTimeout(2000);
    
    console.log('--- Audit Finished ---');
  } catch (e) {
    console.error('Audit failed:', e.message);
  } finally {
    await browser.close();
  }
}
run();
