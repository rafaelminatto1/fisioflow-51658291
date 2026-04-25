import { test } from '@playwright/test';

test('Debug loading hang', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('request', request => console.log('REQUEST:', request.url()));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('BAD RESPONSE:', response.status(), response.url());
    }
  });

  console.log('Navegando para /protocols...');
  await page.goto('/protocols', { waitUntil: 'domcontentloaded' });

  console.log('Aguardando 10 segundos para ver o estado...');
  await page.waitForTimeout(10000);

  const content = await page.content();
  console.log('HTML parcial (primeiros 500 chars):', content.substring(0, 500));

  const loadingText = await page.getByText('Carregando sistema...').isVisible();
  console.log('Loading text visible:', loadingText);

  if (loadingText) {
    console.log('Ainda em loading. Capturando screenshot...');
    await page.screenshot({ path: 'test-results/debug-hang.png' });
  }
});
