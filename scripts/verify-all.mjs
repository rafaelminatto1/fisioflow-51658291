import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'rafael.minatto@yahoo.com.br';
const LOGIN_PASSWORD = 'Yukari30@';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[ERR] ${msg.text()}`);
      errors.push(msg.text());
    }
  });

  console.log('--- Checking Public Pages ---');
  for (const path of ['/auth', '/welcome']) {
    console.log(`Checking ${path}...`);
    await page.goto(`${BASE_URL}${path}`);
    await page.waitForTimeout(3000);
  }

  console.log('--- Logging In ---');
  await page.goto(`${BASE_URL}/auth`);
  await page.fill('input[type="email"]', LOGIN_EMAIL);
  await page.fill('input[type="password"]', LOGIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(u => u.pathname !== '/auth', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(5000);

  console.log('--- Checking Protected Pages ---');
  const protectedPaths = ['/', '/dashboard', '/patients', '/schedule', '/wiki', '/financial'];
  for (const path of protectedPaths) {
    console.log(`Checking ${path}...`);
    try {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForTimeout(5000);
    } catch (e) {
      console.log(`Failed to load ${path}: ${e.message}`);
    }
  }

  await browser.close();

  const b815Errors = errors.filter(e => e.includes('b815') || e.includes('INTERNAL ASSERTION FAILED'));
  if (b815Errors.length > 0) {
    console.log('
❌ FIX FAILED: Found B815 errors:');
    b815Errors.forEach(e => console.log(e));
    process.exit(1);
  } else {
    console.log('
✅ FIX VERIFIED: No B815 errors found.');
    process.exit(0);
  }
}

main();
