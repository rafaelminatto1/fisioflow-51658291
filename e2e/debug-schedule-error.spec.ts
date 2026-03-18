/**
 * Debug do erro no componente Schedule em produção
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://moocafisio.com.br';
test.use({ storageState: 'playwright/.auth/user.json' });

test('debug erro do Schedule em produção', async ({ page }) => {
  test.setTimeout(60000);

  // Captura erros de console
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });

  // Captura erros de rede não-OK
  const networkErrors: string[] = [];
  page.on('response', async (res) => {
    if (res.status() >= 400 && res.url().includes('/api/')) {
      const body = await res.text().catch(() => '');
      networkErrors.push(`${res.status()} ${res.url()} — ${body.slice(0, 300)}`);
    }
  });

  await page.goto(`${BASE_URL}/agenda`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Clica em "Detalhes do erro"
  const details = page.locator('text=Detalhes do erro, summary:has-text("Detalhes")');
  if (await details.isVisible({ timeout: 2000 }).catch(() => false)) {
    await details.click();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: 'e2e/screenshots/schedule-error-details.png' });

  // Extrai o texto do erro
  const errorText = await page.evaluate(() => {
    const errorEl = document.querySelector('[class*="error"], details, pre, code');
    return errorEl?.textContent?.slice(0, 1000) || 'não encontrado';
  });

  console.log('=== ERRO DO SCHEDULE ===');
  console.log('Texto do erro na UI:', errorText);
  console.log('\nErros de console:', consoleErrors);
  console.log('\nErros de rede (API):', networkErrors);
  console.log('\nWarnings:', consoleWarnings.slice(0, 5));
});
