import { test } from '@playwright/test';
test.use({ storageState: 'playwright/.auth/user.json' });

test('debug AnimatePresence - stack trace completo', async ({ page }) => {
  test.setTimeout(60000);
  const BASE_URL = process.env.BASE_URL || 'https://moocafisio.com.br';

  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(`${BASE_URL}/agenda`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Expand error details
  const summary = page.locator('summary, details > *:first-child').first();
  if (await summary.isVisible().catch(() => false)) {
    await summary.click();
    await page.waitForTimeout(300);
  }

  // Extract full error text from UI
  const fullText = await page.evaluate(() => {
    return document.body.innerText.slice(0, 3000);
  });

  console.log('\n=== FULL PAGE TEXT ===\n', fullText.slice(0, 1000));
  console.log('\n=== CONSOLE ERRORS ===');
  for (const e of errors) console.log(e);

  // Check which asset the error comes from
  const assetInfo = await page.evaluate(() => {
    // Look for error info in error boundaries
    const errDetails = document.querySelector('details pre, details code, [class*="error"] pre');
    return errDetails?.textContent || 'not found';
  });
  console.log('\n=== ERROR DETAILS ELEMENT ===\n', assetInfo);
});
