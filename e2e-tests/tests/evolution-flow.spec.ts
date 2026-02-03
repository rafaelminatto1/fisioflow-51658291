import { test, expect } from '@playwright/test';

test.describe('Evolution Flow', () => {
  test('test evolution page loads directly', async ({ page }) => {
    // Try to access a specific appointment's evolution page
    await page.goto('https://fisioflow-migration.web.app/evolution/06ba8acc-c8b4-4c26-949f-6f94f85a3ed8');

    // Check if we need to login
    await page.waitForTimeout(2000);
    const hasEmailInput = await page.locator('input[type="email"]').count();
    if (hasEmailInput > 0) {
      await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
      await page.fill('input[type="password"]', 'Yukari30@');
      await page.click('button[type="submit"]');

      // Wait for navigation back to evolution page
      await page.waitForTimeout(5000);
    }

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Screenshot
    await page.screenshot({ path: 'test-results/direct-evolution.png', fullPage: true });

    // Check for errors
    const unauthorized = await page.getByText('Acesso não autorizado').count();
    console.log('Direct access - Unauthorized:', unauthorized > 0 ? 'YES' : 'NO');

    const loading = await page.getByText('Carregando').count();
    console.log('Still loading:', loading > 0 ? 'YES' : 'NO');

    // Check for page content
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);

    // Check for any text areas or form inputs (SOAP notes)
    const textAreas = await page.locator('textarea, [contenteditable="true"]').count();
    console.log('Text areas found:', textAreas);

    // Expect no unauthorized error
    expect(unauthorized).toBe(0);
  });

  test('test patients list shows data', async ({ page }) => {
    // Navigate to patients page (should redirect to login if not authenticated)
    await page.goto('https://fisioflow-migration.web.app/patients');

    // Check if we need to login
    await page.waitForTimeout(2000);
    const hasEmailInput = await page.locator('input[type="email"]').count();
    if (hasEmailInput > 0) {
      await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
      await page.fill('input[type="password"]', 'Yukari30@');
      await page.click('button[type="submit"]');

      // Wait for navigation
      await page.waitForTimeout(5000);
      await page.goto('https://fisioflow-migration.web.app/patients');
    }

    // Wait for patients to load
    await page.waitForTimeout(3000);

    // Check if patients are displayed
    const patientsCount = await page.locator('table tbody tr, [data-testid*="patient"]').count();
    console.log('Patients count:', patientsCount);

    // Take screenshot
    await page.screenshot({ path: 'test-results/patients-list.png', fullPage: true });

    // Expect some patients to be visible
    expect(patientsCount).toBeGreaterThan(0);
  });

  test('test agenda and iniciar button', async ({ page }) => {
    // Navigate to agenda
    await page.goto('https://fisioflow-migration.web.app/agenda');

    // Check if we need to login
    await page.waitForTimeout(2000);
    const hasEmailInput = await page.locator('input[type="email"]').count();
    if (hasEmailInput > 0) {
      await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
      await page.fill('input[type="password"]', 'Yukari30@');
      await page.click('button[type="submit"]');

      // Wait for navigation
      await page.waitForTimeout(5000);
      await page.goto('https://fisioflow-migration.web.app/agenda');
    }

    await page.waitForTimeout(3000);

    // Screenshot agenda
    await page.screenshot({ path: 'test-results/agenda.png', fullPage: true });

    // Look for "Iniciar" button
    const iniciarBtn = page.getByText(/Iniciar/i);
    const hasIniciar = await iniciarBtn.count();

    console.log('Iniciar buttons found:', hasIniciar);

    if (hasIniciar > 0) {
      await iniciarBtn.first().click();
      await page.waitForTimeout(3000);

      // Screenshot evolution page
      await page.screenshot({ path: 'test-results/after-iniciar.png', fullPage: true });

      // Check if we're on evolution page (not "Acesso não autorizado")
      const unauthorized = await page.getByText('Acesso não autorizado').count();
      console.log('Unauthorized error:', unauthorized > 0 ? 'YES' : 'NO');

      expect(unauthorized).toBe(0);
    } else {
      console.log('No "Iniciar" button found');
    }
  });
});
