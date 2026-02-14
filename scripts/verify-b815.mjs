import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const LOGIN_EMAIL = process.env.E2E_LOGIN_EMAIL || 'rafael.minatto@yahoo.com.br';
const LOGIN_PASSWORD = process.env.E2E_LOGIN_PASSWORD || 'Yukari30@';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const foundB815 = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('b815') || text.includes('INTERNAL ASSERTION FAILED')) {
      console.log(`[CONSOLE] ${msg.type()}: ${text}`);
      foundB815.push({ type: msg.type(), text: text, url: page.url() });
    }
  });

  page.on('pageerror', (err) => {
    if (err.message.includes('b815') || err.message.includes('INTERNAL ASSERTION FAILED')) {
      console.log(`[PAGE ERROR] ${err.message}`);
      foundB815.push({ type: 'pageerror', text: err.message, url: page.url() });
    }
  });

  console.log(`Navigating to ${BASE_URL}/auth...`);
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('Attempting login...');
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  if (await emailInput.count() > 0) {
    await emailInput.fill(LOGIN_EMAIL);
    await passwordInput.fill(LOGIN_PASSWORD);
    await submitBtn.click();
    await page.waitForURL((u) => u.pathname !== '/auth', { timeout: 15000 }).catch(() => {
        console.log('Login timeout or stay on /auth');
    });
  }

  const routes = ['/', '/dashboard', '/patients', '/schedule', '/wiki'];
  for (const route of routes) {
    console.log(`Checking route: ${route}`);
    try {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(5000); // Give it time to trigger Firestore listeners
    } catch (e) {
        console.log(`Error navigating to ${route}: ${e.message}`);
    }
  }

  await browser.close();

  if (foundB815.length > 0) {
    console.log('\n❌ Found B815 error on some pages!');
    process.exit(1);
  } else {
    console.log('\n✅ No B815 error found on checked pages.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
