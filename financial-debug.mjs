import { chromium } from '@playwright/test';

const email = process.env.E2E_LOGIN_EMAIL || 'REDACTED_EMAIL';
const password = process.env.E2E_LOGIN_PASSWORD || 'REDACTED';

const browser = await chromium.launch({ channel: 'chromium', headless: true });
const context = await browser.newContext({ baseURL: 'http://localhost:5173' });
const page = await context.newPage();

page.on('console', (msg) => console.log('CONSOLE', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('PAGEERROR', err.stack || err.message));
page.on('response', (res) => {
  if (res.status() >= 400) console.log('HTTP', res.status(), res.url());
});

await page.goto('/auth?e2e=true', { waitUntil: 'domcontentloaded' });
await page.locator('input[name="email"], #login-email').first().fill(email);
await page.locator('input[name="password"], #login-password').first().fill(password);
await page.locator('button[type="submit"], button:has-text("Acessar Minha Conta")').first().click();
await page.waitForTimeout(5000);
console.log('URL_AFTER_LOGIN', page.url());

await page.goto('/financial?e2e=true', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(8000);
console.log('URL_FINANCIAL', page.url());
console.log('BODY_START');
console.log((await page.locator('body').innerText()).slice(0, 2000));
console.log('BODY_END');

await browser.close();
