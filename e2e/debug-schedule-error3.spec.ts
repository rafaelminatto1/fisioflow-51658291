import { test } from '@playwright/test';
test.use({ storageState: 'playwright/.auth/user.json' });

test('debug AnimatePresence - identificar arquivo exato', async ({ page }) => {
  test.setTimeout(60000);
  const BASE_URL = process.env.BASE_URL || 'https://moocafisio.com.br';

  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // Log what assets are loaded
  const loadedAssets: string[] = [];
  page.on('response', (res) => {
    if (res.url().includes('/assets/') && res.url().endsWith('.js')) {
      loadedAssets.push(res.url().split('/assets/')[1]);
    }
  });

  await page.goto(`${BASE_URL}/agenda`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  console.log('\n=== ASSETS LOADED ===');
  loadedAssets.forEach(a => console.log(' ', a));

  console.log('\n=== CONSOLE ERRORS ===');
  for (const e of errors) console.log(e.slice(0, 500));

  // Check react-vendor is present
  const hasReactVendor = loadedAssets.some(a => a.startsWith('react-vendor'));
  console.log('\nreact-vendor chunk loaded:', hasReactVendor);
});
