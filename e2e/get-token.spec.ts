import { test } from '@playwright/test';

test('extrair token jwt', async ({ page }) => {
  await page.goto('https://moocafisio.com.br/auth/login');
  await page.fill('input[type="email"]', 'REDACTED_EMAIL');
  await page.fill('input[type="password"]', 'REDACTED');
  await page.click('button:has-text("Entrar"), button[type="submit"]');
  await page.waitForURL('**/agenda');
  
  // Extrair do localStorage
  const storage = await page.evaluate(() => {
    return JSON.stringify(localStorage);
  });
  
  console.log('LOCAL_STORAGE:', storage);
});
