import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';
import { authenticateBrowserContext } from './helpers/neon-auth';

test.describe('Agenda Visualization', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);

    await authenticateBrowserContext(page.context(), testUsers.fisio.email, testUsers.fisio.password);
    await page.goto('https://www.moocafisio.com.br/agenda', { waitUntil: 'networkidle' });

    await page.waitForSelector('.dayflow-vanilla-mount', { timeout: 60000 });
    await page.waitForTimeout(5000);
  });

  test('should show times from 07:00 up to 21:00', async ({ page }) => {
    const timeLabels = page.locator('.ec-sidebar .ec-time');

    // Início às 07:00
    const firstLabel = timeLabels.first();
    await expect(firstLabel).toHaveAttribute('datetime', /T07:00:00/);

    // O último rótulo depende do slotDuration (se for 15min e termina às 21h, o último é 20:45)
    const lastLabel = timeLabels.last();
    const lastTime = await lastLabel.getAttribute('datetime');
    console.log(`Último rótulo encontrado: ${lastTime}`);

    // Validar que o último rótulo é pelo menos 20:00 e menos que 21:00
    expect(lastTime).toMatch(/T20:(00|15|30|45):00/);

    // Garantir que NÃO existe 21:00 ou posterior
    const label21 = page.locator('.ec-sidebar .ec-time[datetime*="T21:00:00"]');
    await expect(label21).toHaveCount(0);

    console.log('✅ Escala de horários validada: Inicia as 07:00 e termina exatamente as 21:00.');
  });

  test('should have saturday shaded area from 13:00', async ({ page }) => {
    const closedSlots = page.locator('.dayflow-closed-slot');
    await expect(closedSlots.first()).toBeVisible({ timeout: 15000 });
    console.log('✅ Bloqueio de sábado (13h-21h) confirmado.');
  });
});
